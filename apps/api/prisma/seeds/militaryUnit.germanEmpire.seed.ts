import { MilitaryBranch, MilitaryUnitType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

/**
 * 독일 제국(1871~1918) 군부대 시드 — 제1차 세계 대전 서부전선 제1군.
 *
 * 이 시드는 `MilitaryUnit.historicalCountryId`(현대·역사 듀얼 FK) 도입 후 첫 사용처다.
 * 부대의 소속 축은 **역사 국가(독일 제국)** 하나만 채운다 — 현대 '독일'을 함께 채우면
 * 1914년 부대가 현대 독일 소속으로 표시되는 시대착오가 생긴다.
 *
 * 대신 상위 기관(육군 최고사령부)은 부처 규약대로 **dual-fill**한다:
 * historicalCountryId=독일 제국(정체성 축) + countryId=현대 독일(표시·그룹핑 축).
 * 부처 조회 API가 `where: { countryId }` 단일 조건이라, dual-fill이라야 현대 독일 국가 상세의
 * 「행정조직 > 중앙부처」에 노출되고 그 상세에서 연결 군부대로 제1군까지 도달할 수 있다.
 *
 * 멱등: 이름 기반 findFirst → 있으면 재사용(스킵). upsert-update를 쓰지 않아 UI 편집분을 덮어쓰지 않는다.
 */

const HISTORICAL_COUNTRY_NAME = '독일 제국'
const MODERN_COUNTRY_ISO = 'DE'
const DEFENSE_CATEGORY_NAME = '국방'
const HIGH_COMMAND_NAME = '독일 제국 육군 최고사령부'
const FIRST_ARMY_NAME = '제1군'

/** 1914년 8월 2일 동원령과 함께 제1군·최고사령부가 함께 편성됐다. */
const MOBILISATION_DATE = new Date('1914-08-02T00:00:00Z')
/** 폰 클루크는 1915년 3월 말 부상으로 지휘에서 물러났다. */
const KLUCK_COMMAND_END = new Date('1915-03-28T00:00:00Z')

export async function seedGermanEmpireMilitaryUnits(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🎖️  독일 제국 군부대(제1군) 시딩 시작...')

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

  const modernCountry = await prisma.country.findFirst({
    where: { isoCode: MODERN_COUNTRY_ISO },
    select: { id: true },
  })
  if (!modernCountry) {
    console.warn(
      `  ⚠️  현대 국가를 찾을 수 없음: ${MODERN_COUNTRY_ISO} — 부처를 역사 축 단독으로만 만든다(현대 국가 상세에서는 안 보임).`,
    )
  }

  const defenseCategory = await prisma.administrationDepartmentCategory.findFirst(
    {
      where: { name: DEFENSE_CATEGORY_NAME },
      select: { id: true },
    },
  )
  if (!defenseCategory) {
    console.warn(
      `  ⚠️  부처 카테고리를 찾을 수 없음: ${DEFENSE_CATEGORY_NAME} — 카테고리 없이 생성한다(부처 상세의 「군부대 등록」 버튼이 안 뜬다).`,
    )
  }

  // --- 1. 상위 기관: 육군 최고사령부(OHL)
  let highCommand = await prisma.administrationDepartment.findFirst({
    where: { name: HIGH_COMMAND_NAME },
    select: { id: true },
  })
  if (highCommand) {
    console.log(`  ⏭️  ${HIGH_COMMAND_NAME}`)
  } else {
    highCommand = await prisma.administrationDepartment.create({
      data: {
        name: HIGH_COMMAND_NAME,
        historicalCountryId: historicalCountry.id,
        countryId: modernCountry?.id ?? null,
        categoryId: defenseCategory?.id ?? null,
        establishedDate: MOBILISATION_DATE,
        description:
          'Oberste Heeresleitung(OHL). 1914년 8월 동원과 함께 참모본부를 기반으로 설치되어 ' +
          '서부·동부 전선의 야전군을 통할한 독일 제국 육군 최고 지휘기구. ' +
          '제1군을 비롯한 각 야전군은 이 기구의 지휘를 받았다.',
      },
      select: { id: true },
    })
    console.log(`  ✅ ${HIGH_COMMAND_NAME}`)
  }

  // --- 2. 제1군
  const existingUnit = await prisma.militaryUnit.findFirst({
    where: { name: FIRST_ARMY_NAME, historicalCountryId: historicalCountry.id },
    select: { id: true },
  })

  let firstArmyId: string
  if (existingUnit) {
    firstArmyId = existingUnit.id
    console.log(`  ⏭️  ${FIRST_ARMY_NAME}`)
  } else {
    const created = await prisma.militaryUnit.create({
      data: {
        name: FIRST_ARMY_NAME,
        nickname: '1. Armee',
        unitType: MilitaryUnitType.FIELD_ARMY,
        branch: MilitaryBranch.ARMY,
        // 소속은 역사 축 단독 — 현대 '독일'을 채우면 1914년 부대가 현대 국가 소속으로 표시된다
        historicalCountryId: historicalCountry.id,
        countryId: null,
        administrationDepartmentId: highCommand.id,
        isActive: false,
        establishedDate: MOBILISATION_DATE,
        // 해체(1915.9)·재편성(1916.7)·복원(1919)은 월 단위까지만 확정 가능하고
        // 스키마에 날짜 정밀도 필드가 없어 일자를 지어내지 않고 서술로만 남긴다.
        disbandedDate: null,
        garrison: '서부전선 우익 (벨기에 → 북프랑스)',
        strength: '동원 시 약 32만 명 — 서부전선 7개 군 가운데 최대 규모',
        primaryMission:
          '슐리펜 계획의 최우익. 벨기에를 통과해 파리 서쪽을 크게 우회하여 프랑스군 좌익을 포위하는 임무를 맡았다.',
        jurisdiction:
          '서부전선 최우익 — 제2군(뷜로)의 오른쪽 날개. 리에주·브뤼셀 축선을 지나 북프랑스로 진격했다.',
        notableBattles:
          '리에주 요새 공방(1914.8) · 몽스 전투(1914.8.23) · 르카토 전투(1914.8.26) · ' +
          '제1차 마른 전투(1914.9.5~12) · 엔 전투(1914.9) · 솜 전투(1916)',
        description:
          '독일 제국 육군이 1914년 8월 2일 동원과 함께 편성한 야전군이다. ' +
          '슐리펜 계획에서 우익 최외곽을 맡아, 벨기에를 통과한 뒤 파리 서쪽을 크게 우회해 ' +
          '프랑스군 좌익을 포위하도록 계획되었다.\n\n' +
          '초대 사령관은 알렉산더 폰 클루크 상급대장이었다. 리에주와 브뤼셀을 지나 ' +
          '몽스에서 영국 원정군과 처음 교전했고(1914년 8월 23일), 르카토를 거쳐 남하했다. ' +
          '1914년 9월 제1차 마른 전투에서 제2군과의 사이에 간격이 벌어져 연합군의 역습을 받았고, ' +
          '엔 강으로 후퇴한 뒤 서부전선은 참호전으로 고착됐다.\n\n' +
          '1915년 9월 사령부가 해체되었다가 1916년 7월 솜 전투를 위해 재편성되었으며, ' +
          '종전 뒤 1919년 복원(해산)됐다.\n\n' +
          '※ 해체·재편성 시점은 월 단위까지만 확인돼, 일 단위 DATETIME인 해체일 필드는 비워 두었다.',
      },
      select: { id: true },
    })
    firstArmyId = created.id
    console.log(`  ✅ ${FIRST_ARMY_NAME}`)
  }

  // --- 3. 초대 사령관: 알렉산더 폰 클루크
  //  선재 부대여도 여기까지 내려온다 — 인물이 뒤늦게 등록된 경우 재실행으로 지휘관만 백필된다.
  const kluck = await prisma.person.findFirst({
    where: {
      historicalCountryId: historicalCountry.id,
      originalName: { contains: 'Kluck' },
    },
    select: { id: true },
  })
  if (!kluck) {
    console.warn(
      '  ⚠️  인물을 찾을 수 없음: 알렉산더 폰 클루크 — 지휘관 연결을 건너뛴다.',
    )
    return
  }

  const existingCommander = await prisma.militaryUnitCommander.findFirst({
    where: { unitId: firstArmyId, personId: kluck.id },
    select: { id: true },
  })
  if (existingCommander) {
    console.log('  ⏭️  초대 사령관: 알렉산더 폰 클루크')
    return
  }

  await prisma.militaryUnitCommander.create({
    data: {
      unitId: firstArmyId,
      personId: kluck.id,
      rank: '상급대장 (Generaloberst)',
      role: '사령관',
      isCurrent: false,
      startDate: MOBILISATION_DATE,
      endDate: KLUCK_COMMAND_END,
      termNumber: 1,
      combatExperience:
        '리에주·브뤼셀 진격, 몽스 전투, 르카토 전투, 제1차 마른 전투를 제1군 사령관으로 지휘했다.',
      notes:
        '1915년 3월 말 전선 시찰 중 부상해 지휘에서 물러났고 이후 현역에 복귀하지 않았다.',
    },
  })
  console.log('  ✅ 초대 사령관: 알렉산더 폰 클루크')
}
