// migrate 이미지 전용 Prisma 설정.
// 루트 prisma.config.ts는 env.development를 먼저 읽고 SHADOW_DATABASE_URL까지 요구한다 —
// migrate deploy에는 shadow DB가 필요 없고, 개발 env 파일이 섞이면 엉뚱한 DB를 향하므로 따로 둔다.
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
