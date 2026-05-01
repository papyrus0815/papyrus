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
  seedBeneluxHistoricalCountries,
  seedBeneluxHistoricalCountryRelations,
  seedBritainMonarchs,
  seedPrussiaGermanyMonarchs,
  seedHohenzollernDynasty,
  seedWiveDynasties,
  seedRussiaEmperors,
  seedRomanovDynasty,
  seedRussiaUnofficialCommittee,
  seedSardiniaItalyMonarchs,
  seedSavoyDynasty,
  seedJapanMeijiEra,
  seedJapanPostwar,
  seedJapanPostwar2,
  seedGermanyEmpireParties,
  seedGermanyReichstagElections,
  seedAustroPrussianWar,
  seedFrancoPrussianWar,
  seedFirstOpiumWar,
  seedFirstOpiumWarFigures,
  seedQianlongEmperor,
  seedBackfillPersonCountryId,
  seedKoreaGeography,
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

        // 7-4. 베네룩스(네덜란드·벨기에) 역사 국가 시딩
        await seedBeneluxHistoricalCountries(prisma)

        // 7-5. 베네룩스 역사 국가 계승·소속 관계 시딩
        await seedBeneluxHistoricalCountryRelations(prisma)

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

        // 11-1. 비공식위원회(1801–1803) 4인 + 가문 + 인간관계 시딩
        await seedRussiaUnofficialCommittee(prisma)

        // 11-2. 일본 메이지·다이쇼·쇼와 천황 + 1~10대 내각총리대신 시딩
        await seedJapanMeijiEra(prisma)

        // 12. 독일 제국 정당 시딩
        await seedGermanyEmpireParties(prisma)

        // 12-1. 독일 제국 라이히스탁 선거 시딩 (1898, 1903, 1907)
        await seedGermanyReichstagElections(prisma)

        // 13. 이벤트 카테고리 시딩
        await seedEventCategories(prisma)

        // 13-1. 보오전쟁(1866) 시딩 — eventCategory + 역사국가들 의존
        await seedAustroPrussianWar(prisma)

        // 13-2. 보불전쟁(1870–1871) 시딩 — eventCategory + 역사국가들 + 현대국가(프랑스) 의존
        await seedFrancoPrussianWar(prisma)

        // 13-3. 1차 아편전쟁(1839–1842) 시딩 — eventCategory + 영국 HC + 청나라 HC(인라인 생성)
        await seedFirstOpiumWar(prisma)

        // 13-4. 1차 아편전쟁 핵심 인물 시딩 — 청 황실(애신각라) + 7인 + PersonEvent 연결
        await seedFirstOpiumWarFigures(prisma)

        // 13-4-1. 건륭제(청 6대 황제) 시딩 — 애신각라 가문·청나라 HC 의존
        await seedQianlongEmperor(prisma)

        // 13-6. 일본 전후(1945~1948) 시딩 — 일본 제국·황실 + eventCategory + 현대 일본·미국·영국·중국·소련 hc 의존
        //  · 일본국 historicalCountry + 일본 제국 → 일본국 transition
        //  · 정당(진보·자유·사회) + 43~46대 총리 + 4개 내각 + 정당 멤버십 + CabinetPoliticalParty
        //  · 포츠담선언/항복문서/GHQ점령/일본국헌법 공포·시행 사건
        await seedJapanPostwar(prisma)

        // 13-7. 일본 전후 2단계(1948~1955) — 47~51대 + 자유민주당 결성(55년 체제)
        //  · 정당 7건(민주당·국협·민자·자유·개진·일민·자민) + 정당 transition 8건
        //  · 47대 아시다(신규) + 48~51대 요시다 추가 임기·내각·당적
        //  · 쇼와전공/샌프란시스코강화/주권회복/자위대 발족/55년 체제 사건
        await seedJapanPostwar2(prisma)

        // 13-5. Person.countryId 백필 — 인물 시드 모두 끝난 뒤 affiliation 체인으로 NULL 채움
        await seedBackfillPersonCountryId(prisma)

        // 14. 한국 자연지리·인프라 (한라산·KTX·인천공항 등)
        await seedKoreaGeography(prisma)

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
