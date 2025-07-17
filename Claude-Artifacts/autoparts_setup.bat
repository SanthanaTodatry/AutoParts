@echo off
REM Autoparts VIN Processing Application Setup - Clean Version
echo =======================================================
echo Autoparts VIN Processing Application Setup - Windows
echo =======================================================

REM Check if Node.js is installed
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo Download the LTS version and run this script again.
    pause
    exit /b 1
)

echo ✅ Node.js is installed
node --version

REM Check if npm is available
echo Checking npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not available!
    pause
    exit /b 1
)

echo ✅ npm is available
npm --version

echo.
echo Creating project structure...

REM Create main project directory
if not exist autoparts-app mkdir autoparts-app
cd autoparts-app

REM Create project structure
if not exist backend mkdir backend
if not exist frontend mkdir frontend
if not exist database mkdir database
if not exist exports mkdir exports
if not exist uploads mkdir uploads

echo ✅ Project directories created

REM Install n8n globally
echo.
echo Installing n8n globally...
npm install -g n8n
if errorlevel 1 (
    echo WARNING: n8n installation failed. You might need to run as Administrator.
    echo Try running: npm install -g n8n
)

REM Setup Frontend (React)
echo.
echo Setting up frontend (this may take a few minutes)...
cd frontend

call npx create-react-app . --template typescript
if errorlevel 1 (
    echo Trying without TypeScript template...
    call npx create-react-app .
)

if errorlevel 1 (
    echo ERROR: React app creation failed!
    echo Please ensure you have a stable internet connection.
    pause
    exit /b 1
)

echo Installing frontend dependencies...
call npm install axios

echo ✅ Frontend setup complete

REM Return to project root
cd ..

REM Create .env file for backend
echo.
echo Creating environment configuration...
cd backend
echo PORT=8000> .env
echo NODE_ENV=development>> .env
echo DB_PATH=../database/autoparts.db>> .env
echo N8N_WEBHOOK_URL=http://localhost:5678/webhook/process-vin>> .env
cd ..

echo.
echo =======================================================
echo ✅ Project setup completed successfully!
echo =======================================================
echo.
echo Project structure:
echo   autoparts-app/
echo   ├── backend/     (Ready for your artifacts)
echo   ├── frontend/    (React app created)  
echo   ├── database/    (SQLite database files)
echo   ├── uploads/     (Uploaded spreadsheets)
echo   └── exports/     (Exported results)
echo.
echo NEXT STEPS:
echo.
echo 1. COPY ARTIFACTS to appropriate folders:
echo    • Copy package.json to backend/ folder
echo    • Copy app.js to backend/ folder  
echo    • Copy App.js to frontend/src/ folder
echo    • Copy App.css to frontend/src/ folder
echo.
echo 2. INSTALL BACKEND DEPENDENCIES:
echo    cd autoparts-app\backend
echo    npm install
echo.
echo 3. START SERVICES in this order:
echo    Terminal 1: n8n start
echo    Terminal 2: cd autoparts-app\backend ^&^& npm run dev  
echo    Terminal 3: cd autoparts-app\frontend ^&^& npm start
echo.
echo 4. IMPORT N8N WORKFLOW:
echo    • Open http://localhost:5678
echo    • Import the workflow JSON artifact
echo    • Activate the workflow
echo.
echo =======================================================
pause