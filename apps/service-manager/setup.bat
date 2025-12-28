@echo off
chcp 65001 >nul
setlocal

title Evolution Service Manager - 설치

:menu
cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  Evolution Service Manager - 설치 마법사                   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo  설치할 항목을 선택하세요:
echo.
echo  [1] 모두 설치 (권장)
echo      - 바탕화면 바로가기
echo      - Windows 시작 프로그램 등록
echo.
echo  [2] 바탕화면 바로가기만 생성
echo.
echo  [3] Windows 시작 프로그램만 등록
echo.
echo  [4] 프로그램 실행 (설치 안 함)
echo.
echo  [5] 종료
echo.
echo ════════════════════════════════════════════════════════════
echo.

choice /C 12345 /N /M "선택 (1-5): "

if errorlevel 5 goto :end
if errorlevel 4 goto :run
if errorlevel 3 goto :startup_only
if errorlevel 2 goto :desktop_only
if errorlevel 1 goto :install_all

:install_all
cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  전체 설치 시작                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [1/2] 바탕화면 바로가기 생성 중...
call create-desktop-shortcut.bat > nul 2>&1
if %errorlevel% equ 0 (
    echo      ✅ 바탕화면 바로가기 생성 완료
) else (
    echo      ❌ 바탕화면 바로가기 생성 실패
)

echo.
echo [2/2] Windows 시작 프로그램 등록 중...

:: 시작 프로그램 등록 (자동 모드)
set SCRIPT_DIR=%~dp0
set TARGET=%SCRIPT_DIR%start.bat
set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

if exist "%STARTUP%\Evolution Service Manager.lnk" (
    del "%STARTUP%\Evolution Service Manager.lnk"
)

set SCRIPT=%TEMP%\create_startup_shortcut.vbs
echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT%
echo sLinkFile = "%STARTUP%\Evolution Service Manager.lnk" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "%TARGET%" >> %SCRIPT%
echo oLink.WorkingDirectory = "%SCRIPT_DIR%" >> %SCRIPT%
echo oLink.Description = "Evolution Service Manager - 자동 시작" >> %SCRIPT%
echo oLink.WindowStyle = 7 >> %SCRIPT%
echo oLink.Save >> %SCRIPT%

cscript //nologo %SCRIPT% > nul 2>&1
del %SCRIPT%

if %errorlevel% equ 0 (
    echo      ✅ Windows 시작 프로그램 등록 완료
) else (
    echo      ❌ Windows 시작 프로그램 등록 실패
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  🎉 설치 완료!                                            ║
echo ╠════════════════════════════════════════════════════════════╣
echo ║  ✅ 바탕화면 바로가기 생성됨                              ║
echo ║  ✅ Windows 시작 프로그램 등록됨                          ║
echo ║                                                            ║
echo ║  💡 사용 방법:                                            ║
echo ║     1. 바탕화면 아이콘 더블클릭                           ║
echo ║     2. 또는 다음 로그인 시 자동 실행                      ║
echo ║     3. 시스템 트레이에서 관리                             ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

choice /C YN /M "지금 프로그램을 실행하시겠습니까? (Y=예, N=아니오)"
if errorlevel 2 goto :menu
if errorlevel 1 goto :run

:desktop_only
cls
echo.
echo 바탕화면 바로가기 생성 중...
call create-desktop-shortcut.bat
goto :menu

:startup_only
cls
echo.
echo Windows 시작 프로그램 등록 중...
call register-startup.bat
goto :menu

:run
cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  프로그램 실행 중...                                       ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
start "" "%~dp0start.bat"
goto :end

:end
exit /b

