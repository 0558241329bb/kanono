@echo off
setlocal
cd /d "%~dp0.."

echo Closing stray Node may help; stop dev servers first.
if exist node_modules (
  echo Removing node_modules...
  rmdir /s /q node_modules 2>nul
  if exist node_modules (
    echo rmdir failed. Close Cursor/IDE, pause OneDrive for this folder, then run again.
    exit /b 1
  )
)

set "NPM_CONFIG_CACHE=%TEMP%\npm-cache-avocat-dz"
call npm cache clean --force
call npm install
if errorlevel 1 exit /b 1

echo.
echo Verifying firebase-admin and socket.io...
if not exist "node_modules\firebase-admin\lib\index.js" (
  echo ERROR: firebase-admin incomplete. Try: npm install firebase-admin@13.8.0 --save
  exit /b 1
)

call npm run build
echo.
echo OK. Run: npm run dev
endlocal
