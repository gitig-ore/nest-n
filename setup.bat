@echo off
echo 🚀 Starting E-Commerce Authentication System...
echo.

echo 📦 Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo ❌ Backend installation failed
    exit /b 1
)

echo.
echo 🗄️  Setting up database...
call npx prisma migrate dev --name init
if errorlevel 1 (
    echo ❌ Database setup failed
    exit /b 1
)

echo.
echo 🔧 Backend setup complete!
echo.

echo 📦 Installing frontend dependencies...
cd ..\frontend
call npm install
if errorlevel 1 (
    echo ❌ Frontend installation failed
    exit /b 1
)

echo.
echo ✅ Setup complete!
echo.
echo 📝 Next steps:
echo 1. Backend: npm run start:dev (in backend folder)
echo 2. Frontend: npm run dev (in frontend folder)
echo 3. Open http://localhost:3000
echo.
pause
