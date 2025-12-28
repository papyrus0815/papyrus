# Papyrus

역사적 사건 및 관계 관리 시스템

## 📋 목차

- [프로젝트 개요](#프로젝트-개요)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [시작하기](#시작하기)
- [개발 가이드](#개발-가이드)
- [스크립트](#스크립트)
- [환경 설정](#환경-설정)
- [문서](#문서)

## 🎯 프로젝트 개요

Papyrus는 역사적 사건, 인물, 관계를 체계적으로 관리하고 시각화하는 시스템입니다.

### 주요 기능
- 역사적 사건 관리 및 시각화
- 인물 및 조직 관계 추적
- 시계열 기반 이벤트 관리
- 관리자 대시보드
- 사용자 포털

## 🛠 기술 스택

### Frontend
- **React 19** - UI 라이브러리
- **TypeScript** - 타입 안전성
- **Vite** - 빌드 도구
- **TanStack Query** - 서버 상태 관리
- **Redux Toolkit** - 클라이언트 상태 관리
- **React Router v7** - 라우팅
- **Tailwind CSS** - 스타일링
- **Tiptap** - 리치 텍스트 에디터

### Backend
- **NestJS** - Node.js 프레임워크
- **Prisma** - ORM
- **MySQL** - 데이터베이스
- **Nestia** - NestJS 최적화 도구
- **JWT** - 인증

### DevOps
- **Nx** - 모노레포 관리
- **Docker** - 컨테이너화
- **Nginx** - 웹 서버/리버스 프록시
- **mise** - 개발 환경 관리

## 📁 프로젝트 구조

```
papyrus/
├── apps/
│   ├── api/              # NestJS API 서버
│   ├── web-admin/        # 관리자 웹 애플리케이션
│   ├── web-user/         # 사용자 웹 애플리케이션
│   └── service-manager/  # Electron 서비스 관리자
│
├── libs/
│   ├── api-sdk/          # API SDK
│   └── db/               # 데이터베이스 스키마
│
├── docker/               # Docker 설정
│   ├── mysql/            # MySQL 초기화 스크립트
│   └── nginx/            # Nginx 설정
│
├── docs/                 # 프로젝트 문서
├── scripts/              # 빌드/개발 스크립트
├── k8s/                  # Kubernetes 배포 설정
└── memory/               # 프로젝트 헌장 및 메모리
```

## 🚀 시작하기

### 필수 요구사항
- **Node.js** 24.1.0 (mise로 자동 관리)
- **Docker** & **Docker Compose**
- **mise** (개발 환경 관리)

### 1. mise 설치 및 설정

```bash
# macOS
brew install mise

# 셸 설정 추가 (~/.zshrc 또는 ~/.bashrc)
eval "$(mise activate zsh)"  # zsh
eval "$(mise activate bash)" # bash

# 셸 재시작
source ~/.zshrc
```

### 2. 프로젝트 설정

```bash
# 저장소 클론
git clone <repository-url>
cd papyrus

# mise 설정 신뢰 (최초 1회)
mise trust

# Node.js 자동 설치 및 활성화
mise install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 수정하여 필요한 값 설정

# 의존성 설치
npm install
```

### 3. 데이터베이스 설정

```bash
# Docker로 MySQL 실행
npm run docker:up

# Prisma 마이그레이션 및 시드
npm run db:migrate
npm run db:generate
```

### 4. 개발 서버 실행

```bash
# 전체 개발 서버 실행 (API + Admin + User)
npm run dev:all

# 또는 개별 실행
npm run serve:api          # API 서버
npm run serve:web-admin    # 관리자 웹
npm run serve:web-user     # 사용자 웹
```

### 접속 주소
- API: http://localhost:8000
- Admin Web: http://localhost:4200
- User Web: http://localhost:3000

## 💻 개발 가이드

### 코드 스타일

프로젝트는 ESLint, Prettier, EditorConfig를 사용하여 일관된 코드 스타일을 유지합니다.

```bash
# 코드 검사
npm run lint

# 자동 수정
npm run lint:fix
```

**주요 규칙:**
- 한 글자 변수명 금지 (예외: i, j, _, id, fs, db)
- Nx 모듈 경계 규칙 준수
- import 순서 자동 정렬

### 데이터베이스 작업

```bash
# Prisma 스키마 변경 후 마이그레이션 생성
npm run db:migrate

# Prisma Client 재생성
npm run db:generate

# 데이터베이스 초기화
npm run db:reset
```

### API SDK 생성

```bash
# Nestia SDK 생성
npm run build:nestia
```

## 📜 스크립트

### 개발
```bash
npm run dev              # 통합 개발 환경 실행
npm run dev:nginx        # Nginx 포함 개발 환경
npm run serve:api        # API 서버만 실행
npm run serve:web-admin  # 관리자 웹만 실행
npm run serve:web-user   # 사용자 웹만 실행
```

### 빌드
```bash
npm run build:api        # API 빌드
npm run build:web        # 웹 애플리케이션 빌드
npm run build:nestia     # Nestia SDK 생성
```

### 데이터베이스
```bash
npm run db:build         # 전체 DB 빌드
npm run db:migrate       # 마이그레이션 실행
npm run db:generate      # Prisma Client 생성
npm run db:reset         # DB 초기화 및 시드
```

### Docker
```bash
npm run docker:up        # Docker 컨테이너 시작
npm run docker:up:env    # 환경 변수 포함 시작
npm run docker:up:https  # HTTPS 포함 시작
```

### 린트
```bash
npm run lint             # 전체 검사
npm run lint:fix         # 자동 수정
npm run lint:api         # API만 검사
npm run lint:web         # 웹만 검사
```

### 인프라
```bash
npm run ssl:generate     # SSL 인증서 생성
npm run nginx:generate   # Nginx 설정 생성
```

## ⚙️ 환경 설정

### 환경 변수

프로젝트는 여러 환경 파일을 지원합니다:

- `.env.example` - 환경 변수 템플릿 (버전 관리)
- `env.development` - 개발 환경 설정
- `env.production` - 프로덕션 환경 설정
- `.env` - 로컬 환경 설정 (버전 관리 제외)

### 주요 환경 변수

```bash
# 데이터베이스
DATABASE_URL="mysql://user:password@localhost:3307/papyrus"

# JWT 인증
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="30d"

# 서버 설정
API_PORT=8000
WEB_PORT=3000

# CORS
CORS_ORIGIN=*
```

자세한 내용은 `.env.example` 파일을 참조하세요.

## 📚 문서

프로젝트 관련 상세 문서는 `docs/` 디렉토리에 있습니다:

- [MISE_SETUP.md](./docs/MISE_SETUP.md) - mise 개발 환경 설정
- [DOCKER_INSTALLATION.md](./docs/DOCKER_INSTALLATION.md) - Docker 설치 가이드
- [DOCKER_BUILD.md](./docs/DOCKER_BUILD.md) - Docker 이미지 빌드 및 배포
- [PACKAGE_UPDATE.md](./docs/PACKAGE_UPDATE.md) - 패키지 업데이트 가이드
- [NESTIA_SDK_USAGE.md](./docs/NESTIA_SDK_USAGE.md) - Nestia SDK 사용법
- [SSL_TROUBLESHOOTING.md](./docs/SSL_TROUBLESHOOTING.md) - SSL 문제 해결
- [REFACTORING_GUIDE.md](./docs/REFACTORING_GUIDE.md) - 리팩토링 가이드
- [CONSTITUTION.md](./docs/CONSTITUTION.md) - 프로젝트 헌장

## 🔐 로그인 유지 (세션 지속)

개발 환경에서 로그인 상태를 새로고침 후에도 유지하기 위해 쿠키 기반 세션을 사용합니다.

### 서버 (API)
- `cookie-parser` 사용 및 CORS 설정
- 인증 쿠키 발급: `access_token`, `refresh_token`
- 개발: SameSite=Lax, Secure=false
- 프로덕션: SameSite=None, Secure=true

### 클라이언트 (Web)
- Axios 설정: `withCredentials: true`
- Vite 프록시로 `/auth`, `/account`, `/v1` 요청 처리
- 라우터 로더에서 자동 토큰 재발급

### 동작 확인
```bash
# 개발 서버 실행
npm run dev:all

# DevTools → Network 확인:
# - POST /auth/login 응답에 Set-Cookie 2개
# - GET /auth/session → { hasAccessCookie: true }
# - GET /account/me → 200 OK
```

### 트러블슈팅
- **CORS 에러**: `VITE_API_URL` 제거, 상대 경로 사용
- **401 에러**: 쿠키 설정 확인, 프록시 동작 확인
- **쿠키 없음**: 보안 프로그램/프록시 확인

## 🤝 기여하기

프로젝트 기여를 환영합니다! 다음 단계를 따라주세요:

1. 이슈 확인 또는 새로운 이슈 생성
2. Feature 브랜치 생성 (`git checkout -b feature/AmazingFeature`)
3. 변경사항 커밋 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 푸시 (`git push origin feature/AmazingFeature`)
5. Pull Request 생성

## 📄 라이선스

이 프로젝트의 라이선스는 [LICENSE](./LICENSE) 파일을 참조하세요.

---

**Built with ❤️ using Nx Monorepo**
