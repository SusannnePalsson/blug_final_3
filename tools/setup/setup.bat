\
@echo off
setlocal

REM Adjust this if your PostgreSQL version differs:
set PGBIN=C:\Program Files\PostgreSQL\17\bin

powershell -ExecutionPolicy Bypass -File "%~dp0setup.ps1" -PgBin "%PGBIN%"
endlocal
