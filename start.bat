@echo off
title HemoWiz Web App Launcher
echo =======================================================
echo    HemoWiz Non-Invasive Anemia Detection Monitor
echo =======================================================
echo Starting local web server on http://localhost:8000 ...
echo (Web Bluetooth requires http://localhost or https)
echo.

python server.py

if errorlevel 1 (
    echo.
    echo Python was not found in PATH or server error occurred.
    echo Opening index.html directly as fallback...
    start "" index.html
    pause
)
