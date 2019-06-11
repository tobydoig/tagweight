'use strict';

console.log('tagweight.js loaded');

window.addEventListener('load', () => {
  var topFrameId = 0;
  window.frames = {};
  var extension = chrome.runtime.connect({name: "tagweight-client"});
  window.rawEvents = [];
  
  function handleNetworkEvent(method, params) {
    console.log('[tagweight] onMessage ' + method + ' = ' + JSON.stringify(params));
    
    switch (method) {
      case 'Network.requestWillBeSent':
        if (params.type === 'Document') {
          if (!frames.hasOwnProperty(params.frameId)) {
            frames[params.frameId] = params.documentURL;
          }
        }
        
        if (params.type === 'Document' && params.frameId === topFrameId) {
          GRAPHING.setRoot(params);
        } else {
          GRAPHING.addResource(params);
        }
        break;
      
      case 'Network.responseReceived':
        GRAPHING.gotResponse(params);
        break;
      
      case 'Network.dataReceived':
        GRAPHING.gotData(params);
        break;
        
      case 'Network.requestServedFromCache':
        GRAPHING.fromCache(params);
        break;
        
      case 'Network.loadingFinished':
        GRAPHING.loadComplete(params);
        break;
      
      case 'Network.loadingFailed':
        GRAPHING.loadFailed(params);
        break;
      
      default:
        break;
    }
  }
  
  extension.onMessage.addListener(function onMessage(msg) {
    switch (msg.event) {
      case 'network':
        rawEvents.push({ method: msg.method, params: msg.params });
        handleNetworkEvent(msg.method, msg.params);
        break;
      
      case 'frame-id':
        topFrameId = msg.frameId;
        break;
      
      default:
        console.log('[tagweight] onMessage : ' + JSON.stringify(msg));
        break;
    }
  });
  
  extension.postMessage({event: 'hello' });
  
}, false);
