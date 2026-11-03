import React from 'react'

import '@testing-library/jest-dom'
import { fireEvent, screen, within } from '@testing-library/react'

import type { CountryResponseDto } from '@/shared/api/countries'
import { renderWithTheme } from '@/shared/test/render-with-theme'

import { BasicInfoSection } from './basic-info-section'

jest.mock('@/pages/events/utils/event-create.utils', () => ({
  getImageUrl: (url: string) => url,
}))
jest.mock('@/shared/api/client', () => ({
  getApiConnection: jest.fn(() => ({ host: 'http://localhost:3000' })),
  apiConnection: { host: 'http://localhost:3000' },
}))
jest.mock('@/shared/api/api.service', () => ({
  nestiaApiService: { getConnection: jest.fn(() => ({})) },
  API_BASE_URL: 'http://localhost:3000',
}))
jest.mock('@/shared/api/upload', () => ({
  uploadImage: jest.fn(),
}))
jest.mock('@/shared/api/person-career', () => ({
  personCareerApi: {},
}))
jest.mock('@/shared/api/treaty', () => ({
  treatyApi: {},
}))
jest.mock('@/shared/ui/time-picker-modal/time-picker-modal', () => ({
  TimePickerModal: () => null,
}))
jest.mock('./event-date-field', () => ({
  EventDateField: (props: { ariaLabel: string; value: string }) => (
    <input aria-label={props.ariaLabel} value={props.value} readOnly />
  ),
}))

const COUNTRIES: CountryResponseDto[] = [
  { id: 'c1', name: '프랑스', isoCode: 'FR', flagEmoji: '🇫🇷' } as CountryResponseDto,
  { id: 'c2', name: '영국', isoCode: 'GB', flagEmoji: '🇬🇧' } as CountryResponseDto,
  { id: 'c3', name: '러시아', isoCode: 'RU', flagEmoji: '🇷🇺' } as CountryResponseDto,
  { id: 'c4', name: '미국', isoCode: 'US', flagEmoji: '🇺🇸' } as CountryResponseDto,
  { id: 'c5', name: '이탈리아', isoCode: 'IT', flagEmoji: '🇮🇹' } as CountryResponseDto,
  { id: 'c6', name: '일본', isoCode: 'JP', flagEmoji: '🇯🇵' } as CountryResponseDto,
]

function makeDefaultProps(
  overrides: Partial<React.ComponentProps<typeof BasicInfoSection>> = {},
): React.ComponentProps<typeof BasicInfoSection> {
  return {
    title: '',
    setTitle: jest.fn(),
    description: '',
    setDescription: jest.fn(),
    startDate: '',
    setStartDate: jest.fn(),
    startTime: '',
    setStartTime: jest.fn(),
    endDate: '',
    setEndDate: jest.fn(),
    endTime: '',
    setEndTime: jest.fn(),
    category: '',
    setCategory: jest.fn(),
    thumbnail: '',
    setThumbnail: jest.fn(),
    setThumbnailFile: jest.fn(),
    keywords: [],
    setKeywords: jest.fn(),
    relatedCountries: [],
    setRelatedCountries: jest.fn(),
    availableCountries: COUNTRIES,
    availableHistoricalCountries: [],
    onOpenCountryModal: jest.fn(),
    playClickSound: jest.fn(),
    getDateError: () => null,
    calculateDaysDifference: () => null,
    ...overrides,
  }
}

describe('BasicInfoSection — 펼치기 제거 및 단순·직관적인 참여국 UX', () => {
  it('참여국 목록과 소개 그룹은 펼치기/더보기 버튼 없이 처음부터 전체 항목이 바로 표시된다', () => {
    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          relatedCountries: COUNTRIES.map((country) => ({
            countryId: country.id,
            role: 'PARTICIPANT',
          })),
        })}
      />,
    )

    // 6개 국가가 더보기/펼치기 없이 모두 즉시 노출된다
    expect(screen.getByLabelText('프랑스 역할')).toBeInTheDocument()
    expect(screen.getByLabelText('미국 역할')).toBeInTheDocument()
    expect(screen.getByLabelText('이탈리아 역할')).toBeInTheDocument()
    expect(screen.getByLabelText('일본 역할')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /더보기|목록 접기/ }),
    ).not.toBeInTheDocument()

    // 소개 그룹(개요 설명·키워드·썸네일)도 펼치기 버튼 없이 즉시 노출된다
    expect(
      screen.getByPlaceholderText('무슨 일이 왜 일어났는지 두세 문장으로'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /소개 펼치기|소개 접기/ }),
    ).not.toBeInTheDocument()
  })

  it('참여국 빠른 검색창에서 국가 이름을 입력해 Enter로 즉시 참여국에 추가할 수 있다', () => {
    const setRelatedCountries = jest.fn()
    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({ setRelatedCountries })}
      />,
    )

    const searchInput = screen.getByRole('searchbox', {
      name: '참여국 빠른 검색',
    })
    fireEvent.change(searchInput, { target: { value: '프랑스' } })
    fireEvent.keyDown(searchInput, { key: 'Enter' })

    expect(setRelatedCountries).toHaveBeenCalledWith([
      { countryId: 'c1', role: 'PARTICIPANT' },
    ])
  })

  it('사건명에서 감지된 참여국 추천 칩과 "모두 추가" 버튼으로 원클릭 등록할 수 있다', () => {
    const setRelatedCountries = jest.fn()
    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          title: '영프 협상',
          setRelatedCountries,
        })}
      />,
    )

    expect(
      screen.getByRole('button', { name: '+ 영국' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '+ 프랑스' }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: '사건명 추천 참여국 모두 추가' }),
    )
    expect(setRelatedCountries).toHaveBeenCalledWith([
      { countryId: 'c2', role: 'PARTICIPANT' },
      { countryId: 'c1', role: 'PARTICIPANT' },
    ])
  })

  it('빠른 검색창에서 쉼표(,)로 여러 나라를 한 번에 입력해 Enter로 추가할 수 있다', () => {
    const setRelatedCountries = jest.fn()
    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({ setRelatedCountries })}
      />,
    )

    const searchInput = screen.getByRole('searchbox', {
      name: '참여국 빠른 검색',
    })

    fireEvent.change(searchInput, { target: { value: '영국, 러시아' } })
    fireEvent.keyDown(searchInput, { key: 'Enter' })
    expect(setRelatedCountries).toHaveBeenLastCalledWith([
      { countryId: 'c2', role: 'PARTICIPANT' },
      { countryId: 'c3', role: 'PARTICIPANT' },
    ])
  })

  it('전투·전쟁 등 진영 세부 분야일 때 참여국 행에서 바로 1편·2편을 배정·해제할 수 있다', () => {
    const onAssign = jest.fn()
    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          relatedCountries: [{ countryId: 'c1', role: 'INITIATOR' }],
          participantSidesSlot: {
            assignment: { 'm:c1': 'A' },
            sideNames: ['프랑스 측', '영국 측'],
            onAssign,
          },
        })}
      />,
    )

    const side1Btn = screen.getByRole('button', { name: '프랑스 1편' })
    const side2Btn = screen.getByRole('button', { name: '프랑스 2편' })
    expect(side1Btn).toHaveAttribute('aria-pressed', 'true')
    expect(side2Btn).toHaveAttribute('aria-pressed', 'false')

    // 이미 배정된 1편을 다시 누르면 미배정(null)으로 해제
    fireEvent.click(side1Btn)
    expect(onAssign).toHaveBeenCalledWith('m:c1', null)

    // 2편 클릭 시 'B'로 전환
    fireEvent.click(side2Btn)
    expect(onAssign).toHaveBeenCalledWith('m:c1', 'B')

    // 참여국을 제거하면 진영 배정에서도 함께 해제(null)된다
    fireEvent.click(screen.getByRole('button', { name: '프랑스 제거' }))
    expect(onAssign).toHaveBeenLastCalledWith('m:c1', null)
  })

  it('역사 국가 존속기간 불일치 경고에서 시대에 맞는 국가로 역할·서술·진영을 유지한 채 원클릭 교체할 수 있다', () => {
    const setRelatedCountries = jest.fn()
    const onReplaceKey = jest.fn()
    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          startDate: '1840-06-01',
          endDate: '1842-08-29',
          relatedCountries: [
            {
              historicalCountryId: 'h-ming',
              role: 'TARGET',
              roleDescription: '아편 단속',
            },
          ],
          setRelatedCountries,
          availableHistoricalCountries: [
            {
              id: 'h-ming',
              name: '명나라',
              startYear: 1368,
              endYear: 1644,
            } as never,
            {
              id: 'h-qing',
              name: '청나라',
              startYear: 1636,
              endYear: 1912,
            } as never,
          ],
          participantSidesSlot: {
            assignment: { 'h:h-ming': 'B' },
            sideNames: ['영국 측', '청나라 측'],
            onAssign: jest.fn(),
            onReplaceKey,
          },
        })}
      />,
    )

    const replaceBtn = screen.getByRole('button', {
      name: '청나라(으)로 교체',
    })
    fireEvent.click(replaceBtn)

    expect(setRelatedCountries).toHaveBeenCalledWith([
      {
        historicalCountryId: 'h-qing',
        role: 'TARGET',
        roleDescription: '아편 단속',
      },
    ])
    expect(onReplaceKey).toHaveBeenCalledWith('h:h-ming', 'h:h-qing')
  })

  it('2단 참여국 카드에서 이모지 없는 국가명·역할 선택과 2층 가로 100% 멀티라인 서술 입력칸이 동작한다', () => {
    const setRelatedCountries = jest.fn()
    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          relatedCountries: [{ countryId: 'c1', role: 'PARTICIPANT' }],
          setRelatedCountries,
        })}
      />,
    )

    fireEvent.change(screen.getByLabelText('프랑스 역할'), {
      target: { value: 'INITIATOR' },
    })
    expect(setRelatedCountries).toHaveBeenLastCalledWith([
      { countryId: 'c1', role: 'INITIATOR' },
    ])

    fireEvent.change(screen.getByLabelText('프랑스가 한 일'), {
      target: { value: '베르사유 조약 서명 및 배상금 청구' },
    })
    expect(setRelatedCountries).toHaveBeenLastCalledWith([
      {
        countryId: 'c1',
        role: 'PARTICIPANT',
        roleDescription: '베르사유 조약 서명 및 배상금 청구',
      },
    ])
  })

  it('2개국 참여 시 "역할·순서 맞바꾸기" 버튼으로 두 나라의 순서·역할·진영을 한 번에 맞바꿀 수 있다', () => {
    const setRelatedCountries = jest.fn()
    const onAssign = jest.fn()
    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          relatedCountries: [
            { countryId: 'c1', role: 'INITIATOR', roleDescription: '공격' },
            { countryId: 'c2', role: 'TARGET', roleDescription: '방어' },
          ],
          setRelatedCountries,
          participantSidesSlot: {
            assignment: { 'm:c1': 'A', 'm:c2': 'B' },
            sideNames: ['1진영', '2진영'],
            onAssign,
          },
        })}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: '역할·순서 맞바꾸기' }),
    )
    expect(setRelatedCountries).toHaveBeenCalledWith([
      { countryId: 'c2', role: 'INITIATOR', roleDescription: '방어' },
      { countryId: 'c1', role: 'TARGET', roleDescription: '공격' },
    ])
    expect(onAssign).toHaveBeenCalledWith('m:c1', 'B')
    expect(onAssign).toHaveBeenCalledWith('m:c2', 'A')
  })

  it('빠른 검색창에 양자 약칭("영프")을 입력해 Enter 한 번으로 두 나라를 동시 추가할 수 있다', () => {
    const setRelatedCountries = jest.fn()
    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({ setRelatedCountries })}
      />,
    )

    const searchInput = screen.getByRole('searchbox', {
      name: '참여국 빠른 검색',
    })
    fireEvent.change(searchInput, { target: { value: '영프' } })
    fireEvent.keyDown(searchInput, { key: 'Enter' })

    expect(setRelatedCountries).toHaveBeenCalledWith([
      { countryId: 'c2', role: 'PARTICIPANT' },
      { countryId: 'c1', role: 'PARTICIPANT' },
    ])
  })

  it('사건명에서 분류·기간(연도)·참여국이 함께 감지되면 "한 번에 채우기"로 원클릭 동시 반영할 수 있다', () => {
    const onApplyType = jest.fn()
    const setStartDate = jest.fn()
    const setEndDate = jest.fn()
    const setStartDatePrecision = jest.fn()
    const setEndDatePrecision = jest.fn()
    const setRelatedCountries = jest.fn()

    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          title: '1904년 영프 협상',
          setStartDate,
          setEndDate,
          setStartDatePrecision,
          setEndDatePrecision,
          setRelatedCountries,
          titleSuggestionSlot: {
            label: '외교 › 조약·협정·가입',
            onApply: onApplyType,
          },
        })}
      />,
    )

    expect(
      screen.getByRole('button', { name: '추천 기간 적용: 1904년' }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: '사건명 추천 모두 적용' }),
    )

    expect(onApplyType).toHaveBeenCalledTimes(1)
    expect(setStartDate).toHaveBeenCalledWith('1904-01-01')
    expect(setEndDate).toHaveBeenCalledWith('1904-01-01')
    expect(setStartDatePrecision).toHaveBeenCalledWith('year')
    expect(setEndDatePrecision).toHaveBeenCalledWith('year')
    expect(setRelatedCountries).toHaveBeenCalledWith([
      { countryId: 'c2', role: 'PARTICIPANT' },
      { countryId: 'c1', role: 'PARTICIPANT' },
    ])
  })

  it('연관 사건 빠른 검색창에서 사건을 Enter로 추가하고, 통합 관계 셀렉트·관계 설명 입력·방금 등록한 사건/동시대 추천 칩이 동작한다', () => {
    const onChange = jest.fn()
    const onQueryChange = jest.fn()

    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          parentEventSlot: {
            parent: null,
            onOpenPicker: jest.fn(),
            onClear: jest.fn(),
          },
          relatedEventsSlot: {
            items: [
              {
                relatedEventId: 'evt-prev',
                title: '사라예보 사건',
                startYear: 1914,
                relationType: 'LED_TO',
                direction: 'incoming',
                description: '',
              },
            ],
            onChange,
            onOpenPicker: jest.fn(),
            quickSearch: {
              query: '마른',
              onQueryChange,
              candidates: [
                {
                  id: 'evt-marne',
                  title: '마른 전투',
                  dateLabel: '1914',
                  startYear: 1914,
                },
              ],
            },
            contemporarySuggestions: [
              {
                id: 'evt-tannenberg',
                title: '탄넨베르크 전투',
                dateLabel: '1914',
                startYear: 1914,
              },
            ],
            lastSavedEvent: {
              id: 'evt-jul',
              title: '7월 위기',
              startYear: 1914,
            },
            currentStartYear: 1914,
          },
        })}
      />,
    )

    // 1. 빠른 검색창에서 Enter로 첫 후보 즉시 추가
    const quickInput = screen.getByRole('searchbox', {
      name: '연관 사건 빠른 검색',
    })
    fireEvent.keyDown(quickInput, { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ relatedEventId: 'evt-prev' }),
      expect.objectContaining({
        relatedEventId: 'evt-marne',
        title: '마른 전투',
        relationType: 'LED_TO',
        direction: 'incoming',
      }),
    ])

    // 2. 방금 등록한 사건 원클릭 계기 연결 칩
    fireEvent.click(
      screen.getByRole('button', {
        name: /\+ 방금 등록한.*7월 위기.*계기 사건으로 연결/,
      }),
    )
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ relatedEventId: 'evt-prev' }),
      expect.objectContaining({
        relatedEventId: 'evt-jul',
        title: '7월 위기',
        relationType: 'LED_TO',
        direction: 'incoming',
      }),
    ])

    // 3. 동시대 사건 원클릭 추천 칩
    fireEvent.click(
      screen.getByRole('button', { name: '+ 탄넨베르크 전투 (1914)' }),
    )
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ relatedEventId: 'evt-prev' }),
      expect.objectContaining({
        relatedEventId: 'evt-tannenberg',
        title: '탄넨베르크 전투',
      }),
    ])

    // 4. 통합 관계 방향 셀렉트 변경 (LED_TO:incoming -> LED_TO:outgoing)
    fireEvent.change(screen.getByLabelText('사라예보 사건 관계 역할'), {
      target: { value: 'LED_TO:outgoing' },
    })
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        relatedEventId: 'evt-prev',
        relationType: 'LED_TO',
        direction: 'outgoing',
      }),
    ])

    // 5. 관계 설명 1줄 입력
    fireEvent.change(screen.getByLabelText('사라예보 사건 관계 설명'), {
      target: { value: '오스트리아-헝가리의 선전포고 촉발' },
    })
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        relatedEventId: 'evt-prev',
        description: '오스트리아-헝가리의 선전포고 촉발',
      }),
    ])

    // 6. 연관 사건 연결 해제
    fireEvent.click(
      screen.getByRole('button', { name: '사라예보 사건 연관 해제' }),
    )
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('사건명 입력 중 등록된 유사 사건 안내 바에서 원클릭으로 상위 사건 지정 및 연관 사건 추가를 실행할 수 있다', () => {
    const onSelectAsParent = jest.fn()
    const onAddAsRelated = jest.fn()

    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          title: '제1차 세계 대전',
          similarEventsSlot: {
            candidates: [
              {
                id: 'evt-ww1',
                title: '제1차 세계 대전 (유럽 전선)',
                dateLabel: '1914',
                startYear: 1914,
                kind: 'COLLECTION',
              },
            ],
            onSelectAsParent,
            onAddAsRelated,
          },
        })}
      />,
    )

    expect(
      screen.getByRole('region', { name: '유사·중복 사건 안내' }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: "'제1차 세계 대전 (유럽 전선)' 상위 사건으로 지정",
      }),
    )
    expect(onSelectAsParent).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'evt-ww1' }),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: "'제1차 세계 대전 (유럽 전선)' 연관 사건으로 추가",
      }),
    )
    expect(onAddAsRelated).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'evt-ww1' }),
    )
  })

  it('등록 흐름에 맞춰 기본 정보(사건명→기간→분야→세부 분야·단위→개요 설명) → 참여 주체·기록 → 맥락·부가 정보 3섹션 순으로 배치한다', () => {
    const { container } = renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          category: 'MILITARY',
          typeSlot: <div data-testid="type-slot-body">전투·작전</div>,
          kindSlot: {
            value: 'SINGLE',
            onChange: jest.fn(),
          },
          recordsSlot: {
            title: '전투·작전 기록',
            content: <div data-testid="records-slot-body">진영 보드</div>,
          },
        })}
      />,
    )

    const sections = Array.from(
      container.querySelectorAll<HTMLElement>(
        'section[id^="event-form-group-"]',
      ),
    )
    expect(sections.map((section) => section.id)).toEqual([
      'event-form-group-basic',
      'event-form-group-participants',
      'event-form-group-context',
    ])

    const basicSection = sections[0]
    expect(within(basicSection).getByText('기본 정보')).toBeInTheDocument()
    expect(
      within(basicSection).getByPlaceholderText(
        '무슨 일이 왜 일어났는지 두세 문장으로',
      ),
    ).toBeInTheDocument()
    expect(
      within(basicSection).getByRole('radiogroup', { name: '사건 종류' }),
    ).toBeInTheDocument()

    const participantsSection = sections[1]
    expect(
      within(participantsSection).getByText('참여 주체 · 전투·작전 기록'),
    ).toBeInTheDocument()
    expect(
      within(participantsSection).getByTestId('records-slot-body'),
    ).toBeInTheDocument()

    const contextSection = sections[2]
    expect(
      within(contextSection).getByText('맥락 · 부가 정보'),
    ).toBeInTheDocument()
  })

  it('키워드 입력창에서 Enter·쉼표(,)·포커스 해제로 칩을 추가하고, 부분 문자열 키워드를 보존하며 칩 삭제 시 입력창에 덤프하지 않는다', () => {
    const setKeywords = jest.fn()
    const { rerender } = renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          keywords: ['대전'],
          setKeywords,
        })}
      />,
    )

    const keywordInput = screen.getByLabelText('키워드 입력') as HTMLInputElement
    // 초기 하이드레이션/렌더 시 기존 칩이 입력창에 덤프되지 않고 빈 상태를 유지한다
    expect(keywordInput.value).toBe('')

    // '세계 대전' 입력 후 쉼표(,) 키를 누르면 기존 짧은 키워드('대전')가 지워지지 않고 함께 유지된다
    fireEvent.change(keywordInput, { target: { value: '세계 대전' } })
    fireEvent.keyDown(keywordInput, { key: ',' })
    expect(setKeywords).toHaveBeenLastCalledWith(['대전', '세계 대전'])
    expect(keywordInput.value).toBe('')

    // 포커스 해제(blur) 시에도 입력 중이던 키워드가 자동 칩으로 확정된다
    fireEvent.change(keywordInput, { target: { value: '총동원령' } })
    fireEvent.blur(keywordInput)
    expect(setKeywords).toHaveBeenLastCalledWith(['대전', '총동원령'])
    expect(keywordInput.value).toBe('')

    // 칩이 여러 개일 때 하나를 삭제해도 나머지 키워드가 텍스트 입력창에 덤프되지 않는다
    rerender(
      <BasicInfoSection
        {...makeDefaultProps({
          keywords: ['대전', '세계 대전'],
          setKeywords,
        })}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '세계 대전 제거' }))
    expect(setKeywords).toHaveBeenLastCalledWith(['대전'])
    expect(keywordInput.value).toBe('')

    // 빈 입력창에서 Backspace를 누르면 마지막 키워드 칩이 제거된다
    fireEvent.keyDown(keywordInput, { key: 'Backspace' })
    expect(setKeywords).toHaveBeenLastCalledWith(['대전'])
  })

  it('상위 사건 미선택 시 인라인 빠른 검색창에서 묶음 사건을 Enter 또는 클릭으로 즉시 선택할 수 있다', () => {
    const onSelectCandidate = jest.fn()
    const onQueryChange = jest.fn()

    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          parentEventSlot: {
            parent: null,
            onOpenPicker: jest.fn(),
            onClear: jest.fn(),
            quickSearch: {
              query: '세계 대전',
              onQueryChange,
              candidates: [
                {
                  id: 'evt-ww1',
                  title: '제1차 세계 대전',
                  dateLabel: '1914 ~ 1918',
                  startYear: 1914,
                },
              ],
              onSelectCandidate,
            },
          },
        })}
      />,
    )

    const parentSearchInput = screen.getByRole('searchbox', {
      name: '상위 사건 빠른 검색',
    })
    fireEvent.keyDown(parentSearchInput, { key: 'Enter' })

    expect(onSelectCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'evt-ww1',
        title: '제1차 세계 대전',
      }),
    )
  })

  it('인라인 빠른 검색창에서 외부로 포커스가 벗어나면 결과 드롭다운이 닫히고, 다시 포커스하면 열린다', () => {
    renderWithTheme(<BasicInfoSection {...makeDefaultProps()} />)

    const searchInput = screen.getByRole('searchbox', {
      name: '참여국 빠른 검색',
    })
    fireEvent.change(searchInput, { target: { value: '프랑스' } })
    expect(
      screen.getByRole('region', { name: '참여국 빠른 검색 결과' }),
    ).toBeInTheDocument()

    fireEvent.blur(searchInput, { relatedTarget: document.body })
    expect(
      screen.queryByRole('region', { name: '참여국 빠른 검색 결과' }),
    ).not.toBeInTheDocument()

    fireEvent.focus(searchInput)
    expect(
      screen.getByRole('region', { name: '참여국 빠른 검색 결과' }),
    ).toBeInTheDocument()
  })

  it('키워드 등록 시 개수 카운터(N/20)를 표시하고 2개 이상일 때 모두 지우기 버튼으로 한 번에 비울 수 있다', () => {
    const setKeywords = jest.fn()
    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          keywords: ['베르사유', '강화조약'],
          setKeywords,
        })}
      />,
    )

    expect(screen.getByText('(2/20)')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '키워드 모두 지우기' }))
    expect(setKeywords).toHaveBeenCalledWith([])
  })
})
