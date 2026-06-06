/**
 * news-loader.js
 * Reads NEWS array from data/news.js and renders into the page.
 *
 * index.html  → fills #news-scroll  (horizontal scroll, latest 5)
 * news.html   → fills #news-all     (full article list)
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
 */
function bannerImg(article, wrapClass) {
  const base = `ui/news/${article.id}`;
  const emojiClass = wrapClass === 'news-thumb' ? 'news-thumb-emoji' : 'news-full-banner-emoji';
  return `<div class="${wrapClass}"><img src="${base}.png" alt="${article.title}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="if(!this.dataset.tried){this.dataset.tried='jpg';this.src='${base}.jpg';}else if(this.dataset.tried==='jpg'){this.dataset.tried='webp';this.src='${base}.webp';}else{this.style.display='none';this.nextElementSibling.style.display='flex';}" /><span class="${emojiClass}" style="display:none;">${article.thumb || "📰"}</span></div>`;
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

function newsFullCard(article) {
  return `
    <article class="news-full-card" id="${article.id}">
      ${bannerImg(article, 'news-full-banner')}
      <div class="news-full-header">
        ${tagBadge(article.tag)}
        <h2>${article.title}</h2>
        <div class="news-meta">${article.date} · by ${article.author}</div>
      </div>
      <div class="news-full-body">${article.content}</div>
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

  // NEWS PAGE — all articles
  const newsContainer = document.getElementById("news-all");
  if (newsContainer) {
    newsContainer.innerHTML = NEWS.length
      ? NEWS.map(newsFullCard).join("")
      : '<p style="padding:3rem;text-align:center;color:#94A3B8;">No articles yet.</p>';

    // Scroll to anchor
    if (window.location.hash) {
      const el = document.querySelector(window.location.hash);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    }
  }
});