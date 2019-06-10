'use strict';

const EXTENSION_URL = 'chrome-extension://' + chrome.runtime.id;

console.log('background.js loaded with EXTENSION_URL=' + EXTENSION_URL);

var tagWeightDetails = {
  tagWindowId : 0,
  tagPort: null,
  taggedTabId : 0,
  attached : false,
  frameId : 0
};

var debuggedTabId = 0;

function startTagWeighting(id) {
  console.log('[background] startTagWeighting for ' + id);
  
  if (tagWeightDetails.taggedTabId) {
    if (tagWeightDetails.taggedTabId === id) return;

    stopTagWeighting();
  }
  
  tagWeightDetails.taggedTabId = id;
  
  chrome.windows.create({ url: chrome.runtime.getURL('tagweight.html') }, function create(window) {
    console.log('[background] tagweight opened window ' + window.id);
    tagWeightDetails.tagWindowId = window.id;
  });
}

function stopTagWeighting() {
  console.log('[background] stopTagWeighting');
  
  if (tagWeightDetails.attached) {
    tagWeightDetails.attached = false;
    chrome.debugger.detach({tabId : tagWeightDetails.taggedTabId});
  }
  
  if (tagWeightDetails.tagPort) {
    tagWeightDetails.tagPort.disconnect();
    tagWeightDetails.tagPort = null;
  }
  
  tagWeightDetails.taggedTabId = 0;
  tagWeightDetails.tagWindowId = 0;
  tagWeightDetails.frameId = 0;
}

chrome.debugger.onEvent.addListener(function onEvent(source, method, params) {
  console.log('[background] onEvent ' + JSON.stringify(method) + ' = ' + JSON.stringify(params));
  
  if (source.tabId !== tagWeightDetails.taggedTabId) return;
  
  tagWeightDetails.tagPort.postMessage({event: 'network', method: method, params: params});
});

chrome.runtime.onConnect.addListener(function onConnect(port) {
  console.log('[background] onConnect from ' + port.name);
  
  if (port.name === 'tagweight-client') {
    tagWeightDetails.tagPort = port;
    
    port.onDisconnect.addListener(function onDisconnect() {
      console.log('[background] onDisconnect from ' + port.name);
      
      if (tagWeightDetails.tagPort === port) {
        console.log('[background] Disconnecting tagweight port');
        tagWeightDetails.tagPort = null;
      }
    });
    
    port.onMessage.addListener(function onMessage(msg) {
      console.log('[background] onMessage from ' + port.name + ' : ' + JSON.stringify(msg));
      
      if (msg.event === 'hello') {
        console.log('[background] attaching to ' + tagWeightDetails.taggedTabId);
        chrome.debugger.attach({tabId : tagWeightDetails.taggedTabId}, '1.0', function attach() {
          tagWeightDetails.attached = true;
          
        console.log('[background] getFrameTree for ' + tagWeightDetails.taggedTabId);
          chrome.debugger.sendCommand( {tabId : tagWeightDetails.taggedTabId}, 'Page.getFrameTree', {}, function PageGetFrameTree(frameTree) {
            console.log('[background] Top frame id is ' + JSON.stringify(frameTree.frameTree.frame.id));
            
            tagWeightDetails.frameId = frameTree.frameTree.frame.id;
            
            chrome.debugger.sendCommand( {tabId : tagWeightDetails.taggedTabId}, 'Network.enable', {}, function NetworkEnable() {
              console.log('[background] Requested Network events for tab ' + tagWeightDetails.taggedTabId);
            });
          });
        });
        
        port.postMessage({ event: 'frame-id', frameId: tagWeightDetails.frameId });
      }
    });
  } else {
    port.disconnect();
  }
});

chrome.windows.onRemoved.addListener(function onRemoved(windowId) {
  console.log('[background] onRemoved for ' + windowId);
  
  if (windowId === tagWeightDetails.tagWindowId) {
    stopTagWeighting();
  }
});

window.addEventListener('message', function onMessage(event) {
  console.log('[background] onMessage from ' + event.origin);
  
  if (event.origin === EXTENSION_URL) {
    switch (event.data.event) {
      case 'browserAction-tab-id':
        startTagWeighting(event.data.tabId);
        break;
      
      default:
        break;
    }
  }
});
