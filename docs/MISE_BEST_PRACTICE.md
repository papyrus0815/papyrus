# mise.toml Best Practice 가이드

이 문서는 Papyrus 프로젝트를 위한 mise.toml Best Practice를 설명합니다.

## 현재 설정 vs Best Practice

### 현재 `.mise.toml` (기본)
```toml
[tools]
node = "24.1.0"
```

### Best Practice `.mise.toml` (고급)

Best Practice 설정은 다음을 포함합니다:

1. **런타임 및 도구 버전 관리** - Node.js, Python 등
2. **환경 변수 설정** - 프로젝트 전역 환경 변수
3. **태스크 정의** - 자주 사용하는 명령어 단축키
4. **설정 옵션** - mise 동작 방식 커스터마이징

## 주요 개선 사항

### 1. 환경 변수 관리 (`[env]`)

```toml
[env]
NODE_ENV = "development"
DATABASE_URL = "mysql://papyrus:papyrus@localhost:3307/papyrus"
PROJECT_ROOT = "{{ config_root }}"  # mise가 자동으로 프로젝트 루트 경로 설정
```

**장점:**
- 환경 변수를 코드베이스에 명시적으로 관리
- `.env` 파일 대신 또는 함께 사용 가능
- 템플릿 변수 지원 (`{{ config_root }}` 등)

### 2. 태스크 정의 (`[tasks.*]`)

```toml
[tasks.dev]
description = "개발 서버 시작"
run = "npm run dev"

[tasks.setup]
description = "프로젝트 초기 설정"
depends = ["install", "db:generate"]

[tasks.start]
run = [
  "mise run docker:up",
  "mise run db:migrate", 
  "mise run dev"
]
```

**사용 방법:**
```bash
# 단일 태스크 실행
mise run dev
mise run db:migrate

# 복합 태스크 실행 (여러 태스크 순차 실행)
mise run setup

# 별칭 사용
mise run d    # dev 태스크 실행
mise run s    # start 태스크 실행
```

**장점:**
- 긴 명령어를 짧게 단축
- 프로젝트 표준 워크플로우 문서화
- 여러 명령어를 하나로 조합
- 의존성 관리 (depends)

### 3. 설정 옵션 (`[settings]`)

```toml
[settings]
auto_install = true              # 디렉토리 진입 시 자동 설치
legacy_version_file = true       # .nvmrc 등 레거시 파일 지원
experimental = true              # 실험적 기능 사용
```

**장점:**
- mise 동작 방식 커스터마이징
- 팀원 온보딩 자동화

### 4. 별칭 (`[alias]`)

```toml
[alias]
d = "dev"
s = "start"
b = "build:all"
```

**사용:**
```bash
mise run d    # mise run dev와 동일
```

## 실제 사용 예시

### 새 팀원 온보딩

```bash
# 1. 프로젝트 클론
git clone https://github.com/your-repo/papyrus.git
cd papyrus

# 2. mise 설치 (한 번만)
brew install mise
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
source ~/.zshrc

# 3. 프로젝트 설정 (자동으로 Node.js 설치됨)
mise trust
mise run setup    # 의존성 설치 + DB 설정

# 4. 개발 시작
mise run start    # Docker + DB + Dev 서버 모두 시작
```

### 일상적인 개발

```bash
# 개발 서버 시작
mise run dev

# 특정 서비스만 시작
mise run dev:api
mise run dev:admin

# 데이터베이스 작업
mise run db:migrate
mise run db:reset
mise run db:studio

# 린트 및 테스트
mise run lint
mise run test

# 빌드
mise run build:all
```

### 환경 체크

```bash
# 시스템 헬스체크
mise run health

# mise 상태 확인
mise doctor

# 설치된 도구 확인
mise ls
```

## Best Practice 적용 방법

### 옵션 1: 기존 `.mise.toml` 대체

```bash
# 백업
cp .mise.toml .mise.toml.backup

# Best Practice 버전으로 교체
cp .mise.toml.example .mise.toml
```

### 옵션 2: 점진적 적용

기존 `.mise.toml`에 필요한 섹션만 추가:

```toml
# 기존
[tools]
node = "24.1.0"

# 자주 사용하는 태스크만 추가
[tasks.dev]
run = "npm run dev"

[tasks.setup]
depends = ["install", "db:generate"]
```

## 주의사항

### 환경 변수 우선순위

1. 셸 환경 변수 (최우선)
2. `.env` 파일
3. `.mise.toml` [env] 섹션
4. 시스템 기본값

### 민감한 정보

프로덕션 비밀 정보는 `.mise.toml`에 저장하지 마세요:

```toml
# ❌ 나쁜 예
[env]
JWT_SECRET = "my-super-secret-key"  # Git에 커밋됨!

# ✅ 좋은 예
[env]
JWT_SECRET = "{{ env.JWT_SECRET }}"  # 셸 환경 변수 참조
```

또는 `.mise.local.toml` 사용 (gitignore에 추가):

```bash
# .gitignore
.mise.local.toml
```

## 추가 리소스

- [mise 공식 문서 - Tasks](https://mise.jdx.dev/tasks/)
- [mise 공식 문서 - Environment Variables](https://mise.jdx.dev/environments.html)
- [mise 공식 문서 - Settings](https://mise.jdx.dev/configuration.html#settings)

## 팀 권장사항

1. **기본 설정**: 모든 팀원이 동일한 `.mise.toml` 사용
2. **로컬 오버라이드**: 개인 설정은 `.mise.local.toml` 사용
3. **문서화**: 새 태스크 추가 시 description 작성
4. **점진적 도입**: 한 번에 모든 기능을 사용하지 말고 필요한 것부터 추가

