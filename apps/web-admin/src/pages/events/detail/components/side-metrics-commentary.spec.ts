import { buildSideCommentary, ratioVerdict, subjectParticle } from './side-metrics-commentary.lib'
import { buildSideMetricRows, type MetricObservationLike } from './side-metrics.lib'

const observation = (
  sideId: string,
  key: string,
  value: string,
  over: Partial<MetricObservationLike> = {},
): MetricObservationLike => ({
  id: `${sideId}-${key}-${value}`,
  subjectType: 'EVENT_SIDE',
  subjectId: sideId,
  metric: { key, name: key === 'military.personnel' ? '동원 병력' : '군 손실 합계' },
  value,
  low: null,
  high: null,
  atLeast: false,
  ...over,
})

const sides = [
  { id: 'prussia', name: '프로이센 측' },
  { id: 'austria', name: '오스트리아 측' },
]
const format = (entry: MetricObservationLike) => entry.value ?? ''

describe('수치 해설', () => {
  it('보오전쟁 — 병력은 비슷, 손실은 오스트리아 측이 5.8배, 손실률도', () => {
    const rows = buildSideMetricRows(
      [
        observation('prussia', 'military.personnel', '637000'),
        observation('austria', 'military.personnel', '600000'),
        observation('prussia', 'military.casualties_total', '18500'),
        observation('austria', 'military.casualties_total', '108000'),
      ],
      ['prussia', 'austria'],
    )
    const lines = buildSideCommentary(rows, sides, format)
    expect(lines.map((line) => `${line.label}: ${line.verdict}`)).toEqual([
      '동원 병력: 비슷했다',
      '군 손실 합계: 오스트리아 측이 5.8배 컸다',
      '손실률: 오스트리아 측이 6.2배 컸다',
    ])
    expect(lines[0].evidence).toBe('프로이센 측 637000 · 오스트리아 측 600000')
  })

  it("한쪽만 있거나 '~이상'이면 그 지표는 말하지 않는다", () => {
    const rows = buildSideMetricRows(
      [
        observation('prussia', 'military.personnel', '637000'),
        observation('prussia', 'military.casualties_total', '18500'),
        observation('austria', 'military.casualties_total', '100000', { atLeast: true }),
      ],
      ['prussia', 'austria'],
    )
    expect(buildSideCommentary(rows, sides, format)).toEqual([])
  })

  it('값이 여럿이어도 채택 추정치가 하나면 그것으로 비교한다', () => {
    const rows = buildSideMetricRows(
      [
        observation('prussia', 'military.personnel', '637000'),
        observation('austria', 'military.personnel', '600000', { estimateRole: 'PREFERRED' }),
        observation('austria', 'military.personnel', '407000', { estimateRole: 'ALTERNATIVE' }),
      ],
      ['prussia', 'austria'],
    )
    expect(buildSideCommentary(rows, sides, format).map((line) => line.verdict)).toEqual(['비슷했다'])
  })

  it('진영이 둘이 아니면 해설하지 않는다', () => {
    expect(buildSideCommentary([], [sides[0]], format)).toEqual([])
  })

  it('조사 — 받침 유무', () => {
    expect(subjectParticle('협상국')).toBe('이')
    expect(subjectParticle('프랑스')).toBe('가')
    expect(ratioVerdict({ id: 'x', name: '동맹국' }, 1.1, 'size')).toBe('비슷했다')
  })
})
