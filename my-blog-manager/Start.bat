@echo off
chcp 65001 >nul
cd /d "%~dp0"
py -3.10 -c "import sys;sys.exit(sys.version_info[:2] < (3,10))" >nul 2>&1
if not errorlevel 1 (
    py -3.10 run_me.py
    goto end
)
python -c "import sys;sys.exit(sys.version_info[:2] < (3,10))" >nul 2>&1
if errorlevel 1 (
    echo Python 3.10 or newer is required.
    pause
    exit /b 1
)
python run_me.py
:end
if errorlevel 1 pause
