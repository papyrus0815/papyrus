/**
 * 건륭제(乾隆帝, 1711-1799) 시드
 *
 * 등록 항목:
 *  - Person: 애신각라 홍력(건륭제) — 청 제6대 황제
 *  - PersonCountryAffiliation: 청나라
 *  - PersonStats: 6축 능력치
 *  - SovereignReign: 청나라 황제 6대 (1735-10-18 ~ 1796-02-09, 양위)
 *
 * 의존:
 *  - HistoricalCountry "청나라" (event.first-opium-war.seed에서 인라인 생성)
 *  - Dynasty "애신각라 가문" (person.first-opium-war-figures.seed에서 등록)
 *  - GovernmentPositionDefinition "황제"
 */
import { AppointmentMethod, TenureEndReason } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

export async function seedQianlongEmperor(prisma: PrismaService): Promise<void> {
  console.log('\n👑 건륭제(乾隆帝) 시딩 시작...')

  const dynasty = await prisma.dynasty.findFirst({ where: { name: '애신각라 가문' } })
  if (!dynasty) {
    console.warn('  ⚠️  애신각라 가문이 없음 — person.first-opium-war-figures.seed가 먼저 실행되어야 함. 건륭제 시딩 건너뜀.')
    return
  }

  const qingHC = await prisma.historicalCountry.findFirst({ where: { name: '청나라' } })
  if (!qingHC) {
    console.warn('  ⚠️  청나라 HistoricalCountry가 없음 — event.first-opium-war.seed가 먼저 실행되어야 함. 건륭제 시딩 건너뜀.')
    return
  }

  const emperorPositionDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '황제' },
  })

  const ORIGINAL_NAME = 'Qianlong Emperor (Aisin Gioro Hongli)'
  const BIOGRAPHY =
    '청 제6대 황제(재위 1735-1796). 옹정제의 넷째 아들로 강희제가 직접 후계자감으로 점찍어 길렀다고 전한다. 즉위 후 십전무공(十全武功)으로 불리는 준가르 정복·신강 편입·대소금천 평정 등 10차례 군사 원정을 통해 청 영토를 사상 최대로 확장했고, 안으로는 사고전서(四庫全書) 편찬을 주도해 동아시아 전통 문헌을 집대성했다. 시·서·화에 능했고 8만여 수의 시를 남겼으며 골동·서화 수집가로도 유명하다. 재위 60년이 되던 1796년 조부 강희제의 재위(61년)를 넘지 않으려 가경제에게 양위했으나, 사망(1799)할 때까지 태상황으로 실권을 쥐었다. 후기엔 총신 화신(和珅)의 부패가 만연해 청 쇠퇴의 단초가 되었다.'

  const existing = await prisma.person.findFirst({ where: { originalName: ORIGINAL_NAME } })

  let personId: string
  if (existing) {
    personId = existing.id
    console.log(`  ⏭️  ${ORIGINAL_NAME} (이미 존재)`)
  } else {
    const created = await prisma.person.create({
      data: {
        name: '홍력',
        surname: '아이신줴뤄',
        originalName: ORIGINAL_NAME,
        regnalName: '건륭',
        biography: BIOGRAPHY,
        birthDate: new Date(1711, 8, 25), // 1711-09-25
        birthEra: 'AD',
        deathDate: new Date(1799, 1, 7), // 1799-02-07
        deathEra: 'AD',
        gender: 'MALE',
        nameDisplayOrder: 'korean',
        dynastyId: dynasty.id,
        influence: 95,
        birthPlaceText: '청 베이징 옹친왕부(현 옹화궁) — 현재 베이징시 둥청구',
        accountId: ACCOUNT_ID,
      },
    })
    personId = created.id
    console.log(`  ✅ ${ORIGINAL_NAME} (영향력 95)`)
  }

  // 소속국가
  const affExists = await prisma.personCountryAffiliation.findFirst({
    where: { personId, historicalCountryId: qingHC.id, affiliationType: 'CITIZENSHIP' as any },
  })
  if (!affExists) {
    await prisma.personCountryAffiliation.create({
      data: {
        personId,
        historicalCountryId: qingHC.id,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
      },
    })
    console.log(`      ✅ 소속국가: 청나라`)
  }

  // 능력치
  const existingStats = await prisma.personStats.findFirst({
    where: { personId, accountId: ACCOUNT_ID },
  })
  if (existingStats) {
    console.log(`      ⏭️  능력치`)
  } else {
    await prisma.personStats.create({
      data: {
        personId,
        accountId: ACCOUNT_ID,
        politics: 88,
        military: 82,
        diplomacy: 78,
        intellect: 90,
        charisma: 85,
        administration: 90,
        notes: '청 전성기를 마무리하고 영토를 사상 최대로 확장. 행정·문예 모두 정점. 후기 화신(和珅) 총애로 부패가 누적되며 쇠퇴의 단초를 남김.',
      },
    })
    console.log(`      ✅ 능력치: 정88/군82/외78/학90/카85/행90`)
  }

  // 재위 (청나라 황제 6대)
  const REGNAL_NAME = '건륭제'
  const existingReign = await prisma.sovereignReign.findFirst({
    where: { historicalCountryId: qingHC.id, regnalNumber: 6 },
  })
  if (existingReign) {
    if (existingReign.personId === personId) {
      if (!existingReign.regnalName) {
        await prisma.sovereignReign.update({
          where: { id: existingReign.id },
          data: { regnalName: REGNAL_NAME },
        })
        console.log(`      ✅ 재위 군주명 보강: ${REGNAL_NAME}`)
      } else {
        console.log(`      ⏭️  재위: 청 황제 6대`)
      }
    } else {
      console.warn(`      ⚠️  재위: 청 황제 6대 — 다른 인물 점유 (skip)`)
    }
  } else {
    await prisma.sovereignReign.create({
      data: {
        personId,
        historicalCountryId: qingHC.id,
        positionDefinitionId: emperorPositionDef?.id,
        regnalNumber: 6,
        regnalName: REGNAL_NAME,
        startDate: new Date(1735, 9, 18), // 1735-10-18 즉위
        endDate: new Date(1796, 1, 9), // 1796-02-09 가경제 양위
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.ABDICATION,
        notes: '재위 60년에 조부 강희제(61년)의 기록을 넘지 않으려 가경제에게 양위. 다만 사망(1799)까지 태상황으로 실권 행사.',
        accountId: ACCOUNT_ID,
      },
    })
    console.log(`      ✅ 재위: 청 황제 6대 (1735-1796) — 군주명 ${REGNAL_NAME}`)
  }

  console.log('\n✅ 건륭제 시딩 완료\n')
}
