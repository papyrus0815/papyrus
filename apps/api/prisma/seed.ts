import * as dotenv from 'dotenv'
import { parseArgs } from 'node:util'
import * as path from 'path'

import { PrismaService } from './prisma.service'
import {
  seedAdmin,
  seedAdministrationDepartmentCategories,
  seedContinents,
  seedCurrencies,
  seedLanguages,
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
  seedJapan1872GinzaFire,
  seedJapan1945ManilaConference,
  seedTrumanScapAppointment,
  seedPotsdamConference,
  seedKoreanWar,
  seedSanFranciscoTreatyPersons,
  seedSanFranciscoTreatyEnrich,
  seedPrcFounding,
  seedKurofune,
  seedAnseiEarthquakes,
  seedAnseiPurge,
  seedGermanyEmpireParties,
  seedGermanyReichstagElections,
  seedAustroPrussianWar,
  seedFrancoPrussianWar,
  seedFirstOpiumWar,
  seedFirstOpiumWarFigures,
  seedBritishEastIndiaCompanyIndia,
  seedAmboynaMassacre,
  seedAngloDutchTreaty1619,
  seedGunpowderPlot1605,
  seedEicFounding1600,
  seedVocFounding1602,
  seedFallOfConstantinople1453,
  seedBankOfAmsterdam1609,
  seedActOfAbjuration1581,
  seedCharlesV,
  seedCharlesVParents,
  seedQianlongEmperor,
  seedBackfillPersonCountryId,
  seedKoreaGeography,
  seedJapanGeography,
  seedUsaGeography,
  seedChinaGeography,
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

        // 1-1. 화폐 / 언어 마스터 시딩 (국가가 currencyId·languageId 참조)
        await seedCurrencies(prisma)
        await seedLanguages(prisma)

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

        // 13-4-2. 영국 동인도회사의 인도 진출(1600~1757) 시딩 — eventCategory + 잉글랜드/그레이트브리튼 HC + 무굴 제국 HC(인라인 생성)
        //  · 부모 사건 + 자식 5(EIC 헌장·수라트·캘커타·카르나틱 전쟁·플라시 전투)
        //  · EventSection 3 + EventCountryRelation 3
        //  · 플라시 전투 자식: BelligerentSide 2 + CountryInSide + Casualties + MilitaryDetailsNorm
        await seedBritishEastIndiaCompanyIndia(prisma)

        // 13-4-3. 암보이나 학살(1623-02-27) 시딩 — eventCategory + 네덜란드 공화국·잉글랜드 왕국 HC 의존
        //  · 단독 사건 + 4섹션 + EventCountryRelation 2 (네덜란드 INITIATOR / 잉글랜드 VICTIM)
        await seedAmboynaMassacre(prisma)

        // 13-4-4. 1619 영-네덜란드 방위 조약(1619-07-17) 시딩 — eventCategory(회담/조약) + 잉글랜드/네덜란드 HC
        //  · ⚠️ 기존 데이터 보존 모드: 이미 존재하는 Event/Section/CountryRelation은 스킵 (사용자 편집 보호)
        //  · 단독 사건 + 4섹션 + EventCountryRelation 2 (잉글랜드·네덜란드 모두 PARTICIPANT/서명국)
        await seedAngloDutchTreaty1619(prisma)

        // 13-4-5. 1605 화약 음모 사건(1605-11-05) 시딩 — eventCategory(정치) + 잉글랜드 왕국 HC
        //  · ⚠️ 기존 데이터 보존 모드: 이미 존재하는 Event/Section/CountryRelation은 스킵
        //  · 단독 사건 + 4섹션(배경/계획·발각/심문·처형/여파) + EventCountryRelation 1 (잉글랜드 VICTIM)
        await seedGunpowderPlot1605(prisma)

        // 13-4-6. 1600 영국 동인도회사 설립(EIC, 1600-12-31) 시딩 — eventCategory(경제) + 잉글랜드 왕국 HC
        //  · ⚠️ 기존 데이터 보존 모드: 이미 존재하는 Event/Section/CountryRelation은 스킵
        //  · 단독 사건 + 4섹션(배경/설립/15년 칙허 의미/항해와 후속) + EventCountryRelation 1 (잉글랜드 INITIATOR)
        //  · 참고: 기존 'EIC의 인도 진출' 부모 사건의 자식 'EIC 헌장 발급'(1600-12-31)과 의미 중첩 — 사용자 요청에 따라 별도 단독 사건으로 등록
        await seedEicFounding1600(prisma)

        // 13-4-7. 1602 네덜란드 동인도회사 설립(VOC, 1602-03-20) 시딩 — eventCategory(경제) + 네덜란드 공화국 HC
        //  · ⚠️ 기존 데이터 보존 모드: 이미 존재하는 Event/Section/CountryRelation은 스킵
        //  · 단독 사건 + 4섹션(배경/통합·칙허/거버넌스·자본/항해·해체) + EventCountryRelation 1 (네덜란드 INITIATOR)
        await seedVocFounding1602(prisma)

        // 13-4-8. 1453 콘스탄티노플 함락(1453-04-06 ~ 05-29) 시딩 — eventCategory(전쟁/군사)
        //  · ⚠️ 기존 데이터 보존 모드: 이미 존재하는 Event/Section/CountryRelation/HistoricalCountry는 스킵
        //  · 동로마 제국·오스만 제국 HC 인라인 생성(둘 다 현대 튀르키예 TR 연결)
        //  · 단독 사건 + 4섹션(배경/공방전/함락 당일/여파) + EventCountryRelation 2 (오스만 INITIATOR / 동로마 VICTIM)
        await seedFallOfConstantinople1453(prisma)

        // 13-4-9. 1609 암스테르담 은행 개설(Wisselbank, 1609-01-31) 시딩 — eventCategory(경제) + 네덜란드 공화국 HC
        //  · ⚠️ 기존 데이터 보존 모드: 이미 존재하는 Event/Section/CountryRelation은 스킵
        //  · 단독 사건 + 4섹션(배경/개설·운영/은행 길더와 금융 혁신/쇠퇴와 유산) + EventCountryRelation 1 (네덜란드 INITIATOR)
        await seedBankOfAmsterdam1609(prisma)

        // 13-4-10. 1581 단념 선언(Plakkaat van Verlatinghe, 1581-07-26) 시딩 — eventCategory(정치)
        //  · ⚠️ 기존 데이터 보존 모드: 이미 존재하는 Event/Section/CountryRelation은 스킵
        //  · 단독 사건 + 4섹션(배경/선언 과정/논거와 7개 주/여파와 유산) + EventCountryRelation 2 (네덜란드 공화국 INITIATOR / 합스부르크령 네덜란드 TARGET)
        //  · 합스부르크령 네덜란드(endYear=1581) → 네덜란드 공화국(startYear=1581) 전환의 정확한 분기점
        await seedActOfAbjuration1581(prisma)

        // 13-4-11. 카를 5세(Charles V, 1500~1558) 인물 시딩
        //  · ⚠️ 기존 데이터 보존 모드: Person/Dynasty/HC/Reign 모두 존재 시 스킵
        //  · 합스부르크 가문 + 신성로마제국 HC 인라인 생성
        //  · DynastyRule x2 (합스부르크 → 신성로마제국 1438~1740, 합스부르크령 네덜란드 1482~1581)
        //  · SovereignReign x1 (신성로마황제 5세 1519~1556 ABDICATION)
        //  · PersonCountryAffiliation x1 (합스부르크령 네덜란드 CITIZENSHIP)
        await seedCharlesV(prisma)

        // 13-4-12. 카를 5세 부모: 미남공 필리프(1478~1506) + 후아나(1479~1555) 인물 시딩
        //  · ⚠️ 기존 데이터 보존 모드: Person/Dynasty/Marriage/Parent-Child 모두 존재 시 스킵
        //  · 트라스타마라 가문 인라인 생성 (후아나 친정)
        //  · Person x2 (사망 정보·전기 포함) + PersonStats x2 + PersonSpouse x2
        //  · 필리프 → 카를 5세 부자 / 후아나 → 카를 5세 모자 관계
        await seedCharlesVParents(prisma)

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

        // 13-8. 1872년 긴자 대화재 + 銀座煉瓦街 재건 — 일본 제국 hc + 오쿠마 인물 의존
        await seedJapan1872GinzaFire(prisma)

        // 13-9. 1945년 마닐라 사전 회담 — 일본 제국 hc + 회담/조약 카테고리
        //  · 가와베 도라시로(신규)·맥아더(신규) 인물 인라인 등록
        //  · Event + 7섹션(논문급) + EventCountryRelation + PersonEvent
        await seedJapan1945ManilaConference(prisma)

        // 13-10. 1945-08-14 트루먼의 맥아더 SCAP 임명 — 외교 카테고리 + 일본 제국 hc
        //  · 트루먼·마셜·번스(신규) 인물 등록 / 맥아더·스탈린·시데하라(기존) 활용
        //  · Event + 8섹션(논문급) + EventCountryRelation 6 + PersonEvent 6
        await seedTrumanScapAppointment(prisma)

        // 13-11. 1945-07-17~08-02 포츠담 회담 — 회담/조약 카테고리 + 나치 독일 hc
        //  · 처칠·애틀리·몰로토프(신규) / 트루먼·번스·스탈린(기존) 활용
        //  · Event + 8섹션(논문급) + EventCountryRelation 7 + PersonEvent 6
        await seedPotsdamConference(prisma)

        // 13-12. 1950-06-25~1953-07-27 한국전쟁(6.25 전쟁) — 전쟁/군사 카테고리
        //  · DPRK historicalCountry 인라인 등록(country 시드에 미포함)
        //  · 이승만·김일성·마오쩌둥·펑더화이·리지웨이·애치슨(신규) / 트루먼·맥아더·스탈린(기존)
        //  · Event + 8섹션(논문급) + EventCountryRelation 7 + PersonEvent 9
        await seedKoreanWar(prisma)

        // 13-13. 샌프란시스코 강화조약(1951-09-08) — 참여 인물 보강
        //  · 덜레스·모리슨·그로미코·이케다 하야토(신규) / 요시다·트루먼·애치슨·애틀리·스탈린(기존)
        //  · 기존 Event(person.japan-postwar2 시드)에 PersonEvent 9건 추가
        await seedSanFranciscoTreatyPersons(prisma)

        // 13-13b. 샌프란시스코 강화조약 — 보강(섹션 6 + ECR 10 + 인물 6 + 미·일 안보조약 신규 Event)
        //  · 일본 7인 전권 위원 누락 5명(호시지마·이치마다·도쿠가와 무네요시·토마베치·사토) + 로물로
        //  · 회의 진행 일별·한국 미초청·서명 거부 3국·영토 조항·안보조약 패키지·학설사 섹션
        //  · 1951-09-08 미·일 안전보장조약 체결 신규 Event + 4섹션 + EventRelation 2건
        await seedSanFranciscoTreatyEnrich(prisma)

        // 13-14. 1949-10-01 중화인민공화국 수립 — 정치 카테고리
        //  · 중화민국(ROC) historicalCountry 인라인 등록
        //  · 저우언라이·류사오치·주더·쑹칭링·천윈·장제스(신규) / 마오·스탈린(기존)
        //  · Event + 8섹션(논문급) + EventCountryRelation 6 + PersonEvent 8
        await seedPrcFounding(prisma)

        // 13-15. 1853-07-08 ~ 1854-03-31 쿠로후네 내항 — 외교 카테고리
        //  · 도쿠가와 막부(에도 막부) historicalCountry 인라인 등록
        //  · 페리·필모어·이에요시·아베 마사히로·하야시 아키라·도쿠가와 나리아키(신규)
        //  · Event + 8섹션(논문급) + EventCountryRelation 6 + PersonEvent 6
        await seedKurofune(prisma)

        // 13-16. 1854-12-23 ~ 1855-11-11 안세이 대지진 시리즈 — 사회 카테고리
        //  · 부모 사건 + 자식 3(도카이·난카이·에도) + 4섹션 + 도쿠가와 막부(VICTIM)
        //  · 의존: seedKurofune(도쿠가와 막부 hc)
        await seedAnseiEarthquakes(prisma)

        // 13-17. 1858-09-08 ~ 1859-11-21 안세이 대옥 — 정치 카테고리
        //  · 단독 사건 + 4섹션 + 도쿠가와 막부(INITIATOR)
        //  · 의존: seedKurofune(도쿠가와 막부 hc)
        await seedAnseiPurge(prisma)

        // 13-5. Person.countryId 백필 — 인물 시드 모두 끝난 뒤 affiliation 체인으로 NULL 채움
        await seedBackfillPersonCountryId(prisma)

        // 14. 자연지리·인프라 — 한국·일본·미국·중국
        await seedKoreaGeography(prisma)
        await seedJapanGeography(prisma)
        await seedUsaGeography(prisma)
        await seedChinaGeography(prisma)

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
        await seedCurrencies(prisma)
        await seedLanguages(prisma)
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
