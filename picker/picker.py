#!/usr/bin/env python3
"""TahoeEmojiPicker - macOS Tahoe-style emoji picker for Windows 10.

Runs quietly in the background. Press Win+. anywhere to open the picker near
the text caret; pick an emoji to insert it into the previously focused app.

Requirements: Python 3.11+, pip packages: pywebview, keyboard, mouse.
"""

import ctypes
import json
import os
import subprocess
import sys
import threading
import time
from ctypes import wintypes

import keyboard
import mouse
import webview

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Frozen (PyInstaller) builds unpack data files to sys._MEIPASS.
if getattr(sys, 'frozen', False):
    BASE_DIR = sys._MEIPASS
else:
    BASE_DIR = SCRIPT_DIR
UI_DIR = os.path.join(BASE_DIR, 'ui')
APP_DATA_DIR = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')),
                            'TahoeEmojiPicker')
# Per-user config always lives in APPDATA (writable), never next to the exe.
CONFIG_PATH = os.path.join(APP_DATA_DIR, 'config.json')
RECENTS_PATH = os.path.join(APP_DATA_DIR, 'recents.json')

WIN_W, WIN_H = 364, 700          # outer transparent window size (CSS px)
NUB_TIP_X, NUB_TIP_Y = 182, 12   # nub tip position inside the window
MAX_RECENTS = 32

DEFAULT_CONFIG = {
    'hotkey': 'windows+.',
    'accent': '#0A84FF',
    'lastCategory': 0,
}

state = {
    'visible': False,
    'win_x': 0,
    'win_y': 0,
    'prev_hwnd': None,
    'config': dict(DEFAULT_CONFIG),
}

window = None  # pywebview window, created in main()


# ---------------------------------------------------------------- config ----
def load_config():
    cfg = dict(DEFAULT_CONFIG)
    try:
        if os.path.isfile(CONFIG_PATH):
            with open(CONFIG_PATH, encoding='utf-8') as f:
                cfg.update(json.load(f))
    except Exception:
        pass
    state['config'] = cfg
    return cfg


def save_config():
    try:
        os.makedirs(APP_DATA_DIR, exist_ok=True)
        with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
            json.dump(state['config'], f, indent=2)
    except Exception:
        pass


# --------------------------------------------------------------- recents ----
def load_recents():
    try:
        if os.path.isfile(RECENTS_PATH):
            with open(RECENTS_PATH, encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list):
                    return [str(x) for x in data[:MAX_RECENTS]]
    except Exception:
        pass
    return []


def save_recents(items):
    try:
        os.makedirs(APP_DATA_DIR, exist_ok=True)
        with open(RECENTS_PATH, 'w', encoding='utf-8') as f:
            json.dump(items[:MAX_RECENTS], f, ensure_ascii=False)
    except Exception:
        pass


def add_recent(emoji):
    items = [emoji] + [x for x in load_recents() if x != emoji]
    save_recents(items[:MAX_RECENTS])


# -------------------------------------------------------------- clipboard ----
# NOTE (win32): ctypes assumes a 32-bit int return for every foreign call by
# default. On 64-bit Windows that truncates HGLOBAL/HANDLE values, so
# GlobalLock can hand back a bad (or NULL) pointer. The signatures below make
# every clipboard call 64-bit safe.
if sys.platform == 'win32':
    _user32 = ctypes.windll.user32
    _kernel32 = ctypes.windll.kernel32
    _kernel32.GlobalAlloc.argtypes = [wintypes.UINT, ctypes.c_size_t]
    _kernel32.GlobalAlloc.restype = wintypes.HGLOBAL
    _kernel32.GlobalLock.argtypes = [wintypes.HGLOBAL]
    _kernel32.GlobalLock.restype = ctypes.c_void_p
    _kernel32.GlobalUnlock.argtypes = [wintypes.HGLOBAL]
    _kernel32.GlobalUnlock.restype = wintypes.BOOL
    _kernel32.GlobalFree.argtypes = [wintypes.HGLOBAL]
    _kernel32.GlobalFree.restype = wintypes.HGLOBAL
    _user32.OpenClipboard.argtypes = [wintypes.HWND]
    _user32.OpenClipboard.restype = wintypes.BOOL
    _user32.CloseClipboard.argtypes = []
    _user32.CloseClipboard.restype = wintypes.BOOL
    _user32.EmptyClipboard.argtypes = []
    _user32.EmptyClipboard.restype = wintypes.BOOL
    _user32.GetClipboardData.argtypes = [wintypes.UINT]
    _user32.GetClipboardData.restype = wintypes.HANDLE
    _user32.SetClipboardData.argtypes = [wintypes.UINT, wintypes.HANDLE]
    _user32.SetClipboardData.restype = wintypes.HANDLE
    # caret / geometry / focus helpers (same 64-bit truncation hazard)
    _void_p = ctypes.c_void_p
    _user32.GetForegroundWindow.argtypes = []
    _user32.GetForegroundWindow.restype = wintypes.HWND
    _user32.GetWindowThreadProcessId.argtypes = [wintypes.HWND, _void_p]
    _user32.GetWindowThreadProcessId.restype = wintypes.DWORD
    _user32.GetGUIThreadInfo.argtypes = [wintypes.DWORD, _void_p]
    _user32.GetGUIThreadInfo.restype = wintypes.BOOL
    _user32.ClientToScreen.argtypes = [wintypes.HWND, _void_p]
    _user32.ClientToScreen.restype = wintypes.BOOL
    _user32.SystemParametersInfoW.argtypes = [
        wintypes.UINT, wintypes.UINT, _void_p, wintypes.UINT]
    _user32.SystemParametersInfoW.restype = wintypes.BOOL
    _user32.FindWindowW.argtypes = [ctypes.c_wchar_p, ctypes.c_wchar_p]
    _user32.FindWindowW.restype = wintypes.HWND
    _long_ptr = ctypes.c_longlong if ctypes.sizeof(_void_p) == 8 else ctypes.c_long
    _user32.GetWindowLongW.argtypes = [wintypes.HWND, ctypes.c_int]
    _user32.GetWindowLongW.restype = _long_ptr
    _user32.SetWindowLongW.argtypes = [wintypes.HWND, ctypes.c_int, _long_ptr]
    _user32.SetWindowLongW.restype = _long_ptr
    _user32.SetForegroundWindow.argtypes = [wintypes.HWND]
    _user32.SetForegroundWindow.restype = wintypes.BOOL
else:
    _user32 = _kernel32 = None


def _clipboard_text():
    CF_UNICODETEXT = 13
    user32, kernel32 = _user32, _kernel32
    if not user32.OpenClipboard(None):
        return None
    try:
        h = user32.GetClipboardData(CF_UNICODETEXT)
        if not h:
            return None
        p = kernel32.GlobalLock(h)
        if not p:
            return None
        try:
            return ctypes.wstring_at(p)
        finally:
            kernel32.GlobalUnlock(h)
    finally:
        user32.CloseClipboard()


def _set_clipboard_text(text):
    CF_UNICODETEXT = 13
    GMEM_MOVEABLE = 0x0002
    user32, kernel32 = _user32, _kernel32
    if not user32.OpenClipboard(None):
        return False
    try:
        user32.EmptyClipboard()
        data = text.encode('utf-16-le') + b'\x00\x00'
        h = kernel32.GlobalAlloc(GMEM_MOVEABLE, len(data))
        if not h:
            return False
        p = kernel32.GlobalLock(h)
        if not p:
            kernel32.GlobalFree(h)
            return False
        ctypes.memmove(p, data, len(data))
        kernel32.GlobalUnlock(h)
        if not user32.SetClipboardData(CF_UNICODETEXT, h):
            kernel32.GlobalFree(h)
            return False
        return True  # system owns the handle now
    finally:
        user32.CloseClipboard()


def _clear_clipboard():
    user32 = _user32
    if user32.OpenClipboard(None):
        try:
            user32.EmptyClipboard()
        finally:
            user32.CloseClipboard()


# ------------------------------------------------------- caret / geometry ----
class _GUITHREADINFO(ctypes.Structure):
    _fields_ = [('cbSize', wintypes.DWORD),
                ('flags', wintypes.DWORD),
                ('hwndActive', wintypes.HWND),
                ('hwndFocus', wintypes.HWND),
                ('hwndCapture', wintypes.HWND),
                ('hwndMenuOwner', wintypes.HWND),
                ('hwndMoveSize', wintypes.HWND),
                ('hwndCaret', wintypes.HWND),
                ('rcCaret', wintypes.RECT)]


def _caret_screen_pos():
    """(x, y) just below the text caret of the foreground window, or None."""
    try:
        user32 = _user32
        fg = user32.GetForegroundWindow()
        if not fg:
            return None
        tid = user32.GetWindowThreadProcessId(fg, None)
        info = _GUITHREADINFO()
        info.cbSize = ctypes.sizeof(_GUITHREADINFO)
        if not user32.GetGUIThreadInfo(tid, ctypes.byref(info)):
            return None
        r = info.rcCaret
        if r.right <= r.left or r.bottom <= r.top:
            return None
        pt = wintypes.POINT(r.left, r.bottom)
        if not user32.ClientToScreen(info.hwndCaret or fg, ctypes.byref(pt)):
            return None
        return (pt.x, pt.y)
    except Exception:
        return None


def _dpi_scale():
    """System DPI scale factor (1.0 at 96 DPI).

    The pywebview window size is in physical pixels while the WebView2 CSS
    viewport is in DPI-scaled pixels; without this the UI gets clipped on
    displays above 100% scaling (the reported cut-off bottom bar).
    """
    try:
        shcore = ctypes.windll.shcore
        shcore.GetDpiForSystem.argtypes = []
        shcore.GetDpiForSystem.restype = wintypes.UINT
        return max(1.0, shcore.GetDpiForSystem() / 96.0)
    except Exception:
        return 1.0


def _win_size():
    s = state.get('dpi_scale', 1.0)
    return (int(WIN_W * s), int(WIN_H * s))


def _work_area():
    rect = wintypes.RECT()
    _user32.SystemParametersInfoW(0x30, 0, ctypes.byref(rect), 0)
    return (rect.left, rect.top, rect.right, rect.bottom)


def _pick_position():
    pos = _caret_screen_pos()
    if pos is None:
        try:
            pos = mouse.get_position()
        except Exception:
            pos = (500, 300)
    cx, cy = pos
    win_w, win_h = _win_size()
    x = cx - NUB_TIP_X * state.get('dpi_scale', 1.0)
    y = cy - NUB_TIP_Y - 2
    wa_l, wa_t, wa_r, wa_b = _work_area()
    x = max(wa_l, min(x, wa_r - win_w))
    y = max(wa_t, min(y, wa_b - win_h))
    return (int(x), int(y))


# ------------------------------------------------------------- show / hide ----
def _hide_from_taskbar():
    """Best-effort: keep the picker out of the taskbar (tool window)."""
    try:
        user32 = _user32
        hwnd = user32.FindWindowW(None, 'TahoeEmojiPicker')
        if not hwnd:
            return
        GWL_EXSTYLE = -20
        WS_EX_TOOLWINDOW = 0x00000080
        WS_EX_APPWINDOW = 0x00040000
        style = user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
        user32.SetWindowLongW(hwnd, GWL_EXSTYLE,
                              (style | WS_EX_TOOLWINDOW) & ~WS_EX_APPWINDOW)
    except Exception:
        pass


def show_picker():
    if state['visible']:
        return
    user32 = _user32
    state['prev_hwnd'] = user32.GetForegroundWindow()
    x, y = _pick_position()
    state['win_x'], state['win_y'] = x, y
    window.move(x, y)
    window.show()
    state['visible'] = True
    _hide_from_taskbar()
    try:
        window.evaluate_js('onPickerShow()')
    except Exception:
        pass


def hide_picker():
    if not state['visible']:
        return
    state['visible'] = False
    try:
        window.hide()
    except Exception:
        pass
    prev = state.get('prev_hwnd')
    if prev:
        try:
            _user32.SetForegroundWindow(prev)
        except Exception:
            pass


def toggle_picker():
    if state['visible']:
        hide_picker()
    else:
        show_picker()


def _on_outside_click(*_args):
    if not state['visible']:
        return
    try:
        x, y = mouse.get_position()
    except Exception:
        return
    wx, wy = state['win_x'], state['win_y']
    win_w, win_h = _win_size()
    if not (wx <= x < wx + win_w and wy <= y < wy + win_h):
        hide_picker()


# ----------------------------------------------------------------- insert ----
def _insert_sequence(emoji):
    add_recent(emoji)
    hide_picker()
    time.sleep(0.08)  # let focus settle back in the target app
    prev = _clipboard_text()
    if _set_clipboard_text(emoji):
        time.sleep(0.05)
        try:
            keyboard.send('ctrl+v')
        except Exception:
            pass
        time.sleep(0.45)
        try:
            if prev:
                _set_clipboard_text(prev)
            else:
                _clear_clipboard()
        except Exception:
            pass


# ------------------------------------------------------------------ bridge ----
class Api:
    def getRecents(self):
        return load_recents()

    def getConfig(self):
        cfg = state['config']
        return {'accent': cfg.get('accent', '#0A84FF'),
                'lastCategory': cfg.get('lastCategory', 'recent')}

    def setLastCategory(self, cat):
        state['config']['lastCategory'] = cat
        save_config()
        return True

    def addRecent(self, emoji):
        add_recent(str(emoji))
        return True

    def insert(self, emoji):
        threading.Thread(target=_insert_sequence, args=(str(emoji),),
                         daemon=True).start()
        return True

    def hide(self):
        hide_picker()
        return True

    def openFullViewer(self):
        try:
            subprocess.Popen(['charmap.exe'])
        except Exception:
            pass
        return True


# -------------------------------------------------------------------- main ----
def main():
    global window
    os.makedirs(APP_DATA_DIR, exist_ok=True)
    cfg = load_config()

    index_path = os.path.join(UI_DIR, 'index.html')
    if not os.path.isfile(index_path):
        sys.stderr.write('UI not found: %s\n' % index_path)
        sys.exit(1)

    # NOTE: pywebview's Edge backend forcibly Shows a transparent window on
    # navigation start, ignoring hidden=True (startup flash). Creating it far
    # off-screen keeps that flash invisible; show_picker() moves it to the
    # caret before the first real show().
    # Window size is scaled by the system DPI so the CSS viewport (in
    # DPI-scaled pixels) always matches the physical window — otherwise the
    # UI is clipped on >100% display scaling.
    state['dpi_scale'] = _dpi_scale() if sys.platform == 'win32' else 1.0
    win_w, win_h = _win_size()
    window = webview.create_window(
        'TahoeEmojiPicker',
        index_path,
        width=win_w,
        height=win_h,
        x=-32000,
        y=-32000,
        frameless=True,
        transparent=True,
        on_top=True,
        hidden=True,
        js_api=Api(),
        text_select=False,
    )

    def _hide_on_loaded():
        # Belt-and-suspenders: make sure we start hidden even if the backend
        # shows the window once despite hidden=True.
        if not state['visible']:
            try:
                window.hide()
            except Exception:
                pass

    try:
        window.events.loaded += _hide_on_loaded
    except Exception:
        pass

    try:
        keyboard.add_hotkey(cfg.get('hotkey', 'windows+.'), toggle_picker,
                            suppress=True)
    except Exception as e:
        sys.stderr.write('Could not register hotkey: %s\n' % e)
        sys.exit(1)

    try:
        mouse.on_button(_on_outside_click, args=(),
                        buttons=('left', 'right', 'middle'), types=('down',))
    except Exception:
        pass

    webview.start(debug=False)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        try:
            import traceback
            os.makedirs(APP_DATA_DIR, exist_ok=True)
            with open(os.path.join(APP_DATA_DIR, 'error.log'), 'a',
                      encoding='utf-8') as f:
                f.write(time.strftime('%Y-%m-%d %H:%M:%S') + '\n')
                f.write(traceback.format_exc() + '\n')
        except Exception:
            pass
        sys.exit(1)
