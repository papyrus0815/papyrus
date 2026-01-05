import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url' 
import { dirname } from 'path'      
import chalk from 'chalk'

// 📁 Prisma 모델 경로
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const prismaDir = path.resolve(__dirname)

// 📄 출력될 schema.prisma 경로
const outputPath = path.resolve(
  __dirname,
  '../../../apps/api/prisma/schema.prisma',
)

// 📌 항상 맨 앞에 포함될 base.prisma
const baseFile = 'base.prisma'

// 🔍 병합할 나머지 파일들 자동 탐색
const otherFiles = fs
  .readdirSync(prismaDir)
  .filter((file) => file.endsWith('.prisma') && file !== baseFile)

const allFiles = [baseFile, ...otherFiles]

// 📚 모든 파일 내용 병합
const mergedContent = allFiles
  .map((file) => fs.readFileSync(path.join(prismaDir, file), 'utf-8'))
  .join('\n\n')

// 💾 파일 저장
fs.writeFileSync(outputPath, mergedContent, 'utf-8')

// 🎉 콘솔 출력
console.log('')
console.log(chalk.green.bold('✨ Prisma schema 병합 완료!'))
console.log('')
console.log(`${chalk.cyan('📦 병합된 파일 목록:')}`)
allFiles.forEach((file) => console.log(`  - ${chalk.yellow(file)}`))
console.log('')
console.log(
  `${chalk.cyan('📁 최종 생성 위치:')} ${chalk.blueBright(outputPath)}`,
)
console.log('')
console.log(chalk.green('✅ 작업이 성공적으로 완료되었습니다.\n'))
