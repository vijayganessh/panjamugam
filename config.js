// ============================================================
// Panjamugam Residency — Configuration
// ============================================================

var CONFIG = {
  SCRIPT_URL: 'https://panjamugam-api.panjamugamtvm.workers.dev',
  SHEET_ID: '1_Qn6kmC_gPpRT7XWG929C-ZgIdnQkEVWS-F2EaM1KeE'
};

// API GET - Cloudflare Worker handles CORS
async function apiGet(action, params) {
  params = params || {};
  params.action = action;
  var url = CONFIG.SCRIPT_URL + '?' + Object.keys(params).map(function(k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
  }).join('&');
  try {
    var r = await fetch(url);
    return await r.json();
  } catch(e) {
    console.error('apiGet error:', action, e);
    return {success: false, error: e.toString()};
  }
}

// API POST
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
    console.error('apiPost error:', action, e);
    return {success: false, error: e.toString()};
  }
}
