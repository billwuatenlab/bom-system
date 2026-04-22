#!/bin/bash
# BOM System Platform — 啟動腳本 / Startup Script
# 專案 456

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=========================================="
echo "  BOM 系統平台啟動中..."
echo "  BOM System Platform starting..."
echo "=========================================="

# Start backend server
echo "▸ 啟動後端 / Starting backend (port 3001)..."
cd "$PROJECT_DIR/server"
npx tsx src/index.ts &
SERVER_PID=$!

# Wait for server to be ready
sleep 2

# Start frontend dev server
echo "▸ 啟動前端 / Starting frontend (port 5173)..."
cd "$PROJECT_DIR/client"
npm run dev &
CLIENT_PID=$!

echo ""
echo "=========================================="
echo "  BOM 系統已啟動 / System started"
echo "  前端 / Frontend:  http://localhost:5173"
echo "  後端 / Backend:   http://localhost:3001"
echo "=========================================="
echo ""
echo "按 Ctrl+C 停止所有服務 / Press Ctrl+C to stop"

# Handle cleanup
trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit" INT TERM
wait
