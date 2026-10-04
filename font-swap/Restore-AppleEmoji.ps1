#Requires -Version 5.1
<#
.SYNOPSIS
  Restores the original Windows emoji font after Install-AppleEmoji.ps1.
  No reboot needed: repoints the registry back, unloads the font resource,
  deletes the installed file, and notifies all apps instantly.
  Must run ELEVATED (Run as administrator).
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$NewFontNames = @('TahoeAppleEmoji.ttf', 'TahoeAppleEmoji2.ttf')
$FontsRegPath = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts'
$ValueName    = 'Segoe UI Emoji (TrueType)'
$BackupFile   = "$env:LOCALAPPDATA\TahoeEmoji\font-backup.json"

function Say($msg, $color = 'White') { Write-Host $msg -ForegroundColor $color }
function Fail($msg) { Write-Host "Error: $msg" -ForegroundColor Red; throw $msg }

# ---------- 1) Must run elevated ----------
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Fail 'Run this script as administrator: right-click PowerShell -> Run as administrator'
}

$fontCode = @'
using System;
using System.Runtime.InteropServices;
public static class FontRestoreApi {
  [DllImport("gdi32.dll", CharSet=CharSet.Unicode)]
  public static extern bool RemoveFontResourceW(string lpFileName);
  [DllImport("user32.dll", CharSet=CharSet.Auto)]
  public static extern IntPtr SendMessageTimeoutW(IntPtr hWnd, uint Msg, UIntPtr wParam, IntPtr lParam, uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
}
'@
Add-Type -TypeDefinition $fontCode

function Notify-FontChange {
  $HWND_BROADCAST = [IntPtr]0xffff
  $WM_FONTCHANGE = 0x001D
  $result = [UIntPtr]::Zero
  [void][FontRestoreApi]::SendMessageTimeoutW($HWND_BROADCAST, $WM_FONTCHANGE, [UIntPtr]::Zero, [IntPtr]::Zero, 0x0002, 5000, [ref]$result)
}

# ---------- 2) Cancel a pending boot-time swap from the old method (if any) ----------
$regPath = 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager'
$pending = (Get-ItemProperty $regPath -Name PendingFileRenameOperations -ErrorAction SilentlyContinue).PendingFileRenameOperations
if ($pending -match 'seguiemj') {
  $filtered = @($pending | Where-Object { $_ -notmatch 'seguiemj' })
  if ($filtered.Count -gt 0) { Set-ItemProperty $regPath -Name PendingFileRenameOperations -Value $filtered }
  else { Remove-ItemProperty $regPath -Name PendingFileRenameOperations -ErrorAction SilentlyContinue }
  Say 'Cancelled a pending boot-time font swap.' 'Yellow'
}

# ---------- 3) Restore the registry value ----------
$currentValue = (Get-ItemProperty $FontsRegPath -Name $ValueName -ErrorAction SilentlyContinue).$ValueName
$previousValue = $null
if (Test-Path $BackupFile) {
  try { $previousValue = (Get-Content $BackupFile -Raw | ConvertFrom-Json).previousValue } catch { }
}
if (-not $previousValue) {
  # No backup (e.g. installed by an older method): fall back to the stock file name
  # only if the stock file actually exists, otherwise just clear our value.
  if (Test-Path "$env:SystemRoot\Fonts\seguiemj.ttf") { $previousValue = 'seguiemj.ttf' }
}

if ($previousValue) {
  Set-ItemProperty -Path $FontsRegPath -Name $ValueName -Value $previousValue -Force
  Say "Registry restored: '$ValueName' -> '$previousValue'" 'Green'
} else {
  Remove-ItemProperty -Path $FontsRegPath -Name $ValueName -Force -ErrorAction SilentlyContinue
  Say "Registry entry '$ValueName' removed (no previous value known)." 'Yellow'
}

# ---------- 4) Unload + delete the installed font file(s) ----------
foreach ($fn in $NewFontNames) {
  $fp = "$env:SystemRoot\Fonts\$fn"
  [void][FontRestoreApi]::RemoveFontResourceW($fp)
}
Notify-FontChange
foreach ($fn in $NewFontNames) {
  $fp = "$env:SystemRoot\Fonts\$fn"
  if (Test-Path $fp) {
    try { Remove-Item $fp -Force -ErrorAction Stop; Say "Removed $fp" 'Green' }
    catch { Say "Could not delete $fp (it may be in use - it will be ignored since the registry no longer points to it)." 'Yellow' }
  }
}
if (Test-Path $BackupFile) { Remove-Item $BackupFile -Force -ErrorAction SilentlyContinue }

Say ''
Say '================================================' 'Green'
Say 'Done! The default Windows emoji font is restored - no reboot needed.' 'Green'
Say '================================================' 'Green'
