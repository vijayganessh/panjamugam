// ============================================================
// Panjamugam Residency — Configuration
// ============================================================

var CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxnhD9nfFUfadvqiEJ2H8efM6hohh7yoV1DpI0g0RnOOAvP-xrjgxAFmg7Z-eq--Ib3/exec',
  SHEET_ID: '1_Qn6kmC_gPpRT7XWG929C-ZgIdnQkEVWS-F2EaM1KeE'
};

// JSONP helper - avoids CORS issues with Google Apps Script
function apiGet(action, params) {
  params = params || {};
  params.action = action;
  params.callback = 'jsonpCallback_' + action.replace(/[^a-zA-Z]/g,'');

  return new Promise(function(resolve, reject) {
    var callbackName = params.callback;

    // Set timeout
    var timeout = setTimeout(function() {
      delete window[callbackName];
      reject(new Error('Request timed out'));
    }, 15000);

    // Create callback
    window[callbackName] = function(data) {
      clearTimeout(timeout);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
      resolve(data);
    };

    // Build URL
    var url = CONFIG.SCRIPT_URL + '?' + Object.keys(params).map(function(k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');

    // Inject script tag
    var script = document.createElement('script');
    script.src = url;
    script.onerror = function() {
      clearTimeout(timeout);
      delete window[callbackName];
      reject(new Error('Script load error'));
    };
    document.head.appendChild(script);
  });
}

// POST requests use fetch with redirect follow
async function apiPost(action, data) {
  var url = CONFIG.SCRIPT_URL + '?action=' + action;
  try {
    var r = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain'},
      body: JSON.stringify(data)
    });
    return await r.json();
  } catch(e) {
    // Fallback to GET with data encoded
    data.action = action;
    return await apiGet(action, data);
  }
}
