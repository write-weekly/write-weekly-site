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
})();
