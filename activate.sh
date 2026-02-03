#!/bin/bash
# WorshipFlow Development Environment Activation Script
# ARM64 Native (M3 optimized)

# Activate conda environment
source /Users/jak4013/miniconda3-arm64/etc/profile.d/conda.sh
conda activate worshipflow

echo "✅ WorshipFlow environment activated!"
echo "   Python: $(python --version)"
echo "   Node.js: $(node --version)"
echo ""
echo "📂 Project directory: $(pwd)"
echo ""
echo "🚀 Quick commands:"
echo "   Backend:  cd backend && uvicorn app.main:app --reload"
echo "   Frontend: cd frontend && npm run dev"
echo "   Tests:    cd backend && pytest tests/ -v"
echo "            cd frontend && npm test"
