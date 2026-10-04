# TahoeEmojiPicker

A macOS Tahoe-style emoji picker for Windows 10. Press **Win+.** anywhere,
pick an emoji, and it is inserted into the app you were using.

## Requirements

- Windows 10 (64-bit)
- Python 3.11+ — https://www.python.org/downloads/
  (tick **"Add python.exe to PATH"** during install)
- Microsoft Edge WebView2 Runtime (preinstalled on most Windows 10 PCs;
  if the picker shows a blank window, install it from
  https://developer.microsoft.com/microsoft-edge/webview2/)

## Install

1. Extract this folder anywhere (e.g. `Desktop\tahoe-emoji`).
2. Double-click **`install.bat`**.
3. The script installs the needed Python packages, copies the app to
   `%APPDATA%\TahoeEmojiPicker`, adds it to Startup, and starts it.

No admin rights needed. No reboot needed.

## Usage

| Action | How |
|---|---|
| Open / close the picker | **Win+.** |
| Search | Just start typing |
| Move in the grid | Arrow keys |
| Insert | Click, or Enter on the highlighted emoji |
| Skin tones | Press-and-hold (or right-click) an emoji, then pick a variant |
| Switch category | Click an icon in the bottom bar |
| Close | Esc, or click outside the panel |

The panel closes after each pick (like the real macOS picker).
Your most-used emoji appear under the clock tab.

## Settings

Edit `%APPDATA%\TahoeEmojiPicker\config.json`, then restart the picker
(right-click its Python icon is not available — end `pythonw.exe` in Task
Manager and run `install.bat` again, or reboot):

```json
{
  "hotkey": "windows+.",
  "accent": "#0A84FF",
  "lastCategory": "recent"
}
```

- `hotkey` — any format the `keyboard` package understands
  (e.g. `"ctrl+alt+e"`).
- `accent` — selection/highlight color.

## Uninstall

1. Delete the shortcut `TahoeEmojiPicker.lnk` from
   `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\`.
2. End `pythonw.exe` in Task Manager (or reboot).
3. Delete `%APPDATA%\TahoeEmojiPicker`.
4. Optionally: `python -m pip uninstall pywebview keyboard mouse`.

## Troubleshooting

- **Win+. still opens the Windows emoji panel:** the hotkey could not be
  intercepted. Change `hotkey` in `config.json` to something else
  (e.g. `"ctrl+alt+e"`) and restart.
- **Blank/white window:** install/update the WebView2 Runtime (link above).
- **Emoji not inserted in some app:** the picker inserts via copy+paste.
  It cannot paste into apps running as administrator unless the picker
  itself runs as administrator.
- **Black background instead of rounded panel:** update `pywebview`
  (`python -m pip install --upgrade pywebview`) and the WebView2 Runtime.
