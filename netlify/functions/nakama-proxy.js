const NAKAMA_BASE = 'https://dev-nakama.winterpixel.io';

const SPOOF_HEADERS = {
  'Origin':          'https://rocketbotroyale2.winterpixel.io',
  'Referer':         'https://rocketbotroyale2.winterpixel.io/',
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':          'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
};

exports.handler = async function(event) {
  // Only allow POST requests to this function
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, body: 'Invalid JSON body' };
  }

  const { method = 'GET', path, headers: extraHeaders = {}, body } = payload;

  if (!path) {
    return { statusCode: 400, body: 'Missing path' };
  }

  const url = NAKAMA_BASE + path;

  const finalHeaders = Object.assign({}, SPOOF_HEADERS, extraHeaders);
  if (body) finalHeaders['Content-Type'] = 'application/json';

  try {
    const response = await fetch(url, {
      method:  method,
      headers: finalHeaders,
      body:    body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();

    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: text,
    };
  } catch(e) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Proxy request failed', message: e.message }),
    };
  }
};