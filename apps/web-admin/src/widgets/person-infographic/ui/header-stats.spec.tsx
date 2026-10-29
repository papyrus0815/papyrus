import { renderWithTheme } from '@/shared/test/render-with-theme'
import '@testing-library/jest-dom'
import { act, fireEvent, screen } from '@testing-library/react'

import { ERAS, UNKNOWN_ERA } from '../model/constants'
import { usePersonInfographicFilterStore } from '../model/filter.store'
import type { AdaptedPerson } from '../model/types'

import { HeaderStats } from './header-stats'

const basePeople: AdaptedPerson[] = [
  {
    id: 'sejong',
    name: '세종',
    country: '조선',
    region: '동아시아',
    field: '정치',
    era: ERAS.find((e) => e.key === 'medieval')!,
    born: 1397,
    died: 1450,
    activityYear: 1434,
    isMonarch: true,
    isHeadOfState: false,
    isAlive: false,
    age: 53,
    influence: 95,
    primaryTitle: '제4대 국왕',
    faction: '전주 이씨',
    biography: '훈민정음 창제',
    profileImageUrl: null,
    searchText: '세종 조선 동아시아 정치 전주 이씨 제4대 국왕',
  },
  {
    id: 'newton',
    name: '아이작 뉴턴',
    country: '영국',
    region: '유럽',
    field: '과학',
    era: ERAS.find((e) => e.key === 'early')!,
    born: 1643,
    died: 1727,
    activityYear: 1685,
    isMonarch: false,
    isHeadOfState: false,
    isAlive: false,
    age: 84,
    influence: 98,
    primaryTitle: '물리학자',
    faction: '',
    biography: '만유인력',
    profileImageUrl: null,
    searchText: '아이작 뉴턴 영국 유럽 과학 물리학자',
  },
  {
    id: 'unknown-person',
    name: '미상 인물',
    country: '미상',
    region: '기타',
    field: '기타',
    era: UNKNOWN_ERA,
    born: null,
    died: null,
    activityYear: null,
    isMonarch: false,
    isHeadOfState: false,
    isAlive: true,
    age: null,
    influence: 40,
    primaryTitle: null,
    faction: '',
    biography: null,
    profileImageUrl: null,
    searchText: '미상 인물',
  },
]

describe('HeaderStats', () => {
  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  })

  beforeEach(() => {
    act(() => {
      usePersonInfographicFilterStore.getState().resetFilters()
    })
  })

  it('시대·지역 필터가 켜져도 교차 패싯(basePeople)을 통해 다른 시대 칩과 지역 막대가 증발하지 않고 유지된다', () => {
    act(() => {
      usePersonInfographicFilterStore.getState().toggleScope('era', 'medieval')
    })
    const filtered = basePeople.filter((p) => p.era.key === 'medieval')

    renderWithTheme(
      <HeaderStats people={filtered} basePeople={basePeople} variant="full" />,
    )

    // 중세 칩뿐 아니라 근세(뉴턴) 칩도 사라지지 않고 남아 다중 선택이 가능해야 함
    expect(
      screen.getByRole('button', { name: '중세 1명, 시대 필터 토글' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: '근세 1명, 시대 필터 토글' }),
    ).toHaveAttribute('aria-pressed', 'false')

    // 연도 미상 안내 배지 표시 확인
    expect(screen.getByText('연도 미상 1명')).toBeInTheDocument()
  })

  it('평균 수명 타일(최장수 표시·수명순 정렬 토글)과 생존 타일(생존 필터 토글)이 인터랙티브하게 동작한다', () => {
    renderWithTheme(
      <HeaderStats
        people={basePeople}
        basePeople={basePeople}
        variant="full"
      />,
    )

    // 최장수 아이작 뉴턴(84세) 표기 확인
    expect(screen.getByText(/최장수 아이작 뉴턴\(84세\)/)).toBeInTheDocument()

    // 평균 수명 타일 클릭 → 수명순('lifespan') 정렬 전환
    const ageTile = screen.getByTitle('클릭하여 수명순으로 인물 정렬')
    fireEvent.click(ageTile)
    expect(usePersonInfographicFilterStore.getState().sort).toBe('lifespan')

    // 생존 타일 클릭 → 생존 인물('alive') 필터 전환
    const aliveTile = screen.getByTitle('생존 인물만 필터링')
    fireEvent.click(aliveTile)
    expect(usePersonInfographicFilterStore.getState().aliveFilter).toBe('alive')
  })
})
