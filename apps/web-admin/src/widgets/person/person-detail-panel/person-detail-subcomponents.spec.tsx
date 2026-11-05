/**
 * 인물 상세 서브컴포넌트(BirthDeathCards · SpouseDetailSection · CollapsibleSection) 단위 테스트.
 * - 히어로 부제와 중복되는 단순 생몰 일자만 있을 때 BirthDeathCards 생략 여부
 * - SpouseDetailSection 배우자 이름 클릭 연결 및 hasVisibleSpouseDetails 판별
 * - CollapsibleSection 0건(empty) 시 헛클릭 아코디언 비활성화 및 액션 유지
 */
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'
import { PersonPoliticsSection } from '@/widgets/person/person-politics-section/person-politics-section'

jest.mock('@/shared/ui/rich-text-read-view', () => ({
  RichTextReadView: () => null,
}))

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({
  useClickSound: () => jest.fn(),
}))

jest.mock('@/shared/api/election', () => ({
  createPartyMembership: jest.fn(),
  deletePartyMembership: jest.fn(),
  getPoliticalParties: jest.fn(async () => []),
  updatePartyMembership: jest.fn(),
}))

jest.mock('@/shared/api/person-career', () => ({
  personCareerApi: {},
}))

import { BirthDeathCards } from './birth-death-cards'
import { periodLabel, sortMembers } from './cabinet-connections'
import {
  CollapsibleSection,
  expandCollapsibleSectionForRecordKey,
} from './collapsible-section'
import { deriveTenureDurationLabel } from './helpers'
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

  it('추정 배우자(inferredSpouses) 승격 버튼과 자녀 서열·소생 인라인 편집기가 동작한다', () => {
    const onPromoteInferredSpouse = jest.fn()
    const onQuickUpdateChild = jest.fn()
    renderWithTheme(
      <SpouseDetailSection
        spouseRelations={[]}
        inferredSpouses={[{ id: 'inf-sp-1', name: '신빈 김씨' }]}
        childrenList={[
          {
            id: 'child-1',
            name: '계양군',
            birthOrder: 2,
            fatherId: 'ego-1',
            motherId: 'inf-sp-1',
          } as any,
        ]}
        egoId="ego-1"
        onPromoteInferredSpouse={onPromoteInferredSpouse}
        onQuickUpdateChild={onQuickUpdateChild}
      />,
    )

    expect(screen.getByText('추정 (자녀 기록 기반)')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /후궁 등록/ }))
    expect(onPromoteInferredSpouse).toHaveBeenCalledWith('inf-sp-1', 'CONCUBINE')

    const orderInput = screen.getByLabelText('계양군 출생 서열')
    fireEvent.change(orderInput, { target: { value: '3' } })
    fireEvent.blur(orderInput)
    expect(onQuickUpdateChild).toHaveBeenCalledWith('child-1', { birthOrder: 3 })
  })

  it('편집 핸들러(onChangeSpouseRank 등)가 주어지면 서열·기간·비고가 아직 없는 배우자도 사라지지 않고 표시되며, 양자녀의 반대편 양부모를 정확히 매핑한다', () => {
    const onChangeSpouseRank = jest.fn()
    const onQuickUpdateChild = jest.fn()
    renderWithTheme(
      <SpouseDetailSection
        egoId="king-1"
        spouseRelations={[
          {
            id: 'rel-no-meta',
            spouse: { id: 'queen-1', name: '신정왕후', gender: 'FEMALE' },
          },
        ]}
        childrenList={[
          {
            id: 'adopted-1',
            name: '고종',
            gender: 'MALE',
            fatherId: 'heungseon',
            motherId: 'yeoheung',
            adoptiveFatherId: 'king-1',
            adoptiveMotherId: 'queen-1',
          } as any,
        ]}
        onChangeSpouseRank={onChangeSpouseRank}
        onQuickUpdateChild={onQuickUpdateChild}
      />,
    )

    expect(screen.getAllByText('신정왕후').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/고종 \(입양\)/)).toBeInTheDocument()
    expect(screen.getByText(/고종 \(양자녀\)/)).toBeInTheDocument()
    const parentSelect = screen.getByLabelText('고종 반대편 부모 선택') as HTMLSelectElement
    expect(parentSelect.value).toBe('queen-1')
  })

  it('양자녀에 생부 이름(fatherName)이 포함된 경우 (양자·흥선대원군 소생)으로 명확히 표기한다', () => {
    renderWithTheme(
      <SpouseDetailSection
        egoId="king-1"
        spouseRelations={[
          {
            id: 'rel-1',
            marriageRank: 'PRIMARY',
            spouse: { id: 'queen-1', name: '신정왕후', gender: 'FEMALE' },
          },
        ]}
        childrenList={[
          {
            id: 'adopted-1',
            name: '고종',
            gender: 'MALE',
            fatherId: 'heungseon',
            fatherName: '흥선대원군',
            adoptiveFatherId: 'king-1',
            adoptiveMotherId: 'queen-1',
            isAdopted: true,
          } as any,
        ]}
      />,
    )

    expect(screen.getByText(/고종 \(양자·흥선대원군 소생\)/)).toBeInTheDocument()
  })

  it('친생자가 타인에게 입양(출계)된 경우 자녀 빠른 정리 행에 출계(양부/양모) 표기를 노출한다', () => {
    renderWithTheme(
      <SpouseDetailSection
        egoId="heungseon"
        spouseRelations={[
          {
            id: 'rel-min',
            marriageRank: 'PRIMARY',
            rankHolderId: 'heungseon',
            spouse: { id: 'yeoheung-min', name: '여흥부대부인 민씨', gender: 'FEMALE' },
          },
        ]}
        childrenList={[
          {
            id: 'gojong',
            name: '고종',
            gender: 'MALE',
            fatherId: 'heungseon',
            motherId: 'yeoheung-min',
            adoptiveFatherId: 'cheoljong',
            adoptiveFatherName: '철종',
            isAdopted: false,
          },
        ]}
        onQuickUpdateChild={jest.fn()}
      />,
    )

    expect(screen.getByText(/고종 \(출계·철종 입양\)/)).toBeInTheDocument()
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

describe('deriveTenureDurationLabel', () => {
  it('고대(AD < 1000) 재위 기간(예: 광개토대왕 391~413)도 하드컷 없이 계산한다', () => {
    expect(deriveTenureDurationLabel('0391-01-01', '0413-01-01', 'year', 'year')).toBe(
      '약 22년',
    )
  })

  it('기원전(BC) 및 BC→AD 경계를 넘는 재위 기간(예: 아우구스투스 BC 27~AD 14)도 천문연도 기준으로 계산한다', () => {
    expect(
      deriveTenureDurationLabel('-0027-01-16', '0014-08-19', 'day', 'day'),
    ).toBe('약 40년 7개월')
    expect(
      deriveTenureDurationLabel('-0057-01-01', '-0004-01-01', 'year', 'year'),
    ).toBe('약 53년')
  })

  it('시작은 월/일 정밀도이고 종료가 연(year) 정밀도일 때 합성 01월로 인해 1년 차감되지 않고 연도 차로 계산한다', () => {
    expect(
      deriveTenureDurationLabel('1592-06-15', '1598-01-01', 'day', 'year'),
    ).toBe('약 6년')
  })
})

describe('PersonPoliticsSection', () => {
  const sampleMemberships = [
    {
      id: 'pm-1',
      personId: 'p-1',
      partyId: 'party-1',
      startDate: '1921-07-23',
      endDate: null,
      roleCategory: 'LEADERSHIP' as const,
      leadershipTier: 'TOP' as const,
      roleTitle: '주석',
      notes: null,
      party: { id: 'party-1', name: '중국공산당', shortName: '중공' },
    },
  ]

  function renderWithQuery(ui: React.ReactElement) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    return renderWithTheme(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    )
  }

  it('생존 인물(isDeceased=false)은 종료일이 비어 있을 때 현재로 표시하고, 고인(isDeceased=true)은 미상으로 표시한다', () => {
    const { unmount } = renderWithQuery(
      <PersonPoliticsSection
        personId="p-1"
        variant="overview"
        isDeceased={false}
        partyMemberships={sampleMemberships}
        electionCandidacies={[]}
      />,
    )
    expect(screen.getByText('1921-07-23 ~ 현재')).toBeInTheDocument()
    unmount()

    renderWithQuery(
      <PersonPoliticsSection
        personId="p-1"
        variant="overview"
        isDeceased
        partyMemberships={sampleMemberships}
        electionCandidacies={[]}
      />,
    )
    expect(screen.getByText('1921-07-23 ~ 미상')).toBeInTheDocument()
    expect(screen.queryByText('1921-07-23 ~ 현재')).not.toBeInTheDocument()
  })

  it('readOnly=true이면 수정·삭제·추가 버튼을 숨긴다', () => {
    renderWithQuery(
      <PersonPoliticsSection
        personId="p-1"
        variant="overview"
        readOnly
        partyMemberships={sampleMemberships}
        electionCandidacies={[]}
      />,
    )
    expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument()
  })

  it('연보 타임라인 점프(jumpToRecord)를 위해 당적과 선거 후보 항목에 person-record-* DOM id를 부여한다', () => {
    renderWithQuery(
      <PersonPoliticsSection
        personId="p-1"
        variant="overview"
        partyMemberships={sampleMemberships}
        electionCandidacies={[
          {
            id: 'ec-1',
            nominationType: 'PARTY',
            election: {
              id: 'el-1',
              name: '제20대 총선',
              pollDate: '2016-04-13',
              electionType: 'LEGISLATIVE',
            },
            party: { id: 'party-1', name: '중국공산당' },
            electoralDistrict: { id: 'ed-1', name: '종로구' },
            result: { elected: true, voteSharePercent: '52.6' },
          },
        ]}
      />,
    )
    expect(document.getElementById('person-record-partymem-pm-1')).not.toBeNull()
    expect(document.getElementById('person-record-candidacy-ec-1')).not.toBeNull()
  })
})

describe('CollapsibleSection — expandCollapsibleSectionForRecordKey', () => {
  it('접혀 있는 섹션에 속한 recordKey로 점프 시 자동으로 펼쳐져 하위 DOM이 마운트된다', () => {
    window.localStorage.setItem('papyrus.person-career.collapse.politics', '0')
    renderWithTheme(
      <CollapsibleSection
        storageKey="politics"
        ariaLabel="정당·선거"
        icon={<span>flag</span>}
        title="정당·선거"
        count={2}
      >
        <div id="person-record-partymem-pm-99">당적 내용</div>
      </CollapsibleSection>,
    )

    expect(document.getElementById('person-record-partymem-pm-99')).toBeNull()

    act(() => {
      expandCollapsibleSectionForRecordKey('partymem-pm-99')
    })

    expect(document.getElementById('person-record-partymem-pm-99')).not.toBeNull()
  })
})

describe('CabinetConnections — periodLabel & sortMembers', () => {
  it('기원전(BC) 각료 시작일을 시간순(더 오래된 BC가 먼저)으로 정렬한다', () => {
    const sorted = sortMembers([
      {
        id: 'm-late',
        startDate: '-0100-01-01',
        person: { id: 'p-late', name: '후기 재상' },
      },
      {
        id: 'm-early',
        startDate: '-0221-01-01',
        person: { id: 'p-early', name: '이사' },
      },
    ])
    expect(sorted.map((m) => m.id)).toEqual(['m-early', 'm-late'])
  })

  it('종료일이 비어 있을 때 고인·종료된 행정부·고대/기원전 각료는 "현재" 대신 "미상"으로 표기한다', () => {
    expect(
      periodLabel({
        startDate: '1905-01-01',
        endDate: null,
        person: { isAlive: false },
      }),
    ).toBe('1905–미상')
    expect(
      periodLabel(
        {
          startDate: '2020-01-01',
          endDate: null,
          person: { isAlive: true },
        },
        true,
      ),
    ).toBe('2020–미상')
    expect(
      periodLabel(
        {
          startDate: '2024-01-01',
          endDate: null,
          person: { isAlive: true },
        },
        false,
      ),
    ).toBe('2024–현재')
  })
})
