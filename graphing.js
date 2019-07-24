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
  
  var requestIdToResources = {};
  var frameIdToFrame = {};
  
  function Frame(frameId, parentFrameId, requestId) {
    this.frameId = frameId;
    this.parentFrameId = parentFrameId;
    this.requestId = requestId;
  }
  
  function Resource(params, type, parentFrameId) {
    this.type = type;
    this.parentFrameId = parentFrameId;
    this.params = params;
    this.loadTime = 0;
    this.encodedDataLength = 0;
    this.cyId = (type === 'frame' ? params.frameId : params.requestId);
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
        
        cy.$('*').unlock();

        var layout = cy.makeLayout({
            name: 'cose'
          });
        layout.run();
        
        cy.fit();
      }, 100);
    }
    
  }

  function setRoot(params) {
    cy.$('*').remove();
    
    requestIdToResources = {};
    frameIdToFrame = {};
    
    let res = new Resource(params, 'frame', 0);
    requestIdToResources[params.requestId] = res;
    
    frameIdToFrame[params.frameId] = new Frame(params.frameId, 0, params.requestId);
  
    cy.add( { data: { id: res.cyId } } );
    cy.$('#' + escapeCySelector(res.cyId)).style({ label: params.documentURL, color: '#c00'});
//    cy.$('#' + escapeCySelector(res.cyId)).style({ color: '#c00'});
  
    console.log('[resource] Added ' + params.requestId + ' as root frame ' + params.frameId);
  
    redrawGraph();
  }
  
  function updateFrame(params) {
    let res = new Resource(params, 'frame', frameIdToFrame[params.frameId].parentFrameId);
    requestIdToResources[params.requestId] = res;
    
    console.log('[resource] Added ' + params.requestId + ' as frame ' + params.frameId + ' child of ' + res.parentFrameId);
    
    frameIdToFrame[params.frameId].requestId = params.requestId;
    cy.$('#' + escapeCySelector(res.cyId)).style({label: params.documentURL});
  }

  function addFrame(params) {
    frameIdToFrame[params.frameId] = new Frame(params.frameId, params.parentFrameId, 0);
    
    cy.add( { data: { id: params.frameId } } );
    cy.add( { data: { id: params.parentFrameId + '_' + params.frameId, source: params.parentFrameId, target: params.frameId } } );
  
    console.log('FRAME: ' + params.parentFrameId + ' -> ' + params.frameId);
    
    redrawGraph();
  }

  function requestWillBeSent(params) {
    let res = new Resource(params, params.type, params.frameId);
    requestIdToResources[params.requestId] = res;
    
    console.log('[resource] Added ' + params.requestId + ' as ' + res.type);
    
    cy.add( { data: { id: res.cyId } } );
    cy.$('#' + escapeCySelector(res.cyId)).style({ label: ellipsis(params.request.url) });
    
    cy.add( { data: { id: params.frameId + '_' + res.cyId, source: params.frameId, target: res.cyId } } );
    
    redrawGraph();
  }
  
  function loadComplete(params) {
    let res = requestIdToResources[params.requestId];
    
    if (!res) {
      console.error('No resource with id ' + params.requestId);
    } else {
      res.encodedDataLength += params.encodedDataLength || 0;
      
      if (res.parentFrameId !== 0) {
        //  size node circle according to number of digits in payload length
        let x = Math.ceil(Math.log10(res.encodedDataLength));
        x = Math.max(1, x - 2);
        x = Math.min(10, x);
        x *= 16;
        
        let node = cy.$('#' + escapeCySelector(res.cyId));
        node.style( { width: x, height: x } );

        let edge = cy.$('#' + escapeCySelector(res.parentFrameId + '_' + res.cyId));
        edge.style( { 'line-color' : '#000' } );
        
      }
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
  
  function responseReceived(params) {
    params.encodedDataLength = params.encodedDataLength || params.response.encodedDataLength || params.response.headers['content-length'];  
    loadComplete(params);
  }

  window.GRAPHING = {
    setRoot : setRoot,
    addFrame : addFrame,
    updateFrame : updateFrame,
    requestWillBeSent : requestWillBeSent,
    responseReceived : (params) => {},
    dataReceived : (params) => {},
    loadComplete: loadComplete,
    loadingFailed: loadingFailed,
    getResource: (rid) => { return requestIdToResources[id]; }
  };
}, false);
