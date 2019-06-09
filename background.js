'use strict';

console.log('background.js loaded');

var devtoolsOpen = 0;
var tabIdToDevtools = {};

chrome.runtime.onConnect.addListener(function onConnect(port) {
  console.log('[background] onConnect from ' + port.name);
  
  var record;
  
  if (port.name === 'devtools-page') {
    record = {
      tabId : 0,
      buffer : [],
      toolsPort : port,
      panelPort : null,
      debugging : false
    };
    
    ++devtoolsOpen;
  }
  
  var listener = function(message, sender, sendResponse) {
    console.log('[background] ' + sender + ' says ' + JSON.stringify(message));
    
    switch (message.event) {
      case 'devtools-tab-id':
        console.log('[background] Devtools is on tab ' + message.tabId);
        record.tabId = message.tabId;
        tabIdToDevtools[message.tabId] = record;
        
        chrome.debugger.attach({tabId : record.tabId}, '1.0', function attach() {
          record.debugging = true;
          chrome.debugger.sendCommand( {tabId : record.tabId}, 'Network.enable', {}, function sendCommand() {
            console.log('[background] Requested debug stream for tab ' + message.tabId);
          });
        });
        break;
      
      case 'panel-tab-id':
        record = tabIdToDevtools[message.tabId];
        if (!record) {
          console.log('[background] ERROR - no record for panel with tabid ' + message.tabId);
        } else {
          console.log('[background] Panel is on tab ' + message.tabId);
          record.panelPort = port;
          
          if (record.buffer.length) {
            record.panelPort.postMessage(record.buffer);
            record.buffer.length = 0;
          }
        }
        break;
      
      default:
        break;
    }
  };
    
  port.onMessage.addListener(listener);

  port.onDisconnect.addListener(function onDisconnect() {
    console.log('[background] onDisconnect from ' + port.name);
    port.onMessage.removeListener(listener);
    
    if (port.name === 'devtools-page') {
      if (record.debugging) {
        chrome.debugger.detach({tabId : record.tabId});
      }
      
      delete tabIdToDevtools[record.tabId];
      
      --devtoolsOpen;
      if (!devtoolsOpen) {
        console.log('[background] Last devtools closed');
      }
    }
  });
});

chrome.webRequest.onBeforeRequest.addListener(function onBeforeRequest(details) {
    console.log('[background] onBeforeRequest from ' + details.tabId);
    var record = tabIdToDevtools[details.tabId];
    
    if (record) {
      if (record.panelPort) {
        record.buffer.length = 0;
        record.panelPort.postMessage('reset');
      }
    }
    
    return {cancel: false};
  },
  {urls: ["<all_urls>"], types:["main_frame"]},
  []
);

chrome.debugger.onEvent.addListener(function onEvent(source, method, params) {
  if (!devtoolsOpen) return;
  
  var record = tabIdToDevtools[source.tabId];
  if (!record) return;
  
  //if (method === 'Network.requestWillBeSent') {
    console.log('[background] onEvent ' + JSON.stringify(method) + ' = ' + JSON.stringify(params));
  //}
  
  if (record.panelPort) {
    record.panelPort.postMessage({method: method, params: params});
  } else {
    record.buffer.push({method: method, params: params});
  }
});

