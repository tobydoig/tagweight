'use strict';

console.log('devtools.js loaded');

window.addEventListener('load', () => {
  if (chrome.devtools.inspectedWindow.tabId) {
    var backgroundPageConnection = chrome.runtime.connect({
        name: "devtools-page"
    });

    backgroundPageConnection.onMessage.addListener(function onMessage(message) {
      console.log('[devtools] from backgroundPageConnection says ' + JSON.stringify(message));
    });

    backgroundPageConnection.postMessage({
      event: 'devtools-tab-id',
      tabId: chrome.devtools.inspectedWindow.tabId
    });

    chrome.devtools.panels.create("TagWeight",
      null,
      "panel.html",
      function create(panel) {
        
      }
    );
  }
}, false);
