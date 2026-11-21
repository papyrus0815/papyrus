import React from 'react'

import '@testing-library/jest-dom'
import { createEvent, fireEvent, screen, within } from '@testing-library/react'

import { type Observation } from '@/shared/api/evidence'
import { renderWithTheme } from '@/shared/test/render-with-theme'

import { type ChartRow, SideMetricsChart } from './side-metrics-chart'
import { buildSideMetricRows, buildUnitCells, orderSideMetricRows } from './side-metrics.lib'

jest.mock('@/shared/api/client', () => ({ getApiConnection: () => ({}) }))
/* api.service의 import.meta(vite env)는 ts-jest가 못 읽는다 */
jest.mock('@/shared/api/api.service', () => ({}))

let sequence = 0
function observation(
  side: string,
  key: string,
  name: string,
  value: string | null,
  extra: Partial<Observation> = {},
): Observation {
  sequence += 1
  return {
    id: `o${sequence}`,
    subjectType: 'EVENT_SIDE',
    subjectId: side,
    metric: { id: key, key, name, unit: 'person', valueKind: 'COUNT' } as unknown as Observation['metric'],
    value,
    low: null,
    high: null,
    approx: false,
    atLeast: false,
    qualifier: null,
    currency: null,
    start: null,
    end: null,
    note: null,
    sortOrder: 0,
    estimateRole: null,
    method: null,
    citations: [],
    ...extra,
  }
}

/* jsdom의 PointerEvent에는 pointerType이 없다 — 이벤트에 직접 붙인다 */
function touchPointerDown(element: HTMLElement) {
  const pointerEvent = createEvent.pointerDown(element)
  Object.defineProperty(pointerEvent, 'pointerType', { value: 'touch' })
  fireEvent(element, pointerEvent)
}

const verified = { citations: [{ source: { kind: 'BOOK', title: '사료' } }] } as unknown as Partial<Observation>

function renderChart(observations: Observation[], sides: Array<{ id: string; name: string }>) {
  /* 수치 모듈과 같이 — 규모 → 손실 합계 → 나머지 순으로 넘긴다 */
  const rows = orderSideMetricRows(buildSideMetricRows(observations, sides.map((side) => side.id))) as ChartRow[]
  const onEdit = jest.fn()
  const onAdd = jest.fn()
  const onShowTable = jest.fn()
  const view = renderWithTheme(
    <SideMetricsChart
      rows={rows}
      sides={sides.map((side, index) => ({ ...side, color: index === 0 ? '#1d4ed8' : '#4d7c0f' }))}
      memberCells={new Map()}
      onEdit={onEdit}
      onAdd={onAdd}
      onShowTable={onShowTable}
      sourceLabel={() => '사료'}
    />,
  )
  return { ...view, onEdit, onAdd, onShowTable }
}

const BRITAIN = { id: 'GB', name: '영국 측' }
const QING = { id: 'QING', name: '청 측' }

describe('SideMetricsChart', () => {
  it('값이 여럿인데 대표가 없는 칸은 빈칸(+ 값)이 아니라 여러 추정치로 그린다 — 1차 아편전쟁', () => {
    const { onShowTable, onAdd } = renderChart(
      [
        observation('GB', 'military.casualties_total', '군 손실 합계', '520'),
        observation('GB', 'military.casualties_total', '군 손실 합계', null, { low: '1000', high: '2000' }),
        observation('QING', 'military.casualties_total', '군 손실 합계', null, { low: '22000', high: '30000' }),
      ],
      [BRITAIN, QING],
    )
    expect(screen.queryByRole('button', { name: /영국 측 군 손실 합계 추가/ })).not.toBeInTheDocument()
    const multiple = screen.getByRole('button', { name: /영국 측 군 손실 합계 값 2개.*표에서 보기/ })
    fireEvent.click(multiple)
    expect(onShowTable).toHaveBeenCalled()
    expect(onAdd).not.toHaveBeenCalled()
    /* 대표가 없으면 배수도 없다 */
    expect(screen.queryByText(/배$/)).not.toBeInTheDocument()
  })

  it("'~이상' 값으로는 배수를 내지 않는다 — 크림 전쟁 총사망", () => {
    renderChart(
      [
        observation('A', 'military.deaths_total', '군 총사망', null, { low: '300000', atLeast: true }),
        observation('B', 'military.deaths_total', '군 총사망', '450000'),
        observation('A', 'military.personnel', '동원 병력', '1000000'),
        observation('B', 'military.personnel', '동원 병력', '800000'),
      ],
      [
        { id: 'A', name: '동맹국 측' },
        { id: 'B', name: '러시아 제국 측' },
      ],
    )
    const list = screen.getByRole('list', { name: '진영 수치 비교' })
    const items = within(list).getAllByRole('listitem')
    /* 규모가 먼저 — 병력 행이 첫 줄, 배수 1.3배(왼쪽이 큼) */
    expect(items[0]).toHaveTextContent('동원 병력')
    expect(items[0]).toHaveTextContent('1.3배')
    expect(items[0]).toHaveTextContent('동맹국 측 쪽이 큼')
    expect(items[1]).toHaveTextContent('군 총사망')
    expect(items[1]).not.toHaveTextContent('배')
  })

  it('한쪽만 기록된 지표는 막대 없이 아래 묶음으로 — 자유군단 진압', () => {
    renderChart(
      [
        observation('GOV', 'military.killed_in_action', '군 전사자', '17'),
        observation('REB', 'human.executed', '처형·학살 사망', null, { low: '9', atLeast: true }),
      ],
      [
        { id: 'GOV', name: '자유군단' },
        { id: 'REB', name: '봉기군' },
      ],
    )
    expect(screen.queryByRole('list', { name: '진영 수치 비교' })).not.toBeInTheDocument()
    const lone = screen.getByRole('list', { name: '한쪽 진영만 기록된 수치' })
    expect(within(lone).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /봉기군 군 전사자 추가/ })).toBeInTheDocument()
  })

  it('병력만 있는 진영과 참여 인원만 있는 진영은 한 줄로 마주 세운다', () => {
    renderChart(
      [
        observation('GOV', 'military.personnel', '동원 병력', '3000'),
        observation('REB', 'society.participants', '참여 인원', null, { low: '3000', high: '10000' }),
      ],
      [
        { id: 'GOV', name: '자유군단' },
        { id: 'REB', name: '봉기군' },
      ],
    )
    const list = screen.getByRole('list', { name: '진영 수치 비교' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(list).toHaveTextContent('동원 병력 · 참여 인원')
  })

  it('보불전쟁 — 손실률 빗금·손실 구성(같은 자)·합계 어긋남 안내', () => {
    renderChart(
      [
        observation('DE', 'military.personnel', '동원 병력', '1200000'),
        observation('FR', 'military.personnel', '동원 병력', '900000'),
        observation('DE', 'military.casualties_total', '군 손실 합계', '139000'),
        observation('FR', 'military.casualties_total', '군 손실 합계', '756000'),
        observation('DE', 'military.deaths_unspecified', '군 사망(정의 미상)', '44700'),
        observation('FR', 'military.deaths_unspecified', '군 사망(정의 미상)', '138800'),
        observation('DE', 'military.wounded', '군 부상자', '89700'),
        observation('FR', 'military.wounded', '군 부상자', '143000'),
        observation('FR', 'military.missing', '군 실종자', '41000'),
        observation('FR', 'military.captured', '포로', '474000'),
        observation('DE', 'military.captured', '포로', '720'),
      ],
      [
        { id: 'DE', name: '프로이센·독일 측' },
        { id: 'FR', name: '프랑스 측' },
      ],
    )
    expect(screen.getByRole('button', { name: /프랑스 측 동원 병력 .*손실률 84%/ })).toBeInTheDocument()
    const composition = screen.getByRole('region', { name: '손실 구성' })
    expect(within(composition).getByRole('button', { name: /프랑스 측 포로 .* 고치기/ })).toBeInTheDocument()
    expect(composition).toHaveTextContent('포로')
    expect(composition).toHaveTextContent('차이')
    /* 전부 미검증이면 흐림 안내를 달지 않는다 */
    expect(screen.queryByText(/흐린 막대/)).not.toBeInTheDocument()
  })

  it('검증된 값과 섞였을 때만 흐림을 안내한다', () => {
    renderChart(
      [
        observation('GB', 'military.personnel', '동원 병력', '20000', verified),
        observation('QING', 'military.personnel', '동원 병력', '220000'),
      ],
      [BRITAIN, QING],
    )
    expect(screen.getByText(/흐린 막대/)).toBeInTheDocument()
  })

  it('터치는 첫 탭에 설명(메모 포함), 두 번째 탭에 고친다', () => {
    const { onEdit } = renderChart(
      [
        observation('GB', 'military.personnel', '동원 병력', '20000'),
        observation('QING', 'military.personnel', '동원 병력', '220000', { note: '분쟁지 동원. 명목 정규군 85만' }),
      ],
      [BRITAIN, QING],
    )
    const bar = screen.getByRole('button', { name: /청 측 동원 병력 .* 고치기/ })
    touchPointerDown(bar)
    fireEvent.click(bar)
    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.getByRole('tooltip')).toHaveTextContent('분쟁지 동원')
    expect(screen.getByRole('tooltip')).toHaveTextContent('한 번 더 누르면 고칩니다')
    touchPointerDown(bar)
    fireEvent.click(bar)
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('산하 부대(EVENT_SIDE_UNIT) 수치만 있는 지표도 부대 합 막대와 부대별 몫으로 그린다', () => {
    const unitSide = new Map([
      ['su-north', { sideId: 'AXIS', name: '북부집단군' }],
      ['su-center', { sideId: 'AXIS', name: '중부집단군' }],
      ['su-west', { sideId: 'SOV', name: '서부전선군' }],
    ])
    const allObservations = [
      observation('su-north', 'military.personnel', '동원 병력', '650000', { subjectType: 'EVENT_SIDE_UNIT' }),
      observation('su-center', 'military.personnel', '동원 병력', '1350000', { subjectType: 'EVENT_SIDE_UNIT' }),
      observation('su-west', 'military.personnel', '동원 병력', '1000000', { subjectType: 'EVENT_SIDE_UNIT' }),
    ]
    const unitCells = buildUnitCells(allObservations, unitSide)
    const rows: ChartRow[] = [{ key: 'military.personnel', name: '동원 병력', cells: new Map() }]

    renderWithTheme(
      <SideMetricsChart
        rows={rows}
        sides={[
          { id: 'AXIS', name: '추축국', color: '#1d4ed8' },
          { id: 'SOV', name: '소련군', color: '#dc2626' },
        ]}
        memberCells={new Map()}
        unitCells={unitCells}
        onEdit={jest.fn()}
        onAdd={jest.fn()}
        sourceLabel={() => '사료'}
      />,
    )

    const list = screen.getByRole('list', { name: '진영 수치 비교' })
    expect(list).toHaveTextContent('부대 합')
    expect(list).toHaveTextContent('2.0배')
    const unitSection = screen.getByRole('region', { name: '부대별 몫' })
    expect(unitSection).toHaveTextContent('북부집단군')
    expect(unitSection).toHaveTextContent('중부집단군')
  })
})
