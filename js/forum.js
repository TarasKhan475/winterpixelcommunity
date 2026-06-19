const firebaseConfig = {
  apiKey:            "AIzaSyDyrbOkMUrDcXmeE3WlwNrWbkOVNg-UGEg",
  authDomain:        "winterpixelcommunity.firebaseapp.com",
  projectId:         "winterpixelcommunity",
  storageBucket:     "winterpixelcommunity.firebasestorage.app",
  messagingSenderId: "590927242514",
  appId:             "1:590927242514:web:d99b37ff6ad67f1b83ffcb"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

var BANNED_WORDS = ['nigger','nigga','faggot','retard','kys','kill yourself','cunt','chink','spic','tranny'];
function containsBannedWord(t) { var l=t.toLowerCase(); return BANNED_WORDS.some(function(w){return l.includes(w);}); }
var recentSends = [];
function isThrottled() { var n=Date.now(); recentSends=recentSends.filter(function(t){return n-t<5000;}); return recentSends.length>=3; }
function recordSend() { recentSends.push(Date.now()); }

// CHANNELS
var CHANNELS = {
  'general':           { label: 'General',           desc: 'General chat for anything Winterpixel' },
  'rocket-bot-royale': { label: 'Rocket Bot Royale',  desc: 'Everything about Rocket Bot Royale' },
  'goober-dash':       { label: 'Goober Dash',        desc: 'Everything about Goober Dash' },
  'bugs':              { label: 'Bugs',               desc: 'Report bugs and technical issues' },
  'highlights':        { label: 'Highlights',         desc: 'Share your best moments and clips' }
};

// ================================================================
// LOCAL STORAGE CACHE
// ================================================================
var CACHE_TTL_MSGS    = 30000;
var CACHE_TTL_SEARCH  = 120000;
var CACHE_TTL_PROFILE = 300000;

function lsGet(key) {
  try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
  catch(e) { return null; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
}

function tsToMs(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate   === 'function') return ts.toDate().getTime();
  if (typeof ts === 'number') return ts;
  return 0;
}
function msToFakTs(ms) { return { _ms: ms, toDate: function(){ return new Date(ms); } }; }

function serializeMsg(doc) {
  var d = doc.data ? doc.data() : doc;
  var id = doc.id || d._id;
  return {
    _id:        id,
    uid:        d.uid        || '',
    username:   d.username   || 'Unknown',
    pfp:        d.pfp        || null,
    isMod:      d.isMod      || false,
    text:       d.text       || '',
    createdAt:  tsToMs(d.createdAt),
    replyTo:    d.replyTo    || null,
    attachment: d.attachment || null   // ← new field
  };
}

// ================================================================
// STATE
// ================================================================
var currentUser    = null;
var currentProfile = null;
var currentChannel = 'general';
var unsubMessages  = null;
var replyTo        = null;
var jumpToId       = null;
var channelOldestCursor = {};
var channelLiveSince    = {};
var channelMsgMap       = {};

// ================================================================
// HELPERS
// ================================================================
function timeAgo(ts) {
  if (!ts) return '';
  var d = (ts && ts.toDate) ? ts.toDate() : (ts && ts._ms ? new Date(ts._ms) : new Date(ts));
  var diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  return d.toLocaleDateString();
}
function initials(u) { return (u||'?').charAt(0).toUpperCase(); }
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s) { return String(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

function renderText(text) {
  var esc = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return esc.replace(/https?:\/\/\S+\.(png|jpg|jpeg|gif|webp)(\?\S*)?/gi, function(url){
    var safeUrl = url.replace(/"/g,'%22').replace(/'/g,'%27');
    return '</p><img src="'+safeUrl+'" alt="" loading="lazy" onerror="this.style.display=\'none\'" /><p>';
  });
}

function avatarHtml(d, size) {
  size = size || 32;
  var s = 'width:'+size+'px;height:'+size+'px;';
  if (d && d.pfp) {
    var safePfp = String(d.pfp).replace(/"/g,'%22').replace(/'/g,'%27');
    return '<div class="msg-avatar" style="'+s+'"><img src="'+safePfp+'" alt="" onerror="this.style.display=\'none\'"/></div>';
  }
  return '<div class="msg-avatar" style="'+s+'">'+initials(d && d.username)+'</div>';
}

// ================================================================
// NOTIFICATIONS
// ================================================================
var unsubNotifications = null;
var unreadCount = 0;

function listenNotifications(uid) {
  if (unsubNotifications) unsubNotifications();
  unsubNotifications = db
    .collection('users').doc(uid).collection('notifications')
    .where('read','==',false)
    .onSnapshot(function(snap) {
      unreadCount = snap.size;
      var badge = document.getElementById('notif-count');
      if (unreadCount > 0) {
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }, function(){});
}

var notifListLoaded = false;
function loadNotifList(uid) {
  if (!uid) return;
  var list = document.getElementById('notif-list');
  list.innerHTML = '<div style="padding:1rem;text-align:center;font-size:12px;color:#475569;">Loading\u2026</div>';
  db.collection('users').doc(uid).collection('notifications')
    .orderBy('createdAt','desc').limit(30)
    .get().then(function(snap) {
      var items = [];
      snap.forEach(function(doc) { items.push(Object.assign({id:doc.id}, doc.data())); });
      renderNotifList(items);
      notifListLoaded = true;
    }).catch(function(){ list.innerHTML='<div style="padding:1rem;text-align:center;font-size:12px;">Failed to load.</div>'; });
}

function renderNotifList(items) {
  var list = document.getElementById('notif-list');
  if (!items.length) { list.innerHTML='<div style="padding:1.5rem;text-align:center;font-size:13px;color:#475569;">No notifications yet</div>'; return; }
  list.innerHTML = items.map(function(n) {
    var text = n.type==='reply'
      ? '<strong>'+escHtml(n.fromUser||'Someone')+'</strong> replied: '+escHtml(n.preview||'')
      : escHtml(n.preview||'New activity');
    return '<div class="notif-item'+(n.read?'':' unread')+'" data-id="'+n.id+'" data-channel="'+(n.channel||'')+'" data-msgid="'+(n.messageId||'')+'">'+
      '<div class="notif-item-avatar">'+(n.type==='reply'?'↩':'🔔')+'</div>'+
      '<div class="notif-item-text">'+
        '<div class="notif-item-name">'+text+'</div>'+
        '<div class="notif-item-time">'+timeAgo(n.createdAt)+'</div>'+
      '</div></div>';
  }).join('');
}

function pushNotification(toUid, type, data) {
  if (!toUid) return;
  db.collection('users').doc(toUid).collection('notifications').add({
    type:type, read:false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    channel:   data.channel   || null,
    messageId: data.messageId || null,
    fromUser:  data.fromUser  || null,
    preview:   data.preview   || null
  }).catch(function(){});
}

// ================================================================
// MESSAGE RENDERING
// ================================================================
function buildMsgEl(msgData, grouped) {
  var id     = msgData._id;
  var isMod  = currentProfile && currentProfile.mod === true;
  var isOwn  = currentUser && currentUser.uid === msgData.uid;
  var canDel = isOwn || isMod;

  var replyHtml = '';
  if (msgData.replyTo) {
    replyHtml = '<div class="msg-reply-quote" data-jump="'+escAttr(msgData.replyTo.id||'')+'">'+
      '<strong>@'+escHtml(msgData.replyTo.username||'Unknown')+'</strong> '+
      escHtml((msgData.replyTo.text||'').slice(0,60))+'</div>';
  }

  // Attachment rendering (delegated to forum-attachments.js)
  var attachHtml = (typeof renderAttachment === 'function') ? renderAttachment(msgData.attachment) : '';

  var actionsHtml = '<div class="msg-actions">';
  if (currentUser) {
    actionsHtml += '<button class="msg-action-btn reply-btn"'+
      ' data-id="'+escAttr(id)+'"'+
      ' data-uid="'+escAttr(msgData.uid)+'"'+
      ' data-username="'+escAttr(msgData.username)+'"'+
      ' data-text="'+escAttr((msgData.text||'').slice(0,60))+'"'+
      '>\u21a9 Reply</button>';
  }
  if (canDel) actionsHtml += '<button class="msg-action-btn del del-btn" data-id="'+escAttr(id)+'" title="Shift+click to skip confirm">\u2715</button>';
  actionsHtml += '</div>';

  var el = document.createElement('div');
  el.className = 'msg' + (grouped ? ' grouped' : '');
  el.dataset.id = id;
  el.dataset.ts = msgData.createdAt || 0;
  el.innerHTML =
    avatarHtml(msgData, 32) +
    '<div class="msg-body">'+
      '<div class="msg-meta">'+
        '<span class="msg-username'+(msgData.isMod?' mod-name':'')+'" data-username="'+escAttr(msgData.username||'')+'">'+escHtml(msgData.username||'Unknown')+'</span>'+
        '<span class="msg-time">'+timeAgo(msgData.createdAt ? msToFakTs(msgData.createdAt) : null)+'</span>'+
      '</div>'+
      replyHtml+
      '<div class="msg-text"><p>'+renderText(msgData.text||'')+'</p>'+attachHtml+'</div>'+
    '</div>'+
    actionsHtml;
  return el;
}

// ================================================================
// CHANNEL SWITCHING
// ================================================================
function switchChannel(channelId) {
  if (!CHANNELS[channelId]) channelId = 'general';
  currentChannel = channelId;
  cancelReply();

  document.querySelectorAll('.channel-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.channel === channelId);
  });
  var ch = CHANNELS[channelId];
  document.getElementById('channel-title').textContent = '# '+ch.label;
  document.getElementById('channel-desc').textContent  = ch.desc;
  var inp = document.getElementById('compose-input');
  if (inp) inp.placeholder = 'Message #'+ch.label.toLowerCase()+'\u2026';

  loadMessages(channelId);
}

document.querySelectorAll('.channel-btn').forEach(function(btn) {
  btn.addEventListener('click', function(){ switchChannel(btn.dataset.channel); });
});

// ================================================================
// MESSAGE LOADING
// ================================================================
var PAGE_SIZE = 30;

function loadMessages(channelId) {
  if (unsubMessages) { unsubMessages(); unsubMessages = null; }
  var list = document.getElementById('messages-list');
  if (!channelMsgMap[channelId]) channelMsgMap[channelId] = {};

  var cacheKey  = 'forum_msgs_' + channelId;
  var cached    = lsGet(cacheKey);
  var newestCachedMs = 0;

  if (cached && cached.msgs && cached.msgs.length) {
    channelMsgMap[channelId] = {};
    cached.msgs.forEach(function(m) { channelMsgMap[channelId][m._id] = m; });
    renderAllMessages(channelId, true);
    newestCachedMs = cached.msgs.reduce(function(max, m) { return Math.max(max, m.createdAt||0); }, 0);
  } else {
    list.innerHTML = '<div class="msgs-loading">Loading\u2026</div>';
  }

  attachTailListener(channelId, newestCachedMs);
}

function attachTailListener(channelId, afterMs) {
  var ref = db.collection('channels').doc(channelId).collection('messages')
              .orderBy('createdAt', 'asc');

  if (afterMs > 0) {
    ref = ref.startAfter(new Date(afterMs));
  } else {
    ref = ref.limitToLast(PAGE_SIZE);
  }

  var isFirst = true;
  unsubMessages = ref.onSnapshot(function(snap) {
    if (isFirst && snap.empty) {
      if (!channelMsgMap[channelId] || !Object.keys(channelMsgMap[channelId]).length) {
        document.getElementById('messages-list').innerHTML =
          '<div class="msgs-empty">No messages yet. Be the first!</div>';
      }
      isFirst = false;
      return;
    }

    var ch = channelId;
    var wasFirst = isFirst;
    isFirst = false;

    snap.docChanges().forEach(function(change) {
      if (change.type === 'added' || change.type === 'modified') {
        var s = serializeMsg(change.doc);
        if (!s.createdAt) s.createdAt = Date.now();
        channelMsgMap[ch][s._id] = s;
      }
      if (change.type === 'removed') {
        delete channelMsgMap[ch][change.doc.id];
        var el = document.querySelector('.messages-list [data-id="'+change.doc.id+'"]');
        if (el) el.remove();
      }
    });

    saveMsgCache(ch);

    if (wasFirst && !snap.metadata.hasPendingWrites) {
      renderAllMessages(ch, true);
    } else {
      snap.docChanges().forEach(function(change) {
        if (change.type === 'removed') return;
        var s = channelMsgMap[ch][change.doc.id];
        if (!s) return;
        appendOrUpdateMsg(s);
      });
    }

    if (jumpToId) {
      var target = document.querySelector('[data-id="'+jumpToId+'"]');
      if (target) {
        target.scrollIntoView({ behavior:'smooth', block:'center' });
        target.classList.add('highlighted');
        setTimeout(function(){ target.classList.remove('highlighted'); }, 3000);
        jumpToId = null;
      }
    }
  }, function(err) {
    console.error('Listener error:', err);
    var list = document.getElementById('messages-list');
    if (!Object.keys(channelMsgMap[channelId]||{}).length)
      list.innerHTML = '<div class="msgs-empty">Could not load messages.</div>';
  });
}

function saveMsgCache(channelId) {
  var msgs = Object.values(channelMsgMap[channelId]||{});
  msgs.sort(function(a,b){return (a.createdAt||0)-(b.createdAt||0);});
  msgs = msgs.slice(-100);
  lsSet('forum_msgs_'+channelId, { ts: Date.now(), msgs: msgs });
}

function appendOrUpdateMsg(msgData) {
  var list = document.getElementById('messages-list');
  var existing = list.querySelector('[data-id="'+msgData._id+'"]');
  var el = buildMsgEl(msgData);

  var placeholder = list.querySelector('.msgs-loading, .msgs-empty');
  if (placeholder) placeholder.remove();

  if (existing) {
    // Preserve timestamp from existing element if server hasn't confirmed yet
    el.dataset.ts = msgData.createdAt || existing.dataset.ts || 0;
    list.replaceChild(el, existing);
    // Always recheck grouping on update (server-confirmed timestamp may differ from optimistic)
    recheckGrouping(el);
  } else {
    var ts = msgData.createdAt || 0;
    var inserted = false;
    var kids = list.children;
    for (var i = kids.length - 1; i >= 0; i--) {
      var kidTs = parseInt(kids[i].dataset.ts||0, 10);
      if (kidTs <= ts) {
        list.insertBefore(el, kids[i].nextSibling);
        inserted = true;
        recheckGrouping(el);
        break;
      }
    }
    if (!inserted) {
      list.insertBefore(el, list.firstChild);
      recheckGrouping(el);
    }

    var atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 120;
    if (atBottom) list.scrollTop = list.scrollHeight;
  }
}

function recheckGrouping(el) {
  var prev = el.previousElementSibling;
  while (prev && (prev.id === 'load-older-wrap' || !prev.dataset.id)) prev = prev.previousElementSibling;
  if (!prev || !prev.dataset.id) return;
  var prevData = channelMsgMap[currentChannel] && channelMsgMap[currentChannel][prev.dataset.id];
  var elData   = channelMsgMap[currentChannel] && channelMsgMap[currentChannel][el.dataset.id];
  if (!prevData || !elData) return;
  var timeDiff = (elData.createdAt || 0) - (prevData.createdAt || 0);
  var shouldGroup = prevData.uid === elData.uid && !elData.replyTo && timeDiff < 5 * 60 * 1000;
  el.classList.toggle('grouped', shouldGroup);
  var next = el.nextElementSibling;
  if (next && next.dataset.id) {
    var nextData = channelMsgMap[currentChannel] && channelMsgMap[currentChannel][next.dataset.id];
    if (nextData) {
      var timeDiff2 = (nextData.createdAt || 0) - (elData.createdAt || 0);
      next.classList.toggle('grouped', elData.uid === nextData.uid && !nextData.replyTo && timeDiff2 < 5 * 60 * 1000);
    }
  }
}

function renderAllMessages(channelId, scrollToBottom) {
  var list = document.getElementById('messages-list');
  var msgs = Object.values(channelMsgMap[channelId]||{});
  msgs.sort(function(a,b){ return (a.createdAt||0)-(b.createdAt||0); });

  if (!msgs.length) {
    list.innerHTML = '<div class="msgs-loading">Loading\u2026</div>';
    return;
  }

  var hasMore = msgs.length >= PAGE_SIZE;
  var olderBtn = hasMore
    ? '<div id="load-older-wrap" style="text-align:center;padding:8px;">'+
      '<button id="load-older-btn" style="font-family:inherit;font-size:12px;font-weight:700;'+
      'background:var(--blue-pale);border:1.5px solid var(--blue-light);border-radius:var(--radius-sm);'+
      'padding:4px 14px;cursor:pointer;color:var(--blue-deep);">Load older messages</button></div>'
    : '';

  list.innerHTML = olderBtn;
  msgs.forEach(function(m, i) {
    var prev = i > 0 ? msgs[i-1] : null;
    var grouped = prev && prev.uid === m.uid && !m.replyTo && (m.createdAt - prev.createdAt < 5 * 60 * 1000);
    list.appendChild(buildMsgEl(m, grouped));
  });

  if (scrollToBottom !== false) list.scrollTop = list.scrollHeight;

  var lob = document.getElementById('load-older-btn');
  if (lob) lob.addEventListener('click', function() { loadOlderMessages(channelId); });
}

function loadOlderMessages(channelId) {
  var btn = document.getElementById('load-older-btn');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = 'Loading\u2026';

  var msgs = Object.values(channelMsgMap[channelId]||{});
  msgs.sort(function(a,b){ return (a.createdAt||0)-(b.createdAt||0); });
  var oldest = msgs[0];

  var query = db.collection('channels').doc(channelId).collection('messages')
    .orderBy('createdAt','desc').limit(PAGE_SIZE);
  if (oldest) query = query.startAfter(new Date(oldest.createdAt));

  query.get().then(function(snap) {
    if (snap.empty) {
      var wrap = document.getElementById('load-older-wrap');
      if (wrap) wrap.innerHTML = '<p style="text-align:center;font-size:12px;color:var(--gray-muted);padding:8px;">Beginning of channel</p>';
      return;
    }

    var list  = document.getElementById('messages-list');
    var frag  = document.createDocumentFragment();
    var addedAny = false;

    snap.forEach(function(doc) {
      var s = serializeMsg(doc);
      if (!channelMsgMap[channelId][s._id]) {
        channelMsgMap[channelId][s._id] = s;
        frag.insertBefore(buildMsgEl(s), frag.firstChild);
        addedAny = true;
      }
    });

    if (addedAny) {
      var loadWrap  = document.getElementById('load-older-wrap');
      var oldScroll = list.scrollHeight;
      if (loadWrap) loadWrap.after(frag);
      else list.insertBefore(frag, list.firstChild);
      list.scrollTop += (list.scrollHeight - oldScroll);
      saveMsgCache(channelId);
    }

    if (snap.size < PAGE_SIZE) {
      var wrap2 = document.getElementById('load-older-wrap');
      if (wrap2) wrap2.innerHTML = '<p style="text-align:center;font-size:12px;color:var(--gray-muted);padding:8px;">Beginning of channel</p>';
    } else {
      if (btn) { btn.disabled = false; btn.textContent = 'Load older messages'; }
    }
  }).catch(function(err) {
    console.error('Load older failed:', err);
    if (btn) { btn.disabled = false; btn.textContent = 'Load older messages'; }
  });
}

function tryJumpToId(id, channelId, attemptsLeft) {
  attemptsLeft = attemptsLeft === undefined ? 4 : attemptsLeft;
  var target = document.querySelector('[data-id="'+id+'"]');
  if (target) {
    target.scrollIntoView({ behavior:'smooth', block:'center' });
    target.classList.add('highlighted');
    setTimeout(function(){ target.classList.remove('highlighted'); }, 3000);
    jumpToId = null;
    return;
  }
  if (attemptsLeft <= 0) { jumpToId = null; return; }
  var msgs = Object.values(channelMsgMap[channelId]||{});
  msgs.sort(function(a,b){ return (a.createdAt||0)-(b.createdAt||0); });
  var oldest = msgs[0];
  if (!oldest) return;

  db.collection('channels').doc(channelId).collection('messages')
    .orderBy('createdAt','desc').startAfter(new Date(oldest.createdAt)).limit(PAGE_SIZE)
    .get().then(function(snap) {
      snap.forEach(function(doc) {
        var s = serializeMsg(doc);
        channelMsgMap[channelId][s._id] = s;
      });
      renderAllMessages(channelId, false);
      setTimeout(function(){ tryJumpToId(id, channelId, attemptsLeft-1); }, 150);
    }).catch(function(){ jumpToId = null; });
}

// ================================================================
// MESSAGE LIST EVENTS
// ================================================================
document.getElementById('messages-list').addEventListener('click', function(e) {
  var usernameEl = e.target.closest('.msg-username');
  if (usernameEl && usernameEl.dataset.username) {
    window.location.href = 'profile.html?user=' + encodeURIComponent(usernameEl.dataset.username);
    return;
  }

  var quote = e.target.closest('.msg-reply-quote');
  if (quote && quote.dataset.jump) {
    var target = document.querySelector('[data-id="'+quote.dataset.jump+'"]');
    if (target) {
      target.scrollIntoView({ behavior:'smooth', block:'center' });
      target.classList.add('highlighted');
      setTimeout(function(){ target.classList.remove('highlighted'); }, 2500);
    } else {
      jumpToId = quote.dataset.jump;
      tryJumpToId(quote.dataset.jump, currentChannel, 4);
    }
    return;
  }

  var replyBtn = e.target.closest('.reply-btn');
  if (replyBtn && currentUser) {
    setReply({ id:replyBtn.dataset.id, uid:replyBtn.dataset.uid, username:replyBtn.dataset.username, text:replyBtn.dataset.text });
    document.getElementById('compose-input').focus();
    return;
  }

  var delBtn = e.target.closest('.del-btn');
  if (delBtn && currentUser) {
    var skipConfirm = e.shiftKey;
    if (!skipConfirm && !confirm('Delete this message?')) return;
    var msgId  = delBtn.dataset.id;
    var msgEl  = document.querySelector('[data-id="'+msgId+'"]');
    if (msgEl) msgEl.classList.add('deleting');
    db.collection('channels').doc(currentChannel).collection('messages').doc(msgId)
      .delete()
      .then(function() {
        var el2 = document.querySelector('[data-id="'+msgId+'"]');
        if (el2) el2.classList.add('deleted');
        var msgObj = channelMsgMap[currentChannel] && channelMsgMap[currentChannel][msgId];
        if (msgObj && msgObj.uid) {
          db.collection('users').doc(msgObj.uid).update({
            messageCount: firebase.firestore.FieldValue.increment(-1)
          }).catch(function(){});
        }
        if (channelMsgMap[currentChannel]) delete channelMsgMap[currentChannel][msgId];
        saveMsgCache(currentChannel);
      })
      .catch(function(err) {
        console.error('Delete failed:', err);
        var el3 = document.querySelector('[data-id="'+msgId+'"]');
        if (el3) el3.classList.remove('deleting');
        showWarn('Delete failed — check permissions.');
      });
  }
});

// ================================================================
// REPLY STATE
// ================================================================
function setReply(data) {
  replyTo = data;
  var preview = document.getElementById('reply-preview');
  var text    = document.getElementById('reply-preview-text');
  preview.classList.add('visible');
  text.innerHTML = 'Replying to <strong>@'+escHtml(data.username)+'</strong>: '+escHtml(data.text);
}
function cancelReply() {
  replyTo = null;
  var p = document.getElementById('reply-preview');
  if (p) p.classList.remove('visible');
}
document.getElementById('reply-cancel').addEventListener('click', cancelReply);

// ================================================================
// COMPOSE
// ================================================================
var composeInput = document.getElementById('compose-input');
var composeSend  = document.getElementById('compose-send');
var charCount    = document.getElementById('char-count');
var rateWarn     = document.getElementById('rate-warn');

composeInput.addEventListener('input', function() {
  var len = composeInput.value.length;
  var rem = 200 - len;
  charCount.textContent = rem;
  charCount.className = 'char-count' + (rem<=0?' over':rem<=30?' warn':'');
  // Keep send enabled if there's a pending attachment even with empty text
  var hasAttach = typeof getAttachment === 'function' && getAttachment();
  composeSend.disabled = (len===0 && !hasAttach) || len>200;
  composeInput.style.height = 'auto';
  composeInput.style.height = Math.min(composeInput.scrollHeight, 120)+'px';
});

composeInput.addEventListener('keydown', function(e) {
  if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); if (!composeSend.disabled) sendMessage(); }
});
composeSend.addEventListener('click', sendMessage);

function showWarn(msg) {
  rateWarn.textContent = msg;
  rateWarn.style.display = 'block';
  setTimeout(function(){ rateWarn.style.display='none'; }, 3000);
}

function sendMessage() {
  if (!currentUser || !currentProfile) return;
  var text = composeInput.value.trim();
  var attachment = (typeof getAttachment === 'function') ? getAttachment() : null;
  if (!text && !attachment) return;
  if (text.length > 200) return;
  if (currentProfile.banned)       { showWarn('Your account has been suspended.'); return; }
  if (isThrottled())               { showWarn('Slow down \u2014 wait a moment before sending again.'); return; }
  if (text && containsBannedWord(text)) { showWarn('Message contains disallowed content.'); return; }

  composeSend.disabled = true;
  doActualSend(text, attachment);
}

function doActualSend(text, attachment) {
  recordSend();
  var msgData = {
    uid:       currentUser.uid,
    username:  currentProfile.username,
    pfp:       currentProfile.pfp || null,
    isMod:     currentProfile.mod === true,
    text:      text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  if (replyTo)    msgData.replyTo    = { id:replyTo.id, uid:replyTo.uid||null, username:replyTo.username, text:replyTo.text };
  if (attachment) msgData.attachment = attachment.type === 'wiki'
    ? { type:'wiki', wiki:attachment.data.wiki, label:attachment.data.label, slug:attachment.data.slug }
    : attachment.type === 'stats'
      ? { type:'stats', userId:attachment.data.userId, name:attachment.data.name, skin:attachment.data.skin,
          badge:attachment.data.badge, level:attachment.data.level, kills:attachment.data.kills,
          deaths:attachment.data.deaths, wins:attachment.data.wins, played:attachment.data.played,
          kdr:attachment.data.kdr, winrate:attachment.data.winrate, online:attachment.data.online }
      : null;

  db.collection('channels').doc(currentChannel).collection('messages').add(msgData)
    .then(function(ref) {
      db.collection('users').doc(currentUser.uid).update({
        messageCount: firebase.firestore.FieldValue.increment(1)
      }).catch(function(){});
      if (replyTo && replyTo.uid && replyTo.uid !== currentUser.uid) {
        pushNotification(replyTo.uid, 'reply', { channel:currentChannel, messageId:ref.id, fromUser:currentProfile.username, preview:text.slice(0,60) });
      }
      composeInput.value = '';
      composeInput.style.height = 'auto';
      charCount.textContent = '200';
      charCount.className = 'char-count';
      composeSend.disabled = true;
      cancelReply();
      if (typeof clearAttachment === 'function') clearAttachment();
    })
    .catch(function(err){ console.error('Send failed:',err); composeSend.disabled=false; });
}

// ================================================================
// SEARCH
// ================================================================
var searchTimer   = null;
var searchInput   = document.getElementById('forum-search-input');
var searchResults = document.getElementById('sidebar-search-results');
var channelList   = document.getElementById('sidebar-channel-list');

searchInput.addEventListener('input', function() {
  clearTimeout(searchTimer);
  var q = searchInput.value.trim().toLowerCase();
  if (!q) {
    searchResults.classList.remove('visible');
    searchResults.innerHTML = '';
    channelList.style.display = '';
    return;
  }
  channelList.style.display = 'none';
  searchResults.classList.add('visible');
  searchResults.innerHTML = '<div class="search-loading">Searching\u2026</div>';
  searchTimer = setTimeout(function(){ runSearch(q); }, 400);
});

function runSearch(q) {
  var channels = Object.keys(CHANNELS);
  var allMsgs  = [];
  var loaded   = 0;
  var now      = Date.now();

  channels.forEach(function(ch) {
    var cacheKey = 'forum_search_' + ch;
    var cached   = lsGet(cacheKey);
    if (cached && now - cached.ts < CACHE_TTL_SEARCH) {
      allMsgs = allMsgs.concat(cached.msgs);
      if (++loaded === channels.length) renderSearch(allMsgs, q);
      return;
    }
    db.collection('channels').doc(ch).collection('messages')
      .orderBy('createdAt','desc').limit(PAGE_SIZE * 3)
      .get().then(function(snap) {
        var msgs = [];
        snap.forEach(function(doc) {
          var d = doc.data();
          msgs.push({ _id:doc.id, channel:ch, username:d.username||'Unknown', text:d.text||'', createdAt:tsToMs(d.createdAt) });
        });
        lsSet(cacheKey, { ts:now, msgs:msgs });
        allMsgs = allMsgs.concat(msgs);
        if (++loaded === channels.length) renderSearch(allMsgs, q);
      })
      .catch(function(){ if (++loaded === channels.length) renderSearch(allMsgs, q); });
  });
}

function renderSearch(msgs, q) {
  var safe = q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  var matched = msgs.filter(function(m){
    return m.text.toLowerCase().includes(q) || m.username.toLowerCase().includes(q);
  }).sort(function(a,b){return (b.createdAt||0)-(a.createdAt||0);}).slice(0,30);

  if (!matched.length) {
    searchResults.innerHTML = '<div class="search-no-results">No results for "'+escHtml(q)+'"</div>';
    return;
  }
  searchResults.innerHTML = matched.map(function(m) {
    var hi = escHtml(m.text).replace(new RegExp('('+safe+')','gi'),'<mark style="background:#fff1a0;border-radius:2px;">$1</mark>');
    return '<div class="search-result-msg" data-channel="'+m.channel+'" data-msgid="'+m._id+'">'+
      '<div class="search-result-msg-meta">'+
        '<span class="search-result-ch">'+CHANNELS[m.channel].label+'</span>'+
        '<span class="search-result-user">'+escHtml(m.username)+'</span>'+
        '<span class="search-result-time">'+timeAgo({_ms:m.createdAt})+'</span>'+
      '</div>'+
      '<div class="search-result-text">'+hi+'</div>'+
    '</div>';
  }).join('');
}

searchResults.addEventListener('click', function(e) {
  var item = e.target.closest('.search-result-msg');
  if (!item) return;
  jumpToId = item.dataset.msgid;
  searchInput.value = '';
  searchResults.classList.remove('visible');
  channelList.style.display = '';
  switchChannel(item.dataset.channel);
  setTimeout(function(){ if (jumpToId) tryJumpToId(jumpToId, item.dataset.channel, 4); }, 800);
});

// ================================================================
// MOBILE SEARCH
// ================================================================
(function() {
  var mobileBtn     = document.getElementById('mobile-search-btn');
  var mobileOverlay = document.getElementById('mobile-search-overlay');
  var mobileInput   = document.getElementById('mobile-search-input');
  var mobileClose   = document.getElementById('mobile-search-close');
  var mobileResults = document.getElementById('mobile-search-results');
  var mobileTimer   = null;

  function openMobileSearch() {
    mobileOverlay.classList.add('open');
    mobileInput.value = '';
    mobileResults.innerHTML = '';
    setTimeout(function(){ mobileInput.focus(); }, 50);
  }
  function closeMobileSearch() {
    mobileOverlay.classList.remove('open');
    mobileInput.value = '';
    mobileResults.innerHTML = '';
    clearTimeout(mobileTimer);
  }

  mobileBtn.addEventListener('click', openMobileSearch);
  mobileClose.addEventListener('click', closeMobileSearch);

  mobileInput.addEventListener('input', function() {
    clearTimeout(mobileTimer);
    var q = mobileInput.value.trim().toLowerCase();
    if (!q) { mobileResults.innerHTML = ''; return; }
    mobileResults.innerHTML = '<div class="search-loading">Searching\u2026</div>';
    mobileTimer = setTimeout(function(){ runMobileSearch(q); }, 400);
  });

  function runMobileSearch(q) {
    var channels = Object.keys(CHANNELS);
    var allMsgs  = [];
    var loaded   = 0;
    var now      = Date.now();
    channels.forEach(function(ch) {
      var cacheKey = 'forum_search_' + ch;
      var cached   = lsGet(cacheKey);
      if (cached && now - cached.ts < CACHE_TTL_SEARCH) {
        allMsgs = allMsgs.concat(cached.msgs);
        if (++loaded === channels.length) renderMobileSearch(allMsgs, q);
        return;
      }
      db.collection('channels').doc(ch).collection('messages')
        .orderBy('createdAt','desc').limit(PAGE_SIZE * 3)
        .get().then(function(snap) {
          var msgs = [];
          snap.forEach(function(doc) {
            var d = doc.data();
            msgs.push({ _id:doc.id, channel:ch, username:d.username||'Unknown', text:d.text||'', createdAt:tsToMs(d.createdAt) });
          });
          lsSet(cacheKey, { ts:now, msgs:msgs });
          allMsgs = allMsgs.concat(msgs);
          if (++loaded === channels.length) renderMobileSearch(allMsgs, q);
        })
        .catch(function(){ if (++loaded === channels.length) renderMobileSearch(allMsgs, q); });
    });
  }

  function renderMobileSearch(msgs, q) {
    var safe = q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    var matched = msgs.filter(function(m){
      return m.text.toLowerCase().includes(q) || m.username.toLowerCase().includes(q);
    }).sort(function(a,b){return (b.createdAt||0)-(a.createdAt||0);}).slice(0,30);

    if (!matched.length) {
      mobileResults.innerHTML = '<div class="search-no-results">No results for "'+escHtml(q)+'"</div>';
      return;
    }
    mobileResults.innerHTML = matched.map(function(m) {
      var hi = escHtml(m.text).replace(new RegExp('('+safe+')','gi'),'<mark style="background:#fff1a0;border-radius:2px;">$1</mark>');
      return '<div class="search-result-msg" data-channel="'+m.channel+'" data-msgid="'+m._id+'">'+
        '<div class="search-result-msg-meta">'+
          '<span class="search-result-ch">'+CHANNELS[m.channel].label+'</span>'+
          '<span class="search-result-user">'+escHtml(m.username)+'</span>'+
          '<span class="search-result-time">'+timeAgo({_ms:m.createdAt})+'</span>'+
        '</div>'+
        '<div class="search-result-text">'+hi+'</div>'+
      '</div>';
    }).join('');
  }

  mobileResults.addEventListener('click', function(e) {
    var item = e.target.closest('.search-result-msg');
    if (!item) return;
    jumpToId = item.dataset.msgid;
    closeMobileSearch();
    switchChannel(item.dataset.channel);
    setTimeout(function(){ if (jumpToId) tryJumpToId(jumpToId, item.dataset.channel, 4); }, 800);
  });
})();

// ================================================================
// AUTH STATE
// ================================================================
auth.onAuthStateChanged(function(user) {
  currentUser = user;
  if (user) {
    var profileKey    = 'forum_profile_' + user.uid;
    var cachedProfile = lsGet(profileKey);
    if (cachedProfile && Date.now() - cachedProfile.ts < CACHE_TTL_PROFILE) {
      currentProfile = cachedProfile.data;
      onLoggedIn();
      if (!authResolved) { authResolved = true; switchChannel(initChannel); }
    } else {
      db.collection('users').doc(user.uid).get().then(function(doc) {
        currentProfile = doc.exists ? doc.data() : { username:'Unknown' };
        lsSet(profileKey, { ts:Date.now(), data:currentProfile });
        onLoggedIn();
        if (!authResolved) { authResolved = true; switchChannel(initChannel); }
      });
    }
  } else {
    currentProfile = null;
    onLoggedOut();
    if (!authResolved) { authResolved = true; switchChannel(initChannel); }
  }
});

function onLoggedIn() {
  document.getElementById('compose-wrap').style.display  = 'block';
  document.getElementById('login-prompt').style.display  = 'none';
  document.getElementById('bottom-signin-btn').style.display = 'none';
  document.getElementById('account-pill').style.display  = 'flex';
  document.getElementById('account-username').textContent = currentProfile.username || 'User';
  if (currentProfile.pfp) {
    document.getElementById('account-avatar-wrap').innerHTML =
      '<img src="'+currentProfile.pfp+'" alt="" onerror="this.style.display=\'none\'"/>';
  }
  document.getElementById('profile-link').href = 'profile.html?user=' + encodeURIComponent(currentProfile.username);
  listenNotifications(currentUser.uid);
  closeAuthModal();
  if (authResolved && channelMsgMap[currentChannel] && Object.keys(channelMsgMap[currentChannel]).length) {
    var list = document.getElementById('messages-list');
    var atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 200;
    var sp = list.scrollTop;
    renderAllMessages(currentChannel, false);
    if (atBottom) list.scrollTop = list.scrollHeight;
    else list.scrollTop = sp;
  }
}

function onLoggedOut() {
  document.getElementById('compose-wrap').style.display  = 'none';
  document.getElementById('login-prompt').style.display  = 'flex';
  document.getElementById('bottom-signin-btn').style.display = 'block';
  document.getElementById('account-pill').style.display  = 'none';
  if (unsubNotifications) { unsubNotifications(); unsubNotifications = null; }
  if (authResolved && channelMsgMap[currentChannel] && Object.keys(channelMsgMap[currentChannel]).length) {
    var sp = document.getElementById('messages-list').scrollTop;
    renderAllMessages(currentChannel, false);
    document.getElementById('messages-list').scrollTop = sp;
  }
}

// ================================================================
// AUTH — REGISTER
// ================================================================
function fakeEmail(username) { return username.toLowerCase()+'@winterpixel.community.local'; }
var usernameCheckTimer = null;

document.getElementById('reg-username').addEventListener('input', function() {
  var val  = this.value.trim();
  var hint = document.getElementById('reg-username-hint');
  clearTimeout(usernameCheckTimer);
  if (!val) { hint.textContent='3\u201324 characters, letters/numbers/underscores only'; hint.className='auth-field-hint'; return; }
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(val)) { hint.textContent='Only letters, numbers and underscores, 3\u201324 characters'; hint.className='auth-field-hint err'; return; }
  hint.textContent='Checking availability\u2026'; hint.className='auth-field-hint';
  usernameCheckTimer = setTimeout(function() {
    db.collection('usernames').doc(val.toLowerCase()).get().then(function(doc) {
      hint.textContent = doc.exists ? 'Username already taken' : 'Username available!';
      hint.className = 'auth-field-hint '+(doc.exists?'err':'ok');
    });
  }, 500);
});

document.getElementById('reg-submit').addEventListener('click', function() {
  var username = document.getElementById('reg-username').value.trim();
  var password = document.getElementById('reg-password').value;
  var btn = this;
  document.getElementById('reg-error').classList.remove('visible');
  if (!username || !/^[a-zA-Z0-9_]{3,24}$/.test(username)) { showAuthError('reg','Please enter a valid username.'); return; }
  if (password.length < 6) { showAuthError('reg','Password must be at least 6 characters.'); return; }
  btn.disabled=true; btn.textContent='Creating account\u2026';
  db.collection('usernames').doc(username.toLowerCase()).get().then(function(doc) {
    if (doc.exists) throw new Error('Username already taken. Please choose another.');
    return auth.createUserWithEmailAndPassword(fakeEmail(username), password);
  }).then(function(cred) {
    var uid   = cred.user.uid;
    var batch = db.batch();
    batch.set(db.collection('usernames').doc(username.toLowerCase()), { uid:uid });
    batch.set(db.collection('users').doc(uid), {
      username:username, pfp:null, mod:false, banned:false,
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    return batch.commit();
  }).catch(function(err) {
    btn.disabled=false; btn.textContent='Create account';
    var msg = err.message||'Something went wrong.';
    if (msg.includes('email-already-in-use')) msg='Username already taken. Please choose another.';
    showAuthError('reg', msg);
  });
});

// ================================================================
// AUTH — LOGIN
// ================================================================
document.getElementById('login-submit').addEventListener('click', function() {
  var username = document.getElementById('login-username').value.trim();
  var password = document.getElementById('login-password').value;
  var btn = this;
  if (!username||!password) { showAuthError('login','Please enter your username and password.'); return; }
  btn.disabled=true; btn.textContent='Signing in\u2026';
  auth.signInWithEmailAndPassword(fakeEmail(username), password)
    .catch(function(err) {
      btn.disabled=false; btn.textContent='Sign in';
      showAuthError('login','Incorrect username or password.');
    });
});

document.getElementById('logout-btn').addEventListener('click', function() {
  if (currentUser) {
    try { localStorage.removeItem('forum_profile_'+currentUser.uid); } catch(e){}
  }
  auth.signOut(); closeAccountMenu();
});

// ================================================================
// AUTH MODAL UI
// ================================================================
function openAuthModal()  { document.getElementById('auth-modal').classList.add('open'); }
function closeAuthModal() { document.getElementById('auth-modal').classList.remove('open'); }
function showAuthError(form, msg) { var el=document.getElementById(form+'-error'); el.textContent=msg; el.classList.add('visible'); }

document.getElementById('auth-close').addEventListener('click', closeAuthModal);
document.getElementById('auth-modal').addEventListener('click', function(e){ if(e.target===this) closeAuthModal(); });
document.querySelectorAll('.auth-tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.auth-tab').forEach(function(t){ t.classList.remove('active'); });
    tab.classList.add('active');
    var isLogin = tab.dataset.tab==='login';
    document.getElementById('login-form').style.display    = isLogin?'block':'none';
    document.getElementById('register-form').style.display = isLogin?'none':'block';
    document.getElementById('auth-title').textContent = isLogin?'Welcome back':'Create account';
    document.getElementById('auth-sub').textContent   = isLogin?'Sign in to join the community':'Username is first come, first served';
  });
});
document.getElementById('open-auth-btn').addEventListener('click', openAuthModal);
document.getElementById('bottom-signin-btn').addEventListener('click', openAuthModal);

// ================================================================
// BOTTOM BAR — NOTIFICATIONS & ACCOUNT MENUS
// ================================================================
var notifOpen = false, accountOpen = false;
function closeAccountMenu() { accountOpen=false; document.getElementById('account-menu').classList.remove('open'); }

document.getElementById('notif-btn').addEventListener('click', function(e) {
  e.stopPropagation();
  notifOpen = !notifOpen;
  document.getElementById('notif-modal').classList.toggle('open', notifOpen);
  accountOpen=false; document.getElementById('account-menu').classList.remove('open');
  if (notifOpen && currentUser && !notifListLoaded) loadNotifList(currentUser.uid);
  if (notifOpen && currentUser && unreadCount > 0) {
    setTimeout(function() {
      db.collection('users').doc(currentUser.uid).collection('notifications')
        .where('read','==',false).get().then(function(snap) {
          var b = db.batch();
          snap.forEach(function(d){ b.update(d.ref,{read:true}); });
          return b.commit();
        }).catch(function(){});
    }, 2000);
  }
});

document.getElementById('account-pill').addEventListener('click', function(e) {
  e.stopPropagation();
  accountOpen=!accountOpen;
  document.getElementById('account-menu').classList.toggle('open', accountOpen);
  notifOpen=false; document.getElementById('notif-modal').classList.remove('open');
});

document.addEventListener('click', function() {
  notifOpen=false; accountOpen=false;
  document.getElementById('notif-modal').classList.remove('open');
  document.getElementById('account-menu').classList.remove('open');
});
document.getElementById('notif-modal').addEventListener('click', function(e){ e.stopPropagation(); });
document.getElementById('account-menu').addEventListener('click', function(e){ e.stopPropagation(); });

// ================================================================
// HAMBURGER
// ================================================================
(function() {
  var hbtn  = document.getElementById('hamburger');
  var hmenu = document.getElementById('mobile-menu');
  hbtn.addEventListener('click', function() {
    var open = hmenu.classList.toggle('open');
    hbtn.setAttribute('aria-expanded', open);
    hmenu.setAttribute('aria-hidden', !open);
  });
  hmenu.querySelectorAll('a').forEach(function(a) {
    a.addEventListener('click', function() {
      hmenu.classList.remove('open');
      hbtn.setAttribute('aria-expanded','false');
      hmenu.setAttribute('aria-hidden','true');
    });
  });
})();

var authResolved = false;
var params       = new URLSearchParams(window.location.search);
var initChannel  = params.get('ch') || 'general';
if (params.get('msg')) jumpToId = params.get('msg');
// switchChannel(initChannel) is called inside onAuthStateChanged above