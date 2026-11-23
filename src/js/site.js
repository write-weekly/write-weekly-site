/* Weekly — shared site behaviour (nav + footer). Loaded on every page. */
(function () {
  'use strict';

  window.wkToggleMenu = function () {
    var m = document.getElementById('wk-mobile-menu');
    if (!m) return;
    var open = m.classList.toggle('open');
    document.body.style.overflow = open ? 'hidden' : '';
  };

  window.wkToggleFooterCol = function (id) {
    var c = document.getElementById(id);
    if (c && window.matchMedia('(max-width: 768px)').matches) c.classList.toggle('open');
  };

  // Close the mobile menu on Escape.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var m = document.getElementById('wk-mobile-menu');
    if (m && m.classList.contains('open')) window.wkToggleMenu();
  });

  // Mark the current page in the nav.
  document.addEventListener('DOMContentLoaded', function () {
    var here = window.location.pathname.replace(/\/$/, '') || '/';
    document.querySelectorAll('.wk-nav-link').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (href.indexOf('#') === 0) return;
      var path = href.replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, '') || '/';
      if (path === here) a.classList.add('active');
    });
  });

  // ── How it works: audience tabs (shared) ──
  window.audSetTab = function (btn, index) {
    var wrap = btn.closest('.aud-tabs');
    if (!wrap) return;
    wrap.querySelectorAll('.aud-tab-btn').forEach(function (b) {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    wrap.querySelectorAll('.aud-tab-panel').forEach(function (p) {
      p.classList.toggle('active', Number(p.dataset.tabIndex) === index);
    });
  };

  // ── Scroll reveal: lower sections blur/fade until scrolled into view ──
  (function () {
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    document.body.classList.add('js-reveal');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -38% 0px', threshold: 0 });
    els.forEach(function (el) { io.observe(el); });
  })();

})();
