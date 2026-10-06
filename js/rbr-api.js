/* ================================================================
   RBR API — shared by player.html and its tab views (partials/*.html)

   One copy of: Firebase setup, Nakama access (direct on localhost,
   through the Netlify proxy elsewhere), player lookup, the player
   ARCHIVE (full-profile saves + saved-copy fallback + history export),
   and the leaderboard function. Everything hangs off window.RBR
   (the archive is also exposed as window.RBRArchive).

   Needs the Firebase compat SDK (app + auth + firestore) loaded first.
================================================================ */
(function() {
  var FIREBASE_CONFIG = {
    apiKey:            'AIzaSyDyrbOkMUrDcXmeE3WlwNrWbkOVNg-UGEg',
    authDomain:        'winterpixelcommunity.firebaseapp.com',
    projectId:         'winterpixelcommunity',
    storageBucket:     'winterpixelcommunity.firebasestorage.app',
    messagingSenderId: '590927242514',
    appId:             '1:590927242514:web:d99b37ff6ad67f1b83ffcb'
  };

  var IS_LOCAL       = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  var NAKAMA_BASE    = 'https://dev-nakama.winterpixel.io/v2';
  var PROXY_URL      = '/.netlify/functions/nakama-proxy';
  var LEADERBOARD_URL = '/.netlify/functions/leaderboard';
  var BASIC_AUTH     = 'Basic OTAyaXViZGFmOWgyZTlocXBldzBmYjlhZWIzOTo=';
  var UUID_RE        = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  var FRIEND_CODE_RE = /^[a-f0-9]{8}$/i;

  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  var db = firebase.firestore();
  var RBR = window.RBR = {
    db: db,
    currentUser: null,
    UUID_RE: UUID_RE,
    PATH_PFP:   'ui/icons/pfp/',
    PATH_BADGE: 'ui/icons/badges/',
    PATH_404:   'ui/icons/badges/404.png',
    DEFAULT_TANK: 'ui/icons/pfp/default_tank.png',
  };
  firebase.auth().onAuthStateChanged(function(u) { RBR.currentUser = u; });

  /* ---- Nakama ---- */
  var token = null, tokenExpiresAt = 0;

  async function nakamaFetch(path, bearer, body) {
    var authHeader = bearer ? ('Bearer ' + bearer) : BASIC_AUTH;
    var res;
    if (IS_LOCAL) {
      res = await fetch(NAKAMA_BASE + path.replace(/^\/v2/, ''), {
        method: 'POST',
        headers: {
          'accept': 'application/json', 'authorization': authHeader, 'content-type': 'application/json',
          'origin': 'https://rocketbotroyale2.winterpixel.io', 'referer': 'https://rocketbotroyale2.winterpixel.io/',
        },
        body: body,
      });
    } else {
      res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ method: 'POST', path: path, headers: { authorization: authHeader }, body: JSON.parse(body) }),
      });
    }
    if (!res.ok) throw new Error('Game server request failed (' + res.status + ')');
    return res.json();
  }

  async function getToken() {
    if (token && Date.now() < tokenExpiresAt) return token;
    var data = await nakamaFetch('/v2/account/authenticate/email?create=false', null,
      JSON.stringify({ email: 'test6969khan@test.com', password: 'password', vars: { client_version: '9999999999' } }));
    token = data.token;
    tokenExpiresAt = Date.now() + 55 * 60 * 1000;
    return token;
  }

  // RPC bodies are a JSON string encoded as JSON (Nakama quirk)
  async function rpc(name, payload) {
    var data = await nakamaFetch('/v2/rpc/' + name, await getToken(), JSON.stringify(JSON.stringify(payload)));
    return typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload;
  }

  // Straight from the game. Throws if the server is unreachable or doesn't know the player.
  RBR.fetchLive = async function(userId) {
    var list = await rpc('rpc_get_users_with_profile', { ids: [String(userId)] });
    if (!list || !list[0]) throw new Error('Player not found');
    var p = list[0];
    if (typeof p.metadata === 'string') { try { p.metadata = JSON.parse(p.metadata); } catch (e) { p.metadata = {}; } }
    p.metadata = p.metadata || {};
    return p;
  };

  RBR.lookupFriendCode = async function(code) {
    try {
      var p = await rpc('winterpixel_query_user_id_for_friend_code', { friend_code: code.toLowerCase() });
      return (p && (p.user_id || p.id)) || null;
    } catch (e) { return null; }
  };

  /* ---- Player lookup ----
     Username search checks the old indexes (playerIndex, cosmeticPlayerIndex)
     and then the archive snapshots (which also know friend codes). */
  RBR.resolveInput = async function(input, onStatus) {
    onStatus = onStatus || function() {};
    if (UUID_RE.test(input)) return input;
    if (FRIEND_CODE_RE.test(input)) {
      onStatus('Checking friend code…');
      var fc = await RBR.lookupFriendCode(input);
      if (fc) return fc;
    }
    onStatus('Searching by username…');
    var lower = input.toLowerCase();
    try {
      var a = await db.collection('playerIndex').where('displayName_lower', '==', lower).limit(1).get();
      if (!a.empty) return a.docs[0].id;
      var b = await db.collection('cosmeticPlayerIndex').where('displayName_lower', '==', lower).limit(1).get();
      if (!b.empty) return b.docs[0].data().userId || b.docs[0].id;
    } catch (e) {}
    return RBRArchive.resolve(input);
  };

  // Autocomplete: prefix match across the old indexes and the archive, de-duplicated by user id
  RBR.suggestPlayers = async function(prefix, limit) {
    var lower = prefix.toLowerCase();
    var queries = ['playerIndex', 'cosmeticPlayerIndex'].map(function(col) {
      return db.collection(col)
        .where('displayName_lower', '>=', lower).where('displayName_lower', '<=', lower + '')
        .limit(limit).get().catch(function() { return null; });
    });
    var seen = {}, out = [];
    (await Promise.all(queries)).forEach(function(snap) {
      if (!snap) return;
      snap.forEach(function(doc) {
        var d = doc.data(), id = d.userId || doc.id;
        if (seen[id] || !UUID_RE.test(id)) return;
        seen[id] = true;
        out.push({ id: id, name: d.displayName || id });
      });
    });
    (await RBRArchive.suggest(prefix, limit)).forEach(function(p) { if (!seen[p.id]) { seen[p.id] = true; out.push(p); } });
    return out.slice(0, limit);
  };

  /* ================================================================
     PLAYER ARCHIVE — the ONE place player data is saved: the FULL profile JSON

     WRITES  playerArchive/{userId}/snapshots/{day}
               { schema:2, timestamp, display_name, display_name_lower,
                 friend_code, uid?, json:"<the entire profile JSON>" }
             Nothing else is ever written (no index documents, no stat or
             cosmetic slices). The searchable name / friend code live on the
             snapshot itself and are found with a collection-group query.
             The profile is stored as a JSON string so it is kept exactly as
             the game sent it. One document per player per day, create-only,
             so a day's first capture can never be edited afterwards.

     READS   Stats, Skins and History all work from full profiles. Old data is
             still read — statHistory + cosmeticHistory (and the old name
             indexes) are converted into the same profile shape on the way in,
             so the rest of the site can't tell the difference.
  ================================================================ */
  var A_NEW = 'playerArchive', A_STATS = 'statHistory', A_COS = 'cosmeticHistory';
  var A_INDEXES = ['playerIndex', 'cosmeticPlayerIndex'];
  var A_MAX_JSON = 900000;   // Firestore documents are capped at ~1 MiB
  var A_PAGE = 300;
  var aRecovered = typeof WeakSet !== 'undefined' ? new WeakSet() : null;   // every profile served from a saved copy
  var aCache = {};            // in-memory only: userId -> merged history (cleared on save)

  function aSnaps(col, id) { return db.collection(col).doc(id).collection('snapshots'); }
  function aSafe(fn) { return Promise.resolve().then(fn).catch(function(e) { console.warn('Archive:', e.message); return null; }); }

  // The old logs only held a slice — rebuild a profile-shaped object from them
  function aFromLegacy(id, st, cs, name) {
    var flat = (st && st.stats) || {}, stats = {};
    Object.keys(flat).forEach(function(k) { if (k.charAt(0) !== '_') stats[k] = flat[k]; });
    var meta = { stats: stats, progress: { level: flat._level || 0 }, awards_seen: flat._awards_seen || 0 };
    if (cs) { meta.skin = cs.skin; meta.badge = cs.badge; meta.awards = cs.awards || []; meta.goals = cs.goals || []; }
    return { id: id, display_name: (cs && cs.display_name) || name || '', metadata: meta };
  }

  /* ---- write: the one and only save ---- */
  function aSave(userId, profile) {
    // Fallback mode never writes: a recovered/saved copy is never stored again (checked by marker AND by identity)
    if (!userId || !profile || profile._archived || (aRecovered && aRecovered.has(profile))) return Promise.resolve(false);
    var day = RBR.todayKey(), flag = 'arch_saved_' + userId + '_' + day;
    try { if (sessionStorage.getItem(flag)) return Promise.resolve(false); } catch (e) {}   // rules are create-only: one try per day is enough
    var json = JSON.stringify(profile), meta = profile.metadata || {}, name = profile.display_name || '';
    if (json.length > A_MAX_JSON) { console.warn('Archive: profile too large to store (' + json.length + ' chars)'); return Promise.resolve(false); }
    var payload = { schema: 2, timestamp: Date.now(), display_name: name, display_name_lower: name.toLowerCase(),
      friend_code: meta.friend_code ? String(meta.friend_code).toLowerCase() : null, json: json };
    if (RBR.currentUser) payload.uid = RBR.currentUser.uid;
    delete aCache[userId];

    return aSnaps(A_NEW, userId).doc(day).set(payload).then(function() { return true; }).catch(function(e) {
      if (e.code !== 'permission-denied') console.warn('Archive write:', e.message);   // denied = already captured today (or rules not deployed yet)
      return false;
    }).then(function(ok) {
      try { sessionStorage.setItem(flag, '1'); } catch (e) {}
      return ok;
    });
  }

  /* ---- read: newest saved copy ("get saved stats") ---- */
  async function aLatest(col, id) {
    var s = await aSnaps(col, id).orderBy('timestamp', 'desc').limit(1).get();
    return s.empty ? null : { date: s.docs[0].id, data: s.docs[0].data() };
  }
  async function aNameFor(id) {
    var cols = A_INDEXES;
    for (var i = 0; i < cols.length; i++) {
      var d = await aSafe(function() { return db.collection(cols[i]).doc(id).get(); });
      if (d && d.exists && d.data().displayName) return d.data().displayName;
    }
    return '';
  }
  // -> { source, date, timestamp, profile, raw } or null.  `raw` is the Firestore document(s) exactly as stored.
  async function aGetSaved(userId) {
    var r = await Promise.all([aSafe(function() { return aLatest(A_NEW, userId); }), aSafe(function() { return aLatest(A_STATS, userId); }), aSafe(function() { return aLatest(A_COS, userId); })]);
    var v2 = r[0], ls = r[1], lc = r[2];
    var legacyTs = Math.max(ls ? ls.data.timestamp || 0 : 0, lc ? lc.data.timestamp || 0 : 0);
    if (v2 && (v2.data.timestamp || 0) >= legacyTs) {
      var raw = {}; raw[A_NEW] = Object.assign({ _date: v2.date }, v2.data);
      return { source: A_NEW, date: v2.date, timestamp: v2.data.timestamp, profile: JSON.parse(v2.data.json), raw: raw };
    }
    if (!ls && !lc) return null;
    var profile = aFromLegacy(userId, ls && ls.data, lc && lc.data, (lc && lc.data.display_name) ? '' : await aNameFor(userId));
    var raw2 = {};
    if (ls) raw2[A_STATS] = Object.assign({ _date: ls.date }, ls.data);
    if (lc) raw2[A_COS] = Object.assign({ _date: lc.date }, lc.data);
    var newest = (ls && (!lc || (ls.data.timestamp || 0) >= (lc.data.timestamp || 0))) ? ls : lc;
    return { source: 'legacy', date: newest.date, timestamp: newest.data.timestamp, profile: profile, raw: raw2 };
  }
  // Saved copy shaped like a live profile, tagged so the UI can say it's a saved copy
  async function aLoadSaved(userId, reason) {
    var s = await aGetSaved(userId);
    if (!s) return null;
    s.profile._archived = { date: s.date, source: s.source, reason: reason || 'requested' };
    if (aRecovered) aRecovered.add(s.profile);
    return s.profile;
  }

  /* ---- read: history as FULL PROFILES (newest 90 days from all three logs, oldest first) ----
     Returns [{ date, timestamp, source, profile }]. For days that only exist in the old split
     logs, the stats slice and cosmetics slice of that day are merged into one profile-shaped
     object (a missing part is simply absent: no metadata.awards / empty metadata.stats). */
  async function aRecent(col, id, n) {
    var s = await aSnaps(col, id).orderBy('timestamp', 'desc').limit(n).get(), out = [];
    s.forEach(function(d) { out.push({ date: d.id, data: d.data() }); });
    return out;
  }
  async function aSnapshots(userId) {
    if (aCache[userId]) return aCache[userId];
    var r = await Promise.all([aSafe(function() { return aRecent(A_NEW, userId, 90); }), aSafe(function() { return aRecent(A_STATS, userId, 90); }), aSafe(function() { return aRecent(A_COS, userId, 90); })]);
    var byDate = {};
    function at(date) { return byDate[date] || (byDate[date] = { date: date, timestamp: 0 }); }
    (r[1] || []).forEach(function(d) { var e = at(d.date); e.st = d.data; e.timestamp = Math.max(e.timestamp, d.data.timestamp || 0); });
    (r[2] || []).forEach(function(d) { var e = at(d.date); e.cs = d.data; e.timestamp = Math.max(e.timestamp, d.data.timestamp || 0); });
    (r[0] || []).forEach(function(d) { var e = at(d.date); e.full = d.data; e.timestamp = d.data.timestamp || e.timestamp; });
    var out = [];
    Object.keys(byDate).sort().forEach(function(k) {
      var e = byDate[k], profile = null;
      if (e.full) { try { profile = JSON.parse(e.full.json); } catch (x) { return; } }   // the full JSON wins for any day it covers
      else profile = aFromLegacy(userId, e.st, e.cs, '');
      out.push({ date: e.date, timestamp: e.timestamp, source: e.full ? A_NEW : 'legacy', profile: profile });
    });
    aCache[userId] = out;
    return out;
  }

  /* ---- export: the complete record, nothing trimmed ---- */
  async function aAllDocs(col, id) {
    var out = [], last = null;
    for (;;) {
      var q = aSnaps(col, id).orderBy('timestamp', 'asc').limit(A_PAGE);
      if (last) q = q.startAfter(last);
      var s = await q.get();
      s.forEach(function(d) { out.push(d); });
      if (s.size < A_PAGE) break;
      last = s.docs[s.docs.length - 1];
    }
    return out;
  }
  async function aExportAll(userId) {
    var errors = {}, entries = [], counts = {}, cols = [A_NEW, A_STATS, A_COS];
    for (var i = 0; i < cols.length; i++) {
      var col = cols[i];
      try {
        var docs = await aAllDocs(col, userId);
        counts[col] = docs.length;
        docs.forEach(function(d) {
          var x = d.data(), data = x;
          if (col === A_NEW) { try { data = JSON.parse(x.json); } catch (e) { data = { _unparsed_json: x.json }; } }
          entries.push({ date: d.id, source: col, timestamp: x.timestamp || null, saved_by_uid: x.uid || null, data: data });
        });
      } catch (e) { errors[col] = e.message; counts[col] = 0; }
    }
    entries.sort(function(a, b) { return (a.timestamp || 0) - (b.timestamp || 0) || (a.source < b.source ? -1 : 1); });
    var name = '';
    for (var j = entries.length - 1; j >= 0 && !name; j--) name = (entries[j].data && entries[j].data.display_name) || '';
    var out = { export_version: 1, exported_at: new Date().toISOString(), user_id: userId, display_name: name, counts: counts, snapshots: entries };
    if (Object.keys(errors).length) out.errors = errors;
    return out;
  }
  async function aDownloadExport(userId, name) {
    var data = await aExportAll(userId);
    var url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    var a = document.createElement('a');
    a.href = url; a.download = (name || data.display_name || 'player').replace(/[^\w.-]+/g, '_') + '-' + userId.slice(0, 8) + '-full-history.json';
    a.click();
    URL.revokeObjectURL(url);
    return data;
  }

  /* ---- find a player in the archive by name or friend code (collection-group query on the snapshots) ---- */
  function aOwner(doc) { return doc.ref.parent.parent.id; }
  async function aFindOne(field, value) {
    var s = await db.collectionGroup('snapshots').where(field, '==', value).limit(1).get();
    return s.empty ? null : aOwner(s.docs[0]);
  }
  async function aResolve(input) {
    input = (input || '').trim();
    if (!input) return null;
    if (UUID_RE.test(input)) return (await aSafe(function() { return aGetSaved(input); })) ? input : null;
    var id = await aSafe(function() { return aFindOne('display_name_lower', input.toLowerCase()); });
    if (!id) id = await aSafe(function() { return aFindOne('friend_code', input.toLowerCase()); });
    return id;
  }
  // Autocomplete: names (current or former) of players that exist in the archive
  async function aSuggest(prefix, limit) {
    var lower = prefix.toLowerCase();
    var s = await aSafe(function() {
      return db.collectionGroup('snapshots').where('display_name_lower', '>=', lower).where('display_name_lower', '<=', lower + '\uf8ff').limit(limit * 5).get();
    });
    var seen = {}, out = [];
    if (s) s.forEach(function(doc) {
      var id = aOwner(doc);
      if (seen[id]) return;
      seen[id] = 1; out.push({ id: id, name: doc.data().display_name || id });
    });
    return out.slice(0, limit);
  }

  window.RBRArchive = {
    save: aSave, getSaved: aGetSaved, loadSaved: aLoadSaved, snapshots: aSnapshots,
    exportAll: aExportAll, downloadExport: aDownloadExport, resolve: aResolve, suggest: aSuggest,
  };
  RBR.getSavedStats = aGetSaved;

  // The game first; if it can't connect or doesn't know the player, the copy saved in Firestore
  RBR.fetchProfile = async function(userId) {
    try { return await RBR.fetchLive(userId); }
    catch (err) {
      var saved = await aSafe(function() { return aLoadSaved(userId, (err && err.message) || 'game server unavailable'); });
      if (!saved) throw err;
      return saved;
    }
  };

  /* ---- Leaderboard function ---- */
  RBR.leaderboard = async function(params) {
    var res = await fetch(LEADERBOARD_URL + '?' + new URLSearchParams(params));
    if (!res.ok) throw new Error('Leaderboard request failed (' + res.status + ')');
    return res.json();
  };

  /* ---- Helpers ---- */
  RBR.escHtml = function(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  RBR.fmt = function(n) { return (Number(n) || 0).toLocaleString(); };
  RBR.niceName = function(id) {
    return String(id).replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  };
  RBR.todayKey = function() { return new Date().toISOString().slice(0, 10); };
  RBR.timeAgo = function(unixSeconds) {
    var s = Math.max(0, Math.floor(Date.now() / 1000 - unixSeconds));
    var m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (d > 365) return Math.floor(d / 365) + 'y ago';
    if (d > 30)  return Math.floor(d / 30) + 'mo ago';
    if (d >= 1)  return d + 'd ago';
    if (h >= 1)  return h + 'h ago';
    if (m >= 1)  return m + 'm ago';
    return 'just now';
  };
  RBR.tankSrc = function(id) { return RBR.PATH_PFP + id + '.png'; };
  RBR.copyText = function(text, btn) {
    navigator.clipboard.writeText(text).then(function() {
      if (!btn) return;
      btn.classList.add('copied');
      setTimeout(function() { btn.classList.remove('copied'); }, 1400);
    });
  };
})();
