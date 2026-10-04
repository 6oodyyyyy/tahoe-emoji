/* Tahoe Emoji Settings — UI logic (pywebview bridge with mock fallback) */
(function () {
  'use strict';

  var MOCK = {
    getStatus: function () {
      return Promise.resolve({
        picker: { installed: false, running: false, startWithWindows: false },
        font: { active: 'windows' },
        config: { hotkey: 'windows+.', accent: '#0A84FF' }
      });
    },
    installPicker: function () { console.log('[mock] installPicker'); return Promise.resolve({ ok: true }); },
    uninstallPicker: function () { console.log('[mock] uninstallPicker'); return Promise.resolve({ ok: true }); },
    setStartWithWindows: function (on) { console.log('[mock] setStartWithWindows', on); return Promise.resolve({ ok: true }); },
    setHotkey: function (hk) { console.log('[mock] setHotkey', hk); return Promise.resolve({ ok: true }); },
    setAccent: function (a) { console.log('[mock] setAccent', a); return Promise.resolve({ ok: true }); },
    showPickerNow: function () { console.log('[mock] showPickerNow'); return Promise.resolve({ ok: true }); },
    installFont: function () { console.log('[mock] installFont'); return Promise.resolve({ ok: true, started: true }); },
    restoreFont: function () { console.log('[mock] restoreFont'); return Promise.resolve({ ok: true, started: true }); },
    getFontJob: function () { return Promise.resolve({ running: false }); },
    closeWindow: function () { console.log('[mock] close'); return Promise.resolve(); },
    minimizeWindow: function () { console.log('[mock] minimize'); return Promise.resolve(); },
    toggleZoom: function () { console.log('[mock] zoom'); return Promise.resolve(); },
    nudge: function (dx, dy) { console.log('[mock] nudge', dx, dy); return Promise.resolve(); },
    openUrl: function (u) { console.log('[mock] open', u); return Promise.resolve(); }
  };

  var api = MOCK;
  function bindApi() {
    if (window.pywebview && window.pywebview.api) { api = window.pywebview.api; return true; }
    return false;
  }

  var ACCENTS = [
    ['#0A84FF', 'Blue'], ['#A259FF', 'Purple'], ['#FF375F', 'Pink'],
    ['#FF453A', 'Red'], ['#FF9F0A', 'Orange'], ['#FFD60A', 'Yellow'],
    ['#30D158', 'Green'], ['#8E8E93', 'Graphite']
  ];

  var $ = function (id) { return document.getElementById(id); };
  var state = null;

  function hint(el, msg, isErr) {
    el.textContent = msg || '';
    el.classList.toggle('err', !!isErr);
  }

  /* ---------- navigation ---------- */
  document.querySelectorAll('.nav-item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.nav-item').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
      $('page-' + btn.dataset.page).classList.add('active');
    });
  });

  /* ---------- traffic lights ---------- */
  $('btnClose').addEventListener('click', function () { api.closeWindow(); });
  $('btnMin').addEventListener('click', function () { api.minimizeWindow(); });
  $('btnZoom').addEventListener('click', function () { api.toggleZoom(); });

  /* ---------- swatches ---------- */
  function renderSwatches(current) {
    var box = $('swatches');
    box.innerHTML = '';
    ACCENTS.forEach(function (pair) {
      var b = document.createElement('button');
      b.className = 'sw' + (pair[0].toLowerCase() === String(current).toLowerCase() ? ' sel' : '');
      b.style.background = pair[0];
      b.title = pair[1];
      b.addEventListener('click', function () {
        api.setAccent(pair[0]).then(function (r) {
          if (r && r.ok) { renderSwatches(pair[0]); hint($('pickerHint'), 'Accent updated.'); }
          else hint($('pickerHint'), 'Could not save accent.', true);
        });
      });
      box.appendChild(b);
    });
  }

  /* ---------- status ---------- */
  function refresh() {
    return api.getStatus().then(function (s) {
      state = s;
      // picker card
      var p = s.picker;
      $('pickerStatus').textContent = p.installed
        ? (p.running ? 'Installed and running' : 'Installed (not running)')
        : 'Not installed';
      $('btnPickerToggle').textContent = p.installed ? 'Uninstall' : 'Install';
      $('tglStartup').checked = !!p.startWithWindows;
      $('tglStartup').disabled = !p.installed;
      // config
      $('inpHotkey').value = s.config.hotkey || 'windows+.';
      renderSwatches(s.config.accent || '#0A84FF');
      // font card
      var f = s.font.active;
      $('fontStatus').textContent =
        f === 'apple' ? 'Apple Emoji (active)' :
        f === 'windows' ? 'Windows default (Segoe UI Emoji)' :
        'Unknown — checking…';
      $('btnFontRestore').disabled = (f !== 'apple');
      return s;
    });
  }

  /* ---------- actions ---------- */
  $('btnPickerToggle').addEventListener('click', function () {
    var btn = $('btnPickerToggle');
    btn.disabled = true;
    hint($('pickerHint'), state.picker.installed ? 'Uninstalling…' : 'Installing…');
    var done = function (r) {
      btn.disabled = false;
      if (r && r.ok) { hint($('pickerHint'), ''); refresh(); }
      else { hint($('pickerHint'), (r && r.error) || 'Operation failed.', true); }
    };
    if (state.picker.installed) api.uninstallPicker().then(done);
    else api.installPicker().then(done);
  });

  $('tglStartup').addEventListener('change', function (ev) {
    api.setStartWithWindows(ev.target.checked).then(function (r) {
      hint($('pickerHint'), r && r.ok ? '' : 'Could not update startup setting.', !(r && r.ok));
      refresh();
    });
  });

  $('inpHotkey').addEventListener('change', function (ev) {
    var v = ev.target.value.trim().toLowerCase();
    if (!v) { ev.target.value = state.config.hotkey; return; }
    api.setHotkey(v).then(function (r) {
      if (r && r.ok) { hint($('pickerHint'), 'Shortcut updated — picker restarted.'); refresh(); }
      else { hint($('pickerHint'), (r && r.error) || 'Invalid shortcut.', true); ev.target.value = state.config.hotkey; }
    });
  });

  $('btnShowPicker').addEventListener('click', function () {
    api.showPickerNow().then(function (r) {
      hint($('pickerHint'), r && r.ok ? '' : 'Picker is not installed.', !(r && r.ok));
    });
  });

  $('btnFontInstall').addEventListener('click', function () {
    hint($('fontHint'), 'Starting installer — approve the admin prompt…');
    $('btnFontInstall').disabled = true;
    api.installFont().then(function (r) {
      if (!(r && r.started)) {
        $('btnFontInstall').disabled = false;
        hint($('fontHint'), (r && r.error) || 'Could not start installer.', true);
        return;
      }
      pollFontJob();
    });
  });

  $('btnFontRestore').addEventListener('click', function () {
    hint($('fontHint'), 'Starting restore — approve the admin prompt…');
    $('btnFontRestore').disabled = true;
    api.restoreFont().then(function (r) {
      if (!(r && r.started)) {
        $('btnFontRestore').disabled = false;
        hint($('fontHint'), (r && r.error) || 'Could not start restore.', true);
        return;
      }
      pollFontJob();
    });
  });

  function pollFontJob() {
    var iv = setInterval(function () {
      api.getFontJob().then(function (j) {
        if (!j || !j.running) {
          clearInterval(iv);
          $('btnFontInstall').disabled = false;
          if (j && j.done) {
            hint($('fontHint'), j.message || (j.ok ? 'Done.' : 'Failed.'), !j.ok);
          } else {
            hint($('fontHint'), '');
          }
          refresh();
        } else if (j.message) {
          hint($('fontHint'), j.message);
        }
      });
    }, 1500);
  }

  $('btnRepo').addEventListener('click', function () {
    api.openUrl('https://github.com/darbashranek-ui/tahoe-emoji-win-test');
  });

  /* ---------- frameless titlebar drag ---------- */
  (function () {
    var bar = document.getElementById('titlebar');
    var dragging = false, lx = 0, ly = 0;
    bar.addEventListener('mousedown', function (e) {
      if (e.button !== 0 || e.target.closest('.traffic')) return;
      dragging = true; lx = e.screenX; ly = e.screenY;
    });
    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      api.nudge(e.screenX - lx, e.screenY - ly);
      lx = e.screenX; ly = e.screenY;
    });
    document.addEventListener('mouseup', function () { dragging = false; });
    bar.addEventListener('dblclick', function (e) {
      if (!e.target.closest('.traffic')) api.toggleZoom();
    });
  })();

  /* ---------- init (after bridge ready) ---------- */
  var inited = false;
  function init() {
    if (inited) return;
    inited = true;
    refresh();
  }
  function boot() { bindApi(); init(); }
  if (window.addEventListener) window.addEventListener('pywebviewready', boot);
  if (bindApi()) init();
  else setTimeout(boot, 600);
})();
