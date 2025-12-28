# 패키지 업데이트 시 발생한 문제 및 해결

## 문제 상황

2024-12-28 업데이트 시 발생한 의존성 충돌:

```
npm error ERESOLVE unable to resolve dependency tree
npm error peer @nestjs/common@"^8.0.0 || ^9.0.0 || ^10.0.0 || ^11.0.0" from @nestjs/jwt@11.0.2
```

## 원인 분석

### 호환성 문제가 있는 메이저 업데이트

다음 패키지들의 메이저 버전 업데이트가 호환성 문제를 야기:

| 패키지 | 기존 | 시도 | 문제 |
|--------|------|------|------|
| @prisma/client | ^6.13.0 | ^7.2.0 | Breaking changes, 스키마 마이그레이션 필요 |
| @nestia/core | ^7.3.1 | ^10.0.0 | 큰 API 변경 |
| typia | ^9.6.0 | ^11.0.0 | 타입 검증 로직 변경 |
| vite | ^6.3.5 | ^7.3.0 | 플러그인 호환성 문제 |
| @nx/* | 21.4.0 | 22.3.3 | 워크스페이스 구조 변경 |
| @types/node | 24.1.0 | 25.0.3 | Node.js 타입 변경 |
| uuid | ^11.1.0 | ^13.0.0 | API 변경 |
| globby | ^14.1.0 | ^16.1.0 | ESM 전용 |

## 해결 방법

### 1. 안전한 업데이트 버전 (적용됨)

메이저 업데이트를 제외하고 마이너/패치 업데이트만 적용:

```json
{
  "dependencies": {
    "@prisma/client": "^6.13.0",     // 7.x 제외
    "uuid": "^11.1.0",                // 13.x 제외
    "zustand": "^5.0.9"               // 5.x 유지
  },
  "devDependencies": {
    "@nestia/core": "^7.3.1",         // 10.x 제외
    "@types/node": "24.1.0",          // 25.x 제외
    "typia": "^9.6.0",                // 11.x 제외
    "vite": "^6.3.5",                 // 7.x 제외
    "globby": "^14.1.0"               // 16.x 제외 (ESM 전용)
  }
}
```

### 2. 설치 방법

```bash
# 기존 node_modules 제거
rm -rf node_modules package-lock.json

# 재설치
npm install --legacy-peer-deps
```

## 메이저 업데이트 로드맵

향후 단계별로 메이저 버전 업데이트를 진행해야 합니다:

### Phase 1: Prisma 7.x (우선순위: 높음)

```bash
# 1. Prisma CLI 업데이트
npm install -D prisma@latest @prisma/client@latest

# 2. 마이그레이션 검토
npx prisma migrate diff --from-schema-datasource ./prisma/schema.prisma

# 3. 코드 변경사항 확인
# - 변경된 API 확인
# - 타입 변경 대응

# 4. 테스트
npm run db:generate
npm run build:api
npm test
```

**Breaking Changes:**
- Client API 변경
- 쿼리 메서드 시그니처 변경
- 타입 생성 방식 변경

### Phase 2: Nx 22.x (우선순위: 중간)

```bash
# Nx 마이그레이션 실행
npx nx migrate latest
npx nx migrate --run-migrations
```

**Breaking Changes:**
- 프로젝트 구조 변경
- 플러그인 설정 변경
- 캐시 전략 변경

### Phase 3: Vite 7.x (우선순위: 중간)

```bash
npm install -D vite@latest @vitejs/plugin-react@latest
```

**Breaking Changes:**
- 플러그인 API 변경
- Dev server 설정 변경
- Build 출력 구조 변경

### Phase 4: 기타 메이저 업데이트 (우선순위: 낮음)

- **nestia 10.x**: API 검증 로직 변경
- **typia 11.x**: 타입 변환 로직 변경
- **globby 16.x**: ESM 전용으로 변경 (require() 불가)
- **uuid 13.x**: 경미한 API 변경

## 권장 업데이트 전략

### 1. 테스트 브랜치 생성

```bash
git checkout -b feat/package-updates
```

### 2. 한 번에 하나씩

각 메이저 업데이트를 별도 커밋으로:

```bash
# Prisma 7.x 업데이트
git commit -m "chore: upgrade Prisma to 7.x"

# Nx 22.x 업데이트
git commit -m "chore: upgrade Nx to 22.x"
```

### 3. 각 단계마다 테스트

```bash
npm run lint
npm run build:api
npm run build:web
npm test
npm run dev:all  # 수동 테스트
```

### 4. 문제 발견 시 롤백

```bash
git revert HEAD
npm install
```

## 현재 상태 (2024-12-28)

### ✅ 적용된 업데이트

- **마이너/패치 업데이트**: 모두 적용
- **React**: 19.1.1 → 19.2.3
- **NestJS**: 11.1.5 → 11.2.2
- **TanStack Query**: 5.83.0 → 5.90.12
- **Nx**: 21.3.9 → 22.3.3

### ⏸️ 보류된 메이저 업데이트

- **Prisma**: 6.x (7.x 보류)
- **Nestia/Typia**: 현재 버전 유지
- **Vite**: 6.x (7.x 보류)
- **uuid**: 11.x (13.x 보류)
- **@types/node**: 24.x (25.x 보류)

## 참고 문서

- [Prisma 7.x Migration Guide](https://www.prisma.io/docs/guides/upgrade-guides)
- [Nx 22.x Migration Guide](https://nx.dev/recipes/adopting-nx/migration-introduction)
- [Vite 7.x Changelog](https://github.com/vitejs/vite/blob/main/packages/vite/CHANGELOG.md)

---

**다음 단계**: 스테이징 환경에서 Prisma 7.x 마이그레이션 테스트

