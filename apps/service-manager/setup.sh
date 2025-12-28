#!/bin/bash

# Papyrus Service Manager - macOS 설정 스크립트
# 맥에서 Papyrus 서비스 매니저를 설정합니다

echo "🍎 Papyrus Service Manager 설정 (macOS)"
echo "========================================"

# 현재 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📁 작업 디렉토리: $SCRIPT_DIR"

# Node.js 설치 확인 및 안내
if ! command -v node &> /dev/null; then
    echo "❌ Node.js가 설치되지 않았습니다."
    echo ""
    echo "📦 Node.js 설치 방법:"
    echo "   1. Homebrew 사용: brew install node"
    echo "   2. 공식 사이트: https://nodejs.org/"
    echo ""
    read -p "Node.js를 설치한 후 Enter를 눌러주세요..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js 설치를 확인할 수 없습니다. 다시 시도해주세요."
        exit 1
    fi
fi

echo "✅ Node.js 버전: $(node --version)"

# npm 설치 확인
if ! command -v npm &> /dev/null; then
    echo "❌ npm이 설치되지 않았습니다."
    exit 1
fi

echo "✅ npm 버전: $(npm --version)"

# 의존성 설치
echo "📦 의존성 설치 중..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 의존성 설치 실패"
    exit 1
fi

echo "✅ 의존성 설치 완료"

# Docker 설치 확인 및 안내
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker가 설치되지 않았습니다."
    echo ""
    echo "🐳 Docker 설치 방법:"
    echo "   1. Docker Desktop for Mac: https://www.docker.com/products/docker-desktop"
    echo "   2. Homebrew: brew install --cask docker"
    echo ""
    echo "   Docker는 MySQL과 Nginx 컨테이너 실행에 필요합니다."
    echo ""
    read -p "Docker를 설치한 후 Enter를 눌러주세요..."
fi

# 빌드
echo "🔨 빌드 중..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 빌드 실패"
    exit 1
fi

echo "✅ 빌드 완료"

# 데스크톱 바로가기 생성
echo "🖥️  데스크톱 바로가기 생성 중..."

DESKTOP_PATH="$HOME/Desktop"
APP_NAME="Papyrus Service Manager"

# macOS용 .app 번들 생성 (선택사항)
echo "📱 macOS 앱 번들 생성 중..."

# 간단한 앱 번들 구조 생성
APP_BUNDLE_PATH="$DESKTOP_PATH/$APP_NAME.app"
APP_CONTENTS_PATH="$APP_BUNDLE_PATH/Contents"
APP_MACOS_PATH="$APP_CONTENTS_PATH/MacOS"

mkdir -p "$APP_MACOS_PATH"

# Info.plist 생성
cat > "$APP_CONTENTS_PATH/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>Papyrus Service Manager</string>
    <key>CFBundleIdentifier</key>
    <string>com.papyrus.service-manager</string>
    <key>CFBundleName</key>
    <string>Papyrus Service Manager</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>CFBundleIconFile</key>
    <string>icon</string>
</dict>
</plist>
EOF

# 실행 스크립트 생성
cat > "$APP_MACOS_PATH/Papyrus Service Manager" << EOF
#!/bin/bash
cd "$SCRIPT_DIR"
./start.sh
EOF

chmod +x "$APP_MACOS_PATH/Papyrus Service Manager"

# 아이콘 복사 (있는 경우)
if [ -f "assets/icon.png" ]; then
    cp "assets/icon.png" "$APP_CONTENTS_PATH/icon.png"
fi

echo "✅ 데스크톱 바로가기 생성 완료: $APP_BUNDLE_PATH"

# 자동 시작 설정 안내
echo ""
echo "🚀 자동 시작 설정:"
echo "   1. Papyrus Service Manager 앱을 실행하세요"
echo "   2. 시스템 트레이에서 아이콘을 우클릭하세요"
echo "   3. '설정' → '시작 프로그램에 등록'을 선택하세요"
echo ""

# 완료 메시지
echo "🎉 설정 완료!"
echo ""
echo "📋 사용 방법:"
echo "   1. 데스크톱의 'Papyrus Service Manager' 앱을 실행하거나"
echo "   2. 터미널에서 './start.sh' 실행"
echo ""
echo "   3. 시스템 트레이(상단 메뉴바)에서 Papyrus 아이콘 확인"
echo "   4. 아이콘 우클릭 → 'GUI 열기'"
echo "   5. '모두 시작' 버튼 클릭"
echo ""
echo "💡 팁:"
echo "   - 시스템 트레이 아이콘이 보이지 않으면 상단 메뉴바를 확인하세요"
echo "   - Docker Desktop이 실행 중이어야 MySQL과 Nginx가 정상 작동합니다"
echo ""

read -p "설정이 완료되었습니다. Enter를 눌러 종료하세요..."
