# syntax=docker/dockerfile:1.7
# ============================================================================
# Papyrus 이미지 3종 — 한 파일, 타깃만 다르게
#
#   docker build -f deploy/docker/papyrus.Dockerfile --target api     -t papyrus/api .
#   docker build -f deploy/docker/papyrus.Dockerfile --target web     -t papyrus/web \
#                --build-arg VITE_API_BASE_URL=http://localhost:8088/api .
#   docker build -f deploy/docker/papyrus.Dockerfile --target migrate -t papyrus/migrate .
#
# 빌드 컨텍스트는 레포 루트. 무시 목록은 옆의 papyrus.Dockerfile.dockerignore
# (루트 .dockerignore는 package-lock.json·*.svg를 빼 버려서 이 빌드에 못 쓴다).
#
# 왜 컨테이너 안에서 빌드하나: 맥 node_modules에는 darwin-arm64 네이티브 바이너리
# (@swc·@esbuild·@rollup·lightningcss·argon2·bcrypt)가 섞여 있어 그대로 옮기면
# 리눅스에서 "Failed to load native binding"으로 죽는다. 여기서 깨끗하게 다시 설치한다.
# ============================================================================

ARG NODE_IMAGE=node:24.15.0-bookworm-slim
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.29-alpine

# ----------------------------------------------------------------------------
# base — Prisma 엔진이 libssl을 찾는다. slim 이미지에는 없어서 openssl-1.1.x로 잘못 추정한다
# ----------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS base
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# ----------------------------------------------------------------------------
# deps — 빌드용 전체 의존성 (dev 포함). lock 파일만 먼저 복사해 레이어 캐시를 살린다
# ----------------------------------------------------------------------------
FROM base AS deps
WORKDIR /workspace
ENV CI=true \
    NX_DAEMON=false \
    NX_NO_CLOUD=true \
    PUPPETEER_SKIP_DOWNLOAD=true \
    ELECTRON_SKIP_BINARY_DOWNLOAD=1 \
    NPM_CONFIG_FETCH_RETRIES=6 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
# web-admin은 npm workspace가 아니라 자기 lock·node_modules를 따로 갖는다
COPY apps/web-admin/package.json apps/web-admin/package-lock.json apps/web-admin/
RUN --mount=type=cache,target=/root/.npm npm ci --prefix apps/web-admin --no-audit --no-fund

# ----------------------------------------------------------------------------
# source — 생성물 3종을 만든다. 셋 다 gitignore라 clean checkout에는 없다.
#   1) apps/api/prisma/schema.prisma   ← libs/db/prisma/*.prisma 머지 (db:build)
#   2) node_modules/.prisma/client     ← prisma generate
#   3) apps/api/src/api/functional     ← Nestia SDK (web-admin이 @api/*로 import)
# 순서 고정: nestia가 컨트롤러를 타입체크할 때 @prisma/client 타입이 있어야 한다
# ----------------------------------------------------------------------------
FROM deps AS source
COPY nx.json tsconfig.base.json tsconfig.json prisma.config.ts ./
COPY scripts ./scripts
COPY libs ./libs
COPY apps/api ./apps/api
COPY apps/web-admin ./apps/web-admin
# 빌드 단계 전용 가짜 값(최종 이미지에는 남지 않는다). 접속은 하지 않고 형식 검증만 통과시킨다
#   DATABASE_URL·SHADOW_DATABASE_URL — prisma.config.ts의 env()가 비어 있으면 generate가 설정 로드에서 죽는다
#   JWT_SECRET — nestia가 AppModule을 실제로 로드해 ConfigModule의 Joi 검증(required, 32자+)을 탄다
ENV DATABASE_URL=mysql://build:build@127.0.0.1:3306/build \
    SHADOW_DATABASE_URL=mysql://build:build@127.0.0.1:3306/build_shadow \
    JWT_SECRET=build-only-placeholder-not-a-real-secret-0000 \
    NODE_OPTIONS=--max-old-space-size=6144
# ↑ nestia는 전 컨트롤러를 한 프로그램으로 타입체크해 기본 힙(~2GB)에서 OOM으로 죽는다(실측).
#   Docker Desktop VM 메모리가 8GB 미만이면 VM이 컨테이너를 죽이므로 Settings → Resources에서 늘릴 것
RUN npm run db:build \
 && npm run db:generate \
 && npm run build:nestia

# ----------------------------------------------------------------------------
# api-build — tspc(ts-patch)로 typia·nestia 변환을 거친 컴파일. 피크 메모리 ~2.2GB
# (nx build api의 --prod는 TS5023으로 죽으므로 nx를 거치지 않고 tspc를 직접 부른다)
# ----------------------------------------------------------------------------
FROM source AS api-build
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npx tspc -p apps/api/tsconfig.app.json

# ----------------------------------------------------------------------------
# web-build — API 주소는 빌드 시점에 번들에 구워진다(런타임 주입 아님).
# 절대 URL이어야 한다: Nestia fetcher가 new URL(host + path)로 조립한다
# ----------------------------------------------------------------------------
FROM source AS web-build
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_APP_TITLE=PAPYRUS \
    NODE_OPTIONS=--max-old-space-size=4096
RUN test -n "$VITE_API_BASE_URL" || (echo "VITE_API_BASE_URL build-arg가 필요합니다" >&2; exit 1)
RUN cd apps/web-admin && npx vite build --mode production
# 넘긴 주소가 실제로 구워졌는지 '있음'으로 확인한다. 'localhost:8000이 없음'으로 검사하면 안 된다 —
# api.service.ts·client.ts 등의 Electron/폴백 리터럴 5곳이 번들에 늘 남아 있어 항상 실패한다(실측)
RUN grep -rqF "\"$VITE_API_BASE_URL\"" apps/web-admin/dist/assets/ \
 || (echo "번들에 VITE_API_BASE_URL($VITE_API_BASE_URL)이 없습니다 — vite.config.ts define 확인" >&2; exit 1)

# ----------------------------------------------------------------------------
# api — 런타임. 프로덕션 의존성만 + 생성된 Prisma 클라이언트 + dist
#   --ignore-scripts: 루트 prepare(ts-patch install)가 dev 의존성이라 omit=dev에서 깨진다.
#   대신 네이티브 모듈 두 개만 install 스크립트를 다시 돌린다
# ----------------------------------------------------------------------------
FROM base AS api
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8000 \
    API_PORT=8000 \
    BIND_HOST=0.0.0.0 \
    NPM_CONFIG_FETCH_RETRIES=6 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
 && npm rebuild argon2 bcrypt
COPY --from=source /workspace/node_modules/.prisma ./node_modules/.prisma
COPY --from=api-build /workspace/dist/apps/api ./dist/apps/api
# 업로드 기본 경로(apps/api/uploads, CWD 기준). 쿠버네티스에서는 여기에 PVC를 붙인다
RUN mkdir -p apps/api/uploads && chown -R node:node apps/api/uploads
USER node
EXPOSE 8000
# 엔트리가 dist/apps/api/main.js가 아닌 이유: tsconfig.app.json의 rootDir이 apps/api라 경로가 중첩된다
CMD ["node", "dist/apps/api/src/apps/api-gateway/src/main.js"]

# ----------------------------------------------------------------------------
# migrate — prisma migrate deploy 전용. 앱 의존성 없이 Prisma CLI만 (런타임 이미지 비대화 방지)
# ----------------------------------------------------------------------------
FROM base AS migrate
WORKDIR /migrate
ARG PRISMA_VERSION=7.3.0
RUN --mount=type=cache,target=/root/.npm \
    npm init -y >/dev/null \
 && npm install --no-audit --no-fund --save-exact prisma@${PRISMA_VERSION}
COPY --from=source /workspace/apps/api/prisma/schema.prisma ./prisma/schema.prisma
COPY apps/api/prisma/migrations ./prisma/migrations
COPY deploy/docker/prisma.migrate.config.ts ./prisma.config.ts
COPY deploy/docker/migrate.sh ./migrate.sh
USER node
# DB 대기 + 빈 DB 가드 + migrate deploy (이유는 migrate.sh 머리말)
CMD ["sh", "/migrate/migrate.sh"]

# ----------------------------------------------------------------------------
# web — 정적 번들 + nginx(비root, 8080). /api/는 API Service로 프록시하며 접두사를 벗긴다
# (API는 setGlobalPrefix가 없어 라우트가 루트 직속)
# ----------------------------------------------------------------------------
FROM ${NGINX_IMAGE} AS web
COPY deploy/docker/web-nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=web-build /workspace/apps/web-admin/dist /usr/share/nginx/html
ENV API_UPSTREAM=papyrus-api:8000
EXPOSE 8080
