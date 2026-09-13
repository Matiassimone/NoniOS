<#
.SYNOPSIS
    Reports whether NoniOS's autostart is actually installed on this machine.

.DESCRIPTION
    A quick read-only check (no changes) for the question "will NoniOS start by
    itself after a reboot?". It shows the two Scheduled Tasks and their state,
    whether autologon is configured, and whether the Windows key is disabled.

    Autostart requires ALL of: both tasks present and Enabled, plus autologon on.
    NOTE: Smoke-Test.ps1 registers and then REMOVES everything — after running it
    the answer here is "not installed". To actually get autostart, run
    Install-NoniOS.ps1 and leave it.

    Run from any PowerShell (elevated not required to read).
#>
[CmdletBinding()]
param()

function Show([string]$label, [bool]$ok, [string]$detail) {
    $mark = if ($ok) { 'OK  ' } else { 'MISSING ' }
    Write-Host ("{0} {1}  {2}" -f $mark, $label, $detail)
}

Write-Host '--- NoniOS autostart status ---'

$main = Get-ScheduledTask -TaskName 'NoniOS' -ErrorAction SilentlyContinue
$wd = Get-ScheduledTask -TaskName 'NoniOS Watchdog' -ErrorAction SilentlyContinue
Show 'Task "NoniOS"' ($null -ne $main -and $main.State -ne 'Disabled') ($(if ($main) { "state=$($main.State)" } else { 'not registered' }))
Show 'Task "NoniOS Watchdog"' ($null -ne $wd -and $wd.State -ne 'Disabled') ($(if ($wd) { "state=$($wd.State)" } else { 'not registered' }))

$winlogon = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon'
$w = Get-ItemProperty $winlogon -ErrorAction SilentlyContinue
$autologon = $w.AutoAdminLogon -eq '1' -and $w.DefaultUserName
Show 'Autologon' ([bool]$autologon) ($(if ($autologon) { "user=$($w.DefaultUserName)" } else { 'AutoAdminLogon off' }))

$sc = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Keyboard Layout' -ErrorAction SilentlyContinue).'Scancode Map'
Show 'Windows key disabled' ([bool]$sc) ($(if ($sc) { 'Scancode Map present' } else { 'not set' }))

$ready = ($null -ne $main -and $main.State -ne 'Disabled') -and ($null -ne $wd -and $wd.State -ne 'Disabled') -and $autologon
Write-Host ''
if ($ready) {
    Write-Host 'RESULT: autostart is installed - NoniOS will launch after a reboot.'
}
else {
    Write-Host 'RESULT: autostart is NOT fully installed. Run scripts\install\Install-NoniOS.ps1 (elevated) and do not run the uninstaller or smoke test afterwards.'
}
