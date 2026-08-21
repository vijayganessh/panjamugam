// ============================================================
// Panjamugam Residency — Configuration
// ============================================================

var CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwFhhWXDdN3aEZtQh-E5lvGzBxFkYeLjjn3D_czW0jM3yME27eCSAsm24tggHX9uIP3/exec',
  SHEET_ID: '1_Qn6kmC_gPpRT7XWG929C-ZgIdnQkEVWS-F2EaM1KeE'
};

var _cbIndex = 0;

function apiGet(action, params) {
  params = params || {};
  params.action = action;

  return new Promise(function(resolve, reject) {
    var cbName = '__cb_' + action + '_' + (++_cbIndex);
    params.callback = cbName;

    var timeout = setTimeout(function() {
      cleanup();
      reject(new Error('Timeout: ' + action));
    }, 20000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[cbName];
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }

    window[cbName] = function(data) {
      cleanup();
      resolve(data);
    };

    var url = CONFIG.SCRIPT_URL + '?' + Object.keys(params).map(function(k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');

    var script = document.createElement('script');
    script.src = url;
    script.onerror = function() {
      cleanup();
      reject(new Error('Script load failed: ' + action));
    };
    document.head.appendChild(script);
  });
}

async function apiPost(action, data) {
  // POST via JSONP GET with data serialized
  data = data || {};
  data._method = 'POST';
  return apiGet(action, {data: JSON.stringify(data)});
}
