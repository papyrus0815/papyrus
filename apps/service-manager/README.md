# Papyrus Service Manager 🎮

**독립 실행형 Papyrus 게임 서버 관리 도구**

---

## 🚀 빠른 시작

### 🪟 Windows 사용자

#### 1️⃣ 처음 사용 (1회만)

```bash
cd apps/service-manager
setup.bat
```

→ 바탕화면 바로가기 + 자동시작 등록

#### 2️⃣ 실행

- **바탕화면 아이콘** 더블클릭
- 또는 `start.bat` 실행

#### 3️⃣ 사용

1. **시스템 트레이** (우측 하단) → ▲ 클릭
2. Papyrus 아이콘 **우클릭** → **"GUI 열기"**
3. **"모두 시작"** 버튼 클릭
4. 완료! 🎉

### 🍎 macOS 사용자

#### 1️⃣ 처음 사용 (1회만)

```bash
cd apps/service-manager
./setup.sh
```

→ 데스크톱 앱 생성 + 자동시작 설정 안내

#### 2️⃣ 실행

- **데스크톱의 "Papyrus Service Manager" 앱** 더블클릭
- 또는 터미널에서 `./start.sh` 실행

#### 3️⃣ 사용

1. **시스템 트레이** (상단 메뉴바) → Papyrus 아이콘 확인
2. Papyrus 아이콘 **우클릭** → **"GUI 열기"**
3. **"모두 시작"** 버튼 클릭
4. 완료! 🎉

---

## 📋 관리 가능 서비스

- 🐳 Docker Desktop
- 🗄️ MySQL Database
- 🌐 Nginx Web Server
- 🎮 Papyrus API (포트 8000)
- 🌍 Papyrus Web (포트 3000)

---

## 🎯 주요 기능

### GUI 대시보드 ✨

- **실시간 서비스 상태** 모니터링
  - 서비스별 실행 시간 표시
  - 포트 정보 실시간 확인
- **개별/전체 서비스** 제어
  - 개별 시작/중지/재시작
  - 전체 일괄 제어
- **실시간 로그** (서비스별 탭 분리)
  - 전체 / API / Web / Docker / System
  - 자동 로그 분류 및 색상 구분
- **API/SDK 빌드** 원클릭
- **웹 브라우저** 바로 열기
- **2025 트렌디 디자인** 🎨
  - 글래스모피즘 + 그라데이션
  - 부드러운 애니메이션
  - 심플하고 직관적인 UI
  - 현대적인 색상 팔레트
  - 반응형 마이크로 인터랙션

### 키보드 단축키 ⌨️

- `Ctrl + R` - 상태 새로고침
- `Ctrl + L` - 현재 콘솔 지우기
- `Ctrl + 1~5` - 콘솔 탭 전환
- `ESC` - 모달 닫기

### 트레이 메뉴

- 백그라운드 실행
- 빠른 시작/중지/재시작
- 실시간 상태 확인
- 자동 시작 설정

---

## 📁 파일 구조

```
service-manager/
├─ src/              # 소스 코드
├─ dist/             # 빌드 결과
├─ assets/           # 아이콘 (Windows: .ico, macOS: .icns)
├─ start.bat         # Windows 실행 ⭐
├─ start.sh          # macOS 실행 ⭐
├─ setup.bat         # Windows 설치
├─ setup.sh          # macOS 설치
├─ create-mac-icon.sh # macOS 아이콘 생성
└─ README.md         # 이 파일
```

---

## ❓ 문제 해결

### 트레이 아이콘이 안 보여요

**Windows:**
```
작업 표시줄 우측 하단 → ▲ (숨겨진 아이콘) 클릭
```

**macOS:**
```
상단 메뉴바 우측에서 Papyrus 아이콘 확인
```

### 한글이 깨져요

**Windows:** `start.bat` 사용 (자동 UTF-8 설정)

**macOS:** 터미널 인코딩이 UTF-8로 설정되어 있는지 확인

### 서비스가 시작 안 돼요

GUI에서 실시간 로그 확인 → 에러 메시지 확인

### API 서버 502 에러

1. service-manager에서 "API 시작" 클릭
2. API 탭에서 실시간 로그 확인
3. 포트 8000 상태 확인

### macOS 특별 사항

- **Docker Desktop**: Docker Desktop for Mac이 실행 중이어야 함
- **권한 문제**: 터미널에서 실행 시 권한 확인 (`chmod +x *.sh`)
- **Node.js**: Homebrew로 설치 권장 (`brew install node`)

---

## 🔧 명령어

### Windows

```bash
# 실행
start.bat

# 설치
setup.bat

# 빌드
npm run build

# 개발 모드
npm run dev
```

### macOS

```bash
# 실행
./start.sh

# 설치
./setup.sh

# 빌드
npm run build

# 개발 모드
npm run dev

# macOS 아이콘 생성
./create-mac-icon.sh
```

---

## 💡 팁

1. **자동 시작 설정** → PC 켤 때 자동 실행
2. **GUI 로그 탭 활용** → 서비스별 로그 분리
3. **개별 재시작** → 문제 서비스만 재시작

---

## 🎨 최근 업데이트

### v1.1.0 (2025) - macOS 지원 추가! 🍎

- 🍎 **macOS 완전 지원**
  - macOS용 실행 스크립트 (`start.sh`, `setup.sh`)
  - macOS용 아이콘 생성 도구 (`create-mac-icon.sh`)
  - macOS용 데스크톱 앱 번들 생성
  - Docker Desktop for Mac 호환성
- 📖 **문서 개선**
  - Windows/macOS 사용법 분리
  - 플랫폼별 문제 해결 가이드
  - 크로스 플랫폼 명령어 정리

### v1.0.1 (2025)

- ✨ **트렌디한 UI 대폭 개선**
  - 글래스모피즘 + 그라데이션 디자인
  - 부드러운 애니메이션 및 트랜지션
  - 현대적인 색상 팔레트 (Indigo, Purple 계열)
  - 마이크로 인터랙션 추가
- ⌨️ **키보드 단축키 지원**
  - Ctrl+R, Ctrl+L, Ctrl+1~5, ESC
- 🎯 **UX 개선**
  - 더 큰 서비스 아이콘 (38px → 48px)
  - 향상된 상태 배지 디자인
  - 개선된 버튼 호버 효과
  - 커스텀 스크롤바
- 🔔 **자동 알림**
  - 서비스 상태 변경 시 자동 알림
  - 페이지 재활성화 시 자동 새로고침

### v1.0.0

- ✅ **서비스별 독립 콘솔** (전체/API/Web/Docker/System)
- ✅ **실시간 로그 자동 분류**
- ✅ **파일 구조 정리** (20개 파일 정리)

---

**이제 게임을 즐기세요!** 🎮✨
