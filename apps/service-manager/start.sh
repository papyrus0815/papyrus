#!/bin/bash

# Papyrus Service Manager - macOS 실행 스크립트
# 맥에서 Papyrus 서비스 매니저를 실행합니다

echo "🍎 Papyrus Service Manager (macOS)"
echo "=================================="

# 현재 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📁 작업 디렉토리: $SCRIPT_DIR"

# Node.js 설치 확인
if ! command -v node &> /dev/null; then
    echo "❌ Node.js가 설치되지 않았습니다."
    echo "   Homebrew로 설치: brew install node"
    exit 1
fi

# npm 설치 확인
if ! command -v npm &> /dev/null; then
    echo "❌ npm이 설치되지 않았습니다."
    exit 1
fi

echo "✅ Node.js 버전: $(node --version)"
echo "✅ npm 버전: $(npm --version)"

# 의존성 설치 확인
if [ ! -d "node_modules" ]; then
    echo "📦 의존성 설치 중..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 의존성 설치 실패"
        exit 1
    fi
    echo "✅ 의존성 설치 완료"
fi

# 프로젝트 루트 설정
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
export PAPYRUS_PROJECT_ROOT="$PROJECT_ROOT"

echo "📁 프로젝트 루트: $PROJECT_ROOT"

# Docker 설치 확인
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker가 설치되지 않았습니다."
    echo "   Docker Desktop for Mac을 설치하세요: https://www.docker.com/products/docker-desktop"
    echo "   또는 Homebrew로 설치: brew install --cask docker"
    echo ""
    echo "   Docker 없이도 일부 기능은 사용할 수 있습니다."
    echo ""
fi

# 빌드 및 실행
echo "🔨 빌드 중..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 빌드 실패"
    exit 1
fi

echo "✅ 빌드 완료"
echo ""
echo "🚀 Papyrus Service Manager 시작 중..."
echo "   시스템 트레이에서 아이콘을 확인하세요!"
echo ""

# GUI 모드로 실행 (콘솔 창 숨김)
echo "🚀 GUI 모드로 실행 중..."
npm run build && npx electron . --no-console
