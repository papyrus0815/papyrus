#!/bin/bash

# Evolution Service Manager - macOS GUI 전용 실행 (Dock 표시)
# Dock에 아이콘이 표시되도록 실행합니다

echo "🍎 Evolution Service Manager GUI (Dock 표시)"
echo "=========================================="

# 현재 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📁 작업 디렉토리: $SCRIPT_DIR"

# 프로젝트 루트 설정
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
export EVOLUTION_PROJECT_ROOT="$PROJECT_ROOT"

echo "📁 프로젝트 루트: $PROJECT_ROOT"

# 의존성 확인
if [ ! -d "node_modules" ]; then
    echo "📦 의존성 설치 중..."
    npm install
fi

# 빌드
echo "🔨 빌드 중..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 빌드 실패"
    exit 1
fi

echo "✅ 빌드 완료"
echo ""
echo "🚀 GUI 실행 중 (Dock에 표시됨)..."

# macOS에서 Dock 표시 모드로 실행
export ELECTRON_DISABLE_SECURITY_WARNINGS=true
export ELECTRON_SHOW_DOCK=true

# GUI 모드로 실행 (Dock에 표시)
npx electron . --no-console --disable-dev-shm-usage
