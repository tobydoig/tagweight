'use strict';

window.addEventListener('load', function() {
  const stuff = document.getElementById('stuff');
  
  var root;
  var requestIdToResources = {};    //  id = requestId, value = Resource
  var syntheticIdToResources = {};  //  id = frameID:url, value = Resource
  
  function findLiNode(r) {
    return document.getElementById(r.requestId);
  }

  function makeLi(r) {
    let li = document.createElement('li');
    li.appendChild(document.createTextNode(r.url));
    li.id = r.requestId;
    
    li.classList.add('loading');
    
    return li;
  }
  
  function appendToLi(r, li) {
    let newLi = makeLi(r);
    
    if (li.childNodes.length === 1) {
      let ul = document.createElement('ul');
      li.appendChild(ul);
      ul.appendChild(newLi);
    } else {
      li.childNodes[1].appendChild(newLi);
    }
    
    return newLi;
  }
  
  function addToStuff(r) {
    var parentLi = findLiNode(r.parent || root);
    let li = appendToLi(r, parentLi);
  }
  
  function getInitiator(params) {
    switch (params.initiator.type) {
      case 'parser':
        return params.initiator.url;
        break;
      
      case 'script':
        let p = params.initiator.stack;
        while (p.parent) {
          p = p.parent;
        }
        return p.callFrames[0].url;
        break;
      
      default:
        break;
    }
    
    return null;
  }
  
  function Resource(params) {
    this.requestId = params.requestId;
    this.url = params.request.url || params.documentURL;
    this.frameId = params.frameId;
    this.initiator = getInitiator(params);
    this.encodedDataLength = params.encodedDataLength || 0;
    this.dataLength = 0;
    this.fromCache = false;
    this.status = 'loading';
    this.parent = syntheticIdToResources[makeSyntheticId(this.frameId, this.initiator)] || null;
  }
  
  function makeSyntheticId(frameId, url) {
    return frameId + ':' + url;
  }
  
  function addResource(r) {
    requestIdToResources[r.requestId] = r;
    syntheticIdToResources[makeSyntheticId(r.frameId, r.url)] = r;
  }
  
  function gotResponse(r, params) {
    r.encodedDataLength += params.encodedDataLength || 0;
  }
  
  function gotData(r, params) {
    r.dataLength += params.dataLength || 0;
  }
  
  function updated(r) {
    let li = findLiNode(r);
    
    if (r.status === 'loaded') {
      li.classList.remove('loading');
      li.classList.add('loaded');
    } else if (r.status === 'failed') {
      li.classList.remove('loading');
      li.classList.add('failed');
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
    fromCache : (params) => { let r = requestIdToResources[params.requestId]; r.fromCache = true; updated(r); },
    loadComplete: (params) => { let r = requestIdToResources[params.requestId]; r.status = 'loaded'; updated(r); },
    loadFailed: (params) => { let r = requestIdToResources[params.requestId]; r.status = 'failed'; updated(r); }
  };
}, false);

