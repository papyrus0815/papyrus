/**
 * CardsView 렌더 테스트 — 평면 랭킹 카드 뷰.
 * 정렬 로직 자체는 sort-helpers.spec가 커버 → 여기선 뷰 배선만:
 * 전체 렌더·핀 인물 최상단·페이지네이션(더보기)을 회귀 방지.
 */
import { renderWithTheme } from '@/shared/test/render-with-theme'
import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import { INFOGRAPHIC_DEFAULTS } from '../model/constants'
import type { AdaptedPerson } from '../model/types'

import { CardsView } from './cards-view'

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

/** 카드 버튼만 추출 — 카드 root의 aria-label엔 "영향력"이 포함되나 핀 버튼엔 없음. */
function cardButtons() {
  return screen.getAllByRole('button', { name: /영향력/ })
}

describe('CardsView', () => {
  it('페이지 크기 이하면 전부 렌더하고 더보기 버튼이 없다', () => {
    const people = Array.from({ length: 5 }).map((_unused, index) =>
      person({ id: `p${index}`, influence: index * 10 }),
    )
    renderWithTheme(
      <CardsView
        people={people}
        onOpen={noop}
        query=""
        pinned={new Set()}
        togglePin={noop}
      />,
    )
    expect(cardButtons()).toHaveLength(5)
    expect(screen.queryByText(/더보기/)).toBeNull()
  })

  it('핀 인물은 정렬(영향력)과 무관하게 맨 앞 카드', () => {
    const people = [
      person({ id: 'high', name: '높은영향', influence: 90 }),
      person({ id: 'pinned', name: '핀인물', influence: 5 }),
    ]
    renderWithTheme(
      <CardsView
        people={people}
        onOpen={noop}
        query=""
        pinned={new Set(['pinned'])}
        togglePin={noop}
      />,
    )
    expect(cardButtons()[0]).toHaveAccessibleName(/핀인물/)
  })

  it('페이지 크기 초과면 초기 N개만 렌더하고 더보기로 나머지 노출', () => {
    const total = INFOGRAPHIC_DEFAULTS.CARDS_PAGE_SIZE + 5
    const people = Array.from({ length: total }).map((_unused, index) =>
      person({ id: `p${index}`, name: `인물${index}`, influence: total - index }),
    )
    renderWithTheme(
      <CardsView
        people={people}
        onOpen={noop}
        query=""
        pinned={new Set()}
        togglePin={noop}
      />,
    )
    expect(cardButtons()).toHaveLength(INFOGRAPHIC_DEFAULTS.CARDS_PAGE_SIZE)

    fireEvent.click(screen.getByText(/더보기/))
    expect(cardButtons()).toHaveLength(total)
    expect(screen.queryByText(/더보기/)).toBeNull()
  })
})
