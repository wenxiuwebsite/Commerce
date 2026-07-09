/* ============================================================
   CCCWA CONTENT RENDERER
   Reads content/news.json + content/events.json (Decap CMS file
   collections) and renders news/events across the site. Runs
   entirely client-side via fetch() — no build step.
   ============================================================ */
(function () {
  const NEWS_URL = 'content/news.json';
  const EVENTS_URL = 'content/events.json';
  const PAGE_SIZE = 15;

  function isZh() { return (localStorage.getItem('lang') || 'en') === 'zh-cn'; }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function slugify(str) {
    return String(str || '')
      .toLowerCase().trim()
      .replace(/[^\w一-龥]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'post';
  }

  // Decap can't compute a slug per list-row, so the front-end derives
  // one from the title whenever an editor leaves the ID field blank.
  function ensureIds(list) {
    const seen = new Set();
    (list || []).forEach(item => {
      let id = (item.id || '').trim();
      if (!id) id = slugify(item.title_en || item.title_zh || item.date || 'post');
      let unique = id, n = 2;
      while (seen.has(unique)) unique = id + '-' + (n++);
      seen.add(unique);
      item.id = unique;
    });
    return list || [];
  }

  function stripMarkdown(md) {
    return String(md || '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/[#*_>`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function excerptFrom(item, zh) {
    const summary = zh ? item.summary_zh : item.summary_en;
    if (summary) return summary;
    const body = zh ? (item.body_zh || item.body_en) : (item.body_en || item.body_zh);
    const text = stripMarkdown(body);
    return text.length > 160 ? text.slice(0, 157) + '…' : text;
  }

  function formatDate(iso, zh) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    if (zh) return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function fetchJSON(url) {
    return fetch(url).then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function emptyStateHtml(zh) {
    return '<div class="content-empty-state">' +
      (zh ? '暂无内容，请稍后再来查看。' : 'Nothing here yet — please check back soon.') +
      '</div>';
  }
  function errorStateHtml(zh) {
    return '<div class="content-empty-state">' +
      (zh ? '内容加载失败，请刷新页面重试。' : 'Something went wrong loading this content. Please refresh the page.') +
      '</div>';
  }

  window.CCCWAContent = { fetchJSON, escHtml, slugify, ensureIds, stripMarkdown, excerptFrom, formatDate, isZh };

  /* ============================================================
     NEWS PAGE (news.html): .news-grid + .archive-list sidebar
     ============================================================ */
  let newsCache = null;
  let currentPage = 1;
  let activeCategory = 'all';
  let activeMonth = null; // "YYYY-MM"

  function initNewsPage() {
    const grid = document.querySelector('.news-grid');
    if (!grid) return;
    fetchJSON(NEWS_URL).then(data => {
      newsCache = ensureIds(data.items || []);
      applyAnchorTarget();
      renderNewsPage();
      new MutationObserver(renderNewsPage).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }).catch(() => { grid.innerHTML = errorStateHtml(isZh()); });
  }

  // If arriving via #post-<id> (e.g. from a home page card), jump to the
  // right page/category so the target post is actually visible.
  function applyAnchorTarget() {
    const hash = window.location.hash;
    if (!hash || !hash.startsWith('#post-') || !newsCache) return;
    const id = hash.slice('#post-'.length);
    const sorted = [...newsCache].sort((a, b) => new Date(b.date) - new Date(a.date));
    const idx = sorted.findIndex(n => n.id === id);
    if (idx === -1) return;
    activeCategory = 'all';
    activeMonth = null;
    currentPage = Math.floor(idx / PAGE_SIZE) + 1;
  }

  function renderNewsPage() {
    const grid = document.querySelector('.news-grid');
    if (!grid || !newsCache) return;
    const zh = isZh();

    renderCategoryFilter(newsCache, zh);
    renderArchiveSidebar(newsCache, zh);

    let filtered = newsCache.filter(n => activeCategory === 'all' || n.category_en === activeCategory);
    if (activeMonth) filtered = filtered.filter(n => (n.date || '').slice(0, 7) === activeMonth);
    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (!sorted.length) {
      grid.innerHTML = emptyStateHtml(zh);
      renderPagination(1);
      return;
    }

    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    grid.innerHTML = pageItems.map((n, i) => newsCardHtml(n, currentPage === 1 && i === 0, zh)).join('');
    renderPagination(totalPages);
    scrollToAnchorIfPresent();
  }

  function newsCardHtml(n, featured, zh) {
    const title = zh ? (n.title_zh || n.title_en) : (n.title_en || n.title_zh);
    const category = zh ? n.category_zh : n.category_en;
    const date = formatDate(n.date, zh);
    const excerpt = excerptFrom(n, zh);
    const img = n.cover_image
      ? '<img src="' + escHtml(n.cover_image) + '" alt="' + escHtml(title) + '" class="' + (featured ? 'news-img' : 'news-img-thumb') + '">'
      : '';
    return '<div class="news-card' + (featured ? ' featured' : '') + '" id="post-' + escHtml(n.id) + '">' +
      img +
      '<div class="news-content"' + (!n.cover_image ? ' style="padding-top:22px"' : '') + '>' +
      '<span class="news-category">' + escHtml(category || '') + '</span>' +
      '<h3>' + escHtml(title || '') + '</h3>' +
      '<p>' + escHtml(excerpt) + '</p>' +
      '<div class="news-meta"><span>' + escHtml(date) + '</span>' +
      '<a href="article-view.html?id=' + encodeURIComponent(n.id) + '" class="read-more">' + (zh ? '阅读更多' : 'Read More') + '</a>' +
      '</div></div></div>';
  }

  function renderCategoryFilter(items, zh) {
    const grid = document.querySelector('.news-grid');
    if (!grid) return;
    let bar = document.querySelector('.news-filter-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'news-filter-bar';
      grid.parentNode.insertBefore(bar, grid);
    }
    const cats = [];
    const seen = new Set();
    items.forEach(n => {
      if (n.category_en && !seen.has(n.category_en)) { seen.add(n.category_en); cats.push({ en: n.category_en, zh: n.category_zh }); }
    });
    let html = '<button class="filter-pill' + (activeCategory === 'all' ? ' active' : '') + '" data-cat="all">' + (zh ? '全部' : 'All') + '</button>';
    html += cats.map(c =>
      '<button class="filter-pill' + (activeCategory === c.en ? ' active' : '') + '" data-cat="' + escHtml(c.en) + '">' + escHtml(zh ? c.zh : c.en) + '</button>'
    ).join('');
    bar.innerHTML = html;
  }

  function renderArchiveSidebar(items, zh) {
    const list = document.querySelector('.archive-list');
    if (!list) return;
    const byYear = {};
    items.forEach(n => {
      if (!n.date) return;
      const parts = n.date.split('-');
      const y = parts[0], m = parts[1];
      if (!y || !m) return;
      (byYear[y] = byYear[y] || new Set()).add(m);
    });
    const years = Object.keys(byYear).sort((a, b) => b - a);
    if (!years.length) { list.innerHTML = '<div class="archive-empty">' + (zh ? '暂无存档' : 'No archives yet') + '</div>'; return; }
    const monthNames = zh
      ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let html = activeMonth ? '<button class="archive-clear">' + (zh ? '× 清除筛选' : '× Clear filter') + '</button>' : '';
    html += years.map(y => {
      const months = [...byYear[y]].sort((a, b) => b - a);
      const monthLinks = months.map(m => {
        const key = y + '-' + m;
        return '<a href="#" class="archive-month' + (activeMonth === key ? ' active' : '') + '" data-month="' + key + '">' + monthNames[parseInt(m, 10) - 1] + '</a>';
      }).join('');
      return '<div class="archive-group"><div class="archive-year">' + y + '</div><div class="archive-months">' + monthLinks + '</div></div>';
    }).join('');
    list.innerHTML = html;
  }

  function renderPagination(totalPages) {
    const grid = document.querySelector('.news-grid');
    if (!grid) return;
    let pager = document.querySelector('.news-pagination');
    if (!pager) {
      pager = document.createElement('div');
      pager.className = 'news-pagination';
      grid.parentNode.appendChild(pager);
    }
    if (totalPages <= 1) { pager.innerHTML = ''; return; }
    let html = '';
    for (let p = 1; p <= totalPages; p++) {
      html += '<button class="pagination-btn' + (p === currentPage ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>';
    }
    pager.innerHTML = html;
  }

  function scrollToAnchorIfPresent() {
    const hash = window.location.hash;
    if (!hash || !hash.startsWith('#post-')) return;
    const el = document.querySelector(hash);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('news-card-highlight');
    setTimeout(() => el.classList.remove('news-card-highlight'), 2000);
  }

  document.addEventListener('click', e => {
    const pill = e.target.closest('.filter-pill');
    if (pill) { activeCategory = pill.getAttribute('data-cat'); currentPage = 1; renderNewsPage(); return; }

    const monthLink = e.target.closest('.archive-month[data-month]');
    if (monthLink) {
      e.preventDefault();
      activeMonth = monthLink.getAttribute('data-month');
      currentPage = 1;
      renderNewsPage();
      document.querySelector('.news-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const clearBtn = e.target.closest('.archive-clear');
    if (clearBtn) { activeMonth = null; currentPage = 1; renderNewsPage(); return; }

    const pageBtn = e.target.closest('.pagination-btn[data-page]');
    if (pageBtn) {
      currentPage = parseInt(pageBtn.getAttribute('data-page'), 10);
      renderNewsPage();
      document.querySelector('.news-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  /* ============================================================
     HOME PAGE PREVIEW (index.html): .home-news-preview — latest 3
     ============================================================ */
  function initHomePreview() {
    const wrap = document.querySelector('.home-news-preview');
    if (!wrap) return;
    fetchJSON(NEWS_URL).then(data => {
      const items = ensureIds(data.items || []);
      renderHomePreview(wrap, items);
      new MutationObserver(() => renderHomePreview(wrap, items)).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }).catch(() => { wrap.innerHTML = errorStateHtml(isZh()); });
  }

  function renderHomePreview(wrap, items) {
    const zh = isZh();
    if (!items.length) { wrap.innerHTML = emptyStateHtml(zh); return; }
    const sorted = [...items].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
    wrap.innerHTML = sorted.map((n, i) => {
      const title = zh ? (n.title_zh || n.title_en) : (n.title_en || n.title_zh);
      const category = zh ? n.category_zh : n.category_en;
      const date = formatDate(n.date, zh);
      const excerpt = excerptFrom(n, zh);
      const featured = i === 0;
      const img = n.cover_image
        ? '<img src="' + escHtml(n.cover_image) + '" alt="' + escHtml(title) + '" class="' + (featured ? 'news-img' : 'news-img-thumb') + '"' + (featured ? '' : ' style="width:100%;height:140px;object-fit:cover;"') + '>'
        : '';
      return '<div class="news-card' + (featured ? ' featured' : '') + '">' +
        img +
        '<div class="news-content"' + (!n.cover_image ? ' style="padding-top:22px"' : '') + '>' +
        '<span class="news-category">' + escHtml(category || '') + '</span>' +
        '<h3>' + escHtml(title || '') + '</h3>' +
        '<p>' + escHtml(excerpt) + '</p>' +
        '<div class="news-meta"><span>' + escHtml(date) + '</span>' +
        '<a href="news.html#post-' + encodeURIComponent(n.id) + '" class="read-more">' + (zh ? '阅读更多' : 'Read More') + '</a>' +
        '</div></div></div>';
    }).join('');
  }

  /* ============================================================
     EVENTS PAGE (upcoming.html): .events-list — upcoming only
     ============================================================ */
  function initEventsList() {
    const list = document.querySelector('.events-list');
    if (!list) return;
    fetchJSON(EVENTS_URL).then(data => {
      const items = ensureIds(data.items || []);
      renderEventsList(list, items);
      new MutationObserver(() => renderEventsList(list, items)).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }).catch(() => { list.innerHTML = errorStateHtml(isZh()); });
  }

  function renderEventsList(list, items) {
    const zh = isZh();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const upcoming = items
      .filter(ev => { const d = new Date(ev.date + 'T00:00:00'); return !isNaN(d) && d >= today; })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    if (!upcoming.length) { list.innerHTML = emptyStateHtml(zh); return; }
    const monthAbbr = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const pin = '<svg class="icon-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
    list.innerHTML = upcoming.map(ev => {
      const d = new Date(ev.date + 'T00:00:00');
      const title = zh ? (ev.title_zh || ev.title_en) : (ev.title_en || ev.title_zh);
      const location = zh ? (ev.location_zh || ev.location_en) : (ev.location_en || ev.location_zh);
      const desc = zh ? (ev.desc_zh || ev.desc_en) : (ev.desc_en || ev.desc_zh);
      return '<div class="event-item">' +
        '<div class="event-date"><span class="event-month">' + monthAbbr[d.getMonth()] + '</span><span class="event-day">' + d.getDate() + '</span></div>' +
        '<div class="event-info"><h4>' + escHtml(title || '') + '</h4>' +
        '<p class="event-meta">' + pin + '<span>' + escHtml(location || '') + '</span><span class="event-time">' + escHtml(ev.time || '') + '</span></p>' +
        '<p>' + escHtml(desc || '') + '</p></div>' +
        '<a href="' + escHtml(ev.register_url || 'contact.html') + '" class="btn btn-sm">' + (zh ? '报名' : 'Register') + '</a>' +
        '</div>';
    }).join('');
  }

  function boot() {
    initNewsPage();
    initHomePreview();
    initEventsList();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
