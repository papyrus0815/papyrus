# ========================================
# Multi-stage Dockerfile for Papyrus API
# ========================================
# 최적화된 프로덕션 빌드를 위한 멀티 스테이지 Dockerfile

# ========================================
# Stage 1: Dependencies
# ========================================
# 의존성 설치 단계 (캐싱 최적화)
FROM node:24-alpine AS deps

# 작업 디렉토리 설정
WORKDIR /workspace

# 패키지 정의 파일만 먼저 복사 (레이어 캐싱 최적화)
COPY package.json package-lock.json ./

# 프로덕션 의존성만 설치
RUN npm ci --omit=dev --ignore-scripts

# ========================================
# Stage 2: Builder
# ========================================
# 애플리케이션 빌드 단계
FROM node:24-alpine AS builder

WORKDIR /workspace

# 패키지 정의 파일 복사
COPY package.json package-lock.json ./

# 모든 의존성 설치 (빌드용)
RUN npm ci --ignore-scripts

# Nx 설정 및 TypeScript 설정 복사
COPY nx.json tsconfig.base.json tsconfig.json ./

# 프로젝트 소스 복사
COPY apps ./apps
COPY libs ./libs

# Prisma 스키마 복사 및 클라이언트 생성
COPY apps/api/prisma ./apps/api/prisma
RUN npx prisma generate --schema=./apps/api/prisma/schema.prisma

# API 애플리케이션 빌드
RUN npx nx build api --prod

# ========================================
# Stage 3: Runner
# ========================================
# 최종 프로덕션 이미지
FROM node:24-alpine AS runner

# 보안을 위한 비특권 사용자 생성
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

WORKDIR /app

# 프로덕션 의존성 복사
COPY --from=deps --chown=nodejs:nodejs /workspace/node_modules ./node_modules

# 빌드된 애플리케이션 복사
COPY --from=builder --chown=nodejs:nodejs /workspace/dist/apps/api ./

# Prisma 클라이언트 복사
COPY --from=builder --chown=nodejs:nodejs /workspace/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nodejs:nodejs /workspace/apps/api/prisma ./prisma

# package.json 복사 (버전 정보 등을 위해)
COPY --chown=nodejs:nodejs package.json ./

# 환경 변수 설정
ENV NODE_ENV=production
ENV PORT=8000

# 비특권 사용자로 전환
USER nodejs

# 포트 노출
EXPOSE 8000

# 헬스체크 설정
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 애플리케이션 실행
CMD ["node", "main.js"]
