import React from 'react'

import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

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

describe('BasicInfoSection — 세로 높이 방지 및 참여국·소개 UX', () => {
  it('참여국이 4개를 초과하면 기본 4개만 표시하고 "+ 외 N개국 더보기" 토글로 펼치거나 접을 수 있다', () => {
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

    // 기본 4개(프랑스·영국·러시아·미국)만 노출되고 5·6번째(이탈리아·일본)는 접혀 있다
    expect(screen.getByLabelText('프랑스 역할')).toBeInTheDocument()
    expect(screen.getByLabelText('미국 역할')).toBeInTheDocument()
    expect(screen.queryByLabelText('이탈리아 역할')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('일본 역할')).not.toBeInTheDocument()

    const toggleBtn = screen.getByRole('button', {
      name: '+ 외 2개국 더보기 (총 6개국)',
    })
    fireEvent.click(toggleBtn)

    expect(screen.getByLabelText('이탈리아 역할')).toBeInTheDocument()
    expect(screen.getByLabelText('일본 역할')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: '참여국 목록 접기 (상위 4개만 표시)',
      }),
    )
    expect(screen.queryByLabelText('이탈리아 역할')).not.toBeInTheDocument()
  })

  it('선택 입력인 "소개" 그룹은 비어 있을 때 접혀 있어 세로 길이를 아끼고, 펼치기 버튼이나 기존 값이 있으면 열린다', () => {
    const { rerender } = renderWithTheme(
      <BasicInfoSection {...makeDefaultProps()} />,
    )

    expect(
      screen.queryByPlaceholderText('무슨 일이 왜 일어났는지 두세 문장으로'),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '소개 펼치기' }))
    expect(
      screen.getByPlaceholderText('무슨 일이 왜 일어났는지 두세 문장으로'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '소개 접기' }))
    expect(
      screen.queryByPlaceholderText('무슨 일이 왜 일어났는지 두세 문장으로'),
    ).not.toBeInTheDocument()

    // 편집 하이드레이션 등으로 값이 들어오면 자동으로 펼쳐진다
    rerender(
      <BasicInfoSection
        {...makeDefaultProps({ description: '기존 개요 설명' })}
      />,
    )
    expect(
      screen.getByPlaceholderText('무슨 일이 왜 일어났는지 두세 문장으로'),
    ).toHaveValue('기존 개요 설명')
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
      screen.getByRole('button', { name: '+ 🇬🇧 영국' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '+ 🇫🇷 프랑스' }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: '사건명 추천 참여국 모두 추가' }),
    )
    expect(setRelatedCountries).toHaveBeenCalledWith([
      { countryId: 'c2', role: 'PARTICIPANT' },
      { countryId: 'c1', role: 'PARTICIPANT' },
    ])
  })

  it('빠른 검색창에서 쉼표(,)로 여러 나라를 한 번에 추가하거나 +주도·+대상 역할로 바로 추가할 수 있다', () => {
    const setRelatedCountries = jest.fn()
    renderWithTheme(
      <BasicInfoSection
        {...makeDefaultProps({ setRelatedCountries })}
      />,
    )

    const searchInput = screen.getByRole('searchbox', {
      name: '참여국 빠른 검색',
    })

    // 1) +주도 역할 버튼으로 추가
    fireEvent.change(searchInput, { target: { value: '프랑스' } })
    fireEvent.click(
      screen.getByRole('button', { name: '프랑스 주도국으로 추가' }),
    )
    expect(setRelatedCountries).toHaveBeenLastCalledWith([
      { countryId: 'c1', role: 'INITIATOR' },
    ])

    // 2) 쉼표로 구분해 여러 나라 한 번에 Enter로 추가
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
      name: '🏛️ 청나라(으)로 교체',
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
})
