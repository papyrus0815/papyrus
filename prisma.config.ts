import { defineConfig, env } from 'prisma/config'
import { config } from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// env.development 파일 로드
const envPath = path.join(__dirname, 'env.development')
if (fs.existsSync(envPath)) {
  config({ path: envPath })
} else {
  config() // 기본 .env 파일
}

export default defineConfig({
  schema: "apps/api/prisma/schema.prisma", 
  migrations: {
    path: "apps/api/prisma/migrations",
    seed: "npx tsx apps/api/prisma/seed.ts",
  },
  datasource: {
    url: env('DATABASE_URL'),
    shadowDatabaseUrl: env('SHADOW_DATABASE_URL'),
  },
})

