#!/bin/bash

# Project launcher script for 456
PROJECT_DIR="/Users/billwu/Desktop/AI agent/Claude code/System/Projects/456"
cd "$PROJECT_DIR"
clear

echo "========================================="
echo "  Project: 456"
echo "  Model: claude-opus-4-6"
echo "========================================="
echo ""
echo "📂 Working directory:"
pwd
echo ""

# Start backend server (port 3001)
echo "🚀 啟動後端 / Starting backend server..."
(cd "$PROJECT_DIR/server" && npm run dev &) 2>/dev/null

# Start frontend server (port 5173)
echo "🚀 啟動前端 / Starting frontend server..."
(cd "$PROJECT_DIR/client" && npm run dev &) 2>/dev/null

# Wait for servers to start
sleep 3

# Open browser
echo "🌐 開啟瀏覽器 / Opening browser..."
open http://localhost:5173

echo ""
echo "✅ 前後端已啟動 / Frontend & backend started"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo ""

exec claude --model opus
