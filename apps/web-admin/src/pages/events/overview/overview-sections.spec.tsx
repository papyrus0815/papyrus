/**
 * 조망 패널 계약 — 거르기가 모든 패널에 걸리고, 모든 패널이 같은 번호를 쓴다.
 */
import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import type { EventOverviewNode } from '@/shared/api/event-overview'
import { renderWithTheme } from '@/shared/test/render-with-theme'

import { buildCountryMatrix, metricRows } from './event-overview.lib'
import { CountryMatrixPanel, DistributionPanel, SidesMetricsPanel } from './overview-sections'

const node = (over: Partial<EventOverviewNode> & { id: string }): EventOverviewNode => ({
  title: over.id,
  description: null,
  parentEventId: 'root',
  depth: 1,
  startDate: null,
  startDatePrecision: null,
  endDate: null,
  endDatePrecision: null,
  location: null,
  domain: 'OTHER',
  type: null,
  kind: 'SINGLE',
  countries: [],
  persons: [],
  sides: [],
  metrics: [],
  sectionCount: 0,
  imageCount: 0,
  hasBackground: false,
  hasAftermath: false,
  ...over,
})

const country = (key: string, name: string) => ({
  key,
  id: key.slice(2),
  kind: 'modern' as const,
  name,
  flagEmoji: null,
  role: 'PARTICIPANT',
  sideId: null,
})

const root = node({ id: 'root', title: '1차세계대전', parentEventId: null, depth: 0 })
const battle = node({ id: 'battle', title: '마른 전투', countries: [country('c:fr', '프랑스'), country('c:de', '독일')] })
const treaty = node({ id: 'treaty', title: '런던 조약', countries: [country('c:gb', '영국')] })
const numberById = new Map([
  ['battle', 1],
  ['treaty', 2],
])
const hover = { hotId: null, onHover: jest.fn(), onOpen: jest.fn() }

describe('CountryMatrixPanel — 거르기', () => {
  const renderMatrix = (visibleIds: Set<string> | null) =>
    renderWithTheme(
      <CountryMatrixPanel
        {...hover}
        missing={[]}
        attaching={false}
        onAttachMissing={jest.fn()}
        matrix={buildCountryMatrix(root, [battle, treaty])}
        events={[battle, treaty]}
        numberById={numberById}
        selectedCountryKey={null}
        onSelectCountry={jest.fn()}
        visibleIds={visibleIds}
      />,
    )

  it('걸린 사건만으로 나라별 건수를 다시 센다', () => {
    renderMatrix(new Set(['battle']))
    expect(screen.getByRole('button', { name: /영국/ })).toHaveTextContent('0')
    expect(screen.getByRole('button', { name: /프랑스/ })).toHaveTextContent('1')
    expect(screen.getByText(/건수는 걸린 사건 기준/)).toBeInTheDocument()
  })

  it('걸리지 않은 사건 열은 흐린다', () => {
    renderMatrix(new Set(['battle']))
    expect(screen.getByRole('button', { name: '2번 런던 조약 열기' }).closest('th')).toHaveStyle({
      opacity: '0.35',
    })
    expect(screen.getByRole('button', { name: '1번 마른 전투 열기' }).closest('th')).toHaveStyle({
      opacity: '1',
    })
  })
})

describe('SidesMetricsPanel — 같은 번호와 열기', () => {
  const sided = node({
    id: 'treaty',
    title: '런던 조약',
    sides: [
      { id: 's1', name: '협상국', color: null },
      { id: 's2', name: '동맹국', color: null },
    ],
  })
  const measured = node({
    id: 'battle',
    title: '마른 전투',
    metrics: [{ metricKey: 'casualties', metricName: '사상자', unit: '명', value: 500000, low: null, high: null, approx: true }],
  })
  const rootWithSide = { ...root, sides: [{ id: 's0', name: '연합국', color: null }] }

  const renderPanel = () => {
    const onOpen = jest.fn()
    renderWithTheme(
      <SidesMetricsPanel
        {...hover}
        onOpen={onOpen}
        root={rootWithSide}
        descendants={[measured, sided]}
        metrics={metricRows([rootWithSide, sided, measured])}
        numberById={numberById}
      />,
    )
    return { onOpen }
  }

  it('진영 줄은 상위가 맨 위, 하위는 전개 번호순', () => {
    renderPanel()
    const rows = screen.getAllByRole('row').map((row) => row.textContent ?? '')
    const sideRows = rows.filter((text) => text.includes('↔') || text.includes('연합국'))
    expect(sideRows[0]).toMatch(/^상위/)
    expect(sideRows[1]).toMatch(/^2런던 조약/)
  })

  it('하위 사건 제목을 누르면 그 사건 모달을 연다(상위는 글자뿐)', () => {
    const { onOpen } = renderPanel()
    fireEvent.click(screen.getByRole('button', { name: '마른 전투' }))
    expect(onOpen).toHaveBeenCalledWith('battle')
    expect(screen.queryByRole('button', { name: '1차세계대전' })).toBeNull()
  })
})

describe('DistributionPanel', () => {
  const types = [
    { key: 'DECLARATION', label: '선언·통첩', count: 7, domain: 'DIPLOMACY' },
    { key: 'PERSONAL', label: '개인', count: 6, domain: 'MILITARY' },
    { key: 'SUMMIT', label: '회담', count: 3, domain: 'MILITARY' },
  ]
  const bins = [
    { label: '7.6', started: 2, active: 3, matchedStarted: 1, matchedActive: 1 },
  ]

  it('세부마다 한 줄 — 같은 분야 색이라도 줄로 갈리고, 누르면 그 세부로 거른다', () => {
    const onSelectType = jest.fn()
    renderWithTheme(
      <DistributionPanel types={types} bins={bins} selectedType={null} onSelectType={onSelectType} />,
    )
    expect(screen.getByRole('button', { name: /개인\s*6/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /회담\s*3/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /회담/ }))
    expect(onSelectType).toHaveBeenCalledWith('SUMMIT')
  })

  it('거르기가 걸리면 시기 막대는 걸린 사건 수를 말한다', () => {
    renderWithTheme(
      <DistributionPanel types={types} bins={bins} selectedType="SUMMIT" onSelectType={jest.fn()} filtered />,
    )
    expect(screen.getByRole('listitem', { name: /걸린 사건 중 진행 중 1건/ })).toBeInTheDocument()
    expect(screen.getByText('거르기 전 전체')).toBeInTheDocument()
  })
})

it('DistributionPanel — 하위가 없으면 빈 막대 대신 안내', () => {
  renderWithTheme(
    <DistributionPanel types={[]} bins={[]} selectedType={null} onSelectType={jest.fn()} />,
  )
  expect(screen.getByText('하위 사건이 없어 분포가 아직 없습니다.')).toBeInTheDocument()
})
