'use strict';

console.log('panel.js loaded');

var backgroundPageConnection = chrome.runtime.connect({
    name: "devtools-panel"
});

function addMessage(m) {
  var li = document.createElement('li');
  li.appendChild(document.createTextNode(m));
  
  document.querySelector('#stuff').appendChild(li);
}

function addResource(url, parent) {
  var p = document.getElementById(parent);
  if (p) {
    var u = p.querySelector('ul');
    if (u) {
      p = u;
    } else {
      u = document.createElement('ul');
      p.appendChild(u);
      p = u;
    }
  } else {
    p = document.querySelector('#stuff');
  }
  
  var li = document.createElement('li');
  li.setAttribute('id', url);
  li.appendChild(document.createTextNode(url));
  
  p.appendChild(li);
}

function findRootOfStacktrace(trace) {
  while (trace.parent) {
    trace = trace.parent;
  }
  
  return trace;
}

function handleRequest(method, params) {
  switch (method) {
    case 'Network.requestWillBeSent'
      switch (params.initiator.type) {
        case 'parser':
          addResource(params.request.url, params.initiator.url);
          break;
        
        case 'script':
          addResource(params.request.url, findRootOfStacktrace(params.initiator.stack).callFrames[0].url);
          break;
        
        default:
          break;
      }
      break;
      
    case 'Network.responseReceived':
      break;
      
    default:
      break;
  }
}

backgroundPageConnection.onMessage.addListener(function onMessage(message) {
  switch (typeof message) {
    case 'object':
      handleRequest(message.method, message.params);
      break;
    
    case 'array':
      message.forEach((m) => {
        handleRequest(m.method, m.params);
      });
      break;
    
    default:
      document.querySelector('#stuff').innerHTML = '';
      addMessage('reset');
      break;
  }
});

backgroundPageConnection.postMessage({
  event: 'panel-tab-id',
  tabId: chrome.devtools.inspectedWindow.tabId
});

addMessage('Hello');
