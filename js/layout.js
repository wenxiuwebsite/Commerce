/* Injects shared nav and footer into every page.
   Each HTML page must have:
     <div id="nav-ph"></div>   (before main content)
     <div id="footer-ph"></div> (after main content)
   and set <body data-page="pagekey"> for active nav highlight.
*/
(function () {
  // Netlify Identity invite/recovery/confirmation links point at the site's
  // root URL, but the Identity widget is only wired up on /admin/. Bounce
  // straight there so the widget can pick up the token from the hash.
  if (/^#(invite_token|recovery_token|confirmation_token|email_change_token)=/.test(location.hash)) {
    location.replace('/admin/' + location.hash);
    return;
  }

  const page = document.body.getAttribute('data-page') || '';

  const links = [
    { href: 'index.html',      label: 'Home',       key: 'home',       i18n: 'nav.home' },
    { href: 'mission.html',    label: 'Mission',    key: 'mission',    i18n: 'nav.mission' },
    { href: 'leadership.html', label: 'Leadership', key: 'leadership', i18n: 'nav.leadership' },
    { href: 'directory.html',  label: 'Directory',  key: 'directory',  i18n: 'nav.directory' },
    { href: 'upcoming.html',   label: 'Events',     key: 'events',     i18n: 'nav.events' },
    { href: 'news.html',       label: 'News',       key: 'news',       i18n: 'nav.news' },
    { href: 'contact.html',    label: 'Contact',    key: 'contact',    i18n: 'nav.contact' },
  ];

  const navLinksHTML = links.map(l =>
    `<a href="${l.href}" class="nav-link${l.key === page ? ' active' : ''}" data-i18n="${l.i18n}">${l.label}</a>`
  ).join('');

  const NAV = `
<nav class="navbar" id="navbar">
  <div class="nav-container">
    <a href="index.html" class="logo">
      <img src="images/logo.png" alt="CCCWA Logo" class="logo-img">
      <div class="logo-text">
        <span class="logo-main" data-i18n="site.name">Chinese Chamber of Commerce</span>
        <span class="logo-sub" data-i18n="site.sub">in Washington State</span>
      </div>
    </a>
    <div class="nav-menu" id="navMenu">
      ${navLinksHTML}
      <a href="join.html" class="nav-btn${page === 'join' ? ' active' : ''}" data-i18n="nav.join">Join Us</a>
    </div>
    <div class="nav-controls">
      <button class="lang-toggle" id="langToggle" aria-label="Switch language">
        <span class="lang-option active" id="langEn">EN</span>
        <span class="lang-divider">|</span>
        <span class="lang-option" id="langZh">中文</span>
      </button>
      <button class="theme-toggle" id="themeToggle" aria-label="Toggle dark mode">
        <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>
      <button class="hamburger" id="hamburger" aria-label="Menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</nav>`;

  const FOOTER = `
<footer class="footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <img src="images/logo.png" alt="CCCWA Logo" class="footer-logo-img">
        <p data-i18n="footer.tagline">Serving the Greater Seattle Chinese business community since 2016.</p>
        <div class="social-links">
          <a href="https://www.facebook.com/cccwa.org/" target="_blank" rel="noopener">Facebook</a>
          <a href="http://www.ccc-wa.org" target="_blank" rel="noopener">Original Site</a>
        </div>
      </div>
      <div class="footer-links">
        <h4 data-i18n="footer.about_title">About</h4>
        <a href="mission.html"    data-i18n="nav.mission">Mission</a>
        <a href="leadership.html" data-i18n="nav.leadership">Leadership</a>
        <a href="directory.html"  data-i18n="nav.directory">Directory</a>
        <a href="join.html"       data-i18n="nav.join">Join Us</a>
      </div>
      <div class="footer-links">
        <h4 data-i18n="footer.events_title">Events &amp; News</h4>
        <a href="upcoming.html" data-i18n="nav.events">Upcoming Events</a>
        <a href="news.html"     data-i18n="nav.news">News Updates</a>
      </div>
      <div class="footer-contact">
        <h4 data-i18n="nav.contact">Contact</h4>
        <p>Bellevue, WA</p>
        <p>(425) 829-5658</p>
        <p>info@ccc-wa.org</p>
      </div>
    </div>
    <div class="footer-bottom">
      <p data-i18n="footer.copyright">&copy; 2026 Chinese Chamber of Commerce in Washington State. All rights reserved.</p>
      <a href="admin/index.html" data-i18n="footer.cms_link">Staff Login</a>
    </div>
  </div>
</footer>`;

  const navPH = document.getElementById('nav-ph');
  if (navPH) navPH.outerHTML = NAV;

  const footerPH = document.getElementById('footer-ph');
  if (footerPH) footerPH.outerHTML = FOOTER;
})();
