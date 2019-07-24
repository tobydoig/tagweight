'use strict';

console.log('tagweight.js loaded');

window.addEventListener('load', () => {
  const extension = chrome.runtime.connect({name: "tagweight-client"});
  var topFrameId = 0;
  window.tagframes = {};
  
  function handlePageEvent(method, params) {
    if (method === 'Page.frameAttached') {
      console.log('[tagweight] onMessage ' + method + ' = ' + JSON.stringify(params));
      window.tagframes[params.frameId] = params.parentFrameId;
      
      params.parentFrameId = window.tagframes[params.frameId];
      GRAPHING.addFrame(params);
    }
  }
  
  function handleNetworkEvent(method, params) {
    console.log('[tagweight] onMessage ' + method + ' = ' + JSON.stringify(params));
    
    switch (method) {
      case 'Network.requestWillBeSent':
        if (params.type === 'Document') {
          if (params.frameId === topFrameId) {
            window.tagframes = {};
            GRAPHING.setRoot(params);
          } else {
            params.parentFrameId = window.tagframes[params.frameId];
            GRAPHING.updateFrame(params);
          }
        } else {
          GRAPHING.requestWillBeSent(params);
        }
        break;
      
      case 'Network.responseReceived':
        GRAPHING.responseReceived(params);
        break;
      
      case 'Network.dataReceived':
        GRAPHING.dataReceived(params);
        break;
        
      case 'Network.requestServedFromCache':
        break;
        
      case 'Network.loadingFinished':
        GRAPHING.loadComplete(params);
        break;
      
      case 'Network.loadingFailed':
        GRAPHING.loadingFailed(params);
        break;
      
      default:
        break;
    }
  }
  
  extension.onMessage.addListener(function onMessage(msg) {
    switch (msg.event) {
      case 'network':
        handleNetworkEvent(msg.method, msg.params);
        break;
      
      case 'page':
        handlePageEvent(msg.method, msg.params);
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
