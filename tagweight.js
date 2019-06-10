'use strict';

console.log('tagweight.js loaded');

window.addEventListener('load', () => {
  
  var extension = chrome.runtime.connect({name: "tagweight-client"});
  var frameId = 0;
  
  extension.onMessage.addListener(function onMessage(msg) {
    console.log('[tagweight] onMessage : ' + JSON.stringify(msg));
    
    switch (msg.event) {
      case 'frame-id':
        frameId = msg.frameId;
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
