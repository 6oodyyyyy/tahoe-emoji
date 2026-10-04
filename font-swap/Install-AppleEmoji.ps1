#Requires -Version 5.1
<#
.SYNOPSIS
  Switches the Windows system emoji font ("Segoe UI Emoji") to an Apple-style
  emoji font, system-wide - with NO reboot.

  How it works (no reboot needed):
    - The Apple font is installed under a NEW file name (TahoeAppleEmoji.ttf),
      so the protected seguiemj.ttf is never touched or locked.
    - The registry entry "Segoe UI Emoji (TrueType)" is repointed to the new
      file, then AddFontResourceW + WM_FONTCHANGE notifies all apps instantly.
  Safe: the previous registry value is backed up to a JSON file and the
  Restore-AppleEmoji.ps1 script undoes everything.

  Must run ELEVATED (Run as administrator).
#>
[CmdletBinding()]
param(
  [switch]$Force,          # re-download even if the file exists
  [switch]$SkipDownload    # use AppleWin-fixed.ttf already placed next to the script
)

$ErrorActionPreference = 'Stop'

$FontUrl      = 'https://github.com/6oodyyyyy/tahoe-emoji/releases/download/font-gdef-fix/AppleWin-fixed.ttf'
$FontSha256   = 'B9F22B20940CC64533DEFEE96B1E7336C95D4DF300CD251EDAC0EFEC80C81421'
$NewFontName  = 'TahoeAppleEmoji.ttf'
$NewFontPath  = "$env:SystemRoot\Fonts\$NewFontName"
$FontsRegPath = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts'
$ValueName    = 'Segoe UI Emoji (TrueType)'
$ScriptDir    = $PSScriptRoot
$FontFile     = Join-Path $ScriptDir 'AppleWin-fixed.ttf'
$BackupDir    = "$env:LOCALAPPDATA\TahoeEmoji"
$BackupFile   = Join-Path $BackupDir 'font-backup.json'

function Say($msg, $color = 'White') { Write-Host $msg -ForegroundColor $color }
function Fail($msg) { Write-Host "Error: $msg" -ForegroundColor Red; throw $msg }
function Get-Sha256($path) { return (Get-FileHash -Path $path -Algorithm SHA256).Hash }

# ---------- 1) Must run elevated ----------
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Fail 'Run this script as administrator: right-click PowerShell -> Run as administrator'
}

# ---------- 2) Windows 10 new enough (1607+) ----------
$build = [int](Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion').CurrentBuild
if ($build -lt 14393) { Fail "Windows 10 build $build is older than required (1607 / build 14393 minimum)" }

# ---------- 3) Free disk space (~1GB) ----------
$driveName = (Get-Item $env:SystemRoot).PSDrive.Name
$freeGB = (Get-PSDrive $driveName).Free / 1GB
if ($freeGB -lt 1) { Fail "Not enough free space (need ~1GB on drive $driveName)" }

# ---------- 4) No boot-time swap pending from the old method ----------
$regPath = 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager'
$pending = (Get-ItemProperty $regPath -Name PendingFileRenameOperations -ErrorAction SilentlyContinue).PendingFileRenameOperations
if ($pending -match 'seguiemj') {
  Fail 'A boot-time font swap is still pending. Reboot once (or run the matching Restore script), then re-run this script.'
}

# ---------- 5) Download the font (BITS resumes on flaky connections; fallback with retries) ----------
if (-not $SkipDownload) {
  $needDownload = $true
  if (Test-Path $FontFile) {
    if ((Get-Sha256 $FontFile) -eq $FontSha256) {
      Say 'Font file already present and verified, skipping download.' 'Green'
      $needDownload = $false
    } elseif ($Force) {
      Say 'Existing file failed verification, deleting and re-downloading.' 'Yellow'
      Remove-Item $FontFile -Force
    } else {
      Fail 'The existing font file failed verification. Delete it manually or re-run with -Force.'
    }
  }
  if ($needDownload) {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $downloaded = $false
    try {
      Import-Module BitsTransfer -ErrorAction Stop
      Get-BitsTransfer | Where-Object { $_.DisplayName -eq 'AppleEmojiFont' } | Remove-BitsTransfer -ErrorAction SilentlyContinue
      Say 'Downloading the font (~256MB) via BITS (resumes if the connection drops)...' 'Cyan'
      Start-BitsTransfer -Source $FontUrl -Destination $FontFile -DisplayName 'AppleEmojiFont' -Priority Foreground -ErrorAction Stop
      $downloaded = $true
    } catch {
      Say "BITS unavailable, falling back to plain download... ($($_.Exception.Message))" 'Yellow'
    }
    if (-not $downloaded) {
      $ok = $false
      for ($attempt = 1; $attempt -le 3 -and -not $ok; $attempt++) {
        try {
          Say "Download attempt $attempt of 3 ... (may take a while on a slow connection)" 'Cyan'
          $wc = New-Object Net.WebClient
          try { $wc.DownloadFile($FontUrl, $FontFile) } finally { $wc.Dispose() }
          $ok = $true
        } catch {
          Say "Attempt failed: $($_.Exception.Message)" 'Yellow'
          if (Test-Path $FontFile) { Remove-Item $FontFile -Force -ErrorAction SilentlyContinue }
          if ($attempt -lt 3) { Start-Sleep -Seconds (5 * $attempt) } else { Fail 'Download failed after 3 attempts. Re-run later.' }
        }
      }
    }
    if ((Get-Sha256 $FontFile) -ne $FontSha256) {
      Remove-Item $FontFile -Force -ErrorAction SilentlyContinue
      Fail 'File integrity check failed (SHA256 mismatch). The file was deleted - re-run the script.'
    }
    Say 'Download complete and verified.' 'Green'
  }
} elseif (-not (Test-Path $FontFile)) {
  Fail "-SkipDownload was given but the file is missing: $FontFile"
}

# ---------- 6) Already installed? ----------
$currentValue = (Get-ItemProperty $FontsRegPath -Name $ValueName -ErrorAction SilentlyContinue).$ValueName
if ($currentValue -and $currentValue -ieq $NewFontName) {
  Say 'Apple emoji font is already active. Nothing to do.' 'Green'
  return
}

# ---------- 7) Install the font file under its own name ----------
Say 'Installing the font file...' 'Cyan'
Copy-Item $FontFile $NewFontPath -Force
if ((Get-Sha256 $NewFontPath) -ne $FontSha256) {
  Remove-Item $NewFontPath -Force -ErrorAction SilentlyContinue
  Fail 'Installed file verification failed - nothing was changed.'
}

# ---------- 8) Back up the current registry value ----------
if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null }
$backup = [ordered]@{
  valueName     = $ValueName
  previousValue = $currentValue   # may be $null if the value did not exist
  installedFile = $NewFontName
  date          = (Get-Date).ToString('o')
}
$backup | ConvertTo-Json | Out-File $BackupFile -Encoding utf8 -Force
Say "Previous setting backed up to $BackupFile" 'Green'

# ---------- 9) Repoint the registry + notify the system (no reboot) ----------
$fontCode = @'
using System;
using System.Runtime.InteropServices;
public static class FontSwapInstallApi {
  [DllImport("gdi32.dll", CharSet=CharSet.Unicode)]
  public static extern int AddFontResourceW(string lpFileName);
  [DllImport("user32.dll", CharSet=CharSet.Auto)]
  public static extern IntPtr SendMessageTimeoutW(IntPtr hWnd, uint Msg, UIntPtr wParam, IntPtr lParam, uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
}
'@
Add-Type -TypeDefinition $fontCode

try {
  Set-ItemProperty -Path $FontsRegPath -Name $ValueName -Value $NewFontName -Force
  $added = [FontSwapInstallApi]::AddFontResourceW($NewFontPath)
  if ($added -eq 0) { Say 'Warning: AddFontResource reported 0 (font may still work after apps restart).' 'Yellow' }
  $HWND_BROADCAST = [IntPtr]0xffff
  $WM_FONTCHANGE = 0x001D
  $result = [UIntPtr]::Zero
  [void][FontSwapInstallApi]::SendMessageTimeoutW($HWND_BROADCAST, $WM_FONTCHANGE, [UIntPtr]::Zero, [IntPtr]::Zero, 0x0002, 5000, [ref]$result)
} catch {
  # roll back on failure
  if ($null -ne $currentValue) { Set-ItemProperty -Path $FontsRegPath -Name $ValueName -Value $currentValue -Force }
  else { Remove-ItemProperty -Path $FontsRegPath -Name $ValueName -Force -ErrorAction SilentlyContinue }
  Remove-Item $NewFontPath -Force -ErrorAction SilentlyContinue
  Fail "Install failed and was rolled back: $_"
}

# ---------- 10) Verify ----------
$check = (Get-ItemProperty $FontsRegPath -Name $ValueName -ErrorAction SilentlyContinue).$ValueName
if ($check -ine $NewFontName) { Fail 'Verification failed: the registry was not updated.' }

Say ''
Say '================================================' 'Green'
Say 'Done! Apple-style emoji is now active - no reboot needed.' 'Green'
Say 'New apps will use it immediately; already-open apps pick it up when restarted.' 'Green'
Say 'To revert: run Restore-AppleEmoji.ps1 as administrator.' 'Yellow'
Say '================================================' 'Green'
