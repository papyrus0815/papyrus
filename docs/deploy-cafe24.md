# 카페24 VPS 배포 런북 (Papyrus)

작성 2026-08-06. 대상 = 카페24 **가상서버호스팅(VPS)**, RAM 2GB / 디스크 40GB / 트래픽 500GB.
범위 = NestJS API(`apps/api`) + React 어드민(`apps/web-admin`)을 한 도메인에서 서빙 + 로컬 MySQL 데이터 이관.

---

## 0. 결론 먼저

| 항목 | 판정 |
|---|---|
| 카페24 일반 웹호스팅(공유) | **불가**. 실행환경이 PHP/Python/Perl뿐이고 Node 런타임 항목 자체가 없음. 약관상 "기본 포트 외 데몬 점유"가 이용정지 사유 |
| 카페24 VPS(현재 보유) | **가능**. 단 2GB RAM 때문에 **서버에서 빌드는 불가** → 하이브리드 배포 |
| 카페24 클라우드/서버호스팅 | 가능. 서버 빌드까지 하려면 6~8GB 티어 필요 |

### 2GB에서 왜 서버 빌드가 안 되나

측정된 빌드 피크 메모리:

- `nx build api` (tspc 전체 트랜스파일) — **약 2.2GB**
- `vite build` (web-admin) — **약 1.8GB**

여기에 MySQL 8(기본 innodb buffer pool 128MB + 오버헤드)과 Node 런타임이 같은 2GB를 나눠 쓴다. swap을 4GB 붙이면 "언젠가는 끝나는" 수준은 되지만, 매 배포마다 수십 분 스래싱을 감수해야 한다.

### 채택 방식 — 하이브리드

| 어디서 | 무엇을 |
|---|---|
| **맥(로컬)** | `build:nestia` → `build:api` → `vite build` → 산출물 rsync |
| **서버** | `npm ci`(리눅스 바이너리) · `db:build` · `prisma migrate deploy` · `prisma generate` · 실행 |

산출물(`dist/apps/api`, `apps/web-admin/dist`)은 순수 JS/정적파일이라 플랫폼 독립적이다.
반대로 `node_modules`는 **절대 rsync하면 안 된다** — 현재 맥에는 `@nx/nx-darwin-arm64`, `@swc/core-darwin-arm64`, `@esbuild/darwin-arm64`, `@rollup/rollup-darwin-arm64`, `lightningcss-darwin-arm64`, `@tailwindcss/oxide-darwin-arm64`만 깔려 있다.

> `npm ci --omit=dev` 도 금지다. `@nestia/core`와 `typia`가 devDependencies인데 컴파일된 컨트롤러가 런타임에 `require`한다. `--omit=dev`로 깔면 첫 요청이 아니라 **부팅 시점에** MODULE_NOT_FOUND로 죽는다.

---

## 1. 먼저 정해야 할 결정 2건

### 결정 A — HTTPS를 쓸 것인가 (권장: 쓴다)

`apps/api/src/libs/shared/config/config.service.ts:66-79`:

```ts
secure: isProduction,
sameSite: isProduction ? 'none' : 'lax',
```

`NODE_ENV=production`이면 인증 쿠키가 `Secure; SameSite=None`으로 나간다. **HTTP로 접속하면 브라우저가 이 쿠키를 통째로 버려서 로그인이 성립하지 않는다.**

- **A-1 (권장)** — certbot으로 Let's Encrypt 발급. 무료, 10분, 소스 0줄 변경. 도메인이 이미 있으니 추가 비용 없음.
  - 카페24 무료 SSL Basic은 **웹호스팅 전용**이라 VPS에는 적용되지 않는다. certbot이 정답 경로.
- **A-2** — HTTP 유지. `config.service.ts`의 위 두 줄을 `secure: false`, `sameSite: 'lax'`로 바꿔야 한다. 프론트와 API가 같은 오리진이므로 `lax`로 충분하다. 대신 로그인 자격증명과 세션 쿠키가 평문으로 오간다.

이 문서는 **A-1 기준**으로 쓰였다. A-2를 택하면 20단계를 건너뛰고 위 두 줄을 수정한다.

### 결정 B — `/api` 프리픽스를 누가 붙이나 (권장: nginx)

API에는 `setGlobalPrefix`가 없다. 라우트가 `/health`, `/auth/*`, `/uploads/*`처럼 루트 직속이다.

- **B-1 (권장)** — nginx가 벗긴다. `proxy_pass http://127.0.0.1:8000/;` 의 **끝 슬래시**가 `/api/`를 제거한다. 소스 0줄.
- **B-2** — `main.ts`에 `app.setGlobalPrefix('api')` 추가하고 nginx는 끝 슬래시 없이 `proxy_pass http://127.0.0.1:8000;`.

**둘을 동시에 하면 업스트림에 `/api/api/...`가 도착한다.** 반드시 택1.

---

## 2. 배포 전 코드 수정 (로컬에서, 커밋 대상)

### 2-1. vite.config.ts API 주소 하드코딩 제거 — **필수**

`apps/web-admin/vite.config.ts:31-34` 현재:

```ts
'import.meta.env.VITE_API_BASE_URL':
  mode === 'production'
    ? JSON.stringify('http://localhost:8000')   // ← 프로덕션 빌드가 localhost를 굽는다
    : JSON.stringify(process.env.VITE_API_BASE_URL || ''),
```

수정:

```ts
'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
  process.env.VITE_API_BASE_URL ?? '',
),
```

이걸 안 고치면 프로덕션 빌드 결과물이 사용자 브라우저에서 `http://localhost:8000`을 호출한다.

### 2-2. (결정 A-2를 택한 경우만) 쿠키 설정

`config.service.ts:66-79` → `secure: false`, `sameSite: 'lax'`.

### 2-3. 추적 중인 env 파일 정리 — **필수**

```
100644  .env.development     # 개발 DB 자격증명 + 개발 JWT_SECRET
120000  env.development      # → .env.development 심볼릭 링크
100644  env.production       # 전부 플레이스홀더 (your-domain.com, your_strong_password …)
```

셋 다 git에 추적된다. 문제는 유출보다 **오작동**이다 — `prisma.config.ts:6-12`가 `env.development`가 존재하면 **최우선으로** 로드한다:

```ts
const envPath = path.join(__dirname, 'env.development')
if (fs.existsSync(envPath)) { config({ path: envPath }) } else { config() }
```

서버에서 clone하면 이 심볼릭 링크가 그대로 따라와서, `prisma migrate deploy`가 개발 DB(`localhost:3307`)를 가리킨다. 7단계에서 반드시 삭제한다.

`env.production`은 실제 비밀값이 아니라 플레이스홀더이므로 유출 사고는 아니지만, **그대로 배포하면 CORS가 `your-domain.com`만 허용해서 실도메인이 차단된다**. 서버 `.env`는 8단계에서 손으로 새로 쓴다.

---

## 3. 서버 준비 (Ubuntu 22.04)

카페24 VPS 라인업에 Ubuntu 24.04는 없다(24.04는 오픈클로 VPS 전용). **22.04 LTS** 선택.

### 3-1. 방화벽 — 2단 구조

카페24는 **콘솔 방화벽 + OS 방화벽**이 따로 논다. 콘솔만 열고 OS를 안 열면(또는 반대) 안 된다.

1. 카페24 콘솔: `나의 서비스 관리 > 서버관리 > 방화벽 관리`
2. OS: ufw

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

- **8000은 열지 않는다.** API는 `BIND_HOST=127.0.0.1`로 루프백만 바인딩하고 nginx가 프록시한다.
- 80은 certbot HTTP-01 챌린지 때문에 A-1에서 필수.
- 22를 특정 IP로 제한할 거면 집 IP가 유동인지 먼저 확인(락아웃 주의).
- 개통 직후 기본 정책이 deny-all인지 allow인지는 카페24 문서끼리 엇갈린다. **콘솔 실화면에서 눈으로 확인할 것.**

### 3-2. swap — 2GB 티어에서는 사실상 필수

```bash
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

> 카페24 VPS의 가상화 방식(KVM / OpenVZ)이 공개돼 있지 않다. OpenVZ 계열이면 swapfile 생성이 막힌다. `swapon`이 실패하면 하이브리드 배포(서버 빌드 안 함)라 치명적이진 않지만, MySQL 튜닝(3-4)을 더 조여야 한다.

### 3-3. Node 24 + nginx

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs nginx build-essential
node -v    # v24.x
```

Node 24 기준 근거: `.mise.toml`의 `node="24"`, `Dockerfile`의 `node:24-alpine`. 하한은 prisma 7.3.0의 `^20.19 || ^22.12 || >=24.0`. `package.json`에 `engines`도 `.nvmrc`도 없으므로 24로 고정하는 게 안전하다.

### 3-4. MySQL 8 — 2GB에 맞게 조인다

**MySQL 8.0 이상이 하드 요구사항**이다(마이그레이션에 `ROW_NUMBER()` 사용). 카페24 DB호스팅 상품에서 독립 MySQL 8 제공 여부는 확인되지 않았으므로, VPS에 직접 설치한다.

```bash
sudo apt-get install -y mysql-server
mysql --version    # 8.0.x
```

`/etc/mysql/mysql.conf.d/mysqld.cnf`의 `[mysqld]`에 추가:

```ini
default-time-zone = '+09:00'
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
innodb_buffer_pool_size = 384M
performance_schema = OFF
```

`performance_schema = OFF`는 2GB에서 약 200MB를 되찾아준다.

```bash
sudo systemctl restart mysql
mysql -u root -p -e "SELECT VERSION(), @@global.time_zone, @@collation_server;"
```

---

## 4. DB·계정 생성 — 콜레이션 명시 필수

MySQL 8의 기본 콜레이션은 `utf8mb4_0900_ai_ci`인데, 이 프로젝트의 마이그레이션은 **전부 `utf8mb4_unicode_ci`**로 테이블을 만든다(204회). DB 기본값을 그대로 두면 DB 콜레이션과 테이블 콜레이션이 갈려 임시테이블/리터럴 비교에서 `illegal mix of collations`가 난다.

```bash
mysql -u root -p <<'SQL'
CREATE DATABASE IF NOT EXISTS papyrus_prod
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'papyrus_user'@'localhost' IDENTIFIED BY '<STRONG_PW>';
GRANT ALL PRIVILEGES ON papyrus_prod.* TO 'papyrus_user'@'localhost';
FLUSH PRIVILEGES;
SQL
```

---

## 5. 소스 clone + 개발 env 제거

```bash
sudo mkdir -p /srv && sudo chown $USER:$USER /srv
git clone https://github.com/papyrus0815/papyrus.git /srv/papyrus
cd /srv/papyrus

# ★ 이걸 안 지우면 prisma가 개발 DB(localhost:3307)를 본다
rm -f env.development .env.development
```

---

## 6. `.env` 작성 — `npm run env:prod`는 쓰지 말 것

`scripts/environment/prod.js`는 `scripts/package.json`이 `{"type":"module"}`인데 CJS `require`를 써서 실행 즉시 ReferenceError로 죽는다. 설령 고쳐져도 하는 일이 `cp env.production .env`라 플레이스홀더로 덮어쓴다.

```bash
openssl rand -base64 48    # JWT_SECRET 생성 (Joi 최소 32자)
```

`/srv/papyrus/.env` 를 직접 작성:

```bash
NODE_ENV=production
LOG_LEVEL=info
TZ=Asia/Seoul

# 런타임 DB 접속 — PrismaService가 직접 읽는 5개. 하나라도 없으면 생성자에서 throw
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=papyrus_user
MYSQL_PASSWORD=<STRONG_PW>
MYSQL_DATABASE=papyrus_prod

# 마이그레이션 CLI 전용 + 부팅 시 Joi 검증 통과용 (런타임 쿼리에는 안 쓰임)
DATABASE_URL="mysql://papyrus_user:<STRONG_PW>@127.0.0.1:3306/papyrus_prod?timezone=Asia/Seoul"
SHADOW_DATABASE_URL="mysql://papyrus_user:<STRONG_PW>@127.0.0.1:3306/papyrus_shadow"

JWT_SECRET="<openssl로 뽑은 값>"
JWT_EXPIRES_IN=30d
JWT_REFRESH_EXPIRES_IN=90d

API_PORT=8000
PORT=8000
BIND_HOST=127.0.0.1

APP_ORIGINS=https://<도메인>
UPLOAD_PATH=/var/uploads
MAX_FILE_SIZE=10485760
PRISMA_HIDE_UPDATE_MESSAGE=true
```

```bash
chmod 600 /srv/papyrus/.env
```

### 이 파일에서 틀리기 쉬운 3가지

1. **`DATABASE_URL`만 넣으면 부팅 즉시 크래시한다.** 런타임 쿼리는 `@prisma/adapter-mariadb`가 `MYSQL_*` 5개를 직접 읽는다(`apps/api/prisma/prisma.service.ts:19-45`). `DATABASE_URL`은 Prisma CLI와 Joi 검증에만 쓰인다. 둘 다 필요하다.
2. **`APP_ORIGINS`를 비우면 안 된다.** 비면(길이 0) 프로덕션에서도 모든 origin을 허용하는데 `credentials: true`가 동반된다. 반대로 플레이스홀더를 그대로 두면 실도메인이 CORS에서 차단된다.
3. **`SSL_KEY_PATH` / `SSL_CRT_PATH`는 절대 넣지 말 것.** 둘 다 있으면 Node가 직접 HTTPS로 뜨는데, nginx는 http로 프록시하므로 502가 난다. TLS는 nginx에서만 종단한다.

Joi가 부팅 시 검증하는 건 13개뿐이고 `allowUnknown: true`라 `MYSQL_*` 5종은 검증 사각지대다 — 오타를 부팅 때 못 잡으니 손으로 확인:

```bash
for k in NODE_ENV DATABASE_URL JWT_SECRET MYSQL_HOST MYSQL_PORT MYSQL_USER MYSQL_PASSWORD MYSQL_DATABASE APP_ORIGINS UPLOAD_PATH; do
  grep -q "^$k=" /srv/papyrus/.env && echo "OK   $k" || echo "MISS $k"
done
```

---

## 7. 의존성 설치 (서버)

```bash
cd /srv/papyrus
export PUPPETEER_SKIP_DOWNLOAD=true
export ELECTRON_SKIP_BINARY_DOWNLOAD=1
npm ci
```

- `--omit=dev` 금지(§0 참조), `--ignore-scripts` 금지(`@prisma/engines` postinstall이 리눅스 schema-engine을 받아야 migrate가 돈다).
- puppeteer/electron 스킵으로 500MB 남짓 절약된다. 둘 다 서버 런타임에 불필요.
- 설치 후 `node_modules`는 약 1.3~1.8GB. 40GB 디스크에서 문제없다.
- `bcrypt`·`argon2`는 `prebuilds/linux-x64/*.node`가 패키지에 동봉돼 있어 컴파일이 필요 없다.

---

## 8. 스키마 생성 + 마이그레이션

`apps/api/prisma/schema.prisma`는 `.gitignore:126`에 걸린 **생성물**이라 clone에 없다. `libs/db/prisma/*.prisma`를 머지해서 만든다.

```bash
cd /srv/papyrus
npm run db:build          # libs/db/prisma/*.prisma → apps/api/prisma/schema.prisma

set -a; source .env; set +a
npx prisma migrate status --schema=apps/api/prisma/schema.prisma
npm run db:migrate:deploy # 170개 마이그레이션 순차 적용
npm run db:generate       # .prisma/client 생성
```

- `prisma.config.ts`의 dotenv는 `override: false`라 셸 export가 이긴다. 위처럼 `source .env`를 먼저 하는 게 안전하다.
- `migrations/` 안에 디렉토리가 아닌 낱개 `.sql` 2개(`backfill_account_id.sql`, `repair-checksum.sql`)가 섞여 있다. `migrate deploy`가 무시하며, **신규 배포에서 손으로 실행하면 안 된다**(특정 계정 UUID 하드코딩).
- Prisma 쿼리 엔진은 WASM(`query_compiler_fast_bg.wasm`)이라 `binaryTargets` 추가가 필요 없다.

---

## 9. 로컬에서 빌드 → 서버로 전송

### 9-1. 맥에서 빌드

```bash
cd ~/Desktop/project/papyrus

npm run build:nestia      # apps/api/src/api/functional 생성 (gitignore 대상)
npm run build:api         # → dist/apps/api

VITE_API_BASE_URL=https://<도메인>/api \
VITE_APP_TITLE=PAPYRUS \
npx nx build web --skip-nx-cache

# 하드코딩이 실제로 제거됐는지 확인 — 빈 결과여야 정상
grep -rl 'localhost:8000' apps/web-admin/dist/assets/ || echo 'OK: no baked localhost'
```

- `build:api`에 `--prod`를 붙이면 안 된다. run-commands가 `--prod=true`를 `tspc`에 그대로 넘겨 TS5023으로 죽는다.
- web 산출물은 `apps/web-admin/dist`다(`dist/web-admin` 아님 — `vite.config.ts`에 `build` 키가 없어 기본값).
- `project.json`의 `outputs` 선언이 실제 경로와 어긋나 있어 Nx 캐시를 켜면 빈 배포가 될 수 있다. `--skip-nx-cache` 권장.
- `vite.config`는 `loadEnv`가 아니라 `process.env`를 직접 읽는다. `.env` 파일에 넣는 걸로는 안 먹고 **셸 export가 필수**다.

### 9-2. 전송

```bash
SRV=<user>@<서버IP>

rsync -avz --delete dist/apps/api/            $SRV:/srv/papyrus/dist/apps/api/
rsync -avz --delete apps/web-admin/dist/      $SRV:/srv/papyrus/apps/web-admin/dist/
rsync -avz apps/api/prisma/schema.prisma      $SRV:/srv/papyrus/apps/api/prisma/schema.prisma
```

`node_modules`는 전송하지 않는다(§0).

---

## 10. 업로드 파일 이관

`UploadController` 생성자가 `mkdirSync`를 돌린다. 권한이 없으면 업로드 실패가 아니라 **부팅 자체가 EACCES로 죽는다.**

```bash
# 서버
sudo mkdir -p /var/uploads/images
sudo chown -R $USER:$USER /var/uploads

# 맥 → 서버 (약 47MB, gitignore라 clone에 없음)
rsync -avz apps/api/uploads/ $SRV:/var/uploads/
```

`/var/uploads`는 릴리스 디렉토리 밖에 두어 재배포 때 유실되지 않게 한다.

---

## 11. 데이터 이관

**전체 덤프를 그대로 부으면 안 된다.** `_prisma_migrations` 테이블이 로컬 상태로 복제돼 이후 `migrate deploy`에서 체크섬 드리프트(P3009)가 난다. 스키마는 8단계로만 세우고 **데이터만** 넣는다.

```bash
# 맥 — 로컬 MySQL 컨테이너가 떠 있어야 함
docker compose up -d mysql

mysqldump -h 127.0.0.1 -P 3307 -u papyrus -p \
  --single-transaction --quick --no-create-info --skip-triggers \
  --default-character-set=utf8mb4 \
  --ignore-table=papyrus._prisma_migrations \
  papyrus > /tmp/papyrus-data.sql

wc -c /tmp/papyrus-data.sql        # 0바이트가 아닌지 반드시 확인
scp /tmp/papyrus-data.sql $SRV:/tmp/
```

```bash
# 서버
mysql -u papyrus_user -p --default-character-set=utf8mb4 papyrus_prod < /tmp/papyrus-data.sql
mysql -u papyrus_user -p -e "SELECT COUNT(*) FROM papyrus_prod.person;"
```

- mysqldump 헤더에 `FOREIGN_KEY_CHECKS=0`이 자동으로 들어가므로 FK 순서 문제는 없다.
- **`docker/mysql/backups/`의 기존 덤프를 쓰지 말 것.** 최신은 2026-08-02(2.2MB, 190테이블)로 4일 전이고, 그 사이 날짜 파일 중 일부는 **20바이트짜리 빈 덤프**다(백업 루프가 실패한 날). 새로 뜨고 크기를 확인하는 편이 확실하다.
- 양쪽 세션 타임존을 `+09:00`으로 맞춘다(3-4에서 서버는 설정 완료).

---

## 12. systemd 서비스

레포에 pm2/Procfile/`*.service`가 하나도 없다. 새로 만든다. Node 단일 프로세스이므로 pm2보다 systemd가 단순하다(부팅 자동시작·저널 로깅·메모리 상한이 커널 레벨에서 해결).

`/etc/systemd/system/papyrus-api.service`:

```ini
[Unit]
Description=Papyrus API
After=network.target mysql.service
Requires=mysql.service

[Service]
Type=simple
User=<user>
WorkingDirectory=/srv/papyrus
EnvironmentFile=/srv/papyrus/.env
ExecStart=/usr/bin/node dist/apps/api/src/apps/api-gateway/src/main.js
Restart=always
RestartSec=5
MemoryMax=1200M
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**엔트리 경로에 주의.** `dist/apps/api/main.js`는 존재하지 않는다. `tsconfig.app.json`의 `rootDir=.`(=`apps/api`) + `outDir=../../dist/apps/api` 조합이라 원본 디렉토리 구조가 중첩된다:

```
dist/apps/api/src/apps/api-gateway/src/main.js
```

`WorkingDirectory`는 반드시 레포 루트여야 한다(env 파일 탐색과 업로드 경로가 cwd 상대).

먼저 포그라운드로 확인하고 나서 등록한다:

```bash
cd /srv/papyrus
set -a; source .env; set +a
node dist/apps/api/src/apps/api-gateway/src/main.js
# 다른 셸에서
curl -s http://127.0.0.1:8000/health
```

> `/health`는 **DB가 죽어도 200을 반환한다.** 응답 body의 `checks.database.status`를 직접 봐야 한다.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now papyrus-api
sudo systemctl status papyrus-api
journalctl -u papyrus-api -f        # 로그는 전부 stdout → journald가 수집. logs/ 디렉토리 불필요
```

---

## 13. nginx

레포의 `docker/nginx/*`는 **재사용하지 말 것.** upstream이 `host.docker.internal`(리눅스에서 해석 불가)이고 `location /`가 vite dev 서버(:3000)로 간다. `nginx.conf.template` + `generate-config.sh` 경로도 envsubst가 `$host`를 빈 문자열로 치환해 파싱 에러 conf를 만든다.

`/etc/nginx/sites-available/papyrus`:

```nginx
server {
    listen 80;
    server_name <도메인>;

    root /srv/papyrus/apps/web-admin/dist;
    index index.html;

    # API가 express 레벨에서 body limit 18mb를 건다 — 그 이상으로
    client_max_body_size 20m;

    gzip on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript
               application/x-javascript text/xml application/xml image/svg+xml;

    # 결정 B-1: 끝 슬래시가 /api/ 를 벗긴다 → /api/health → /health
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # 업로드 파일은 nginx가 직접 (API 프리픽스 아래가 아니라 루트 레벨)
    location /uploads/ {
        alias /var/uploads/;
        expires 30d;
        access_log off;
    }

    # 해시 붙은 정적 자산
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location = /index.html {
        add_header Cache-Control "no-store";
    }

    # SPA history fallback — 반드시 맨 마지막
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/papyrus /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

WebSocket 배선은 불필요하다(코드베이스에 WS/SSE 사용처 0건).

**`/api-docs`가 무인증으로 공개된다.** Swagger는 부팅 시 메모리에서 생성돼 `/api-docs`에 뜬다. 막으려면 `location /api/api-docs { return 404; }`를 `location /api/`보다 위에 둔다.

---

## 14. DNS + HTTPS

### 14-1. A 레코드

**카페24 VPS/서버호스팅 전용 네임서버는 `cns1.simplexi.com` / `cns2.simplexi.com`이다.** 웹호스팅용 `ns1.cafe24.com`을 꽂는 것이 가장 흔한 초기 실수다.

타사 DNS를 쓰고 있다면 네임서버는 건드리지 말고 **A 레코드만 VPS 공인 IP로** 지정하는 편이 반영이 빠르다(네임서버 변경은 24~48시간, 레코드 수정은 30분~1시간).

```bash
dig +short <도메인> A     # 서버 IP가 나와야 certbot이 통과한다
```

### 14-2. certbot

전파 확인 후 실행한다. 콘솔·OS 방화벽 양쪽에 80이 열려 있어야 한다.

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d <도메인> --agree-tos -m <메일> --redirect
sudo systemctl enable --now certbot.timer
sudo certbot renew --dry-run
```

certbot이 위 server 블록에 443 리스너와 인증서 경로를 자동 삽입하고 80→443 리다이렉트를 건다.

---

## 15. 배포 후 검증

```bash
curl -sI  https://<도메인>/                    # 200 + index.html, Cache-Control: no-store
curl -s   https://<도메인>/api/health | jq     # checks.database.status 를 직접 확인
curl -sI  https://<도메인>/uploads/images/<파일>   # 200
curl -sI  https://<도메인>/events               # 200 + index.html (API로 새지 않는지)

# 로그인 쿠키가 실제로 세팅되는지 — Secure; SameSite=None 확인
curl -isS -X POST https://<도메인>/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"...","password":"..."}' | grep -i '^set-cookie'
```

브라우저에서 실제로 로그인 → 목록 조회 → 이미지 표시 → 파일 업로드까지 한 바퀴 돈다.

시드로 만든 admin 계정이 있다면 **즉시 비밀번호를 변경한다.**

---

## 16. 재배포 절차 (2회차부터)

```bash
# 맥
git pull && npm run build:nestia && npm run build:api
VITE_API_BASE_URL=https://<도메인>/api npx nx build web --skip-nx-cache
rsync -avz --delete dist/apps/api/       $SRV:/srv/papyrus/dist/apps/api/
rsync -avz --delete apps/web-admin/dist/ $SRV:/srv/papyrus/apps/web-admin/dist/

# 서버 — 의존성이나 스키마가 바뀐 경우에만
cd /srv/papyrus && git pull
npm ci                       # package-lock.json 변경 시
npm run db:build && npm run db:migrate:deploy && npm run db:generate   # 마이그레이션 추가 시

sudo systemctl restart papyrus-api
curl -s http://127.0.0.1:8000/health
```

정적 파일만 바뀐 배포는 nginx reload도 필요 없다.

---

## 부록 A. 함정 요약

| # | 함정 | 증상 |
|---|---|---|
| 1 | `vite.config.ts`의 production 하드코딩 | 배포된 웹이 사용자 브라우저에서 `localhost:8000` 호출 |
| 2 | `env.development` 심볼릭 링크를 안 지움 | `migrate deploy`가 개발 DB를 향함 |
| 3 | `npm ci --omit=dev` | 부팅 시 `@nestia/core` MODULE_NOT_FOUND |
| 4 | 맥 `node_modules` rsync | `Failed to load native binding` (darwin-arm64) |
| 5 | 엔트리를 `dist/apps/api/main.js`로 지정 | 파일 없음 |
| 6 | `SSL_KEY_PATH`/`SSL_CRT_PATH` 설정 | Node가 https로 떠서 nginx ↔ 앱 프로토콜 불일치 502 |
| 7 | `/api` 프리픽스를 nginx와 코드 양쪽에 | 업스트림에 `/api/api/…` 도착 |
| 8 | HTTP + `NODE_ENV=production` | 쿠키 `Secure` 때문에 로그인 불가 |
| 9 | `APP_ORIGINS` 비움 / 플레이스홀더 | 각각 전면 CORS 개방 / 실도메인 차단 |
| 10 | DB 콜레이션 기본값 | `illegal mix of collations` |
| 11 | `_prisma_migrations` 포함 덤프 복원 | 이후 마이그레이션 P3009 |
| 12 | `/var/uploads` 권한 없음 | 업로드가 아니라 **부팅**이 EACCES로 실패 |
| 13 | `nginx client_max_body_size` 기본 1m | 18mb까지 받는 API 앞에서 잘림 |
| 14 | `build:api --prod` | `tspc`가 TS5023으로 죽음 |
| 15 | 카페24 웹호스팅용 네임서버 사용 | 도메인이 서버로 안 붙음 |

## 부록 B. 확인이 필요한 카페24 항목

다음은 공식 문서가 상충하거나 원문 접근이 막혀 확정하지 못했다. 진행 중 콘솔에서 직접 확인할 것.

- 신규 서버 개통 직후 방화벽 기본 정책(deny-all vs allow) — 문서 3종이 엇갈림
- VPS의 가상화 방식 → swapfile 생성 가능 여부
- VPS 공인 IP 변경 정책
- 트래픽 500GB 초과 시 과금(초과분 165원/GB로 조사됐으나 원문 미확인)
- 카페24 DB호스팅에 MySQL 8.0 상품이 있는지 (현재로선 VPS 자체 설치가 유일한 확실 경로)
