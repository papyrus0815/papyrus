#!/usr/bin/env node

import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import { runNpx, success, error } from '../utils/common.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../..')
const schemaPath = path.join(projectRoot, 'apps/api/prisma/schema.prisma')

/**
 * 기존 마이그레이션만 적용 (비대화형 환경용).
 * - migrate dev: 새 마이그레이션 생성 + 적용 (대화형)
 * - migrate deploy: 미적용 마이그레이션만 적용 (CI/스크립트용)
 */
async function main() {
  try {
    console.log('🔨 Prisma 스키마 빌드...')
    await runNpx('ts-node', ['libs/db/prisma/build-schema.ts'])

    console.log('📝 미적용 마이그레이션 적용 중...')
    execSync(
      `npx prisma migrate deploy --schema="${schemaPath}"`,
      { stdio: 'inherit', cwd: projectRoot },
    )

    success('마이그레이션 적용 완료 (migrate deploy)')
  } catch (err) {
    error('마이그레이션 적용 실패')
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default main
