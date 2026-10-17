/**
 * news-loader.js
 * Reads NEWS array from data/news.js and renders into the page.
 *
 * index.html  → fills #news-scroll  (horizontal scroll, latest 5)
 * news.html   → fills #news-all     (grid of compact article cards)
 *
 * news.html only renders card summaries. The full article (body text and
 * its images) is inserted into a reader popup when a card is opened, so
 * nothing heavy loads until someone asks for it. Banner images use native
 * lazy loading, and each article has a shareable link: news.html#<article-id>
 *
 * News images: place banner images in ui/news/<article-id>.png (or .jpg/.webp)
 * The loader tries that path automatically; falls back to the thumb emoji.
 */

const TAG_COLORS = {
  "Update":       { bg: "#DBEAFE", color: "#1D4ED8" },
  "Event":        { bg: "#EDE9FE", color: "#6D28D9" },
  "Patch":        { bg: "#D1FAE5", color: "#065F46" },
  "Announcement": { bg: "#FEF3C7", color: "#92400E" },
  "Community":    { bg: "#FCE7F3", color: "#9D174D" }
};

function tagBadge(tag) {
  const c = TAG_COLORS[tag] || { bg: "#E5E7EB", color: "#374151" };
  return `<span class="news-tag" style="background:${c.bg};color:${c.color};">${tag}</span>`;
}

/**
 * Returns a banner that fills its container at any image size.
 * Tries: ui/news/<id>.png → .jpg → .webp in sequence via onerror chaining.
 * Falls back to the thumb emoji only if all three fail.
 * Images are lazy-loaded, so off-screen banners are not fetched up front.
 */
function bannerImg(article, wrapClass) {
  const base = `ui/news/${article.id}`;
  const emojiClass = wrapClass === 'news-thumb' ? 'news-thumb-emoji' : 'news-full-banner-emoji';
  return `<div class="${wrapClass}"><img src="${base}.png" alt="${article.title}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="if(!this.dataset.tried){this.dataset.tried='jpg';this.src='${base}.jpg';}else if(this.dataset.tried==='jpg'){this.dataset.tried='webp';this.src='${base}.webp';}else{this.style.display='none';this.nextElementSibling.style.display='flex';}" /><span class="${emojiClass}" style="display:none;">${article.thumb || "📰"}</span></div>`;
}

function newsCard(article) {
  return `
    <a class="news-card" href="news.html#${article.id}">
      ${bannerImg(article, 'news-thumb')}
      <div class="news-body">
        ${tagBadge(article.tag)}
        <h3>${article.title}</h3>
        <p>${article.summary}</p>
        <div class="news-meta">${article.date} · ${article.author}</div>
      </div>
    </a>
  `;
}

/* Compact card for news.html — no article body, click to read */
function newsFullCard(article) {
  return `
    <article class="news-full-card" id="${article.id}" data-id="${article.id}" tabindex="0" role="button">
      ${bannerImg(article, 'news-full-banner')}
      <div class="news-full-header">
        ${tagBadge(article.tag)}
        <h2>${article.title}</h2>
        <p class="news-full-summary">${article.summary}</p>
        <div class="news-meta">${article.date} · by ${article.author}</div>
      </div>
      <div class="vote-row" data-vote-id="${article.id}">
        <button class="vote-btn vote-up" title="Upvote">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
          <span class="vote-up-count">0</span>
        </button>
        <button class="vote-btn vote-down" title="Downvote">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 5v14M19 12l-7 7-7-7"/>
          </svg>
          <span class="vote-down-count">0</span>
        </button>
      </div>
    </article>
  `;
}

/* Full article, shown inside the reader popup */
function articleReader(article) {
  return `
    ${bannerImg(article, 'news-full-banner')}
    <div class="news-full-header">
      ${tagBadge(article.tag)}
      <h2>${article.title}</h2>
      <div class="news-meta">${article.date} · by ${article.author}</div>
    </div>
    <div class="news-full-body">${article.content}</div>
  `;
}

function setupReader() {
  const modal = document.createElement("div");
  modal.className = "news-modal";
  modal.innerHTML =
    '<div class="news-modal-panel" role="dialog" aria-modal="true">' +
    '<button class="news-modal-close" aria-label="Close article">✕</button>' +
    '<div class="news-reader"></div></div>';
  document.body.appendChild(modal);
  const reader = modal.querySelector(".news-reader");

  /* Vote row inside the popup: a mirror of the card's row. Clicks are forwarded
     to the card's real buttons, so firebase-votes.js still does all the work. */
  let voteWatch = null;
  function addVotes(id) {
    if (voteWatch) { voteWatch.disconnect(); voteWatch = null; }
    const src = document.querySelector('#news-all .vote-row[data-vote-id="' + id + '"]');
    if (!src) return;
    const mirror = src.cloneNode(true);
    mirror.removeAttribute("data-vote-id");
    reader.appendChild(mirror);
    function sync() {
      ["vote-up", "vote-down"].forEach(function (c) {
        const a = src.querySelector("." + c), b = mirror.querySelector("." + c);
        if (a && b) { b.className = a.className; b.innerHTML = a.innerHTML; }
      });
    }
    mirror.addEventListener("click", function (e) {
      const btn = e.target.closest(".vote-btn");
      if (!btn) return;
      const real = src.querySelector(btn.classList.contains("vote-up") ? ".vote-up" : ".vote-down");
      if (real) real.click();
    });
    voteWatch = new MutationObserver(sync);
    voteWatch.observe(src, { subtree: true, childList: true, characterData: true, attributes: true });
    sync();
  }

  function open(id) {
    const article = NEWS.find(function (a) { return a.id === id; });
    if (!article) return;
    reader.innerHTML = articleReader(article);
    reader.querySelectorAll(".news-full-body img").forEach(function (img) {
      img.loading = "lazy";
      img.decoding = "async";
    });
    addVotes(id);
    modal.classList.add("open");
    modal.scrollTop = 0;
    document.body.style.overflow = "hidden";
    if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
  }

  function close() {
    modal.classList.remove("open");
    if (voteWatch) { voteWatch.disconnect(); voteWatch = null; }
    reader.innerHTML = "";
    document.body.style.overflow = "";
    history.replaceState(null, "", location.pathname + location.search);
  }

  const list = document.getElementById("news-all");
  list.addEventListener("click", function (e) {
    if (e.target.closest(".vote-row")) return; /* votes keep working as normal */
    const card = e.target.closest(".news-full-card");
    if (card) open(card.dataset.id);
  });
  list.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" || e.target.closest(".vote-row")) return;
    const card = e.target.closest(".news-full-card");
    if (card) open(card.dataset.id);
  });
  modal.addEventListener("click", function (e) {
    if (e.target === modal || e.target.closest(".news-modal-close")) close();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal.classList.contains("open")) close();
  });
  window.addEventListener("hashchange", function () {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) open(id);
  });

  if (location.hash.length > 1) open(decodeURIComponent(location.hash.slice(1)));
}

document.addEventListener("DOMContentLoaded", function () {
  if (typeof NEWS === "undefined") {
    console.error("news-loader: NEWS array not found. Make sure data/news.js is loaded first.");
    return;
  }

  // INDEX — latest 5 horizontal scroll
  const indexScroll = document.getElementById("news-scroll");
  if (indexScroll) {
    const latest = NEWS.slice(0, 5);
    indexScroll.innerHTML = latest.length
      ? latest.map(newsCard).join("")
      : '<p style="padding:1rem;color:#93C5FD;">No news yet.</p>';
  }

  // NEWS PAGE — card grid + reader popup
  const newsContainer = document.getElementById("news-all");
  if (newsContainer) {
    newsContainer.innerHTML = NEWS.length
      ? NEWS.map(newsFullCard).join("")
      : '<p style="padding:3rem;text-align:center;color:#94A3B8;">No articles yet.</p>';
    setupReader();
  }
});
