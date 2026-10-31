/**
 * 인물 상세 서브컴포넌트(BirthDeathCards · SpouseDetailSection · CollapsibleSection) 단위 테스트.
 * - 히어로 부제와 중복되는 단순 생몰 일자만 있을 때 BirthDeathCards 생략 여부
 * - SpouseDetailSection 배우자 이름 클릭 연결 및 hasVisibleSpouseDetails 판별
 * - CollapsibleSection 0건(empty) 시 헛클릭 아코디언 비활성화 및 액션 유지
 */
import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

jest.mock('@/shared/ui/rich-text-read-view', () => ({
  RichTextReadView: () => null,
}))

import { BirthDeathCards } from './birth-death-cards'
import { CollapsibleSection } from './collapsible-section'
import {
  SpouseDetailSection,
  hasVisibleSpouseDetails,
} from './spouse-detail-section'
import type { PersonDetailData } from './types'

describe('BirthDeathCards', () => {
  const basePerson: PersonDetailData = {
    id: 'p-1',
    name: '이순신',
  }

  it('생몰 일자·향년만 있고 장소·사유·비고 등 추가 정보가 없으면 렌더링하지 않는다', () => {
    const { container } = renderWithTheme(
      <BirthDeathCards
        person={basePerson}
        birthDateStr="1545년 4월 28일"
        deathDateStr="1598년 12월 16일"
        ageAtDeath={53}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('출생지나 사망 사유 등 추가 상세 정보가 하나라도 있으면 카드를 렌더링한다', () => {
    renderWithTheme(
      <BirthDeathCards
        person={{
          ...basePerson,
          birthPlaceText: '한성부 건천동',
          deathType: 'KIA',
          deathCause: '노량해전 전사',
        }}
        birthDateStr="1545년 4월 28일"
        deathDateStr="1598년 12월 16일"
        ageAtDeath={53}
      />,
    )
    expect(screen.getByLabelText('출생 정보')).toBeInTheDocument()
    expect(screen.getByText('한성부 건천동')).toBeInTheDocument()
    expect(screen.getByLabelText('사망 정보')).toBeInTheDocument()
    expect(screen.getByText('노량해전 전사')).toBeInTheDocument()
  })
})

describe('SpouseDetailSection', () => {
  it('혼인 기간·서열·비고가 없는 배우자 관계는 hasVisibleSpouseDetails가 false를 반환한다', () => {
    expect(
      hasVisibleSpouseDetails([
        {
          id: 'rel-1',
          spouse: { id: 'sp-1', name: '방씨' },
        },
      ]),
    ).toBe(false)

    expect(
      hasVisibleSpouseDetails([
        {
          id: 'rel-1',
          marriageRank: 'PRIMARY',
          spouse: { id: 'sp-1', name: '방씨' },
        },
      ]),
    ).toBe(true)
  })

  it('onPersonClick이 주어지면 배우자 이름을 버튼으로 렌더하고 클릭 시 배우자 ID를 전달한다', () => {
    const onPersonClick = jest.fn()
    renderWithTheme(
      <SpouseDetailSection
        spouseRelations={[
          {
            id: 'rel-1',
            marriageStartYear: 1565,
            note: '정실 부인',
            spouse: { id: 'spouse-42', name: '상주 방씨' },
          },
        ]}
        isDeceased
        onPersonClick={onPersonClick}
      />,
    )

    const spouseBtn = screen.getByRole('button', { name: '상주 방씨' })
    fireEvent.click(spouseBtn)
    expect(onPersonClick).toHaveBeenCalledWith('spouse-42')
  })
})

describe('CollapsibleSection', () => {
  it('count가 0이면 아코디언 토글 버튼과 빈 본문을 숨기고 정적 제목과 우측 액션만 표시한다', () => {
    renderWithTheme(
      <CollapsibleSection
        storageKey="test-empty"
        ariaLabel="학력"
        icon={<span data-testid="icon" />}
        title="학력"
        count={0}
        defaultOpen
        actions={<button type="button">+ 학력</button>}
      >
        <div>등록된 학력이 없습니다.</div>
      </CollapsibleSection>,
    )

    expect(screen.getByText('학력')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ 학력' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /학력 0/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('등록된 학력이 없습니다.'),
    ).not.toBeInTheDocument()
  })

  it('count가 1 이상이면 토글 버튼을 통해 본문을 접고 펼칠 수 있다', () => {
    renderWithTheme(
      <CollapsibleSection
        storageKey="test-non-empty"
        ariaLabel="학력"
        icon={<span data-testid="icon" />}
        title="학력"
        count={2}
        defaultOpen={false}
      >
        <div>성균관 유생</div>
      </CollapsibleSection>,
    )

    const toggleBtn = screen.getByRole('button', { name: /학력/ })
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggleBtn)
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('성균관 유생')).toBeInTheDocument()
  })

  it('count가 0이어도 keepChildrenMountedWhenEmpty가 true이면 모달·ref 유지를 위해 children을 마운트한다', () => {
    renderWithTheme(
      <CollapsibleSection
        storageKey="test-empty-mounted"
        ariaLabel="정당·선거"
        icon={<span data-testid="icon" />}
        title="정당·선거"
        count={0}
        keepChildrenMountedWhenEmpty
        actions={<button type="button">+ 당원 소속</button>}
      >
        <div data-testid="mounted-modal-host" />
      </CollapsibleSection>,
    )

    expect(screen.getByText('정당·선거')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /정당·선거 0/ }),
    ).not.toBeInTheDocument()
    expect(screen.getByTestId('mounted-modal-host')).toBeInTheDocument()
  })

  it('이전 개요 탭 시절 localStorage 키(papyrus.person-overview.collapse.*)가 0이어도 defaultOpen이 true면 열린 상태로 시작한다', () => {
    window.localStorage.setItem('papyrus.person-overview.collapse.education', '0')
    window.localStorage.removeItem('papyrus.person-career.collapse.education')

    renderWithTheme(
      <CollapsibleSection
        storageKey="education"
        ariaLabel="학력"
        icon={<span data-testid="icon" />}
        title="학력"
        count={1}
        defaultOpen
      >
        <div>성균관 입학</div>
      </CollapsibleSection>,
    )

    const toggleBtn = screen.getByRole('button', { name: /학력/ })
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('성균관 입학')).toBeInTheDocument()
  })
})
