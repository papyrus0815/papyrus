import { type ReactNode } from 'react'

import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'

import { cityApi } from '@/shared/api/city'
import { getTheme } from '@/shared/styles/theme'

import {
  LocationPickerModal,
  formatCoordinate,
  parseCoordinateInput,
} from './location-picker-modal'

jest.mock('@/shared/api/city', () => ({
  cityApi: {
    searchPlaces: jest.fn(),
  },
}))

jest.mock('@/shared/hooks/use-debounced-value', () => ({
  useDebouncedValue: <T,>(value: T) => value,
}))

jest.mock('./location-picker-map', () => ({
  __esModule: true,
  default: ({
    point,
    onPick,
  }: {
    point: { lat: number; lng: number } | null
    onPick: (next: { lat: number; lng: number }) => void
  }) => (
    <div data-testid="mock-map">
      <output data-testid="map-point">
        {point ? `${point.lat},${point.lng}` : 'none'}
      </output>
      <button
        type="button"
        onClick={() => onPick({ lat: 37.95, lng: 126.67 })}
      >
        _pickOnMap
      </button>
    </div>
  ),
}))

const mockedSearchPlaces = cityApi.searchPlaces as jest.Mock

function renderModal(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={getTheme('light')}>{ui}</ThemeProvider>
    </QueryClientProvider>,
  )
}

describe('parseCoordinateInput', () => {
  it('일반 숫자 위·경도와 한글·영문 반구 표기 좌표를 파싱한다', () => {
    expect(parseCoordinateInput('48.8049, 2.1204')).toEqual({
      lat: 48.8049,
      lng: 2.1204,
    })
    expect(parseCoordinateInput('북위 37.9560°, 동경 126.6770°')).toEqual({
      lat: 37.956,
      lng: 126.677,
    })
    expect(parseCoordinateInput('남위 33.8688, 서경 151.2093')).toEqual({
      lat: -33.8688,
      lng: -151.2093,
    })
    expect(parseCoordinateInput('48.8049° N, 2.1204° E')).toEqual({
      lat: 48.8049,
      lng: 2.1204,
    })
  })

  it('도·분·초(DMS) 표기와 Google 지도·OpenStreetMap URL에서 좌표를 파싱한다', () => {
    const dmsEn = parseCoordinateInput('37°57′21.6″N 126°40′37.2″E')
    expect(dmsEn?.lat).toBeCloseTo(37.956, 4)
    expect(dmsEn?.lng).toBeCloseTo(126.677, 4)

    const dmsKo = parseCoordinateInput('북위 37도 57분 21.6초 동경 126도 40분 37.2초')
    expect(dmsKo?.lat).toBeCloseTo(37.956, 4)
    expect(dmsKo?.lng).toBeCloseTo(126.677, 4)

    expect(
      parseCoordinateInput(
        'https://www.google.com/maps/place/Versailles/@48.8049,2.1204,15z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d48.8048649!4d2.1203554',
      ),
    ).toEqual({
      lat: 48.804865,
      lng: 2.120355,
    })

    expect(
      parseCoordinateInput('https://www.openstreetmap.org/#map=14/37.9560/126.6770'),
    ).toEqual({
      lat: 37.956,
      lng: 126.677,
    })
  })

  it('범위를 벗어난 위·경도나 일반 장소명은 null을 반환한다', () => {
    expect(parseCoordinateInput('95.0, 2.1204')).toBeNull()
    expect(parseCoordinateInput('48.8, 195.0')).toBeNull()
    expect(parseCoordinateInput('베르사유 궁전')).toBeNull()
    expect(parseCoordinateInput('')).toBeNull()
  })
})

describe('LocationPickerModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('장소 검색 결과를 연달아 고르면 자동 채워진 위치 이름도 새 장소로 갱신되고, 직접 적은 설명이 있으면 이름 교체 버튼을 제안한다', async () => {
    mockedSearchPlaces.mockImplementation(async (query: string) => {
      if (query.includes('베르사유')) {
        return [
          {
            placeId: 'p1',
            shortName: '베르사유 궁전',
            displayName: '프랑스 일드프랑스 베르사유 궁전',
            lat: 48.8049,
            lng: 2.1204,
          },
        ]
      }
      if (query.includes('워털루')) {
        return [
          {
            placeId: 'p2',
            shortName: '워털루',
            displayName: '벨기에 브라방왈롱 워털루',
            lat: 50.7147,
            lng: 4.3991,
          },
        ]
      }
      return []
    })

    const onSave = jest.fn()
    renderModal(
      <LocationPickerModal
        isOpen
        onClose={jest.fn()}
        initial={{}}
        onSave={onSave}
      />,
    )

    const searchInput = screen.getByRole('searchbox', { name: '장소 검색' })
    fireEvent.change(searchInput, { target: { value: '베르사유' } })

    const firstOption = await screen.findByText('베르사유 궁전')
    fireEvent.click(firstOption)

    const labelInput = screen.getByLabelText(
      '장소 이름',
    ) as HTMLTextAreaElement
    expect(labelInput.value).toBe('베르사유 궁전')

    // 이어서 다른 장소를 검색해 Enter로 고르면 자동 채워졌던 이름도 새 장소명으로 바뀐다
    fireEvent.change(searchInput, { target: { value: '워털루' } })
    await screen.findByText('워털루')
    fireEvent.keyDown(searchInput, { key: 'Enter' })

    expect(labelInput.value).toBe('워털루')

    // 사용자가 직접 설명을 고친 뒤 다른 장소를 고르면 기존 설명을 보존하고 이름 바꾸기 보조 버튼을 노출한다
    fireEvent.change(labelInput, {
      target: { value: '벨기에 워털루 인근 전장' },
    })
    fireEvent.change(searchInput, { target: { value: '베르사유' } })
    fireEvent.click(await screen.findByText('베르사유 궁전'))

    expect(labelInput.value).toBe('벨기에 워털루 인근 전장')
    const replaceBtn = screen.getByRole('button', {
      name: /베르사유 궁전.*이름 바꾸기/,
    })
    fireEvent.click(replaceBtn)
    expect(labelInput.value).toBe('베르사유 궁전')
  })

  it('검색창에 위·경도 좌표를 입력하면 API 호출 없이 즉시 해당 좌표로 핀을 이동할 수 있고, 위치 모두 지우기로 한 번에 비울 수 있다', async () => {
    const onSave = jest.fn()
    renderModal(
      <LocationPickerModal
        isOpen
        onClose={jest.fn()}
        initial={{ location: '판문점' }}
        onSave={onSave}
      />,
    )

    const searchInput = screen.getByRole('searchbox', { name: '장소 검색' })
    fireEvent.change(searchInput, { target: { value: '37.956, 126.677' } })

    expect(screen.getByText('좌표로 바로 핀 이동')).toBeInTheDocument()
    fireEvent.keyDown(searchInput, { key: 'Enter' })

    await waitFor(() => {
      expect(
        screen.getByText(formatCoordinate({ lat: 37.956, lng: 126.677 })),
      ).toBeInTheDocument()
    })

    // 위치 모두 지우기 클릭 시 이름·좌표가 모두 초기화된 상태로 저장된다
    fireEvent.click(screen.getByRole('button', { name: '위치 모두 지우기' }))
    expect(onSave).toHaveBeenCalledWith({
      location: '',
      locationLatitude: null,
      locationLongitude: null,
      locationNote: null,
    })
  })

  it('복합 지명에서 빠른 검색 칩과 이름·메모 나누기 버튼을 제공한다', async () => {
    mockedSearchPlaces.mockResolvedValue([])
    renderModal(
      <LocationPickerModal
        isOpen
        onClose={jest.fn()}
        initial={{
          location: '콘스탄티노폴리스 (현 튀르키예 이스탄불)',
        }}
        contextHints={['오스만 제국']}
        onSave={jest.fn()}
      />,
    )

    // 빠른 검색 후보 칩 노출 및 클릭 시 검색어 전환
    const chip = screen.getByRole('button', { name: '튀르키예 이스탄불' })
    fireEvent.click(chip)
    const searchInput = screen.getByRole('searchbox', {
      name: '장소 검색',
    }) as HTMLInputElement
    expect(searchInput.value).toBe('튀르키예 이스탄불')

    // 이름·메모 나누기 클릭 시 장소 이름과 위치 메모가 분리된다
    fireEvent.click(
      screen.getByRole('button', { name: '장소 이름과 위치 메모 자동 나누기' }),
    )
    expect(
      (screen.getByLabelText('장소 이름') as HTMLTextAreaElement).value,
    ).toBe('콘스탄티노폴리스')
    expect(
      (screen.getByLabelText('위치 메모 (선택)') as HTMLTextAreaElement).value,
    ).toBe('현 튀르키예 이스탄불')
  })
})
