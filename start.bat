@echo off
chcp 65001 >nul
title WITNESS Launcher

echo Starting WITNESS Backend (port 5001)...
start "WITNESS Backend" cmd /k "cd /d %~dp0backend && C:\Users\test_dev\miniconda3\python.exe app.py"
REM start "WITNESS Backend" cmd /k "cd /d %~dp0backend && D:\Users\liang\anaconda3\python.exe app.py"

timeout /t 2 /nobreak >nul

echo Starting WITNESS Frontend (port 5173)...
start "WITNESS Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo Both services launched.
echo   Backend:  http://localhost:5001
echo   Frontend: http://localhost:5173
echo.
