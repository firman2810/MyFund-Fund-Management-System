@echo off
rem Starts MyFund: the Hyperledger Fabric network (in WSL), then the Spring Boot backend (port 8080)
rem and the Vite frontend (port 3000), each in its own window. The backend refuses to start without the network.
cd /d "%~dp0"

echo Starting the Fabric network in WSL (Ubuntu). The first run downloads images and takes a few minutes...
wsl -d Ubuntu --cd "%~dp0smart-contract" ./network.sh up
if errorlevel 1 (
  echo.
  echo The Fabric network did not start. Check that Docker Desktop is running, then see README.md.
  pause
  exit /b 1
)

start "MyFund Backend" cmd /k "cd backend && .\mvnw.cmd spring-boot:run"
start "MyFund Frontend" cmd /k "cd frontend && npm run dev"

echo Backend: http://localhost:8080  Frontend: http://localhost:3000
