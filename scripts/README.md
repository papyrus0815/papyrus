# Papyrus 프로젝트 스크립트 시스템

이 프로젝트는 복잡한 스크립트들을 체계적으로 관리하기 위해 별도의 스크립트 시스템을 사용합니다.

## 📁 구조

```
scripts/
├── run.js              # 메인 스크립트 실행기
├── utils/
│   └── common.js       # 공통 유틸리티 함수
├── database/           # Prisma 데이터베이스 관련
│   ├── build.js
│   ├── migrate.js
│   ├── generate.js
│   └── reset.js
├── build/              # 빌드 관련
│   ├── nestia.js
│   ├── api.js
│   └── web.js
├── development/        # 개발 환경 관련
│   ├── serve-api.js
│   ├── serve-web.js
│   └── dev.js
├── docker/             # Docker 관련
│   └── up.js
├── lint/               # 린트 관련
│   ├── check.js
│   └── fix.js
├── infrastructure/     # 인프라 관련
│   ├── nginx-generate.js
│   └── ssl-generate.js
└── environment/        # 환경 설정 관련
    ├── dev.js
    └── prod.js
```

## 🚀 사용법

### 1. 직접 스크립트 실행기 사용

```bash
# 기본 사용법
node scripts/run.js <category>/<script> [options]

# 예시
node scripts/run.js database/build
node scripts/run.js development/serve-web --network
node scripts/run.js lint/check --api
```

### 2. npm 스크립트 사용 (단축키)

```bash
# 개발 환경
npm run dev                    # 개발 환경 시작
npm run dev:nginx             # Nginx와 함께 개발 환경 시작
npm run serve:api             # API 서버만 시작
npm run serve:web             # 웹 서버만 시작
npm run serve:web:network     # 네트워크 접근 가능한 웹 서버
npm run serve:web:tunnel      # 터널링 가능한 웹 서버

# 빌드
npm run build:api             # API 빌드
npm run build:web             # 웹 빌드
npm run build:nestia          # Nestia API 빌드

# 데이터베이스
npm run db:build              # Prisma 스키마 빌드
npm run db:migrate            # 데이터베이스 마이그레이션
npm run db:generate           # Prisma 클라이언트 생성
npm run db:reset              # 데이터베이스 리셋

# Docker
npm run docker:up             # Docker 컨테이너 시작
npm run docker:up:env         # 환경 설정과 함께 Docker 시작
npm run docker:up:https       # HTTPS와 함께 Docker 시작

# 린트
npm run lint                  # 전체 린트 검사
npm run lint:fix              # 린트 자동 수정
npm run lint:api              # API만 린트 검사
npm run lint:web              # 웹만 린트 검사

# 환경 설정
npm run env:dev               # 개발 환경 설정 적용
npm run env:prod              # 프로덕션 환경 설정 적용

# 인프라
npm run ssl:generate          # SSL 인증서 생성
npm run ssl:generate:simple   # 간단한 SSL 인증서 생성
npm run nginx:generate        # Nginx 설정 생성
```

### 3. 도움말 보기

```bash
# 사용 가능한 모든 스크립트 목록 보기
node scripts/run.js --help
npm run script -- --help
```

## ✨ 장점

### 1. **체계적인 구조**

- 기능별로 스크립트가 분류되어 관리가 용이
- 각 스크립트가 독립적인 파일로 분리되어 유지보수 편리

### 2. **재사용성**

- 공통 유틸리티 함수를 통해 코드 중복 제거
- 다른 스크립트에서 함수 형태로 재사용 가능

### 3. **확장성**

- 새로운 카테고리나 스크립트 추가가 쉬움
- 복잡한 로직도 별도 파일에서 관리 가능

### 4. **일관성**

- 모든 스크립트가 동일한 패턴과 유틸리티 사용
- 에러 처리와 로깅이 일관됨

### 5. **유연성**

- CLI 옵션을 통해 다양한 실행 모드 지원
- npm 스크립트와 직접 실행 모두 지원

## 🔧 스크립트 추가하기

새로운 스크립트를 추가하려면:

1. 적절한 카테고리 폴더에 `.js` 파일 생성
2. 공통 유틸리티 함수 사용
3. `package.json`에 단축 스크립트 추가 (선택사항)

예시:

```javascript
#!/usr/bin/env node

const { runCommand, success, error } = require('../utils/common')

async function main(options = {}) {
  try {
    console.log('🚀 새로운 작업 시작...')
    await runCommand('your-command', ['args'])
    success('작업 완료')
  } catch (err) {
    error('작업 실패')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = main
```

## 🐛 문제 해결

스크립트 실행 중 문제가 발생하면:

1. 스크립트 경로가 올바른지 확인
2. 필요한 의존성이 설치되어 있는지 확인
3. 환경 변수가 올바르게 설정되어 있는지 확인
4. `--help` 옵션으로 사용법 확인
