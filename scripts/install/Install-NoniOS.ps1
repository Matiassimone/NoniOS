<#
.SYNOPSIS
    Registers the two NoniOS reliability Scheduled Tasks (CLAUDE.md ->
    Reliability Architecture): the main app and its watchdog.

.DESCRIPTION
    Two independent safety nets keep NoniOS on screen:

      1. "NoniOS"          — launches the app at logon, elevated, and restarts it
                             up to 3 times (1 min apart) if it fails.
      2. "NoniOS Watchdog" — runs the tiny watchdog binary every minute; it
                             relaunches "NoniOS" whenever the app process is gone
                             (crash, kill, or after sleep/resume).

    Both tasks run in the INTERACTIVE user session (LogonType Interactive,
    RunLevel Highest). NoniOS is a visible GUI kiosk, so it CANNOT run as SYSTEM
    / "whether the user is logged on or not" — that lands in session 0 and the
    window never appears to the end user. Reboot coverage therefore relies on
    Windows autologon (configured separately at install time; it involves a
    password entered by the administrator and stored by Windows, never by
    NoniOS) so that a reboot auto-logs the kiosk user in, which fires the logon
    trigger. The every-minute watchdog covers everything else (sleep/resume,
    crash, process kill).

    Must be run from an elevated PowerShell (Run as administrator).

.PARAMETER InstallDir
    Folder containing the NoniOS executables. Defaults to the parent of this
    script's folder (i.e. the install root when scripts/ ships under it).

.PARAMETER NoniosExe
    Full path to the NoniOS main executable. Defaults to
    "<InstallDir>\NoniOS.exe".

.PARAMETER WatchdogExe
    Full path to the watchdog executable. Defaults to
    "<InstallDir>\nonios-watchdog.exe".

.PARAMETER User
    The interactive account the kiosk runs as. Defaults to the current user.

.PARAMETER WatchdogIntervalMinutes
    How often the watchdog checks. Defaults to 1 (the minimum Task Scheduler
    repetition interval).

.EXAMPLE
    .\Install-NoniOS.ps1 -InstallDir 'C:\Program Files\NoniOS'
#>
[CmdletBinding()]
param(
    [string]$InstallDir = (Split-Path -Parent $PSScriptRoot),
    [string]$NoniosExe,
    [string]$WatchdogExe,
    [string]$User = "$env:USERDOMAIN\$env:USERNAME",
    [int]$WatchdogIntervalMinutes = 1,
    [switch]$SkipAutologon
)

$ErrorActionPreference = 'Stop'

$MainTaskName = 'NoniOS'
$WatchdogTaskName = 'NoniOS Watchdog'

function Assert-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'This script must be run from an elevated PowerShell (Run as administrator).'
    }
}

if (-not $NoniosExe) { $NoniosExe = Join-Path $InstallDir 'NoniOS.exe' }
if (-not $WatchdogExe) { $WatchdogExe = Join-Path $InstallDir 'nonios-watchdog.exe' }

Assert-Administrator

if (-not (Test-Path -LiteralPath $NoniosExe)) {
    throw "NoniOS executable not found: $NoniosExe (pass -NoniosExe or -InstallDir)."
}
if (-not (Test-Path -LiteralPath $WatchdogExe)) {
    throw "Watchdog executable not found: $WatchdogExe (pass -WatchdogExe or -InstallDir)."
}

# Idempotent: remove any previous registration before recreating.
foreach ($name in @($MainTaskName, $WatchdogTaskName)) {
    if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $name -Confirm:$false
    }
}

# Shared settings: keep NoniOS alive on battery, never time it out, and don't
# spawn a second instance if a run overlaps.
$commonSettings = @{
    StartWhenAvailable        = $true
    AllowStartIfOnBatteries   = $true
    DontStopIfGoingOnBatteries = $true
    ExecutionTimeLimit        = ([TimeSpan]::Zero)   # 0 = no limit
    MultipleInstances         = 'IgnoreNew'
}

$principal = New-ScheduledTaskPrincipal -UserId $User -LogonType Interactive -RunLevel Highest

# --- Task 1: the NoniOS app ---
# Scheduled Tasks default their working directory to %windir%\system32; set it
# to the install folder so the app resolves anything relative to itself.
$mainAction = New-ScheduledTaskAction -Execute $NoniosExe `
    -WorkingDirectory (Split-Path -Parent $NoniosExe)
$mainTrigger = New-ScheduledTaskTrigger -AtLogOn
$mainSettings = New-ScheduledTaskSettingsSet @commonSettings `
    -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $MainTaskName -Action $mainAction -Trigger $mainTrigger `
    -Principal $principal -Settings $mainSettings `
    -Description 'Launches the NoniOS kiosk launcher at logon and restarts it if it fails.' | Out-Null

# --- Task 2: the watchdog (repeats forever at the given interval) ---
$watchdogAction = New-ScheduledTaskAction -Execute $WatchdogExe `
    -WorkingDirectory (Split-Path -Parent $WatchdogExe)
$watchdogTrigger = New-ScheduledTaskTrigger -AtLogOn
# Task Scheduler has no native "repeat forever"; borrow a repetition from a
# throwaway trigger and give it a very long (decade) duration.
$watchdogTrigger.Repetition = (New-ScheduledTaskTrigger -Once -At (Get-Date) `
        -RepetitionInterval (New-TimeSpan -Minutes $WatchdogIntervalMinutes) `
        -RepetitionDuration ([TimeSpan]::FromDays(3650))).Repetition
$watchdogSettings = New-ScheduledTaskSettingsSet @commonSettings

Register-ScheduledTask -TaskName $WatchdogTaskName -Action $watchdogAction -Trigger $watchdogTrigger `
    -Principal $principal -Settings $watchdogSettings `
    -Description 'Relaunches NoniOS every minute if its process is not running.' | Out-Null

Write-Host "Registered Scheduled Tasks '$MainTaskName' and '$WatchdogTaskName' for user '$User'."

# --- Never show the end user a lock screen. (0e796bdb-… is the
# 'Require a password on wakeup' setting; its CONSOLELOCK alias is hidden on
# some Windows 11 builds, the GUID always works.) Autologon gets past the boot
# sign-in, but Windows would still demand the password after sleep or the
# screen saver. Reverted by Uninstall-NoniOS.ps1.
# Windows 11 hides this setting; unhide it so it can be set, queried and audited.
& powercfg /ATTRIBUTES SUB_NONE 0e796bdb-100d-47d6-a2d5-f7d2daa51f51 -ATTRIB_HIDE 2>&1 | Write-Host
& powercfg /SETACVALUEINDEX SCHEME_CURRENT SUB_NONE 0e796bdb-100d-47d6-a2d5-f7d2daa51f51 0 2>&1 | Write-Host
& powercfg /SETDCVALUEINDEX SCHEME_CURRENT SUB_NONE 0e796bdb-100d-47d6-a2d5-f7d2daa51f51 0 2>&1 | Write-Host
& powercfg /SETACTIVE SCHEME_CURRENT 2>&1 | Write-Host
Set-ItemProperty -Path 'HKCU:\Control Panel\Desktop' -Name 'ScreenSaverIsSecure' -Value '0' -Type String
$personalization = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Personalization'
New-Item -Path $personalization -Force | Out-Null
Set-ItemProperty -Path $personalization -Name 'NoLockScreen' -Value 1 -Type DWord
Write-Host 'Disabled the sign-in prompt on wake and the secure screen saver.'

# --- Autologon: configure it via NoniOS itself so a reboot recovers unattended.
# The password is piped to NoniOS on STDIN (never an argument, never this script's
# variables on disk) and stored by NoniOS only as an LSA secret — never in the
# registry as plaintext. Pass -SkipAutologon to skip (e.g. autologon already set).
if ($SkipAutologon) {
    Write-Host "Skipped autologon setup (-SkipAutologon). Reboot recovery needs it configured."
}
else {
    $parts = $User.Split('\')
    if ($parts.Count -eq 2) { $domain = $parts[0]; $name = $parts[1] }
    else { $domain = $env:COMPUTERNAME; $name = $User }

    $secure = Read-Host "Windows password for $User (enables autologon)" -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
        # NoniOS.exe is a GUI-subsystem binary; `$plain | & exe` would not reliably
        # wait for it or surface its exit code, so drive it as a Process with
        # redirected stdin.
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $NoniosExe
        $psi.Arguments = "configure-autologon `"$domain`" `"$name`""
        $psi.RedirectStandardInput = $true
        $psi.UseShellExecute = $false
        $proc = [System.Diagnostics.Process]::Start($psi)
        $proc.StandardInput.WriteLine($plain)
        $proc.StandardInput.Close()
        $proc.WaitForExit()
        if ($proc.ExitCode -ne 0) {
            throw "Autologon configuration failed (NoniOS exit code $($proc.ExitCode))."
        }
        Write-Host "Autologon enabled for $domain\$name (password stored as an LSA secret)."
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        Remove-Variable plain -ErrorAction SilentlyContinue
    }
}
