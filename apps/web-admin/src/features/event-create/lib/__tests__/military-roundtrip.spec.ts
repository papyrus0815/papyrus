/**
 * 군사 사건 편집 라운드트립 검증.
 *
 * 실제 '크림 전쟁' 시드의 정규화 militaryEvent(백엔드 getMilitaryData 결과)를 픽스처로,
 * 편집 로드(hydrateMilitaryStateFromEvent) → 저장(buildMilitaryEventData)의 라운드트립이
 * 핵심 군사 데이터를 손실 없이 보존하는지 확인한다.
 *
 * 픽스처 출처: apps/api/prisma/scripts/dump-crimean-military.ts
 */
import {
  type NormalizedMilitaryEventResponse,
  buildMilitaryEventData,
  hydrateMilitaryStateFromEvent,
} from '../event-data-builder'
import fixture from './__fixtures__/crimean-military.json'

const original = fixture.militaryEvent as NormalizedMilitaryEventResponse

/** undefined 키를 제거해 "키 없음 == undefined"를 동일 취급. */
const stripUndefined = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripUndefined)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val === undefined) continue
      out[key] = stripUndefined(val)
    }
    return out
  }
  return value
}

describe('군사 편집 라운드트립 (크림 전쟁 실데이터)', () => {
  const hydrated = hydrateMilitaryStateFromEvent(original)
  const rebuilt = buildMilitaryEventData('military', {
    belligerents: hydrated.belligerents,
    belligerentsGraph: hydrated.belligerentsGraph,
    militaryDetails: hydrated.militaryDetails ?? {
      type: 'battle',
      combatType: ['land'],
      outcome: '',
    },
    casualties: hydrated.casualties,
    warCost: String(fixture.warCost ?? ''),
  })

  it('hydrate가 진영을 레거시 상태로 복원한다 (빈 화면/소실 방지)', () => {
    expect(hydrated.belligerents).toHaveLength(
      original.belligerentSides?.length ?? 0,
    )
    // 첫 진영: 이름·level·소속국 수·참여유형 매핑 확인
    const firstSide = hydrated.belligerents[0]
    expect(firstSide.name).toBe(original.belligerentSides?.[0].name)
    expect(firstSide.level).toBe('coalition') // COALITION → coalition
    expect(firstSide.countries[0].isHistorical).toBe(true)
    expect(firstSide.countries[0].participation).toBe('full') // MAIN → full
    expect(firstSide.countries[1].participation).toBe('limited') // LIMITED → limited
  })

  it('belligerentSides가 정규화 형태로 정확히 라운드트립한다', () => {
    expect(stripUndefined(rebuilt?.belligerentSides)).toEqual(
      stripUndefined(original.belligerentSides),
    )
  })

  it('militaryDetails가 정확히 라운드트립한다 (enum 양방향)', () => {
    expect(stripUndefined(rebuilt?.militaryDetails)).toEqual(
      stripUndefined(original.militaryDetails),
    )
  })

  it('casualties: 진영 이름 매칭 시 진영 id로 표시 복구된다', () => {
    // 크림 전쟁 casualty.sideName == 진영 이름 → loaded-side-N 키로 매핑
    expect(hydrated.casualties['loaded-side-0']).toBeDefined()
    expect(hydrated.casualties['loaded-side-0'].total).toBe(
      original.casualties?.[0].totalKilled,
    )
    // 진영 수만큼 보존
    expect(Object.keys(hydrated.casualties)).toHaveLength(
      original.casualties?.length ?? 0,
    )
  })
})
