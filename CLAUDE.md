# Claude Code 작업 가이드 (Papyrus)

이 파일은 Claude Code 세션 시작 시 자동 로드됩니다. 팀 공통 규칙·컨벤션을 여기에 둡니다.

## Prisma 스키마

**`apps/api/prisma/schema.prisma`는 머지 결과물 — 직접 수정 금지.**

- 소스: `libs/db/prisma/*.prisma` (도메인별 분리 — 예: `person.prisma`, `government.prisma`, `event.prisma` 등)
- 머지 빌드: `npm run db:build` (내부적으로 `libs/db/prisma/build-schema.ts` 실행)
- 마이그레이션: `ts-node libs/db/prisma/run-migrate.ts <name>` — 빌드 + `prisma migrate dev` + `prisma generate` 통합
- `migrations/` 디렉토리에 SQL 파일 손으로 만들지 말 것 (도구로 `--create-only` 생성 후 필요 시 백필 UPDATE만 추가)

자세한 설명은 `libs/db/prisma/SCHEMA_SOURCE_OF_TRUTH.md` 참고.

**자주 실수하는 포인트**: `apps/api/prisma/schema.prisma`만 고치고 `db:build`를 돌리면 소스 파일(`libs/db/prisma/*.prisma`)이 덮어써 변경 내용이 사라짐. 반드시 소스 파일부터 수정할 것.

## SDK 재생성

- DTO·컨트롤러 변경 후: `npm run build:nestia` (루트에서)
- 생성 위치: `apps/api/src/api/functional/`
- 프론트에서 직접 import하지 않고 `apps/web-admin/src/shared/api/` 래퍼를 경유하는 패턴이 다수 — 래퍼도 함께 업데이트
