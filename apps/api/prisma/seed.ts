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
  seedUsaDemographics,
  seedEventCategories,
  seedGovernmentPositionDefinitions,
  seedGovernmentPositionDefinitionScopes,
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
  seedFranceHistoricalCountries,
  seedFranceHistoricalCountryRelations,
  seedAustriaHistoricalCountries,
  seedAustriaHistoricalCountryRelations,
  seedCroatiaHistoricalCountries,
  seedCroatiaHistoricalCountryRelations,
  seedPolandHistoricalCountries,
  seedPolandHistoricalCountryRelations,
  seedBohemiaHistoricalCountries,
  seedBohemiaHistoricalCountryRelations,
  seedDenmarkHistoricalCountries,
  seedDenmarkHistoricalCountryRelations,
  seedSloveniaHistoricalCountries,
  seedSloveniaHistoricalCountryRelations,
  seedBulgariaHistoricalCountries,
  seedBulgariaHistoricalCountryRelations,
  seedMontenegroHistoricalCountries,
  seedMontenegroHistoricalCountryRelations,
  seedRomaniaHistoricalCountries,
  seedRomaniaHistoricalCountryRelations,
  seedGreeceHistoricalCountries,
  seedGreeceHistoricalCountryRelations,
  seedAlbaniaHistoricalCountries,
  seedAlbaniaHistoricalCountryRelations,
  seedJoseonHistoricalCountries,
  seedJoseonHistoricalCountryRelations,
  seedNapoleonIII,
  seedPalmerston,
  seedCavour,
  seedBeneluxHistoricalCountries,
  seedBeneluxHistoricalCountryRelations,
  seedBritainMonarchs,
  seedPrussiaGermanyMonarchs,
  seedHohenzollernDynasty,
  seedWiveDynasties,
  seedRussiaEmperors,
  seedRomanovDynasty,
  seedRussiaUnofficialCommittee,
  seedDanilov,
  seedYanushkevich,
  seedGoremykin,
  seedBark,
  seedSazonov,
  seedBuchanan,
  seedPaleologue,
  seedKrivoshein,
  seedSukhomlinov,
  seedGrigorovich,
  seedWitte,
  seedBerchtold,
  seedPasic,
  seedPrincip,
  seedConrad,
  seedWillemI,
  seedLeopoldIBelgium,
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
  seedCrimeanWar,
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
  seedGermanEmpireMilitaryUnits,
  seedDimitrijevic,
  seedJoffre,
  seedTisza,
  seedPetain,
  seedGallieni,
  seedPotiorek,
  seedBeckRzikowsky,
  seedFriedrichTeschen,
  seedBethmannHollweg,
  seedBulow,
  seedAehrenthal,
  seedTrumpCabinet,
  seedWorldWarOnePersonGroups,
  seedWorldWarOneAppointmentDetails,
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

        // 2-1. 미국 연도별 인구 지표(연령·성별 인구 피라미드) 시딩
        await seedUsaDemographics(prisma)

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

        // 7-6. 프랑스 관련 역사 국가 시딩 (서프랑크~제5공화국, 로트링겐 공국)
        await seedFranceHistoricalCountries(prisma)

        // 7-6b. 프랑스 역사 국가 계승·소속 관계 시딩 (로트링겐 공국 → 프랑스 왕국·신성로마제국 소속)
        //  · 의존: seedGermanyHistoricalCountries(신성로마제국 — 소속 관계 대상)
        await seedFranceHistoricalCountryRelations(prisma)

        // 7-7. 오스트리아 관련 역사 국가 시딩 (변경백령~연합군 점령기)
        //  · 의존: seedGermanyHistoricalCountries(신성로마제국·독일 연방·나치 독일 — 계승/소속 관계 대상)
        await seedAustriaHistoricalCountries(prisma)

        // 7-8. 오스트리아 역사 국가 계승·소속 관계 시딩
        await seedAustriaHistoricalCountryRelations(prisma)

        // 7-9. 크로아티아 관련 역사 국가 시딩 (공국~사회주의 공화국)
        //  · 의존: seedCountries(현대 HR) + seedGermanyHistoricalCountries(나치 독일)
        //    + seedAustriaHistoricalCountries(오스트리아 제국·오스트리아-헝가리)
        //    + seedSerbiaHistoricalCountries(유고슬라비아 계열) — 계승/소속 관계 대상
        await seedCroatiaHistoricalCountries(prisma)

        // 7-10. 크로아티아 역사 국가 계승·소속 관계 시딩
        await seedCroatiaHistoricalCountryRelations(prisma)

        // 7-11. 폴란드 관련 역사 국가 시딩 (피아스트 공국~인민공화국)
        //  · 의존: seedCountries(현대 PL·LT·BY) + seedGermanyHistoricalCountries(프로이센·독일 제국·나치 독일)
        //    + seedRussiaHistoricalCountries(러시아 제국·소련) + seedAustriaHistoricalCountries(대공국·제국·이중제국)
        //    — 분할·독립 계승 관계 대상. 동군연합 수평 관계는 헝가리 왕국(인물 시드 유래)·작센 선제후국/왕국 참조
        await seedPolandHistoricalCountries(prisma)

        // 7-12. 폴란드 역사 국가 계승·소속 관계 시딩
        await seedPolandHistoricalCountryRelations(prisma)

        // 7-13. 보헤미아 관련 역사 국가 시딩 (아바르 칸국·사모 제국·대모라비아~체코슬로바키아)
        //  · 의존: seedCountries(현대 CZ·SK) + seedGermanyHistoricalCountries(신성로마제국·나치 독일·프랑크 왕국 — 아바르 정복 계승 대상)
        //    + seedAustriaHistoricalCountries(대공국·제국·이중제국 + 카란타니아 공국 — 사모 와해 계승 대상) + seedPolandHistoricalCountries(폴란드 왕국)
        //  · 보헤미아 왕국·헝가리 왕국은 인물 시드 선실행 시 그 행을 재사용(왕국은 fallback ENTRIES 포함)
        await seedBohemiaHistoricalCountries(prisma)

        // 7-14. 보헤미아 역사 국가 계승·소속 관계 시딩
        await seedBohemiaHistoricalCountryRelations(prisma)

        // 7-15. 덴마크 관련 역사 국가 시딩 (덴마크 왕국·칼마르 동맹·덴마크-노르웨이·슐레스비히/홀슈타인 공국)
        //  · 의존: seedGermanyHistoricalCountries(신성로마제국·독일 연방·프로이센 왕국 — 계승/소속 관계 대상)
        //  · 현대 DK/NO/SE는 country 시드 미포함 → 모던 링크는 DE(슐레스비히·홀슈타인)만 연결
        await seedDenmarkHistoricalCountries(prisma)

        // 7-16. 덴마크 역사 국가 계승·소속 관계 시딩
        await seedDenmarkHistoricalCountryRelations(prisma)

        // 7-17. 슬로베니아 관련 역사 국가 시딩 (카르니올라 공국·사회주의 공화국·독립 공화국)
        //  · 의존: seedCountries(현대 SI) + seedSerbiaHistoricalCountries(유고슬라비아 계열 — EXTRA 링크·계승/소속 대상)
        //    + seedAustriaHistoricalCountries(오스트리아 대공국·제국·이중제국 — 카르니올라 소속 대상)
        //    + seedGermanyHistoricalCountries(신성로마제국) + seedItalyHistoricalCountries(이탈리아 왕국 — 1920 라팔로 계승 대상)
        //  · 카란타니아 공국(658~828)은 austria 시드에서 관리(SI 링크 포함)
        await seedSloveniaHistoricalCountries(prisma)

        // 7-18. 슬로베니아 역사 국가 계승·소속 관계 시딩
        await seedSloveniaHistoricalCountryRelations(prisma)

        // 7-19. 불가리아 관련 역사 국가 시딩 (고대 대불가리아~불가리아 공화국 8건)
        //  · 의존: seedCountries(현대 BG·RO·RS·UA·RU) + seedBohemiaHistoricalCountries(아바르 칸국 — 크룸 병합 계승 대상)
        //  · 동로마 제국·오스만 제국은 사건 시드(콘스탄티노플 함락 1453·크림 전쟁) 유래 —
        //    첫 파이프라인 실행 순서상 없으면 관계 시드가 warn+skip 후 재실행에서 채움
        //  · MK(오흐리드)는 현대 국가 미등록이라 제1제국 링크는 미래용 표기(warn+skip)
        await seedBulgariaHistoricalCountries(prisma)

        // 7-20. 불가리아 역사 국가 계승·소속 관계 시딩
        await seedBulgariaHistoricalCountryRelations(prisma)

        // 7-21. 몬테네그로 관련 역사 국가 시딩 (두클랴~몬테네그로 공화국 7건)
        //  · 의존: seedCountries(현대 ME) + seedSerbiaHistoricalCountries(라슈카·세르비아 제국·유고 계열 — 계승/EXTRA 대상)
        //  · 동로마·오스만은 사건 시드 유래(7-19 불가리아 주석 참조) — 없으면 warn+skip 후 재실행에서 채움
        //  · 일리리아 주(slovenia 시드)의 ME 미래용 표기는 ME 등록 후 slovenia 재실행으로 링크
        await seedMontenegroHistoricalCountries(prisma)

        // 7-22. 몬테네그로 역사 국가 계승·소속 관계 시딩
        await seedMontenegroHistoricalCountryRelations(prisma)

        // 7-23. 루마니아 관련 역사 국가 시딩 (다키아~현대 루마니아 + 몰도바 공화국 10건)
        //  · 의존: seedCountries(현대 RO·MD) + seedItalyHistoricalCountries(로마 제국 — 다키아 정복 대상)
        //    + 헝가리 왕국(인물 시드 유래)·러시아 제국·소련·몰다비아 소비에트 사회주의 공화국(러시아 계열 시드)
        //  · 오스만은 사건 시드 유래(7-19 주석 참조) — 없으면 warn+skip 후 재실행에서 채움
        await seedRomaniaHistoricalCountries(prisma)

        // 7-24. 루마니아 역사 국가 계승·소속 관계 시딩
        await seedRomaniaHistoricalCountryRelations(prisma)

        // 7-25. 그리스 관련 역사 국가 시딩 (미케네 문명~그리스 공화국 18건)
        //  · 의존: seedCountries(현대 GR) + seedItalyHistoricalCountries(로마 공화국·제국·베네치아 공화국 —
        //    고대 정복 계승·이오니아 제도 전신 대상) + seedBritainHistoricalCountries(연합왕국 — 이오니아 보호국)
        //  · 동로마·오스만은 사건 시드 유래(7-19 불가리아 주석 참조) — 없으면 warn+skip 후 재실행에서 채움
        //  · 동로마 제국→오스만 제국(1453) 엣지는 이 배치에서 처음 개통
        //  · AL(에페이로스 창건기 강역)은 현대 국가 미등록 — 등록 후 재실행 시 링크(미래용 표기)
        await seedGreeceHistoricalCountries(prisma)

        // 7-26. 그리스 역사 국가 계승·소속 관계 시딩
        await seedGreeceHistoricalCountryRelations(prisma)

        // 7-27. 알바니아 관련 역사 국가 시딩 (일리리아 왕국~알바니아 공화국 16건)
        //  · 의존: seedCountries(현대 AL·ME·GR) + seedItalyHistoricalCountries(로마 공화국·제국 —
        //    EXTRA 링크 대상, 베네치아 공화국·나폴리 왕국·시칠리아 왕국·파시스트 이탈리아 — 소속 대상)
        //    + seedGreeceHistoricalCountries(마케도니아 왕국) + seedMontenegroHistoricalCountries(제타 공국)
        //    + seedBulgariaHistoricalCountries(불가리아 제2제국) + seedSloveniaHistoricalCountries(일리리아 주)
        //    + seedGermanyHistoricalCountries(나치 독일)
        //  · 동로마·오스만은 사건 시드 유래(7-19 불가리아 주석 참조) — 없으면 warn+skip 후 재실행에서 채움
        //  · 에페이로스 전제군주국(greece 시드)·두클랴·제타 공국(montenegro 시드)의 'AL 미래용' 표기는
        //    AL 등록 후 각 시드 재실행으로 활성화된다 — 여기서 중복 링크하지 않는다
        //  · 선재 행 '알바니아 왕국'(1272~1368, UI 생성)은 생성하지 않고 NULL 필드만 가드 백필한다
        await seedAlbaniaHistoricalCountries(prisma)

        // 7-28. 알바니아 역사 국가 계승·소속 관계 시딩
        await seedAlbaniaHistoricalCountryRelations(prisma)

        // 7-29. 조선 왕조 역사 국가 시딩 (고려 → 조선 → 대한제국)
        //  · 의존: seedCountries(현대 KR). KP는 country 테이블에 없어 링크가 warn+skip된다
        //  · 선재 행 '조선민주주의인민공화국'(1948~)과는 완전 별개 행 — 멱등 판정은 name 완전 일치
        await seedJoseonHistoricalCountries(prisma)

        // 7-30. 조선 왕조 계승·소속 관계 시딩
        //  · 의존: 선재 행 '일본 제국'·'청나라' — 없으면 warn+skip 후 재실행에서 채움
        await seedJoseonHistoricalCountryRelations(prisma)

        // 8. 관직 정의 시딩 (군주 시딩보다 먼저 실행)
        await seedGovernmentPositionDefinitions(prisma)
        //  ⚠️ 적용 범위(스코프) 시딩은 여기가 아니라 **맨 끝(16)** 이다.
        //     일본 제국·일본국·도쿠가와 막부는 7-x 블록이 아니라 인물·사건 시드(메이지/전후/쿠로후네)
        //     안에서 생성돼, 여기서 돌리면 역사국가 타깃만 조용히 유실되고 현대 국가 축만 남는다.
        //     스코프가 1개라도 생기면 '그 국가 전용'으로 확정되므로 0개(전역)보다 나쁜 상태가 된다.

        // 8-1. 나폴레옹 3세 + 가족 + 제2공화국 대통령/제2제국 황제 시딩
        //  · 의존: seedFranceHistoricalCountries(제1제국·제2공화국·제2제국 HC) + 관직 정의(대통령·황제)
        //  · 보나파르트 가문 인라인 + Person x5 + 대통령 재임/행정부 + 황제 재위 + 소속/별명/연보/능력치
        await seedNapoleonIII(prisma)

        // 8-2. 파머스턴 자작(Henry John Temple) — 영국 외무장관·총리 시딩
        //  · 의존: seedBritainHistoricalCountries(연합왕국·그레이트브리튼 왕국 HC) + 관직 정의(총리)
        //  · Person x1 + 총리 재임 2건/내각 2건 + 소속국가/별명/연보/능력치
        await seedPalmerston(prisma)

        // 8-3. 카보우르 백작 — 사르데냐 왕국 총리 / 이탈리아 왕국 초대 총리 시딩
        //  · 의존: seedItalyHistoricalCountries(사르데냐 왕국·이탈리아 왕국 HC) + 관직 정의(총리)
        //  · Person x1 + 총리 재임 3건/내각 3건 + 소속국가/별명/연보/능력치
        await seedCavour(prisma)

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

        // 11-2. 유리 다닐로프 — 참모본부·스타프카 병참감 (WWI 개전기 러시아군 작전 총괄)
        //  · 의존: seedRussiaHistoricalCountries(러시아 제국 HC). 프랑스 제3공화국 HC는 있으면 망명지(EXILE) 연결
        //  · Person x1 + 군 재임(MILITARY_COMMANDER) 5건 + 소속국가/별명/연보 15건/능력치
        await seedDanilov(prisma)

        // 11-3. 니콜라이 야누시케비치 — 스타프카 참모장 (다닐로프의 직속 상관, 명목상 참모장)
        //  · 의존: seedRussiaHistoricalCountries(러시아 제국 HC)
        //  · Person x1 + 군 재임(MILITARY_COMMANDER) 5건 + 소속국가/연보 18건/능력치 (별명 없음)
        await seedYanushkevich(prisma)

        // 11-4. 이반 고레미킨 — 대신회의 의장(총리) 2회 (제2대 1906·제5대 1914~1916, WWI 개전기)
        //  · 의존: seedRussiaHistoricalCountries(러시아 제국 HC) + 관직 정의(총리·내무장관)
        //  · Person x1 + 내무장관 재임 1건 + 총리 재임 2건/내각 2건 + 소속국가/연보 17건/능력치
        await seedGoremykin(prisma)

        // 11-5. 표트르 바르크 — 러시아 제국 마지막 재무장관 (1914~1917, 전시 금주·전쟁 재정)
        //  · 의존: seedRussiaHistoricalCountries(러시아 제국 HC) + 관직 정의(재무장관)
        //    영국 HC(그레이트브리튼 및 북아일랜드 연합왕국)는 있으면 망명지(EXILE) 연결
        //  · Person x1 + 재무장관 재임 1건 + 소속국가 2/별명 1/연보 17건/능력치
        await seedBark(prisma)

        // 11-6. 세르게이 사조노프 — 외무장관 (1910~1916, 발칸 동맹·7월 위기 총동원·전시 외교)
        //  · 의존: seedRussiaHistoricalCountries(러시아 제국 HC) + 관직 정의(외무장관)
        //    프랑스 제3공화국 HC는 있으면 망명지(EXILE) 연결
        //  · Person 보강 x1 + 외무장관 재임 1건 + 소속국가 2/연보 28건/능력치
        await seedSazonov(prisma)

        // 11-7. 조지 뷰캐넌 — 주러시아 영국 대사 (1910~1918, WWI 페트로그라드 협상국 외교의 축)
        //  · 의존: seedBritainHistoricalCountries(그레이트브리튼 및 아일랜드 연합왕국 HC) +
        //    관직 정의(대사·특명전권공사). 러시아 제국 HC는 주재국 표기에만 사용(연결 없음)
        //  · Person x1 + 외교관 재임(DIPLOMATIC_POST) 4건 + 소속국가/연보 23건/능력치
        await seedBuchanan(prisma)

        // 11-8. 모리스 팔레올로그 — 주러시아 프랑스 대사 (1914~1917, 7월 위기 확약 논쟁·«차르들의 러시아»)
        //  · 의존: seedFranceHistoricalCountries(프랑스 제3공화국 HC) + 관직 정의(대사·특명전권공사)
        //  · Person x1 + 재임 3건(주불가리아 공사·주러시아 대사·외무부 사무총장) + 소속국가/연보 15건/능력치
        await seedPaleologue(prisma)

        // 11-9. 알렉산드르 크리보셰인 — 토지정비·농업총국 장관 (1908~1915, 스톨리핀 개혁 집행·1915 각료 반발 리더)
        //  · 의존: seedRussiaHistoricalCountries(러시아 제국 HC). 장관 정의는 카탈로그에 없어 title 직접 기입
        //  · Person x1 + 장관 재임 1건 + 소속국가/연보 17건/능력치 (남러시아 정부 수반은 HC 부재로 연보 처리)
        await seedKrivoshein(prisma)

        // 11-10. 블라디미르 수호믈리노프 — 전쟁장관 (1909~1915, WWI 개전기 육군 총괄·1917 유죄판결)
        //  · 의존: seedRussiaHistoricalCountries(러시아 제국 HC) + 관직 정의(전쟁장관)
        //  · Person x1 + 재임 7건(군 지휘 6 + 전쟁장관 1) + 소속국가 2/연보 34건/능력치
        await seedSukhomlinov(prisma)

        // 11-11. 이반 그리고로비치 — 제국 마지막 해군장관 (1911~1917, 쓰시마 이후 함대 재건)
        //  · 의존: seedRussiaHistoricalCountries(러시아 제국 HC) + 관직 정의(해군장관)
        //    프랑스 제3공화국 HC는 있으면 망명지(EXILE) 연결
        //  · Person x1 + 재임(해군 지휘 + 해군장관) + 소속국가/연보/능력치
        await seedGrigorovich(prisma)

        // 11-12. 세르게이 비테 — 재무장관(1892~1903)·제국 초대 총리(1905~1906)
        //  · 의존: seedRussiaHistoricalCountries(러시아 제국 HC) + 관직 정의(총리·재무장관)
        //  · 총리 재임은 termNumber=1 (고레미킨 시드가 전제한 비테1→고레미킨2→스톨리핀3 축)
        //    + Cabinet 행 동반 생성
        //  · Person x1 + 재임 5건 + 내각 1건 + 소속국가/연보 33건/능력치
        await seedWitte(prisma)

        // 11-13. 레오폴트 베르히톨트 — 오스트리아-헝가리 외무장관(1912~1915, 7월 최후통첩)
        //  · 의존: seedAustriaHistoricalCountries(오스트리아-헝가리 제국 HC) +
        //    관직 정의(외무장관·대사). 이 시리즈 첫 비(非)러시아 중부유럽 인물 — 그레고리력이라
        //    구력 병기 없음(러시아 측 사료 인용 시에만 라벨)
        //  · Person x1 + 재임(주러 대사·외무장관·궁내장관) + 소속국가/연보/능력치
        await seedBerchtold(prisma)

        // 11-14. 니콜라 파시치 — 세르비아 총리(다수 회차)·SCS 왕국 총리, 7월 최후통첩 수신자
        //  · 의존: seedSerbiaHistoricalCountries(세르비아 왕국(근대)·세르비아-크로아티아-
        //    슬로베니아 왕국 HC) + 관직 정의(총리)
        //  · ⚠️세르비아는 1919년까지 율리우스력 — 국내 날짜는 구력이라 환산·병기 필요
        //  · 두 국가(세르비아 왕국 → SCS 왕국)에 걸친 첫 인물 + 총리 재임마다 Cabinet 동반
        await seedPasic(prisma)

        // 11-15. 프란츠 콘라트 폰 회첸도르프 — 오스트리아-헝가리 참모총장(1906~11·1912~17)
        //  · 의존: seedAustriaHistoricalCountries(오스트리아-헝가리 제국 HC)
        //  · 군 직책은 카탈로그에 관직 정의가 없어 title 직접 기입(군인 시드 규약)
        //  · 그레고리력이라 구력 병기 없음(베르히톨트와 동일)
        await seedConrad(prisma)

        // 11-16. 가브릴로 프린치프 — 1914-06-28 사라예보 저격의 실행자
        //  · 의존: seedAustriaHistoricalCountries(오스트리아-헝가리 제국 HC).
        //    세르비아 왕국(근대) HC와 「사라예보 암살 사건」 event는 있으면 연결, 없으면 생략
        //  · ⚠️이 시리즈 최초의 «공직 이력 0건» 인물 — 재임(GovernmentPositionTenure) 0건이라
        //    관직 정의·Cabinet 의존이 없고, 그 자리를 연보와 PersonEvent 연결이 대신한다
        //  · 국적은 오스트리아-헝가리 신민, 베오그라드 체류는 PRIMARY_RESIDENCE로만(국적 아님)
        //  · Person x1 + 별칭 2 + 소속국가 2 + 사건 연결 1 + 연보 30건 + 능력치
        await seedPrincip(prisma)

        // 11-17. 빌럼 1세 — 네덜란드 초대 국왕(1815~1840)·«상인왕»
        //  · 의존: 네덜란드 연합왕국·네덜란드 왕국 HC + 관직 정의('국왕')
        //  · ⚠️군주라 GovernmentPositionTenure가 아닌 **SovereignReign**을 쓴다
        //    (유니크 제약 historicalCountryId+regnalNumber — 네덜란드 계열은 현재 비어 있음)
        //  · 주권공(1813~15)·룩셈부르크 대공은 대응 HC가 없어 재위 아닌 연보로 처리
        await seedWillemI(prisma)

        // 11-18. 레오폴트 1세 — 벨기에 초대 국왕(1831~1865)·「벨기에인의 왕」
        //  · 의존: seedBeneluxHistoricalCountries(벨기에 왕국 HC) + 관직 정의('국왕')
        //    + seedSavoyDynasty(「벨기에 왕가 (작센-코부르크-고타)」 왕조)
        //  · ⚠️군주 변형 — SovereignReign 1건. regnalNumber는 **국가 통산 대수**(벨기에 제1대),
        //    이름별 서수 «1세»는 SovereignReign.regnalName에(정본 P). 벨기에 HC는 재위 0건이라
        //    (hc, rn=1) 무주공산이므로 유니크 충돌 없음
        //  · 재위 시작은 선출일(06-04)이 아니라 **헌법 선서일 1831-07-21** — 선출은 조건부였고
        //    섭정 쉬르레 드 쇼키에가 07-21까지 재임해 06-04을 쓰면 47일 중첩된다
        //  · 러시아군 복무는 임관·계급·역법이 전부 미확정이라 재임 아닌 연보로 처리
        //  · 부모 2명을 최소 카드로 신규 등록해 형 에른스트 1세·누나 빅토리아 공녀와 형제 관계를
        //    잇는다(이 스키마는 형제를 부모 공유로만 표현) → 조카 빅토리아 여왕·앨버트까지 연결
        //  · 「벨기에 왕가」 왕조의 founderId가 NULL이라 이 인물로 채운다
        //  · Person x1 + 부모 2 + 재위 1 + 별칭 6 + 소속국가 6 + 연보 40건 + 능력치
        await seedLeopoldIBelgium(prisma)

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

        // 13-2-1. 크림 전쟁(1853–1856) 시딩 — eventCategory + 역사국가(러시아 제국·오스만 제국·
        //   프랑스 제2제국·연합왕국·사르데냐 왕국) + 인물(나폴레옹 3세·카보우르·파머스턴 등) 의존
        //   · 부모 + 자식 4(시노프·알마·발라클라바·세바스토폴) + 진영 2 + 군사상세 + PersonEvent
        await seedCrimeanWar(prisma)

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
        //  · 회의 진행 일별·한국 미초청·서명 거부 3국·영토 조항·안보조약 패키지·학계 평가 섹션
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

        // 15. 독일 제국 군부대 — 제1차 세계 대전 서부전선 제1군 + 육군 최고사령부(OHL)
        //  · 의존: seedGermanyHistoricalCountries(독일 제국 HC) + seedCountries(현대 DE)
        //    + seedAdministrationDepartmentCategories(국방 카테고리) — 그래서 카테고리 시드 뒤에 둔다
        //  · 초대 사령관 알렉산더 폰 클루크는 시드가 아니라 UI로 등록된 인물이라
        //    fresh reset 직후에는 없다 — 그때는 warn 후 지휘관 연결만 건너뛴다
        await seedGermanEmpireMilitaryUnits(prisma)

        // 11-12. 드라구틴 디미트리예비치 «아피스» — 세르비아 참모본부 정보부장·흑수단 창립자
        //  · 의존: seedSerbiaHistoricalCountries('세르비아 왕국 (근대)' HC)
        //  · Person x1 + 군 재임 12건(appointmentDetail 포함) + 소속/별명/연보 18건/능력치
        await seedDimitrijevic(prisma)

        // 11-13. 조제프 조프르 — 프랑스군 총사령관(1914~16)·원수. UI 등록 스텁 행 보강 전용.
        //  · 의존: seedFranceHistoricalCountries('프랑스 제3공화국' HC)
        //  · Person 필드 보강 + 군 재임 15건(appointmentDetail 포함) + 연보 18건/능력치
        await seedJoffre(prisma)

        // 11-14. 티사 이슈트반 — 헝가리 왕국 총리(1903~05·1913~17), 1914년 7월 유일한 개전 반대자
        //  · 의존: '헝가리 왕국' HC + '총리' 관직 정의. 총리직은 이중제국 공동정부가 아니라
        //    헝가리 왕국 정부 소속이라 HC가 «오스트리아-헝가리 제국»이 아니다
        //  · Person x1 + 재임 6건(경위 포함)/내각 2 + 소속/별명/연보 17건/능력치
        await seedTisza(prisma)

        // 11-15. 필리프 페탱 — 베르됭의 원수이자 비시 프랑스 국가주석. UI 스텁 행 보강 전용.
        //  · 의존: '프랑스 제3공화국' HC + '비시 프랑스' HC(1940~44 재임 2건은 이쪽에 붙는다)
        //  · Person 필드 보강 + 재임 14건(경위 전건)/소속/별명 2/연보 22건/능력치
        await seedPetain(prisma)

        // 11-16. 조제프 갈리에니 — 파리 군사총독(1914)·마다가스카르 총독. UI 스텁 행 보강 전용.
        //  · 의존: '프랑스 제3공화국' HC (주 국적이 제2제국으로 오등록돼 있어 함께 교정한다)
        //  · Person 필드 보강 + 재임 10건(경위 전건)/소속/별명 2/연보 21건/능력치
        await seedGallieni(prisma)

        // 11-17. 오스카어 포티오레크 — 보스니아-헤르체고비나 주지사(1911~14)·1914 대세르비아
        //  침공군 총사령관. 사라예보 사건 당일 경호 총책임자였다.
        //  · 의존: '오스트리아-헝가리 제국' HC
        //  · Person x1 + 재임 6건(경위 전건, 참모본부~군단장~주지사~총사령관) + 소속/연보 16건/능력치
        await seedPotiorek(prisma)

        // 11-18. 프리드리히 베크-지코프스키 — 참모총장(1881~1906, 25년)·콘라트의 직전 전임자.
        //  · 의존: '오스트리아-헝가리 제국' HC
        //  · Person x1 + 재임 4건(경위 전건) + 소속/별명/연보 18건/능력치
        await seedBeckRzikowsky(prisma)

        // 11-19. 프리드리히 폰 외스터라이히-테셴 대공 — 오스트리아-헝가리군 명목상
        //  최고사령관(1914~1916). 실권은 참모총장 콘라트에게 있었다.
        //  · 의존: '오스트리아-헝가리 제국' HC
        //  · Person x1 + 재임 4건(경위 전건) + 소속/연보 16건/능력치
        await seedFriedrichTeschen(prisma)

        // 11-20. 테오발트 폰 베트만홀베크 — 독일 제국 총리(1909~1917), 1914 7월 위기
        //  "백지수표"·벨기에 중립 "종잇조각" 발언의 당사자.
        //  · 의존: '독일 제국' HC + 관직 정의(총리·내무장관)
        //  · Person x1 + 재임 5건(경위 전건)/내각 1 + 소속/연보 20건/능력치
        await seedBethmannHollweg(prisma)

        // 11-21. 베른하르트 폰 뷜로 — 독일 제국 총리(1900~1909), 베트만홀베크의 직전 전임자.
        //  세계정책·함대 확장, 1905 제1차 모로코 위기·1908 데일리 텔레그래프 사건의 당사자.
        //  · 의존: '독일 제국' HC + 관직 정의(총리·외무장관·대사·공사)
        //  · Person x1 + 재임 6건(경위 전건)/내각 1 + 소속/연보 20건/능력치
        await seedBulow(prisma)

        // 11-22. 알로이스 렉사 폰 에렌탈 — 오스트리아-헝가리 외무장관(1906~1912, 재임 중
        //  사망). 1908 보스니아 병합·콘라트 해임 관철의 당사자. UI 스텁 행 보강 전용.
        //  · 의존: '오스트리아-헝가리 제국' HC + 관직 정의(외무장관·대사·특명전권공사)
        //  · Person 필드 보강 + 재임 3건(경위 전건) + 소속/연보 17건/능력치
        await seedAehrenthal(prisma)

        // 11-23. 트럼프 2기 내각 각료 15부 — 법무·노동·국토안보는 전임자 포함 18명.
        //  · 의존: seedCountries('미국') + seedGovernmentPositionDefinitions(국무장관 등 신설 10종)
        //  · Person x18 + 소속(CITIZENSHIP→미국) x18 + 재임(CABINET_MINISTER, countryId=미국) x18
        await seedTrumpCabinet(prisma)

        // 15-1. 제1차 세계대전 인물 묶음(PersonGroup) 7종 — **인물 시드가 모두 끝난 뒤**.
        //  · 7월 위기 결정자·1915 연명서한 서명자/친정 지지 진영·스타프카 수뇌·전시 각의·
        //    페트로그라드 협상국 대사단·프랑스 전시 지도부
        //  · 미등록 인물은 warn 후 건너뛰고, 나중에 인물이 등록되면 재실행으로 멤버만 백필된다
        await seedWorldWarOnePersonGroups(prisma)

        // 15-2. WWI 인물 재임의 취임 배경(appointmentDetail) 보강 — **인물 시드가 모두 끝난 뒤**.
        //  · 인물 시드는 기존 재임을 통째로 스킵하므로 이 축은 별도 보강 경로가 필요하다
        //  · 이미 값이 있으면 덮어쓰지 않는다(UI 편집 보호)
        await seedWorldWarOneAppointmentDetails(prisma)

        // 16. 관직 정의 적용 범위(스코프) 시딩 — **반드시 맨 끝**.
        //  · 스코프 행 0개 = 전역, 1개 이상 = 그 국가에서만 노출(government.prisma 규약)
        //  · 참조하는 역사국가가 7-x 블록뿐 아니라 인물·사건 시드에서도 만들어진다:
        //    일본 제국=seedJapanMeijiEra / 일본국=seedJapanPostwar / 도쿠가와 막부=seedKurofune.
        //    한 타깃이라도 먼저 돌면 그 항목은 현대 국가 축만 남아 '현대 전용'으로 굳는다.
        //  · 조선 관계 시드도 같은 이유로 여기서 한 번 더 돌린다(일본 제국·청나라가 그때서야 존재).
        //    두 시드 모두 멱등이라 재실행이 안전하다.
        await seedJoseonHistoricalCountryRelations(prisma)
        await seedGovernmentPositionDefinitionScopes(prisma)

        // 16-1. Person.countryId 백필 재실행 — 13-5 이후에도 인물 시드(Dimitrijevic~트럼프 내각 등)가
        //  여럿 더 있어 그 사이 생성된 인물은 13-5 시점엔 아직 없었다. 멱등(countryId가 NULL인
        //  인물만 처리)이라 두 번째 호출은 안전하다.
        await seedBackfillPersonCountryId(prisma)

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
