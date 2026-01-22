#!/bin/bash

echo "🚀 Starting E-Commerce Authentication System..."

# Backend
echo "📦 Installing backend dependencies..."
cd backend
npm install

echo "🗄️  Setting up database..."
npx prisma migrate dev --name init

echo "🔧 Backend setup complete!"
echo ""

# Frontend
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Backend: npm run start:dev (in backend folder)"
echo "2. Frontend: npm run dev (in frontend folder)"
echo "3. Open http://localhost:3000"
