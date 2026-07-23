#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 스크립트 실행기
 * 사용법: node scripts/run.js <category>/<script> [options]
 * 예시:
 *   node scripts/run.js database/build
 *   node scripts/run.js development/serve-web --network
 *   node scripts/run.js lint/check --api
 */

function showHelp() {
  console.log(`
🚀 Papyrus 프로젝트 스크립트 실행기

사용법: node scripts/run.js <category>/<script> [options]

📁 사용 가능한 스크립트:

📊 데이터베이스 (database/)
  build     - Prisma 스키마 빌드
  migrate   - 데이터베이스 마이그레이션 (대화형, 새 마이그레이션 생성)
  migrate-deploy - 미적용 마이그레이션만 적용 (비대화형/CI용)
  generate  - Prisma 클라이언트 생성
  reset     - 데이터베이스 리셋
  backup    - MySQL 수동 덤프 (docker/mysql/backups, gzip)

🏗️  빌드 (build/)
  nestia    - Nestia API 빌드
  api       - API 빌드
  web       - 웹 빌드

🔧 개발 (development/)
  serve-api - API 서버 시작
  serve-web - 웹 서버 시작 [--network, --tunnel]
  dev       - 개발 환경 시작 [--nginx]

🐳 Docker (docker/)
  up        - Docker 컨테이너 시작 [--env, --https]

🔍 린트 (lint/)
  check     - 린트 검사 [--api, --web]
  fix       - 린트 자동 수정 [--api, --web]

🌐 인프라 (infrastructure/)
  nginx-generate    - Nginx 설정 생성
  ssl-generate      - SSL 인증서 생성 [--simple]

⚙️  환경 (environment/)
  dev       - 개발 환경 설정 적용
  prod      - 프로덕션 환경 설정 적용

예시:
  node scripts/run.js database/build
  node scripts/run.js development/serve-web --network
  node scripts/run.js lint/check --api
  node scripts/run.js docker/up --https
`)
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp()

    return
  }

  const scriptPath = args[0]
  const scriptOptions = args.slice(1)

  if (!scriptPath.includes('/')) {
    console.error('❌ 스크립트 경로는 <category>/<script> 형식이어야 합니다.')
    console.error('   예시: database/build, development/serve-api')
    process.exit(1)
  }

  const fullScriptPath = path.join(__dirname, `${scriptPath}.js`)

  if (!fs.existsSync(fullScriptPath)) {
    console.error(`❌ 스크립트를 찾을 수 없습니다: ${fullScriptPath}`)
    console.error(
      '   사용 가능한 스크립트 목록을 보려면: node scripts/run.js --help',
    )
    process.exit(1)
  }

  try {
    // 스크립트 옵션을 process.argv에 설정
    process.argv = ['node', fullScriptPath, ...scriptOptions]

    // 자기실행 가드(`import.meta.url === file://${process.argv[1]}`)를 가진
    // 스크립트는 import 시점에 process.argv[1]이 자기 경로로 위조되어 이미
    // main()을 실행한다. 이 경우 아래에서 script()를 또 부르면 이중 실행되어
    // (예: dev → concurrently 2벌 → nx serve api 2개 → 8000 EADDRINUSE) 문제가 된다.
    // 가드가 없는 스크립트만 명시적으로 호출한다.
    // NOTE: 가드 유무는 `import.meta.url ===` 비교(가드 시그니처)로 판별한다.
    // 단순히 `fileURLToPath(import.meta.url)`로 __dirname을 구하는 파일(예: build/nestia.js)은
    // 가드가 아니므로 제외해야 한다 — 문자열 존재만 확인하던 이전 버전은 이런 파일을
    // 자기실행으로 오판해 main()이 영영 안 불렸다(build:nestia 무동작 버그).
    const scriptSource = fs.readFileSync(fullScriptPath, 'utf8')
    const selfRuns = /import\.meta\.url\s*===|===\s*import\.meta\.url/.test(scriptSource)

    console.log(`🚀 실행 중: ${scriptPath}`)
    const scriptModule = await import(pathToFileURL(fullScriptPath).href)
    const script = scriptModule.default || scriptModule

    if (!selfRuns && typeof script === 'function') {
      await script()
    }
  } catch (error) {
    console.error(`❌ 스크립트 실행 실패: ${error.message}`)
    process.exit(1)
  }
}

// ES 모듈에서는 import.meta.url로 현재 모듈 확인
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export default main
