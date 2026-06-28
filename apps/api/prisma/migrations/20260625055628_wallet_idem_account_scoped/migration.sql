-- 멱등 키를 계정별로 격리(uniq([account_id, idempotency_key])) — 서로 다른 계정이
-- 우연히 같은 requestId를 써도 충돌하지 않게. wallet_ledger는 비어있어 안전.

-- DropIndex
DROP INDEX `wallet_ledger_idempotency_key_key` ON `wallet_ledger`;

-- CreateIndex
CREATE UNIQUE INDEX `wallet_ledger_account_id_idempotency_key_key` ON `wallet_ledger`(`account_id`, `idempotency_key`);
