# 🌿 Papyrus Git 전략

> **작성일**: 2024년 12월 29일  
> **버전**: 1.0.0  
> **프로젝트**: Papyrus - 웹 서비스 플랫폼

---

## 📋 목차

1. [브랜치 전략](#브랜치-전략)
2. [브랜치 명명 규칙](#브랜치-명명-규칙)
3. [커밋 메시지 컨벤션](#커밋-메시지-컨벤션)
4. [작업 흐름](#작업-흐름)
5. [버전 관리](#버전-관리)
6. [코드 리뷰](#코드-리뷰)
7. [긴급 상황 대응](#긴급-상황-대응)

---

## 🌳 브랜치 전략

### 핵심 브랜치

```
main (프로덕션)
  ↓
develop (개발 메인)
  ↓
feature/* (기능 개발)
hotfix/* (긴급 수정)
release/* (릴리즈 준비)
```

### 1️⃣ Main 브랜치

- **용도**: 실제 서비스 배포 가능한 안정 버전만 유지
- **보호 규칙**:
  - 직접 푸시 금지
  - PR(Pull Request)을 통해서만 병합
  - 최소 1명의 코드 리뷰 필수
- **병합 조건**:
  - 모든 테스트 통과
  - 코드 리뷰 승인
  - 충돌 없음
- **태그**: 배포 시마다 버전 태그 생성 (`v1.0.0`, `v1.1.0`)
- **중요**: 이 브랜치의 모든 커밋은 배포 가능한 상태여야 함

### 2️⃣ Develop 브랜치

- **용도**: 다음 릴리즈를 위한 개발 중인 최신 코드
- **병합**: 모든 feature 브랜치는 여기로 병합
- **특징**:
  - 기본 개발 브랜치
  - feature 브랜치 생성의 시작점
  - 통합 테스트 수행
- **안정화**: 충분히 테스트된 후 main으로 병합

### 3️⃣ Feature 브랜치

- **용도**: 새로운 기능 개발
- **명명**: `feature/기능명`
- **시작점**: `develop` 브랜치에서 분기
- **병합 대상**: `develop` 브랜치
- **수명**: 기능 개발 완료 후 삭제
- **원칙**:
  - 하나의 기능만 담당
  - 작은 단위로 자주 병합
  - 정기적으로 develop 최신 코드 병합 (충돌 방지)

### 4️⃣ Hotfix 브랜치

- **용도**: 프로덕션 긴급 버그 수정
- **명명**: `hotfix/버그명` 또는 `hotfix/v1.0.1`
- **시작점**: `main` 브랜치에서 분기
- **병합 대상**: `main`과 `develop` 둘 다
- **특징**:
  - 즉시 배포 가능해야 함
  - 버전 번호 PATCH 증가
  - 최소한의 변경만 포함

### 5️⃣ Release 브랜치 (선택)

- **용도**: 릴리즈 준비 (QA, 버그 수정)
- **명명**: `release/v1.0.0`
- **시작점**: `develop` 브랜치에서 분기
- **병합 대상**: `main`과 `develop` 둘 다
- **작업**: 버전 번호 변경, 문서 업데이트, 마이너 버그 수정

---

## 🏷️ 브랜치 명명 규칙

### 기본 형식

```
<type>/<description>
```

### Type별 예시

#### Feature (기능 개발)
```bash
feature/service-manager-ui          # Service Manager UI 개선
feature/package-management          # 패키지 관리 기능
feature/docker-auto-install         # Docker 자동 설치
feature/user-authentication         # 사용자 인증
feature/api-payment-integration     # 결제 API 연동
```

#### Fix (버그 수정)
```bash
fix/port-conflict-detection         # 포트 충돌 감지 버그
fix/docker-stop-issue               # Docker 중지 이슈
fix/memory-leak-api                 # API 메모리 누수
fix/login-validation                # 로그인 검증 오류
```

#### Hotfix (긴급 수정)
```bash
hotfix/security-patch               # 보안 패치
hotfix/critical-crash               # 치명적 크래시
hotfix/v1.0.1                       # 버전 1.0.1 긴급 수정
```

#### Refactor (리팩토링)
```bash
refactor/rename-evolution-to-papyrus  # 프로젝트명 변경
refactor/api-service-layer            # API 서비스 레이어 재구성
refactor/simplify-auth-logic          # 인증 로직 단순화
```

#### Docs (문서)
```bash
docs/update-readme                  # README 업데이트
docs/add-api-documentation          # API 문서 추가
docs/git-strategy                   # Git 전략 문서
```

#### Performance (성능 개선)
```bash
perf/optimize-package-search        # 패키지 검색 최적화
perf/database-query-optimization    # DB 쿼리 최적화
perf/reduce-bundle-size             # 번들 크기 감소
```

#### Test (테스트)
```bash
test/add-docker-tests               # Docker 테스트 추가
test/api-integration-tests          # API 통합 테스트
test/unit-test-coverage             # 유닛 테스트 커버리지
```

#### Chore (기타)
```bash
chore/update-dependencies           # 의존성 업데이트
chore/setup-github-actions          # GitHub Actions 설정
chore/configure-eslint              # ESLint 설정
```

---

## 💬 커밋 메시지 컨벤션

### Conventional Commits 사용

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type (필수)

| Type | 설명 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 추가 | `feat(api): 결제 API 추가` |
| `fix` | 버그 수정 | `fix(auth): 로그인 실패 버그 수정` |
| `docs` | 문서 수정 | `docs(readme): 설치 가이드 추가` |
| `style` | 코드 포맷팅 (기능 변경 없음) | `style(api): 코드 포맷팅 적용` |
| `refactor` | 코드 리팩토링 | `refactor(db): 쿼리 로직 개선` |
| `perf` | 성능 개선 | `perf(api): 응답 속도 30% 향상` |
| `test` | 테스트 추가/수정 | `test(auth): 로그인 테스트 추가` |
| `chore` | 빌드, 설정 파일 수정 | `chore(deps): React 18로 업그레이드` |
| `revert` | 이전 커밋 되돌리기 | `revert: feat(api): 결제 기능 제거` |

### Scope (선택)

```
(service-manager)   Service Manager 관련
(api)               API 서버 관련
(web-admin)         관리자 웹 앱 관련
(web-user)          사용자 웹 앱 관련
(docker)            Docker 관련
(db)                데이터베이스 관련
(deps)              의존성 관련
(ci)                CI/CD 관련
(config)            설정 파일 관련
```

### Subject (필수)

- **50자 이내**로 작성
- 명령형 사용 ("추가함" ❌ → "추가" ✅)
- 마침표 사용 안 함
- 첫 글자 소문자

### Body (선택)

- 상세한 변경 내용 설명
- **왜** 이 변경이 필요한지 설명
- 72자마다 줄바꿈

### Footer (선택)

- 이슈 참조: `Closes #123`, `Fixes #456`
- 브레이킹 체인지: `BREAKING CHANGE: API 응답 형식 변경`

### 커밋 메시지 예시

#### 1. 간단한 커밋
```bash
feat(service-manager): 패키지 검색 기능 추가
```

#### 2. 상세한 커밋
```bash
feat(service-manager): 패키지 상세 정보 모달 추가

- 패키지 클릭 시 상세 정보 표시
- npm view로 실시간 정보 가져오기
- 링크, 라이선스, 키워드 표시
- ESC 키로 모달 닫기 기능 추가

Closes #123
```

#### 3. 여러 변경사항
```bash
feat(service-manager): UI 대폭 개선

주요 변경사항:
- 탭 구조로 서비스/패키지 분리
- 패키지 검색, 필터, 정렬 기능 추가
- 테이블 스크롤 및 정렬 헤더 추가
- 깔끔한 CSS 재작성

성능 개선:
- 패키지 목록 렌더링 최적화
- 검색 디바운싱 적용

Closes #100, #101, #102
```

#### 4. 브레이킹 체인지
```bash
refactor(api)!: 인증 API 응답 형식 변경

기존 { token } 형식에서 { accessToken, refreshToken } 형식으로 변경

BREAKING CHANGE: 
기존 클라이언트는 응답 형식 변경 필요
- response.token → response.accessToken
- refresh token 처리 로직 추가 필요

Migration Guide: docs/MIGRATION_v2.md 참고
```

#### 5. Revert
```bash
revert: feat(api): 결제 API 추가

This reverts commit abc123def456.
테스트 환경에서 오류 발생으로 인한 롤백
```

---

## 🔄 작업 흐름 (Workflow)

### 신규 기능 개발 프로세스

```bash
# 1. 최신 develop 코드 받기
git checkout develop
git pull origin develop

# 2. feature 브랜치 생성
git checkout -b feature/new-awesome-feature

# 3. 작업 및 커밋 (자주 커밋!)
git add .
git commit -m "feat(scope): 기능 설명"

# 4. 중간 푸시 (백업 및 협업)
git push origin feature/new-awesome-feature

# 5. develop 최신 코드 병합 (충돌 방지)
git checkout develop
git pull origin develop
git checkout feature/new-awesome-feature
git merge develop
# 충돌 해결 후
git push origin feature/new-awesome-feature

# 6. 작업 완료 후 PR 생성
# GitHub에서: feature/new-awesome-feature → develop

# 7. 코드 리뷰 및 수정 요청 반영
# ... 리뷰어 피드백에 따라 수정 ...
git add .
git commit -m "fix: 리뷰 피드백 반영"
git push origin feature/new-awesome-feature

# 8. PR 승인 및 병합 (Squash Merge 권장)

# 9. 로컬 브랜치 정리
git checkout develop
git pull origin develop
git branch -d feature/new-awesome-feature
git remote prune origin  # 원격 삭제된 브랜치 정리
```

### 버그 수정 프로세스

```bash
# 1. develop에서 fix 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b fix/bug-description

# 2. 버그 수정 및 커밋
git add .
git commit -m "fix(scope): 버그 설명 및 수정 내용"

# 3. 테스트 추가 (중요!)
git add .
git commit -m "test(scope): 버그 재발 방지 테스트 추가"

# 4. PR 생성 및 병합
# fix/bug-description → develop
```

### 긴급 수정 (Hotfix) 프로세스

```bash
# 1. main에서 hotfix 브랜치 생성
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# 2. 긴급 수정 및 커밋
git add .
git commit -m "hotfix: 긴급 버그 수정 설명"

# 3. 버전 업데이트 (package.json)
# 1.0.0 → 1.0.1
git add package.json
git commit -m "chore: bump version to 1.0.1"

# 4. main으로 PR 생성 및 병합
# hotfix/critical-bug → main

# 5. main에 태그 생성
git checkout main
git pull origin main
git tag -a v1.0.1 -m "Hotfix: 긴급 버그 수정"
git push origin v1.0.1

# 6. develop에도 병합 (중요!)
git checkout develop
git pull origin develop
git merge main
git push origin develop

# 7. 브랜치 정리
git branch -d hotfix/critical-bug
```

### 릴리즈 프로세스

```bash
# 1. develop에서 release 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b release/v1.1.0

# 2. 버전 업데이트
# package.json, CHANGELOG.md 업데이트
git add .
git commit -m "chore: bump version to 1.1.0"

# 3. 릴리즈 노트 작성
git add CHANGELOG.md
git commit -m "docs: update changelog for v1.1.0"

# 4. QA 및 버그 수정
git add .
git commit -m "fix: 릴리즈 전 마이너 버그 수정"

# 5. main으로 PR 생성 및 병합
# release/v1.1.0 → main

# 6. main에 태그 생성
git checkout main
git pull origin main
git tag -a v1.1.0 -m "Release v1.1.0

주요 기능:
- 패키지 관리 시스템 추가
- Docker 자동 설치 기능
- Service Manager UI 개선

버그 수정:
- 포트 충돌 감지 로직 개선
- 메모리 누수 수정"

git push origin v1.1.0

# 7. develop에 병합
git checkout develop
git merge main
git push origin develop

# 8. 브랜치 정리
git branch -d release/v1.1.0
```

---

## 🏷️ 버전 관리

### Semantic Versioning (SemVer)

```
MAJOR.MINOR.PATCH (예: 1.2.3)
  │     │     └─ PATCH: 버그 수정, 하위 호환 가능
  │     └─────── MINOR: 기능 추가, 하위 호환 가능
  └───────────── MAJOR: 큰 변경, 하위 호환 깨짐
```

### 버전 업데이트 기준

| 변경 유형 | 버전 | 예시 |
|-----------|------|------|
| 버그 수정 | PATCH | 1.0.0 → 1.0.1 |
| 기능 추가 (하위 호환) | MINOR | 1.0.0 → 1.1.0 |
| API 변경 (하위 호환 깨짐) | MAJOR | 1.0.0 → 2.0.0 |
| 알파/베타 | Pre-release | 1.0.0-alpha.1 |

### 태그 명명 규칙

```bash
v1.0.0          # 정식 릴리즈
v1.0.0-rc.1     # Release Candidate
v1.0.0-beta.1   # 베타 버전
v1.0.0-alpha.1  # 알파 버전
```

### 태그 생성 예시

```bash
# Annotated Tag (권장 - 메시지 포함)
git tag -a v1.0.0 -m "Release v1.0.0

주요 기능:
- Service Manager 출시
- Docker 통합 관리
- 패키지 관리 시스템

버그 수정:
- 포트 충돌 자동 감지
- 메모리 사용량 최적화"

# Lightweight Tag (간단한 경우)
git tag v1.0.1

# 태그 푸시
git push origin v1.0.0
git push origin --tags  # 모든 태그 푸시
```

---

## 👀 코드 리뷰

### PR 생성 시 체크리스트

- [ ] 브랜치가 최신 develop/main에서 분기되었는가?
- [ ] 커밋 메시지가 컨벤션을 따르는가?
- [ ] 테스트가 모두 통과하는가?
- [ ] 린트/포맷팅 오류가 없는가?
- [ ] 관련 문서가 업데이트되었는가?
- [ ] Breaking Change가 있다면 문서화했는가?
- [ ] 이슈가 연결되어 있는가? (Closes #123)

### 리뷰어 체크리스트

- [ ] 코드가 요구사항을 충족하는가?
- [ ] 코드가 읽기 쉽고 유지보수 가능한가?
- [ ] 에러 처리가 적절한가?
- [ ] 보안 이슈가 없는가?
- [ ] 성능 문제가 없는가?
- [ ] 테스트가 충분한가?
- [ ] 문서가 정확한가?

### PR 크기 가이드

| 크기 | 변경 라인 | 권장 사항 |
|------|-----------|-----------|
| 🟢 Small | < 100 | 이상적 |
| 🟡 Medium | 100-500 | 괜찮음 |
| 🟠 Large | 500-1000 | 분리 고려 |
| 🔴 Huge | > 1000 | 반드시 분리 |

### 리뷰 응답 시간 가이드

- **긴급 (Hotfix)**: 2시간 이내
- **중요**: 1일 이내
- **일반**: 2일 이내

---

## 🚨 긴급 상황 대응

### Hotfix 우선순위

| 우선순위 | 상황 | 대응 시간 |
|----------|------|-----------|
| P0 (긴급) | 서비스 다운, 보안 이슈 | 즉시 |
| P1 (높음) | 주요 기능 장애 | 2시간 이내 |
| P2 (중간) | 부분 기능 장애 | 1일 이내 |
| P3 (낮음) | 마이너 버그 | 다음 릴리즈 |

### Rollback 절차

```bash
# 1. 문제 확인
git log --oneline

# 2. 이전 버전으로 롤백
git checkout v1.0.0  # 안정 버전
git checkout -b hotfix/rollback

# 3. 배포
# CI/CD 파이프라인 트리거

# 4. 원인 분석 및 수정
# 별도 브랜치에서 진행
```

### Revert vs Reset

```bash
# Revert (권장 - 이력 유지)
git revert <commit-hash>
git push origin main

# Reset (주의 - 이력 삭제)
git reset --hard <commit-hash>
git push --force origin main  # 절대 main에 force push 금지!
```

---

## 📚 참고 자료

### Git 학습 자료
- [Git 공식 문서](https://git-scm.com/doc)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

### 브랜치 전략
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [GitLab Flow](https://docs.gitlab.com/ee/topics/gitlab_flow.html)

---

## 🔄 문서 업데이트

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0.0 | 2024-12-29 | 초안 작성 |

---

**작성자**: Papyrus Team  
**최종 수정일**: 2024년 12월 29일

