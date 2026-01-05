const { config } = require('dotenv')
const path = require('path')
const fs = require('fs')

// env.development 파일 로드
const envPath = path.join(__dirname, 'env.development')

console.log('[Loader] 프로젝트 루트:', __dirname)
console.log('[Loader] env.development 경로:', envPath)
console.log('[Loader] 파일 존재 여부:', fs.existsSync(envPath))

if (fs.existsSync(envPath)) {
  const result = config({ path: envPath })
  if (result.parsed) {
    console.log(`✅ [Loader] env.development 파일 로드됨 (${Object.keys(result.parsed).length}개 변수)`)
  }
} else {
  console.log('⚠️  [Loader] env.development 파일이 없습니다. 기본 .env 파일을 찾습니다.')
  config()
}

// DATABASE_URL 확인
console.log('✅ [Loader] DATABASE_URL:', process.env.DATABASE_URL ? '설정됨' : '❌ 없음')
console.log('✅ [Loader] SHADOW_DATABASE_URL:', process.env.SHADOW_DATABASE_URL ? '설정됨' : '❌ 없음')
