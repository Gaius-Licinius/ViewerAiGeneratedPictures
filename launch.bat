@echo off
title AI Image Viewer
cd /d "%~dp0viewer"
start "" python server.py
timeout /t 3 /nobreak >nul
start "" http://localhost:8080
