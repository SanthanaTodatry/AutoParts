# Autoparts VIN Processing Application Setup
# Run these commands in your terminal

# 1. Create main project directory
mkdir autoparts-app
cd autoparts-app

# 2. Create project structure
mkdir backend
mkdir frontend
mkdir database
mkdir exports
mkdir uploads

# 3. Install n8n globally
npm install -g n8n

# 4. Setup Backend (Node.js + Express)
cd backend
npm init -y

# Install backend dependencies
npm install express cors axios sqlite3 multer dotenv
npm install --save-dev nodemon

# 5. Setup Frontend (React)
cd ../frontend
npx create-react-app .
npm install axios

# 6. Return to project root
cd ..

echo "✅ Project structure created!"
echo "Next steps:"
echo "1. Start n8n: n8n start"
echo "2. Start backend: cd backend && npm run dev"
echo "3. Start frontend: cd frontend && npm start"