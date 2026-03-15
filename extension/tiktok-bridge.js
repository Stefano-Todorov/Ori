// Runs in MAIN world (page context) — can access TikTok's window variables
// Intercepts fetch to capture TikTok's API responses with video metrics
// Communicates with content.js via window.postMessage

(function() {
  var capturedItems = [];

  function parseItem(it) {
    var st = it.stats || it.statsV2 || {};
    return {
      id: it.id || '',
      views: parseInt(st.playCount) || parseInt(st.play_count) || 0,
      likes: parseInt(st.diggCount) || parseInt(st.digg_count) || 0,
      comments: parseInt(st.commentCount) || parseInt(st.comment_count) || 0,
      shares: parseInt(st.shareCount) || parseInt(st.share_count) || 0,
      saves: parseInt(st.collectCount) || parseInt(st.collect_count) || 0,
      caption: it.desc || '',
      thumb: (it.video && (it.video.cover || it.video.dynamicCover || it.video.originCover)) || ''
    };
  }

  function addItems(newItems) {
    if (newItems.length === 0) return;
    var seenIds = {};
    capturedItems.forEach(function(it) { seenIds[it.id] = true; });
    var added = 0;
    newItems.forEach(function(it) {
      if (it.id && !seenIds[it.id]) {
        capturedItems.push(it);
        seenIds[it.id] = true;
        added++;
      }
    });
    if (added > 0) {
      console.log('[Orianna Bridge] Captured ' + added + ' new items (total: ' + capturedItems.length + ')');
      window.postMessage({ type: 'ORIANNA_TT_DATA', items: capturedItems }, '*');
    }
  }

  function processApiResponse(data) {
    if (!data || typeof data !== 'object') return;
    var newItems = [];

    if (data.itemList && Array.isArray(data.itemList)) {
      data.itemList.forEach(function(it) { if (it.id) newItems.push(parseItem(it)); });
    }
    if (data.items && Array.isArray(data.items)) {
      data.items.forEach(function(it) { if (it.id) newItems.push(parseItem(it)); });
    }
    // Single video detail response: { itemInfo: { itemStruct: {...} } }
    if (data.itemInfo && data.itemInfo.itemStruct && data.itemInfo.itemStruct.id) {
      newItems.push(parseItem(data.itemInfo.itemStruct));
    }
    // Alternate single video: { item: {...} } or { itemStruct: {...} }
    if (data.item && data.item.id && (data.item.stats || data.item.statsV2)) {
      newItems.push(parseItem(data.item));
    }
    if (data.itemStruct && data.itemStruct.id && (data.itemStruct.stats || data.itemStruct.statsV2)) {
      newItems.push(parseItem(data.itemStruct));
    }
    // Some responses nest under data.data
    if (data.data && typeof data.data === 'object') {
      processApiResponse(data.data);
    }

    addItems(newItems);
  }

  // Deep-scan an object for anything that looks like a TikTok video item
  function deepScanForItems(obj, depth) {
    if (!obj || typeof obj !== 'object' || depth > 6) return [];
    var found = [];

    // Direct item with id + stats
    if (obj.id && (obj.stats || obj.statsV2)) {
      found.push(parseItem(obj));
      return found;
    }

    // ItemModule pattern: keys are video IDs, values are item objects
    if (obj.ItemModule && typeof obj.ItemModule === 'object') {
      var keys = Object.keys(obj.ItemModule);
      keys.forEach(function(key) {
        var it = obj.ItemModule[key];
        if (it && it.id) found.push(parseItem(it));
      });
      if (found.length > 0) return found;
    }

    // Recurse into arrays and objects
    var keys = Array.isArray(obj) ? obj : Object.values(obj);
    if (Array.isArray(obj)) {
      obj.forEach(function(val) {
        found = found.concat(deepScanForItems(val, depth + 1));
      });
    } else {
      Object.keys(obj).forEach(function(key) {
        if (key === 'ItemModule' || key === 'itemList' || key === 'items' ||
            key === 'ItemList' || key === 'videoData' || key === 'defaultScope') {
          found = found.concat(deepScanForItems(obj[key], depth + 1));
        }
      });
    }
    return found;
  }

  // ── SSR: Try to grab data from __UNIVERSAL_DATA_FOR_REHYDRATION__ ──
  function tryParseSSR() {
    try {
      var ssr = window.__UNIVERSAL_DATA_FOR_REHYDRATION__;
      if (!ssr || typeof ssr !== 'object') return;
      var items = deepScanForItems(ssr, 0);
      if (items.length > 0) {
        console.log('[Orianna Bridge] SSR: found ' + items.length + ' items from rehydration data');
        addItems(items);
      }
    } catch(e) {}
  }

  // Try SSR immediately (we run at document_start, data may exist before TikTok clears it)
  tryParseSSR();

  // Also try after a short delay in case TikTok sets it slightly after our script runs
  setTimeout(tryParseSSR, 50);
  setTimeout(tryParseSSR, 300);

  // ── URL pattern matching for fetch/XHR interception ──
  function shouldIntercept(url) {
    return url.includes('item_list') ||
           url.includes('/api/post/') ||
           url.includes('/api/user/list') ||
           url.includes('/api/creator/item_list') ||
           url.includes('/api/recommend/') ||
           url.includes('/api/challenge/item_list') ||
           url.includes('/api/item/detail') ||
           url.includes('/api/related/item_list') ||
           url.includes('video/detail') ||
           url.includes('detail/item') ||
           (url.includes('/api/') && url.includes('post'));
  }

  // ── Intercept fetch ──
  var originalFetch = window.fetch;
  window.fetch = function() {
    var url = arguments[0];
    if (typeof url === 'object' && url.url) url = url.url;
    url = String(url || '');

    var promise = originalFetch.apply(this, arguments);

    if (shouldIntercept(url)) {
      promise.then(function(response) {
        var cloned = response.clone();
        cloned.json().then(function(data) {
          processApiResponse(data);
        }).catch(function() {
          // json() failed — try text() then parse
          cloned.text().then(function(text) {
            try { processApiResponse(JSON.parse(text)); } catch(e) {}
          }).catch(function() {});
        });
      }).catch(function() {});
    }

    return promise;
  };

  // ── Intercept XMLHttpRequest ──
  var originalOpen = XMLHttpRequest.prototype.open;
  var originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._oriannaUrl = String(url || '');
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function() {
    var xhr = this;
    var url = xhr._oriannaUrl || '';

    if (shouldIntercept(url)) {
      xhr.addEventListener('load', function() {
        try {
          var data = JSON.parse(xhr.responseText);
          processApiResponse(data);
        } catch(e) {}
      });
    }

    return originalSend.apply(this, arguments);
  };

  // ── DOMContentLoaded: scan <script> tags for embedded JSON with video data ──
  function scanScriptTags() {
    try {
      var scripts = document.querySelectorAll('script:not([src])');
      for (var i = 0; i < scripts.length; i++) {
        var text = scripts[i].textContent || '';
        if (text.length < 100 || text.length > 5000000) continue;

        // Look for JSON containing ItemModule or itemList
        if (text.indexOf('ItemModule') === -1 && text.indexOf('itemList') === -1 && text.indexOf('"stats"') === -1) continue;

        // Try to extract JSON from various patterns
        var jsonStr = null;
        var match = text.match(/\{[^]*"ItemModule"[^]*\}/);
        if (!match) match = text.match(/\{[^]*"itemList"[^]*\}/);
        if (match) jsonStr = match[0];

        if (!jsonStr) {
          // Try the whole text as JSON (some script tags are pure JSON)
          if (text.trim().charAt(0) === '{') jsonStr = text.trim();
        }

        if (jsonStr) {
          try {
            var data = JSON.parse(jsonStr);
            var items = deepScanForItems(data, 0);
            if (items.length > 0) {
              console.log('[Orianna Bridge] Script tag scan: found ' + items.length + ' items');
              addItems(items);
            }
          } catch(e) {}
        }
      }
    } catch(e) {}

    // Also retry SSR parse (TikTok may have populated it by now)
    tryParseSSR();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanScriptTags);
  } else {
    scanScriptTags();
  }

  // ── Listen for requests from content.js ──
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'ORIANNA_TT_REQUEST') {
      console.log('[Orianna Bridge] Request received, have ' + capturedItems.length + ' items');
      // Re-scan SSR and script tags in case they weren't ready earlier
      tryParseSSR();
      if (capturedItems.length === 0) scanScriptTags();
      window.postMessage({ type: 'ORIANNA_TT_DATA', items: capturedItems }, '*');
    }
  });

  console.log('[Orianna Bridge] Installed — intercepting fetch/XHR + SSR parsing');
})();
