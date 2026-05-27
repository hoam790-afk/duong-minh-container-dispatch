@echo off
setlocal

set SOURCE_DIR=%~dp0
set RUNTIME_DIR=%USERPROFILE%\.codex\runs\duong-minh-container-dispatch

echo.
echo Preparing local runtime folder:
echo %RUNTIME_DIR%
if not exist "%RUNTIME_DIR%" mkdir "%RUNTIME_DIR%"

echo.
echo [1/5] Copying project files to local runtime folder...
robocopy "%SOURCE_DIR%" "%RUNTIME_DIR%" /E /XD node_modules .next /XF package-lock.json
if %ERRORLEVEL% GEQ 8 (
  echo Copy failed.
  pause
  exit /b 1
)

cd /d "%RUNTIME_DIR%"

echo.
echo [2/5] Starting PostgreSQL with Docker Compose...
docker compose up -d
if errorlevel 1 (
  echo.
  echo Docker is not running. Please open Docker Desktop first, then run start-app.bat again.
  pause
  exit /b 1
)

echo.
echo [3/5] Installing dependencies if needed...
if not exist node_modules (
  npm install
)

echo.
echo [4/5] Creating database tables and seed data...
npm run db:push
if errorlevel 1 (
  echo Database push failed.
  pause
  exit /b 1
)

npm run prisma:seed
if errorlevel 1 (
  echo Seed failed.
  pause
  exit /b 1
)

echo.
echo [5/5] Starting web app at http://localhost:3001
npm run dev -- -p 3001
