import { execSync } from 'child_process'
import { config } from 'dotenv'
import * as path from 'path'
import * as readline from 'readline'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// .env 파일 로드 (프로젝트 루트)
const envPath = path.resolve(__dirname, '../../../.env')
config({ path: envPath })

// schema.prisma 병합 스크립트 실행
const schemaBuilder = path.resolve(__dirname, 'build-schema.ts')
execSync(`ts-node ${schemaBuilder}`, { stdio: 'inherit' })

// CLI 인자 또는 프롬프트로 마이그레이션 이름 받기
const nameArg = process.argv[2]

async function getMigrationName(): Promise<string> {
  if (nameArg) return nameArg

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question('📝 마이그레이션 이름을 입력하세요: ', (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

;(async () => {
  const migrationName = await getMigrationName()

  if (!migrationName) {
    console.error('❌ 마이그레이션 이름이 필요합니다.')
    process.exit(1)
  }

  console.log(`\n🚀 Prisma 마이그레이션 실행: ${migrationName}\n`)

  try {
    // 1. 마이그레이션 생성 및 적용
    console.log('📝 마이그레이션 생성 및 DB 적용 중...')
    execSync(
      `npx prisma migrate dev --name ${migrationName} --schema=apps/api/prisma/schema.prisma --skip-generate`,
      { stdio: 'inherit' },
    )

    // 2. Prisma Client 재생성 (migrate dev가 자동으로 하지만 명시적으로 확인)
    console.log('\n🔄 Prisma Client 재생성 중...')
    execSync(`npx prisma generate --schema=apps/api/prisma/schema.prisma`, {
      stdio: 'inherit',
    })

    console.log('\n✅ 마이그레이션 완료!')
    console.log('   ✓ 마이그레이션 파일 생성')
    console.log('   ✓ 데이터베이스 스키마 업데이트')
    console.log('   ✓ Prisma Client 재생성')
  } catch (err) {
    console.error('\n❌ 마이그레이션 실패')
    console.error('   다음을 확인해주세요:')
    console.error('   • 데이터베이스 연결 상태')
    console.error('   • 스키마 문법 오류')
    console.error('   • 기존 데이터와의 호환성')
    process.exit(1)
  }
})()
