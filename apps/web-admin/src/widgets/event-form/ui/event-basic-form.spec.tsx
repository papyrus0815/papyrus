/**
 * EventBasicForm(사건 기본 정보 폼 본체) 회귀 테스트.
 *
 * 이 영역은 spec이 0건인 채로 페이지에서 위젯으로 추출됐다. 추출로 깨지기 쉬운 계약과,
 * 추출 전부터 잠복해 있던 결함을 함께 못박는다:
 *  1. `buildPreservedEventImages` — 기본 정보만 수정해도 상세에서 붙인 이미지가 소실되던 경로
 *  2. 편집 하이드레이션 — 서버 응답이 폼 필드로 옮겨지는지(대표 이미지 선택 포함)
 *  3. **저장 후 캐시 시딩·상세 프리페치** — 예전엔 `onSuccess` 콜백이 있으면 통째로
 *     건너뛰어, 콜백 경로를 쓰는 순간 '등록 직후 무로딩 상세 진입'이 조용히 회귀했다
 *  4. dirty 통지 — 셸(useBlocker·모달 닫기 confirm)의 이탈 가드가 여기에 걸려 있다
 */
import { type ReactNode } from 'react'

import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import {
  EventBasicForm,
  buildPreservedEventImages,
} from './event-basic-form'

// ── 외부 경계 모킹 ──────────────────────────────────────────────
jest.mock('@/shared/api/events', () => ({
  getEventById: jest.fn(),
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
}))
jest.mock('@/shared/ui/toast', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}))
jest.mock('@/entities/gamification', () => ({
  invalidateGamification: jest.fn(),
}))
jest.mock('@/shared/hooks/use-click-sound.hook', () => ({
  useClickSound: () => jest.fn(),
}))
jest.mock('@/entities/event-form/model', () => ({
  useFormEntities: () => ({
    availableCountries: [],
    availableHistoricalCountries: [],
    dbCategories: [],
    isLoading: false,
    refetch: jest.fn(),
  }),
}))
jest.mock('@/shared/ui/advanced-country-select-modal/advanced-country-select-modal', () => ({
  AdvancedCountrySelectModal: () => null,
}))
// 상세 페이지는 저장 직후 `void import(...)`로 프리워밍만 한다 — 실제 모듈은 무겁다.
jest.mock('@/pages/events/detail/event-detail.page', () => ({}), { virtual: true })

/**
 * 실제 BasicInfoSection은 834줄에 자식 모달 5개를 물고 있다. 여기서 검증할 계약은
 * "폼 상태가 섹션에 옳게 흘러가는가"이므로 값을 노출하는 최소 스텁으로 대체한다.
 */
jest.mock('@/widgets/event-form/ui/basic-info-section', () => ({
  BasicInfoSection: (props: {
    title: string
    setTitle: (next: string) => void
    startDate: string
    setStartDate: (next: string) => void
    endDate: string
    thumbnail: string
    keywords: string[]
    relatedCountryIds: string[]
    primaryCountryId: string | null
  }) => (
    <div>
      <input
        aria-label="사건명"
        value={props.title}
        onChange={(event) => props.setTitle(event.target.value)}
      />
      <input
        aria-label="시작일"
        value={props.startDate}
        onChange={(event) => props.setStartDate(event.target.value)}
      />
      <output data-testid="startDate">{props.startDate}</output>
      <output data-testid="endDate">{props.endDate}</output>
      <output data-testid="thumbnail">{props.thumbnail}</output>
      <output data-testid="keywords">{props.keywords.join('|')}</output>
      <output data-testid="relatedCountryIds">
        {props.relatedCountryIds.join('|')}
      </output>
      <output data-testid="primaryCountryId">
        {props.primaryCountryId ?? ''}
      </output>
    </div>
  ),
}))

const eventsApi = jest.requireMock('@/shared/api/events') as {
  getEventById: jest.Mock
  createEvent: jest.Mock
  updateEvent: jest.Mock
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function wrap(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ────────────────────────────────────────────────────────────────
describe('buildPreservedEventImages', () => {
  it('로드된 이미지가 없으면 undefined — thumbnail 기본 동작에 위임한다', () => {
    expect(buildPreservedEventImages(null, 'https://img/a.png')).toBeUndefined()
    expect(buildPreservedEventImages([], 'https://img/a.png')).toBeUndefined()
  })

  it('썸네일이 원본 대표와 같으면 캡션·출처를 보존한다', () => {
    const result = buildPreservedEventImages(
      [
        {
          imageUrl: 'https://img/a.png',
          caption: '진격',
          source: '국립도서관',
          isPrimary: true,
        },
      ],
      'https://img/a.png',
    )
    expect(result).toEqual([
      {
        imageUrl: 'https://img/a.png',
        caption: '진격',
        source: '국립도서관',
        order: 0,
        isPrimary: true,
      },
    ])
  })

  it('썸네일이 교체되면 캡션·출처는 승계하지 않는다(다른 그림이므로)', () => {
    const result = buildPreservedEventImages(
      [
        {
          imageUrl: 'https://img/old.png',
          caption: '옛 캡션',
          source: '옛 출처',
          isPrimary: true,
        },
      ],
      'https://img/new.png',
    )
    expect(result?.[0]).toMatchObject({
      imageUrl: 'https://img/new.png',
      caption: undefined,
      source: undefined,
      isPrimary: true,
    })
  })

  it('비대표 이미지는 캡션·출처와 함께 살아남는다 — 기본 정보 수정이 갤러리를 지우면 안 된다', () => {
    const result = buildPreservedEventImages(
      [
        { imageUrl: 'https://img/a.png', caption: '대표', isPrimary: true },
        { imageUrl: 'https://img/b.png', caption: '둘', source: '출처B' },
        { imageUrl: 'https://img/c.png', caption: '셋' },
      ],
      'https://img/a.png',
    )
    expect(result).toHaveLength(3)
    expect(result?.map((img) => img.imageUrl)).toEqual([
      'https://img/a.png',
      'https://img/b.png',
      'https://img/c.png',
    ])
    expect(result?.[1]).toMatchObject({ caption: '둘', source: '출처B', isPrimary: false })
    expect(result?.filter((img) => img.isPrimary)).toHaveLength(1)
  })

  it('썸네일을 지워도 비대표 이미지는 남는다', () => {
    const result = buildPreservedEventImages(
      [
        { imageUrl: 'https://img/a.png', isPrimary: true },
        { imageUrl: 'https://img/b.png' },
      ],
      '',
    )
    expect(result?.map((img) => img.imageUrl)).toEqual(['https://img/b.png'])
    expect(result?.[0].isPrimary).toBe(false)
  })
})

// ────────────────────────────────────────────────────────────────
describe('EventBasicForm — 편집 하이드레이션', () => {
  it('서버 응답을 폼 필드로 옮기고, 대표 이미지를 썸네일로 고른다', async () => {
    eventsApi.getEventById.mockResolvedValue({
      id: 'evt-1',
      title: '빈 회의',
      description: '요약',
      startDate: '1814-09-18T10:30:00.000Z',
      endDate: '1815-06-09T00:00:00.000Z',
      keywords: ['외교', '회의'],
      eventImages: [
        { imageUrl: 'https://img/first.png' },
        { imageUrl: 'https://img/primary.png', isPrimary: true },
      ],
      relatedCountryIds: ['c1', 'c2'],
      relatedCountries: [{ id: 'c2', role: 'INITIATOR' }],
    })

    const client = makeClient()
    render(<EventBasicForm eventId="evt-1" />, { wrapper: wrap(client) })

    await waitFor(() =>
      expect(screen.getByLabelText('사건명')).toHaveValue('빈 회의'),
    )
    expect(screen.getByTestId('startDate')).toHaveTextContent('1814-09-18')
    expect(screen.getByTestId('endDate')).toHaveTextContent('1815-06-09')
    expect(screen.getByTestId('keywords')).toHaveTextContent('외교|회의')
    // isPrimary가 배열 첫 장이 아니어도 대표를 골라야 한다
    expect(screen.getByTestId('thumbnail')).toHaveTextContent(
      'https://img/primary.png',
    )
    expect(screen.getByTestId('relatedCountryIds')).toHaveTextContent('c1|c2')
    expect(screen.getByTestId('primaryCountryId')).toHaveTextContent('c2')
  })
})

// ────────────────────────────────────────────────────────────────
describe('EventBasicForm — 저장', () => {
  it('신규 등록에 성공하면 상세 캐시를 시딩·프리페치한 뒤 onSaved(id, "create")를 부른다', async () => {
    const saved = { id: 'evt-new', title: '새 사건' }
    eventsApi.createEvent.mockResolvedValue(saved)

    const client = makeClient()
    const setQueryData = jest.spyOn(client, 'setQueryData')
    const ensureQueryData = jest
      .spyOn(client, 'ensureQueryData')
      .mockResolvedValue(saved as never)
    const onSaved = jest.fn()

    const formRef = { current: null } as React.RefObject<
      import('./event-basic-form').EventBasicFormHandle | null
    >
    render(<EventBasicForm formRef={formRef} onSaved={onSaved} />, {
      wrapper: wrap(client),
    })

    fireEvent.change(screen.getByLabelText('사건명'), {
      target: { value: '새 사건' },
    })
    fireEvent.change(screen.getByLabelText('시작일'), {
      target: { value: '1815-06-18' },
    })

    await act(async () => {
      await formRef.current?.submit()
    })

    expect(eventsApi.createEvent).toHaveBeenCalledTimes(1)
    expect(setQueryData).toHaveBeenCalledWith(
      ['event-detail', 'evt-new'],
      expect.objectContaining({ id: 'evt-new' }),
    )
    expect(ensureQueryData).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['event-detail', 'evt-new'] }),
    )
    expect(onSaved).toHaveBeenCalledWith('evt-new', 'create')
  })

  it('목록 무효화는 refetchType:none — 재조회는 목록에 남는 셸이 결정한다', async () => {
    eventsApi.createEvent.mockResolvedValue({ id: 'evt-new', title: '새 사건' })

    const client = makeClient()
    const invalidate = jest.spyOn(client, 'invalidateQueries')
    jest.spyOn(client, 'ensureQueryData').mockResolvedValue({} as never)

    const formRef = { current: null } as React.RefObject<
      import('./event-basic-form').EventBasicFormHandle | null
    >
    render(<EventBasicForm formRef={formRef} onSaved={jest.fn()} />, {
      wrapper: wrap(client),
    })
    fireEvent.change(screen.getByLabelText('사건명'), { target: { value: '새 사건' } })
    fireEvent.change(screen.getByLabelText('시작일'), { target: { value: '1815-06-18' } })
    await act(async () => {
      await formRef.current?.submit()
    })

    // 기본값('active')이면 목록이 뒤에 살아 있는 모달에서 소진해 둔 N페이지가 즉시 재조회된다
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['events'],
      refetchType: 'none',
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['events-count'],
      refetchType: 'none',
    })
  })

  it('필수값이 비면 저장하지 않는다', async () => {
    const client = makeClient()
    const formRef = { current: null } as React.RefObject<
      import('./event-basic-form').EventBasicFormHandle | null
    >
    const onSaved = jest.fn()
    render(<EventBasicForm formRef={formRef} onSaved={onSaved} />, {
      wrapper: wrap(client),
    })

    fireEvent.change(screen.getByLabelText('사건명'), {
      target: { value: '제목만 있음' },
    })
    await act(async () => {
      await formRef.current?.submit()
    })

    expect(eventsApi.createEvent).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('onSaved 콜백이 있어도 캐시 시딩·프리페치를 건너뛰지 않는다 (수정 경로)', async () => {
    const saved = { id: 'evt-1', title: '빈 회의(수정)' }
    eventsApi.getEventById.mockResolvedValue({
      id: 'evt-1',
      title: '빈 회의',
      startDate: '1814-09-18T00:00:00.000Z',
      keywords: [],
    })
    eventsApi.updateEvent.mockResolvedValue(saved)

    const client = makeClient()
    const setQueryData = jest.spyOn(client, 'setQueryData')
    const ensureQueryData = jest
      .spyOn(client, 'ensureQueryData')
      .mockResolvedValue(saved as never)
    const onSaved = jest.fn()

    const formRef = { current: null } as React.RefObject<
      import('./event-basic-form').EventBasicFormHandle | null
    >
    render(
      <EventBasicForm eventId="evt-1" formRef={formRef} onSaved={onSaved} />,
      { wrapper: wrap(client) },
    )

    await waitFor(() =>
      expect(screen.getByLabelText('사건명')).toHaveValue('빈 회의'),
    )

    await act(async () => {
      await formRef.current?.submit()
    })

    expect(eventsApi.updateEvent).toHaveBeenCalledWith('evt-1', expect.any(Object))
    // 핵심 회귀 방지 — 예전엔 onSaved(구 onSuccess)가 있으면 아래 둘을 통째로 건너뛰었다
    expect(setQueryData).toHaveBeenCalledWith(
      ['event-detail', 'evt-1'],
      expect.objectContaining({ id: 'evt-1' }),
    )
    expect(ensureQueryData).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['event-detail', 'evt-1'] }),
    )
    expect(onSaved).toHaveBeenCalledWith('evt-1', 'edit')
  })
})

// ────────────────────────────────────────────────────────────────
describe('EventBasicForm — dirty 통지', () => {
  it('입력이 생기면 셸에 dirty=true를 알린다 (셸의 이탈 가드 전제)', async () => {
    const onDirtyChange = jest.fn()
    const client = makeClient()
    render(<EventBasicForm onDirtyChange={onDirtyChange} />, {
      wrapper: wrap(client),
    })

    // 첫 렌더는 dirty가 아니다
    expect(onDirtyChange).toHaveBeenCalledWith(false)
    expect(onDirtyChange).not.toHaveBeenCalledWith(true)

    fireEvent.change(screen.getByLabelText('사건명'), {
      target: { value: '워털루' },
    })

    await waitFor(() => expect(onDirtyChange).toHaveBeenCalledWith(true))
  })

  it('편집 하이드레이션은 dirty가 아니고, 그 뒤 **첫 수정**부터 dirty가 된다', async () => {
    eventsApi.getEventById.mockResolvedValue({
      id: 'evt-1',
      title: '빈 회의',
      startDate: '1814-09-18T00:00:00.000Z',
      keywords: [],
    })

    const onDirtyChange = jest.fn()
    const client = makeClient()
    render(<EventBasicForm eventId="evt-1" onDirtyChange={onDirtyChange} />, {
      wrapper: wrap(client),
    })

    await waitFor(() =>
      expect(screen.getByLabelText('사건명')).toHaveValue('빈 회의'),
    )
    // 서버 값이 폼에 꽂힌 것은 사용자의 수정이 아니다
    expect(onDirtyChange).not.toHaveBeenCalledWith(true)

    // 예전 구현은 로드 후 첫 변경 1회를 skip 플래그로 삼켜, 두 번째 수정부터 dirty였다.
    fireEvent.change(screen.getByLabelText('사건명'), {
      target: { value: '빈 회의(수정)' },
    })
    await waitFor(() => expect(onDirtyChange).toHaveBeenCalledWith(true))
  })

  it('되돌리면 다시 clean이 된다 (기준선 비교라 가능)', async () => {
    const onDirtyChange = jest.fn()
    const client = makeClient()
    render(<EventBasicForm onDirtyChange={onDirtyChange} />, {
      wrapper: wrap(client),
    })

    const titleInput = screen.getByLabelText('사건명')
    fireEvent.change(titleInput, { target: { value: '워털루' } })
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true))

    fireEvent.change(titleInput, { target: { value: '' } })
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false))
  })
})
