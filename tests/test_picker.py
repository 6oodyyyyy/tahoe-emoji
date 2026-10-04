"""Smoke test for TahoeEmojiPicker on a real Windows machine (CI runner).

Phase 1 - logic checks (no GUI): config round-trip, recents round-trip,
clipboard round-trip, caret/geometry sanity.
Phase 2 - real launch: starts picker.py, screenshots the desktop, presses
the real hotkey (Win+.), screenshots again, presses Esc, screenshots,
then kills the app. Screenshots land in tests/out/ for human inspection.
"""
import os
import subprocess
import sys
import time
import traceback

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PICKER_DIR = os.path.join(REPO, 'picker')
TEST_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(TEST_DIR, 'out')
# PICKER_EXE: path to a frozen TahoeEmojiPicker.exe. When set, phase 1
# (module import) is skipped and phase 2 launches the exe instead.
PICKER_EXE = os.environ.get('PICKER_EXE')
sys.path.insert(0, PICKER_DIR)

results = []


def check(name, fn):
    try:
        fn()
        results.append(('PASS', name))
        print('[PASS] %s' % name, flush=True)
    except Exception as e:
        results.append(('FAIL', '%s: %s' % (name, e)))
        print('[FAIL] %s: %s' % (name, e), flush=True)
        traceback.print_exc()


def _assert(cond, msg='assertion failed'):
    if not cond:
        raise AssertionError(msg)


def _shot(name):
    from PIL import ImageGrab
    path = os.path.join(OUT_DIR, name + '.png')
    ImageGrab.grab().save(path)
    print('screenshot saved: %s' % path, flush=True)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    if PICKER_EXE:
        print('PICKER_EXE mode: skipping phase 1 (module import)', flush=True)
    else:
        import picker  # noqa: safe, main() is guarded

        # ---------------- phase 1: logic ----------------
        def t_config():
            cfg = picker.load_config()
            _assert(cfg['hotkey'], 'empty hotkey')
            picker.state['config']['lastCategory'] = 3
            picker.save_config()
            _assert(picker.load_config()['lastCategory'] == 3, 'config not persisted')
            picker.state['config']['lastCategory'] = 'recent'
            picker.save_config()
        check('config load/save round-trip', t_config)

        def t_recents():
            picker.save_recents([])
            picker.add_recent('\U0001F600')
            picker.add_recent('\U0001F602')
            picker.add_recent('\U0001F600')  # dup moves to front
            r = picker.load_recents()
            _assert(r[0] == '\U0001F600' and r[1] == '\U0001F602', 'recents order wrong: %r' % r)
            picker.save_recents([])
        check('recents round-trip', t_recents)

        def t_clipboard():
            marker = 'tahoe-test-\U0001F600-123'
            _assert(picker._set_clipboard_text(marker), 'set clipboard failed')
            _assert(picker._clipboard_text() == marker, 'clipboard round-trip mismatch')
        check('clipboard round-trip', t_clipboard)

        def t_geometry():
            x, y = picker._pick_position()
            l, t, r, b = picker._work_area()
            _assert(l <= x <= r - picker.WIN_W, 'x out of work area: %s' % x)
            _assert(t <= y <= b - picker.WIN_H, 'y out of work area: %s' % y)
            _assert(picker._caret_screen_pos() is None or True, 'caret fn crashed')
        check('geometry / caret sanity', t_geometry)

    # ---------------- phase 2: real launch ----------------
    log_path = os.path.join(OUT_DIR, 'app.log')
    log = open(log_path, 'w', encoding='utf-8')
    if PICKER_EXE:
        launch_cmd = [PICKER_EXE]
        launch_cwd = os.path.dirname(PICKER_EXE)
    else:
        launch_cmd = [sys.executable, os.path.join(PICKER_DIR, 'picker.py')]
        launch_cwd = PICKER_DIR
    proc = subprocess.Popen(
        launch_cmd, cwd=launch_cwd, stdout=log, stderr=subprocess.STDOUT)
    print('picker launched, pid=%s' % proc.pid, flush=True)
    try:
        time.sleep(5)  # early diagnostic: is the window hidden from the start?
        _shot('00-early-startup')
        time.sleep(15)  # WebView2 cold start
        check('app alive after launch', lambda: _assert(
            proc.poll() is None, 'process exited, see app.log'))

        _shot('01-launched-hidden')

        import keyboard
        keyboard.press_and_release('windows+.')
        time.sleep(4)
        _shot('02-after-hotkey')

        keyboard.press_and_release('esc')
        time.sleep(2)
        _shot('03-after-esc')
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=10)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass
        log.close()

    failed = [r for r in results if r[0] == 'FAIL']
    print('---- %d passed, %d failed ----' % (
        len(results) - len(failed), len(failed)), flush=True)
    if failed:
        sys.exit(1)


if __name__ == '__main__':
    main()
