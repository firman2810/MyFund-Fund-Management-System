@echo off
rem Starts the Spring Boot backend (port 8080) and the Vite frontend (port 3000) against it, each in its own window.
cd /d "%~dp0"

start "MyFund Backend" cmd /k "cd backend && mvnw.cmd spring-boot:run"
start "MyFund Frontend" cmd /k "cd frontend && set "VITE_USE_MOCK=false" && npm run dev"

echo Backend: http://localhost:8080  Frontend: http://localhost:3000
