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

  // Body/summary text can legitimately contain raw HTML fragments (e.g. a
  // bold/linked "Register" run inserted via the rich-text toolbar) mixed in
  // with plain Markdown. Cards are text-only by design, so strip real tags
  // via the browser's own tolerant parser before touching Markdown syntax —
  // a regex that only deletes ">" characters mangles embedded HTML instead
  // of removing it.
  function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = String(html || '');
    return tmp.textContent || tmp.innerText || '';
  }

  function stripMarkdown(md) {
    return stripHtml(md)
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/[#*_>`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function excerptFrom(item, zh) {
    const summary = zh ? item.summary_zh : item.summary_en;
    if (summary) return stripHtml(summary).replace(/\s+/g, ' ').trim();
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

  // Text-only cards by design — cover_image is intentionally not rendered
  // here (or on the article page). The data is still stored, so images can
  // be turned back on later without re-uploading anything.
  function newsCardHtml(n, featured, zh) {
    const title = zh ? (n.title_zh || n.title_en) : (n.title_en || n.title_zh);
    const category = zh ? n.category_zh : n.category_en;
    const date = formatDate(n.date, zh);
    const excerpt = excerptFrom(n, zh);
    return '<div class="news-card' + (featured ? ' featured' : '') + '" id="post-' + escHtml(n.id) + '">' +
      '<div class="news-content" style="padding-top:22px">' +
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
      return '<div class="news-card' + (featured ? ' featured' : '') + '">' +
        '<div class="news-content" style="padding-top:22px">' +
        '<span class="news-category">' + escHtml(category || '') + '</span>' +
        '<h3>' + escHtml(title || '') + '</h3>' +
        '<p>' + escHtml(excerpt) + '</p>' +
        '<div class="news-meta"><span>' + escHtml(date) + '</span>' +
        '<a href="news.html#post-' + encodeURIComponent(n.id) + '" class="read-more">' + (zh ? '阅读更多' : 'Read More') + '</a>' +
        '</div></div></div>';
    }).join('');
  }

  /* ============================================================
     EVENTS — shared upcoming-events logic for the full list
     (upcoming.html: .events-list) and the home page preview
     (index.html: .home-events-preview, next 3 only)
     ============================================================ */
  const EVENT_MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const EVENT_PIN_SVG = '<svg class="icon-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';

  function upcomingEvents(items) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return items
      .filter(ev => { const d = new Date(ev.date + 'T00:00:00'); return !isNaN(d) && d >= today; })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  function eventItemHtml(ev, zh) {
    const d = new Date(ev.date + 'T00:00:00');
    const title = zh ? (ev.title_zh || ev.title_en) : (ev.title_en || ev.title_zh);
    const location = zh ? (ev.location_zh || ev.location_en) : (ev.location_en || ev.location_zh);
    const desc = zh ? (ev.desc_zh || ev.desc_en) : (ev.desc_en || ev.desc_zh);
    return '<div class="event-item">' +
      '<div class="event-date"><span class="event-month">' + EVENT_MONTH_ABBR[d.getMonth()] + '</span><span class="event-day">' + d.getDate() + '</span></div>' +
      '<div class="event-info"><h4>' + escHtml(title || '') + '</h4>' +
      '<p class="event-meta">' + EVENT_PIN_SVG + '<span>' + escHtml(location || '') + '</span><span class="event-time">' + escHtml(ev.time || '') + '</span></p>' +
      '<p>' + escHtml(desc || '') + '</p></div>' +
      '<a href="' + escHtml(ev.register_url || 'contact.html') + '" class="btn btn-sm">' + (zh ? '报名' : 'Register') + '</a>' +
      '</div>';
  }

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
    const upcoming = upcomingEvents(items);
    if (!upcoming.length) { list.innerHTML = emptyStateHtml(zh); return; }
    list.innerHTML = upcoming.map(ev => eventItemHtml(ev, zh)).join('');
  }

  function initHomeEventsPreview() {
    const wrap = document.querySelector('.home-events-preview');
    if (!wrap) return;
    fetchJSON(EVENTS_URL).then(data => {
      const items = ensureIds(data.items || []);
      renderHomeEventsPreview(wrap, items);
      new MutationObserver(() => renderHomeEventsPreview(wrap, items)).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }).catch(() => { wrap.innerHTML = errorStateHtml(isZh()); });
  }

  function renderHomeEventsPreview(wrap, items) {
    const zh = isZh();
    const upcoming = upcomingEvents(items).slice(0, 3);
    if (!upcoming.length) { wrap.innerHTML = emptyStateHtml(zh); return; }
    wrap.innerHTML = upcoming.map(ev => eventItemHtml(ev, zh)).join('');
  }

  /* ============================================================
     LEADERSHIP PAGE (leadership.html): two grids split by "section"
     ("executive" -> Board of Directors, "member" -> Member Orgs)
     ============================================================ */
  const LEADERSHIP_URL = 'content/leadership.json';

  function leaderCardHtml(m, zh) {
    const name = zh ? (m.name_zh || m.name_en) : (m.name_en || m.name_zh);
    const role = zh ? (m.role_zh || m.role_en) : (m.role_en || m.role_zh);
    const company = zh ? (m.company_zh || m.company_en) : (m.company_en || m.company_zh);
    return '<div class="leader-card">' +
      (role ? '<span class="leader-role">' + escHtml(role) + '</span>' : '') +
      '<h3>' + escHtml(name || '') + '</h3>' +
      (company ? '<p>' + escHtml(company) + '</p>' : '') +
      '</div>';
  }

  function renderLeadershipPage(items) {
    const zh = isZh();
    const execGrid = document.getElementById('leadership-exec-grid');
    const memberGrid = document.getElementById('leadership-member-grid');
    const exec = items.filter(m => m.section !== 'member');
    const members = items.filter(m => m.section === 'member');
    if (execGrid) execGrid.innerHTML = exec.length ? exec.map(m => leaderCardHtml(m, zh)).join('') : emptyStateHtml(zh);
    if (memberGrid) memberGrid.innerHTML = members.length ? members.map(m => leaderCardHtml(m, zh)).join('') : emptyStateHtml(zh);
  }

  function initLeadershipPage() {
    const execGrid = document.getElementById('leadership-exec-grid');
    const memberGrid = document.getElementById('leadership-member-grid');
    if (!execGrid && !memberGrid) return;
    fetchJSON(LEADERSHIP_URL).then(data => {
      const items = ensureIds(data.items || []);
      renderLeadershipPage(items);
      new MutationObserver(() => renderLeadershipPage(items)).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }).catch(() => {
      if (execGrid) execGrid.innerHTML = errorStateHtml(isZh());
    });
  }

  /* ============================================================
     DIRECTORY PAGE (directory.html): single grid of member cards
     ============================================================ */
  const DIRECTORY_URL = 'content/directory.json';

  function memberCardHtml(m, zh) {
    const name = zh ? (m.name_zh || m.name_en) : (m.name_en || m.name_zh);
    const category = zh ? (m.category_zh || m.category_en) : (m.category_en || m.category_zh);
    return '<div class="member-card">' +
      '<div class="member-logo">' + (m.logo ? '<img src="' + escHtml(m.logo) + '" alt="' + escHtml(name || '') + '">' : '') + '</div>' +
      '<div class="member-info">' +
      '<h4>' + escHtml(name || '') + '</h4>' +
      (category ? '<p>' + escHtml(category) + '</p>' : '') +
      '</div></div>';
  }

  function renderDirectoryPage(grid, items) {
    const zh = isZh();
    if (!items.length) { grid.innerHTML = emptyStateHtml(zh); return; }
    grid.innerHTML = items.map(m => memberCardHtml(m, zh)).join('');
  }

  function initDirectoryPage() {
    const grid = document.getElementById('directory-grid');
    if (!grid) return;
    fetchJSON(DIRECTORY_URL).then(data => {
      const items = ensureIds(data.items || []);
      renderDirectoryPage(grid, items);
      new MutationObserver(() => renderDirectoryPage(grid, items)).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }).catch(() => { grid.innerHTML = errorStateHtml(isZh()); });
  }

  function boot() {
    initNewsPage();
    initHomePreview();
    initEventsList();
    initHomeEventsPreview();
    initLeadershipPage();
    initDirectoryPage();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
