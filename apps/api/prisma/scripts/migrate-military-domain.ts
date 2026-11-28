/**
 * 군사 편제 도메인 정본화 마이그레이션 및 시드 스크립트
 *
 * 1. 보편 군 계급 + 주요 역사국가 고유 계급(`MilitaryRank`) 시드 (멱등)
 * 2. 기존 군 보직(`GovernmentPositionTenure`)의 `militaryRankId` 및 `militaryRoleKind` 정본 백필
 * 3. 레거시 `MilitaryUnitCommander` 잔존 행(알렉산더 폰 클루크)의 전투경험 메모를 정본 Tenure에 병합 후 중복 제거
 * 4. 기존 66개 부대(`MilitaryUnit`)의 병과(`combatArm`) 및 주둔지 `garrisonPlaceId` 정본 매칭
 * 5. 기존 `notableBattles` 텍스트에 적혀 있던 4개 부대의 주요 참전 전투들을 실제 `Event(MILITARY/BATTLE)` + `EventSide` + `SideDeployedUnit`으로 무손실 정규화
 */
import {
  Era,
  MilitaryBranch,
  MilitaryCombatArm,
  MilitaryRankCategory,
  MilitaryUnitRoleKind,
  PrismaClient,
  SideUnitRole,
} from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

interface RankSeedDef {
  name: string
  nameLocal?: string
  nameEn?: string
  abbreviation?: string
  category: MilitaryRankCategory
  rankOrder: number
  natoCode?: string
  branch?: MilitaryBranch | null
  historicalCountryNames?: string[]
}

const UNIVERSAL_RANKS: RankSeedDef[] = [
  { name: '대원수', nameEn: 'Generalissimo', category: 'MARSHAL', rankOrder: 105, natoCode: 'OF-11' },
  { name: '원수', nameEn: 'Field Marshal / Marshal', abbreviation: 'FM', category: 'MARSHAL', rankOrder: 100, natoCode: 'OF-10' },
  { name: '해군원수', nameEn: 'Fleet Admiral / Admiral of the Fleet', abbreviation: 'FADM', category: 'MARSHAL', rankOrder: 100, natoCode: 'OF-10', branch: 'NAVY' },
  { name: '공군원수', nameEn: 'Marshal of the Air Force', category: 'MARSHAL', rankOrder: 100, natoCode: 'OF-10', branch: 'AIR_FORCE' },
  { name: '대장', nameEn: 'General', abbreviation: 'Gen.', category: 'GENERAL', rankOrder: 90, natoCode: 'OF-9' },
  { name: '제독', nameEn: 'Admiral', abbreviation: 'Adm.', category: 'GENERAL', rankOrder: 90, natoCode: 'OF-9', branch: 'NAVY' },
  { name: '중장', nameEn: 'Lieutenant General', abbreviation: 'Lt.Gen.', category: 'GENERAL', rankOrder: 80, natoCode: 'OF-8' },
  { name: '해군중장', nameEn: 'Vice Admiral', abbreviation: 'VAdm.', category: 'GENERAL', rankOrder: 80, natoCode: 'OF-8', branch: 'NAVY' },
  { name: '소장', nameEn: 'Major General', abbreviation: 'Maj.Gen.', category: 'GENERAL', rankOrder: 70, natoCode: 'OF-7' },
  { name: '해군소장', nameEn: 'Rear Admiral', abbreviation: 'RAdm.', category: 'GENERAL', rankOrder: 70, natoCode: 'OF-7', branch: 'NAVY' },
  { name: '준장', nameEn: 'Brigadier General', abbreviation: 'Brig.Gen.', category: 'GENERAL', rankOrder: 60, natoCode: 'OF-6' },
  { name: '대령', nameEn: 'Colonel', abbreviation: 'Col.', category: 'FIELD_OFFICER', rankOrder: 50, natoCode: 'OF-5' },
  { name: '해군대령', nameEn: 'Captain (Navy)', abbreviation: 'Capt.', category: 'FIELD_OFFICER', rankOrder: 50, natoCode: 'OF-5', branch: 'NAVY' },
  { name: '중령', nameEn: 'Lieutenant Colonel', abbreviation: 'Lt.Col.', category: 'FIELD_OFFICER', rankOrder: 45, natoCode: 'OF-4' },
  { name: '소령', nameEn: 'Major', abbreviation: 'Maj.', category: 'FIELD_OFFICER', rankOrder: 40, natoCode: 'OF-3' },
  { name: '대위', nameEn: 'Captain', abbreviation: 'Capt.', category: 'COMPANY_OFFICER', rankOrder: 30, natoCode: 'OF-2' },
  { name: '중위', nameEn: 'First Lieutenant', abbreviation: '1st Lt.', category: 'COMPANY_OFFICER', rankOrder: 25, natoCode: 'OF-1' },
  { name: '소위', nameEn: 'Second Lieutenant', abbreviation: '2nd Lt.', category: 'COMPANY_OFFICER', rankOrder: 20, natoCode: 'OF-1' },
  { name: '준위', nameEn: 'Warrant Officer', abbreviation: 'WO', category: 'WARRANT_OFFICER', rankOrder: 18, natoCode: 'WO-1' },
  { name: '원사', nameEn: 'Sergeant Major', abbreviation: 'SGM', category: 'NCO', rankOrder: 15, natoCode: 'OR-9' },
  { name: '상사', nameEn: 'Master Sergeant', abbreviation: 'MSG', category: 'NCO', rankOrder: 14, natoCode: 'OR-8' },
  { name: '중사', nameEn: 'Sergeant First Class', abbreviation: 'SFC', category: 'NCO', rankOrder: 13, natoCode: 'OR-6' },
  { name: '하사', nameEn: 'Sergeant / Staff Sergeant', abbreviation: 'SGT', category: 'NCO', rankOrder: 12, natoCode: 'OR-5' },
  { name: '병장', nameEn: 'Corporal', abbreviation: 'CPL', category: 'ENLISTED', rankOrder: 8, natoCode: 'OR-4' },
  { name: '상병', nameEn: 'Lance Corporal / Specialist', abbreviation: 'LCpl', category: 'ENLISTED', rankOrder: 7, natoCode: 'OR-3' },
  { name: '일병', nameEn: 'Private First Class', abbreviation: 'PFC', category: 'ENLISTED', rankOrder: 6, natoCode: 'OR-2' },
  { name: '이병', nameEn: 'Private', abbreviation: 'PVT', category: 'ENLISTED', rankOrder: 5, natoCode: 'OR-1' },
]

const HISTORICAL_POLITY_RANKS: RankSeedDef[] = [
  // 독일 제국 · 나치 독일 고유 장성·원수 계급
  {
    name: '제국원수',
    nameLocal: 'Reichsmarschall',
    nameEn: 'Reich Marshal',
    category: 'MARSHAL',
    rankOrder: 106,
    natoCode: 'OF-11',
    historicalCountryNames: ['나치 독일'],
  },
  {
    name: '육군원수',
    nameLocal: 'Generalfeldmarschall',
    nameEn: 'General Field Marshal',
    abbreviation: 'GFM',
    category: 'MARSHAL',
    rankOrder: 100,
    natoCode: 'OF-10',
    branch: 'ARMY',
    historicalCountryNames: ['독일 제국', '나치 독일', '오스트리아-헝가리 제국'],
  },
  {
    name: '대제독',
    nameLocal: 'Großadmiral',
    nameEn: 'Grand Admiral',
    category: 'MARSHAL',
    rankOrder: 100,
    natoCode: 'OF-10',
    branch: 'NAVY',
    historicalCountryNames: ['독일 제국', '나치 독일', '오스트리아-헝가리 제국'],
  },
  {
    name: '상급대장',
    nameLocal: 'Generaloberst',
    nameEn: 'Colonel General',
    abbreviation: 'GenObst',
    category: 'GENERAL',
    rankOrder: 95,
    natoCode: 'OF-9+',
    branch: 'ARMY',
    historicalCountryNames: ['독일 제국', '나치 독일', '오스트리아-헝가리 제국'],
  },
  {
    name: '보병대장',
    nameLocal: 'General der Infanterie',
    nameEn: 'General of the Infantry',
    category: 'GENERAL',
    rankOrder: 90,
    natoCode: 'OF-9',
    branch: 'ARMY',
    historicalCountryNames: ['독일 제국', '나치 독일', '오스트리아-헝가리 제국'],
  },
  {
    name: '기갑대장',
    nameLocal: 'General der Panzertruppe',
    nameEn: 'General of Panzer Troops',
    category: 'GENERAL',
    rankOrder: 90,
    natoCode: 'OF-9',
    branch: 'ARMY',
    historicalCountryNames: ['나치 독일'],
  },
  {
    name: '포병대장',
    nameLocal: 'General der Artillerie',
    nameEn: 'General of the Artillery',
    category: 'GENERAL',
    rankOrder: 90,
    natoCode: 'OF-9',
    branch: 'ARMY',
    historicalCountryNames: ['독일 제국', '나치 독일'],
  },
  {
    name: '기병대장',
    nameLocal: 'General der Kavallerie',
    nameEn: 'General of the Cavalry',
    category: 'GENERAL',
    rankOrder: 90,
    natoCode: 'OF-9',
    branch: 'ARMY',
    historicalCountryNames: ['독일 제국', '나치 독일', '오스트리아-헝가리 제국'],
  },
  {
    name: '항공대장',
    nameLocal: 'General der Flieger',
    nameEn: 'General of the Flyers',
    category: 'GENERAL',
    rankOrder: 90,
    natoCode: 'OF-9',
    branch: 'AIR_FORCE',
    historicalCountryNames: ['나치 독일'],
  },
  // 소비에트 연방 고유 계급
  {
    name: '소비에트 연방 원수',
    nameLocal: 'Маршал Советского Союза',
    nameEn: 'Marshal of the Soviet Union',
    category: 'MARSHAL',
    rankOrder: 100,
    natoCode: 'OF-10',
    historicalCountryNames: ['소비에트 사회주의 공화국 연방', '소련'],
  },
  {
    name: '상장',
    nameLocal: 'Генерал-полковник',
    nameEn: 'Colonel General',
    category: 'GENERAL',
    rankOrder: 85,
    natoCode: 'OF-8+',
    historicalCountryNames: ['소비에트 사회주의 공화국 연방', '소련'],
  },
  // 조선 무반 품계 대표
  {
    name: '종2품 병마절도사',
    nameLocal: '從二品 兵馬節度使',
    category: 'TRADITIONAL',
    rankOrder: 82,
    branch: 'ARMY',
    historicalCountryNames: ['조선'],
  },
  {
    name: '종2품 수군절도사',
    nameLocal: '從二品 水軍節度使',
    category: 'TRADITIONAL',
    rankOrder: 82,
    branch: 'NAVY',
    historicalCountryNames: ['조선'],
  },
  {
    name: '정3품 절충장군',
    nameLocal: '正三品 折衝將軍',
    category: 'TRADITIONAL',
    rankOrder: 72,
    historicalCountryNames: ['조선'],
  },
]

interface BattleSeedItem {
  title: string
  subtitle?: string
  startYear: number
  startMonth?: number
  startDay?: number
  endYear?: number
  endMonth?: number
  endDay?: number
  parentKeywords: string[]
  sideName: string
  role: SideUnitRole
  note?: string
}

const NOTABLE_BATTLES_MIGRATION: Array<{
  unitId: string
  countryId: string | null
  historicalCountryId: string | null
  battles: BattleSeedItem[]
}> = [
  {
    // 중부집단군 (나치 독일)
    unitId: '2983520d-b524-413f-b17b-e288f08c7a21',
    countryId: '713f8aaf-f9ae-4ee1-aacc-758dfd38a340',
    historicalCountryId: '62f80e5d-84da-4071-afc5-2019679c2da8',
    battles: [
      {
        title: '비아위스토크-민스크 전투',
        startYear: 1941,
        startMonth: 6,
        startDay: 22,
        endYear: 1941,
        endMonth: 7,
        endDay: 9,
        parentKeywords: ['독소전쟁', '바르바로사', '제2차 세계 대전', '제2차 세계대전'],
        sideName: '독일 국방군 (추축국)',
        role: 'MAIN_EFFORT',
        note: '소련 서부전선군 주력 이중 포위 섬멸',
      },
      {
        title: '스몰렌스크 전투',
        startYear: 1941,
        startMonth: 7,
        startDay: 6,
        endYear: 1941,
        endMonth: 9,
        endDay: 5,
        parentKeywords: ['독소전쟁', '바르바로사', '제2차 세계 대전', '제2차 세계대전'],
        sideName: '독일 국방군 (추축국)',
        role: 'MAIN_EFFORT',
        note: '드네프르강 돌파 및 스몰렌스크 포위전',
      },
      {
        title: '모스크바 공방전',
        subtitle: '태풍 작전',
        startYear: 1941,
        startMonth: 10,
        startDay: 2,
        endYear: 1942,
        endMonth: 1,
        endDay: 7,
        parentKeywords: ['독소전쟁', '제2차 세계 대전', '제2차 세계대전'],
        sideName: '독일 국방군 (추축국)',
        role: 'MAIN_EFFORT',
        note: '태풍 작전 주공 담당 후 소련군 동계 반격으로 후퇴',
      },
      {
        title: '르제프 전투',
        startYear: 1942,
        startMonth: 1,
        endYear: 1943,
        endMonth: 3,
        parentKeywords: ['독소전쟁', '제2차 세계 대전', '제2차 세계대전'],
        sideName: '독일 국방군 (추축국)',
        role: 'DEFENSE',
        note: '르제프-뱌지마 돌출부 장기 방어전',
      },
      {
        title: '쿠르스크 전투',
        subtitle: '성채 작전',
        startYear: 1943,
        startMonth: 7,
        startDay: 5,
        endYear: 1943,
        endMonth: 8,
        endDay: 23,
        parentKeywords: ['독소전쟁', '제2차 세계 대전', '제2차 세계대전'],
        sideName: '독일 국방군 (추축국)',
        role: 'MAIN_EFFORT',
        note: '쿠르스크 돌출부 북부 축선 공격 담당',
      },
      {
        title: '바그라티온 작전',
        startYear: 1944,
        startMonth: 6,
        startDay: 22,
        endYear: 1944,
        endMonth: 8,
        endDay: 19,
        parentKeywords: ['독소전쟁', '제2차 세계 대전', '제2차 세계대전'],
        sideName: '독일 국방군 (추축국)',
        role: 'DEFENSE',
        note: '벨라루스 방어선 붕괴 및 산하 28개 사단 궤멸적 타격',
      },
    ],
  },
  {
    // 제2기갑집단 (나치 독일)
    unitId: '50738021-ae5d-41d0-96a0-ce37edbdc9cd',
    countryId: '713f8aaf-f9ae-4ee1-aacc-758dfd38a340',
    historicalCountryId: '62f80e5d-84da-4071-afc5-2019679c2da8',
    battles: [
      {
        title: '비아위스토크-민스크 전투',
        startYear: 1941,
        startMonth: 6,
        startDay: 22,
        endYear: 1941,
        endMonth: 7,
        endDay: 9,
        parentKeywords: ['독소전쟁', '바르바로사', '제2차 세계 대전', '제2차 세계대전'],
        sideName: '독일 국방군 (추축국)',
        role: 'MAIN_EFFORT',
        note: '부크강 도하 및 브레스트 우회 돌파 후 민스크 남방 포위망 완성',
      },
      {
        title: '스몰렌스크 전투',
        startYear: 1941,
        startMonth: 7,
        startDay: 6,
        endYear: 1941,
        endMonth: 9,
        endDay: 5,
        parentKeywords: ['독소전쟁', '바르바로사', '제2차 세계 대전', '제2차 세계대전'],
        sideName: '독일 국방군 (추축국)',
        role: 'MAIN_EFFORT',
        note: '드네프르강 도하 및 스몰렌스크 남방 기갑 돌파',
      },
      {
        title: '키예프 전투',
        subtitle: '키예프 포위전',
        startYear: 1941,
        startMonth: 8,
        startDay: 23,
        endYear: 1941,
        endMonth: 9,
        endDay: 26,
        parentKeywords: ['독소전쟁', '바르바로사', '제2차 세계 대전', '제2차 세계대전'],
        sideName: '독일 국방군 (추축국)',
        role: 'MAIN_EFFORT',
        note: '남하 기동으로 제1기갑집단과 로흐비차에서 합류해 키예프 포위 완성',
      },
      {
        title: '모스크바 공방전',
        subtitle: '태풍 작전',
        startYear: 1941,
        startMonth: 10,
        startDay: 2,
        endYear: 1942,
        endMonth: 1,
        endDay: 7,
        parentKeywords: ['독소전쟁', '제2차 세계 대전', '제2차 세계대전'],
        sideName: '독일 국방군 (추축국)',
        role: 'MAIN_EFFORT',
        note: '브리얀스크-뱌지마 포위전 남부 돌파 및 제2기갑군 승격 개칭',
      },
    ],
  },
  {
    // 제1군 (독일 제국)
    unitId: '3c081640-fc6e-4a45-86f7-b3b30c9db199',
    countryId: '713f8aaf-f9ae-4ee1-aacc-758dfd38a340',
    historicalCountryId: '06065d9a-4bdb-4066-a8db-e8be8f029e1f',
    battles: [
      {
        title: '리에주 전투',
        subtitle: '리에주 요새 공방전',
        startYear: 1914,
        startMonth: 8,
        startDay: 5,
        endYear: 1914,
        endMonth: 8,
        endDay: 16,
        parentKeywords: ['제1차 세계 대전', '제1차 세계대전'],
        sideName: '동맹국 (독일 제국)',
        role: 'MAIN_EFFORT',
        note: '벨기에 리에주 요새군 돌파 후 브뤼셀 진격',
      },
      {
        title: '몽스 전투',
        startYear: 1914,
        startMonth: 8,
        startDay: 23,
        endYear: 1914,
        endMonth: 8,
        endDay: 23,
        parentKeywords: ['제1차 세계 대전', '제1차 세계대전'],
        sideName: '동맹국 (독일 제국)',
        role: 'MAIN_EFFORT',
        note: '슐리펜 계획 우익 최외곽에서 영국 원정군(BEF)과 최초 교전',
      },
      {
        title: '르카토 전투',
        startYear: 1914,
        startMonth: 8,
        startDay: 26,
        endYear: 1914,
        endMonth: 8,
        endDay: 26,
        parentKeywords: ['제1차 세계 대전', '제1차 세계대전'],
        sideName: '동맹국 (독일 제국)',
        role: 'MAIN_EFFORT',
        note: '후퇴하는 영국 제2군단 추격 교전',
      },
      {
        title: '제1차 마른 전투',
        startYear: 1914,
        startMonth: 9,
        startDay: 5,
        endYear: 1914,
        endMonth: 9,
        endDay: 12,
        parentKeywords: ['제1차 세계 대전', '제1차 세계대전'],
        sideName: '동맹국 (독일 제국)',
        role: 'MAIN_EFFORT',
        note: '제2군과의 간격 노출로 영·불 연합군 역습을 받고 엔강으로 철수',
      },
      {
        title: '제1차 엔 전투',
        startYear: 1914,
        startMonth: 9,
        startDay: 13,
        endYear: 1914,
        endMonth: 9,
        endDay: 28,
        parentKeywords: ['제1차 세계 대전', '제1차 세계대전'],
        sideName: '동맹국 (독일 제국)',
        role: 'DEFENSE',
        note: '엔강 고지대 방어선 구축 및 서부전선 참호전 고착화',
      },
      {
        title: '솜 전투',
        startYear: 1916,
        startMonth: 7,
        startDay: 1,
        endYear: 1916,
        endMonth: 11,
        endDay: 18,
        parentKeywords: ['제1차 세계 대전', '제1차 세계대전'],
        sideName: '동맹국 (독일 제국)',
        role: 'DEFENSE',
        note: '1916년 7월 솜 전선 북부 방어를 위해 제1군 사령부 재편성 투입',
      },
    ],
  },
  {
    // 제7군단 (오스트리아-헝가리 제국)
    unitId: 'e11ce5b9-74cf-4fc8-a079-c729fc841829',
    countryId: null,
    historicalCountryId: '694515a9-cd57-43fe-b1a5-6b89ec37b09b',
    battles: [
      {
        title: '갈리치아 전투',
        startYear: 1914,
        startMonth: 8,
        startDay: 23,
        endYear: 1914,
        endMonth: 9,
        endDay: 11,
        parentKeywords: ['제1차 세계 대전', '제1차 세계대전'],
        sideName: '동맹국 (오스트리아-헝가리 제국)',
        role: 'PARTICIPANT' as unknown as SideUnitRole,
        note: '오스트리아-헝가리 제2군 예하로 갈리치아·카르파티아 전선 투입',
      },
      {
        title: '이손초 전투',
        subtitle: '제1~12차 이손초 전투 · 카포레토 전투',
        startYear: 1915,
        startMonth: 6,
        startDay: 23,
        endYear: 1917,
        endMonth: 11,
        endDay: 19,
        parentKeywords: ['제1차 세계 대전', '제1차 세계대전'],
        sideName: '동맹국 (오스트리아-헝가리 제국)',
        role: 'DEFENSE',
        note: '제5군 예하 도베르도 고지·카르소 고원 방어 및 제12차(카포레토) 공세 돌파',
      },
      {
        title: '제2차 피아베강 전투',
        startYear: 1918,
        startMonth: 6,
        startDay: 15,
        endYear: 1918,
        endMonth: 6,
        endDay: 23,
        parentKeywords: ['제1차 세계 대전', '제1차 세계대전'],
        sideName: '동맹국 (오스트리아-헝가리 제국)',
        role: 'MAIN_EFFORT',
        note: '피아베강 도하 공세 참여',
      },
      {
        title: '비토리오 베네토 전투',
        startYear: 1918,
        startMonth: 10,
        startDay: 24,
        endYear: 1918,
        endMonth: 11,
        endDay: 3,
        parentKeywords: ['제1차 세계 대전', '제1차 세계대전'],
        sideName: '동맹국 (오스트리아-헝가리 제국)',
        role: 'DEFENSE',
        note: '이탈리아 전선 최종 방어전 및 제국 해체로 종전',
      },
    ],
  },
]

function inferRoleKindFromTitle(
  positionType: string | null | undefined,
  title: string | null | undefined,
): MilitaryUnitRoleKind {
  if (positionType === 'OTHER') return 'FOUNDER_MEMBER'
  const text = (title ?? '').trim()
  if (/정치위원|군사위원|군사회의/.test(text)) return 'COMMISSAR'
  if (/참모총장|총참모장|참모장|참모본부장/.test(text)) return 'CHIEF_OF_STAFF'
  if (/부사령관|부군단장|부사단장|부여단장|부연대장|부함대사령관|차장/.test(text)) {
    return 'DEPUTY_COMMANDER'
  }
  if (/참모|처장|부장|국장|작전과장|정보과장|군수/.test(text)) return 'STAFF'
  return 'COMMANDER'
}

function inferCombatArmFromUnit(
  name: string,
  unitType: string | null,
  branch: string | null,
): MilitaryCombatArm | null {
  const n = name.toLowerCase()
  if (
    unitType === 'SUPREME_COMMAND' ||
    unitType === 'GENERAL_STAFF' ||
    unitType === 'SERVICE_HQ'
  ) {
    return 'COMMAND_STAFF'
  }
  if (/기갑|전차|panzer|armored|tank/.test(n)) return 'ARMORED'
  if (/기계화|차량화|motorized|mechanized/.test(n)) return 'MECHANIZED'
  if (/공수|공정|강습|airborne|parachute/.test(n)) return 'AIRBORNE'
  if (/산악|경보병|mountain|gebirgs/.test(n)) return 'MOUNTAIN'
  if (/포병|방사포|artillery/.test(n)) return 'ARTILLERY'
  if (/방공|고샤포|방공포|air defense|flak/.test(n)) return 'AIR_DEFENSE'
  if (/기병|수색|cavalry/.test(n)) return 'CAVALRY'
  if (/공병|engineer/.test(n)) return 'ENGINEER'
  if (/통신|정보|사이버|signals|intelligence/.test(n)) return 'SIGNALS'
  if (/특전|특수|코만도|special/.test(n) || unitType === 'SPECIAL_FORCES') {
    return 'SPECIAL_OPS'
  }
  if (/해병|상륙|marine|amphibious/.test(n) || branch === 'MARINE_CORPS') {
    return 'AMPHIBIOUS'
  }
  if (/잠수함|u-boat|submarine/.test(n)) return 'SUBMARINE'
  if (branch === 'NAVY' && (unitType === 'FLEET' || unitType === 'SQUADRON')) {
    return 'SURFACE_FLEET'
  }
  if (/폭격|전략공군|bomber/.test(n)) return 'BOMBER'
  if (/전투비행|요격|fighter/.test(n)) return 'FIGHTER'
  if (/보병|소총|infantry|rifle/.test(n)) return 'INFANTRY'
  if (/친위|헌병|경비|준군사|ss|근위/.test(n)) return 'PARAMILITARY'
  return null
}

function buildUtcDate(y: number, m?: number, d?: number): Date {
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
}

function precisionOf(m?: number, d?: number): string | null {
  if (m == null) return 'year'
  if (d == null) return 'month'
  return null
}

async function main() {
  const dbUrl =
    process.env.DATABASE_URL || 'mysql://papyrus:papyrus@localhost:3307/papyrus'
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(dbUrl) })

  try {
    // 1. 기본 계정 조회 (Event 생성자 createdById용)
    const firstAccount = await prisma.account.findFirst({ select: { id: true } })
    if (!firstAccount) {
      throw new Error('Account 행이 없어 Event 생성을 진행할 수 없습니다.')
    }

    // 2. 역사국가 ID 맵 조회
    const histCountries = await prisma.historicalCountry.findMany({
      select: { id: true, name: true },
    })
    const histIdByName = new Map<string, string>()
    for (const hc of histCountries) {
      histIdByName.set(hc.name.trim(), hc.id)
    }

    // 3. 보편 계급 + 역사국가 계급 시드 (멱등)
    let seededUniversal = 0
    for (const def of UNIVERSAL_RANKS) {
      const existing = await prisma.militaryRank.findFirst({
        where: {
          name: def.name,
          countryId: null,
          historicalCountryId: null,
          branch: def.branch ?? null,
        },
      })
      if (!existing) {
        await prisma.militaryRank.create({
          data: {
            name: def.name,
            nameLocal: def.nameLocal ?? null,
            nameEn: def.nameEn ?? null,
            abbreviation: def.abbreviation ?? null,
            category: def.category,
            rankOrder: def.rankOrder,
            natoCode: def.natoCode ?? null,
            branch: def.branch ?? null,
          },
        })
        seededUniversal += 1
      }
    }

    let seededHistorical = 0
    for (const def of HISTORICAL_POLITY_RANKS) {
      for (const hName of def.historicalCountryNames ?? []) {
        const hId = histIdByName.get(hName)
        if (!hId) continue
        const existing = await prisma.militaryRank.findFirst({
          where: {
            name: def.name,
            historicalCountryId: hId,
            branch: def.branch ?? null,
          },
        })
        if (!existing) {
          await prisma.militaryRank.create({
            data: {
              name: def.name,
              nameLocal: def.nameLocal ?? null,
              nameEn: def.nameEn ?? null,
              abbreviation: def.abbreviation ?? null,
              category: def.category,
              rankOrder: def.rankOrder,
              natoCode: def.natoCode ?? null,
              branch: def.branch ?? null,
              historicalCountryId: hId,
            },
          })
          seededHistorical += 1
        }
      }
    }
    console.log(
      `✅ MilitaryRank 시드 완료 (보편 +${seededUniversal}건, 역사국가 +${seededHistorical}건)`,
    )

    // 전체 MilitaryRank 로드
    const allRanks = await prisma.militaryRank.findMany()

    // 4. 레거시 MilitaryUnitCommander 잔존 행 병합 후 정리
    const legacyCmds = await prisma.militaryUnitCommander.findMany()
    let cleanedLegacyCmds = 0
    for (const cmd of legacyCmds) {
      const matchedTenure = await prisma.governmentPositionTenure.findUnique({
        where: { id: cmd.id },
      })
      if (matchedTenure) {
        const extraParts = [
          matchedTenure.notes?.trim() || '',
          cmd.combatExperience?.trim()
            ? `[지휘 전투] ${cmd.combatExperience.trim()}`
            : '',
        ].filter(Boolean)
        const mergedNotes = extraParts.join('\n')
        await prisma.governmentPositionTenure.update({
          where: { id: matchedTenure.id },
          data: {
            notes: mergedNotes || null,
            rankTitle: matchedTenure.rankTitle ?? cmd.rank ?? null,
          },
        })
        await prisma.militaryUnitCommander.delete({ where: { id: cmd.id } })
        cleanedLegacyCmds += 1
      }
    }
    console.log(`✅ 레거시 MilitaryUnitCommander 정리: ${cleanedLegacyCmds}건`)

    // 5. 군 보직 Tenure (militaryUnitId IS NOT NULL 또는 rankTitle IS NOT NULL) 백필
    const unitTenures = await prisma.governmentPositionTenure.findMany({
      where: {
        OR: [{ militaryUnitId: { not: null } }, { rankTitle: { not: null } }],
      },
      include: { positionDefinition: { select: { title: true } } },
    })

    let updatedTenures = 0
    for (const t of unitTenures) {
      let matchedRankId = t.militaryRankId
      if (!matchedRankId && t.rankTitle?.trim()) {
        const raw = t.rankTitle.trim()
        const cleanKo = raw.replace(/\s*\(.*?\)\s*/g, '').trim()
        // 1순위: 동일 역사국가 스코프 계급 일치
        const scopedMatch = allRanks.find(
          (r) =>
            r.historicalCountryId &&
            r.historicalCountryId === t.historicalCountryId &&
            (r.name === cleanKo ||
              r.name === raw ||
              (r.nameLocal && raw.toLowerCase().includes(r.nameLocal.toLowerCase()))),
        )
        // 2순위: 보편 계급 일치
        const universalMatch = allRanks.find(
          (r) =>
            !r.countryId &&
            !r.historicalCountryId &&
            (r.name === cleanKo || r.name === raw),
        )
        // 3순위: 전체 계급 중 이름 일치
        const anyMatch = allRanks.find(
          (r) =>
            r.name === cleanKo ||
            (r.nameLocal && raw.toLowerCase().includes(r.nameLocal.toLowerCase())),
        )
        matchedRankId = (scopedMatch ?? universalMatch ?? anyMatch)?.id ?? null
      }

      const roleKind =
        t.militaryRoleKind ??
        (t.militaryUnitId
          ? inferRoleKindFromTitle(
              t.positionType,
              t.title ?? t.positionDefinition?.title ?? null,
            )
          : null)

      if (matchedRankId !== t.militaryRankId || roleKind !== t.militaryRoleKind) {
        await prisma.governmentPositionTenure.update({
          where: { id: t.id },
          data: {
            militaryRankId: matchedRankId,
            militaryRoleKind: roleKind,
          },
        })
        updatedTenures += 1
      }
    }
    console.log(`✅ 군 보직 Tenure 계급·역할 정본 백필: ${updatedTenures}건`)

    // 6. 기존 MilitaryUnit의 combatArm 및 garrisonPlaceId 자동 백필
    const units = await prisma.militaryUnit.findMany()
    const allPlaces = await prisma.place.findMany({
      include: { names: { select: { name: true } } },
    })
    let updatedUnits = 0
    for (const u of units) {
      const nextCombatArm =
        u.combatArm ?? inferCombatArmFromUnit(u.name, u.unitType, u.branch)
      let nextPlaceId = u.garrisonPlaceId
      if (!nextPlaceId && u.garrison?.trim()) {
        const gText = u.garrison.trim()
        const exactPlace = allPlaces.find(
          (p) =>
            p.name === gText ||
            gText.endsWith(` ${p.name}`) ||
            p.names.some((pn) => pn.name === gText),
        )
        if (exactPlace) nextPlaceId = exactPlace.id
      }
      if (nextCombatArm !== u.combatArm || nextPlaceId !== u.garrisonPlaceId) {
        await prisma.militaryUnit.update({
          where: { id: u.id },
          data: {
            combatArm: nextCombatArm,
            garrisonPlaceId: nextPlaceId,
          },
        })
        updatedUnits += 1
      }
    }
    console.log(`✅ MilitaryUnit 병과(combatArm)·주둔지(Place) 백필: ${updatedUnits}건`)

    // 7. 구 notableBattles 4개 부대의 전투들을 Event + EventSide + SideDeployedUnit으로 정규화
    const allMilitaryEvents = await prisma.event.findMany({
      where: { domain: 'MILITARY' },
      select: { id: true, title: true, subtitle: true, startYear: true },
    })

    let createdBattles = 0
    let linkedDeployments = 0

    for (const unitSpec of NOTABLE_BATTLES_MIGRATION) {
      const unitExists = await prisma.militaryUnit.findUnique({
        where: { id: unitSpec.unitId },
        select: { id: true },
      })
      if (!unitExists) continue

      for (const b of unitSpec.battles) {
        // 기존 동일 제목 전투 Event 탐색
        let battleEvent = allMilitaryEvents.find(
          (ev) =>
            ev.title === b.title ||
            (b.subtitle && ev.title === b.subtitle) ||
            (ev.subtitle && ev.subtitle.includes(b.title)),
        )

        if (!battleEvent) {
          const parentEv = allMilitaryEvents.find((ev) =>
            b.parentKeywords.some((kw) => ev.title.includes(kw)),
          )
          const created = await prisma.event.create({
            data: {
              title: b.title,
              subtitle: b.subtitle ?? null,
              domain: 'MILITARY',
              type: 'BATTLE',
              kind: 'SINGLE',
              startEra: Era.AD,
              startYear: b.startYear,
              startMonth: b.startMonth ?? null,
              startDay: b.startDay ?? null,
              startDate: buildUtcDate(b.startYear, b.startMonth, b.startDay),
              startDatePrecision: precisionOf(b.startMonth, b.startDay),
              endEra: b.endYear ? Era.AD : null,
              endYear: b.endYear ?? null,
              endMonth: b.endMonth ?? null,
              endDay: b.endDay ?? null,
              endDate: b.endYear
                ? buildUtcDate(b.endYear, b.endMonth, b.endDay)
                : null,
              endDatePrecision: b.endYear
                ? precisionOf(b.endMonth, b.endDay)
                : null,
              parentEventId: parentEv?.id ?? null,
              historicalCountryId: unitSpec.historicalCountryId,
              createdById: firstAccount.id,
            },
            select: { id: true, title: true, subtitle: true, startYear: true },
          })
          battleEvent = created
          allMilitaryEvents.push(created)
          createdBattles += 1
        }

        // 해당 사건에 부대 소속 국가의 진영(EventSide) 조회 또는 생성
        const sides = await prisma.eventSide.findMany({
          where: { eventId: battleEvent.id },
          include: { participants: true },
          orderBy: { sortOrder: 'asc' },
        })

        let targetSide = sides.find((s) =>
          s.participants.some(
            (p) =>
              (unitSpec.historicalCountryId &&
                p.historicalCountryId === unitSpec.historicalCountryId) ||
              (unitSpec.countryId && p.countryId === unitSpec.countryId),
          ),
        )
        if (!targetSide) {
          targetSide = sides.find((s) => s.name === b.sideName)
        }
        if (!targetSide) {
          const newSide = await prisma.eventSide.create({
            data: {
              eventId: battleEvent.id,
              name: b.sideName,
              level: 'COUNTRY',
              sortOrder: sides.length,
            },
            include: { participants: true },
          })
          // 진영에 국가 참여 행(EventCountryRelation)도 함께 정본 연결!
          const existingCountryRel = await prisma.eventCountryRelation.findFirst({
            where: {
              eventId: battleEvent.id,
              ...(unitSpec.historicalCountryId
                ? { historicalCountryId: unitSpec.historicalCountryId }
                : { countryId: unitSpec.countryId }),
            },
          })
          if (existingCountryRel) {
            await prisma.eventCountryRelation.update({
              where: { id: existingCountryRel.id },
              data: { sideId: newSide.id },
            })
          } else if (unitSpec.historicalCountryId || unitSpec.countryId) {
            await prisma.eventCountryRelation.create({
              data: {
                eventId: battleEvent.id,
                countryId: unitSpec.countryId,
                historicalCountryId: unitSpec.historicalCountryId,
                sideId: newSide.id,
                role: 'PARTICIPANT',
              },
            })
          }
          targetSide = newSide
        }

        // SideDeployedUnit 연결 (멱등)
        const validRole: SideUnitRole =
          b.role === 'MAIN_EFFORT' ||
          b.role === 'SUPPORTING' ||
          b.role === 'RESERVE' ||
          b.role === 'DEFENSE'
            ? b.role
            : 'OTHER'

        const existingDep = await prisma.sideDeployedUnit.findUnique({
          where: {
            sideId_militaryUnitId: {
              sideId: targetSide.id,
              militaryUnitId: unitSpec.unitId,
            },
          },
        })
        if (!existingDep) {
          await prisma.sideDeployedUnit.create({
            data: {
              sideId: targetSide.id,
              militaryUnitId: unitSpec.unitId,
              role: validRole,
              note: b.note ?? null,
            },
          })
          linkedDeployments += 1
        }
      }
    }

    console.log(
      `✅ 참전 전투 정규화 완료 (신규 전투 Event +${createdBattles}건, SideDeployedUnit 연결 +${linkedDeployments}건)`,
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
