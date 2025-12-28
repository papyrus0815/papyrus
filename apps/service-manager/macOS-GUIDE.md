# 🍎 macOS 사용 가이드

## 빠른 시작

### 1. 설치
```bash
cd apps/service-manager
./setup.sh
```

### 2. 실행
```bash
./start.sh
```

### 3. 사용
- 상단 메뉴바에서 Evolution 아이콘 확인
- 아이콘 우클릭 → "GUI 열기"
- "모두 시작" 버튼 클릭

## 필요한 소프트웨어

- **Node.js**: `brew install node`
- **Docker Desktop**: https://www.docker.com/products/docker-desktop

## 문제 해결

- **권한 오류**: `chmod +x *.sh`
- **Docker 오류**: Docker Desktop 실행 확인
- **아이콘 안 보임**: 상단 메뉴바 확인

## 파일 구조

- `start.sh` - 실행 스크립트
- `setup.sh` - 설치 스크립트  
- `create-mac-icon.sh` - 아이콘 생성
- `assets/icon.icns` - macOS 아이콘
