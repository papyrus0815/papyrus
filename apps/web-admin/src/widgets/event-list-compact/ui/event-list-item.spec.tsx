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

  /**
   * 이름이 **자족해야** 한다(검토 A11Y-9) — 390px 브라우즈 모드에서는 버튼이 제목보다
   * 먼저 낭독돼, '하위 사건 3개 펼치기'만 들은 시점에는 무엇의 하위인지 알 수 없었다.
   */
  it('자식 수는 디스클로저 aria-label에만 실리고 배지로 중복 낭독되지 않는다', () => {
    renderWithTheme(
      <EventListItem {...baseProps} hasChildren childCount={3} />,
    )
    const disclosure = screen.getByRole('button', {
      name: '2025 이란-이스라엘 12일 전쟁 — 하위 사건 3개 펼치기',
    })
    expect(disclosure).toHaveAttribute('aria-expanded', 'false')
    // 배지 숫자는 시각 전용 — 접근성 트리에 '3'이 한 번 더 나타나면 안 된다.
    expect(screen.queryByText('3', { ignore: '[aria-hidden="true"]' })).toBeNull()
  })

  it('당일 사건은 시각적으로 점이고 스크린리더에는 **날짜**가 남는다', () => {
    // 실측 252행 중 133행(53%)이 '1일'이라 텍스트로 두면 열의 절반이 같은 두 글자였다.
    // 기간 열이 막대 트랙이 된 뒤로 그 자리는 점이 차지하고, 낭독·툴팁에는 '1일'보다
    // 훨씬 쓸모 있는 값(그 날짜)이 실린다 — 정보를 줄이지 않고 바꾼 것이다.
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
    expect(screen.getByText('2025년 6월 13일')).toBeInTheDocument()
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
   * 종료 열 — 이 목록은 오래 **시작만** 보여 주고 있었다(사용자 지적 2026-09-21).
   * 연도는 그룹 머리글이 대므로 같은 해면 월·일만 적는다. jsdom은 컨테이너 쿼리를
   * 평가하지 않으므로 '언제 보이는지'가 아니라 **무엇이 실리는지**만 고정한다.
   */
  describe('종료 열', () => {
    const endText = () =>
      document.querySelector('[data-row-end]')?.textContent ?? null
    const withPeriod = (start: string, end?: string) =>
      ({ ...baseNode, period: { start, end } }) as never

    it('종료가 시작과 다르면 날짜를 싣는다 — 같은 해면 월·일만', () => {
      renderWithTheme(
        <EventListItem
          {...baseProps}
          groupYear={2025}
          node={withPeriod('2025-06-13', '2025-06-24')}
        />,
      )
      expect(endText()).toBe('6.24')
    })

    it('그룹과 다른 해로 끝나면 연도까지 적는다', () => {
      renderWithTheme(
        <EventListItem
          {...baseProps}
          groupYear={1989}
          node={withPeriod('1989-11-17', '1999-03-12')}
        />,
      )
      expect(endText()).toBe('1999.3.12')
    })

    it("시작과 같은 날이면 날짜를 되풀이하지 않고 '당일'로 적는다", () => {
      renderWithTheme(
        <EventListItem
          {...baseProps}
          groupYear={2025}
          node={withPeriod('2025-06-13', '2025-06-13')}
        />,
      )
      expect(endText()).toBe('당일')
    })

    it('종료가 없으면 빈칸이다 — 그 빈칸이 곧 종료 미상이다', () => {
      renderWithTheme(
        <EventListItem {...baseProps} groupYear={2025} node={withPeriod('2025-06-13')} />,
      )
      expect(endText()).toBe('')
    })
  })

  /**
   * 제목 뒤 한 줄 — 설명을 걷어낸 뒤 **검색 근거만** 남는 자리다.
   *
   * jsdom은 컨테이너 쿼리를 평가하지 않으므로 **언제 보이는지**는 여기서 볼 수 없다
   * (그건 시각 확인의 몫이다). 대신 CSS와 무관한 계약 — 어떤 텍스트가 실리는지 — 만 고정한다.
   */
  describe('제목 뒤 한 줄', () => {
    const withSummary = (summary: string, start = '2025-06-13') =>
      ({ ...baseNode, summary, period: { start, end: '2025-06-24' } }) as never

    const summaryText = () =>
      document.querySelector('[data-row-summary]')?.textContent ?? null

    it('검색 중이 아니면 설명을 싣지 않는다 — 목록은 색인이다', () => {
      renderWithTheme(
        <EventListItem
          {...baseProps}
          node={withSummary(
            '2025년 6월 13일, 이스라엘이 이란 핵시설을 선제 타격하며 교전이 시작됐다.',
          )}
        />,
      )
      expect(document.querySelector('[data-row-summary]')).toBeNull()
    })

    it('검색 중이면 매칭 근거를 싣는다 — 왜 이 행이 결과에 있는가', () => {
      // 검색 결과의 76%가 제목에 검색어가 없는 행 — 근거가 없으면
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

    it('검색어가 제목에 이미 보이면 근거를 만들지 않는다', () => {
      renderWithTheme(
        <EventListItem
          {...baseProps}
          searchQuery={String(baseNode.title).slice(0, 3)}
          node={withSummary('배경 서술이 길게 이어지는 설명 문장이다. 아주 길다.')}
        />,
      )
      expect(document.querySelector('[data-row-summary]')).toBeNull()
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

  /**
   * 레일 가지선 — **구슬은 언제나 선 위에 얹힌다**가 이 레일의 단일 문법이다.
   *
   * jsdom은 레이아웃도 pseudo-element도 계산하지 않으므로 선의 좌표는 여기서 볼 수 없다
   * (그건 브라우저 실측의 몫이다). 대신 **가지선 요소가 언제 존재하는가**만 고정한다 —
   * 직전 구현은 depth 1 자식과 depth 0 부모 양쪽에서 이 요소를 그리지 않아, 하위 묶음
   * 115행이 세로선을 하나도 갖지 못한 채 가로 스텁만 늘어놓고 있었다.
   */
  describe('레일 가지선', () => {
    const branchOf = (container: HTMLElement) =>
      container.querySelector('[role="listitem"] > span[aria-hidden="true"]')

    it('자식 없는 최상위 행은 가지선을 그리지 않는다 — 그 구슬은 줄기 위에 있다', () => {
      const { container } = renderWithTheme(<EventListItem {...baseProps} />)
      expect(branchOf(container)).toBeNull()
    })

    it('접힌 부모도 그리지 않는다 — 내려갈 자식 행이 화면에 없다', () => {
      const { container } = renderWithTheme(
        <EventListItem {...baseProps} hasChildren childCount={3} />,
      )
      expect(branchOf(container)).toBeNull()
    })

    it('펼친 최상위 부모는 자식 가지선으로 꺾어 내려가는 엘보를 그린다', () => {
      const { container } = renderWithTheme(
        <EventListItem {...baseProps} hasChildren isExpanded childCount={3} />,
      )
      expect(branchOf(container)).not.toBeNull()
    })

    it('하위 행은 자기 가지선을 그린다', () => {
      const { container } = renderWithTheme(
        <EventListItem
          {...baseProps}
          depth={1}
          ariaLevel={2}
          positionInSet={2}
          setSize={5}
        />,
      )
      expect(branchOf(container)).not.toBeNull()
    })
  })
})
