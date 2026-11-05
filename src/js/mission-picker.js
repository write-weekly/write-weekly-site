/* ============================================================
   Mission picker — type-to-search list of missions.
   Used on /free-trial/start/ (and /free-trial/departing/).

   Markup it expects (ids are passed in, not assumed):
     <div class="mp">
       <input type="text" role="combobox" …>
       <ul class="mp-list" role="listbox" hidden></ul>
     </div>
     <div class="mp-other" hidden><input type="text"></div>

   Usage:
     var picker = WKMissionPicker({
       input, list, otherWrap, otherInput,
       missions: [{id, slug, name}, …]
     });
     picker.getValue()   // → {id, name} | null
     picker.setDisabled(true)  // greys out; getValue() → {id:'unknown', name:''}

   mission_id sent onward is the entry's slug (stable across yearly
   list refreshes), or 'other' / 'unknown'. Never the raw search text.
   ============================================================ */
(function () {
  var MAX_RESULTS = 60;
  var OTHER = { other: true };

  // Case- and accent-insensitive: "mexico" matches "México", "bahia" matches "Bahía".
  function fold(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[’‘]/g, "'").toLowerCase();
  }

  window.WKMissionPicker = function (opts) {
    var input = opts.input, list = opts.list;
    var otherWrap = opts.otherWrap, otherInput = opts.otherInput;
    var index = opts.missions.map(function (m) { return { m: m, key: fold(m.name) }; });

    var selected = null;   // a mission entry, OTHER, or null
    var disabled = false;
    var items = [];        // what's currently rendered: entries + OTHER last
    var active = -1;

    function isOpen() { return !list.hidden; }

    function open() {
      if (disabled) return;
      render();
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }

    function close() {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    }

    function filter(q) {
      var tokens = fold(q).split(/\s+/).filter(Boolean);
      var out = [];
      for (var i = 0; i < index.length && out.length < MAX_RESULTS; i++) {
        var key = index[i].key, ok = true;
        for (var t = 0; t < tokens.length; t++) {
          if (key.indexOf(tokens[t]) === -1) { ok = false; break; }
        }
        if (ok) out.push(index[i].m);
      }
      return out;
    }

    function render() {
      items = filter(input.value).concat([OTHER]);
      active = -1;
      list.innerHTML = '';
      items.forEach(function (item, i) {
        var li = document.createElement('li');
        li.id = input.id + '-opt-' + i;
        li.className = 'mp-opt' + (item === OTHER ? ' mp-opt--other' : '');
        li.setAttribute('role', 'option');
        li.textContent = item === OTHER ? "My mission isn't listed" : item.name;
        li.addEventListener('click', function () { choose(item); });
        list.appendChild(li);
      });
    }

    function setActive(i) {
      var opts = list.children;
      if (!opts.length) return;
      if (active >= 0 && opts[active]) opts[active].setAttribute('aria-selected', 'false');
      active = (i + opts.length) % opts.length;
      opts[active].setAttribute('aria-selected', 'true');
      input.setAttribute('aria-activedescendant', opts[active].id);
      opts[active].scrollIntoView({ block: 'nearest' });
    }

    function choose(item) {
      selected = item;
      if (item === OTHER) {
        input.value = "My mission isn't listed";
        otherWrap.hidden = false;
        close();
        otherInput.focus();
      } else {
        input.value = item.name;
        otherWrap.hidden = true;
        otherInput.value = '';
        close();
      }
      input.classList.add('mp-has-value');
    }

    input.addEventListener('input', function () {
      // Any edit after a choice clears it — the saved value must come from the list.
      selected = null;
      input.classList.remove('mp-has-value');
      otherWrap.hidden = true;
      open();
    });

    input.addEventListener('focus', function () { if (!selected) open(); });
    input.addEventListener('click', function () { if (!isOpen()) open(); });
    input.addEventListener('blur', close);

    // Keep focus in the input while tapping an option, so blur doesn't close
    // the list before the click lands.
    list.addEventListener('mousedown', function (e) { e.preventDefault(); });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen()) open();
        setActive(active + (e.key === 'ArrowDown' ? 1 : (active < 0 ? 0 : -1)));
      } else if (e.key === 'Enter') {
        if (!isOpen()) return;   // closed: let the form's Enter-to-advance run
        e.preventDefault();
        e.stopPropagation();
        // Enter with nothing highlighted takes the top match, if there is one.
        if (active >= 0) choose(items[active]);
        else if (items.length > 1) choose(items[0]);
      } else if (e.key === 'Escape') {
        if (isOpen()) { e.preventDefault(); e.stopPropagation(); close(); }
      }
    });

    return {
      getValue: function () {
        if (disabled) return { id: 'unknown', name: '' };
        if (selected === OTHER) return { id: 'other', name: otherInput.value.trim() };
        if (selected) return { id: selected.slug, name: selected.name };
        return null;
      },
      setDisabled: function (b) {
        disabled = !!b;
        input.disabled = disabled;
        input.closest('.mp').classList.toggle('mp--disabled', disabled);
        if (disabled) {
          selected = null;
          input.value = '';
          input.classList.remove('mp-has-value');
          otherWrap.hidden = true;
          close();
        }
      },
      // Preselect by slug (e.g. carried over in the URL). Unknown slugs are ignored.
      select: function (slug) {
        for (var i = 0; i < index.length; i++) {
          if (index[i].m.slug === slug) { choose(index[i].m); return true; }
        }
        return false;
      },
      focus: function () { input.focus(); }
    };
  };
})();
