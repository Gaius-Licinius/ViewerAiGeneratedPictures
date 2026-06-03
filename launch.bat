@echo off
title AI Image Viewer
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080.*LISTENING"') do taskkill /f /pid %%a >nul 2>&1
cd /d "%~dp0viewer"
start "" python server.py
timeout /t 3 /nobreak >nul
start "" http://localhost:8080
