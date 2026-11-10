import { MilitaryBranch, MilitaryUnitType, SideUnitRole } from '@prisma/client'

import { PrismaService } from '../prisma.service'

/**
 * 나치 독일(제3제국, 1933~1945) 군부대 시드 — 동부전선 바르바로사 작전 주공
 * 「중부집단군(Heeresgruppe Mitte)」 및 예하 「제2기갑집단(Panzergruppe 2)」.
 *
 * 규약:
 * - 소속 축은 역사 국가(`historicalCountryId = 나치 독일 (제3제국)`) 단독으로 채우고,
 *   현대 국가(`countryId`)는 비워 둔다(현대 독일 상세의 「군사 조직」 탭은 연결된 역사국가의 부대까지
 *   함께 조회해 '시대 소속: 🏛️ 나치 독일 (제3제국)' 배지로 노출한다).
 * - 상위 관할 기관(`administrationDepartmentId`)은 이미 시드된 「육군 총사령부(OKH)」에 연결해,
 *   「중앙부처 > 육군 총사령부」 상세에서도 소속 야전부대로 함께 조회되게 한다.
 * - 「중부집단군」 → 「제2기갑집단」을 `parentUnitId`로 묶어 부대 상·하위 편제(ORBAT) 예시를 제공한다.
 * - DB에 「제2차 세계대전 동부전선 (독소전쟁)」 사건과 나치 독일 진영(`EventSide`)이 있으면
 *   `SideDeployedUnit`으로도 연결해 사건 측 군사 데이터에서도 바로 확인할 수 있게 한다.
 *
 * 멱등: (name, historicalCountryId) 기준 findFirst → 있으면 재사용(스킵). UI 편집분을 덮어쓰지 않는다.
 */

const HISTORICAL_COUNTRY_NAME = '나치 독일 (제3제국)'
const OKH_DEPARTMENT_NAME = '육군 총사령부'

const ARMY_GROUP_CENTER_NAME = '중부집단군'
const PANZER_GROUP_2_NAME = '제2기갑집단'

/** 1941년 6월 22일 바르바로사 작전 개시일에 B집단군이 중부집단군으로 개칭·투입되었다. */
const BARBAROSSA_START_DATE = new Date('1941-06-22T00:00:00Z')
/** 보크 원수는 1941년 12월 19일 모스크바 공방전 좌절 직후 사령관직에서 해임되었다. */
const BOCK_COMMAND_END_DATE = new Date('1941-12-19T00:00:00Z')

/** 제2기갑집단은 1940년 11월 16일 제19군단(구데리안 기갑집단)을 확대 개편해 창설되었다. */
const PANZER_GROUP_2_ESTABLISHED_DATE = new Date('1940-11-16T00:00:00Z')
/** 1941년 10월 5일 태풍 작전 중 제2기갑군(2. Panzerarmee)으로 승격 개칭되었다. */
const PANZER_GROUP_2_UPGRADED_DATE = new Date('1941-10-05T00:00:00Z')

const EASTERN_FRONT_EVENT_TITLE = '제2차 세계대전 동부전선 (독소전쟁)'
const NAZI_GERMANY_SIDE_NAME = '나치 독일 (제3제국) 측'

export async function seedNaziGermanyMilitaryUnits(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🎖️  나치 독일 군부대(중부집단군 · 제2기갑집단) 시딩 시작...')

  const historicalCountry = await prisma.historicalCountry.findFirst({
    where: { name: HISTORICAL_COUNTRY_NAME },
    select: { id: true },
  })
  if (!historicalCountry) {
    console.warn(
      `  ⚠️  역사 국가를 찾을 수 없음: ${HISTORICAL_COUNTRY_NAME} — historicalCountry.germany.seed 선행 필요. 스킵.`,
    )
    return
  }

  const okh = await prisma.administrationDepartment.findFirst({
    where: {
      name: OKH_DEPARTMENT_NAME,
      historicalCountryId: historicalCountry.id,
    },
    select: { id: true },
  })
  if (!okh) {
    console.warn(
      `  ⚠️  상위 지휘기구를 찾을 수 없음: ${OKH_DEPARTMENT_NAME} — administrationDepartment.naziGermany.seed 선행 권장(부처 연결 없이 생성).`,
    )
  }

  // --- 1. 상위 부대: 중부집단군 (Heeresgruppe Mitte)
  const existingArmyGroupCenter = await prisma.militaryUnit.findFirst({
    where: {
      name: ARMY_GROUP_CENTER_NAME,
      historicalCountryId: historicalCountry.id,
    },
    select: { id: true },
  })

  let armyGroupCenterId: string
  if (existingArmyGroupCenter) {
    armyGroupCenterId = existingArmyGroupCenter.id
    console.log(`  ⏭️  ${ARMY_GROUP_CENTER_NAME}`)
  } else {
    const created = await prisma.militaryUnit.create({
      data: {
        name: ARMY_GROUP_CENTER_NAME,
        nickname: 'Heeresgruppe Mitte',
        unitType: MilitaryUnitType.FIELD_ARMY,
        branch: MilitaryBranch.ARMY,
        historicalCountryId: historicalCountry.id,
        countryId: null,
        administrationDepartmentId: okh?.id ?? null,
        isActive: false,
        establishedDate: BARBAROSSA_START_DATE,
        disbandedDate: null,
        garrison: '동부전선 중부 (폴란드 총독부 → 벨라루스 · 스몰렌스크 · 모스크바 방면)',
        strength:
          '바르바로사 개전 시 약 130만 명 · 49개 사단(제4·제9야전군, 제2·제3기갑집단) · 전차 약 1,700대',
        primaryMission:
          '바르바로사 작전의 주공(主攻). 비아위스토크·민스크·스몰렌스크 축선을 따라 소련 서부전선군을 양익 포위·섬멸하고 모스크바로 진격하는 임무를 맡았다.',
        jurisdiction:
          '동부전선 중앙 축선 — 프리퍄티 습지 북쪽에서 브레스트-리토프스크·민스크·스몰렌스크·모스크바에 이르는 주 진격로.',
        notableBattles:
          '비아위스토크-민스크 전투(1941.6~7) · 스몰렌스크 전투(1941.7~9) · 모스크바 공방전(태풍 작전, 1941.10~1942.1) · ' +
          '르제프 전투(1942~1943) · 쿠르스크 전투 북부(1943.7) · 바그라티온 작전 방어전(1944.6~8)',
        description:
          '1941년 6월 22일 독소전쟁(바르바로사 작전) 개시와 함께 기존 B집단군(Heeresgruppe B)을 개칭해 편성한 독일 국방군 육군의 전략 집단군이다. ' +
          '육군 총사령부(OKH) 직할로 북부·중부·남부 3개 집단군 가운데 최대 병력과 유일하게 2개 기갑집단(제2·제3기갑집단)을 배속받아 주공 축선을 담당했다.\n\n' +
          '초대 사령관 페도어 폰 보크 원수 지휘 아래 개전 초 비아위스토크-민스크와 스몰렌스크에서 대규모 포위전을 성사시켰으나, ' +
          '1941년 겨울 모스크바 공방전(태풍 작전)에서 소련군의 동계 반격에 막혀 첫 전략적 후퇴를 겪었다.\n\n' +
          '이후 르제프 돌출부와 벨라루스 일대에서 방어전을 수행하다가 1944년 6~8월 소련군의 바그라티온 작전으로 산하 28개 사단이 궤멸적인 타격을 입었으며, ' +
          '1945년 1월 25일 동프로이센에서 북부집단군으로 개칭되고 기존 북부집단군(쿠를란트)과 A집단군이 순차 개칭되는 재편을 거쳤다.',
      },
      select: { id: true },
    })
    armyGroupCenterId = created.id
    console.log(`  ✅ ${ARMY_GROUP_CENTER_NAME}`)
  }

  // --- 2. 예하 부대: 제2기갑집단 (Panzergruppe 2) — parentUnitId로 중부집단군에 연결
  const existingPanzerGroup2 = await prisma.militaryUnit.findFirst({
    where: {
      name: PANZER_GROUP_2_NAME,
      historicalCountryId: historicalCountry.id,
    },
    select: { id: true },
  })

  let panzerGroup2Id: string
  if (existingPanzerGroup2) {
    panzerGroup2Id = existingPanzerGroup2.id
    console.log(`  ⏭️  ${PANZER_GROUP_2_NAME}`)
  } else {
    const created = await prisma.militaryUnit.create({
      data: {
        name: PANZER_GROUP_2_NAME,
        nickname: 'Panzergruppe 2 (구데리안 기갑집단)',
        unitType: MilitaryUnitType.FIELD_ARMY,
        branch: MilitaryBranch.ARMY,
        historicalCountryId: historicalCountry.id,
        countryId: null,
        administrationDepartmentId: okh?.id ?? null,
        parentUnitId: armyGroupCenterId,
        isActive: false,
        establishedDate: PANZER_GROUP_2_ESTABLISHED_DATE,
        disbandedDate: PANZER_GROUP_2_UPGRADED_DATE,
        garrison: '동부전선 중부 우익 (브레스트-리토프스크 → 민스크 · 스몰렌스크 · 키예프 · 툴라)',
        strength:
          '바르바로사 개전 시 3개 기갑군단(제24·제46·제47군단) · 5개 기갑사단 등 총 15개 사단 · 전차 약 930대',
        primaryMission:
          '중부집단군 우익의 기갑 돌파선봉. 부크강을 도하해 브레스트 요새를 우회 돌파하고, 좌익의 제3기갑집단(호트)과 합류해 민스크·스몰렌스크의 소련군 주력을 양익 포위하는 임무를 수행했다.',
        jurisdiction:
          '중부집단군 남쪽 날개 — 브레스트-리토프스크에서 밥루이스크·스몰렌스크·고멜·키예프 동방(로흐비차)·브리얀스크·툴라 방면.',
        notableBattles:
          '부크강 도하 및 브레스트 우회 돌파(1941.6.22) · 비아위스토크-민스크 포위전(1941.6) · 스몰렌스크 전투(1941.7~8) · ' +
          '키예프 포위전 남하(1941.8~9) · 브리얀스크-뱌지마 포위전(1941.10)',
        description:
          '프랑스 침공전에서 활약한 구데리안 기갑집단(제19군단)을 모체로 1940년 11월 16일 창설된 야전군급 기갑 편제다. ' +
          '하인츠 구데리안 상급대장이 사령관을 맡아 이른바 「구데리안 기갑집단(Panzergruppe Guderian)」으로도 불렸다.\n\n' +
          '1941년 6월 22일 바르바로사 작전 개시 당일 제18기갑사단의 수중도하 전차(Tauchpanzer) 등을 앞세워 부크강을 건너고 브레스트 요새를 우회해 심종심 돌파를 감행했다. ' +
          '개전 엿새 만에 민스크에서 제3기갑집단과 합류해 소련 서부전선군 주력을 포위했고, 이어 드네프르강을 넘어 스몰렌스크를 점령했다.\n\n' +
          '1941년 8월 히틀러의 지시로 남하해 남부집단군의 제1기갑집단(클라이스트)과 로흐비차에서 연결함으로써 역사상 최대 규모의 키예프 포위전을 완성했으며, ' +
          '모스크바 진격(태풍 작전) 개시 직후인 1941년 10월 5일 「제2기갑군(2. Panzerarmee)」으로 승격 개칭되었다.',
      },
      select: { id: true },
    })
    panzerGroup2Id = created.id
    console.log(`  ✅ ${PANZER_GROUP_2_NAME}`)
  }

  // --- 3. 지휘관 연결 (인물이 등록되어 있는 경우에만 백필)
  const bock = await prisma.person.findFirst({
    where: {
      OR: [
        { originalName: { contains: 'Fedor von Bock' } },
        { name: { contains: '페도어 폰 보크' } },
      ],
    },
    select: { id: true, name: true },
  })
  if (bock) {
    const existingBockCmd = await prisma.militaryUnitCommander.findFirst({
      where: { unitId: armyGroupCenterId, personId: bock.id },
      select: { id: true },
    })
    if (!existingBockCmd) {
      await prisma.militaryUnitCommander.create({
        data: {
          unitId: armyGroupCenterId,
          personId: bock.id,
          rank: '원수 (Generalfeldmarschall)',
          role: '사령관',
          isCurrent: false,
          startDate: BARBAROSSA_START_DATE,
          endDate: BOCK_COMMAND_END_DATE,
          termNumber: 1,
          combatExperience:
            '바르바로사 작전 개시부터 비아위스토크-민스크·스몰렌스크 포위전과 모스크바 공방전(태풍 작전)까지 중부집단군을 지휘했다.',
        },
      })
      console.log(`  ✅ 중부집단군 초대 사령관 연결: ${bock.name}`)
    }
  }

  const guderian = await prisma.person.findFirst({
    where: {
      OR: [
        { originalName: { contains: 'Guderian' } },
        { name: { contains: '구데리안' } },
      ],
    },
    select: { id: true, name: true },
  })
  if (guderian) {
    const existingGuderianCmd = await prisma.militaryUnitCommander.findFirst({
      where: { unitId: panzerGroup2Id, personId: guderian.id },
      select: { id: true },
    })
    if (!existingGuderianCmd) {
      await prisma.militaryUnitCommander.create({
        data: {
          unitId: panzerGroup2Id,
          personId: guderian.id,
          rank: '상급대장 (Generaloberst)',
          role: '사령관',
          isCurrent: false,
          startDate: PANZER_GROUP_2_ESTABLISHED_DATE,
          endDate: PANZER_GROUP_2_UPGRADED_DATE,
          termNumber: 1,
          combatExperience:
            '부크강 도하, 민스크·스몰렌스크·키예프 포위전 및 브리얀스크 돌파를 지휘했다.',
        },
      })
      console.log(`  ✅ 제2기갑집단 사령관 연결: ${guderian.name}`)
    }
  }

  // --- 4. 사건 진영(SideDeployedUnit) 연결 — 동부전선 사건이 존재하면 자동 연결
  const easternFrontEvent = await prisma.event.findFirst({
    where: { title: EASTERN_FRONT_EVENT_TITLE },
    select: {
      id: true,
      sides: {
        where: { name: NAZI_GERMANY_SIDE_NAME },
        select: { id: true },
      },
    },
  })

  const naziSideId = easternFrontEvent?.sides[0]?.id
  if (naziSideId) {
    const deployments: Array<{
      militaryUnitId: string
      unitName: string
      role: SideUnitRole
      note: string
      sortOrder: number
    }> = [
      {
        militaryUnitId: armyGroupCenterId,
        unitName: ARMY_GROUP_CENTER_NAME,
        role: SideUnitRole.MAIN_EFFORT,
        note: '동부전선 중앙 축선 주공 — 제4·9야전군 및 제2·3기갑집단을 앞세워 민스크·스몰렌스크 포위 및 모스크바 진격 수행',
        sortOrder: 1,
      },
      {
        militaryUnitId: panzerGroup2Id,
        unitName: PANZER_GROUP_2_NAME,
        role: SideUnitRole.MAIN_EFFORT,
        note: '중부집단군 우익 기갑 돌파선봉(제24·46·47기갑군단) — 부크강 도하 및 민스크·스몰렌스크·키예프 포위 기동',
        sortOrder: 2,
      },
    ]

    for (const d of deployments) {
      const exists = await prisma.sideDeployedUnit.findUnique({
        where: {
          sideId_militaryUnitId: {
            sideId: naziSideId,
            militaryUnitId: d.militaryUnitId,
          },
        },
        select: { id: true },
      })
      if (exists) {
        console.log(`  ⏭️  사건 진영 부대 연결: ${d.unitName}`)
      } else {
        await prisma.sideDeployedUnit.create({
          data: {
            sideId: naziSideId,
            militaryUnitId: d.militaryUnitId,
            role: d.role,
            note: d.note,
            sortOrder: d.sortOrder,
          },
        })
        console.log(`  ✅ 사건 진영 부대 연결: ${d.unitName} → ${EASTERN_FRONT_EVENT_TITLE}`)
      }
    }
  }
}
