// ============================================================
// Panjamugam Residency — Configuration
// Replace SCRIPT_URL with your deployed Google Apps Script URL
// ============================================================

var CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxLsVlLMa-jILUK9gF2_4ZvDOoRdaMSJNDqq74fass-8dgjjfIlIjKDRPxksA9KyFiB/exec',
  SHEET_ID: '1_Qn6kmC_gPpRT7XWG929C-ZgIdnQkEVWS-F2EaM1KeE'
};

// API helper functions
async function apiGet(action, params) {
  params = params || {};
  params.action = action;
  var url = CONFIG.SCRIPT_URL + '?' + Object.keys(params).map(function(k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
  }).join('&');
  var r = await fetch(url);
  return r.json();
}

async function apiPost(action, data) {
  var url = CONFIG.SCRIPT_URL + '?action=' + action;
  var r = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
  return r.json();
}
