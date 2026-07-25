<#
.SYNOPSIS
    Removes the two NoniOS reliability Scheduled Tasks registered by
    Install-NoniOS.ps1.

.DESCRIPTION
    Unregisters "NoniOS" and "NoniOS Watchdog". Run from an elevated PowerShell.

    Pass -NoniosExe to also disable autologon (clears AutoAdminLogon and the
    stored LSA password secret). Without it, autologon is left as-is.

    This does NOT restore the Windows taskbar: it is hidden at runtime by NoniOS
    itself and restored when NoniOS exits and calls its own teardown
    (kiosk::disengage). After removing the tasks, close NoniOS so it restores the
    shell.
#>
[CmdletBinding()]
param(
    [string]$NoniosExe
)

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

if ($NoniosExe) {
    if (Test-Path -LiteralPath $NoniosExe) {
        & $NoniosExe disable-autologon
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Failed to disable autologon (NoniOS exit code $LASTEXITCODE)."
        }
        else {
            Write-Host "Autologon disabled and password secret cleared."
        }
    }
    else {
        Write-Warning "NoniOS executable not found at '$NoniosExe'; left autologon unchanged."
    }
}
else {
    Write-Host "Autologon left unchanged (pass -NoniosExe to disable it)."
}
