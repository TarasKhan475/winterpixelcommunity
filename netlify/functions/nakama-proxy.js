/**
 * netlify/functions/nakama-proxy.js
 *
 * Proxies requests to dev-nakama.winterpixel.io with the correct
 * Origin/Referer headers that Cloudflare expects from the game client.
 *
 * Deploy: place this file at netlify/functions/nakama-proxy.js in your site root.
 * It becomes available at /.netlify/functions/nakama-proxy on your Netlify site.
 *
 * Usage from the browser:
 *   POST /.netlify/functions/nakama-proxy
 *   Body: {
 *     method:  "POST" | "GET" | "DELETE",
 *     path:    "/v2/account/authenticate/email?create=false",
 *     headers: { "authorization": "Basic ..." },   // optional extra headers
 *     body:    { ... }                              // optional, for POST
 *   }
 */

const NAKAMA_BASE = 'https://dev-nakama.winterpixel.io';

// Headers that make Cloudflare think the request is coming from the game client
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

  // Build full URL
  const url = NAKAMA_BASE + path;

  // Merge headers: spoof first, then any auth headers from the client
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