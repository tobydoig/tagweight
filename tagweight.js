'use strict';

console.log('tagweight.js loaded');

window.addEventListener('load', () => {
  
  var extension = chrome.runtime.connect({name: "tagweight-client"});
  var topFrameId = 0;
  var requestIds = {};
  
  function newPageRequest(params) {
    
  }
  
  function handleNetworkEvent(method, params) {
    switch (method) {
      case 'Network.requestWillBeSent':
        if (params.type === 'Document' && params.frameId === topFrameId) {
          newPageRequest(params);
        } else {
        }
        break;
      
      default:
        break;
    }
  }
  
  extension.onMessage.addListener(function onMessage(msg) {
    console.log('[tagweight] onMessage : ' + JSON.stringify(msg));
    
    switch (msg.event) {
      case 'network':
        handleNetworkEvent(msg.method, msg.params);
        break;
      
      case 'frame-id':
        topFrameId = msg.frameId;
        break;
      
      default:
        break;
    }
    
    var li = document.createElement('li');
    li.appendChild(document.createTextNode(msg.method + ' = ' + JSON.stringify(msg.params)));
    
    document.getElementById('stuff').appendChild(li);
  });
  
  extension.postMessage({event: 'hello' });
  
}, false);

window.addEventListener('message', function onMessage(event) {
  console.log('[tagweight] message from ' + event.origin + ' says ' + JSON.stringify(event.data));
}, false);
