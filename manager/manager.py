#!/usr/bin/env python3
"""Tahoe Emoji Settings - macOS-style installer & settings app for Windows.

This app is ONLY for installation and settings. It does not need to stay
running: the picker runs as its own background process and the emoji font
is installed at system level.

Bundled (PyInstaller) layout under sys._MEIPASS:
    ui/                          settings web UI
    picker/TahoeEmojiPicker.exe  frozen picker
    fontswap/*.ps1               font install / restore scripts
Dev (script) layout: manager.py sits in manager/, picker sources in ../picker/,
font scripts in ../font-swap/.
"""

import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import webbrowser

import keyboard
import webview

# ------------------------------------------------------------- paths ----
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FROZEN = getattr(sys, 'frozen', False)
BASE_DIR = sys._MEIPASS if FROZEN else SCRIPT_DIR
UI_DIR = os.path.join(BASE_DIR, 'ui')

APP_DATA_DIR = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')),
                            'TahoeEmojiPicker')
PICKER_EXE_NAME = 'TahoeEmojiPicker.exe'
INSTALLED_EXE = os.path.join(APP_DATA_DIR, PICKER_EXE_NAME)
INSTALLED_PY = os.path.join(APP_DATA_DIR, 'picker.py')
CONFIG_PATH = os.path.join(APP_DATA_DIR, 'config.json')
PID_FILE = os.path.join(APP_DATA_DIR, 'picker.pid')
STARTUP_DIR = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')),
                           r'Microsoft\Windows\Start Menu\Programs\Startup')
STARTUP_LNK = os.path.join(STARTUP_DIR, 'TahoeEmojiPicker.lnk')

APPLE_FONT_FILE = 'tahoeappleemoji.ttf'  # what Install-AppleEmoji.ps1 registers

WEBVIEW2_RUNTIME_GUID = '{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
WEBVIEW2_INSTALLER_URL = 'https://go.microsoft.com/fwlink/p/?LinkId=2124703'
WEBVIEW2_DOWNLOAD_PAGE = 'https://developer.microsoft.com/microsoft-edge/webview2/'

DEFAULT_CONFIG = {'hotkey': 'windows+.', 'accent': '#0A84FF',
                  'lastCategory': 'recent'}

window = None


def _webview2_installed():
    """True if the Microsoft WebView2 Runtime is present (registry or disk)."""
    try:
        import winreg
        subs = (
            r'SOFTWARE\Microsoft\EdgeUpdate\Clients\%s' % WEBVIEW2_RUNTIME_GUID,
            r'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\%s'
            % WEBVIEW2_RUNTIME_GUID,
        )
        for root in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
            for sub in subs:
                try:
                    with winreg.OpenKey(root, sub):
                        return True
                except OSError:
                    pass
    except ImportError:
        pass
    for base in (os.environ.get('ProgramFiles'),
                 os.environ.get('ProgramFiles(x86)')):
        if base and os.path.isdir(os.path.join(
                base, 'Microsoft', 'EdgeWebView', 'Application')):
            return True
    return False


def _ensure_webview2():
    """Make sure WebView2 exists before opening any window.

    Returns True when it's safe to continue. When WebView2 is missing,
    offers a one-click download+install from Microsoft and returns False
    (the app exits; the user re-runs it after installing).
    """
    if _webview2_installed():
        return True
    try:
        import ctypes
        MB_YESNO = 0x4
        MB_ICONWARNING = 0x30
        MB_ICONINFO = 0x40
        answer = ctypes.windll.user32.MessageBoxW(
            None,
            'Tahoe Settings needs the Microsoft WebView2 Runtime to show '
            'its window, and it is not installed on this PC.\n\n'
            'Download it now from Microsoft (~150 MB) and install it?',
            'Tahoe Emoji - WebView2 required',
            MB_YESNO | MB_ICONWARNING)
        if answer != 6:  # 6 == Yes
            return False
        tmp = os.path.join(os.environ.get('TEMP', os.path.expanduser('~')),
                           'WebView2Setup.exe')
        try:
            import urllib.request
            urllib.request.urlretrieve(WEBVIEW2_INSTALLER_URL, tmp)
        except Exception:
            webbrowser.open(WEBVIEW2_DOWNLOAD_PAGE)
            ctypes.windll.user32.MessageBoxW(
                None,
                'Could not download automatically. The Microsoft WebView2 '
                'download page has been opened in your browser - install it, '
                'then run Tahoe Settings again.',
                'Tahoe Emoji - WebView2 required', MB_ICONINFO)
            return False
        os.startfile(tmp)  # installer shows its own UI and elevates itself
        ctypes.windll.user32.MessageBoxW(
            None,
            'The WebView2 installer has been started.\n\n'
            'After it finishes, please run Tahoe Settings again.',
            'Tahoe Emoji - WebView2 required', MB_ICONINFO)
    except Exception:
        pass
    return False


def resource_path(*parts):
    """Find a bundled/dev resource: frozen bundle first, then dev tree."""
    p = os.path.join(BASE_DIR, *parts)
    if os.path.exists(p):
        return p
    # dev fallbacks
    dev_map = {
        ('picker', PICKER_EXE_NAME): None,  # no exe in dev; handled separately
        ('fontswap',): os.path.join(SCRIPT_DIR, '..', 'font-swap'),
        ('ui',): os.path.join(SCRIPT_DIR, 'ui'),
    }
    for key, base in dev_map.items():
        if parts[:len(key)] == key and base:
            q = os.path.join(base, *parts[len(key):])
            if os.path.exists(q):
                return q
    return p


def bundled_picker_exe():
    p = resource_path('picker', PICKER_EXE_NAME)
    return p if os.path.isfile(p) else None


def _run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def _process_exists(image):
    try:
        r = _run(['tasklist', '/FI', 'IMAGENAME eq %s' % image, '/NH'],
                 timeout=15)
        return image.lower() in r.stdout.lower()
    except Exception:
        return False


def _picker_running():
    if _process_exists(PICKER_EXE_NAME):
        return True
    try:
        with open(PID_FILE, encoding='utf-8') as f:
            pid = int(f.read().strip())
        os.kill(pid, 0)
        return True
    except Exception:
        return False


def _picker_installed():
    return os.path.isfile(INSTALLED_EXE) or os.path.isfile(INSTALLED_PY)


def _load_config():
    cfg = dict(DEFAULT_CONFIG)
    try:
        if os.path.isfile(CONFIG_PATH):
            with open(CONFIG_PATH, encoding='utf-8') as f:
                cfg.update(json.load(f))
    except Exception:
        pass
    return cfg


def _save_config(cfg):
    os.makedirs(APP_DATA_DIR, exist_ok=True)
    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(cfg, f, indent=2)


def _font_active():
    """'apple' | 'windows' | 'unknown' — reads the Fonts registry value."""
    try:
        import winreg
    except ImportError:
        return 'unknown'
    try:
        with winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r'SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts') as k:
            val, _ = winreg.QueryValueEx(k, 'Segoe UI Emoji (TrueType)')
            if val and str(val).lower() == APPLE_FONT_FILE:
                return 'apple'
            return 'windows'
    except FileNotFoundError:
        return 'unknown'
    except Exception:
        return 'unknown'


def _make_shortcut(target, args=''):
    os.makedirs(STARTUP_DIR, exist_ok=True)
    ps = (
        "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('%s');"
        "$s.TargetPath='%s';$s.Arguments='%s';"
        "$s.WorkingDirectory='%s';$s.Save()" %
        (STARTUP_LNK, target, args, APP_DATA_DIR))
    r = _run(['powershell', '-NoProfile', '-Command', ps], timeout=60)
    if r.returncode != 0:
        raise RuntimeError('could not create startup shortcut')


def _start_picker():
    if os.path.isfile(INSTALLED_EXE):
        proc = subprocess.Popen([INSTALLED_EXE], cwd=APP_DATA_DIR,
                                stdout=subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL)
    elif os.path.isfile(INSTALLED_PY):
        pyw = sys.executable.replace('python.exe', 'pythonw.exe')
        if not os.path.isfile(pyw):
            pyw = sys.executable
        proc = subprocess.Popen([pyw, INSTALLED_PY], cwd=APP_DATA_DIR,
                                stdout=subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL)
    else:
        raise RuntimeError('picker is not installed')
    try:
        with open(PID_FILE, 'w', encoding='utf-8') as f:
            f.write(str(proc.pid))
    except Exception:
        pass
    return proc.pid


def _stop_picker():
    _run(['taskkill', '/F', '/IM', PICKER_EXE_NAME], timeout=30)
    _run(['taskkill', '/F', '/FI', 'WINDOWTITLE eq TahoeEmojiPicker'],
         timeout=30)
    try:
        if os.path.isfile(PID_FILE):
            with open(PID_FILE, encoding='utf-8') as f:
                pid = int(f.read().strip())
            _run(['taskkill', '/F', '/PID', str(pid)], timeout=30)
    except Exception:
        pass
    time.sleep(1)


# ------------------------------------------------------------- font job ----
font_job = {'running': False, 'done': False, 'ok': False, 'message': ''}
font_job_lock = threading.Lock()


def _set_font_job(**kw):
    with font_job_lock:
        font_job.update(kw)


def _run_font_script(kind):
    """kind: 'install' or 'restore'. Runs elevated, tracks progress."""
    names = {'install': 'Install-AppleEmoji.ps1',
             'restore': 'Restore-AppleEmoji.ps1'}
    src = resource_path('fontswap', names[kind])
    if not os.path.isfile(src):
        _set_font_job(running=False, done=True, ok=False,
                      message='Script not found: %s' % names[kind])
        return
    # copy somewhere persistent: _MEIPASS vanishes if this app closes
    workdir = os.path.join(os.environ.get('TEMP', os.path.expanduser('~')),
                           'TahoeEmojiManager')
    os.makedirs(workdir, exist_ok=True)
    dst = os.path.join(workdir, names[kind])
    try:
        shutil.copyfile(src, dst)
    except Exception as e:
        _set_font_job(running=False, done=True, ok=False,
                      message='Could not stage script: %s' % e)
        return
    _set_font_job(running=True, done=False, ok=False,
                  message='Waiting for admin approval…')
    # -Wait lets us observe the elevated process; a UAC denial raises.
    ps = ("Start-Process powershell -ArgumentList "
          "'-ExecutionPolicy Bypass -NoProfile -File \"%s\"' -Verb RunAs -Wait"
          % dst)
    try:
        r = _run(['powershell', '-NoProfile', '-Command', ps], timeout=3600)
        if r.returncode == 0:
            msg = ('Done — Apple emoji is now active (no restart needed).'
                   if kind == 'install'
                   else 'Done — the default Windows emoji is restored (no restart needed).')
            _set_font_job(running=False, done=True, ok=True, message=msg)
        else:
            err = (r.stderr or r.stdout or '').strip().splitlines()
            err = err[-1] if err else 'unknown error'
            _set_font_job(running=False, done=True, ok=False,
                          message='Failed: %s' % err[:200])
    except Exception as e:
        _set_font_job(running=False, done=True, ok=False,
                      message='Failed: %s' % str(e)[:200])


# ----------------------------------------------------------------- API ----
class Api:
    # -- status ---------------------------------------------------
    def getStatus(self):
        cfg = _load_config()
        return {
            'picker': {
                'installed': _picker_installed(),
                'running': _picker_running(),
                'startWithWindows': os.path.isfile(STARTUP_LNK),
            },
            'font': {'active': _font_active()},
            'config': {'hotkey': cfg.get('hotkey', DEFAULT_CONFIG['hotkey']),
                       'accent': cfg.get('accent', DEFAULT_CONFIG['accent'])},
        }

    # -- picker ---------------------------------------------------
    def installPicker(self):
        try:
            os.makedirs(APP_DATA_DIR, exist_ok=True)
            exe = bundled_picker_exe()
            if exe:
                shutil.copyfile(exe, INSTALLED_EXE)
                target, args = INSTALLED_EXE, ''
            else:
                # dev mode: install from source tree
                src_py = os.path.join(SCRIPT_DIR, '..', 'picker', 'picker.py')
                src_ui = os.path.join(SCRIPT_DIR, '..', 'picker', 'ui')
                if not os.path.isfile(src_py):
                    return {'ok': False,
                            'error': 'picker bundle not found in this build'}
                shutil.copyfile(src_py, INSTALLED_PY)
                if os.path.isdir(src_ui):
                    dst_ui = os.path.join(APP_DATA_DIR, 'ui')
                    if os.path.isdir(dst_ui):
                        shutil.rmtree(dst_ui)
                    shutil.copytree(src_ui, dst_ui)
                pyw = sys.executable.replace('python.exe', 'pythonw.exe')
                if not os.path.isfile(pyw):
                    pyw = sys.executable
                target, args = pyw, '"%s"' % INSTALLED_PY
            if not os.path.isfile(CONFIG_PATH):
                _save_config(dict(DEFAULT_CONFIG))
            _make_shortcut(target, args)
            _start_picker()
            return {'ok': True}
        except Exception as e:
            return {'ok': False, 'error': str(e)[:300]}

    def uninstallPicker(self):
        try:
            _stop_picker()
            try:
                if os.path.isfile(STARTUP_LNK):
                    os.remove(STARTUP_LNK)
            except Exception:
                pass
            for name in (PICKER_EXE_NAME, 'picker.py'):
                try:
                    p = os.path.join(APP_DATA_DIR, name)
                    if os.path.isfile(p):
                        os.remove(p)
                except Exception:
                    pass
            try:
                ui = os.path.join(APP_DATA_DIR, 'ui')
                if os.path.isdir(ui):
                    shutil.rmtree(ui)
            except Exception:
                pass
            return {'ok': True}
        except Exception as e:
            return {'ok': False, 'error': str(e)[:300]}

    def setStartWithWindows(self, on):
        try:
            if on:
                if os.path.isfile(INSTALLED_EXE):
                    _make_shortcut(INSTALLED_EXE, '')
                elif os.path.isfile(INSTALLED_PY):
                    pyw = sys.executable.replace('python.exe', 'pythonw.exe')
                    if not os.path.isfile(pyw):
                        pyw = sys.executable
                    _make_shortcut(pyw, '"%s"' % INSTALLED_PY)
                else:
                    return {'ok': False, 'error': 'picker is not installed'}
            else:
                if os.path.isfile(STARTUP_LNK):
                    os.remove(STARTUP_LNK)
            return {'ok': True}
        except Exception as e:
            return {'ok': False, 'error': str(e)[:300]}

    def setHotkey(self, hotkey):
        hk = (hotkey or '').strip().lower()
        if not re.fullmatch(r'[a-z0-9_+\-.,;\'"/ ]+', hk):
            return {'ok': False, 'error': 'Invalid shortcut format.'}
        try:
            keyboard.parse_hotkey(hk)
        except Exception:
            return {'ok': False,
                    'error': 'Shortcut not recognized (e.g. windows+.).'}
        try:
            cfg = _load_config()
            cfg['hotkey'] = hk
            _save_config(cfg)
            if _picker_running():
                _stop_picker()
                time.sleep(1)
                _start_picker()
            return {'ok': True}
        except Exception as e:
            return {'ok': False, 'error': str(e)[:300]}

    def setAccent(self, accent):
        if not re.fullmatch(r'#[0-9a-fA-F]{6}', accent or ''):
            return {'ok': False, 'error': 'Invalid color.'}
        try:
            cfg = _load_config()
            cfg['accent'] = accent
            _save_config(cfg)
            # live-apply if the picker is up (best effort)
            try:
                if window:
                    window.evaluate_js(
                        "document.documentElement.style.setProperty('--accent','%s')"
                        % accent)
            except Exception:
                pass
            return {'ok': True}
        except Exception as e:
            return {'ok': False, 'error': str(e)[:300]}

    def showPickerNow(self):
        try:
            if not _picker_installed():
                return {'ok': False, 'error': 'Picker is not installed.'}
            if not _picker_running():
                _start_picker()
                time.sleep(3)
            cfg = _load_config()
            keyboard.press_and_release(cfg.get('hotkey', 'windows+.'))
            return {'ok': True}
        except Exception as e:
            return {'ok': False, 'error': str(e)[:300]}

    # -- font -----------------------------------------------------
    def installFont(self):
        with font_job_lock:
            if font_job['running']:
                return {'ok': True, 'started': True}
        t = threading.Thread(target=_run_font_script, args=('install',),
                             daemon=True)
        t.start()
        return {'ok': True, 'started': True}

    def restoreFont(self):
        with font_job_lock:
            if font_job['running']:
                return {'ok': True, 'started': True}
        t = threading.Thread(target=_run_font_script, args=('restore',),
                             daemon=True)
        t.start()
        return {'ok': True, 'started': True}

    def getFontJob(self):
        with font_job_lock:
            return dict(font_job)

    # -- window chrome --------------------------------------------
    def closeWindow(self):
        if window:
            window.destroy()

    def minimizeWindow(self):
        if window:
            window.minimize()

    def toggleZoom(self):
        if window:
            try:
                if getattr(window, '_zoomed', False):
                    window.restore()
                    window._zoomed = False
                else:
                    window.maximize()
                    window._zoomed = True
            except Exception:
                pass

    def nudge(self, dx, dy):
        # custom titlebar dragging for the frameless window
        try:
            if window and window.x is not None and window.y is not None:
                window.move(int(window.x + dx), int(window.y + dy))
        except Exception:
            pass

    def openUrl(self, url):
        try:
            webbrowser.open(url)
        except Exception:
            pass


# ----------------------------------------------------------------- main ----
def main():
    global window
    if not _ensure_webview2():
        sys.exit(0)
    index_path = os.path.join(UI_DIR, 'index.html')
    if not os.path.isfile(index_path):
        sys.stderr.write('UI not found: %s\n' % index_path)
        sys.exit(1)

    api = Api()
    window = webview.create_window(
        'Tahoe Emoji Settings',
        index_path,
        width=780,
        height=560,
        frameless=True,
        transparent=False,
        js_api=api,
        text_select=False,
    )
    webview.start(debug=False)


if __name__ == '__main__':
    main()
