# Database Library (libs/db)

공유 가능한 Prisma 데이터베이스 스키마 라이브러리

## 📁 구조

```
libs/db/
└── prisma/
    ├── base.prisma              # Datasource, Generator, 전역 Enum
    ├── build-schema.ts          # 스키마 병합 빌드 스크립트
    ├── run-migrate.ts           # 마이그레이션 실행 스크립트
    │
    ├── common.prisma            # 공통 모델 (Attachment, Tag 등)
    ├── country.prisma           # 국가 관련 모델
    ├── person.prisma            # 인물 관련 모델
    ├── event.prisma             # 이벤트 관련 모델
    ├── military.prisma          # 군사 관련 모델
    ├── economy.prisma           # 경제 관련 모델
    ├── politics.prisma          # 정치 관련 모델
    └── ...                      # 기타 도메인별 스키마
```

## 🎯 목적

### 1. **도메인 분리**
- 6000+ 라인의 단일 스키마 파일을 도메인별로 분리
- 유지보수성 향상 및 가독성 개선
- 팀 협업 시 Git 충돌 최소화

### 2. **재사용성**
- 모노레포 내 여러 앱에서 공유 가능
- 일관된 데이터 모델 유지

### 3. **모듈화**
- 필요한 도메인만 선택적으로 사용 가능 (향후)
- 마이크로서비스 전환 시 용이

## 🔄 빌드 프로세스

### 자동 병합
모든 `.prisma` 파일이 자동으로 병합되어 `apps/api/prisma/schema.prisma`로 생성됩니다.

```typescript
// libs/db/prisma/build-schema.ts
base.prisma → 
common.prisma →
country.prisma →
... (모든 .prisma 파일) →
→ apps/api/prisma/schema.prisma (자동 생성)
```

### 병합 규칙
1. ✅ **base.prisma**가 항상 맨 앞에 위치
2. ✅ 나머지 파일들은 알파벳 순서로 병합
3. ✅ 파일 간 `\n\n`로 구분

## 🚀 사용 방법

### 1. 스키마 수정
도메인별 파일을 직접 수정:

```bash
# 예: 국가 모델 수정
vi libs/db/prisma/country.prisma
```

### 2. 스키마 빌드 및 마이그레이션

```bash
# 방법 1: 스크립트 직접 실행
cd libs/db/prisma
ts-node run-migrate.ts [마이그레이션명]

# 방법 2: npm 스크립트 사용
npm run db:migrate
# 또는
npm run db:build
```

### 3. Prisma Client 재생성

```bash
npm run db:generate
```

## 📝 파일별 역할

### 핵심 파일

#### `base.prisma`
- Datasource 설정 (MySQL 연결)
- Generator 설정 (Prisma Client, ERD)
- 전역 Enum 정의

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  output   = "../../../node_modules/.prisma/client"
}
```

#### `build-schema.ts`
- 모든 `.prisma` 파일을 읽어서 병합
- `apps/api/prisma/schema.prisma` 생성
- 자동 실행 (마이그레이션 전)

#### `run-migrate.ts`
- 스키마 빌드 + 마이그레이션 실행
- 대화형 마이그레이션 이름 입력
- Prisma Client 자동 재생성

### 도메인별 스키마

| 파일 | 설명 |
|------|------|
| `common.prisma` | Tag, Attachment, CategoryPath |
| `country.prisma` | Country, CountryRecord, CountryStatistics |
| `person.prisma` | Person, PersonRelation |
| `event.prisma` | Event, EventCategory, EventPerson |
| `military.prisma` | MilitaryUnit, Weapon, Vehicle |
| `economy.prisma` | Company, Resource, Currency |
| `politics.prisma` | PoliticalParty, GovernmentPosition |
| `geography.prisma` | Continent, AdministrativeDivision |
| `historical.prisma` | HistoricalCountry, Dynasty |
| `society.prisma` | Job, Religion, SocialPhenomenon |
| ... | ... |

## ⚠️ 주의사항

### 1. 생성된 파일 직접 수정 금지
```bash
# ❌ 절대 직접 수정하지 마세요
apps/api/prisma/schema.prisma

# ✅ 대신 소스 파일을 수정하세요
libs/db/prisma/*.prisma
```

### 2. Git 추적
- ✅ **소스 파일만 Git 추적**: `libs/db/prisma/*.prisma`
- ❌ **생성 파일 제외**: `apps/api/prisma/schema.prisma` (.gitignore에 추가)

### 3. 스키마 변경 워크플로우
```bash
1. libs/db/prisma/*.prisma 수정
2. ts-node run-migrate.ts [마이그레이션명]
3. Git 커밋 (소스 파일 + migrations/)
```

## 🔗 관련 파일

- `apps/api/prisma/migrations/` - 마이그레이션 히스토리
- `apps/api/prisma/seed.ts` - 시드 데이터
- `apps/api/prisma/ERD.svg` - ERD 다이어그램 (자동 생성)

## 📚 참고

### Prisma 명령어
```bash
# 스키마 검증
npx prisma validate --schema=apps/api/prisma/schema.prisma

# ERD 재생성
npx prisma generate --schema=apps/api/prisma/schema.prisma

# 마이그레이션 상태 확인
npx prisma migrate status --schema=apps/api/prisma/schema.prisma

# Prisma Studio 실행
npx prisma studio --schema=apps/api/prisma/schema.prisma
```

### 모범 사례

1. **작은 변경은 자주 커밋**
   - 각 도메인 변경사항을 별도 커밋으로

2. **마이그레이션 이름 명명 규칙**
   - `add_user_role_field`
   - `create_event_category_table`
   - `update_country_statistics_index`

3. **스키마 리뷰**
   - 병합 전 `npx prisma validate` 실행
   - ERD 확인으로 관계 검증

## 🎯 향후 개선 계획

- [ ] 선택적 도메인 빌드 지원
- [ ] 스키마 검증 자동화 (pre-commit hook)
- [ ] 타입 안전성 테스트 추가
- [ ] 도메인별 마이그레이션 분리 (옵션)

---

**Built with Prisma + TypeScript in Nx Monorepo**
