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
      screen.getByPlaceholderText('사건의 개요 설명을 입력하세요.'),
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

  it('참여국 평면 원장 행에서 국가명·역할 선택과 한 일 서술 입력칸이 한 줄 흐름으로 동작한다', () => {
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

    // 5. 관계 설명 1줄 입력 ('+ 설명 메모' 토글로 펼친 뒤 입력)
    fireEvent.click(
      screen.getByRole('button', {
        name: '사라예보 사건 관계 설명 입력 열기',
      }),
    )
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
        '사건의 개요 설명을 입력하세요.',
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

  it('시작일과 종료일이 같은 날이면 기간 배지에 "0일" 대신 "당일"을 표시하고, 종료일 빠른 버튼으로 시작일과 같게 맞추거나 비울 수 있다', () => {
    const setEndDate = jest.fn()
    const setEndTime = jest.fn()
    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          startDate: '1919-03-01',
          endDate: '1919-03-01',
          setEndDate,
          setEndTime,
          calculateDaysDifference: () => 0,
        })}
      />,
    )

    expect(screen.getByText('당일')).toBeInTheDocument()
    expect(screen.queryByText('0일')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '종료일 비우기' }))
    expect(setEndDate).toHaveBeenCalledWith('')
    expect(setEndTime).toHaveBeenCalledWith('')
  })

  it('종료일이 시작일과 다를 때 "시작일과 같게" 버튼을 누르면 종료일이 시작일로 맞춰진다', () => {
    const setEndDate = jest.fn()
    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          startDate: '1919-03-01',
          endDate: '1919-04-11',
          setEndDate,
          calculateDaysDifference: () => 41,
        })}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: '종료일을 시작일과 같게 설정' }),
    )
    expect(setEndDate).toHaveBeenCalledWith('1919-03-01')
  })

  it('위치 슬롯(locationSlot)이 주어지면 장소 이름 입력, 지도 핀 열기, 좌표 배지 표시 및 비우기 동작을 지원한다', () => {
    const setLocation = jest.fn()
    const onClearCoordinates = jest.fn()
    const onOpenMapModal = jest.fn()

    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          locationSlot: {
            location: '베르사유 궁전',
            setLocation,
            latitude: 48.8049,
            longitude: 2.1204,
            onClearCoordinates,
            onOpenMapModal,
          },
        })}
      />,
    )

    const locationInput = screen.getByLabelText('위치 이름') as HTMLInputElement
    expect(locationInput.value).toBe('베르사유 궁전')

    fireEvent.change(locationInput, { target: { value: '베르사유 궁전 거울의 방' } })
    expect(setLocation).toHaveBeenCalledWith('베르사유 궁전 거울의 방')

    // 좌표 배지가 표시되고 '지도 핀 수정' 버튼으로 모달을 열 수 있다
    expect(screen.getByLabelText('선택된 지도 좌표')).toHaveTextContent(
      '북위 48.8049°, 동경 2.1204°',
    )
    fireEvent.click(screen.getByRole('button', { name: '지도 핀 수정' }))
    expect(onOpenMapModal).toHaveBeenCalledTimes(1)

    // 핀 지우기 클릭 시 좌표만 초기화한다
    fireEvent.click(screen.getByRole('button', { name: '지도 핀 지우기' }))
    expect(onClearCoordinates).toHaveBeenCalledTimes(1)

    // 비우기 클릭 시 이름과 좌표를 모두 초기화한다
    fireEvent.click(screen.getByRole('button', { name: '위치 비우기' }))
    expect(setLocation).toHaveBeenLastCalledWith('')
    expect(onClearCoordinates).toHaveBeenCalledTimes(2)
  })

  it('위치 입력칸에서 인라인 장소 검색 후보를 고르면 장소명과 좌표가 함께 설정되고, 위치 메모를 수정·비울 수 있다', () => {
    const setLocation = jest.fn()
    const setLocationNote = jest.fn()
    const onSelectCoordinates = jest.fn()

    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          locationSlot: {
            location: '베르사유',
            setLocation,
            latitude: null,
            longitude: null,
            locationNote: '현 프랑스 일드프랑스',
            setLocationNote,
            onSelectCoordinates,
            onOpenMapModal: jest.fn(),
            quickSearch: {
              candidates: [
                {
                  placeId: 'p1',
                  shortName: '베르사유 궁전',
                  displayName: '프랑스 일드프랑스 베르사유 궁전',
                  lat: 48.8049,
                  lng: 2.1204,
                },
              ],
              isSearching: false,
            },
          },
        })}
      />,
    )

    const locationInput = screen.getByLabelText('위치 이름')
    fireEvent.focus(locationInput)

    // 인라인 빠른 검색 드롭다운에서 첫 번째 장소 선택
    expect(
      screen.getByRole('region', { name: '위치 빠른 검색 결과' }),
    ).toBeInTheDocument()
    fireEvent.keyDown(locationInput, { key: 'Enter' })

    expect(setLocation).toHaveBeenCalledWith('베르사유 궁전')
    expect(onSelectCoordinates).toHaveBeenCalledWith(48.8049, 2.1204)

    // 위치 메모 수정 및 비우기
    const noteInput = screen.getByLabelText('위치 메모') as HTMLInputElement
    expect(noteInput.value).toBe('현 프랑스 일드프랑스')
    fireEvent.change(noteInput, { target: { value: '거울의 방' } })
    expect(setLocationNote).toHaveBeenCalledWith('거울의 방')

    fireEvent.click(screen.getByRole('button', { name: '위치 메모 비우기' }))
    expect(setLocationNote).toHaveBeenLastCalledWith('')
  })

  it('사건명에서 지명 후보가 감지되면 "추천 위치 적용" 및 "한 번에 채우기"로 위치를 자동 반영한다', () => {
    const setLocation = jest.fn()
    const setStartDate = jest.fn()

    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          title: '1919년 베르사유 조약',
          setStartDate,
          locationSlot: {
            location: '',
            setLocation,
            onOpenMapModal: jest.fn(),
          },
        })}
      />,
    )

    expect(
      screen.getByRole('button', { name: '추천 위치 적용: 베르사유' }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: '사건명 추천 모두 적용' }),
    )
    expect(setStartDate).toHaveBeenCalledWith('1919-01-01')
    expect(setLocation).toHaveBeenCalledWith('베르사유')
  })

  it('등록 폼 위치 영역에서 + 메모 열기, 이름·메모 자동 나누기, 상위 사건 위치 불러오기, 최근 위치 칩 선택을 지원한다', () => {
    const setLocation = jest.fn()
    const setLocationNote = jest.fn()
    const onSelectCoordinates = jest.fn()

    const { rerender } = renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          locationSlot: {
            location: '',
            setLocation,
            latitude: null,
            longitude: null,
            locationNote: '',
            setLocationNote,
            onSelectCoordinates,
            onOpenMapModal: jest.fn(),
            parentLocation: {
              parentTitle: '나폴레옹 전쟁',
              location: '워털루',
              latitude: 50.7147,
              longitude: 4.3991,
              note: '벨기에 브라방왈롱',
            },
            recentLocations: [
              {
                location: '베르사유 궁전',
                latitude: 48.8049,
                longitude: 2.1204,
                note: '거울의 방',
              },
            ],
          },
        })}
      />,
    )

    // 1. 상위 사건 위치 불러오기
    fireEvent.click(
      screen.getByRole('button', { name: '상위 사건 위치 불러오기' }),
    )
    expect(setLocation).toHaveBeenCalledWith('워털루')
    expect(onSelectCoordinates).toHaveBeenCalledWith(50.7147, 4.3991)
    expect(setLocationNote).toHaveBeenCalledWith('벨기에 브라방왈롱')

    // 2. 최근 위치 칩 선택
    fireEvent.click(screen.getByRole('button', { name: '+ 베르사유 궁전' }))
    expect(setLocation).toHaveBeenLastCalledWith('베르사유 궁전')
    expect(onSelectCoordinates).toHaveBeenLastCalledWith(48.8049, 2.1204)
    expect(setLocationNote).toHaveBeenLastCalledWith('거울의 방')

    // 3. 복합 지명이 입력된 상태에서 이름·메모 자동 나누기
    rerender(
      <BasicInfoSection
        {...makeDefaultProps({
          locationSlot: {
            location: '콘스탄티노폴리스 (현 튀르키예 이스탄불)',
            setLocation,
            locationNote: '',
            setLocationNote,
            onOpenMapModal: jest.fn(),
          },
        })}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: '위치 이름과 메모 자동 나누기' }),
    )
    expect(setLocation).toHaveBeenLastCalledWith('콘스탄티노폴리스')
    expect(setLocationNote).toHaveBeenLastCalledWith('현 튀르키예 이스탄불')
  })

  it('사건명에 연·월·일 전체 날짜가 있으면 추천 기간 적용 시 정밀도(day)까지 함께 맞춘다', () => {
    const setStartDate = jest.fn()
    const setEndDate = jest.fn()
    const setStartDatePrecision = jest.fn()
    const setEndDatePrecision = jest.fn()

    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          title: '1919년 3월 1일 3·1 운동',
          setStartDate,
          setEndDate,
          setStartDatePrecision,
          setEndDatePrecision,
        })}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: '추천 기간 적용: 1919년 3월 1일' }),
    )
    expect(setStartDate).toHaveBeenCalledWith('1919-03-01')
    expect(setEndDate).toHaveBeenCalledWith('1919-03-01')
    expect(setStartDatePrecision).toHaveBeenCalledWith('day')
    expect(setEndDatePrecision).toHaveBeenCalledWith('day')
  })

  it('참여국 역할순 정렬 버튼, 한 일 빠른 프리셋 칩, 시대별 추천 참여국 칩이 동작한다', () => {
    const setRelatedCountries = jest.fn()

    const { rerender } = renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          startDate: '1592-04-13',
          availableHistoricalCountries: [
            {
              id: 'h-joseon',
              name: '조선',
              startYear: 1392,
              endYear: 1897,
            } as never,
          ],
          setRelatedCountries,
        })}
      />,
    )

    // 1. 참여국이 비어 있고 시작 연도가 있으면 시대 추천 칩 노출
    const eraBar = screen.getByLabelText('시대별 추천 참여국')
    fireEvent.click(within(eraBar).getByRole('button', { name: '+ 조선' }))
    expect(setRelatedCountries).toHaveBeenCalledWith([
      { historicalCountryId: 'h-joseon', role: 'PARTICIPANT' },
    ])

    // 2. 참여국이 역할 우선순위와 다르게 담긴 경우 '역할순 정렬'과 '한 일 빠른 입력' 프리셋 제공
    rerender(
      <BasicInfoSection
        {...makeDefaultProps({
          roleDescriptionPlaceholder: '참전 방식·지휘·병력 등 (선택)',
          relatedCountries: [
            { countryId: 'c3', role: 'PARTICIPANT' },
            { countryId: 'c1', role: 'INITIATOR' },
            { countryId: 'c2', role: 'TARGET' },
          ],
          setRelatedCountries,
        })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '참여국 역할순 정렬' }))
    expect(setRelatedCountries).toHaveBeenLastCalledWith([
      { countryId: 'c1', role: 'INITIATOR' },
      { countryId: 'c2', role: 'TARGET' },
      { countryId: 'c3', role: 'PARTICIPANT' },
    ])

    // 한 일 입력칸 포커스 시 빠른 프리셋 칩 노출 및 클릭 시 즉시 입력
    const roleDescInput = screen.getByLabelText('프랑스가 한 일')
    fireEvent.focus(roleDescInput)
    const presetGroup = screen.getByRole('group', {
      name: '프랑스 한 일 빠른 입력',
    })
    fireEvent.click(
      within(presetGroup).getByRole('button', { name: '+ 선제 공격' }),
    )
    expect(setRelatedCountries).toHaveBeenLastCalledWith([
      { countryId: 'c3', role: 'PARTICIPANT' },
      { countryId: 'c1', role: 'INITIATOR', roleDescription: '선제 공격' },
      { countryId: 'c2', role: 'TARGET' },
    ])
  })

  it('상위 사건 기간이 주어지면 시작일 원클릭 적용과 기간 벗어남 소프트 경고를 제공하고, 맥락 기반 추천 키워드를 추가할 수 있다', () => {
    const setStartDate = jest.fn()
    const setEndDate = jest.fn()
    const setKeywords = jest.fn()

    const { rerender } = renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          title: '1916년 베르됭 전투',
          setStartDate,
          setEndDate,
          setKeywords,
          relatedCountries: [{ countryId: 'c1', role: 'PARTICIPANT' }],
          parentEventSlot: {
            parent: { id: 'evt-ww1', title: '제1차 세계 대전' },
            parentPeriod: {
              startDate: '1914-07-28',
              endDate: '1918-11-11',
            },
            onOpenPicker: jest.fn(),
            onClear: jest.fn(),
          },
        })}
      />,
    )

    // 1. 시작일이 비어 있을 때 '상위 사건 시작일 적용' 버튼 노출
    fireEvent.click(
      screen.getByRole('button', { name: '상위 사건 시작일 적용' }),
    )
    expect(setStartDate).toHaveBeenCalledWith('1914-07-28')
    expect(setEndDate).toHaveBeenCalledWith('1914-07-28')

    // 2. 맥락 기반 추천 키워드 바 노출 및 '모두 추가'
    const keywordBar = screen.getByLabelText('추천 키워드')
    expect(
      within(keywordBar).getByRole('button', { name: '+ 베르됭 전투' }),
    ).toBeInTheDocument()
    expect(
      within(keywordBar).getByRole('button', { name: '+ 프랑스' }),
    ).toBeInTheDocument()
    fireEvent.click(
      within(keywordBar).getByRole('button', { name: '추천 키워드 모두 추가' }),
    )
    expect(setKeywords).toHaveBeenCalledWith(
      expect.arrayContaining(['베르됭 전투', '프랑스', '제1차 세계 대전']),
    )

    // 3. 하위 사건 연도가 상위 사건 기간 밖이면 소프트 경고 노출
    rerender(
      <BasicInfoSection
        {...makeDefaultProps({
          title: '전후 조약',
          startDate: '1920-01-10',
          endDate: '1920-01-10',
          parentEventSlot: {
            parent: { id: 'evt-ww1', title: '제1차 세계 대전' },
            parentPeriod: {
              startDate: '1914-07-28',
              endDate: '1918-11-11',
            },
            onOpenPicker: jest.fn(),
            onClear: jest.fn(),
          },
        })}
      />,
    )

    expect(
      screen.getByText(/상위 사건 ‘제1차 세계 대전’의 종료 연도\(1918년\)보다 뒤입니다/),
    ).toBeInTheDocument()
  })

  it('layoutMode="split"일 때 좌측(기본 정보 + 맥락·부가 정보)과 우측(참여 주체 · 기록) 2단 워크스페이스로 분할 렌더되고, 우측 빠른 열기 칩과 주체 요약 배지가 동작한다', () => {
    const onQuickSelect = jest.fn()
    const { rerender } = renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          layoutMode: 'split',
          quickRecordTypesSlot: {
            label: '자주 쓰는 기록 열기',
            items: [
              { key: 'REVOLUTION', label: '혁명·쿠데타·봉기' },
              { key: 'WAR', label: '전쟁·전역' },
            ],
            onSelect: onQuickSelect,
          },
        })}
      />,
    )

    const leftPane = screen.getByTestId('event-form-split-left')
    const rightPane = screen.getByTestId('event-form-split-right')

    expect(within(leftPane).getByText('기본 정보')).toBeInTheDocument()
    expect(within(leftPane).getByText('맥락 · 부가 정보')).toBeInTheDocument()
    expect(within(rightPane).getByText('참여 주체')).toBeInTheDocument()
    expect(
      within(rightPane).getByRole('note', { name: '세부 분야 맞춤 기록 안내' }),
    ).toBeInTheDocument()

    // 우측 패널에서 마우스 이동 없이 세부 분야를 원클릭으로 열 수 있다
    fireEvent.click(
      within(rightPane).getByRole('button', { name: '+ 혁명·쿠데타·봉기' }),
    )
    expect(onQuickSelect).toHaveBeenCalledWith('REVOLUTION')

    // 세부 분야 기록(recordsSlot)이 주어지면 안내 박스 대신 실제 기록 슬롯과 주체 요약 배지가 우측 패널에 표시된다
    rerender(
      <BasicInfoSection
        {...makeDefaultProps({
          layoutMode: 'split',
          relatedCountries: [{ countryId: 'c1', role: 'INITIATOR' }],
          recordsSlot: {
            title: '혁명·쿠데타·봉기 기록',
            summary: '진영 2 · 기관 1 · 인물 3',
            content: <div data-testid="split-records-content">진영 보드 본체</div>,
          },
        })}
      />,
    )

    expect(
      within(screen.getByTestId('event-form-split-right')).getByTestId(
        'split-records-content',
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('참여 주체 요약')).toHaveTextContent(
      '국가 1 · 진영 2 · 기관 1 · 인물 3',
    )
    expect(
      screen.queryByRole('note', { name: '세부 분야 맞춤 기록 안내' }),
    ).not.toBeInTheDocument()

    // 좌우 패널 비율 조절 토글(좌측 넓게 / 5:5 / 우측 넓게) 동작 확인
    const splitGrid = screen.getByTestId('event-form-split-grid')
    expect(splitGrid).toHaveAttribute('data-split-ratio', 'equal')

    const ratioGroup = screen.getByRole('group', {
      name: '좌우 패널 비율 조절',
    })
    fireEvent.click(within(ratioGroup).getByRole('button', { name: '좌측 넓게' }))
    expect(splitGrid).toHaveAttribute('data-split-ratio', 'left-wide')

    fireEvent.click(within(ratioGroup).getByRole('button', { name: '우측 넓게' }))
    expect(splitGrid).toHaveAttribute('data-split-ratio', 'right-wide')
  })

  it('참여국 2단 카드에서 빠른 역할 칩 클릭 시 역할 변경 및 진영 자동 배정이 이루어지고, 추천 어구 이어붙이기·비우기가 동작한다', () => {
    const setRelatedCountries = jest.fn()
    const onAssignSide = jest.fn()

    const { rerender } = renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          roleDescriptionPlaceholder: '참전 규모·주력 부대·전과 등 (선택)',
          relatedCountries: [{ countryId: 'c1', role: 'PARTICIPANT' }],
          setRelatedCountries,
          participantSidesSlot: {
            assignment: {},
            sideNames: ['1진영', '2진영'],
            onAssign: onAssignSide,
          },
        })}
      />,
    )

    // 1. 드롭다운을 열지 않고 빠른 역할 칩('주도') 원클릭 → 역할 'INITIATOR' + 미배정 진영 'A'(1편) 자동 배정
    fireEvent.click(
      screen.getByRole('button', { name: '프랑스 역할 주도 선택' }),
    )
    expect(setRelatedCountries).toHaveBeenLastCalledWith([
      { countryId: 'c1', role: 'INITIATOR' },
    ])
    expect(onAssignSide).toHaveBeenCalledWith('m:c1', 'A')

    // 2. 이미 한 일이 입력된 상태에서 포커스 후 다른 추천 어구를 누르면 덮어쓰지 않고 이어붙임
    rerender(
      <BasicInfoSection
        {...makeDefaultProps({
          roleDescriptionPlaceholder: '참전 규모·주력 부대·전과 등 (선택)',
          relatedCountries: [
            {
              countryId: 'c1',
              role: 'INITIATOR',
              roleDescription: '선제 공격',
            },
          ],
          setRelatedCountries,
        })}
      />,
    )

    const descInput = screen.getByLabelText('프랑스가 한 일')
    fireEvent.focus(descInput)
    const presetBar = screen.getByRole('group', {
      name: '프랑스 한 일 빠른 입력',
    })
    fireEvent.click(
      within(presetBar).getByRole('button', { name: '+ 작전 주도' }),
    )
    expect(setRelatedCountries).toHaveBeenLastCalledWith([
      {
        countryId: 'c1',
        role: 'INITIATOR',
        roleDescription: '선제 공격, 작전 주도',
      },
    ])

    // 3. 한 일 비우기 버튼 클릭 시 설명 초기화
    fireEvent.click(screen.getByRole('button', { name: '프랑스 한 일 비우기' }))
    expect(setRelatedCountries).toHaveBeenLastCalledWith([
      {
        countryId: 'c1',
        role: 'INITIATOR',
        roleDescription: '',
      },
    ])
  })

  it('상위 사건 선택 카드(ParentEventCard)에서 시작일·참여국·위치를 원클릭으로 이어받을 수 있다', () => {
    const setStartDate = jest.fn()
    const setEndDate = jest.fn()
    const onImportCountries = jest.fn()
    const setLocation = jest.fn()

    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          startDate: '',
          endDate: '',
          setStartDate,
          setEndDate,
          parentEventSlot: {
            parent: { id: 'evt-ww1', title: '제1차 세계 대전' },
            parentPeriod: {
              startDate: '1914-07-28',
              endDate: '1918-11-11',
            },
            onOpenPicker: jest.fn(),
            onClear: jest.fn(),
          },
          parentCountriesSlot: {
            count: 3,
            parentTitle: '제1차 세계 대전',
            onImport: onImportCountries,
          },
          locationSlot: {
            location: '',
            setLocation,
            latitude: null,
            longitude: null,
            onOpenMapModal: jest.fn(),
            parentLocation: {
              parentTitle: '제1차 세계 대전',
              location: '서부 전선',
              latitude: null,
              longitude: null,
              note: null,
            },
          },
        })}
      />,
    )

    const parentCard = screen.getByRole('group', { name: '선택된 상위 사건' })
    expect(
      within(parentCard).getByText('1914-07-28 ~ 1918-11-11'),
    ).toBeInTheDocument()

    fireEvent.click(
      within(parentCard).getByRole('button', {
        name: '상위 사건 카드에서 시작일 이어받기',
      }),
    )
    expect(setStartDate).toHaveBeenCalledWith('1914-07-28')

    fireEvent.click(
      within(parentCard).getByRole('button', {
        name: '상위 사건 카드에서 참여국 이어받기',
      }),
    )
    expect(onImportCountries).toHaveBeenCalledTimes(1)

    fireEvent.click(
      within(parentCard).getByRole('button', {
        name: '상위 사건 카드에서 위치 이어받기',
      }),
    )
    expect(setLocation).toHaveBeenCalledWith('서부 전선')
  })

  it('개요 설명 입력 시 글자 수 카운터와 원클릭 비우기 버튼을 노출하고 긴 텍스트에 맞춰 줄 수를 자동 확장한다', () => {
    const setDescription = jest.fn()
    const longDesc = '첫째 줄\n둘째 줄\n셋째 줄\n넷째 줄\n다섯째 줄\n여섯째 줄'
    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          description: longDesc,
          setDescription,
        })}
      />,
    )

    const textarea = screen.getByPlaceholderText('사건의 개요 설명을 입력하세요.')
    expect(Number(textarea.getAttribute('rows'))).toBeGreaterThanOrEqual(6)
    expect(screen.getByLabelText('개요 설명 글자 수')).toHaveTextContent(
      `${longDesc.length}자`,
    )

    fireEvent.click(
      screen.getByRole('button', { name: '개요 설명 비우기' }),
    )
    expect(setDescription).toHaveBeenCalledWith('')
  })

  it('첫 참여국 추가 후에도 남은 시대별 추천 참여국 칩이 유지되고, 연관 사건 관계 설명의 비우기 버튼이 동작한다', () => {
    const setRelatedCountries = jest.fn()
    const onChangeRelatedEvents = jest.fn()

    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          startDate: '1592-04-13',
          relatedCountries: [
            { historicalCountryId: 'h-joseon', role: 'TARGET' },
          ],
          availableHistoricalCountries: [
            {
              id: 'h-joseon',
              name: '조선',
              startYear: 1392,
              endYear: 1897,
            } as never,
            {
              id: 'h-ming',
              name: '명나라',
              startYear: 1368,
              endYear: 1644,
            } as never,
          ],
          setRelatedCountries,
          relatedEventsSlot: {
            items: [
              {
                relatedEventId: 'evt-prev',
                title: '도요토미 히데요시의 일본 통일',
                relationType: 'LED_TO',
                direction: 'incoming',
                description: '대륙 침략 준비 완료',
              },
            ],
            onChange: onChangeRelatedEvents,
            onOpenPicker: jest.fn(),
          },
        })}
      />,
    )

    // 이미 추가된 '조선'을 제외하고 남은 시대 추천 국가('명나라') 칩이 계속 노출된다
    const eraBar = screen.getByLabelText('시대별 추천 참여국')
    expect(
      within(eraBar).queryByRole('button', { name: '+ 조선' }),
    ).not.toBeInTheDocument()
    fireEvent.click(within(eraBar).getByRole('button', { name: '+ 명나라' }))
    expect(setRelatedCountries).toHaveBeenCalledWith([
      { historicalCountryId: 'h-joseon', role: 'TARGET' },
      { historicalCountryId: 'h-ming', role: 'PARTICIPANT' },
    ])

    // 연관 사건 카드의 관계 설명 비우기 버튼 동작
    fireEvent.click(
      screen.getByRole('button', {
        name: '도요토미 히데요시의 일본 통일 관계 설명 비우기',
      }),
    )
    expect(onChangeRelatedEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        relatedEventId: 'evt-prev',
        description: '',
      }),
    ])
  })

  it('상위 사건이 비어 있을 때 동시대 추천 상위 사건 칩을 표시하고 원클릭으로 상위 사건을 지정할 수 있다', () => {
    const onSelectParentCandidate = jest.fn()

    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          startDate: '1592-07-08',
          parentEventSlot: {
            parent: null,
            onOpenPicker: jest.fn(),
            onClear: jest.fn(),
            quickSearch: {
              query: '',
              onQueryChange: jest.fn(),
              candidates: [],
              onSelectCandidate: onSelectParentCandidate,
            },
            contemporarySuggestions: [
              {
                id: 'evt-imjin-war',
                title: '임진왜란',
                dateLabel: '1592 ~ 1598',
                startYear: 1592,
              },
            ],
          },
        })}
      />,
    )

    const parentSuggestionBar = screen.getByLabelText('동시대 추천 상위 사건')
    fireEvent.click(
      within(parentSuggestionBar).getByRole('button', {
        name: '+ 임진왜란 (1592 ~ 1598)',
      }),
    )
    expect(onSelectParentCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'evt-imjin-war',
        title: '임진왜란',
      }),
    )
  })

  it('상위 사건 기간 내 위치 미니 타임라인 인포그래픽과 인과·파생 흐름 보드가 표시된다', () => {
    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          title: '한산도 대첩',
          startDate: '1592-08-14',
          endDate: '1592-08-14',
          parentEventSlot: {
            parent: {
              id: 'evt-imjin',
              title: '임진왜란',
            },
            parentPeriod: {
              startDate: '1592-05-23',
              endDate: '1598-12-16',
            },
            onOpenPicker: jest.fn(),
            onClear: jest.fn(),
          },
          relatedEventsSlot: {
            items: [
              {
                relatedEventId: 'evt-okpo',
                title: '옥포 해전',
                relationType: 'LED_TO',
                direction: 'incoming',
                description: '선행 해전',
              },
            ],
            onOpenPicker: jest.fn(),
            onChange: jest.fn(),
          },
        })}
      />,
    )

    expect(
      screen.getByLabelText('상위 사건 기간 속 위치 인포그래픽'),
    ).toBeInTheDocument()
    expect(screen.getByText('초반')).toBeInTheDocument()
    expect(
      screen.getByLabelText('연관 사건 인과 흐름도'),
    ).toBeInTheDocument()
  })

  it('연관 사건 추천 칩이 많을 때 기본 2개만 노출하고 +더보기/접기로 깔끔하게 제어하며 상위 사건으로 중복 폴백하지 않는다', () => {
    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          startDate: '1914-07-28',
          parentEventSlot: {
            parent: null,
            onOpenPicker: jest.fn(),
            onClear: jest.fn(),
            quickSearch: {
              query: '',
              onQueryChange: jest.fn(),
              candidates: [],
              onSelectCandidate: jest.fn(),
            },
          },
          relatedEventsSlot: {
            items: [],
            onOpenPicker: jest.fn(),
            onChange: jest.fn(),
            contemporarySuggestions: [
              { id: 'e1', title: '사라예보 사건', dateLabel: '1914' },
              { id: 'e2', title: '7월 위기', dateLabel: '1914' },
              { id: 'e3', title: '마른 전투', dateLabel: '1914' },
              { id: 'e4', title: '탄넨베르크 전투', dateLabel: '1914' },
            ],
          },
        })}
      />,
    )

    // 상위 사건 슬롯에 contemporarySuggestions가 없으면 연관 사건 추천을 중복 표시하지 않는다
    expect(
      screen.queryByLabelText('동시대 추천 상위 사건'),
    ).not.toBeInTheDocument()

    // 연관 사건 추천은 기본 2개만 노출되고 나머지는 +2 더보기로 접혀 있다
    const relatedSuggestionBar = screen.getByLabelText('동시대 추천 연관 사건')
    expect(
      within(relatedSuggestionBar).getByRole('button', {
        name: '+ 사라예보 사건 (1914)',
      }),
    ).toBeInTheDocument()
    expect(
      within(relatedSuggestionBar).getByRole('button', {
        name: '+ 7월 위기 (1914)',
      }),
    ).toBeInTheDocument()
    expect(
      within(relatedSuggestionBar).queryByRole('button', {
        name: '+ 마른 전투 (1914)',
      }),
    ).not.toBeInTheDocument()

    fireEvent.click(
      within(relatedSuggestionBar).getByRole('button', {
        name: '동시대 추천 연관 사건 2건 더 보기',
      }),
    )
    expect(
      within(relatedSuggestionBar).getByRole('button', {
        name: '+ 마른 전투 (1914)',
      }),
    ).toBeInTheDocument()
    expect(
      within(relatedSuggestionBar).getByRole('button', {
        name: '+ 탄넨베르크 전투 (1914)',
      }),
    ).toBeInTheDocument()
  })

  it('연속 등록 시 직전 사건 날짜 이어받기 칩과 수정 모드 2단 레이아웃 안내 문구, 인과 흐름 보드 인라인 삭제가 동작한다', () => {
    const setStartDate = jest.fn()
    const setStartDatePrecision = jest.fn()
    const onRelatedChange = jest.fn()

    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({
          layoutMode: 'split',
          startDate: '',
          setStartDate,
          setStartDatePrecision,
          relatedEventsSlot: {
            items: [
              {
                relatedEventId: 'evt-prev',
                title: '사라예보 사건',
                relationType: 'LED_TO',
                direction: 'incoming',
              },
            ],
            onOpenPicker: jest.fn(),
            onChange: onRelatedChange,
            lastSavedEvent: {
              id: 'evt-last',
              title: '7월 위기',
              startDate: '1914-07-01',
              endDate: '1914-07-28',
              datePrecision: 'day',
            },
          },
        })}
      />,
    )

    // 1. 수정 모드(recordsSlot & quickRecordTypesSlot 모두 없음)에서 2단 레이아웃 우측에 빈 점선 대신 안내 문구가 표시된다
    expect(
      screen.getByText(
        '진영 · 인물 · 조약 · 하위 사건 등 세부 기록은 사건 상세 화면에서 편집할 수 있습니다.',
      ),
    ).toBeInTheDocument()

    // 2. 직전 사건 날짜 이어받기 칩 클릭 시 endDate('1914-07-28')와 datePrecision('day')가 채워진다
    fireEvent.click(
      screen.getByRole('button', { name: '직전 사건 날짜 이어받기' }),
    )
    expect(setStartDate).toHaveBeenCalledWith('1914-07-28')
    expect(setStartDatePrecision).toHaveBeenCalledWith('day')

    // 3. 인과 흐름 보드 알약 내부의 × 버튼으로 즉시 연결 해제할 수 있다
    const flowBoard = screen.getByRole('region', {
      name: '연관 사건 인과 흐름도',
    })
    fireEvent.click(
      within(flowBoard).getByRole('button', {
        name: '사라예보 사건 인과 흐름도에서 연결 해제',
      }),
    )
    expect(onRelatedChange).toHaveBeenCalledWith([])
  })
})
