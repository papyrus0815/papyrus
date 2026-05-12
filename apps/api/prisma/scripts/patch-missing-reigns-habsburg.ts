/**
 * 합스부르크 스페인 군주들의 아라곤·카스티야·스페인령 네덜란드 reign 보강.
 *
 *   Charles V       → 아라곤 22대 (카를로스 1세)
 *   Philip II       → 아라곤 23대 (펠리페 1세 데 아라곤)
 *   Philip III      → 아라곤 24대 (펠리페 2세 데 아라곤)
 *   Philip IV       → 카스티야 17대 + 아라곤 25대 (펠리페 4세·펠리페 3세 데 아라곤)
 *
 * 모든 기존 reign 보존, 슬롯 충돌 시 skip.
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

import { AppointmentMethod, TenureEndReason } from '@prisma/client'

import { PrismaService } from '../prisma.service'

type Patch = {
  personOriginalName: string
  hcName: string
  regnalNumber: number
  regnalName: string
  startDate: Date
  endDate: Date
  appointmentMethod: AppointmentMethod
  endReason: TenureEndReason
  endReasonDetail: string
  notes: string
}

const PATCHES: Patch[] = [
  {
    personOriginalName: 'Charles V, Holy Roman Emperor',
    hcName: '아라곤 왕국',
    regnalNumber: 22,
    regnalName: '카를로스 1세',
    startDate: new Date(1516, 0, 23),
    endDate: new Date(1556, 0, 16),
    appointmentMethod: AppointmentMethod.HEREDITARY,
    endReason: TenureEndReason.ABDICATION,
    endReasonDetail: '1556-01-16 부분 양위 — 동생 페르디난트가 아닌 아들 펠리페에게 아라곤 왕위 이양.',
    notes:
      '외조부 페르난도 2세 사망(1516) 후 모친 후아나 1세와 jure matris 공동 군주로 즉위. 후아나가 ' +
      '토르데시야스에 유폐되어 사실상 단독 통치. 약 40년 재위. 1556년 양위로 아들 펠리페 2세에게 ' +
      '아라곤·시칠리아·사르데냐·나폴리·발렌시아·마요르카 등 아라곤 연합 왕국 전체 이양.',
  },
  {
    personOriginalName: 'Philip II of Spain',
    hcName: '아라곤 왕국',
    regnalNumber: 23,
    regnalName: '펠리페 1세 데 아라곤',
    startDate: new Date(1556, 0, 16),
    endDate: new Date(1598, 8, 13),
    appointmentMethod: AppointmentMethod.HEREDITARY,
    endReason: TenureEndReason.DEATH_IN_OFFICE,
    endReasonDetail: '1598-09-13 엘 에스코리알 왕궁에서 향년 71세에 자연사.',
    notes:
      '1556년 부친 카를 5세의 양위로 아라곤·시칠리아·사르데냐·나폴리·발렌시아·마요르카 등 아라곤 ' +
      '연합 왕국 전체 즉위. 약 42년 재위. 같은 시기 카스티야 15대 + 1580년부터 포르투갈 21대 ' +
      '겸직으로 이베리아 반도 거의 전체를 통치한 합스부르크 스페인 정점기의 군주.',
  },
  {
    personOriginalName: 'Philip III of Spain',
    hcName: '아라곤 왕국',
    regnalNumber: 24,
    regnalName: '펠리페 2세 데 아라곤',
    startDate: new Date(1598, 8, 13),
    endDate: new Date(1621, 2, 31),
    appointmentMethod: AppointmentMethod.HEREDITARY,
    endReason: TenureEndReason.DEATH_IN_OFFICE,
    endReasonDetail: '1621-03-31 마드리드 알카사르 왕궁에서 향년 42세에 자연사.',
    notes:
      '부친 펠리페 2세 사망으로 아라곤·시칠리아·사르데냐·나폴리·발렌시아·마요르카 즉위. 약 22년 ' +
      '재위. 통치 실권은 측근 레르마 공작이 약 20년간 행사한 "무력한 군주"라는 평가가 우세. ' +
      '1609년 모리스코(개종 무슬림) 추방으로 발렌시아·아라곤 지역 인구·경제에 큰 타격.',
  },
  {
    personOriginalName: 'Philip IV of Spain',
    hcName: '카스티야 왕국',
    regnalNumber: 17,
    regnalName: '펠리페 4세',
    startDate: new Date(1621, 2, 31),
    endDate: new Date(1665, 8, 17),
    appointmentMethod: AppointmentMethod.HEREDITARY,
    endReason: TenureEndReason.DEATH_IN_OFFICE,
    endReasonDetail: '1665-09-17 마드리드 알카사르 왕궁에서 향년 60세에 노환·합병증으로 사망.',
    notes:
      '부친 펠리페 3세 사망으로 16세 즉위. 약 44년 재위. 통치 실권은 측근 올리바레스 백공작이 ' +
      '1622~1643 약 21년간 행사. 1640년 카탈루냐 반란 + 포르투갈 분리(브라간사 가문 복위)로 ' +
      '합스부르크 스페인 쇠퇴의 결정적 시기. 1648 베스트팔렌 조약·1659 피레네 조약으로 영토 손실.',
  },
  {
    personOriginalName: 'Philip IV of Spain',
    hcName: '아라곤 왕국',
    regnalNumber: 25,
    regnalName: '펠리페 3세 데 아라곤',
    startDate: new Date(1621, 2, 31),
    endDate: new Date(1665, 8, 17),
    appointmentMethod: AppointmentMethod.HEREDITARY,
    endReason: TenureEndReason.DEATH_IN_OFFICE,
    endReasonDetail: '1665-09-17 마드리드 알카사르 왕궁에서 향년 60세에 노환·합병증으로 사망.',
    notes:
      '부친 펠리페 3세(아라곤 펠리페 2세) 사망으로 아라곤·시칠리아·사르데냐·나폴리·발렌시아·마요르카 ' +
      '즉위. 약 44년 재위. 1640년 카탈루냐 봉기로 아라곤 영지의 핵심 카탈루냐가 약 12년간 사실상 ' +
      '독립 시도. 1652년 모스크바 도시 함락으로 카탈루냐 복속. 합스부르크 스페인 결정적 쇠퇴기.',
  },
]

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
    if (!admin) {
      console.warn('admin 미존재')
      return
    }
    const kingPos = await prisma.governmentPositionDefinition.findFirst({
      where: { title: '국왕' },
    })
    if (!kingPos) {
      console.warn('국왕 관직 미존재')
      return
    }

    let added = 0
    let skipped = 0
    for (const p of PATCHES) {
      const person = await prisma.person.findFirst({
        where: { originalName: p.personOriginalName },
      })
      const hc = await prisma.historicalCountry.findFirst({ where: { name: p.hcName } })
      if (!person || !hc) {
        console.warn(`  ⚠️  스킵 — person 또는 HC 미존재: ${p.personOriginalName} / ${p.hcName}`)
        continue
      }
      const existing = await prisma.sovereignReign.findFirst({
        where: { personId: person.id, historicalCountryId: hc.id },
      })
      if (existing) {
        console.log(`  ⏭️  이미 등록: ${p.personOriginalName} @ ${p.hcName}`)
        skipped++
        continue
      }
      const slot = await prisma.sovereignReign.findFirst({
        where: { historicalCountryId: hc.id, regnalNumber: p.regnalNumber },
      })
      if (slot) {
        console.warn(`  ⚠️  슬롯 충돌: ${p.hcName} ${p.regnalNumber}대 — 다른 인물 점유 (skip)`)
        continue
      }
      await prisma.sovereignReign.create({
        data: {
          personId: person.id,
          historicalCountryId: hc.id,
          positionDefinitionId: kingPos.id,
          regnalNumber: p.regnalNumber,
          regnalName: p.regnalName,
          startDate: p.startDate,
          endDate: p.endDate,
          appointmentMethod: p.appointmentMethod,
          endReason: p.endReason,
          endReasonDetail: p.endReasonDetail,
          notes: p.notes,
          accountId: admin.id,
        },
      })
      console.log(`  ✅ 추가: ${p.personOriginalName} → ${p.hcName} ${p.regnalNumber}대 ${p.regnalName}`)
      added++
    }
    console.log(`\n결과: ${added} 추가 / ${skipped} 스킵\n`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
