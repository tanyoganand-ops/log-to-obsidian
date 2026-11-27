@echo off
rem One vault rebuild. Used by the scheduled task; you can also double-click it.
cd /d "%~dp0.."
node build-vault.js --config config.json >> "%~dp0build-vault.log" 2>&1
