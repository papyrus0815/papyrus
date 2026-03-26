# Prisma 스키마 소스 원칙

**`apps/api/prisma/schema.prisma`는 병합 결과물입니다. 여기를 직접 수정하지 마세요.**

- 소스: **`libs/db/prisma/*.prisma`** (도메인별 분리)
- 병합 후 생성: `npm run db:build` (내부적으로 `libs/db/prisma/build-schema.ts` 실행)
- 마이그레이션: `libs/db/prisma/run-migrate.ts` 또는 팀 워크플로에 맞게 실행 — **`migrations/`에 SQL 파일을 손으로 만들지 말 것** (스키마만 고치고 도구로 생성)

자세한 설명은 상위 [`../README.md`](../README.md)를 참고하세요.

---

**For agents / developers:** Never hand-edit `apps/api/prisma/schema.prisma`. Edit `libs/db/prisma/*.prisma`, then run `npm run db:build`.
