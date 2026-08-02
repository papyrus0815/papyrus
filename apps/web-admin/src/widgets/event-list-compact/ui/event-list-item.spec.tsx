import '@testing-library/jest-dom'

import { screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { EventListItem } from './event-list-item'

/**
 * 행 컴포넌트 회귀 가드 (2026-08-01 4차 검토 배치 A1).
 *
 * 이 파일에는 오랫동안 렌더 spec이 0개였고, 검증이 전적으로 헤드리스 측정 스크립트에
 * 의존했다. 그 결과 세 라운드에 걸쳐 같은 계약이 반복해서 깨졌다 — 로빙 tabindex가
 * 행 안 액션 버튼에는 안 걸려 탭 정지점이 수백 개가 되고, aria-level/posinset이
 * 리팩터링에서 조용히 빠지고, 자식 수가 두 곳에서 중복 낭독되고.
 *
 * jsdom은 레이아웃을 계산하지 않으므로 열 정렬·행 높이는 여기서 볼 수 없다(그건
 * 측정 스크립트의 몫이다). 대신 **레이아웃을 바꿔도 절대 깨지면 안 되는 계약**만 고정한다.
 */
const baseNode = {
  id: 'evt-1',
  title: '2025 이란-이스라엘 12일 전쟁',
  summary: '',
  period: { start: '2025-06-13', end: '2025-06-24' } as {
    start: string
    end: string | null
  },
}

const baseEvent = {
  id: 'evt-1',
  category: '전쟁/군사',
  relatedCountries: [],
  relatedHistoricalCountries: [],
  keywords: [],
  startDatePrecision: 'day',
  endDatePrecision: 'day',
} as never

const baseProps = {
  node: baseNode as never,
  event: baseEvent,
  depth: 0,
  isExpanded: false,
  hasChildren: false,
  isActive: false,
  dbCategories: [] as never[],
  onSelect: jest.fn(),
  onToggleExpansion: jest.fn(),
  onShowSummary: jest.fn(),
  onToggleBookmark: jest.fn(),
}

describe('EventListItem', () => {
  it('로빙 tabindex는 행 안 액션 버튼까지 전부 적용된다', () => {
    // 행만 -1이고 안쪽 버튼이 0으로 남으면, 252행 × 액션 2개가 그대로 탭 정지점이 돼
    // 목록을 빠져나가는 데 수백 번 Tab을 눌러야 한다(3차 검토에서 238→2로 고친 계약).
    const { container } = renderWithTheme(
      <EventListItem
        {...baseProps}
        hasChildren
        childCount={3}
        hiddenChildCount={2}
        isRovingTarget={false}
      />,
    )
    const focusables = container.querySelectorAll('button, [tabindex]')
    expect(focusables.length).toBeGreaterThan(2)
    focusables.forEach((element) => {
      expect(element).toHaveAttribute('tabindex', '-1')
    })
  })

  it('계층 aria 속성을 그대로 내보낸다', () => {
    renderWithTheme(
      <EventListItem
        {...baseProps}
        ariaLevel={2}
        positionInSet={3}
        setSize={12}
        isActive
      />,
    )
    const row = screen.getByRole('listitem')
    expect(row).toHaveAttribute('aria-level', '2')
    expect(row).toHaveAttribute('aria-posinset', '3')
    expect(row).toHaveAttribute('aria-setsize', '12')
    expect(row).toHaveAttribute('aria-current', 'true')
  })

  it('자식 수는 디스클로저 aria-label에만 실리고 배지로 중복 낭독되지 않는다', () => {
    renderWithTheme(
      <EventListItem {...baseProps} hasChildren childCount={3} />,
    )
    const disclosure = screen.getByRole('button', {
      name: '하위 사건 3개 펼치기',
    })
    expect(disclosure).toHaveAttribute('aria-expanded', 'false')
    // 배지 숫자는 시각 전용 — 접근성 트리에 '3'이 한 번 더 나타나면 안 된다.
    expect(screen.queryByText('3', { ignore: '[aria-hidden="true"]' })).toBeNull()
  })

  it('당일 사건은 시각적으로 점이지만 스크린리더에는 1일로 남는다', () => {
    // 실측 252행 중 133행(53%)이 '1일'이다. 텍스트로 두면 반복 노이즈지만
    // '종료 확정'과 '종료 미상'은 다른 사실이라 지울 수도 없다.
    renderWithTheme(
      <EventListItem
        {...baseProps}
        node={
          {
            ...baseNode,
            period: { start: '2025-06-13', end: '2025-06-13' },
          } as never
        }
      />,
    )
    expect(screen.getByText('1일')).toBeInTheDocument()
  })

  it('종료 미상은 기간 토큰을 만들지 않는다', () => {
    renderWithTheme(
      <EventListItem
        {...baseProps}
        node={
          { ...baseNode, period: { start: '2025-06-13', end: null } } as never
        }
      />,
    )
    expect(screen.queryByText('1일')).toBeNull()
  })

  it('depth는 인라인 CSS 변수로 전달된다 — 클래스가 depth마다 생성되면 memo가 무력해진다', () => {
    renderWithTheme(<EventListItem {...baseProps} depth={2} />)
    expect(screen.getByRole('listitem')).toHaveStyle({ '--depth': '2' })
  })

  it('조건 밖 하위 사건 고지는 버튼이며 되돌릴 수단을 준다', () => {
    const onShowSummary = jest.fn()
    renderWithTheme(
      <EventListItem
        {...baseProps}
        hiddenChildCount={5}
        onShowSummary={onShowSummary}
      />,
    )
    const hint = screen.getByRole('button', { name: /조건 밖의 하위 사건 5개/ })
    hint.click()
    expect(onShowSummary).toHaveBeenCalledWith('evt-1')
  })
})
