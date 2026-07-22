<#
.SYNOPSIS
    Removes the two NoniOS reliability Scheduled Tasks registered by
    Install-NoniOS.ps1.

.DESCRIPTION
    Unregisters "NoniOS" and "NoniOS Watchdog". Run from an elevated PowerShell.

    This does NOT restore the Windows taskbar or undo autologon: the taskbar is
    hidden at runtime by NoniOS itself and is restored when NoniOS exits and
    calls its own teardown (kiosk::disengage); autologon is a Windows setting the
    administrator configured separately. After removing the tasks, close NoniOS
    so it restores the shell, then revert autologon if it was enabled.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

function Assert-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'This script must be run from an elevated PowerShell (Run as administrator).'
    }
}

Assert-Administrator

foreach ($name in @('NoniOS', 'NoniOS Watchdog')) {
    if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $name -Confirm:$false
        Write-Host "Removed Scheduled Task '$name'."
    }
    else {
        Write-Host "Scheduled Task '$name' was not present."
    }
}
