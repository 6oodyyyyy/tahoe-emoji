# Apple Emoji on Windows 10 — Install Guide

This switches the Windows emoji font ("Segoe UI Emoji") to an Apple-style (iPhone-like) emoji font, system-wide:
WhatsApp Web, browsers, chat apps — anywhere Windows used to draw its own emoji.
**No reboot needed** — the change applies instantly.

## How it works

The script installs the Apple font under its own file name (`TahoeAppleEmoji.ttf`)
and repoints the registry entry for "Segoe UI Emoji" to it, then tells Windows
to reload fonts (`WM_FONTCHANGE`). The protected system file `seguiemj.ttf` is
never touched, so there is nothing for Windows Update or `sfc /scannow` to "repair".

## Install (one time)

1. Extract the files into a folder (e.g. `Desktop\apple-emoji`).
2. Open **PowerShell as administrator**: search PowerShell in the Start menu → right-click → **Run as administrator**.
3. Go to the folder:
   ```powershell
   cd "$env:USERPROFILE\Desktop\apple-emoji"
   ```
4. If you get a message that running scripts is disabled, run this once:
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   ```
5. Run the installer:
   ```powershell
   .\Install-AppleEmoji.ps1
   ```
6. The script downloads the font (~256MB — let it finish; BITS resumes if your connection drops) and activates it immediately.

## Reverting to the original font

Run `.\Restore-AppleEmoji.ps1` as administrator → the original Windows font is back instantly, no reboot.

## Notes

- New apps use the new emoji immediately; apps that are already open pick it up when you restart them.
- Apps with their own emoji sets (Discord, Slack) are unaffected — that is normal.
- At small UI sizes the emoji can look slightly rough — normal for this font format.
