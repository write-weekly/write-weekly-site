/* ============================================================
   Free-trial wizard helpers — shared by /free-trial/start/ and
   /free-trial/departing/. The Klaviyo submit stays in each page.

   Markup conventions:
     .step-panel#step-N            one per step
     .tf-next / .tf-prev buttons   step navigation (no inline onclick)
     #tf-progress-label, #tf-progress-fill
     <prefix>-month/-day/-year selects + hidden #<prefix>-date
   ============================================================ */
(function () {
  var MONTHS_31 = [1, 3, 5, 7, 8, 10, 12];
  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                     'August', 'September', 'October', 'November', 'December'];
  function $(id) { return document.getElementById(id); }
  function pad(n) { return String(n).padStart(2, '0'); }

  var T = window.WKTrial = {};

  // ── URL params ──────────────────────────────────────────────
  // v: '1' or '2' passes through; anything else is ignored.
  T.params = function () {
    var p = null;
    try { p = new URLSearchParams(window.location.search); } catch (err) {}
    var v = p && p.get('v');
    if (v !== '1' && v !== '2') v = null;
    return { v: v, variant: v || 'default', get: function (k) { return p ? p.get(k) : null; } };
  };

  T.radio = function (name) {
    return (document.querySelector('input[name="' + name + '"]:checked') || {}).value || '';
  };
  T.setRadio = function (name, value) {
    var el = value && document.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if (el) { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); }
  };
  T.isSelf  = function () { return T.radio('relationship') === 'I am the missionary'; };
  T.isEmail = function (s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); };

  // ── Dates ───────────────────────────────────────────────────
  T.today = function () {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  };

  T.addMonths = function (dateStr, months) {
    var d = new Date(dateStr + 'T12:00:00');
    if (isNaN(d)) return '';
    d.setMonth(d.getMonth() + months);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  };

  // Elder = 24 months, Sister = 18 months.
  T.returnDate = function (departure, title) {
    if (!departure || !title) return '';
    return T.addMonths(departure, title === 'Elder' ? 24 : 18);
  };

  T.formatDate = function (dateStr) {
    var p = (dateStr || '').split('-');
    if (p.length !== 3) return '';
    return MONTH_NAMES[parseInt(p[1], 10) - 1] + ' ' + parseInt(p[2], 10) + ', ' + p[0];
  };

  function daysIn(month, year) {
    if (!month) return 31;
    month = parseInt(month, 10);
    year = parseInt(year, 10) || 2000;
    if (month === 2) return (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28;
    return MONTHS_31.indexOf(month) >= 0 ? 31 : 30;
  }

  function populateDays(prefix) {
    var daySel = $(prefix + '-day');
    var current = daySel.value;
    var n = daysIn($(prefix + '-month').value, $(prefix + '-year').value);
    daySel.innerHTML = '<option value="">Day</option>';
    for (var d = 1; d <= n; d++) {
      var o = document.createElement('option');
      o.value = pad(d); o.textContent = d;
      if (o.value === current) o.selected = true;
      daySel.appendChild(o);
    }
  }

  function sync(prefix) {
    var m = $(prefix + '-month').value, d = $(prefix + '-day').value, y = $(prefix + '-year').value;
    $(prefix + '-date').value = (m && d && y) ? y + '-' + m + '-' + d : '';
  }

  T.dates = {
    // Fill the year list (newest first when `descending`) and wire up changes.
    init: function (prefix, startYear, endYear, onChange, descending) {
      var yearSel = $(prefix + '-year');
      yearSel.innerHTML = '<option value="">Year</option>';
      var years = [];
      for (var y = startYear; y <= endYear; y++) years.push(y);
      if (descending) years.reverse();
      years.forEach(function (y) {
        var o = document.createElement('option');
        o.value = y; o.textContent = y;
        yearSel.appendChild(o);
      });
      populateDays(prefix);
      ['month', 'day', 'year'].forEach(function (part) {
        $(prefix + '-' + part).addEventListener('change', function () {
          populateDays(prefix);
          sync(prefix);
          if (onChange) onChange($(prefix + '-date').value);
        });
      });
    },
    get: function (prefix) { return $(prefix + '-date').value; },
    set: function (prefix, dateStr) {
      var p = (dateStr || '').split('-');
      if (p.length !== 3) return;
      var yearSel = $(prefix + '-year');
      if (!yearSel.querySelector('option[value="' + p[0] + '"]')) {
        var o = document.createElement('option');
        o.value = p[0]; o.textContent = p[0];
        yearSel.appendChild(o);
      }
      $(prefix + '-month').value = p[1];
      yearSel.value = p[0];
      populateDays(prefix);
      $(prefix + '-day').value = p[2];
      sync(prefix);
    }
  };

  // ── Step wizard ─────────────────────────────────────────────
  // opts: { form, total, validate(step) → bool }
  T.wizard = function (opts) {
    var current = 1;

    function goTo(n) {
      if (n > current && !opts.validate(current)) return;
      $('step-' + current).classList.remove('active');
      $('step-' + n).classList.add('active');
      current = n;
      $('tf-progress-label').textContent = 'Step ' + n + ' of ' + opts.total;
      $('tf-progress-fill').style.width = (n / opts.total * 100) + '%';
      var card = opts.form.closest('.form-card');
      if (card.getBoundingClientRect().top < 0) {
        window.scrollTo({ top: window.scrollY + card.getBoundingClientRect().top - 90, behavior: 'smooth' });
      }
    }

    opts.form.querySelectorAll('.tf-next').forEach(function (b) {
      b.addEventListener('click', function () { goTo(current + 1); });
    });
    opts.form.querySelectorAll('.tf-prev').forEach(function (b) {
      b.addEventListener('click', function () { goTo(current - 1); });
    });

    // Enter advances a step, or submits on the last one. The mission picker
    // stops Enter from reaching here while its list is open.
    opts.form.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      if (current < opts.total) goTo(current + 1);
      else opts.form.dispatchEvent(new Event('submit', { cancelable: true }));
    });

    $('tf-progress-label').textContent = 'Step 1 of ' + opts.total;
    $('tf-progress-fill').style.width = (100 / opts.total) + '%';

    return {
      goTo: goTo,
      current: function () { return current; },
      // Validate every step; jump to the first failing one.
      validateAll: function () {
        for (var s = 1; s <= opts.total; s++) {
          if (!opts.validate(s)) { if (s !== current) goTo(s); return false; }
        }
        return true;
      }
    };
  };

  // Swap the wizard for the confirmation.
  T.showSuccess = function () {
    $('form-wizard').hidden = true;
    $('form-success').classList.add('visible');
    var card = $('form-success').closest('.form-card');
    window.scrollTo({ top: Math.max(0, window.scrollY + card.getBoundingClientRect().top - 90), behavior: 'smooth' });
  };
})();
