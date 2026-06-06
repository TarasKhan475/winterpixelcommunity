/**
 * firebase-votes.js
 * Fixed: snapshot listener now queries buttons/counts fresh from the
 * container on every fire, so button cloning doesn't break the UI updates.
 */

(function() {

  function waitForReady(cb) {
    var attempts = 0;
    var interval = setInterval(function() {
      attempts++;
      var firebaseReady   = typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0;
      var containersReady = document.querySelectorAll('[data-vote-id]').length > 0;
      if (firebaseReady && containersReady) { clearInterval(interval); cb(); }
      if (attempts > 100) {
        clearInterval(interval);
        console.warn('firebase-votes: timed out waiting for Firebase or vote containers');
      }
    }, 100);
  }

  function setupVotes() {
    var db   = firebase.firestore();
    var auth = firebase.auth();

    auth.onAuthStateChanged(function(user) {
      document.querySelectorAll('[data-vote-id]').forEach(function(container) {
        var articleId = container.dataset.voteId;
        var docRef    = db.collection('votes').doc(articleId);

        // ── Snapshot: always re-query elements from container so cloning can't break it ──
        if (!container.dataset.snapshotAttached) {
          container.dataset.snapshotAttached = '1';
          docRef.onSnapshot(function(snap) {
            var d = snap.exists ? snap.data() : {};

            // Re-query live DOM elements every time
            var upCount   = container.querySelector('.vote-up-count');
            var downCount = container.querySelector('.vote-down-count');
            var upBtn     = container.querySelector('.vote-up');
            var downBtn   = container.querySelector('.vote-down');

            if (upCount)   upCount.textContent   = d.up   || 0;
            if (downCount) downCount.textContent = d.down || 0;

            var uid = user ? user.uid : null;
            if (uid && upBtn && downBtn) {
              var myVote = d.voters && d.voters[uid];
              upBtn.classList.toggle('voted',   myVote === true);
              downBtn.classList.toggle('voted', myVote === false);
            } else if (upBtn && downBtn) {
              upBtn.classList.remove('voted');
              downBtn.classList.remove('voted');
            }
          });
        }

        // ── Clone buttons to wipe stale click listeners ──
        var upBtn   = container.querySelector('.vote-up');
        var downBtn = container.querySelector('.vote-down');
        if (!upBtn || !downBtn) return;

        var newUp   = upBtn.cloneNode(true);
        var newDown = downBtn.cloneNode(true);
        upBtn.parentNode.replaceChild(newUp, upBtn);
        downBtn.parentNode.replaceChild(newDown, downBtn);

        // ── Not signed in: prompt login ──
        if (!user) {
          function promptSignIn() {
            var btn = document.getElementById('bb-signin-btn');
            if (btn) btn.click();
          }
          newUp.addEventListener('click',   promptSignIn);
          newDown.addEventListener('click', promptSignIn);
          return;
        }

        var uid = user.uid;

        async function vote(type) {
          try {
            var snap   = await docRef.get();
            var d      = snap.exists ? snap.data() : {};
            var voters = d.voters || {};
            var myVote = voters[uid];
            var isUp   = type === 'up';

            if (!snap.exists) {
              await docRef.set({
                up:     isUp ? 1 : 0,
                down:   isUp ? 0 : 1,
                voters: { [uid]: isUp }
              });
              return;
            }

            // Toggle off
            if ((isUp && myVote === true) || (!isUp && myVote === false)) {
              var removal = {};
              removal[isUp ? 'up' : 'down']  = firebase.firestore.FieldValue.increment(-1);
              removal['voters.' + uid]        = firebase.firestore.FieldValue.delete();
              await docRef.update(removal);
              return;
            }

            // Fresh vote
            if (myVote === undefined) {
              var fresh = {};
              fresh[isUp ? 'up' : 'down'] = firebase.firestore.FieldValue.increment(1);
              fresh['voters.' + uid]      = isUp;
              await docRef.update(fresh);
              return;
            }

            // Switch vote
            var sw = {};
            sw[isUp  ? 'up'   : 'down'] = firebase.firestore.FieldValue.increment(1);
            sw[isUp  ? 'down' : 'up']   = firebase.firestore.FieldValue.increment(-1);
            sw['voters.' + uid]         = isUp;
            await docRef.update(sw);

          } catch(e) {
            console.error('Vote failed:', e.code, e.message);
          }
        }

        newUp.addEventListener('click',   function() { vote('up');   });
        newDown.addEventListener('click', function() { vote('down'); });
      });
    });
  }

  waitForReady(setupVotes);

})();