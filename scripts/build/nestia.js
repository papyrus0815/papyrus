#!/usr/bin/env node

import { runCommands, success, error } from '../utils/common.js'
import fs from 'fs'
import path from 'path'

async function main() {
  try {
    console.log('>>> 🔨 Nestia 빌드 시작...')

    const commands = [
      {
        command: 'npx',
        args: ['shx', 'rm', '-rf', 'apps/api/src/api'],
        options: { cwd: process.cwd() },
      },
      {
        command: 'npx',
        args: ['shx', 'mkdir', '-p', 'apps/api/src/api'],
        options: { cwd: process.cwd() },
      },
      {
        command: 'npx',
        args: ['nestia', 'all'],
        options: { cwd: 'apps/api' },
      },
    ]

    await runCommands(commands)

    // index.ts 파일 확인 및 export 추가
    const indexPath = path.join(
      process.cwd(),
      'apps/api/src/api/functional/index.ts',
    )
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, 'utf8')
      if (!/\bexport\b/.test(content)) {
        fs.appendFileSync(indexPath, '\nexport {}\n')
        console.log('✅ index.ts에 export 구문 추가')
      }
    }

    // Nestia SDK import 수정
    // Nestia는 별도 파일에 정의된 DTO를 하위 디렉토리 생성 파일에서 사용할 때 import를 자동 생성하지 않습니다.
    // 이 스크립트는 누락된 import를 자동으로 추가합니다.
    console.log('🔧 Nestia SDK import 수정 중...')

    const importFixes = [
      {
        path: 'apps/api/src/api/functional/countries/demographic_indicators/index.ts',
        import:
          "import type { DemographicIndicatorResponse } from '../../../../libs/country/presentation/dto'",
      },
      {
        path: 'apps/api/src/api/functional/countries/economic_indicators/index.ts',
        import:
          "import type { EconomicIndicatorResponse } from '../../../../libs/country/presentation/dto'",
      },
      {
        path: 'apps/api/src/api/functional/countries/development_indicators/index.ts',
        import:
          "import type { DevelopmentIndicatorResponse } from '../../../../libs/country/presentation/dto'",
      },
      {
        path: 'apps/api/src/api/functional/countries/historical_countries/index.ts',
        import:
          "import type { HistoricalCountrySimpleResponseDto } from '../../../../libs/country/presentation/dto/historical-country-simple.response'",
      },
      {
        path: 'apps/api/src/api/functional/events/parent/index.ts',
        import:
          "import type { EventResponseDto } from '../../../../libs/event/presentation/dto'",
      },
      {
        path: 'apps/api/src/api/functional/event_categories/index.ts',
        import:
          "import type { EventCategoryResponse } from '../../../libs/event-category/presentation/event-category.controller'",
      },
    ]

    importFixes.forEach(({ path: filePath, import: importStatement }) => {
      const fullPath = path.join(process.cwd(), filePath)

      if (!fs.existsSync(fullPath)) {
        console.warn(`⚠️  파일을 찾을 수 없습니다: ${filePath}`)
        return
      }

      let content = fs.readFileSync(fullPath, 'utf-8')

      // 이미 import가 있는지 확인
      if (content.includes(importStatement)) {
        return
      }

      // import 구문을 추가할 위치 찾기 (typia import 다음)
      const typiaImportMatch = content.match(
        /import type { .+ } from ['"]typia['"];?\n/,
      )

      if (!typiaImportMatch) {
        console.warn(`⚠️  typia import를 찾을 수 없습니다: ${filePath}`)
        return
      }

      const insertPosition = typiaImportMatch.index + typiaImportMatch[0].length
      const newContent =
        content.slice(0, insertPosition) +
        '\n' +
        importStatement +
        '\n' +
        content.slice(insertPosition)

      fs.writeFileSync(fullPath, newContent, 'utf-8')
      console.log(`✅ Import 추가 완료: ${path.basename(filePath)}`)
    })

    success('Nestia 빌드 완료')
  } catch (err) {
    error('>>> ❌ Nestia 빌드 실패')
    process.exit(1)
  }
}

export default main
