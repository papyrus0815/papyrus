/**
 * 골든 대조 테스트의 *입력* 픽스처를 실 DB 에서 뜬다.
 *
 * capture-golden.sh 가 골든을 뜬 직후에 이걸 부른다. 둘을 반드시 같이 떠야 하는 이유:
 * 이 DB 는 살아 있다. 실제로 골든 캡처 1시간 만에 account.total_points 가 7185 -> 7205 로
 * 움직였고, 그러면 exchangeableNow 기대값이 718 vs 720 으로 갈려 테스트가 거짓 실패한다.
 *
 * 픽스처 = 시점 T 의 테이블 행, 골든 = 시점 T 의 Nest 응답. 짝이 맞아야 대조가 성립한다.
 * 골든에서 거꾸로 시드하지 않는 것도 같은 이유다 — 그러면 출력으로 입력을 만드는 순환이 된다.
 *
 *   node tools/dump-fixture.js
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../../..');

const env = {};
for (const line of fs.readFileSync(path.join(REPO_ROOT, 'env.development'), 'utf8').split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
}

const mysql = require(path.join(REPO_ROOT, 'node_modules/mysql2/promise'));
const dsn = new URL(env.DATABASE_URL);

const sqlString = (value) =>
  value === null || value === undefined ? 'NULL' : `'${String(value).replace(/'/g, "''")}'`;

/**
 * DATETIME(3) 은 드라이버를 거치지 않고 SQL 의 DATE_FORMAT 으로 문자열을 받는다.
 *
 * JS Date 로 받아 되돌리려던 첫 시도는 16시간이 밀렸다. mysql2 가 세션 TZ(+09:00)로
 * 해석해 instant 를 만들고, 그걸 로컬 게터(이 머신은 PDT)로 다시 벽시계로 바꿨기 때문이다
 * (−9h −7h). DATETIME 에는 오프셋이 없으니 애초에 존 변환을 한 번도 거치지 않는 것이 맞다.
 */
const sqlDateTime = (raw) => (raw ? `'${raw}'` : 'NULL');

(async () => {
  const conn = await mysql.createConnection({
    host: dsn.hostname,
    port: Number(dsn.port),
    user: decodeURIComponent(dsn.username),
    password: decodeURIComponent(dsn.password),
    database: dsn.pathname.slice(1),
  });

  const [accounts] = await conn.query(
    'SELECT id, user_name, grade_code, total_points, display_name, papy_balance FROM account');
  const [ledgers] = await conn.query(
    `SELECT id, account_id, amount, reason, idempotency_key, reversal_of_id, related_item_id,
            actor_account_id,
            DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s.%f') AS created_at_raw
       FROM wallet_ledger ORDER BY created_at ASC`);

  const lines = [
    '-- 자동 생성 — 직접 수정하지 말 것. 갱신은 ./tools/capture-golden.sh (골든과 함께 떠야 한다).',
    '--',
    '-- 골든을 뜬 시점의 실 DB 원본 행이다. 골든 대조 테스트의 *입력*이고 기대값은 golden/*.json 이다.',
    '-- 골든에서 거꾸로 시드하면 출력으로 입력을 만드는 순환이 되므로, 여기 값은 응답이 아니라',
    '-- 테이블 행 그대로여야 한다.',
    '--',
    '-- password_hash 는 실값을 넣지 않는다. 파일럿은 로그인을 구현하지 않아 검증에 쓰이지 않고,',
    '-- 저장소가 공개라 해시를 올릴 이유가 없다.',
    '',
    'SET FOREIGN_KEY_CHECKS = 0;',
    '',
  ];

  for (const account of accounts) {
    lines.push(
      'INSERT INTO `account` (`id`, `hero_id`, `user_name`, `password_hash`, `created_at`, `grade_code`, ' +
      '`total_points`, `representative_person_id`, `display_name`, `papy_balance`) VALUES');
    lines.push(
      `  (${sqlString(account.id)}, NULL, ${sqlString(account.user_name)}, '__fixture_not_a_real_hash__', ` +
      `'2026-01-01 00:00:00.000', ${sqlString(account.grade_code)}, ${account.total_points}, NULL, ` +
      `${sqlString(account.display_name)}, ${account.papy_balance});`);
    lines.push('');
  }

  if (ledgers.length) {
    lines.push(
      'INSERT INTO `wallet_ledger` (`id`, `account_id`, `amount`, `reason`, `idempotency_key`, ' +
      '`reversal_of_id`, `related_item_id`, `actor_account_id`, `created_at`) VALUES');
    lines.push(ledgers.map((row) =>
      `  (${sqlString(row.id)}, ${sqlString(row.account_id)}, ${row.amount}, ${sqlString(row.reason)}, ` +
      `${sqlString(row.idempotency_key)}, ${sqlString(row.reversal_of_id)}, ` +
      `${sqlString(row.related_item_id)}, ${sqlString(row.actor_account_id)}, ` +
      `${sqlDateTime(row.created_at_raw)})`).join(',\n') + ';');
    lines.push('');
  }

  lines.push('SET FOREIGN_KEY_CHECKS = 1;', '');

  const out = path.join(__dirname, '../src/test/resources/db/fixture/wallet-golden-fixture.sql');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, lines.join('\n'));

  console.log(`  픽스처: account ${accounts.length}행 / wallet_ledger ${ledgers.length}행`);
  await conn.end();
})().catch((err) => {
  console.error('픽스처 덤프 실패:', err.message);
  process.exit(1);
});
