@echo off
rem ============================================================================
rem  SMTH Music launcher (Windows)
rem  [1] Local   - run on http://localhost:5000
rem  [2] Tunnel  - expose through cloudflared (auto-installs / auto-logins)
rem ============================================================================
setlocal EnableDelayedExpansion
title SMTH Music Launcher
color 0B

set "ROOT=%~dp0"
cd /d "%ROOT%"

call :banner
call :check_python
call :install_deps

:menu
cls
call :banner
echo  Choose how to run SMTH Music:
echo.
echo    [1]  Local     -  http://localhost:5000
echo    [2]  Tunnel    -  public URL via cloudflared
echo    [3]  Tools     -  admin / seed / backup helpers
echo    [4]  Exit
echo.
choice /c 1234 /n /m "Select an option [1-4]: "
set "pick=%errorlevel%"
if "%pick%"=="1" goto local
if "%pick%"=="2" goto tunnel
if "%pick%"=="3" goto tools
if "%pick%"=="4" goto bye
goto menu

:local
call :run_server
goto menu

:tunnel
call :check_cloudflared
call :ensure_login
call :run_server
call :run_tunnel
goto menu

:tools
cls
call :banner
echo  Tools:
echo.
echo    [1]  Promote a user to admin
echo    [2]  Seed demo tracks
echo    [3]  Database console
echo    [4]  Backup database + music
echo    [5]  Environment self-test
echo    [6]  Back
echo.
choice /c 123456 /n /m "Select [1-6]: "
set "tool=%errorlevel%"
if "%tool%"=="1" python tools\make-admin.py & goto tools
if "%tool%"=="2" python tools\seed-demo.py & goto tools
if "%tool%"=="3" python tools\db-console.py & goto tools
if "%tool%"=="4" python tools\backup.py & pause & goto tools
if "%tool%"=="5" python tools\check-env.py & pause & goto tools
if "%tool%"=="6" goto menu
goto tools

:bye
echo.
echo  See you later. ^>_^
exit /b 0

rem ---------------------------------------------------------------------------
rem  Helpers
rem ---------------------------------------------------------------------------

:banner
echo.
echo   =====================================================
echo    S M T H   M U S I C   -   local music platform
echo   =====================================================
echo.
goto :eof

:check_python
where python >nul 2>nul
if %errorlevel%==0 set "PY=python" & goto :eof
where py >nul 2>nul
if %errorlevel%==0 set "PY=py -3" & goto :eof
echo  [!] Python not found. Attempting automatic install...
call :progress_bar 12 "Installing Python"
winget install --id Python.Python.3.12 -e --accept-package-agreements --accept-source-agreements >nul 2>&1
if %errorlevel% neq 0 (
  echo  [x] Could not install Python automatically.
  echo      Please install it from https://python.org and re-run.
  pause
  exit /b 1
)
set "PY=python"
goto :eof

:install_deps
%PY% -c "import flask" >nul 2>&1
if %errorlevel%==0 goto :eof
echo  [*] Installing Python dependencies...
call :progress_bar 4 "pip install"
%PY% -m pip install --upgrade pip >nul 2>&1
%PY% -m pip install -r requirements.txt
if %errorlevel% neq 0 (
  echo  [x] pip install failed. Check your Python installation.
  pause
  exit /b 1
)
echo  [OK] Dependencies installed.
goto :eof

:run_server
echo  [*] Starting SMTH Music on http://localhost:5000 ...
start "SMTH Music Server" /min cmd /c "%PY% run.py"
timeout /t 3 /nobreak >nul
goto :eof

:check_cloudflared
where cloudflared >nul 2>&1
if %errorlevel%==0 goto :eof
echo  [*] cloudflared not found - downloading...
mkdir tools\bin >nul 2>&1
curl.exe -L --progress-bar -o tools\bin\cloudflared.exe ^
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
if %errorlevel% neq 0 (
  echo  [x] Download failed. Install cloudflared manually:
  echo      https://developers.cloudflare.com/cloudflare-one/connections/connect-devices/install-and-setup/
  pause
  exit /b 1
)
echo  [OK] cloudflared installed to tools\bin\cloudflared.exe
set "PATH=%ROOT%tools\bin;%PATH%"
goto :eof

:ensure_login
cloudflared tunnel list >nul 2>&1
if %errorlevel%==0 (
  echo  [OK] Logged in to Cloudflare.
  goto :eof
)
echo  [!] Not logged in to Cloudflare - opening the login page...
cloudflared tunnel login
cloudflared tunnel list >nul 2>&1
if %errorlevel% neq 0 (
  echo  [!] Login did not complete. Falling back to a temporary quick tunnel.
  goto :eof
)
if not exist config\tunnel.json (
  echo  [*] Creating named tunnel "smth-music" ...
  cloudflared tunnel create smth-music
)
goto :eof

:run_tunnel
echo  [*] Opening secure tunnel to your server...
echo      (public URL appears in the new window)
echo.
cloudflared tunnel run smth-music --url http://localhost:5000 2>nul
if %errorlevel% neq 0 (
  echo  [*] Named tunnel unavailable - using a quick tunnel instead...
  cloudflared tunnel --url http://localhost:5000
)
goto :eof

rem Animated ASCII progress bar. Usage: call :progress_bar ^<seconds^> ^<label^>
:progress_bar
setlocal enabledelayedexpansion
set "label=%~2"
set "full=##################################################"
set "blank=                                                  "
set /a "steps=%~1*4"
for /L %%i in (1,1,%steps%) do (
  set /a "pct=%%i*100/steps"
  set /a "done=%%i*50/steps"
  set /a "rest=50-done"
  call set "bar=%%full:~0,!done!%%%%blank:~0,!rest!%%"
  <nul set /p ".=  [!bar!] !pct!%%  %label%"
  ping -n 1 127.0.0.1 >nul
  <nul set /p ".=                                                                "
)
echo.
endlocal
goto :eof
