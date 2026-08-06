# Guided screenshot capture for the Play Store listing frames.
# Prereqs: phone/emulator connected with USB debugging, adb on PATH
# (expo run:android installs platform-tools; adb lives in %LOCALAPPDATA%\Android\Sdk\platform-tools).
#
# Usage:
#   .\capture.ps1            # capture all 7 frames, prompted one by one
#   .\capture.ps1 -CleanBar  # also force a clean status bar (9:00, full battery, no notifications)

param([switch]$CleanBar)

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
    $sdkAdb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
    if (Test-Path $sdkAdb) { Set-Alias adb $sdkAdb } else {
        Write-Host "adb not found. Install Android platform-tools or run 'npx expo run:android' once." -ForegroundColor Red
        exit 1
    }
}

$devices = (adb devices) -match "device$"
if (-not $devices) {
    Write-Host "No device detected. Connect your phone (USB debugging on) or start an emulator." -ForegroundColor Red
    exit 1
}

$dest = Join-Path $PSScriptRoot "captures"
New-Item -ItemType Directory -Force $dest | Out-Null

if ($CleanBar) {
    adb shell settings put global sysui_demo_allowed 1
    adb shell am broadcast -a com.android.systemui.demo -e command enter | Out-Null
    adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0900 | Out-Null
    adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false | Out-Null
    adb shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4 | Out-Null
    adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false | Out-Null
    Write-Host "Clean status bar enabled (demo mode)." -ForegroundColor Yellow
}

$frames = @(
    @{ id = "02-dashboard";  screen = "Dashboard - net balance, income vs expense, charts" },
    @{ id = "03-cashbooks";  screen = "Home - several cashbook cards visible" },
    @{ id = "04-currency";   screen = "Create Cashbook - currency picker open (GHS NGN USD EUR GBP)" },
    @{ id = "05-budgets";    screen = "Reports - donut chart + category breakdown" },
    @{ id = "06-debt";       screen = "Debt Tracker - people list with partial payments" },
    @{ id = "07-security";   screen = "PIN / biometric lock screen" },
    @{ id = "08-reminders";  screen = "Reminder tone selector (funny / motivational / gentle / serious)" }
)

Write-Host ""
Write-Host "Use the LIGHT theme (Settings > Appearance) - the store shows the warm paper look." -ForegroundColor Yellow

foreach ($f in $frames) {
    Write-Host ""
    Write-Host ("Frame {0}" -f $f.id) -ForegroundColor Cyan
    Write-Host ("  -> {0}" -f $f.screen)
    Read-Host "  Navigate there on the device, then press Enter to capture"
    adb shell screencap -p /sdcard/ft_capture.png
    adb pull /sdcard/ft_capture.png (Join-Path $dest ($f.id + ".png")) | Out-Null
    adb shell rm /sdcard/ft_capture.png
    Write-Host ("  Saved captures\{0}.png" -f $f.id) -ForegroundColor Green
}

if ($CleanBar) {
    adb shell am broadcast -a com.android.systemui.demo -e command exit | Out-Null
    Write-Host ""
    Write-Host "Status bar restored." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Done. Open asset-studio.html and use 'Load capture' on each frame with these files." -ForegroundColor Green
