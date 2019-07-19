'use strict';

window.addEventListener('load', function() {
  const stuff = document.querySelector('#stuff');
  const rightpanel = document.querySelector('.rightpanel');
  const footer = document.querySelector('.footer');
  
  var root;
  var requestIdToResources = {};    //  id = requestId, value = Resource
  var syntheticIdToResources = {};  //  id = frameID:url, value = Resource
  
  function findLiNode(r) {
    return document.getElementById(r.params.requestId);
  }

  function makeLi(r) {
    let span = document.createElement('span');
    span.className = 'loading';
    span.appendChild(document.createTextNode(r.url));
    span.addEventListener('mouseenter', onmouseenterspan, false);
    
    let li = document.createElement('li');
    li.id = r.params.requestId;
    li.className = 'singleli';
    li.appendChild(span);
    
    return li;
  }
  
  function formatByteString(x) {
    return x >= 1000000 ? (x / 1000000).toFixed(2) + 'MB' : x >= 1000 ? (x / 1000).toFixed(2) + 'KB' : x + 'B';
  }
  
  function onmouseenterspan(event) {
    var r = requestIdToResources[event.currentTarget.parentNode.id];
    if (r) {
      rightpanel.innerHTML = 'status: ' + r.status + '<br/>' +
        'url: ' + r.url + '<br/>' +
        'data: ' + r.dataLength + '<br/>' +
        'encoded: ' + r.encodedDataLength +
        '<pre>' + JSON.stringify(r.params, null, ' ') + '</pre>';
    
      var totalData = r.dataLength;
      var totalEncoded = r.encodedDataLength > 0 ? r.encodedDataLength : 0;
      
      forAllChildren(r, (c) => {
        totalData += c.dataLength;
        if (c.encodedDataLength > 0) {
          totalEncoded += c.encodedDataLength;
        }
      });
      
      footer.innerHTML = 'Total data: ' + formatByteString(totalData) + ', Total encoded: ' + formatByteString(totalEncoded);
    } else {
      rightpanel.innerHTML = '';
      footer.innerHTML = '';
    }
  }
  
  function ensureAndGetUl(li) {
    var ul;
    if (li.childNodes.length === 1) {
      li.classList.remove('singleli');
      li.firstChild.classList.add('caret', 'caret-down');
      li.firstChild.addEventListener("click", function() {
        this.parentElement.querySelector(".nested").classList.toggle("active");
        this.classList.toggle("caret-down");
      });
      
      ul = document.createElement('ul');
      ul.classList.add('nested', 'active');
      li.appendChild(ul);
    } else {
      ul = li.childNodes[1];
    }
    return ul;
  }
  
  function appendToLi(r, li) {
    let newLi = makeLi(r);
    let ul = ensureAndGetUl(li);
    
    ul.appendChild(newLi);
    
    return newLi;
  }
  
  function addToStuff(r) {
    if (r.parent) {
      let parentLi = findLiNode(r.parent || root);
      appendToLi(r, parentLi);
    } else {
      stuff.appendChild(makeLi(r));
    }
  }
  
  function findCallUrl(stack) {
    while (stack) {
      let f = stack.callFrames.find((f) => f.url);
      if (f) return f.url;
      stack = stack.parent;
    }
    return null;
  }
  
  function getInitiator(params) {
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
  
  function Resource(params) {
    if (params.description === 'load') {
      console.log('iframe loaded from script');
    }
    
    this.url = params.request ? params.request.url : params.documentURL || 'about:blank';
    this.initiator = getInitiator(params);
    this.encodedDataLength = params.encodedDataLength || 0;
    this.dataLength = 0;
    this.status = 'loading';
    this.params = params;
    this.children = [];
    
    if (params.parentFrameId) {
      this.parent = syntheticIdToResources[makeSyntheticId(params.parentFrameId, this.initiator)];
    } else {
      this.parent = syntheticIdToResources[makeSyntheticId(params.frameId, this.initiator)] || null;
    }
    
    if (this.parent) {
      this.parent.children.push(this);
    } else {
      console.log('orphan');
    }
  }
  
  function forAllChildren(r, callback) {
    r.children.forEach((c) => {
      callback(c);
      forAllChildren(c, callback);
    });
  }
  
  function makeSyntheticId(frameId, url) {
    return frameId + ':' + url;
  }
  
  function addResource(r) {
    requestIdToResources[r.params.requestId] = r;
    syntheticIdToResources[makeSyntheticId(r.params.frameId, r.url)] = r;
  }
  
  function gotResponse(r, params) {
    r.encodedDataLength += params.response.encodedDataLength || 0;
  }
  
  function gotData(r, params) {
    r.dataLength += params.dataLength || 0;
  }
  
  function updateStatus(r, status) {
    let li = findLiNode(r);
    
    r.status = status; 
    
    if (r.status === 'loaded') {
      li.firstChild.classList.replace('loading', 'loaded');
    } else if (r.status === 'failed') {
      li.firstChild.classList.replace('loading', 'failed');
    }
  }
  
  function setRoot(params) {
    stuff.innerHTML = '';
    requestIdToResources = {};
    syntheticIdToResources = {};
    
    root = new Resource(params);
    
    addResource(root);
    stuff.appendChild(makeLi(root));
  }

  window.GRAPHING = {
    setRoot : setRoot,
    addResource : (params) => { let r = new Resource(params); addResource(r); addToStuff(r); },
    gotResponse : (params) => gotResponse(requestIdToResources[params.requestId], params),
    gotData : (params) => gotData(requestIdToResources[params.requestId], params),
    loadComplete: (params) => { let r = requestIdToResources[params.requestId]; gotData(r, params); updateStatus(r, 'loaded'); },
    loadFailed: (params) => { let r = requestIdToResources[params.requestId]; updateStatus(r, 'failed'); },
    getResource: (rid) => { return requestIdToResources[id]; }
  };
}, false);
