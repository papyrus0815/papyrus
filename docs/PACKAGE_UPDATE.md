# 패키지 업데이트 가이드

## 개요

이 문서는 Papyrus 프로젝트의 의존성 패키지를 최신 버전으로 업데이트하는 방법을 설명합니다.

## 🔄 업데이트 방법

### 방법 1: 자동 업데이트 스크립트 사용 (권장)

```bash
# 업데이트 스크립트 실행
node scripts/update-packages.js
```

이 스크립트는 다음 작업을 수행합니다:
1. ✅ package.json 백업 생성
2. ✅ 업데이트 가능한 패키지 확인
3. ✅ package.json 자동 업데이트
4. ✅ 선택적으로 npm install 실행

### 방법 2: 수동 업데이트

```bash
# 1. npm-check-updates 설치 (전역)
npm install -g npm-check-updates

# 2. 업데이트 가능한 패키지 확인
ncu

# 3. package.json 업데이트
ncu -u

# 4. 의존성 설치
npm install
```

### 방법 3: 특정 패키지만 업데이트

```bash
# 특정 패키지만 최신 버전으로
npm install <package-name>@latest

# 예시
npm install @nestjs/common@latest
npm install react@latest react-dom@latest
```

## 📋 최근 주요 업데이트 (2024년 12월)

### Dependencies

| 패키지 | 이전 버전 | 현재 버전 | 변경 사항 |
|--------|-----------|-----------|-----------|
| @nestjs/common | ^11.1.5 | ^11.2.2 | 마이너 업데이트 |
| @nestjs/core | ^11.1.5 | ^11.2.2 | 마이너 업데이트 |
| @nestjs/config | ^4.0.2 | ^4.1.4 | 마이너 업데이트 |
| class-validator | ^0.14.2 | ^0.15.0 | 마이너 업데이트 |
| cookie-parser | ^1.4.6 | ^1.4.7 | 패치 업데이트 |
| zustand | ^4.5.2 | ^5.0.3 | 메이저 업데이트 ⚠️ |

### DevDependencies

| 패키지 | 이전 버전 | 현재 버전 | 변경 사항 |
|--------|-----------|-----------|-----------|
| @nx/* | 21.3.9 | 21.4.0 | 패치 업데이트 |
| nx | 21.3.9 | 21.4.0 | 패치 업데이트 |

## ⚠️ 주의사항

### 메이저 버전 업데이트

다음 패키지는 메이저 버전이 변경되었으므로 주의가 필요합니다:

#### zustand (^4.5.2 → ^5.0.3)
- **변경사항**: API 변경 가능성
- **확인 필요**: 
  - Store 생성 방법
  - Middleware 사용법
  - TypeScript 타입 정의
- **문서**: https://github.com/pmndrs/zustand/releases

### 호환성 확인

업데이트 후 다음 사항을 확인하세요:

```bash
# 1. 린트 검사
npm run lint

# 2. 타입 체크
npx tsc --noEmit

# 3. 빌드 테스트
npm run build:api
npm run build:web

# 4. 테스트 실행
npm test
```

## 🔍 업데이트 전 체크리스트

- [ ] 현재 브랜치가 최신 상태인지 확인
- [ ] 변경사항이 커밋되었는지 확인
- [ ] package.json 백업 생성
- [ ] CHANGELOG 확인 (메이저 업데이트의 경우)
- [ ] 로컬에서 테스트 환경 구축

## 🚀 업데이트 후 작업

### 1. 설치 및 빌드

```bash
# 의존성 설치
npm install

# 빌드 테스트
npm run build:api
npm run build:web
```

### 2. 개발 서버 테스트

```bash
# API 서버 실행
npm run serve:api

# 웹 애플리케이션 실행
npm run serve:web-admin
npm run serve:web-user
```

### 3. 기능 테스트

주요 기능들이 정상 작동하는지 확인:
- [ ] 로그인/로그아웃
- [ ] API 호출
- [ ] 데이터베이스 연결
- [ ] 파일 업로드
- [ ] 실시간 기능

### 4. 커밋

```bash
# package.json과 package-lock.json 커밋
git add package.json package-lock.json
git commit -m "chore: update dependencies to latest versions"

# 또는 더 상세하게
git commit -m "chore: update dependencies

- Update NestJS to 11.2.2
- Update Nx to 21.4.0
- Update zustand to 5.0.3 (breaking changes)
- Update other minor dependencies
"
```

## 📚 추가 리소스

### 패키지 버전 확인

```bash
# 현재 설치된 버전 확인
npm list <package-name>

# 특정 패키지의 최신 버전 확인
npm view <package-name> version

# 모든 버전 확인
npm view <package-name> versions
```

### 의존성 트리 확인

```bash
# 전체 의존성 트리
npm list

# 특정 깊이까지만
npm list --depth=1
```

### 보안 취약점 확인

```bash
# 보안 감사
npm audit

# 자동 수정 (가능한 경우)
npm audit fix

# 강제 수정 (주의!)
npm audit fix --force
```

## 🔧 문제 해결

### node_modules 재설치

```bash
# node_modules와 package-lock.json 삭제
rm -rf node_modules package-lock.json

# 재설치
npm install
```

### 캐시 클리어

```bash
# npm 캐시 클리어
npm cache clean --force

# Nx 캐시 클리어
npx nx reset
```

### 백업 복원

```bash
# 업데이트 전 백업으로 복원
cp package.json.backup package.json
npm install
```

## 📊 업데이트 주기

### 권장 주기

- **패치 업데이트**: 매주 (보안 패치 포함)
- **마이너 업데이트**: 매월
- **메이저 업데이트**: 분기별 또는 필요시

### 자동화

CI/CD 파이프라인에 Dependabot 또는 Renovate Bot을 설정하여 자동으로 PR 생성:

```yaml
# .github/dependabot.yml 예시
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

## 📝 변경 로그

업데이트 시 변경 사항을 기록하세요:

```markdown
### 2024-12-28
- Updated NestJS from 11.1.5 to 11.2.2
- Updated Nx from 21.3.9 to 21.4.0
- Updated zustand from 4.5.2 to 5.0.3 (breaking changes)
- Updated minor dependencies
```

---

**중요**: 프로덕션 배포 전 반드시 스테이징 환경에서 충분히 테스트하세요!

