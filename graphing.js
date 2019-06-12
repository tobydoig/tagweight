'use strict';

window.addEventListener('load', function() {
  const stuff = document.querySelector('#stuff');
  const rightpanel = document.querySelector('.rightpanel');
  
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
    
    let li = document.createElement('li');
    li.id = r.params.requestId;
    li.className = 'singleli';
    li.appendChild(span);
    li.addEventListener('mouseenter', onmouseenterli, false);
    
    return li;
  }
  
  function onmouseenterli(event) {
    var r = requestIdToResources[event.currentTarget.id];
    if (r) {
      rightpanel.innerHTML = 'status: ' + r.status + '<br/>' +
        'data: ' + r.dataLength + '<br/>' +
        'encoded: ' + r.encodedDataLength +
        JSON.stringify(r.params, null, ' ');
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
        return params.documentURL;
        break;
    }
    
    return null;
  }
  
  function Resource(params) {
    this.url = params.request.url || params.documentURL;
    this.initiator = getInitiator(params);
    this.encodedDataLength = params.encodedDataLength || 0;
    this.dataLength = 0;
    this.status = 'loading';
    this.params = params;
    
    if (params.type === 'Document') {
      if (params.parentFrameId) {
        this.parent = syntheticIdToResources[makeSyntheticId(params.parentFrameId, this.initiator)];
      } else {
        this.parent = null;
      }
    } else {
      this.parent = syntheticIdToResources[makeSyntheticId(params.frameId, this.initiator)] || null;
    }
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
    loadFailed: (params) => { let r = requestIdToResources[params.requestId]; updateStatus(r, 'failed'); }
  };
}, false);
