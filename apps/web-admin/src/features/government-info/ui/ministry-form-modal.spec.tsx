import React, { useRef, useState } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'
import { fireEvent, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import type { MinistryFormFields } from '@/features/government-info/model/ministry-form-fields'
import type { AdministrationDepartmentCategory } from '@/shared/api/administration-department'
import { emptyMinistryFormFields } from '@/shared/lib/ministry-department/ministry-department-utils'
import { renderWithTheme } from '@/shared/test/render-with-theme'

import { MinistryFormModal } from './ministry-form-modal.widget'

const mockUseHistoricalCountries = jest.fn()

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({
  useClickSound: () => jest.fn(),
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
  getUploadImageUrl: (url: string) => url,
  uploadImage: jest.fn(),
  validateImageFile: jest.fn(),
}))

jest.mock('@/shared/api/person-career', () => ({
  personCareerApi: {},
}))

jest.mock('@/shared/api/administration-department', () => ({
  administrationDepartmentApi: {
    getAll: jest.fn(async () => []),
    createCategory: jest.fn(),
  },
}))

jest.mock('@/shared/api/military-unit', () => ({
  militaryUnitApi: {
    getAll: jest.fn(async () => []),
  },
}))

jest.mock('@/shared/api/city', () => ({
  cityApi: {
    searchPlaces: jest.fn(async () => []),
  },
}))

jest.mock(
  '@/features/country/api/use-historical-countries-by-modern-country.hook',
  () => ({
    useHistoricalCountriesByModernCountry: (countryId: string) =>
      mockUseHistoricalCountries(countryId),
  }),
)

const MOCK_CATEGORIES: AdministrationDepartmentCategory[] = [
  {
    id: 'cat-foreign',
    name: '외교',
    nameEn: 'Foreign Affairs',
  } as AdministrationDepartmentCategory,
  {
    id: 'cat-defense',
    name: '국방',
    nameEn: 'Defense',
  } as AdministrationDepartmentCategory,
  {
    id: 'cat-finance',
    name: '재정·경제',
    nameEn: 'Finance & Economy',
  } as AdministrationDepartmentCategory,
  {
    id: 'cat-intel',
    name: '정보·정보기관',
    nameEn: 'Intelligence',
  } as AdministrationDepartmentCategory,
]

type HarnessProps = {
  countryName?: string
  initialForm?: MinistryFormFields
  onFormSnapshot?: (snapshot: MinistryFormFields) => void
}

function ModalTestHarness({
  countryName = '대한민국',
  initialForm,
  onFormSnapshot,
}: HarnessProps) {
  const [ministryForm, setMinistryForm] = useState<MinistryFormFields>(
    () => initialForm ?? emptyMinistryFormFields('', ''),
  )
  const [estModalOpen, setEstModalOpen] = useState(false)
  const [abolModalOpen, setAbolModalOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [parentOpen, setParentOpen] = useState(false)
  const [succOpen, setSuccOpen] = useState(false)
  const thumbRef = useRef<HTMLInputElement | null>(null)

  const handleSetForm: React.Dispatch<
    React.SetStateAction<MinistryFormFields>
  > = (updater) => {
    setMinistryForm((prevForm) => {
      const nextForm =
        typeof updater === 'function' ? updater(prevForm) : updater
      onFormSnapshot?.(nextForm)
      return nextForm
    })
  }

  return (
    <MinistryFormModal
      effectiveCountryId="country-1"
      countryName={countryName}
      isOpen
      isDark={false}
      editingMinistry={null}
      ministryForm={ministryForm}
      setMinistryForm={handleSetForm}
      ministriesList={[]}
      categoriesList={MOCK_CATEGORIES}
      closeMinistryFormModal={jest.fn()}
      submitMinistryForm={jest.fn()}
      thumbnailInputRef={thumbRef}
      thumbnailUploading={false}
      setThumbnailUploading={jest.fn()}
      establishedDateModalOpen={estModalOpen}
      setEstablishedDateModalOpen={setEstModalOpen}
      abolishedDateModalOpen={abolModalOpen}
      setAbolishedDateModalOpen={setAbolModalOpen}
      categorySelectOpen={catOpen}
      setCategorySelectOpen={setCatOpen}
      parentSelectOpen={parentOpen}
      setParentSelectOpen={setParentOpen}
      successorSelectOpen={succOpen}
      setSuccessorSelectOpen={setSuccOpen}
    />
  )
}

function renderModalHarness(props: HarnessProps = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
  return renderWithTheme(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ModalTestHarness {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn()
})

beforeEach(() => {
  mockUseHistoricalCountries.mockReturnValue({ data: [] })
})

describe('MinistryFormModal — 디자인 및 입력 UX 개선 검증', () => {
  it('설립 · 폐지 시기에 11월 · 11일 · 28일 등 두 자리 월/일을 연속 입력할 수 있다', () => {
    let latestForm: MinistryFormFields = emptyMinistryFormFields('', '')
    renderModalHarness({
      onFormSnapshot: (snapshot) => {
        latestForm = snapshot
      },
    })

    const estGroup = screen.getByRole('group', { name: '기관 설립일' })
    const estYearInput = within(estGroup).getByLabelText(
      '연도',
    ) as HTMLInputElement
    const estMonthInput = within(estGroup).getByLabelText(
      '월',
    ) as HTMLInputElement
    const estDayInput = within(estGroup).getByLabelText(
      '일',
    ) as HTMLInputElement

    fireEvent.change(estYearInput, { target: { value: '1948' } })

    // '1' 입력 시 즉시 '01'로 패딩되지 않고 '1'을 유지해야 이어서 '11'을 입력할 수 있다
    fireEvent.change(estMonthInput, { target: { value: '1' } })
    expect(estMonthInput.value).toBe('1')
    fireEvent.change(estMonthInput, { target: { value: '11' } })
    expect(estMonthInput.value).toBe('11')

    fireEvent.change(estDayInput, { target: { value: '1' } })
    expect(estDayInput.value).toBe('1')
    fireEvent.change(estDayInput, { target: { value: '11' } })
    expect(estDayInput.value).toBe('11')

    expect(latestForm.establishedYear).toBe(1948)
    expect(latestForm.establishedMonth).toBe(11)
    expect(latestForm.establishedDay).toBe(11)

    // 폐지일 역시 두 자리 일자('2' -> '28') 연속 입력이 정상 동작한다
    const abolGroup = screen.getByRole('group', { name: '기관 폐지일' })
    const abolYearInput = within(abolGroup).getByLabelText(
      '연도',
    ) as HTMLInputElement
    const abolMonthInput = within(abolGroup).getByLabelText(
      '월',
    ) as HTMLInputElement
    const abolDayInput = within(abolGroup).getByLabelText(
      '일',
    ) as HTMLInputElement

    fireEvent.change(abolYearInput, { target: { value: '1998' } })
    fireEvent.change(abolMonthInput, { target: { value: '2' } })
    expect(abolMonthInput.value).toBe('02')

    fireEvent.change(abolDayInput, { target: { value: '2' } })
    expect(abolDayInput.value).toBe('2')
    fireEvent.change(abolDayInput, { target: { value: '28' } })
    expect(abolDayInput.value).toBe('28')

    expect(latestForm.abolishedYear).toBe(1998)
    expect(latestForm.abolishedMonth).toBe(2)
    expect(latestForm.abolishedDay).toBe(28)
  })

  it('연결된 시대·역사 국가가 30개 이상이어도 칩 벽 대신 연대순 검색형 단일 드롭다운으로 표시된다', () => {
    const thirtyPolities = [
      {
        id: 'polity-qing',
        name: '청나라',
        enName: 'Qing Dynasty',
        thumbnailUrl: null,
        stateType: 'EMPIRE',
        startDate: '1644-01-01',
        endDate: '1912-02-12',
      },
      {
        id: 'polity-qin',
        name: '진나라',
        enName: 'Qin Dynasty',
        thumbnailUrl: null,
        stateType: 'EMPIRE',
        startDate: '-0221-01-01',
        endDate: '-0206-01-01',
      },
      {
        id: 'polity-tang',
        name: '당나라',
        enName: 'Tang Dynasty',
        thumbnailUrl: null,
        stateType: 'EMPIRE',
        startDate: '0618-06-18',
        endDate: '0907-06-01',
      },
      ...Array.from({ length: 27 }, (_unused, itemIndex) => {
        const startYr = 910 + itemIndex * 20
        return {
          id: `polity-extra-${itemIndex}`,
          name: `역대왕조${itemIndex + 1}`,
          enName: `Dynasty ${itemIndex + 1}`,
          thumbnailUrl: null,
          stateType: 'KINGDOM',
          startDate: `${String(startYr).padStart(4, '0')}-01-01`,
          endDate: `${String(startYr + 15).padStart(4, '0')}-12-31`,
        }
      }),
    ]

    mockUseHistoricalCountries.mockReturnValue({ data: thirtyPolities })

    let latestForm: MinistryFormFields = emptyMinistryFormFields('', '')
    renderModalHarness({
      countryName: '중국',
      onFormSnapshot: (snapshot) => {
        latestForm = snapshot
      },
    })

    // 드롭다운을 열기 전에는 30개 왕조 칩들이 화면에 나열되지 않고 단일 트리거만 노출된다
    expect(screen.queryByText('청나라')).not.toBeInTheDocument()
    expect(screen.queryByText('역대왕조15')).not.toBeInTheDocument()

    const polityTrigger = screen.getByRole('button', {
      name: '소속 시대 및 정치체 선택',
    })
    expect(polityTrigger).toHaveTextContent('중국 직속')

    // 드롭다운 열기 -> 연대순(중국 직속 -> 진나라(BC 221) -> 당나라(618) -> ... -> 청나라(1644)) 정렬 확인
    fireEvent.click(polityTrigger)
    const polityListbox = screen.getByRole('listbox')
    const allOptions = within(polityListbox).getAllByRole('option')
    expect(allOptions).toHaveLength(31)
    expect(allOptions[0]).toHaveTextContent('중국 직속')
    expect(allOptions[1]).toHaveTextContent('진나라')
    expect(allOptions[2]).toHaveTextContent('당나라')
    expect(allOptions[allOptions.length - 1]).toHaveTextContent('청나라')

    // 연도 키워드('1644')로 검색하여 청나라 선택
    const searchInput = screen.getByPlaceholderText(
      '왕조 · 시대 정체명 또는 존속 연도 검색…',
    )
    fireEvent.change(searchInput, { target: { value: '1644' } })

    const filteredOptions = within(polityListbox).getAllByRole('option')
    expect(filteredOptions).toHaveLength(1)
    fireEvent.click(filteredOptions[0])

    expect(latestForm.historicalCountryId).toBe('polity-qing')
  })

  it('간결한 인라인 추천 칩을 클릭하거나 명칭을 입력하면 타국 비교용 공통 직능 분류가 자동 매칭된다', () => {
    let latestForm: MinistryFormFields = emptyMinistryFormFields('', '')
    renderModalHarness({
      countryName: '대한민국',
      onFormSnapshot: (snapshot) => {
        latestForm = snapshot
      },
    })

    // '+ 외교부 · 외교' 같은 조잡한 이중 배지 대신 깔끔한 기관명 칩으로 노출된다
    const foreignPresetBtn = screen.getByRole('button', { name: '외교부' })
    fireEvent.click(foreignPresetBtn)

    expect(latestForm.name).toBe('외교부')
    expect(latestForm.categoryId).toBe('cat-foreign')
    expect(
      screen.getByRole('link', { name: /타국 「외교」 비교/ }),
    ).toBeInTheDocument()

    // 다른 명칭('외무부')을 직접 타이핑해도 동일하게 '외교' 직능으로 자동 매칭된다
    const nameInput = screen.getByLabelText(/부처 · 기관명/)
    fireEvent.change(nameInput, { target: { value: '외무부' } })
    expect(latestForm.name).toBe('외무부')
    expect(latestForm.categoryId).toBe('cat-foreign')
  })

  it('모달 헤더에서 섹션 점프 탭을 제거하고, 좌우 50:50 균형 분할과 기관 구분 설명 기능을 제공한다', () => {
    let latestForm: MinistryFormFields = emptyMinistryFormFields('', '')
    renderModalHarness({
      countryName: '대한민국',
      onFormSnapshot: (snapshot) => {
        latestForm = snapshot
      },
    })

    const modalDialog = screen.getByRole('dialog', {
      name: '중앙부처 · 국가기관 등록',
    })
    expect(modalDialog).toBeInTheDocument()

    // 헤더 섹션 점프 탭('기본 정보', '상하위 · 계보', '맥락 · 소개')이 제거되었는지 확인
    expect(
      screen.queryByRole('navigation', { name: '폼 섹션 이동' }),
    ).not.toBeInTheDocument()

    // 좌우 반반 분할 패널 배치 확인 (좌: 기본 정보 · 분류 / 우: 상하위 편제 + 소재지·직제·소개)
    const splitGrid = screen.getByTestId('ministry-form-split-grid')
    expect(splitGrid).toBeInTheDocument()
    const leftPane = document.getElementById('ministry-form-split-left')!
    const rightPane = document.getElementById('ministry-form-split-right')!
    expect(
      within(leftPane).getByText('기본 정보 · 분류'),
    ).toBeInTheDocument()
    expect(
      within(rightPane).getByText('상하위 편제 · 전후 계보'),
    ).toBeInTheDocument()
    expect(
      within(rightPane).getByText('소재지 · 직제 · 소개'),
    ).toBeInTheDocument()

    // 기관 구분 설명 기능 확인: 1줄 요약 캡션 + 점세개(⋯) '구분 기준 안내' 비교 패널
    const kindCallout = screen.getByTestId('active-department-kind-callout')
    expect(kindCallout).toHaveTextContent('중앙부처')

    fireEvent.click(screen.getByRole('button', { name: '구분 기준 안내' }))
    const guideRegion = screen.getByRole('region', {
      name: '기관 구분 전체 기준 안내',
    })
    expect(guideRegion).toBeInTheDocument()

    // 비교 가이드 안의 '외청·위원회' 카드를 클릭하면 즉시 해당 구분이 선택되고 설명이 갱신된다
    const agencyGuideBtn = within(guideRegion).getByRole('button', {
      name: /외청·위원회/,
    })
    fireEvent.click(agencyGuideBtn)
    expect(latestForm.kind).toBe('AGENCY')
    expect(kindCallout).toHaveTextContent('외청·위원회')

    // 다시 중앙부처 선택 후 점세개(⋯) 모달 설정 메뉴에서 2단 분할 <-> 1단 보기 전환 검증
    const kindRadioGroup = screen.getByRole('radiogroup', {
      name: '기관 구분 선택',
    })
    fireEvent.click(
      within(kindRadioGroup).getByRole('radio', { name: '중앙부처' }),
    )

    const moreSettingsBtn = screen.getByRole('button', {
      name: '모달 설정 더보기',
    })
    fireEvent.click(moreSettingsBtn)
    const moreMenu = screen.getByRole('menu', { name: '모달 설정 더보기' })
    fireEvent.click(within(moreMenu).getByRole('button', { name: '1단 보기' }))

    expect(
      screen.queryByTestId('ministry-form-split-grid'),
    ).not.toBeInTheDocument()

    fireEvent.click(within(moreMenu).getByRole('button', { name: '2단 분할' }))
    expect(screen.getByTestId('ministry-form-split-grid')).toBeInTheDocument()

    // 하단 고정 푸터: 필수 미입력 점프 -> 기관명 입력 후 등록 준비 완료 전환
    expect(
      screen.getByRole('button', { name: /필수 입력: 부처 · 기관명/ }),
    ).toBeInTheDocument()

    const nameInput = screen.getByLabelText(/부처 · 기관명/)
    fireEvent.change(nameInput, { target: { value: '외교부' } })

    expect(screen.getByText(/등록 준비 완료/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '등록 후 계속' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '기관 등록' }),
    ).toBeInTheDocument()
  })

  it('청사 · 본부 소재지에 Google 지도 URL을 붙여넣으면 장소명과 WGS84 좌표를 추출하고 구글 지도 미리보기를 표시한다', () => {
    let latestForm: MinistryFormFields = emptyMinistryFormFields('', '')
    renderModalHarness({
      countryName: '대한민국',
      onFormSnapshot: (snapshot) => {
        latestForm = snapshot
      },
    })

    const hqInput = screen.getByLabelText('청사 · 본부 소재지')
    fireEvent.paste(hqInput, {
      clipboardData: {
        getData: () =>
          'https://www.google.com/maps/place/%EC%A0%95%EB%B6%80%EC%84%9C%EC%9A%B8%EC%B2%AD%EC%82%AC/@37.5748,126.9730,17z/data=!3d37.574889!4d126.975201',
      },
    })

    expect(latestForm.defenseHeadquarters).toBe('정부서울청사')
    expect(latestForm.headquartersLatitude).toBe(37.574889)
    expect(latestForm.headquartersLongitude).toBe(126.975201)

    expect(
      screen.getByText(/핀 고정 · 북위 37\.5749°, 동경 126\.9752°/),
    ).toBeInTheDocument()

    const mapIframe = screen.getByTitle('정부서울청사 구글 지도 미리보기')
    expect(mapIframe).toBeInTheDocument()
    expect(mapIframe.getAttribute('src')).toContain('maps.google.com/maps')
    expect(mapIframe.getAttribute('src')).toContain('output=embed')
  })

  it('소관 군부대 연결 필드를 제거하고, 군조직 개편 계보는 국방·군사 관련 기관일 때만 노출한다', () => {
    renderModalHarness({ countryName: '대한민국' })

    // 역방향 '소관 군부대' 멀티셀렉트가 폼에서 완전히 제거되었는지 확인
    expect(
      screen.queryByLabelText('소관 군부대 검색 및 연결'),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('소관 군부대')).not.toBeInTheDocument()

    // 일반 부처(외교부) 선택 시 군조직 개편 필드는 숨겨진다
    fireEvent.click(screen.getByRole('button', { name: '외교부' }))
    expect(
      screen.queryByRole('button', {
        name: /\+ 해체 후 군사 사령부·부대로 개편된 이력 추가/,
      }),
    ).not.toBeInTheDocument()

    // 국방·군정 부처(국방부) 선택 시에만 군조직 개편 계보 추가 버튼이 노출된다
    fireEvent.click(screen.getByRole('button', { name: '국방부' }))
    expect(
      screen.getByRole('button', {
        name: /\+ 해체 후 군사 사령부·부대로 개편된 이력 추가/,
      }),
    ).toBeInTheDocument()
  })
})
