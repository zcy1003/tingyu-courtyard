@echo off
chcp 65001 >nul
cd /d "%~dp0"
python scripts\play.py
if errorlevel 1 pause
