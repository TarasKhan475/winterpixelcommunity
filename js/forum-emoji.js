// ================================================================
// EMOJI SYSTEM — forum-emoji.js
// Depends on: #compose-input, #emoji-btn, #emoji-picker,
//             #emoji-picker-cats, #emoji-picker-grid,
//             #emoji-search-input, #emoji-autocomplete
// ================================================================

var EMOJI_DATA = [
  {cat:'😀 Smileys', emojis:[
    ['😀','grinning'],['😁','beaming'],['😂','joy'],['🤣','rofl'],['😃','smiley'],
    ['😄','smile'],['😅','sweat_smile'],['😆','laughing'],['😉','wink'],['😊','blush'],
    ['😋','yum'],['😎','sunglasses'],['😍','heart_eyes'],['🥰','smiling_face_with_hearts'],
    ['😘','kissing_heart'],['😗','kissing'],['😙','kissing_smiling_eyes'],['😚','kissing_closed_eyes'],
    ['🙂','slightly_smiling'],['🤗','hugging'],['🤩','star_struck'],['🥳','partying'],
    ['😏','smirk'],['😒','unamused'],['😞','disappointed'],['😔','pensive'],['😟','worried'],
    ['😕','confused'],['🙁','slightly_frowning'],['☹️','frowning'],['😣','persevere'],
    ['😖','confounded'],['😫','tired'],['😩','weary'],['🥺','pleading'],['😢','cry'],
    ['😭','sob'],['😤','triumph'],['😠','angry'],['😡','rage'],['🤬','cursing'],
    ['😈','smiling_imp'],['👿','imp'],['💀','skull'],['☠️','skull_crossbones'],
    ['😺','smiley_cat'],['😸','smile_cat'],['😹','joy_cat'],['😻','heart_eyes_cat'],
    ['😼','smirk_cat'],['😽','kissing_cat'],['🙀','scream_cat'],['😿','crying_cat'],['😾','pouting_cat'],
    ['🙈','see_no_evil'],['🙉','hear_no_evil'],['🙊','speak_no_evil'],
    ['💫','dizzy'],['💥','boom'],['💢','anger'],['❗','exclamation'],['❓','question'],
    ['💤','zzz'],['💨','dash'],['🌀','cyclone'],['🔥','fire'],['✨','sparkles'],
  ]},
  {cat:'👍 Gestures', emojis:[
    ['👋','wave'],['🤚','raised_back_of_hand'],['✋','hand'],['🖖','vulcan_salute'],
    ['👌','ok_hand'],['🤌','pinched_fingers'],['🤏','pinching_hand'],['✌️','v'],
    ['🤞','crossed_fingers'],['🤟','love_you_gesture'],['🤘','metal'],['🤙','call_me_hand'],
    ['👈','point_left'],['👉','point_right'],['👆','point_up_2'],['🖕','middle_finger'],
    ['👇','point_down'],['☝️','point_up'],['👍','thumbsup'],['👎','thumbsdown'],
    ['✊','fist'],['👊','punch'],['🤛','left_facing_fist'],['🤜','right_facing_fist'],
    ['👏','clap'],['🙌','raised_hands'],['👐','open_hands'],['🤲','palms_up_together'],
    ['🤝','handshake'],['🙏','pray'],['💪','muscle'],['🦵','leg'],['🦶','foot'],
    ['👀','eyes'],['👁️','eye'],['👅','tongue'],['👄','lips'],
  ]},
  {cat:'❤️ Hearts', emojis:[
    ['❤️','heart'],['🧡','orange_heart'],['💛','yellow_heart'],['💚','green_heart'],
    ['💙','blue_heart'],['💜','purple_heart'],['🖤','black_heart'],['🤍','white_heart'],
    ['🤎','brown_heart'],['💔','broken_heart'],['❣️','heart_exclamation'],['💕','two_hearts'],
    ['💞','revolving_hearts'],['💓','heartbeat'],['💗','heartpulse'],['💖','sparkling_heart'],
    ['💘','cupid'],['💝','gift_heart'],['💟','heart_decoration'],['♥️','hearts'],
    ['🫀','anatomical_heart'],['❤️‍🔥','heart_on_fire'],['❤️‍🩹','mending_heart'],
  ]},
  {cat:'🎮 Gaming', emojis:[
    ['🎮','video_game'],['🕹️','joystick'],['🎯','dart'],['🎲','game_die'],
    ['🏆','trophy'],['🥇','first_place'],['🥈','second_place'],['🥉','third_place'],
    ['🎖️','medal'],['🏅','sports_medal'],['⭐','star'],['🌟','star2'],['💫','dizzy'],
    ['🔫','gun'],['💣','bomb'],['⚔️','crossed_swords'],['🛡️','shield'],
    ['🚀','rocket'],['💥','boom'],['⚡','zap'],['🌀','cyclone'],
    ['👑','crown'],['💎','gem'],['🎁','gift'],['🎉','tada'],['🎊','confetti_ball'],
    ['✅','white_check_mark'],['❌','x'],['⚠️','warning'],['🔴','red_circle'],['🟢','green_circle'],
    ['🔵','blue_circle'],['🟡','yellow_circle'],['⚫','black_circle'],['⚪','white_circle'],
    ['🤖','robot'],['👾','space_invader'],['🎃','jack_o_lantern'],['🦄','unicorn'],
  ]},
  {cat:'🐱 Animals', emojis:[
    ['🐶','dog'],['🐱','cat'],['🐭','mouse'],['🐹','hamster'],['🐰','rabbit'],
    ['🦊','fox'],['🐻','bear'],['🐼','panda'],['🐨','koala'],['🐯','tiger'],
    ['🦁','lion'],['🐮','cow'],['🐷','pig'],['🐸','frog'],['🐵','monkey'],
    ['🐔','chicken'],['🐧','penguin'],['🐦','bird'],['🦆','duck'],['🦅','eagle'],
    ['🦉','owl'],['🦇','bat'],['🐺','wolf'],['🐗','boar'],['🐴','horse'],
    ['🦄','unicorn'],['🐝','bee'],['🐛','bug'],['🦋','butterfly'],['🐌','snail'],
    ['🐠','tropical_fish'],['🐟','fish'],['🐡','blowfish'],['🦈','shark'],['🐙','octopus'],
  ]},
  {cat:'🌈 Nature', emojis:[
    ['⛅','partly_sunny'],['🌤️','sun_small_cloud'],['🌈','rainbow'],['☁️','cloud'],
    ['⛈️','thunder_cloud_rain'],['🌩️','lightning'],['🌧️','rain_cloud'],['❄️','snowflake'],
    ['🌊','ocean'],['💧','droplet'],['🌱','seedling'],['🌿','herb'],
    ['🍀','four_leaf_clover'],['🌸','cherry_blossom'],['🌺','hibiscus'],['🌻','sunflower'],
    ['🌙','crescent_moon'],['⭐','star'],['🌟','star2'],['☀️','sunny'],['🌍','earth_africa'],
  ]},
  {cat:'🍕 Food', emojis:[
    ['🍕','pizza'],['🍔','hamburger'],['🌮','taco'],['🌯','burrito'],['🍟','fries'],
    ['🍗','poultry_leg'],['🍖','meat_on_bone'],['🥩','cut_of_meat'],['🥚','egg'],
    ['🍳','fried_egg'],['🧇','waffle'],['🥞','pancakes'],['🧈','butter'],
    ['🍰','cake'],['🎂','birthday'],['🧁','cupcake'],['🍩','doughnut'],['🍪','cookie'],
    ['🍫','chocolate_bar'],['🍬','candy'],['🍭','lollipop'],['🍦','soft_ice_cream'],
    ['🥤','cup_with_straw'],['☕','coffee'],['🧃','beverage_box'],
    ['🍺','beer'],['🍻','beers'],['🥂','champagne'],['🍷','wine_glass'],
  ]},
];

// Build flat lookup: name → emoji char
var EMOJI_BY_NAME = {};
EMOJI_DATA.forEach(function(cat){
  cat.emojis.forEach(function(e){ EMOJI_BY_NAME[e[1]] = e[0]; });
});

// ── Picker ──────────────────────────────────────────────────────
var _emojiPickerOpen = false;
var _currentCat = 0;
var _pickerBuilt = false;

function buildEmojiPicker() {
  var catBar = document.getElementById('emoji-picker-cats');
  var grid   = document.getElementById('emoji-picker-grid');

  catBar.innerHTML = EMOJI_DATA.map(function(c, i){
    return '<button class="emoji-picker-cat'+(i===0?' active':'')+'" data-cat="'+i+'" title="'+c.cat+'">'+c.cat.split(' ')[0]+'</button>';
  }).join('');

  catBar.addEventListener('click', function(e){
    var btn = e.target.closest('.emoji-picker-cat');
    if (!btn) return;
    var idx = parseInt(btn.dataset.cat);
    _currentCat = idx;
    document.querySelectorAll('.emoji-picker-cat').forEach(function(b){ b.classList.toggle('active', b.dataset.cat == idx); });
    renderEmojiGrid(EMOJI_DATA[idx].emojis);
  });

  renderEmojiGrid(EMOJI_DATA[0].emojis);

  document.getElementById('emoji-search-input').addEventListener('input', function(){
    var q = this.value.trim().toLowerCase();
    if (!q) { renderEmojiGrid(EMOJI_DATA[_currentCat].emojis); return; }
    var results = [];
    EMOJI_DATA.forEach(function(c){ c.emojis.forEach(function(e){ if(e[1].includes(q)) results.push(e); }); });
    renderEmojiGrid(results);
  });

  grid.addEventListener('click', function(e){
    var cell = e.target.closest('.emoji-cell');
    if (!cell) return;
    insertEmoji(cell.dataset.emoji);
  });
}

function renderEmojiGrid(emojis) {
  var grid = document.getElementById('emoji-picker-grid');
  if (!emojis.length) { grid.innerHTML = '<div style="padding:1rem;text-align:center;font-size:12px;color:var(--gray-muted);">No results</div>'; return; }
  grid.innerHTML = emojis.map(function(e){
    return '<div class="emoji-cell" data-emoji="'+e[0]+'" title=":'+e[1]+':">'+e[0]+'</div>';
  }).join('');
}

function insertEmoji(em) {
  var inp = document.getElementById('compose-input');
  var start = inp.selectionStart;
  var end   = inp.selectionEnd;
  var val   = inp.value;
  inp.value = val.slice(0, start) + em + val.slice(end);
  inp.selectionStart = inp.selectionEnd = start + em.length;
  inp.focus();
  inp.dispatchEvent(new Event('input'));
}

// Toggle picker button — init lazily on first open
document.getElementById('emoji-btn').addEventListener('click', function(e){
  e.stopPropagation();
  if (!_pickerBuilt) { buildEmojiPicker(); _pickerBuilt = true; }
  _emojiPickerOpen = !_emojiPickerOpen;
  document.getElementById('emoji-picker').classList.toggle('open', _emojiPickerOpen);
  if (_emojiPickerOpen) document.getElementById('emoji-search-input').focus();
}, true);

document.addEventListener('click', function(e){
  if (!e.target.closest('#emoji-picker') && !e.target.closest('#emoji-btn')) {
    _emojiPickerOpen = false;
    document.getElementById('emoji-picker').classList.remove('open');
  }
});

// ── :emoji: autocomplete while typing ───────────────────────────
var _acEmojis = [];
var _acIndex  = 0;

document.getElementById('compose-input').addEventListener('input', function(){
  checkEmojiAutocomplete(this);
});

document.getElementById('compose-input').addEventListener('keydown', function(e){
  var ac = document.getElementById('emoji-autocomplete');
  if (!ac.classList.contains('open')) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); _acIndex = Math.min(_acIndex+1, _acEmojis.length-1); highlightAcItem(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); _acIndex = Math.max(_acIndex-1, 0); highlightAcItem(); }
  else if (e.key === 'Enter' || e.key === 'Tab') {
    if (_acEmojis.length) { e.preventDefault(); selectAcEmoji(_acEmojis[_acIndex]); }
  }
  else if (e.key === 'Escape') { closeEmojiAc(); }
});

function checkEmojiAutocomplete(inp) {
  var val = inp.value;
  var pos = inp.selectionStart;
  var colonPos = -1;
  for (var i = pos - 1; i >= 0; i--) {
    if (val[i] === ':') { colonPos = i; break; }
    if (val[i] === ' ') break;
  }
  var ac = document.getElementById('emoji-autocomplete');
  if (colonPos === -1) { closeEmojiAc(); return; }
  var query = val.slice(colonPos + 1, pos).toLowerCase();
  if (query.length < 2) { closeEmojiAc(); return; }
  var results = [];
  EMOJI_DATA.forEach(function(c){
    c.emojis.forEach(function(e){ if(e[1].startsWith(query) && results.length < 8) results.push(e); });
  });
  if (!results.length) { closeEmojiAc(); return; }
  _acEmojis = results;
  _acIndex  = 0;
  ac.innerHTML = results.map(function(e, i){
    return '<div class="emoji-ac-item'+(i===0?' selected':'')+'" data-name="'+e[1]+'" data-emoji="'+e[0]+'">'+
      '<span>'+e[0]+'</span><span>:'+e[1]+':</span></div>';
  }).join('');
  ac.classList.add('open');
  ac.querySelectorAll('.emoji-ac-item').forEach(function(item, i){
    item.addEventListener('mousedown', function(e){ e.preventDefault(); selectAcEmoji(_acEmojis[i]); });
  });
}

function highlightAcItem() {
  document.querySelectorAll('.emoji-ac-item').forEach(function(it, i){ it.classList.toggle('selected', i === _acIndex); });
}

function selectAcEmoji(entry) {
  var inp = document.getElementById('compose-input');
  var val = inp.value;
  var pos = inp.selectionStart;
  var colonPos = -1;
  for (var i = pos - 1; i >= 0; i--) {
    if (val[i] === ':') { colonPos = i; break; }
    if (val[i] === ' ') break;
  }
  if (colonPos === -1) { closeEmojiAc(); return; }
  inp.value = val.slice(0, colonPos) + entry[0] + val.slice(pos);
  inp.selectionStart = inp.selectionEnd = colonPos + entry[0].length;
  inp.focus();
  inp.dispatchEvent(new Event('input'));
  closeEmojiAc();
}

function closeEmojiAc() {
  document.getElementById('emoji-autocomplete').classList.remove('open');
  _acEmojis = []; _acIndex = 0;
}
