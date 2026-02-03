#!/bin/bash

# WorshipFlow Setup Script

echo "🎵 WorshipFlow 설치를 시작합니다..."

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3이 설치되어 있지 않습니다."
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js가 설치되어 있지 않습니다."
    exit 1
fi

echo "✅ Python 3 및 Node.js가 확인되었습니다."

# Create .env if not exists
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 .env 파일이 생성되었습니다. ANTHROPIC_API_KEY를 설정해주세요."
fi

# Backend setup
echo "🔧 Backend 설정 중..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create data directory
mkdir -p ../data

# Seed database
echo "🌱 데이터베이스 시드 중..."
cd ..
python -m backend.app.seed

# Frontend setup
echo "🔧 Frontend 설정 중..."
cd frontend
npm install
cd ..

echo ""
echo "✅ 설치가 완료되었습니다!"
echo ""
echo "🚀 실행 방법:"
echo ""
echo "1. Backend 실행 (터미널 1):"
echo "   cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo ""
echo "2. Frontend 실행 (터미널 2):"
echo "   cd frontend && npm run dev"
echo ""
echo "3. 브라우저에서 http://localhost:3000 접속"
echo ""
echo "⚠️  .env 파일에 ANTHROPIC_API_KEY를 설정해야 AI 기능을 사용할 수 있습니다."
