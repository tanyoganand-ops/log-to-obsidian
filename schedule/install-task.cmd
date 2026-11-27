@echo off
rem Registers a Windows scheduled task that rebuilds the vault every 30 minutes.
rem Run once from this folder (no admin rights needed for a per-user task).
setlocal
set "HERE=%~dp0.."
set "TASKCMD=\"%HERE%\schedule\run-build.cmd\""
schtasks /Create /TN "ProjectLogVault" /SC MINUTE /MO 30 /TR "%TASKCMD%" /F
if errorlevel 1 (echo Could not create the task.) else (echo Task ProjectLogVault created: runs every 30 minutes.)
rem Remove later with: schtasks /Delete /TN "ProjectLogVault" /F
endlocal
