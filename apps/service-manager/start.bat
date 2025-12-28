@echo off
chcp 65001 >nul

cd /d "%~dp0"

echo.
echo ====================================================
echo   Evolution Service Manager v1.0.0
echo ====================================================
echo.
echo [1/3] Building...
echo.

REM Build
call npm run build >nul 2>&1

if errorlevel 1 (
    echo.
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo [2/3] Build complete!
echo [3/3] Starting Electron...
echo.

REM Start Electron using PowerShell script (minimized console)
set "APP_DIR=%~dp0"
set "APP_DIR=%APP_DIR:~0,-1%"
powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0start-electron.ps1" -AppPath "%APP_DIR%"

echo.
echo ====================================================
echo   Service Manager is now running!
echo ====================================================
echo.
echo * A console window will open with Evolution Service Manager
echo * Look for the TRAY ICON in the taskbar (bottom-right)
echo * Right-click the tray icon to open GUI
echo * You can minimize or close the console window
echo.
echo This window will close in 3 seconds...
ping 127.0.0.1 -n 4 >nul
exit
