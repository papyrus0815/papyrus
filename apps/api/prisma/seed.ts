import * as dotenv from 'dotenv'
import { parseArgs } from 'node:util'
import * as path from 'path'

import { PrismaService } from './prisma.service'
import {
  seedAdmin,
  seedAdministrationDepartmentCategories,
  seedContinents,
  seedCountries,
  seedEventCategories,
  seedGovernmentPositionDefinitions,
  seedGermanyHistoricalCountries,
  seedGermanyHistoricalCountryRelations,
  seedBritainHistoricalCountries,
  seedBritainHistoricalCountryRelations,
  seedRussiaHistoricalCountries,
  seedRussiaHistoricalCountryRelations,
  seedSerbiaHistoricalCountries,
  seedSerbiaHistoricalCountryRelations,
  seedSerbiaMonarchs,
  seedSerbiaDynasty,
  seedItalyHistoricalCountries,
  seedItalyHistoricalCountryRelations,
  seedBritainMonarchs,
  seedPrussiaGermanyMonarchs,
  seedHohenzollernDynasty,
  seedWiveDynasties,
  seedRussiaEmperors,
  seedRomanovDynasty,
  seedSardiniaItalyMonarchs,
  seedSavoyDynasty,
  seedGermanyEmpireParties,
  seedGermanyReichstagElections,
} from './seeds'

const options = {
  environment: { type: 'string' as const },
} as const

async function main() {
  const {
    values: { environment },
  } = parseArgs({ options })

  const env = environment
  const envFileName = `env.${env}`
  const envPath = path.resolve(process.cwd(), envFileName)

  // 로드 결과 확인을 위한 변수 할당
  const result = dotenv.config({ path: envPath })

  console.log(`🌱 Seed 환경: ${env}`)
  console.log(`📂 로드된 설정 파일: ${envFileName}`)

  if (result.error) {
    console.error('❌ 환경 변수 로드 중 에러 발생:', result.error)
  }

  const prisma = new PrismaService({ useAdapter: true })

  try {
    console.log(`\n🚀 ${env} 환경 시딩 시작...\n`)
    console.log('='.repeat(60))

    switch (env) {
      case 'development':
        // 1. 대륙 시딩
        const continentMap = await seedContinents(prisma)

        // 2. 국가 시딩
        await seedCountries(prisma, continentMap)

        // 3. 독일 역사 국가 시딩
        await seedGermanyHistoricalCountries(prisma)

        // 3-1. 독일 역사 국가 계승·소속 관계 시딩
        await seedGermanyHistoricalCountryRelations(prisma)

        // 4. 영국 역사 국가 시딩
        await seedBritainHistoricalCountries(prisma)

        // 4-1. 영국 역사 국가 계승·소속 관계 시딩
        await seedBritainHistoricalCountryRelations(prisma)

        // 5. 러시아 역사 국가 시딩
        await seedRussiaHistoricalCountries(prisma)

        // 5-1. 러시아 역사 국가 계승·소속 관계 시딩
        await seedRussiaHistoricalCountryRelations(prisma)

        // 6. 세르비아 역사 국가 시딩
        await seedSerbiaHistoricalCountries(prisma)

        // 6-1. 세르비아 역사 국가 계승 관계 시딩
        await seedSerbiaHistoricalCountryRelations(prisma)

        // 6-2. 세르비아 군주 시딩
        await seedSerbiaMonarchs(prisma)

        // 6-3. 세르비아 왕조 + 부인 + 관계 시딩
        await seedSerbiaDynasty(prisma)

        // 7. 이탈리아 역사 국가 시딩
        await seedItalyHistoricalCountries(prisma)

        // 7-1. 이탈리아 역사 국가 계승·소속 관계 시딩
        await seedItalyHistoricalCountryRelations(prisma)

        // 7-2. 사르데냐·이탈리아 왕국 군주 시딩
        await seedSardiniaItalyMonarchs(prisma)

        // 7-3. 사보이아 왕조 + 왕비 + 관계 시딩
        await seedSavoyDynasty(prisma)

        // 8. 관직 정의 시딩 (군주 시딩보다 먼저 실행)
        await seedGovernmentPositionDefinitions(prisma)

        // 6. 영국 군주 시딩
        await seedBritainMonarchs(prisma)

        // 7. 프로이센·독일 제국 군주 시딩
        await seedPrussiaGermanyMonarchs(prisma)

        // 8. 호엔촐레른 가문 + 부인 + 관계 시딩
        await seedHohenzollernDynasty(prisma)

        // 9. 부인 출신 가문 + 국가 소속 시딩
        await seedWiveDynasties(prisma)

        // 10. 러시아 제국 황제 시딩
        await seedRussiaEmperors(prisma)

        // 11. 로마노프 왕조 + 황후 + 관계 시딩
        await seedRomanovDynasty(prisma)

        // 12. 독일 제국 정당 시딩
        await seedGermanyEmpireParties(prisma)

        // 12-1. 독일 제국 라이히스탁 선거 시딩 (1903, 1907)
        await seedGermanyReichstagElections(prisma)

        // 13. 이벤트 카테고리 시딩
        await seedEventCategories(prisma)

        // 11. 행정 부처 카테고리 시딩 (국방·외교 등)
        await seedAdministrationDepartmentCategories(prisma)

        // 7. 어드민 계정 시딩
        await seedAdmin(prisma)

        console.log('='.repeat(60))
        console.log('🎉 모든 시딩 작업이 완료되었습니다!')
        break

      case 'production':
        // 프로덕션 환경에서는 필수 데이터만 시딩
        console.log('⚠️  프로덕션 환경에서는 최소한의 데이터만 시딩합니다.')
        await seedContinents(prisma)
        await seedEventCategories(prisma)
        await seedAdministrationDepartmentCategories(prisma)
        await seedAdmin(prisma)
        break

      case 'test':
        // 테스트 환경 시딩 로직 (필요시 추가)
        console.log('🧪 테스트 환경 시딩')
        break

      default:
        console.log(`⚠️  알 수 없는 환경: ${env}`)
        break
    }
  } catch (error) {
    console.error('❌ 시딩 중 오류 발생:', error)
    throw error
  } finally {
    await prisma.$disconnect()
    console.log('\n✅ 데이터베이스 연결 해제 완료')
  }
}

main()
  .then(() => {
    console.log('\n✨ 시딩이 성공적으로 완료되었습니다! ✨\n')
  })
  .catch((error) => {
    console.error('\n❌ 시딩 실행 중 오류가 발생했습니다:', error)
    process.exit(1)
  })
