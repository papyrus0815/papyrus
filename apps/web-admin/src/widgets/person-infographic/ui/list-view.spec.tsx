/**
 * ListView 렌더 테스트 — 세기별 연대 원장.
 * 세기 그룹 순서(eraGroupOrder)·기록 공백 표지(기원전↔서기 인접 포함)·핀 섹션·
 * 세기 접기·행 열기를 회귀 방지.
 */
import { renderWithTheme } from '@/shared/test/render-with-theme'
import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import { usePersonInfographicFilterStore } from '../model/filter.store'
import type { AdaptedPerson } from '../model/types'

import { ListView } from './list-view'

function person(
  overrides: Partial<AdaptedPerson> & { id: string },
): AdaptedPerson {
  return {
    name: overrides.id,
    born: 1900,
    died: 1980,
    activityYear: 1940,
    era: { key: 'modern20', lbl: '현대 20c', from: 1900, to: 2000, color: '#000' },
    age: 80,
    region: '유럽',
    country: '미상',
    field: '기타',
    faction: '',
    influence: 0,
    profileImageUrl: null,
    isMonarch: false,
    isHeadOfState: false,
    primaryTitle: null,
    biography: null,
    isAlive: false,
    searchText: '',
    ...overrides,
  }
}

const noop = () => {}

function centuryHeadings() {
  return screen
    .getAllByRole('heading', { level: 2 })
    .map((heading) => heading.textContent)
}

describe('ListView', () => {
  beforeEach(() => {
    usePersonInfographicFilterStore.setState({ eraGroupOrder: 'desc' })
  })

  it('최신 세기부터 그룹을 나열하고 세기 안에서도 최신 출생이 위로 온다', () => {
    const people = [
      person({ id: '나폴레옹', born: 1769 }),
      person({ id: '처칠', born: 1874 }),
      person({ id: '링컨', born: 1809 }),
    ]
    renderWithTheme(
      <ListView people={people} onOpen={noop} query="" pinned={new Set()} togglePin={noop} />,
    )
    expect(centuryHeadings()).toEqual(['19세기 2명', '18세기 1명'])
    const rowNames = screen
      .getAllByRole('button', { name: /상세 보기/ })
      .map((row) => row.getAttribute('aria-label')?.split(',')[0])
    expect(rowNames).toEqual(['처칠', '링컨', '나폴레옹'])
  })

  it('오래된순이면 세기 순서가 뒤집히고 출생 미상은 항상 맨 끝이다', () => {
    usePersonInfographicFilterStore.setState({ eraGroupOrder: 'asc' })
    const people = [
      person({ id: '미상', born: null }),
      person({ id: '처칠', born: 1874 }),
      person({ id: '나폴레옹', born: 1769 }),
    ]
    renderWithTheme(
      <ListView people={people} onOpen={noop} query="" pinned={new Set()} togglePin={noop} />,
    )
    expect(centuryHeadings()).toEqual(['18세기 1명', '19세기 1명', '연도 미상 1명'])
  })

  it('비어 있는 세기 수만큼 기록 공백 표지를 단다 — 기원전 1세기와 1세기는 인접', () => {
    const people = [
      person({ id: '카이사르', born: -100 }),
      person({ id: '티베리우스', born: 42 }),
      person({ id: '광개토', born: 374 }),
    ]
    renderWithTheme(
      <ListView people={people} onOpen={noop} query="" pinned={new Set()} togglePin={noop} />,
    )
    // 4세기 → 1세기: 2·3세기 공백 / 1세기 → 기원전 1세기: 공백 없음
    expect(screen.getByText('2개 세기 기록 없음')).toBeInTheDocument()
    expect(screen.queryAllByText(/기록 없음/)).toHaveLength(1)
  })

  it('핀 인물은 상단 고정 섹션에만 나오고 세기 그룹에서는 빠진다', () => {
    const people = [
      person({ id: '처칠', born: 1874 }),
      person({ id: '링컨', born: 1809 }),
    ]
    renderWithTheme(
      <ListView
        people={people}
        onOpen={noop}
        query=""
        pinned={new Set(['링컨'])}
        togglePin={noop}
      />,
    )
    expect(centuryHeadings()).toEqual(['고정한 인물', '19세기 1명'])
    expect(screen.getAllByRole('button', { name: /^링컨,/ })).toHaveLength(1)
  })

  it('세기 헤더로 접고, 행을 누르면 그 인물을 연다', () => {
    const onOpen = jest.fn()
    renderWithTheme(
      <ListView
        people={[person({ id: '처칠', born: 1874 })]}
        onOpen={onOpen}
        query=""
        pinned={new Set()}
        togglePin={noop}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^처칠,/ }))
    expect(onOpen).toHaveBeenCalledWith('처칠')

    const header = screen.getByRole('button', { expanded: true })
    fireEvent.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: /^처칠,/ })).not.toBeInTheDocument()
  })
})
