'use strict';

console.log('panel.js loaded');

window.addEventListener('load', () => {
  function makeCy() {
    return cytoscape({
      container: document.getElementById('cygraph'),

      elements: [
      ],

      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#666',
            'label': 'data(label)'
          }
        },

        {
          selector: 'edge',
          style: {
            'width': 3,
            'line-color': '#ccc',
            'target-arrow-color': '#ccc',
            'target-arrow-shape': 'triangle'
          }
        }
      ]
    });
  }
  
  var cy = makeCy();
  var rootUrl = 'root';
  
  var backgroundPageConnection = chrome.runtime.connect({
      name: "devtools-panel"
  });

  function addMessage(m) {
    var li = document.createElement('li');
    li.appendChild(document.createTextNode(m));
    
    document.querySelector('#stuff').appendChild(li);
  }

  function addToCy(url, parent) {
    var p = cy.$id(parent) || cy.$id(rootUrl);
    
    try {
      cy.add([
        { data: { id: url, label: url.match(/^([^?]*)/) } },
        { data: { source: p.id(), target: url } }
      ]);
      
      cy.layout({
        name: 'breadthfirst',

        fit: true, // whether to fit the viewport to the graph
        directed: true, // whether the tree is directed downwards (or edges can point in any direction if false)
        padding: 30, // padding on fit
        circle: false, // put depths in concentric circles if true, put depths top down if false
        grid: false, // whether to create an even grid into which the DAG is placed (circle:false only)
        spacingFactor: 1.75, // positive spacing factor, larger => more space between nodes (N.B. n/a if causes overlap)
        boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
        avoidOverlap: true, // prevents node overlap, may overflow boundingBox if not enough space
        nodeDimensionsIncludeLabels: false, // Excludes the label when calculating node bounding boxes for the layout algorithm
        roots: undefined, // the roots of the trees
        maximal: false, // whether to shift nodes down their natural BFS depths in order to avoid upwards edges (DAGS only)
        animate: false, // whether to transition the node positions
        animationDuration: 500, // duration of animation in ms if enabled
        animationEasing: undefined, // easing of animation if enabled,
        animateFilter: function ( node, i ){ return true; }, // a function that determines whether the node should be animated.  All nodes animated by default on animate enabled.  Non-animated nodes are positioned immediately when the layout starts
        ready: undefined, // callback on layoutready
        stop: undefined, // callback on layoutstop
        transform: function (node, position ){ return position; } // transform a given node position. Useful for changing flow direction in discrete layouts
      }).run();
    } catch (x) {
      addMessage('x=' + x + ', p.id=' + p.id());
    }
  }

  function addResource(url, parent) {
    var p = document.getElementById(parent);
    if (p) {
      var u = p.querySelector('ul');
      if (u) {
        p = u;
      } else {
        u = document.createElement('ul');
        p.appendChild(u);
        p = u;
      }
    } else {
      p = document.querySelector('#stuff');
    }
    
    var li = document.createElement('li');
    li.setAttribute('id', url);
    li.appendChild(document.createTextNode(url));
    
    p.appendChild(li);
  }

  function findRootOfStacktrace(trace) {
    while (trace.parent) {
      trace = trace.parent;
    }
    
    return trace;
  }

  function handleRequest(method, params) {
    switch (method) {
      case 'Network.requestWillBeSent':
        switch (params.initiator.type) {
          case 'parser':
            addToCy(params.request.url, params.initiator.url);
            break;
          
          case 'script':
            addToCy(params.request.url, findRootOfStacktrace(params.initiator.stack).callFrames[0].url);
            break;
          
          default:
            break;
        }
        break;
        
      case 'Network.responseReceived':
        break;
      
      case 'reset':
        document.querySelector('#stuff').innerHTML = '';
        cy.destroy();
        rootUrl = params;
        cy = makeCy();
        addToCy(params, null);
        break;
      
      default:
        break;
    }
  }

  backgroundPageConnection.onMessage.addListener(function onMessage(message) {
    switch (typeof message) {
      case 'object':
        handleRequest(message.method, message.params);
        break;
      
      case 'array':
        message.forEach((m) => {
          handleRequest(m.method, m.params);
        });
        break;
      
      default:
        break;
    }
  });

  backgroundPageConnection.postMessage({
    event: 'panel-tab-id',
    tabId: chrome.devtools.inspectedWindow.tabId
  });

  addMessage('Hello');
}, false);
