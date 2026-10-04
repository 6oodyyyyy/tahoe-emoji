@echo off
setlocal
echo ============================================
echo  TahoeEmojiPicker - Setup
echo ============================================
echo.

where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Python 3.11+ is required but was not found.
  echo Download it from https://www.python.org/downloads/
  echo IMPORTANT: tick "Add python.exe to PATH" during install.
  pause
  exit /b 1
)

echo [1/4] Installing Python packages (pywebview, keyboard, mouse)...
python -m pip install --upgrade pywebview keyboard mouse
if errorlevel 1 (
  echo [ERROR] Failed to install Python packages. Check your connection and re-run.
  pause
  exit /b 1
)

set INSTALL_DIR=%APPDATA%\TahoeEmojiPicker
echo [2/4] Copying files to %INSTALL_DIR% ...
mkdir "%INSTALL_DIR%" 2>nul
copy /y "%~dp0picker.py" "%INSTALL_DIR%\" >nul
xcopy /e /i /y "%~dp0ui" "%INSTALL_DIR%\ui\" >nul
if not exist "%INSTALL_DIR%\config.json" (
  echo {"hotkey": "windows+.", "accent": "#0A84FF", "lastCategory": "recent"} > "%INSTALL_DIR%\config.json"
)

echo [3/4] Adding to Startup...
for /f "delims=" %%P in ('where python') do set PY=%%P
set PYW=%PY:python.exe=pythonw.exe%
if not exist "%PYW%" set PYW=%PY%
set SHORTCUT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\TahoeEmojiPicker.lnk
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('%SHORTCUT%'); $s.TargetPath='%PYW%'; $s.Arguments='\"%INSTALL_DIR%\picker.py\"'; $s.WorkingDirectory='%INSTALL_DIR%'; $s.Save()"

echo [4/4] Starting the picker...
start "" "%PYW%" "%INSTALL_DIR%\picker.py"

echo.
echo ============================================
echo  Done! Press Win+. anywhere to open the picker.
echo  The picker starts automatically with Windows.
echo ============================================
pause
