# 마이그레이션 체크섬 불일치 복구

**에러:** `The migration 20260208202551_add_show_position_info_to_government_tenure was modified after it was applied.`

이미 적용된 마이그레이션 파일이 수정되어 Prisma가 체크섬 불일치를 감지한 경우입니다.

## 복구 방법

### 1) 체크섬 수정 (DB만 업데이트)

개발 DB에 접속해서 아래 SQL을 실행하세요.

```bash
# MySQL CLI 예시 (env.development의 MYSQL_* 값 사용)
mysql -h localhost -P 3307 -u <user> -p papyrus < apps/api/prisma/migrations/repair-checksum.sql
```

또는 DB 클라이언트에서 `repair-checksum.sql` 내용을 직접 실행:

```sql
UPDATE _prisma_migrations
SET checksum = 'c32325577adcce9b264e3030dd7ef9805f2d21d21b251702238bcbeac920c1da'
WHERE migration_name = '20260208202551_add_show_position_info_to_government_tenure';
```

### 2) 이후 마이그레이션 실행

복구 후 키워드 마이그레이션을 적용하려면:

```bash
npm run db:migrate
# 또는
npx prisma migrate dev --name add_event_keywords --schema=apps/api/prisma/schema.prisma
```

---

**주의:** `repair-checksum.sql`은 개발 환경에서만 사용하세요. 적용된 마이그레이션 파일을 되돌릴 수 있다면, 파일을 원래 내용으로 복구한 뒤 체크섬 수정 없이 사용하는 것이 더 안전합니다.
