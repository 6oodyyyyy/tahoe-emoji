/* Tahoe emoji picker — UI logic */
(function () {
  'use strict';
  var COLS = 5;
  var HOLD_MS = 450;

  /* ---------- SF-Symbol-style outline icons (stroke 1.5, round caps) ---------- */
  function ic(paths) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
  }
  var ICONS = {
  clock: "<img src=\"icons-original/clock.png\" class=\"cat-icon-orig\" alt=\"\">",
  smiley: "<img src=\"icons-original/smiley.png\" class=\"cat-icon-orig\" alt=\"\">",
  person: "<svg viewBox=\"0 0 22.1875 23.1348\" fill=\"currentColor\"> <g> <rect height=\"23.1348\" opacity=\"0\" width=\"22.1875\" x=\"0\" y=\"0\"/> <path d=\"M2.86133 23.125L18.9648 23.125C20.9082 23.125 21.8262 22.5195 21.8262 21.2109C21.8262 17.9199 17.6758 13.1934 10.9082 13.1934C4.15039 13.1934 0 17.9199 0 21.2109C0 22.5195 0.917969 23.125 2.86133 23.125ZM2.38281 21.4941C1.9043 21.4941 1.72852 21.3672 1.72852 21.0156C1.72852 18.7402 5.03906 14.834 10.9082 14.834C16.7871 14.834 20.0977 18.7402 20.0977 21.0156C20.0977 21.3672 19.9219 21.4941 19.4434 21.4941ZM10.9277 11.5332C13.8867 11.5332 16.2695 8.92578 16.2695 5.69336C16.2695 2.51953 13.8867 0 10.9277 0C7.97852 0 5.57617 2.55859 5.57617 5.71289C5.57617 8.93555 7.96875 11.5332 10.9277 11.5332ZM10.9277 9.90234C8.94531 9.90234 7.30469 8.06641 7.30469 5.71289C7.30469 3.42773 8.93555 1.63086 10.9277 1.63086C12.9199 1.63086 14.541 3.39844 14.541 5.69336C14.541 8.04688 12.9102 9.90234 10.9277 9.90234Z\" /> </g> </svg>",
  paw: "<img src=\"icons-original/dog.png\" class=\"cat-icon-orig\" alt=\"\">",
  apple: "<img src=\"icons-original/apple.png\" class=\"cat-icon-orig\" alt=\"\">",
  soccer: "<img src=\"icons-original/soccer.png\" class=\"cat-icon-orig\" alt=\"\">",
  car: "<img src=\"icons-original/car.png\" class=\"cat-icon-orig\" alt=\"\">",
  bulb: "<img src=\"icons-original/bulb.png\" class=\"cat-icon-orig\" alt=\"\">",
  heart: "<svg viewBox=\"0 0 25.0879 23.4668\" fill=\"currentColor\"> <g> <rect height=\"23.4668\" opacity=\"0\" width=\"25.0879\" x=\"0\" y=\"0\"/> <path d=\"M0 8.1543C0 13.457 4.55078 18.6523 11.543 23.1543C11.7871 23.3105 12.1289 23.4668 12.3633 23.4668C12.6074 23.4668 12.9492 23.3105 13.1934 23.1543C20.1758 18.6523 24.7266 13.457 24.7266 8.1543C24.7266 3.79883 21.7285 0.693359 17.7148 0.693359C15.4199 0.693359 13.4668 1.8457 12.3633 3.61328C11.2695 1.85547 9.31641 0.693359 7.01172 0.693359C2.99805 0.693359 0 3.79883 0 8.1543ZM1.72852 8.1543C1.72852 4.73633 3.96484 2.42188 6.99219 2.42188C9.3457 2.42188 10.7617 3.88672 11.6113 5.26367C11.9043 5.71289 12.0996 5.84961 12.3633 5.84961C12.6367 5.84961 12.8027 5.70312 13.125 5.26367C14.0137 3.90625 15.3906 2.42188 17.7344 2.42188C20.7617 2.42188 22.998 4.73633 22.998 8.1543C22.998 12.8711 18.0566 17.8906 12.5977 21.5234C12.4902 21.5918 12.4121 21.6504 12.3633 21.6504C12.3145 21.6504 12.2363 21.5918 12.1289 21.5234C6.66992 17.8906 1.72852 12.8711 1.72852 8.1543Z\" /> </g> </svg>",
  flag: "<img src=\"icons-original/flag.png\" class=\"cat-icon-orig\" alt=\"\">",
  more: "<img src=\"icons-original/more.png\" class=\"cat-icon-orig\" alt=\"\">",
};



  /* Tabs: Tahoe order — Smileys first, then Recents, then groups */
  var TABS = [
    { id: 'recent', icon: 'clock', name: 'Frequently Used' },
    { id: 0, icon: 'smiley', name: 'Smileys & People' },
    { id: 1, icon: 'paw', name: 'Animals & Nature' },
    { id: 2, icon: 'apple', name: 'Food & Drink' },
    { id: 3, icon: 'soccer', name: 'Activity' },
    { id: 4, icon: 'car', name: 'Travel & Places' },
    { id: 5, icon: 'bulb', name: 'Objects' },
    { id: 6, icon: 'heart', name: 'Symbols' },
    { id: 7, icon: 'flag', name: 'Flags' },
    { id: 'more', icon: 'more', name: 'Expand' }
  ];

  /* ---------- bridge (pywebview or mock for testing) ----------
     NOTE: pywebview injects window.pywebview *after* the page starts
     loading, so binding api once at parse time can permanently fall back
     to the mock (Esc / insert then silently do nothing). Bind lazily. */
  var MOCK = {
    getRecents: function () { return Promise.resolve(['\uD83D\uDE00', '\uD83D\uDE02', '\u2764\uFE0F', '\uD83D\uDC4D', '\uD83C\uDF89']); },
    getConfig: function () { return Promise.resolve({ accent: '#0A84FF', lastCategory: 0 }); },
    addRecent: function () { return Promise.resolve(); },
    setLastCategory: function () { return Promise.resolve(); },
    insert: function (e) { console.log('[mock] insert', e); return Promise.resolve(); },
    hide: function () { console.log('[mock] hide'); return Promise.resolve(); },
    openFullViewer: function () { console.log('[mock] openFullViewer'); return Promise.resolve(); }
  };
  var api = MOCK;
  function bindApi() {
    if (window.pywebview && window.pywebview.api) {
      api = window.pywebview.api;
      return true;
    }
    return false;
  }

  /* ---------- state ---------- */
  var recents = [];
  var lastCat = 0;
  var cat = 0;
  var query = '';
  var items = [];   /* currently displayed emoji objects */
  var hi = -1;      /* keyboard highlight index */

  var gridInner = document.getElementById('gridInner');
  var grid = document.getElementById('grid');
  var searchInput = document.getElementById('search');
  var clearBtn = document.getElementById('clearBtn');
  var catbar = document.getElementById('catbar');
  var tonePop = document.getElementById('tonePop');
  var panel = document.getElementById('panel');

  var byChar = {};
  (window.EMOJI_DATA || []).forEach(function (e) { byChar[e.e] = e; });

  /* ---------- rendering ---------- */
  function currentItems() {
    var data = window.EMOJI_DATA || [];
    if (query) {
      var q = query.toLowerCase();
      var out = [];
      for (var i = 0; i < data.length && out.length < 400; i++) {
        var e = data[i];
        if (e.n.indexOf(q) !== -1 || e.k.indexOf(q) !== -1) out.push(e);
      }
      return out;
    }
    if (cat === 'recent') {
      var r = recents.map(function (ch) { return byChar[ch]; })
        .filter(function (e) { return !!e; });
      /* recents first, then the full set so the panel never looks empty */
      var seen = {};
      r.forEach(function (e) { seen[e.e] = 1; });
      return r.concat(data.filter(function (e) { return !seen[e.e]; }));
    }
    return data.filter(function (e) { return e.g === cat; });
  }

  function render() {
    items = currentItems();
    hi = -1;
    gridInner.innerHTML = '';
    if (!items.length) {
      var d = document.createElement('div');
      d.className = 'grid-empty';
      d.textContent = 'No results';
      gridInner.appendChild(d);
      return;
    }
    var frag = document.createDocumentFragment();
    items.forEach(function (e, idx) {
      var cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.idx = idx;
      var hit = document.createElement('div');
      hit.className = 'hit';
      hit.textContent = e.e;
      cell.appendChild(hit);
      frag.appendChild(cell);
    });
    gridInner.appendChild(frag);
    grid.scrollTop = 0;
  }

  function setHi(i) {
    var cells = gridInner.children;
    if (hi >= 0 && cells[hi]) cells[hi].classList.remove('kb');
    hi = Math.max(0, Math.min(i, items.length - 1));
    if (cells[hi]) {
      cells[hi].classList.add('kb');
      cells[hi].scrollIntoView({ block: 'nearest' });
    }
  }

  function renderCatbar() {
    catbar.innerHTML = '';
    TABS.forEach(function (t) {
      var b = document.createElement('button');
      b.className = 'cat' + (t.id === cat ? ' active' : '');
      b.title = t.name;
      b.innerHTML = ICONS[t.icon];
      b.addEventListener('click', function () { onTab(t.id); });
      catbar.appendChild(b);
    });
  }

  function onTab(id) {
    if (id === 'more') { api.openFullViewer(); return; }
    cat = id;
    lastCat = id;
    query = '';
    searchInput.value = '';
    clearBtn.hidden = true;
    api.setLastCategory(id);
    renderCatbar();
    render();
  }

  /* ---------- insert ---------- */
  function doInsert(e) {
    hideTonePop();
    api.addRecent(e.e);
    // update local recents immediately
    recents = [e.e].concat(recents.filter(function (c) { return c !== e.e; })).slice(0, 32);
    api.insert(e.e);
  }

  /* ---------- skin-tone popover ---------- */
  var holdTimer = null;
  var holdCell = null;

  function hideTonePop() {
    tonePop.hidden = true;
    tonePop.innerHTML = '';
  }

  function showTonePop(cell, emoji) {
    if (!emoji.s || !emoji.s.length) return;
    tonePop.innerHTML = '';
    var variants = [emoji.e].concat(emoji.s);
    variants.forEach(function (ch) {
      var c = document.createElement('div');
      c.className = 'cell';
      var h = document.createElement('div');
      h.className = 'hit';
      h.textContent = ch;
      c.appendChild(h);
      c.addEventListener('pointerup', function (ev) {
        ev.stopPropagation();
        doInsert({ e: ch });
      });
      tonePop.appendChild(c);
    });
    // position above the cell, inside the panel
    var pr = panel.getBoundingClientRect();
    var cr = cell.getBoundingClientRect();
    var pw = variants.length * 46 + 10;
    var left = cr.left - pr.left + cr.width / 2 - pw / 2;
    left = Math.max(6, Math.min(left, 336 - pw - 6));
    var top = cr.top - pr.top - 56;
    if (top < 4) top = cr.top - pr.top + cr.height + 6;
    tonePop.style.left = left + 'px';
    tonePop.style.top = top + 'px';
    tonePop.style.width = pw + 'px';
    tonePop.hidden = false;
  }

  gridInner.addEventListener('pointerdown', function (ev) {
    var cell = ev.target.closest('.cell');
    if (!cell || cell.closest('.tone-pop')) return;
    var idx = +cell.dataset.idx;
    var emoji = items[idx];
    if (!emoji) return;
    holdCell = cell;
    clearTimeout(holdTimer);
    if (emoji.s && emoji.s.length) {
      holdTimer = setTimeout(function () {
        showTonePop(cell, emoji);
        holdCell = null;
      }, HOLD_MS);
    }
  });

  gridInner.addEventListener('pointerup', function (ev) {
    clearTimeout(holdTimer);
    if (!tonePop.hidden) return; // popover handles its own clicks
    var cell = ev.target.closest('.cell');
    if (!cell || cell.closest('.tone-pop')) return;
    if (cell !== holdCell && holdCell) return;
    var idx = +cell.dataset.idx;
    if (items[idx]) doInsert(items[idx]);
    holdCell = null;
  });

  gridInner.addEventListener('contextmenu', function (ev) {
    var cell = ev.target.closest('.cell');
    if (!cell || cell.closest('.tone-pop')) return;
    ev.preventDefault();
    clearTimeout(holdTimer);
    var idx = +cell.dataset.idx;
    if (items[idx] && items[idx].s) showTonePop(cell, items[idx]);
  });

  document.addEventListener('pointerdown', function (ev) {
    if (!tonePop.hidden && !ev.target.closest('.tone-pop')) hideTonePop();
  });

  /* ---------- search ---------- */
  searchInput.addEventListener('input', function () {
    query = searchInput.value.trim();
    clearBtn.hidden = !query;
    render();
  });
  clearBtn.addEventListener('click', function () {
    searchInput.value = '';
    query = '';
    clearBtn.hidden = true;
    render();
    searchInput.focus();
  });

  /* ---------- keyboard ---------- */
  document.addEventListener('keydown', function (ev) {
    if (!tonePop.hidden && ev.key === 'Escape') { hideTonePop(); return; }
    if (ev.key === 'Escape') {
      if (query) {
        searchInput.value = ''; query = ''; clearBtn.hidden = true; render();
      } else {
        api.hide();
      }
      return;
    }
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp' ||
        ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
      if (!items.length) return;
      ev.preventDefault();
      if (hi < 0) { setHi(ev.key === 'ArrowUp' ? items.length - 1 : 0); return; }
      var n = hi;
      if (ev.key === 'ArrowRight') n = (hi + 1) % items.length;
      if (ev.key === 'ArrowLeft') n = (hi - 1 + items.length) % items.length;
      if (ev.key === 'ArrowDown') n = Math.min(hi + COLS, items.length - 1);
      if (ev.key === 'ArrowUp') n = Math.max(hi - COLS, 0);
      setHi(n);
      return;
    }
    if (ev.key === 'Enter') {
      if (hi >= 0 && items[hi]) { ev.preventDefault(); doInsert(items[hi]); }
      return;
    }
    // printable char while search not focused -> focus search
    if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey &&
        document.activeElement !== searchInput) {
      searchInput.focus();
    }
  });
  // mouse hover clears keyboard highlight
  gridInner.addEventListener('pointermove', function (ev) {
    var cell = ev.target.closest('.cell');
    if (cell && hi >= 0) {
      var cells = gridInner.children;
      if (cells[hi]) cells[hi].classList.remove('kb');
      hi = -1;
    }
  });

  /* ---------- show (called from Python) ---------- */
  window.onPickerShow = function () {
    hideTonePop();
    cat = lastCat;
    searchInput.value = '';
    query = '';
    clearBtn.hidden = true;
    renderCatbar();
    render();
    setTimeout(function () { searchInput.focus(); }, 30);
  };

  /* ---------- init (once the pywebview bridge is ready) ---------- */
  var _inited = false;
  function init() {
    if (_inited) return;
    _inited = true;
    renderCatbar();
    render();
    api.getConfig().then(function (cfg) {
      if (cfg && cfg.accent) {
        document.documentElement.style.setProperty('--accent', cfg.accent);
        var m = cfg.accent.match(/^#([0-9a-f]{6})$/i);
        if (m) {
          var r = parseInt(m[1].substr(0, 2), 16),
              g = parseInt(m[1].substr(2, 2), 16),
              b = parseInt(m[1].substr(4, 2), 16);
          document.documentElement.style.setProperty('--accent-soft', 'rgba(' + r + ',' + g + ',' + b + ',0.18)');
          document.documentElement.style.setProperty('--accent-pressed', 'rgba(' + r + ',' + g + ',' + b + ',0.28)');
        }
      }
      if (cfg && cfg.lastCategory !== undefined) lastCat = cfg.lastCategory;
      cat = lastCat;
      renderCatbar();
      render();
    });
    api.getRecents().then(function (r) {
      if (r && r.length) { recents = r; render(); }
    });
  }
  function boot() { bindApi(); init(); }
  if (window.addEventListener) window.addEventListener('pywebviewready', boot);
  if (bindApi()) { init(); }
  else { setTimeout(boot, 600); }  /* plain-browser fallback: keep MOCK */
})();
