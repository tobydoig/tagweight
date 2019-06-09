'use strict';

console.log('panel.js loaded');

window.addEventListener('load', () => {
  var cy = cytoscape({
    container: document.getElementById('cygraph'),

    elements: [
      {
        data: { id: 'root' }
      }
    ],

    style: [
      {
        selector: 'node',
        style: {
          'background-color': '#666',
          'label': 'data(id)'
        }
      },

      {
        selector: 'edge',
        style: {
          'width': 3,
          'line-color': '#ccc',
          'target-arrow-color': '#ccc',
          'target-arrow-shape': 'triangle'
        }
      }
    ]
  });

  var backgroundPageConnection = chrome.runtime.connect({
      name: "devtools-panel"
  });

  function addMessage(m) {
    var li = document.createElement('li');
    li.appendChild(document.createTextNode(m));
    
    document.querySelector('#stuff').appendChild(li);
  }

  function addToCy(url, parent) {
    var p = cy.$id(parent) || cy.$id('root');
    
    try {
      cy.add([
        { data: { id: url } },
        { data: { source: p.id(), target: url } }
      ]);
      
      cy.layout({
        name: 'grid'
      }).run();
    } catch (x) {
      addMessage('x=' + x + ', p.id=' + p.id());
    }
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
      case 'Network.requestWillBeSent':
        switch (params.initiator.type) {
          case 'parser':
            addToCy(params.request.url, params.initiator.url);
            break;
          
          case 'script':
            addToCy(params.request.url, findRootOfStacktrace(params.initiator.stack).callFrames[0].url);
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
}, false);
