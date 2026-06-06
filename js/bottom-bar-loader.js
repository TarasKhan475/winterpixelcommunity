(function() {
  // Resolve base path from this script's location
  var loaderScripts = document.querySelectorAll('script[src*="bottom-bar-loader"]');
  var loaderSrc = loaderScripts[loaderScripts.length - 1].src;
  var base = loaderSrc.substring(0, loaderSrc.lastIndexOf('/js/'));
  var barUrl = base + '/bottom-bar.html';

  function loadScript(src) {
    return new Promise(function(resolve, reject) {
      // Don't load twice if already present
      if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
      var s = document.createElement('script');
      s.src = src;
      s.onload  = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // 1. Load Firebase SDK scripts in order (they must be sequential, not parallel)
  loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js')
    .then(function() { return loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js'); })
    .then(function() { return loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js'); })
    .then(function() {
      // 2. Now fetch bottom-bar.html
      return fetch(barUrl);
    })
    .then(function(res) {
      if (!res.ok) throw new Error('bottom-bar.html not found at ' + barUrl);
      return res.text();
    })
    .then(function(html) {
      var container = document.createElement('div');
      container.innerHTML = html;

      // Inject <style> into head
      container.querySelectorAll('style').forEach(function(el) {
        document.head.appendChild(el);
      });

      // Inject all HTML elements (skip style and script tags)
      Array.from(container.children).forEach(function(el) {
        if (el.tagName !== 'STYLE' && el.tagName !== 'SCRIPT') {
          document.body.appendChild(el);
        }
      });

      // Re-create and append each <script> so the browser actually executes it
      container.querySelectorAll('script').forEach(function(old) {
        var s = document.createElement('script');
        // Skip any src-based scripts (SDK already loaded above)
        if (old.src) return;
        s.textContent = old.textContent;
        document.body.appendChild(s);
      });
    })
    .catch(function(err) {
      console.warn('Bottom bar failed to load:', err.message);
    });
})();