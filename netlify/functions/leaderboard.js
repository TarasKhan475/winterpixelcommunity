/* ================================================================
   RBR LEADERBOARD API (Netlify Function)

   GET /.netlify/functions/leaderboard?action=board&type=trophies&season=55
   GET /.netlify/functions/leaderboard?action=history&id=<uuid>
   GET /.netlify/functions/leaderboard?action=player&id=<uuid>

   Archived seasons are read from Postgres (filled by
   scripts/leaderboard-download.js). Newer seasons — or any season
   the database doesn't have yet — are fetched live from Nakama.

   Environment variables (Netlify → Site settings → Environment):
     DATABASE_URL                   Postgres connection string (optional;
                                    without it everything is fetched live)
     LEADERBOARD_ARCHIVED_THROUGH   Last season stored in the DB (default 58)
     NAKAMA_EMAIL / NAKAMA_PASSWORD Game account used for API calls
     NAKAMA_CLIENT_VERSION          Client version sent on login
================================================================ */
const { Pool } = require('pg');

const NAKAMA_BASE = 'https://dev-nakama.winterpixel.io/v2';
const BASIC_AUTH  = 'Basic OTAyaXViZGFmOWgyZTlocXBldzBmYjlhZWIzOTo=';

const NAKAMA_EMAIL          = process.env.NAKAMA_EMAIL          || 'test6969khan@test.com';
const NAKAMA_PASSWORD       = process.env.NAKAMA_PASSWORD       || 'password';
const NAKAMA_CLIENT_VERSION = process.env.NAKAMA_CLIENT_VERSION || '9999999999';
const ARCHIVED_THROUGH      = parseInt(process.env.LEADERBOARD_ARCHIVED_THROUGH || '58', 10);

const TOP_N      = 1000;  // only the top 1000 of any board is ever stored or served
const UUID_RE    = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const BOARDS     = { trophies: 'tankkings_trophies', points: 'tankkings_points' };

const NAKAMA_HEADERS = {
  'Accept':       'application/json',
  'Content-Type': 'application/json',
  'Origin':       'https://rocketbotroyale2.winterpixel.io',
  'Referer':      'https://rocketbotroyale2.winterpixel.io/',
  'User-Agent':   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

/* ---- Postgres (reused across warm invocations) ---- */
let pool = null;
function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  return pool;
}

/* ---- Nakama ---- */
let cachedToken = null;
let tokenExpiresAt = 0;

async function nakamaPost(path, auth, body) {
  const res = await fetch(NAKAMA_BASE + path, {
    method: 'POST',
    headers: Object.assign({ Authorization: auth }, NAKAMA_HEADERS),
    body: body,
  });
  if (!res.ok) throw new Error('Nakama ' + res.status + ' on ' + path);
  return res.json();
}

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  const data = await nakamaPost(
    '/account/authenticate/email?create=false',
    BASIC_AUTH,
    JSON.stringify({ email: NAKAMA_EMAIL, password: NAKAMA_PASSWORD, vars: { client_version: NAKAMA_CLIENT_VERSION } })
  );
  cachedToken = data.token;
  tokenExpiresAt = Date.now() + 50 * 60 * 1000;
  return cachedToken;
}

// RPC bodies are a JSON string encoded as JSON (Nakama quirk)
async function rpc(name, payload) {
  const token = await getToken();
  const data = await nakamaPost('/rpc/' + name, 'Bearer ' + token, JSON.stringify(JSON.stringify(payload)));
  return typeof data.payload === 'string' ? JSON.parse(data.payload) : (data.payload || data);
}

function parseMeta(m) {
  if (typeof m === 'string') { try { return JSON.parse(m) || {}; } catch (e) { return {}; } }
  return m || {};
}

function isTrue(v) { return v === true || v === 'true'; }

/* ---- Actions ---- */
async function getBoard(type, season) {
  const db = getPool();
  if (db && season <= ARCHIVED_THROUGH) {
    try {
      const { rows } = await db.query(
        `SELECT owner_id, username, rank, score, num_score,
                metadata->>'has_season_pass' AS pass
           FROM leaderboards
          WHERE season = $1 AND type = $2 AND rank BETWEEN 1 AND $3::int
          ORDER BY rank ASC
          LIMIT $3::int`,
        [season, type, TOP_N]
      );
      if (rows.length) {
        return {
          source: 'archive',
          players: rows.map(r => ({
            owner_id: r.owner_id, username: r.username, rank: r.rank,
            score: r.score, num_score: r.num_score, pass: r.pass === 'true',
          })),
        };
      }
    } catch (e) {
      console.error('[leaderboard] DB read failed:', e.message);
    }
  }

  const raw = await rpc('query_leaderboard', { leaderboard: BOARDS[type], season: season, limit: TOP_N });
  const list = Array.isArray(raw) ? raw : (raw.records || raw.values || []);
  return {
    source: 'live',
    players: list.slice(0, TOP_N).map(p => ({
      owner_id:  p.owner_id,
      username:  p.display_name || p.username || 'Anonymous',
      rank:      parseInt(p.rank || 0, 10),
      score:     parseInt(p.score || 0, 10),
      num_score: parseInt(p.num_score || 0, 10),
      pass:      isTrue(parseMeta(p.metadata).has_season_pass),
    })),
  };
}

async function getHistory(id) {
  const db = getPool();
  if (!db) return { archive: false, history: [] };
  const { rows } = await db.query(
    `SELECT season, type, rank, score, username
       FROM leaderboards
      WHERE owner_id = $1 AND rank BETWEEN 1 AND $2::int
      ORDER BY season ASC`,
    [id, TOP_N]
  );
  return { archive: true, history: rows };
}

async function getPlayer(id) {
  const list = await rpc('rpc_get_users_with_profile', { ids: [id] });
  const p = Array.isArray(list) ? list[0] : null;
  if (!p) return null;
  p.metadata = parseMeta(p.metadata);
  return p;
}

/* ---- Handler ---- */
function reply(status, body, maxAge) {
  const headers = { 'Content-Type': 'application/json' };
  if (status === 200 && maxAge) {
    headers['Cache-Control'] = 'public, max-age=' + Math.min(maxAge, 300);
    headers['Netlify-CDN-Cache-Control'] = 'public, s-maxage=' + maxAge + ', stale-while-revalidate=' + maxAge;
  }
  return { statusCode: status, headers: headers, body: JSON.stringify(body) };
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') return reply(405, { error: 'Method Not Allowed' });

  const q = event.queryStringParameters || {};
  const action = q.action || 'board';

  try {
    if (action === 'board') {
      const type = q.type === 'points' ? 'points' : 'trophies';
      const season = parseInt(q.season, 10);
      if (isNaN(season) || season < 0 || season > 999) return reply(400, { error: 'Invalid season' });
      const result = await getBoard(type, season);
      // Archived seasons never change; live ones refresh every couple of minutes
      return reply(200, result, result.source === 'archive' ? 86400 : 120);
    }

    if (!UUID_RE.test(q.id || '')) return reply(400, { error: 'Invalid player id' });

    if (action === 'history') return reply(200, await getHistory(q.id), 3600);

    if (action === 'player') {
      const player = await getPlayer(q.id);
      if (!player) return reply(404, { error: 'Player not found' });
      return reply(200, player, 120);
    }

    return reply(400, { error: 'Unknown action' });
  } catch (e) {
    console.error('[leaderboard]', action, e.message);
    return reply(502, { error: 'Leaderboard request failed' });
  }
};
