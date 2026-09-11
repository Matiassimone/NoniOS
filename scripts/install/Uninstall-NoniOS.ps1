<#
.SYNOPSIS
    Removes the two NoniOS reliability Scheduled Tasks registered by
    Install-NoniOS.ps1.

.DESCRIPTION
    Unregisters "NoniOS" and "NoniOS Watchdog". Run from an elevated PowerShell.

    Pass -NoniosExe to also disable autologon (clears AutoAdminLogon and the
    stored LSA password secret). Without it, autologon is left as-is.

    With -NoniosExe it also restores the Windows taskbar (NoniOS hides it at
    runtime and only a clean exit brings it back; a force-killed NoniOS leaves
    it hidden).
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

# Restore the sign-in prompt on wake / secure screen saver.
& powercfg /SETACVALUEINDEX SCHEME_CURRENT SUB_NONE 0e796bdb-100d-47d6-a2d5-f7d2daa51f51 1 2>&1 | Write-Host
& powercfg /SETDCVALUEINDEX SCHEME_CURRENT SUB_NONE 0e796bdb-100d-47d6-a2d5-f7d2daa51f51 1 2>&1 | Write-Host
& powercfg /SETACTIVE SCHEME_CURRENT 2>&1 | Write-Host
Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Personalization' -Name 'NoLockScreen' -ErrorAction SilentlyContinue
Write-Host 'Restored the sign-in prompt on wake.'

if ($NoniosExe) {
    if (Test-Path -LiteralPath $NoniosExe) {
        $proc = Start-Process -FilePath $NoniosExe -ArgumentList 'disable-autologon' -Wait -PassThru
        if ($proc.ExitCode -ne 0) {
            Write-Warning "Failed to disable autologon (NoniOS exit code $($proc.ExitCode))."
        }
        else {
            Write-Host "Autologon disabled and password secret cleared."
        }
        # A force-killed NoniOS leaves the taskbar hidden; bring it back.
        Start-Process -FilePath $NoniosExe -ArgumentList 'restore-shell' -Wait | Out-Null
        Write-Host 'Taskbar restored.'
    }
    else {
        Write-Warning "NoniOS executable not found at '$NoniosExe'; left autologon unchanged."
    }
}
else {
    Write-Host "Autologon left unchanged (pass -NoniosExe to disable it)."
}
