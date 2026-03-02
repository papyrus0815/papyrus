# P3009 실패 마이그레이션 해결

`20260228215613_add_membership_is_leading_member` 가 실패한 상태이므로 먼저 해결해야 합니다.

## 방법 A: 실패한 마이그레이션을 "이미 적용됨"으로 표시 (권장)

DB에 해당 변경이 이미 반영되어 있거나, 수동으로 적용할 때 사용합니다.

### 1) 컬럼 존재 여부 확인 (선택)

```sql
-- MySQL
SHOW COLUMNS FROM historical_country_membership LIKE 'is_leading_member';
```

- **컬럼이 이미 있으면**: 아래 2단계만 실행하면 됩니다.
- **컬럼이 없으면**: 아래 2단계 전에 다음 SQL을 DB에서 실행한 뒤 2단계를 실행하세요.

```sql
ALTER TABLE `historical_country_membership` ADD COLUMN `is_leading_member` BOOLEAN NULL DEFAULT false;
```

### 2) 실패한 마이그레이션을 "적용됨"으로 표시

```bash
cd /Users/yendoo/dev/papyrus
npx prisma migrate resolve --applied "20260228215613_add_membership_is_leading_member" --schema=apps/api/prisma/schema.prisma
```

### 3) 새 마이그레이션 적용

```bash
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

---

## 방법 B: "롤백됨"으로 표시 후 다시 적용

실패한 마이그레이션을 롤백된 것으로 표시한 뒤, `deploy`로 다시 적용합니다.

```bash
cd /Users/yendoo/dev/papyrus
npx prisma migrate resolve --rolled-back "20260228215613_add_membership_is_leading_member" --schema=apps/api/prisma/schema.prisma
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

- `is_leading_member` 컬럼이 이미 있으면 이 마이그레이션 재실행 시 "duplicate column" 오류가 날 수 있습니다. 그 경우 방법 A를 사용하세요.
