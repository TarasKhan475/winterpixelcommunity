async function nakamaFetch(path, opts) {
  opts = opts || {};

  var headers = {};

  // Authorization header — either Bearer token or Basic auth
  if (opts.token)  headers['authorization'] = 'Bearer ' + opts.token;
  if (opts.auth)   headers['authorization'] = opts.auth;

  // Any extra headers passed in
  if (opts.headers) Object.assign(headers, opts.headers);

  var payload = {
    method:  opts.method || 'GET',
    path:    path,
    headers: headers,
  };
  if (opts.body) payload.body = opts.body;

  var res = await fetch('/.netlify/functions/nakama-proxy', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });

  if (!res.ok && res.status !== 200) {
    var errText = await res.text();
    throw new Error('Nakama API error ' + res.status + ': ' + errText);
  }

  return res.json();
}