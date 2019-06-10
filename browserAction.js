'use strict';

console.log('browserAction.js loaded');

window.addEventListener('load', () => {
  document.querySelector('#calcButton').addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      var currTab = tabs[0];
      if (currTab) {
        chrome.runtime.getBackgroundPage(function getBackgroundPage(window) {
          window.postMessage({
            event: 'browserAction-tab-id',
            tabId: currTab.id
          });
        });
      }
    });
  }, false);
}, false);
