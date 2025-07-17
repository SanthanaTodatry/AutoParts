# 🚀 Windows Setup Guide - Autoparts VIN Processor

## Prerequisites

Before running the setup, ensure you have:

### 1. Install Node.js (Required)
- Download from: https://nodejs.org/
- Choose the **LTS version** (recommended)
- During installation, make sure "Add to PATH" is checked
- Restart your computer after installation

### 2. Verify Installation
Open **Command Prompt** (cmd) and run:
```cmd
node --version
npm --version
```
Both should return version numbers.

## 🏗️ Setup Process

### Step 1: Download Setup Script
1. Create a new folder: `C:\autoparts-project\`
2. Save the `setup.bat` file in this folder
3. **Right-click** on `setup.bat` → **"Run as Administrator"**

### Step 2: Manual File Creation
After the setup script completes, you'll need to create the code files:

#### Create `backend/app.js`:
1. Open the `autoparts-app/backend/` folder
2. Create a new file called `app.js`
3. Copy the Node.js backend code from the artifacts above
4. Save the file

#### Update `frontend/src/App.js`:
1. Open `autoparts-app/frontend/src/App.js`
2. Replace the contents with the React frontend code from artifacts
3. Save the file

#### Update `frontend/src/App.css`:
1. Open `autoparts-app/frontend/src/App.css`
2. Replace the contents with the CSS styles from artifacts
3. Save the file

## 🚀 Starting the Application

### Method 1: Manual Startup (Recommended for Development)

**Terminal 1 - Start n8n:**
```cmd
n8n start
```

**Terminal 2 - Start Backend API:**
```cmd
cd C:\autoparts-project\autoparts-app\backend
npm run dev
```

**Terminal 3 - Start Frontend:**
```cmd
cd C:\autoparts-project\autoparts-app\frontend
npm start
```

### Method 2: Quick Startup Batch Files

Create these batch files for easier startup:

**start-n8n.bat:**
```batch
@echo off
echo Starting n8n...
n8n start
pause
```

**start-backend.bat:**
```batch
@echo off
cd /d "%~dp0backend"
echo Starting backend API...
npm run dev
pause
```

**start-frontend.bat:**
```batch
@echo off
cd /d "%~dp0frontend"
echo Starting frontend...
npm start
pause
```

## 🔧 Windows-Specific Considerations

### Port Issues
If you get "port already in use" errors:
```cmd
# Find what's using the port
netstat -ano | findstr :3000
netstat -ano | findstr :8000
netstat -ano | findstr :5678

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Firewall
Windows may ask for firewall permissions for:
- Node.js
- n8n
- React development server

**Allow all of them** for the application to work properly.

### File Paths
Windows uses backslashes (`\`) instead of forward slashes (`/`). The application handles this automatically, but keep in mind:
- Database path: `database\autoparts.db`
- Upload path: `uploads\`
- Export path: `exports\`

## 📁 Final Project Structure

```
C:\autoparts-project\autoparts-app\
├── backend\
│   ├── app.js              # ← Copy from artifacts
│   ├── package.json        # ← Created by setup script
│   ├── .env               # ← Created by setup script
│   └── node_modules\      # ← Created by npm install
├── frontend\
│   ├── src\
│   │   ├── App.js         # ← Copy from artifacts
│   │   └── App.css        # ← Copy from artifacts
│   ├── public\
│   ├── package.json
│   └── node_modules\
├── database\              # ← SQLite files will be created here
├── uploads\               # ← Uploaded spreadsheets
└── exports\               # ← Exported results
```

## 🧪 Testing on Windows

### Test the setup:
1. Open browser to `http://localhost:3000`
2. You should see the Autoparts VIN Processor interface
3. Try processing a test VIN
4. Check that all three services are running:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000/api/health
   - n8n: http://localhost:5678

### Common Windows Issues:

**PowerShell Execution Policy:**
If you get execution policy errors, run PowerShell as Administrator:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Long Path Names:**
If you get path too long errors, keep your project in a short path like `C:\autoparts\`

**Antivirus Software:**
Some antivirus software may block Node.js. Add exceptions for:
- Node.js installation folder
- Your project folder
- npm cache folder

## 🎯 Ready to Go!

Once all three services are running, you'll have:
- ✅ Modern web interface
- ✅ RESTful API backend  
- ✅ Visual automation workflow
- ✅ Local database storage
- ✅ File upload capability

Your Windows development environment is ready! 🚗💨