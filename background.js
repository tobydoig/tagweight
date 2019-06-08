'use strict';

console.log('background.js loaded');

var devtoolsOpen = 0;
var tabIdToDevtools

chrome.runtime.onConnect.addListener(function onConnect(port) {
  console.log('[background] onConnect from ' + port.name);
  
  if (port.name === 'devtools-page') {
    var devtoolsTabId = 0;
    
    ++devtoolsOpen;
    console.log('[background] ' + devtoolsOpen + ' devtools open');
    
    var devToolsListener = function(message, sender, sendResponse) {
      console.log('[background] ' + sender + ' says ' + JSON.stringify(message));
      
      switch (message.event) {
        case 'devtools-tab-id':
          devtoolsTabId = message.tabId;
          break;
        
        default:
          break;
      }
    };
    
    port.onMessage.addListener(devToolsListener);

    port.onDisconnect.addListener(function onDisconnect() {
      console.log('[background] onDisconnect');
      port.onMessage.removeListener(devToolsListener);
      
      --devtoolsOpen;
      console.log('[background] ' + devtoolsOpen + ' devtools open');
    });
  }
});
