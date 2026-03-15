@echo off
SETLOCAL EnableDelayedExpansion

echo ====================================================
echo   WhatsApp PDF Redactor - Universal Windows Starter
echo ====================================================

:: 1. Environment Verification
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed. Download from https://nodejs.org/
    pause
    exit /b
)

:: 2. Root Dependencies
echo [1/3] Syncing core bot dependencies...
call npm install --no-audit --no-fund
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Core dependency sync failed.
    pause
    exit /b
)

:: 3. Dashboard Dependencies
echo [2/3] Syncing web dashboard dependencies...
cd bot-dashboard
call npm install --no-audit --no-fund
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Dashboard dependency sync failed.
    pause
    exit /b
)

:: 4. Poppler Check
where pdftoppm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] pdftoppm (Poppler) not detected in PATH.
    echo Flattening/Redaction logic requires Poppler for Windows.
    echo Install from: https://github.com/oschwartz10612/poppler-windows
    echo.
    set /p "choice=Continue to start server anyway? (y/n): "
    if /i "!choice!" NEQ "y" exit /b
)

:: 5. Launch Dashboard
echo [3/3] Launching Web Server...
echo ----------------------------------------------------
echo Dashboard will be available at: http://localhost:3000
echo ----------------------------------------------------
npm run dev
pause
