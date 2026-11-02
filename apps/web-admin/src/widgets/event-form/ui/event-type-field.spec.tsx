import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { EventTypeField } from './event-type-field'

describe('EventTypeField', () => {
  it('분야 키(MILITARY 등)를 한국어 라벨로 풀어 힌트와 접근성 라벨에 표시한다', () => {
    renderWithTheme(
      <EventTypeField domain="MILITARY" value="BATTLE" onChange={jest.fn()} />,
    )

    expect(
      screen.getByRole('radiogroup', { name: '군사의 세부 분야' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/군사 › 전투·작전/)).toBeInTheDocument()
    expect(screen.queryByText(/MILITARY ›/)).not.toBeInTheDocument()
    expect(screen.getByText(/아래 ‘기록’에서 바로 적습니다/)).toBeInTheDocument()
  })

  it('편집 모드(isEditMode)에서는 하단 기록 섹션 대신 상세 화면 편집을 안내한다', () => {
    renderWithTheme(
      <EventTypeField
        domain="MILITARY"
        value="BATTLE"
        isEditMode
        onChange={jest.fn()}
      />,
    )

    expect(screen.getByText(/상세 화면에서 편집합니다/)).toBeInTheDocument()
    expect(
      screen.queryByText(/아래 ‘기록’에서 바로 적습니다/),
    ).not.toBeInTheDocument()
  })

  it('분야를 고르기 전에도 자주 쓰는 세부 칩을 보여 주고, 전체 보기와 접기를 지원한다', () => {
    const onChange = jest.fn()
    renderWithTheme(
      <EventTypeField domain={null} value={null} onChange={onChange} />,
    )

    expect(
      screen.getByRole('radiogroup', { name: '세부 분야' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '전투·작전' })).toBeInTheDocument()
    expect(
      screen.queryByRole('radio', { name: '개종·세례' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /전체 세부 보기/ }))
    expect(screen.getByText('충돌')).toBeInTheDocument()
    expect(screen.getByText('자연·문화·사람')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '개종·세례' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '자주 쓰는 세부만 보기' }))
    expect(
      screen.queryByRole('radio', { name: '개종·세례' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: '전투·작전' }))
    expect(onChange).toHaveBeenCalledWith('BATTLE')
  })

  it('특정 분야에서 "다른 세부 더 보기"를 누르면 나머지 세부를 의미군별로 묶어 보여 주고 다시 접을 수 있다', () => {
    const { rerender } = renderWithTheme(
      <EventTypeField domain="SCIENCE" value={null} onChange={jest.fn()} />,
    )

    expect(screen.getByRole('radio', { name: '발견·학술' })).toBeInTheDocument()
    expect(
      screen.queryByRole('radio', { name: '전투·작전' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /다른 세부 더 보기/ }))
    expect(screen.getByText('충돌')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '전투·작전' })).toBeInTheDocument()

    // 분야가 바뀌면 펼쳐 둔 '더 보기'가 자동으로 접힌다
    rerender(
      <EventTypeField domain="CULTURE" value={null} onChange={jest.fn()} />,
    )
    expect(
      screen.queryByRole('radio', { name: '전투·작전' }),
    ).not.toBeInTheDocument()
  })

  it('기타(OTHER) 분야는 28종 전체를 의미군별로 묶어 보여 준다', () => {
    renderWithTheme(
      <EventTypeField domain="OTHER" value={null} onChange={jest.fn()} />,
    )

    expect(screen.getByText('충돌')).toBeInTheDocument()
    expect(screen.getByText('국가 간')).toBeInTheDocument()
    expect(screen.getByText('국가·권력')).toBeInTheDocument()
    expect(screen.getByText('경제·산업')).toBeInTheDocument()
    expect(screen.getByText('자연·문화·사람')).toBeInTheDocument()
  })

  it('라디오그룹 안에서 탭 정지점은 1개이고 화살표 키로 포커스가 이동한다', () => {
    renderWithTheme(
      <EventTypeField domain="SCIENCE" value="PRODUCT" onChange={jest.fn()} />,
    )

    const radios = screen.getAllByRole('radio')
    const tabStops = radios.filter((radio) => radio.getAttribute('tabindex') === '0')
    expect(tabStops).toHaveLength(1)
    expect(tabStops[0]).toHaveTextContent('제품·기술 발표')

    tabStops[0].focus()
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' })
    expect(document.activeElement).toHaveTextContent('건설·개통')
  })

  it('분야 미선택 상태에서 세부 칩 안에 함께 선택될 기본 분야 배지를 예고한다', () => {
    renderWithTheme(
      <EventTypeField domain={null} value={null} onChange={jest.fn()} />,
    )

    const battleChip = screen.getByRole('radio', { name: '전투·작전' })
    expect(battleChip).toHaveTextContent('군사')
    const treatyChip = screen.getByRole('radio', { name: '조약·협정·가입' })
    expect(treatyChip).toHaveTextContent('외교')
  })

  it('사건명에서 분야·세부가 추론되면 원클릭 추천 배지를 띄우고 클릭 시 적용한다', () => {
    const onApplySuggestion = jest.fn()
    renderWithTheme(
      <EventTypeField
        domain={null}
        value={null}
        eventTitle="스당 전투"
        onApplySuggestion={onApplySuggestion}
        onChange={jest.fn()}
      />,
    )

    const button = screen.getByRole('button', { name: '군사 › 전투·작전 적용' })
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(onApplySuggestion).toHaveBeenCalledWith({
      domain: 'MILITARY',
      type: 'BATTLE',
    })
  })

  it('빠른 검색창에 예시·동의어를 입력하면 숨은 세부까지 찾아 보여 주고 Enter 또는 클릭으로 바로 적용한다', () => {
    const onApplySuggestion = jest.fn()
    renderWithTheme(
      <EventTypeField
        domain={null}
        value={null}
        onApplySuggestion={onApplySuggestion}
        onChange={jest.fn()}
      />,
    )

    const searchInput = screen.getByRole('searchbox', { name: '세부 분야 빠른 검색' })
    fireEvent.change(searchInput, { target: { value: '탄핵' } })

    expect(screen.getByText('정치 › 즉위·취임·실각')).toBeInTheDocument()
    fireEvent.keyDown(searchInput, { key: 'Enter' })

    expect(onApplySuggestion).toHaveBeenCalledWith({
      domain: 'POLITICS',
      type: 'POWER_CHANGE',
    })
    expect(searchInput).toHaveValue('')
  })

  it('최근 사용한 분류(recentCombos)가 있으면 원클릭 칩으로 노출하고 클릭 시 적용한다', () => {
    const onApplySuggestion = jest.fn()
    renderWithTheme(
      <EventTypeField
        domain={null}
        value={null}
        recentCombos={[
          { domain: 'MILITARY', type: 'BATTLE' },
          { domain: 'DIPLOMACY', type: 'TREATY' },
        ]}
        onApplySuggestion={onApplySuggestion}
        onChange={jest.fn()}
      />,
    )

    const recentBtn = screen.getByRole('button', { name: '군사 › 전투·작전' })
    fireEvent.click(recentBtn)
    expect(onApplySuggestion).toHaveBeenCalledWith({
      domain: 'MILITARY',
      type: 'BATTLE',
    })
  })

  it('상위 사건이 있을 때(hasParent) 하위 사건용 세부(전투·작전)를 묶음(전쟁)보다 첫 번째 탭 정지점에 둔다', () => {
    renderWithTheme(
      <EventTypeField
        domain="MILITARY"
        value={null}
        hasParent
        onChange={jest.fn()}
      />,
    )

    const radios = screen.getAllByRole('radio')
    expect(radios[0]).toHaveAccessibleName('전투·작전')
    expect(radios[0]).toHaveAttribute('tabindex', '0')
    expect(screen.getByText(/전쟁·작전·군비/)).toBeInTheDocument()
  })
})
