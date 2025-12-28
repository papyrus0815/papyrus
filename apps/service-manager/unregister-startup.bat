@echo off
chcp 65001 >nul
setlocal

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  Windows 시작 프로그램 등록 해제                           ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

:: 시작 프로그램 폴더
set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT=%STARTUP%\Evolution Service Manager.lnk

:: 등록되어 있는지 확인
if not exist "%SHORTCUT%" (
    echo ℹ️  시작 프로그램에 등록되어 있지 않습니다.
    echo.
    pause
    exit /b
)

echo 🔍 발견된 등록:
echo    %SHORTCUT%
echo.

choice /C YN /M "정말 등록을 해제하시겠습니까? (Y=예, N=아니오)"
if errorlevel 2 goto :end
if errorlevel 1 (
    del "%SHORTCUT%"
    echo.
    echo ✅ 등록이 해제되었습니다!
    echo.
    echo 다음 로그인부터 자동 실행되지 않습니다.
)

:end
echo.
pause

