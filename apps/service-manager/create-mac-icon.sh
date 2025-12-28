#!/bin/bash

# macOS용 아이콘 생성 스크립트
# PNG 파일을 .icns 파일로 변환합니다

echo "🍎 macOS 아이콘 생성 중..."

# 현재 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# assets 디렉토리 확인
if [ ! -d "assets" ]; then
    echo "❌ assets 디렉토리를 찾을 수 없습니다."
    exit 1
fi

# icon.png 파일 확인
if [ ! -f "assets/icon.png" ]; then
    echo "❌ assets/icon.png 파일을 찾을 수 없습니다."
    exit 1
fi

echo "✅ icon.png 파일 발견: assets/icon.png"

# iconset 디렉토리 생성
ICONSET_DIR="assets/icon.iconset"
mkdir -p "$ICONSET_DIR"

echo "📁 iconset 디렉토리 생성: $ICONSET_DIR"

# 다양한 크기의 아이콘 생성
echo "🔄 다양한 크기의 아이콘 생성 중..."

# macOS에서 필요한 아이콘 크기들
sizes=(
    "16:icon_16x16.png"
    "32:icon_16x16@2x.png"
    "32:icon_32x32.png"
    "64:icon_32x32@2x.png"
    "128:icon_128x128.png"
    "256:icon_128x128@2x.png"
    "256:icon_256x256.png"
    "512:icon_256x256@2x.png"
    "512:icon_512x512.png"
    "1024:icon_512x512@2x.png"
)

# sips 명령어로 아이콘 크기 변환
for size_info in "${sizes[@]}"; do
    IFS=':' read -r size filename <<< "$size_info"
    echo "  📐 ${size}x${size} → $filename"
    
    sips -z "$size" "$size" "assets/icon.png" --out "$ICONSET_DIR/$filename" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "    ✅ 성공"
    else
        echo "    ❌ 실패"
    fi
done

# iconutil로 .icns 파일 생성
echo "🔨 .icns 파일 생성 중..."

iconutil -c icns "$ICONSET_DIR" -o "assets/icon.icns"

if [ $? -eq 0 ]; then
    echo "✅ icon.icns 파일 생성 완료: assets/icon.icns"
    
    # iconset 디렉토리 정리
    rm -rf "$ICONSET_DIR"
    echo "🧹 임시 파일 정리 완료"
    
    # 파일 크기 확인
    file_size=$(ls -lh "assets/icon.icns" | awk '{print $5}')
    echo "📊 파일 크기: $file_size"
    
else
    echo "❌ .icns 파일 생성 실패"
    exit 1
fi

echo ""
echo "🎉 macOS 아이콘 생성 완료!"
echo "   📁 위치: assets/icon.icns"
echo "   💡 이제 macOS 앱에서 사용할 수 있습니다."
echo ""
