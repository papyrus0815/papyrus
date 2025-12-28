@echo off
setlocal

:: Current directory
set SCRIPT_DIR=%~dp0

:: Target file
set TARGET=%SCRIPT_DIR%start.bat

:: Desktop path
set DESKTOP=%USERPROFILE%\Desktop

echo.
echo ====================================================
echo   Create Desktop Shortcut
echo ====================================================
echo.

:: Create shortcut using VBScript
set SCRIPT=%TEMP%\create_shortcut.vbs

echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT%
echo sLinkFile = "%DESKTOP%\Evolution Service Manager.lnk" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "%TARGET%" >> %SCRIPT%
echo oLink.WorkingDirectory = "%SCRIPT_DIR%" >> %SCRIPT%
echo oLink.Description = "Evolution Service Manager" >> %SCRIPT%
echo oLink.IconLocation = "%SystemRoot%\System32\SHELL32.dll,16" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%

cscript //nologo %SCRIPT%
del %SCRIPT%

echo.
echo ====================================================
echo   Desktop shortcut created!
echo ====================================================
echo.
echo Location: %DESKTOP%\Evolution Service Manager.lnk
echo.
pause

