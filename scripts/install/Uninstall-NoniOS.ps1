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

# Restore the sign-in prompt on wake / secure screen saver.
& powercfg /SETACVALUEINDEX SCHEME_CURRENT SUB_NONE CONSOLELOCK 1 | Out-Null
& powercfg /SETDCVALUEINDEX SCHEME_CURRENT SUB_NONE CONSOLELOCK 1 | Out-Null
& powercfg /SETACTIVE SCHEME_CURRENT | Out-Null
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
    }
    else {
        Write-Warning "NoniOS executable not found at '$NoniosExe'; left autologon unchanged."
    }
}
else {
    Write-Host "Autologon left unchanged (pass -NoniosExe to disable it)."
}
