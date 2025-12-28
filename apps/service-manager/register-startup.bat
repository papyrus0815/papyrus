@echo off
setlocal

:: Current directory
set SCRIPT_DIR=%~dp0

:: Target file
set TARGET=%SCRIPT_DIR%start-simple.bat

:: Startup folder
set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

echo.
echo ====================================================
echo   Register Windows Startup Program
echo ====================================================
echo.
echo Program: %TARGET%
echo Startup: %STARTUP%
echo.

:: Check if already registered
if exist "%STARTUP%\Evolution Service Manager.lnk" (
    echo Already registered in startup.
    echo.
    choice /C YN /M "Re-register? (Y/N)"
    if errorlevel 2 goto :end
    if errorlevel 1 (
        del "%STARTUP%\Evolution Service Manager.lnk"
        echo Removed existing shortcut
    )
)

:: Create shortcut using VBScript
set SCRIPT=%TEMP%\create_startup_shortcut.vbs

echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT%
echo sLinkFile = "%STARTUP%\Evolution Service Manager.lnk" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "%TARGET%" >> %SCRIPT%
echo oLink.WorkingDirectory = "%SCRIPT_DIR%" >> %SCRIPT%
echo oLink.Description = "Evolution Service Manager - Auto Start" >> %SCRIPT%
echo oLink.WindowStyle = 7 >> %SCRIPT%
echo oLink.Save >> %SCRIPT%

cscript //nologo %SCRIPT%
del %SCRIPT%

echo.
echo ====================================================
echo   Successfully registered to Windows startup!
echo ====================================================
echo.
echo * Will start automatically on next login
echo * To create desktop shortcut: run create-desktop-shortcut.bat
echo.

:end
pause

