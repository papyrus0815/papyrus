import '@testing-library/jest-dom'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { TenureRegisterPanel } from './tenure-register-panel'

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({
  useClickSound: () => jest.fn(),
}))

jest.mock('@/shared/lib/government-position/derive-scoped-definition', () => ({
  deriveCountryScopedPositionDefinition: jest.fn(),
  ScopedDefinitionError: class ScopedDefinitionError extends Error {},
}))

jest.mock('@/features/country/api', () => ({
  useCountries: () => ({
    data: [
      { id: 'kr', name: '대한민국', flagEmoji: '🇰🇷', isoCode: 'KOR' },
      { id: 'us', name: '미국', flagEmoji: '🇺🇸', isoCode: 'USA' },
    ],
  }),
}))

jest.mock('@/shared/lib/use-historical-country-scope', () => ({
  useHistoricalCountryScope: ({ countryId }: { countryId: string }) => ({
    historicalCountries:
      countryId === 'kr'
        ? [
            { id: 'joseon', name: '조선' },
            { id: 'goryeo', name: '고려' },
          ]
        : [],
    historicalCountriesLoaded: true,
  }),
}))

jest.mock('@/features/historical-country/use-historical-countries.hook', () => ({
  useHistoricalCountries: () => ({
    data: [
      {
        id: 'joseon',
        name: '조선',
        startEra: 'AD',
        startYear: 1392,
        endEra: 'AD',
        endYear: 1897,
        stateType: 'MONARCHY',
      },
      {
        id: 'goryeo',
        name: '고려',
        startEra: 'AD',
        startYear: 918,
        endEra: 'AD',
        endYear: 1392,
        stateType: 'MONARCHY',
      },
    ],
  }),
}))

jest.mock('@/shared/api/person-career', () => ({
  personCareerApi: {
    getPositionDefinitionsForPicker: jest.fn().mockResolvedValue({
      definitions: [
        {
          id: 'def-president',
          title: '대통령',
          titleEn: 'President',
          positionType: 'HEAD_OF_STATE',
          isMonarchical: false,
          isGeneric: false,
        },
        {
          id: 'def-pm',
          title: '영의정',
          titleEn: 'Chief State Councillor',
          positionType: 'HEAD_OF_GOVERNMENT',
          isMonarchical: false,
          isGeneric: false,
        },
      ],
      recentTitles: [],
    }),
    getCabinets: jest.fn().mockResolvedValue([]),
    getTenuresByPersonId: jest.fn().mockResolvedValue([]),
    addGovernmentPositionTenure: jest.fn().mockResolvedValue({ id: 'new-tenure' }),
  },
}))

jest.mock('@/shared/api/persons-detail', () => ({
  getPersonDetailById: jest.fn().mockResolvedValue({
    id: 'person-1',
    name: '이순신',
    birthEra: 'AD',
    birthYear: 1545,
    birthMonth: 4,
    birthDay: 28,
    deathEra: 'AD',
    deathYear: 1598,
    deathMonth: 12,
    deathDay: 16,
    countryAffiliations: [
      {
        historicalCountryId: 'joseon',
        historicalCountry: { id: 'joseon', name: '조선' },
      },
      {
        countryId: 'kr',
        country: { id: 'kr', name: '대한민국', flagEmoji: '🇰🇷' },
      },
    ],
  }),
}))

jest.mock('@/shared/api/upload', () => ({
  getUploadImageUrl: (url?: string) => url ?? '',
}))

jest.mock('@/shared/api/invalidate-tenure', () => ({
  invalidateTenureQueries: jest.fn(),
}))

jest.mock('@/widgets/country/country-detail/ui/cabinet-event-attach-modal', () => ({
  CabinetEventAttachModal: () => null,
}))

jest.mock('@/shared/ui/event-picker-modal/event-picker-modal', () => ({
  EventPickerModal: () => null,
}))

jest.mock('@/shared/ui/country-picker', () => ({
  CountryPicker: () => null,
}))

function renderPanel(props: Partial<React.ComponentProps<typeof TenureRegisterPanel>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const onClose = jest.fn()
  renderWithTheme(
    <QueryClientProvider client={queryClient}>
      <TenureRegisterPanel
        personId="person-1"
        open={true}
        onClose={onClose}
        {...props}
      />
    </QueryClientProvider>,
  )
  return { onClose }
}

describe('TenureRegisterPanel 사건등록 모달(EventRegisterModal) 레이아웃 정렬 & 통합 국가 선택 UX', () => {
  it('사건등록 모달과 동일한 FormGroup(기본 정보 · 경위 및 연결) 구조와 인물 생몰년·소속 국가 인라인 링크를 표시한다', async () => {
    renderPanel()

    expect(screen.getByRole('heading', { name: '기본 정보' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '경위 및 연결' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: '기록 구분' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /국가 선택 \(현대 국가 · 역사적 국가\)/ }),
    ).toBeInTheDocument()
    // 취임·퇴임 경위 서술은 넉넉한 Textarea(rows=3)로 제공된다
    const appointmentTextarea = screen.getByLabelText('취임 상세')
    const endReasonTextarea = screen.getByLabelText('퇴임 사유 상세')
    expect(appointmentTextarea.tagName).toBe('TEXTAREA')
    expect(endReasonTextarea.tagName).toBe('TEXTAREA')
    expect(appointmentTextarea).toHaveAttribute('rows', '3')
    expect(endReasonTextarea).toHaveAttribute('rows', '3')

    // 인물 상세가 로드되면 인물 칩 옆 생몰년 요약과 소속 국가 인라인 링크가 표시된다
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '조선' })).toBeInTheDocument()
    })
    expect(screen.getByText(/1545\.04\.28 출생 ~ 1598\.12\.16 사망/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '대한민국' })).toBeInTheDocument()
  })

  it('인물 소속 국가 인라인 링크와 사망일 채우기 링크로 빠르게 값을 채울 수 있다 (이모지 미표시)', async () => {
    renderPanel()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '조선' })).toBeInTheDocument()
    })

    // 현대 국가 '대한민국' 인라인 칩 클릭 → 이모지 없이 대한민국 및 '현대 국가' 태그·ISO 코드 표시
    fireEvent.click(screen.getByRole('button', { name: '대한민국' }))
    const modernCardBtn = screen.getByRole('button', { name: /^대한민국\s*현대 국가/ })
    expect(modernCardBtn).toBeInTheDocument()
    expect(modernCardBtn.textContent).not.toMatch(/🇰🇷|🏛️|🌐/)

    // 역사적 국가 '조선' 인라인 칩 클릭 → 이모지 없이 조선 및 '역사적 국가' 태그 표시
    fireEvent.click(screen.getByRole('button', { name: '조선' }))
    const historicalCardBtn = screen.getByRole('button', { name: /^조선 \(1392–1897\)\s*역사적 국가/ })
    expect(historicalCardBtn).toBeInTheDocument()
    expect(historicalCardBtn.textContent).not.toMatch(/🇰🇷|🏛️|🌐/)

    // 사망일 원클릭 채우기 클릭 → 퇴임일 채움 및 퇴임 사유 셀렉트에 DEATH_IN_OFFICE 자동 선택
    fireEvent.click(screen.getByRole('button', { name: /사망일\(1598\.12\.16\)을 퇴임일로 채우기/ }))
    expect(screen.getByLabelText('퇴임 사유')).toHaveValue('DEATH_IN_OFFICE')
  })

  it('직책 선택 버튼을 누르면 바로 아래에 검색 가능한 드롭다운이 열리고 검색어로 직책을 고를 수 있다', async () => {
    renderPanel()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /직책 선택/ })).toBeInTheDocument()
    })

    // 직책 트리거 클릭 → 인라인 검색 드롭다운(listbox) 오픈
    fireEvent.click(screen.getByRole('button', { name: /직책 선택/ }))
    const searchInput = screen.getByRole('textbox', { name: '직책명 검색' })
    expect(searchInput).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /대통령/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /영의정/ })).toBeInTheDocument()

    // '영의정' 검색 → 대통령 숨겨지고 영의정만 표시
    fireEvent.change(searchInput, { target: { value: '영의정' } })
    expect(screen.queryByRole('option', { name: /대통령/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('option', { name: /영의정/ }))

    // 선택 후 드롭다운이 닫히고 트리거에 '영의정' 표시
    expect(screen.queryByRole('textbox', { name: '직책명 검색' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /영의정/ })).toBeInTheDocument()
  })
})
