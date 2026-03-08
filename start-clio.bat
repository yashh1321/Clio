@echo off
echo Starting Clio Web Application...

:: Start Backend in a new window
echo Starting Backend...
start "Clio Backend" cmd /k "cd backend && call venv\Scripts\activate.bat && python main.py"

:: Start Frontend in a new window
echo Starting Frontend...
start "Clio Frontend" cmd /k "cd frontend && npm run dev"

echo ====================================================
echo Clio is running!
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo ====================================================
pause