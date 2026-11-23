/**
 * 원(院) 큐레이션 — 이관(chamber.backfill)이 기계적으로 만든 원에 사람의 판단을 얹는다. 멱등.
 *
 * 1) 계보: 나라(역사 국가)가 바뀌어도 같은 기관이 이어지면 전신으로 잇는다(서민원·귀족원·제국의회…).
 * 2) 병합: 정체 행이 같은 시기를 나라 둘로 나눠 적어 같은 기관이 두 원이 된 것 — 정체·선거·측정값 연결을
 *    남길 원으로 옮기고 지운다(이탈리아 왕국 / 파시스트 이탈리아의 원로원).
 * 3) 사실: 구성·존속·원어·메모·정원(출처가 있는 것만).
 */
import { ChamberComposition, type PrismaClient } from '@prisma/client'

type ChamberKey = { country: string; name: string }

/** [전신, 후신] — 같은 기관의 연속 */
const LINEAGE: Array<[ChamberKey, ChamberKey]> = [
  [{ country: '잉글랜드 왕국', name: '서민원' }, { country: '그레이트브리튼 왕국', name: '서민원' }],
  [{ country: '그레이트브리튼 왕국', name: '서민원' }, { country: '그레이트브리튼 및 아일랜드 연합왕국', name: '서민원' }],
  [{ country: '그레이트브리튼 및 아일랜드 연합왕국', name: '서민원' }, { country: '그레이트브리튼 및 북아일랜드 연합왕국', name: '서민원' }],
  [{ country: '잉글랜드 왕국', name: '귀족원' }, { country: '그레이트브리튼 왕국', name: '귀족원' }],
  [{ country: '그레이트브리튼 왕국', name: '귀족원' }, { country: '그레이트브리튼 및 아일랜드 연합왕국', name: '귀족원' }],
  [{ country: '그레이트브리튼 및 아일랜드 연합왕국', name: '귀족원' }, { country: '그레이트브리튼 및 북아일랜드 연합왕국', name: '귀족원' }],
  [{ country: '북독일 연방', name: '북독일 제국의회' }, { country: '독일 제국', name: '제국의회' }],
  [{ country: '북독일 연방', name: '연방참의원' }, { country: '독일 제국', name: '연방참의원' }],
  [{ country: '독일 제국', name: '제국의회' }, { country: '바이마르 공화국', name: '국가의회' }],
  [{ country: '바이마르 공화국', name: '국가의회' }, { country: '나치 독일 (제3제국)', name: '국가의회' }],
  [{ country: '부르봉 복고 왕정', name: '대의원' }, { country: '7월 왕정', name: '대의원' }],
  [{ country: '부르봉 복고 왕정', name: '귀족원' }, { country: '7월 왕정', name: '귀족원' }],
  [{ country: '일본 제국', name: '중의원' }, { country: '일본국', name: '중의원' }],
  [{ country: '사르데냐 왕국', name: '대의원' }, { country: '이탈리아 왕국', name: '대의원' }],
  [{ country: '사르데냐 왕국', name: '원로원' }, { country: '이탈리아 왕국', name: '원로원' }],
  [{ country: '이탈리아 왕국', name: '대의원' }, { country: '파시스트 이탈리아', name: '파시 및 조합원' }],
]

/** [지울 원, 남길 원] — 같은 시기 같은 기관 */
const MERGES: Array<[ChamberKey, ChamberKey]> = [
  [{ country: '파시스트 이탈리아', name: '원로원' }, { country: '이탈리아 왕국', name: '원로원' }],
]

type Facts = {
  localName?: string
  composition?: ChamberComposition
  start?: number
  end?: number
  note?: string
  sizes?: Array<{ seats: number; start: number; end: number; note: string }>
}

const FACTS: Array<[ChamberKey, Facts]> = [
  [{ country: '사르데냐 왕국', name: '대의원' }, { localName: 'Camera dei Deputati', composition: ChamberComposition.ELECTED }],
  [{ country: '사르데냐 왕국', name: '원로원' }, { localName: 'Senato Subalpino', composition: ChamberComposition.APPOINTED }],
  [
    { country: '이탈리아 왕국', name: '대의원' },
    {
      composition: ChamberComposition.ELECTED,
      start: 1861,
      end: 1939,
      note: '사르데냐 왕국 대의원을 이었다. 1939년 파시 및 조합원으로 대체.',
      sizes: [
        { seats: 535, start: 1921, end: 1928, note: '1921년 선거 집계의 총 의석(트렌티노·트리에스테 합병 후)' },
        { seats: 400, start: 1929, end: 1939, note: '1928년 선거법 — 전국 단일 명부 신임 투표' },
      ],
    },
  ],
  [
    { country: '이탈리아 왕국', name: '원로원' },
    { composition: ChamberComposition.APPOINTED, start: 1861, end: 1946, note: '국왕이 종신 임명. 파시스트 시기에도 존속했다.' },
  ],
  [
    { country: '파시스트 이탈리아', name: '파시 및 조합원' },
    {
      localName: 'Camera dei Fasci e delle Corporazioni',
      composition: ChamberComposition.CORPORATIST,
      start: 1939,
      end: 1943,
      note: '선거 없이 당·조합 기구의 직위로 의원이 되었다.',
    },
  ],
  [{ country: '잉글랜드 왕국', name: '귀족원' }, { composition: ChamberComposition.MIXED }],
  [{ country: '그레이트브리튼 왕국', name: '귀족원' }, { composition: ChamberComposition.MIXED }],
  [{ country: '그레이트브리튼 및 아일랜드 연합왕국', name: '귀족원' }, { composition: ChamberComposition.MIXED }],
  [{ country: '그레이트브리튼 및 북아일랜드 연합왕국', name: '귀족원' }, { composition: ChamberComposition.MIXED }],
  [{ country: '독일 제국', name: '연방참의원' }, { composition: ChamberComposition.INDIRECT }],
  [{ country: '북독일 연방', name: '연방참의원' }, { composition: ChamberComposition.INDIRECT }],
  [{ country: '독일', name: '연방참의원' }, { composition: ChamberComposition.INDIRECT }],
]

export async function curateChambers(prisma: PrismaClient): Promise<void> {
  const find = async (key: ChamberKey) => {
    const historical = await prisma.historicalCountry.findFirst({ where: { name: key.country }, select: { id: true } })
    if (historical) {
      return prisma.chamber.findFirst({ where: { historicalCountryId: historical.id, name: key.name } })
    }
    const country = await prisma.country.findFirst({ where: { name: key.country }, select: { id: true } })
    if (!country) return null
    return prisma.chamber.findFirst({ where: { countryId: country.id, historicalCountryId: null, name: key.name } })
  }
  let merged = 0
  let linked = 0
  let facts = 0
  let sizes = 0

  for (const [dropKey, keepKey] of MERGES) {
    const drop = await find(dropKey)
    const keep = await find(keepKey)
    if (!drop || !keep || drop.id === keep.id) continue
    await prisma.$transaction(async (tx) => {
      await tx.politicalSystem.updateMany({ where: { lowerChamberId: drop.id }, data: { lowerChamberId: keep.id } })
      await tx.politicalSystem.updateMany({ where: { upperChamberId: drop.id }, data: { upperChamberId: keep.id } })
      await tx.election.updateMany({ where: { chamberId: drop.id }, data: { chamberId: keep.id } })
      await tx.observation.updateMany({ where: { chamberId: drop.id }, data: { chamberId: keep.id } })
      await tx.chamber.updateMany({ where: { predecessorId: drop.id }, data: { predecessorId: keep.id } })
      await tx.chamberSize.updateMany({ where: { chamberId: drop.id }, data: { chamberId: keep.id } })
      await tx.chamber.delete({ where: { id: drop.id } })
    })
    merged += 1
  }

  for (const [predecessorKey, successorKey] of LINEAGE) {
    const predecessor = await find(predecessorKey)
    const successor = await find(successorKey)
    if (!predecessor || !successor || successor.predecessorId) continue
    await prisma.chamber.update({ where: { id: successor.id }, data: { predecessorId: predecessor.id } })
    linked += 1
  }

  for (const [key, fact] of FACTS) {
    const chamber = await find(key)
    if (!chamber) continue
    const data: Record<string, unknown> = {}
    if (fact.localName && !chamber.localName) data.localName = fact.localName
    if (fact.composition && !chamber.composition) data.composition = fact.composition
    if (fact.start != null && chamber.startYear == null) {
      Object.assign(data, { startEra: 'AD', startYear: fact.start, startMonth: null, startDay: null, startPrecision: 'year' })
    }
    if (fact.end != null && chamber.endYear == null) {
      Object.assign(data, { endEra: 'AD', endYear: fact.end, endMonth: null, endDay: null, endPrecision: 'year' })
    }
    if (fact.note && !chamber.note) data.note = fact.note
    if (Object.keys(data).length > 0) {
      await prisma.chamber.update({ where: { id: chamber.id }, data })
      facts += 1
    }
    for (const size of fact.sizes ?? []) {
      const existing = await prisma.chamberSize.findFirst({ where: { chamberId: chamber.id, seats: size.seats, startYear: size.start } })
      if (existing) continue
      await prisma.chamberSize.create({
        data: {
          chamberId: chamber.id,
          seats: size.seats,
          startEra: 'AD',
          startYear: size.start,
          startPrecision: 'year',
          endEra: 'AD',
          endYear: size.end,
          endPrecision: 'year',
          note: size.note,
        },
      })
      sizes += 1
    }
  }

  console.log(`  ✅ 원 병합 ${merged} · 계보 연결 ${linked} · 사실 보강 ${facts} · 정원 신규 ${sizes}`)
}
