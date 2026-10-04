/* Tahoe emoji picker — UI logic */
(function () {
  'use strict';
  var COLS = 6;
  var HOLD_MS = 450;

  /* ---------- SF-Symbol-style outline icons (stroke 1.5, round caps) ---------- */
  function ic(paths) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
  }
  var ICONS = {
    clock: ic('<circle cx="12" cy="12" r="8.5"/><polyline points="12 7.5 12 12 15.5 13.5"/>'),
    smiley: ic('<circle cx="12" cy="12" r="8.5"/><circle cx="9" cy="10" r="0.6" fill="currentColor"/><circle cx="15" cy="10" r="0.6" fill="currentColor"/><path d="M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-0.6 3.5-1.8"/>'),
    paw: ic('<ellipse cx="12" cy="15.5" rx="4.2" ry="3.4"/><circle cx="5.8" cy="10.5" r="1.7"/><circle cx="9.7" cy="7.8" r="1.7"/><circle cx="14.3" cy="7.8" r="1.7"/><circle cx="18.2" cy="10.5" r="1.7"/>'),
    apple: ic('<path d="M12 8.2c-1.5-1.8-4-2.4-5.9-1C4.4 8.4 4 11 5 14.2c.9 3 2.6 5.3 4.3 5.3 1 0 1.4-.6 2.7-.6s1.7.6 2.7.6c1.7 0 3.4-2.3 4.3-5.3 1-3.2.6-5.8-1.1-7-1.9-1.4-4.4-.8-5.9 1z"/><path d="M12 8.2c0-2.4 1.2-4.2 3.2-4.7"/>'),
    soccer: ic('<circle cx="12" cy="12" r="8.5"/><path d="M12 8.5l3.3 2.4-1.3 3.9h-4l-1.3-3.9z"/><path d="M12 3.5v5M18.6 7.2l-3.3 3.7M20.5 14.5l-4.8.3M15.5 20.5l-1.5-5.7M8.5 20.5l1.5-5.7M3.5 14.5l4.8.3M5.4 7.2l3.3 3.7"/>'),
    car: ic('<path d="M4 13l1.6-4.2c.3-.8 1-1.3 1.9-1.3h9c.9 0 1.6.5 1.9 1.3L20 13"/><rect x="3.5" y="13" width="17" height="5" rx="1.5"/><circle cx="8" cy="18.5" r="1.6"/><circle cx="16" cy="18.5" r="1.6"/>'),
    bulb: ic('<path d="M9.5 18h5"/><path d="M10.5 21h3"/><path d="M12 3.5c-3.4 0-5.8 2.6-5.8 5.9 0 2.2 1.2 3.7 2.3 4.9.6.7 1 1.4 1 2.2h5c0-.8.4-1.5 1-2.2 1.1-1.2 2.3-2.7 2.3-4.9 0-3.3-2.4-5.9-5.8-5.9z"/>'),
    heart: ic('<path d="M12 20.5S4 15.6 4 9.9C4 7.2 6.1 5.5 8.3 5.5c1.6 0 3 .9 3.7 2.2.7-1.3 2.1-2.2 3.7-2.2 2.2 0 4.3 1.7 4.3 4.4 0 5.7-8 10.6-8 10.6z"/>'),
    flag: ic('<path d="M6 21V4"/><path d="M6 5c4-2.2 7 2.2 12 0v9c-5 2.2-8-2.2-12 0"/>'),
    more: ic('<polyline points="8 6 13 12 8 18"/><polyline points="13 6 18 12 13 18"/>')
  };

  /* Tabs: recent + 8 groups (group index into EMOJI_DATA g) + expand */
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
    getConfig: function () { return Promise.resolve({ accent: '#0A84FF', lastCategory: 'recent' }); },
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
  var lastCat = 'recent';
  var cat = 'recent';
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
    left = Math.max(6, Math.min(left, 356 - pw - 6));
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
