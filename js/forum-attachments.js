// ── Supported Fandom wikis ─────────────────────────────────────
var FANDOM_WIKIS = [
  { id: 'rbr', label: 'Rocket Bot Royale Wiki', wiki: 'rocketbotroyale' },
  { id: 'gd', label: 'Goober Dash Wiki', wiki: 'goober-dash' },
];

// Allowed fandom wiki subdomains (troll-proofing: only these are accepted)
var ALLOWED_WIKI_DOMAINS = FANDOM_WIKIS.map(function(w){ return w.wiki + '.fandom.com'; });

// ── SVG icons ────────────────────────────────────────────────────
var SVG_ATTACH = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>';
var SVG_WIKI   = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
var SVG_STATS  = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>';

// ── API helpers ──────────────────────────────────────────────────
var _IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
var _NAKAMA_BASE  = 'https://dev-nakama.winterpixel.io/v2';
var _PROXY_URL    = '/.netlify/functions/nakama-proxy';
var _BASIC_AUTH   = 'Basic OTAyaXViZGFmOWgyZTlocXBldzBmYjlhZWIzOTo=';
var _cachedToken    = null;
var _tokenExpiresAt = 0;

async function _nakamaFetch(path, token, body) {
  var authHeader = token ? ('Bearer ' + token) : _BASIC_AUTH;
  if (_IS_LOCAL) {
    var resp = await fetch(_NAKAMA_BASE + path.replace(/^\/v2/, ''), {
      method: 'POST',
      headers: { accept:'application/json', authorization:authHeader, 'content-type':'application/json',
                 origin:'https://rocketbotroyale2.winterpixel.io', referer:'https://rocketbotroyale2.winterpixel.io/' },
      body: body,
    });
    if (!resp.ok) throw new Error('Request failed (' + resp.status + ')');
    return resp.json();
  } else {
    var resp = await fetch(_PROXY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method:'POST', path:path, headers:{ authorization:authHeader }, body:JSON.parse(body) }),
    });
    if (!resp.ok) throw new Error('Proxy error (' + resp.status + ')');
    return resp.json();
  }
}

async function _getToken() {
  if (_cachedToken && Date.now() < _tokenExpiresAt) return _cachedToken;
  var data = await _nakamaFetch(
    '/v2/account/authenticate/email?create=false', null,
    JSON.stringify({ email:'test6969khan@test.com', password:'password', vars:{ client_version:'9999999999' } })
  );
  _cachedToken    = data.token;
  _tokenExpiresAt = Date.now() + 55 * 60 * 1000;
  return _cachedToken;
}

var _UUID_RE        = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
var _FRIEND_CODE_RE = /^[a-f0-9]{8}$/i;
// Regex to detect a fandom.com wiki URL pasted into the compose box
// Only matches allowed subdomains. Group 1 = subdomain, Group 2 = page slug.
var _FANDOM_URL_RE  = /https?:\/\/([a-z0-9-]+\.fandom\.com)\/wiki\/([^\s?#]+)/i;

async function _resolvePlayer(input) {
  if (_UUID_RE.test(input)) return input;

  if (_FRIEND_CODE_RE.test(input)) {
    try {
      var token = await _getToken();
      var d = await _nakamaFetch(
        '/v2/rpc/winterpixel_query_user_id_for_friend_code', token,
        JSON.stringify(JSON.stringify({ friend_code: input.toLowerCase() }))
      );
      var p = typeof d.payload === 'string' ? JSON.parse(d.payload) : d.payload;
      if (p && (p.user_id || p.id)) return p.user_id || p.id;
    } catch(e) {}
  }

  try {
    var snap = await db.collection('playerIndex')
                       .where('displayName_lower', '==', input.toLowerCase())
                       .limit(1).get();
    if (!snap.empty) return snap.docs[0].id;
  } catch(e) {}

  return null;
}

async function _fetchProfile(userId) {
  var token = await _getToken();
  var data  = await _nakamaFetch(
    '/v2/rpc/rpc_get_users_with_profile', token,
    JSON.stringify(JSON.stringify({ ids: [userId] }))
  );
  var inner = JSON.parse(data.payload);
  if (!inner || !inner[0]) throw new Error('Not found');
  return inner[0];
}

// ── Player autocomplete dropdown ─────────────────────────────────
var _playerAcTimer = null;

function _buildPlayerAcDropdown(input, dropdown) {
  input.addEventListener('input', function() {
    clearTimeout(_playerAcTimer);
    var val = input.value.trim();
    if (!val || val.length < 2 || _UUID_RE.test(val) || _FRIEND_CODE_RE.test(val)) {
      dropdown.classList.remove('open'); dropdown.innerHTML = ''; return;
    }
    _playerAcTimer = setTimeout(function() {
      var lower = val.toLowerCase();
      db.collection('playerIndex')
        .where('displayName_lower', '>=', lower)
        .where('displayName_lower', '<=', lower + '\uf8ff')
        .limit(6).get()
        .then(function(snap) {
          dropdown.innerHTML = '';
          if (snap.empty) {
            dropdown.innerHTML = '<div class="stats-ac-empty">No players found</div>';
            dropdown.classList.add('open'); return;
          }
          snap.forEach(function(doc) {
            var d    = doc.data();
            var name = d.displayName || doc.id;
            var item = document.createElement('div');
            item.className = 'stats-ac-item';
            item.innerHTML = '<div class="stats-ac-avatar">'+escHtml(name.slice(0,2).toUpperCase())+'</div>'+
                             '<div class="stats-ac-name">'+escHtml(name)+'</div>';
            item.addEventListener('mousedown', function(e) { e.preventDefault(); input.value = doc.id; dropdown.classList.remove('open'); });
            dropdown.appendChild(item);
          });
          dropdown.classList.add('open');
        })
        .catch(function() { dropdown.classList.remove('open'); });
    }, 250);
  });

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { dropdown.classList.remove('open'); dropdown.innerHTML = ''; }
  });

  document.addEventListener('click', function(e) {
    if (!dropdown.contains(e.target) && !input.contains(e.target)) {
      dropdown.classList.remove('open'); dropdown.innerHTML = '';
    }
  });
}

// ── STATE ────────────────────────────────────────────────────────
var _pendingAttachment = null;
var _attachPickerOpen  = false;
var _attachTab         = 'wiki';

// ── INIT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  _buildAttachUI();
  _wireAttachEvents();
  _wireComposeUrlDetection();
});

// ── COMPOSE BOX URL DETECTION ────────────────────────────────────
// Detects when a fandom wiki URL is pasted directly into the compose box.
// If it matches an allowed domain it is stripped from the text and
// converted to a wiki embed automatically.
function _wireComposeUrlDetection() {
  var compose = document.getElementById('compose-input');
  if (!compose) return;

  compose.addEventListener('paste', function(e) {
    // Read clipboard text
    var pasted = (e.clipboardData || window.clipboardData).getData('text');
    var match  = _FANDOM_URL_RE.exec(pasted);
    if (!match) return; // not a fandom URL — let paste proceed normally

    var domain = match[1].toLowerCase();         // e.g. "rocketbotroyale.fandom.com"
    var slug   = decodeURIComponent(match[2]);   // e.g. "Flak_Cannon"

    // Security: only allow pre-approved wiki domains
    if (ALLOWED_WIKI_DOMAINS.indexOf(domain) === -1) return;

    e.preventDefault(); // swallow the paste

    var subdomain = domain.replace('.fandom.com', '');
    var wikiMeta  = FANDOM_WIKIS.find(function(w){ return w.wiki === subdomain; });
    var label     = wikiMeta ? wikiMeta.label : subdomain + ' Wiki';

    _selectAttachment({
      type: 'wiki',
      data: { wiki: subdomain, label: label, slug: slug }
    });

    // Remove any remaining URL text the user may have partially typed
    // (the compose box didn't get the paste so it's unchanged — that's fine)
  });
}

// ── BUILD UI ─────────────────────────────────────────────────────
function _buildAttachUI() {
  var emojiBtn = document.getElementById('emoji-btn');
  if (!emojiBtn) return;

  // Inject SVG attach button before the emoji button
  var attachBtn = document.createElement('button');
  attachBtn.id        = 'attach-btn';
  attachBtn.type      = 'button';
  attachBtn.title     = 'Attach embed';
  attachBtn.className = 'emoji-btn';
  attachBtn.innerHTML = SVG_ATTACH;
  emojiBtn.parentNode.insertBefore(attachBtn, emojiBtn);

  // Replace emoji button text with SVG
  emojiBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>';

  // Attachment preview strip (above compose)
  var preview = document.createElement('div');
  preview.id        = 'attach-preview';
  preview.className = 'attach-preview';
  preview.style.display = 'none';
  document.getElementById('reply-preview').parentNode.insertBefore(
    preview, document.getElementById('reply-preview'));

  // Picker popup
  var picker = document.createElement('div');
  picker.id        = 'attach-picker';
  picker.className = 'attach-picker';
  picker.innerHTML =
    '<div class="attach-picker-tabs">' +
      '<button class="attach-tab active" data-tab="wiki">'+SVG_WIKI+' Wiki</button>' +
      '<button class="attach-tab" data-tab="stats">'+SVG_STATS+' Stats</button>' +
    '</div>' +
    '<div class="attach-picker-body" id="attach-picker-body"></div>';

  document.getElementById('compose-wrap').appendChild(picker);
  _renderAttachTab('wiki');
}

function _renderAttachTab(tab) {
  _attachTab = tab;
  document.querySelectorAll('.attach-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.tab === tab);
  });

  var body = document.getElementById('attach-picker-body');
  if (!body) return;

  if (tab === 'wiki') {
    body.innerHTML =
      '<div class="wiki-tab-strip">' +
        FANDOM_WIKIS.map(function(w, i) {
          return '<button class="wiki-sub-tab'+(i===0?' active':'')+'" data-wiki="'+w.wiki+'" data-label="'+escHtml(w.label)+'">'+escHtml(w.label)+'</button>';
        }).join('') +
      '</div>' +
      '<input id="wiki-article-input" class="attach-embed-input" placeholder="Search articles\u2026" autocomplete="off" style="margin-bottom:6px;" />' +
      '<div id="wiki-article-results" class="wiki-article-results"></div>';

    var wikiState = {
      active: { wiki: FANDOM_WIKIS[0].wiki, label: FANDOM_WIKIS[0].label },
      timer:  null
    };

    var wikiInput   = document.getElementById('wiki-article-input');
    var wikiResults = document.getElementById('wiki-article-results');

    var renderWikiResults = function(titles, active) {
      wikiResults.innerHTML = '';
      if (!titles.length) {
        wikiResults.innerHTML = '<div class="wiki-result-empty">No articles found</div>';
        return;
      }
      titles.forEach(function(title) {
        var slug         = title.replace(/ /g, '_');
        var capturedWiki = { wiki: active.wiki, label: active.label };
        var item         = document.createElement('div');
        item.className   = 'wiki-result-item';
        item.innerHTML   =
          '<span class="wiki-result-icon">'+SVG_WIKI+'</span>' +
          '<div class="wiki-result-text">' +
            '<div class="wiki-result-title">'+escHtml(title)+'</div>' +
            '<div class="wiki-result-url">'+escHtml(active.wiki)+'.fandom.com/wiki/'+escHtml(slug)+'</div>' +
          '</div>';
        item.addEventListener('mousedown', function(e) {
          e.preventDefault();
          _selectAttachment({ type:'wiki', data:{ wiki:capturedWiki.wiki, label:capturedWiki.label, slug:slug } });
          _closeAttachPicker();
        });
        wikiResults.appendChild(item);
      });
    };

    var doWikiSearch = function(query) {
      var active = wikiState.active;
      wikiResults.innerHTML = '<div class="wiki-result-loading">Searching\u2026</div>';
      var url = 'https://' + active.wiki + '.fandom.com/api.php' +
        '?action=opensearch&search=' + encodeURIComponent(query) +
        '&limit=10&namespace=0&format=json&origin=*';
      fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(data) { renderWikiResults(data[1] || [], active); })
        .catch(function() {
          wikiResults.innerHTML = '<div class="wiki-result-empty">Search failed \u2014 check your connection</div>';
        });
    };

    var setActiveWiki = function(wiki, label) {
      wikiState.active = { wiki: wiki, label: label };
      document.querySelectorAll('.wiki-sub-tab').forEach(function(t) {
        t.classList.toggle('active', t.dataset.wiki === wiki);
      });
      wikiInput.value = '';
      doWikiSearch('winterpixel');
      wikiInput.focus();
    };

    body.querySelectorAll('.wiki-sub-tab').forEach(function(t) {
      t.addEventListener('click', function() { setActiveWiki(t.dataset.wiki, t.dataset.label); });
    });

    wikiInput.addEventListener('input', function() {
      clearTimeout(wikiState.timer);
      var q = wikiInput.value.trim();
      wikiState.timer = setTimeout(function() {
        doWikiSearch(q || 'winterpixel');
      }, 300);
    });

    // Pre-populate on open
    doWikiSearch('winterpixel');
    setTimeout(function() { wikiInput.focus(); }, 50);

    } else if (tab === 'stats') {
    body.innerHTML =
      '<p class="attach-section-hint">Look up a player and share their stats card.</p>' +
      '<div class="stats-search-wrap">' +
        '<div class="stats-ac-wrap">' +
          '<input id="stats-embed-input" class="attach-embed-input" placeholder="Username, User ID, or Friend Code…" autocomplete="off" />' +
          '<div class="stats-ac-dropdown" id="stats-ac-dropdown"></div>' +
        '</div>' +
        '<button class="attach-embed-add" id="stats-embed-btn">Look Up</button>' +
        '<div class="stats-embed-status" id="stats-embed-status"></div>' +
      '</div>';

    var input    = document.getElementById('stats-embed-input');
    var dropdown = document.getElementById('stats-ac-dropdown');
    if (input && dropdown) _buildPlayerAcDropdown(input, dropdown);

    document.getElementById('stats-embed-btn').addEventListener('click', function() {
      _doStatsLookup();
    });
    if (input) {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') _doStatsLookup();
      });
    }
  }
}

async function _doStatsLookup() {
  var input  = document.getElementById('stats-embed-input');
  var status = document.getElementById('stats-embed-status');
  var btn    = document.getElementById('stats-embed-btn');
  if (!input || !input.value.trim()) return;

  btn.disabled = true;
  status.textContent = 'Looking up…';
  status.className   = 'stats-embed-status';

  try {
    var userId  = await _resolvePlayer(input.value.trim());
    if (!userId) { status.textContent = 'Player not found.'; status.className = 'stats-embed-status err'; btn.disabled=false; return; }
    var profile = await _fetchProfile(userId);
    var stats   = (profile.metadata && profile.metadata.stats) || {};
    var level   = profile.metadata && profile.metadata.progress ? profile.metadata.progress.level : 0;
    var kdr     = stats.deaths ? (stats.player_kills / stats.deaths) : 0;
    var winrate = stats.games_played ? (100 * stats.games_won / stats.games_played) : 0;
    var skin    = (profile.metadata && profile.metadata.skin) || 'default_tank';
    var badge   = profile.metadata && profile.metadata.badge;

    var attachment = {
      type:   'stats',
      data: {
        userId:      userId,
        name:        profile.display_name || 'Unknown',
        skin:        skin,
        badge:       badge || null,
        level:       level,
        kills:       stats.player_kills || 0,
        deaths:      stats.deaths       || 0,
        wins:        stats.games_won    || 0,
        played:      stats.games_played || 0,
        kdr:         kdr,
        winrate:     winrate,
        online:      profile.online || false,
      }
    };

    _selectAttachment(attachment);
    status.textContent = '';
    _closeAttachPicker();
  } catch(e) {
    status.textContent = 'Error: ' + e.message;
    status.className   = 'stats-embed-status err';
  } finally {
    btn.disabled = false;
  }
}

// ── EVENTS ───────────────────────────────────────────────────────
function _wireAttachEvents() {
  document.addEventListener('click', function(e) {
    // Toggle picker
    if (e.target.closest('#attach-btn')) {
      e.stopPropagation();
      _attachPickerOpen = !_attachPickerOpen;
      var picker = document.getElementById('attach-picker');
      if (picker) picker.classList.toggle('open', _attachPickerOpen);
      return;
    }

    // Tab switch
    var tab = e.target.closest('.attach-tab');
    if (tab && document.getElementById('attach-picker')) {
      _renderAttachTab(tab.dataset.tab);
      return;
    }

    // Wiki results handled by mousedown on .wiki-result-item (inside _renderAttachTab)

    // Remove preview
    if (e.target.closest('#attach-preview-remove')) {
      _clearAttachment();
      return;
    }

    // Close on outside click
    if (!e.target.closest('#attach-picker') && !e.target.closest('#attach-btn')) {
      _closeAttachPicker();
    }
  });
}

function _closeAttachPicker() {
  _attachPickerOpen = false;
  var picker = document.getElementById('attach-picker');
  if (picker) picker.classList.remove('open');
}

function _selectAttachment(attachment) {
  _pendingAttachment = attachment;
  var preview = document.getElementById('attach-preview');
  if (!preview) return;
  preview.style.display = 'flex';

  if (attachment.type === 'wiki') {
    preview.innerHTML =
      '<span class="attach-preview-icon" style="display:flex;align-items:center;color:var(--blue-muted);">'+SVG_WIKI+'</span>' +
      '<span class="attach-preview-label">'+escHtml(attachment.data.label)+' — '+escHtml(attachment.data.slug.replace(/_/g,' '))+'</span>' +
      '<button id="attach-preview-remove" class="reply-cancel" title="Remove">✕</button>';
  } else if (attachment.type === 'stats') {
    preview.innerHTML =
      '<img src="ui/icons/pfp/'+escHtml(attachment.data.skin)+'.png" onerror="this.src=\'ui/icons/pfp/default_tank.png\'" class="attach-preview-img" style="image-rendering:pixelated">' +
      '<span class="attach-preview-label">'+escHtml(attachment.data.name)+'\'s stats</span>' +
      '<button id="attach-preview-remove" class="reply-cancel" title="Remove">✕</button>';
  }

  var sendBtn = document.getElementById('compose-send');
  if (sendBtn) sendBtn.disabled = false;
}

function _clearAttachment() {
  _pendingAttachment = null;
  var preview = document.getElementById('attach-preview');
  if (preview) { preview.style.display = 'none'; preview.innerHTML = ''; }
  var inp = document.getElementById('compose-input');
  if (inp) inp.dispatchEvent(new Event('input'));
}

// ── PUBLIC API (called by forum.js) ──────────────────────────────
function getAttachment()   { return _pendingAttachment; }
function clearAttachment() { _clearAttachment(); }

/**
 * Renders stored attachment data into an HTML string for buildMsgEl().
 */
function renderAttachment(attachment) {
  if (!attachment) return '';

  // ── Wiki card ────────────────────────────────────────────────
  if (attachment.type === 'wiki') {
    // Security: re-validate domain on render too
    var wikiSub = (attachment.wiki || '').replace(/[^a-z0-9-]/gi, '');
    var domain  = wikiSub + '.fandom.com';
    if (ALLOWED_WIKI_DOMAINS.indexOf(domain) === -1) return '';
    var url      = 'https://'+domain+'/wiki/'+encodeURIComponent(attachment.slug || '');
    var pageName = escHtml((attachment.slug || '').replace(/_/g, ' '));
    var label    = escHtml(attachment.label || wikiSub + ' Wiki');
    return '<div class="msg-embed msg-embed-wiki">' +
      '<div class="msg-embed-provider">'+label+'</div>' +
      '<a class="msg-embed-title" href="'+url+'" target="_blank" rel="noopener">'+pageName+'</a>' +
      '<div class="msg-embed-url">'+escHtml(domain)+'</div>' +
    '</div>';
  }

  // ── Stats card ───────────────────────────────────────────────
  if (attachment.type === 'stats') {
    var a   = attachment;
    var kdr     = typeof a.kdr     === 'number' ? a.kdr.toFixed(2) : '—';
    var wr      = typeof a.winrate === 'number' ? Math.round(a.winrate) + '%' : '—';
    var status  = a.online ? '<span class="embed-online">● Online</span>' : '';
    var badgeHtml = a.badge
      ? '<img class="embed-badge" src="ui/icons/badges/'+escAttr(a.badge)+'.png" alt="'+escAttr(a.badge)+'" onerror="this.style.display=\'none\'">'
      : '';
    // Use ftoid_prefill via sessionStorage (same as friendtoid.html → stats.html pattern)
    var statsUrl = 'stats.html';
    return '<div class="msg-embed msg-embed-stats">' +
      '<div class="embed-stats-header">' +
        '<img class="embed-tank" src="ui/icons/pfp/'+escAttr(a.skin)+'.png" onerror="this.src=\'ui/icons/pfp/default_tank.png\'" />' +
        '<div class="embed-stats-info">' +
          '<div class="embed-stats-name">'+escHtml(a.name)+badgeHtml+status+'</div>' +
          '<div class="embed-stats-level">Level '+escHtml(String(a.level))+'</div>' +
        '</div>' +
      '</div>' +
      '<div class="embed-stats-grid">' +
        '<div class="embed-stat"><div class="embed-stat-val">'+Number(a.kills).toLocaleString()+'</div><div class="embed-stat-lbl">Kills</div></div>' +
        '<div class="embed-stat"><div class="embed-stat-val">'+Number(a.deaths).toLocaleString()+'</div><div class="embed-stat-lbl">Deaths</div></div>' +
        '<div class="embed-stat"><div class="embed-stat-val">'+kdr+'</div><div class="embed-stat-lbl">K/D</div></div>' +
        '<div class="embed-stat"><div class="embed-stat-val">'+Number(a.wins).toLocaleString()+'</div><div class="embed-stat-lbl">Wins</div></div>' +
        '<div class="embed-stat"><div class="embed-stat-val">'+Number(a.played).toLocaleString()+'</div><div class="embed-stat-lbl">Games</div></div>' +
        '<div class="embed-stat"><div class="embed-stat-val">'+wr+'</div><div class="embed-stat-lbl">Win Rate</div></div>' +
      '</div>' +
      '<a class="embed-stats-link" href="'+statsUrl+'" target="_blank" rel="noopener" ' +
         'onclick="try{sessionStorage.setItem(\'ftoid_prefill\',\''+escAttr(a.userId)+'\');}catch(e){}">View Full Stats →</a>' +
    '</div>';
  }

  return '';
}
