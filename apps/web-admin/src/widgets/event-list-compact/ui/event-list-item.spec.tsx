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

  /**
   * 요약 열(배치 D) — 넓은 카드에서 죽은 폭을 잉크로 되돌리는 흡수체.
   *
   * jsdom은 컨테이너 쿼리를 평가하지 않으므로 **언제 보이는지**는 여기서 볼 수 없다
   * (그건 시각 확인의 몫이다). 대신 CSS와 무관한 계약 — 어떤 텍스트가 실리는지 — 만 고정한다.
   */
  describe('요약 열', () => {
    const withSummary = (summary: string, start = '2025-06-13') =>
      ({ ...baseNode, summary, period: { start, end: '2025-06-24' } }) as never

    const summaryText = () =>
      document.querySelector('[data-row-summary]')?.textContent ?? null

    it('설명 선두 날짜가 행의 시작 연도와 같으면 잘라낸다 — date 트랙이 이미 말했다', () => {
      renderWithTheme(
        <EventListItem
          {...baseProps}
          node={withSummary(
            '2025년 6월 13일, 이스라엘이 이란 핵시설을 선제 타격하며 교전이 시작됐다.',
          )}
        />,
      )
      expect(summaryText()).toBe(
        '이스라엘이 이란 핵시설을 선제 타격하며 교전이 시작됐다.',
      )
    })

    it('설명이 다른 해로 시작하면 자르지 않는다 — 중복이 아니라 배경 정보다', () => {
      const background =
        '1979년 이란 혁명 이후 누적된 적대가 배경이었고 양국은 오래 대리 충돌했다.'
      renderWithTheme(
        <EventListItem {...baseProps} node={withSummary(background)} />,
      )
      expect(summaryText()).toBe(background)
    })

    it('잘라낸 뒤 남는 게 너무 짧으면 자르기를 포기한다', () => {
      const terse = '2025년 6월 13일, 개전했으며 곧 휴전 협상이 시작됐다.'
      renderWithTheme(
        <EventListItem {...baseProps} node={withSummary(terse)} />,
      )
      expect(summaryText()).toBe(terse)
    })

    it('설명이 없거나 너무 짧으면 열지 않는다 — 빈 셀을 만들지 않는다', () => {
      renderWithTheme(<EventListItem {...baseProps} node={withSummary('짧다.')} />)
      expect(document.querySelector('[data-row-summary]')).toBeNull()
    })

    it('검색 중이면 앞머리가 아니라 매칭 근거를 싣는다', () => {
      // 검색 결과의 76%가 제목에 검색어가 없는 행 — 근거를 앞머리로 덮으면
      // '왜 걸렸는지 알 수 없는 목록'으로 되돌아간다(CR-3).
      renderWithTheme(
        <EventListItem
          {...baseProps}
          searchQuery="핵시설"
          node={withSummary(
            '2025년 6월 13일, 이스라엘이 이란 핵시설을 선제 타격하며 교전이 시작됐다.',
          )}
        />,
      )
      expect(summaryText()).toContain('설명')
      expect(summaryText()).toContain('핵시설')
    })
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
