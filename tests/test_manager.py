"""Smoke test for the Tahoe Settings app (frozen exe) on real Windows.

Launches TahoeSettings.exe, screenshots the macOS-style settings window,
then closes it. Screenshots land in tests/out/ for human inspection.
"""
import os
import subprocess
import sys
import time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEST_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(TEST_DIR, 'out')

SETTINGS_EXE = os.environ.get('SETTINGS_EXE')


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    if not SETTINGS_EXE or not os.path.isfile(SETTINGS_EXE):
        print('SETTINGS_EXE not set or missing — skipping', flush=True)
        return 0
    print('launching settings: %s' % SETTINGS_EXE, flush=True)
    proc = subprocess.Popen([SETTINGS_EXE],
                            cwd=os.path.dirname(SETTINGS_EXE))
    try:
        time.sleep(10)  # let the window appear
        if proc.poll() is not None:
            print('FAIL: settings app exited early (code %s)' % proc.poll(),
                  flush=True)
            return 1
        from PIL import ImageGrab
        path = os.path.join(OUT_DIR, 'settings-window.png')
        ImageGrab.grab().save(path)
        print('screenshot saved: %s' % path, flush=True)
        print('PASS: settings app stayed alive and rendered', flush=True)
        return 0
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=10)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass


if __name__ == '__main__':
    sys.exit(main())
