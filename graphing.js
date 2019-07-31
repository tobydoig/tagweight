'use strict';

window.addEventListener('load', function() {
  const cy = cytoscape({
    container: document.querySelector('.cygraph'),
    elements: [],
    style: [
      {
        selector: 'node',
        style: {
          'background-color': '#666',
          'label': 'data(id)',
          'font-size' : '9pt',
          'width' : '16',
          'height' : '16'
        }
      },

      {
        selector: 'edge',
        style: {
          'width': 3,
          'line-color': '#0c0',
          'target-arrow-color': '#ccc',
          'target-arrow-shape': 'triangle'
        }
      }
    ]
  });
  
  window['tobycy'] = cy;
  
  const rightpanel = document.querySelector('.rightpanel');
  var requestIdToResources = {};
  var frameIdToFrame = {};
  var maxEncodedDataLength = 0;
  var maxDataLength = 0;
  
  cy.on('tap', 'node', (evt) => {
    let node = evt.target;
    let res = requestIdToResources[node.data().id] || requestIdToResources[frameIdToFrame[node.data().id].requestId];
    
    rightpanel.innerHTML = '<pre>' + JSON.stringify(res, null, '  ') + '</pre>';
  });
  
  function Frame(frameId, parentFrameId, requestId) {
    this.frameId = frameId;
    this.parentFrameId = parentFrameId;
    this.requestId = requestId;
    this.urlsToResources = {};
  }
  
  function Resource(params, type, parentFrameId) {
    this.type = type;
    this.parentFrameId = parentFrameId;
    this.initiatorUrl = getInitiatorUrl(params);
    this.initiatorResource = getInitiatorResource(this.initiatorUrl, params.frameId);
    this.params = params;
    this.loadTime = 0;
    this.encodedDataLength = 0;
    this.dataLength = 0;
    this.cyId = (type === 'frame' ? params.frameId : params.requestId);
  }
  
  function getInitiatorResource(url, frameId) {
    let f = frameIdToFrame[frameId];
    
    if (!f) return null;
    
    let res = f.urlsToResources[url];
    
    if (!res) return null;
    
    return res;
  }
  
  function findCallUrl(stack) {
    while (stack) {
      let f = stack.callFrames.find((f) => f.url);
      if (f) return f.url;
      stack = stack.parent;
    }
    return null;
  }
  
  function getInitiatorUrl(params) {
    if (params.hasOwnProperty('initiator')) {
      switch (params.initiator.type) {
        case 'parser':
          return params.initiator.url;
          break;
        
        case 'script':
          return findCallUrl(params.initiator.stack) || '';
          break;
        
        default:
          break;
      }
    }
    
    if (params.hasOwnProperty('stack')) {
      return findCallUrl(params.stack) || '';
    }
    
    return params.documentURL;
  }
  
  function escapeCySelector(s) {
    return s.replace(/[.]/g, '\\$&');
  };
  
  function ellipsis(s) {
    if (s.length > 50) {
      s = s.substring(0, 47) + '...';
    }
    
    return s;
  }
  
  var redrawTimer = 0;
  
  function redrawGraph() {
    if (!redrawTimer) {
      redrawTimer = window.setTimeout(() => {
        redrawTimer = 0;
        
        //cy.$('*').unlock();

        const layout = cy.makeLayout({
          name: 'cose',
          animate: false,
          nodeRepulsion: function( node ){ return 8192000; },
          fit: true
        });
        layout.run();
        
        //cy.fit();
      }, 100);
    }
    
  }

  function setRoot(params) {
    cy.$('*').remove();
    
    requestIdToResources = {};
    frameIdToFrame = {};
    maxEncodedDataLength = 0;
    maxDataLength = 0;
    
    let res = new Resource(params, 'frame', 0);
    requestIdToResources[params.requestId] = res;
    
    frameIdToFrame[params.frameId] = new Frame(params.frameId, 0, params.requestId);
  
    cy.add( { data: { id: res.cyId } } );
    cy.$('#' + escapeCySelector(res.cyId)).style({ label: ellipsis(params.documentURL), color: '#c00'});
  
    console.log('[resource] Added ' + params.requestId + ' as root frame ' + params.frameId);
  
    redrawGraph();
  }
  
  function updateFrame(params) {
    let res = new Resource(params, 'frame', frameIdToFrame[params.frameId].parentFrameId);
    requestIdToResources[params.requestId] = res;
    
    console.log('[resource] Added ' + params.requestId + ' as frame ' + params.frameId + ' child of ' + res.parentFrameId);
    
    frameIdToFrame[params.frameId].requestId = params.requestId;
    cy.$('#' + escapeCySelector(res.cyId)).style({label: ellipsis(params.documentURL)});
  }

  function addFrame(params) {
    frameIdToFrame[params.frameId] = new Frame(params.frameId, params.parentFrameId, 0);
    
    cy.add( { data: { id: params.frameId } } );
    cy.add( { data: { id: params.parentFrameId + '_' + params.frameId, source: params.parentFrameId, target: params.frameId } } );
  
    console.log('FRAME: ' + params.parentFrameId + ' -> ' + params.frameId);
    
    redrawGraph();
  }

  function dynaSize(ele) {
    let res = requestIdToResources[ele.data().id];
    
    return dynaSize(res);
  }
  
  function _dynaSize(res) {
    var pc;
    if (res.dataLength) {
      pc = res.dataLength / maxDataLength;
    } else if (res.encodedDataLength) {
      pc = res.encodedDataLength / maxEncodedDataLength;
    } else {
      pc = 0
    }
    let sz = Math.max(pc || 0, 0.1);
    return 64 * sz;
  }

  function requestWillBeSent(params) {
    if (requestIdToResources[params.requestId]) {
      console.error('[requestWillBeSent] resource ' + params.requestId + ' already exists');
    } else {
      let res = new Resource(params, params.type, params.frameId);
      requestIdToResources[params.requestId] = res;
      frameIdToFrame[params.frameId].urlsToResources[params.request ? params.request.url : params.documentURL] = res;
      
      console.log('[resource] Added ' + params.requestId + ' as ' + res.type);
      
      cy.add( { data: { id: res.cyId } } );
      cy.$('#' + escapeCySelector(res.cyId)).style({ label: ellipsis(params.request.url) });
      
      let pid = res.initiatorResource ? res.initiatorResource.cyId : params.frameId;
      
      cy.add( { data: { id: pid + '_' + res.cyId, source: pid, target: res.cyId } } );
      
      redrawGraph();
    }
  }
  
  function loadingFinished(params) {
    let res = requestIdToResources[params.requestId];
    
    if (!res) {
      console.error('No resource with id ' + params.requestId);
    } else {
      res.encodedDataLength = params.encodedDataLength || res.encodedDataLength;
      
      if (res.encodedDataLength > maxEncodedDataLength) {
        maxEncodedDataLength = res.encodedDataLength;
        console.log('maxEncodedDataLength now ' + maxEncodedDataLength);
      }
      
      if (res.dataLength > maxDataLength) {
        maxDataLength = res.dataLength;
        console.log('maxDataLength now ' + maxDataLength);
      }
      
      if (res.parentFrameId !== 0) {
        //  size node circle according to number of digits in payload length
        let x = Math.ceil(Math.log10(res.encodedDataLength));
        x = Math.max(1, x - 2);
        x = Math.min(10, x);
        x *= 30;
        
        x = _dynaSize(res);
        let node = cy.$('#' + escapeCySelector(res.cyId));
        node.style( { width: x, height: x } );

        res.loadTime = params.timestamp - res.params.timestamp;
        let ms = (res.loadTime) / 1000;
        if (ms < 100) x = 2;
        else if (ms < 250) x = 4;
        else if (ms < 500) x = 6;
        else if (ms < 1000) x = 8;
        else if (ms < 2000) x = 10;
        else if (ms < 5000) x = 12;
        else x = 14;
        
        let pid = res.initiatorResource ? res.initiatorResource.cyId : res.parentFrameId;

        let edge = cy.$('#' + escapeCySelector(pid + '_' + res.cyId));
        edge.style( { 'line-color' : '#000', width: x * 3 } );
      }
      
      console.log('duration = ' + (params.timestamp - res.params.timestamp));
    }
  }
  
  function loadingFailed(params) {
    let res = requestIdToResources[params.requestId];
    
    if (!res) {
      console.error('No resource with id ' + params.requestId);
    } else {
      if (res.parentFrameId !== 0) {
        let node = cy.$('#' + escapeCySelector(res.cyId));
        node.style( { 'background-color': '#600' } );
        
        let edge = cy.$('#' + escapeCySelector(res.parentFrameId + '_' + res.cyId));
        edge.style( { 'line-color' : '#000' } );
      }
    }    
  }
  
  function dataReceived(params) {
    let res = requestIdToResources[params.requestId];
    
    if (!res) {
      console.error('No resource with id ' + params.requestId);
    } else {
      res.encodedDataLength += (params.encodedDataLength || 0);
      res.dataLength += (params.dataLength || 0);
    }
  }
  
  function responseReceived(params) {
    params.encodedDataLength = params.encodedDataLength || params.response.encodedDataLength;
    params.dataLength = params.dataLength || params.response.headers["content-length"];
    loadingFinished(params);
  }

  window.GRAPHING = {
    setRoot : setRoot,
    addFrame : addFrame,
    updateFrame : updateFrame,
    requestWillBeSent : requestWillBeSent,
    responseReceived : responseReceived,
    dataReceived : dataReceived,
    loadingFinished: loadingFinished,
    loadingFailed: loadingFailed,
    getResource: (rid) => { return requestIdToResources[id]; }
  };
}, false);
