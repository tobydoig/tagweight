'use strict';

console.log('panel.js loaded');

var backgroundPageConnection = chrome.runtime.connect({
    name: "devtools-panel"
});

backgroundPageConnection.onMessage.addListener(function onMessage(message) {
  console.log('[panel] from backgroundPageConnection says ' + JSON.stringify(message));
});

chrome.runtime.sendMessage({
  event: 'panel-tab-id',
  tabId: chrome.devtools.inspectedWindow.tabId
});
