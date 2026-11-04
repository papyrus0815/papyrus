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
import { ThemeProvider } from 'styled-components'

import { getTheme } from '@/shared/styles/theme'

import {
  EventBasicForm,
  buildPreservedEventImages,
} from './event-basic-form'

// ── 외부 경계 모킹 ──────────────────────────────────────────────
jest.mock('@/shared/api/client', () => ({
  getApiConnection: jest.fn(() => ({ host: 'http://localhost:3000' })),
  apiConnection: { host: 'http://localhost:3000' },
}))
jest.mock('@/shared/api/event-sides', () => ({
  syncEventSides: jest.fn(),
}))
jest.mock('@/shared/api/event-relations', () => ({
  DIRECTED_RELATION_TYPES: new Set(['LED_TO', 'INFLUENCED', 'RESPONSE_TO']),
  createEventRelation: jest.fn(),
}))
jest.mock('@/shared/api/election', () => ({
  updateElection: jest.fn(),
}))
jest.mock('@/shared/api/person-career', () => ({
  personCareerApi: { updateGovernmentPositionTenure: jest.fn() },
}))
jest.mock('@/shared/api/treaty', () => ({
  treatyApi: { linkEvent: jest.fn(), create: jest.fn() },
}))
jest.mock('@/shared/api/events', () => ({
  getEventById: jest.fn(),
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  getEventLinkCandidates: jest.fn(),
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
jest.mock('@/shared/ui/country-picker', () => ({
  CountryPicker: (props: {
    initialKind?: string
    hintYearRange?: { startYear?: number | null; endYear?: number | null }
  }) => (
    <output data-testid="country-picker-meta">
      {`${props.initialKind ?? 'default'}:${props.hintYearRange?.startYear ?? ''}:${props.hintYearRange?.endYear ?? ''}`}
    </output>
  ),
}))
jest.mock('@/features/event-facets/model/register-facets', () => {
  const actual = jest.requireActual('@/features/event-facets/model/register-facets')
  return {
    ...actual,
    commitRegisterFacets: jest.fn().mockResolvedValue({ done: [], warnings: [] }),
  }
})
jest.mock('@/widgets/event-form/ui/core-records-group', () => ({
  CoreRecordsGroup: (props: {
    type: string
    domain: string | null
    drafts: import('@/features/event-facets/model/register-facets').RegisterFacetDrafts
    onDraftsChange: (
      next: import('@/features/event-facets/model/register-facets').RegisterFacetDrafts,
    ) => void
  }) => (
    <div data-testid="core-records-group">
      {props.domain}:{props.type}:{props.drafts.treaty.mode}
      <button
        type="button"
        onClick={() =>
          props.onDraftsChange({
            ...props.drafts,
            treaty: { mode: 'create', name: '가짜 조약' },
            power: [{ personId: 'p1', name: '인물1' }],
          })
        }
      >
        _fillTreatyAndPowerDraft
      </button>
    </div>
  ),
}))
// 상세 페이지는 저장 직후 `void import(...)`로 프리워밍만 한다 — 실제 모듈은 무겁다.
jest.mock('@/pages/events/detail/event-detail.page', () => ({}), { virtual: true })

/**
 * 상위 사건 피커(SelectModal) 스텁 — 실물은 포털·framer-motion·useModalBehavior를
 * 물고 있다. 여기서 검증할 계약은 "열렸을 때 옵션을 고르면 폼 상태에 반영되는가"뿐.
 */
jest.mock('@/shared/ui/select-modal/select-modal', () => ({
  SelectModal: (props: {
    isOpen: boolean
    options: Array<{ value: string; label: string }>
    onSelect: (value: string) => void
  }) =>
    props.isOpen ? (
      <div data-testid="parent-picker">
        {props.options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => props.onSelect(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    ) : null,
}))

jest.mock('@/pages/events/detail/components/location-picker-modal', () => ({
  LocationPickerModal: (props: {
    isOpen: boolean
    onClose: () => void
    onSave: (value: {
      location: string
      locationLatitude: number | null
      locationLongitude: number | null
      locationNote: string | null
    }) => void
  }) =>
    props.isOpen ? (
      <div data-testid="location-picker-modal">
        <button
          type="button"
          onClick={() =>
            props.onSave({
              location: '베르사유 궁전',
              locationLatitude: 48.8049,
              locationLongitude: 2.1204,
              locationNote: null,
            })
          }
        >
          _saveLocationFromMap
        </button>
      </div>
    ) : null,
}))

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
    category: string
    setCategory: (next: string) => void
    titleSuggestionSlot?: {
      label: string
      onApply: () => void
    }
    typeSlot?: ReactNode
    recordsSlot?: { title: string; content: ReactNode }
    participantsCoreOf?: string
    roleDescriptionPlaceholder?: string
    kindSlot?: {
      value: 'SINGLE' | 'COLLECTION'
      onChange: (next: 'SINGLE' | 'COLLECTION') => void
    }
    locationSlot?: {
      location: string
      setLocation: (next: string) => void
      latitude?: number | null
      longitude?: number | null
      onClearCoordinates?: () => void
      onOpenMapModal: () => void
    }
    thumbnail: string
    keywords: string[]
    relatedCountries: Array<{
      countryId?: string | null
      historicalCountryId?: string | null
      role?: string
      roleDescription?: string | null
    }>
    parentEventSlot?: {
      parent: { id: string; title: string } | null
      onOpenPicker: () => void
      onClear: () => void
    }
    relatedEventsSlot?: {
      items: Array<{
        relatedEventId: string
        title: string
        relationType: string
        direction: string
        description?: string
      }>
      lastSavedEvent?: {
        id: string
        title: string
        startYear?: number | null
      } | null
      onChange: (
        next: Array<{
          relatedEventId: string
          title: string
          startYear?: number | null
          relationType: 'LED_TO'
          direction: 'incoming'
          description?: string
        }>,
      ) => void
      onOpenPicker: () => void
    }
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
      <input
        aria-label="분야"
        value={props.category}
        onChange={(event) => props.setCategory(event.target.value)}
      />
      <output data-testid="category">{props.category}</output>
      <output data-testid="participantsCoreOf">{props.participantsCoreOf ?? ''}</output>
      <output data-testid="roleDescriptionPlaceholder">
        {props.roleDescriptionPlaceholder ?? ''}
      </output>
      <output data-testid="recordsTitle">{props.recordsSlot?.title ?? ''}</output>
      <output data-testid="kind">{props.kindSlot?.value ?? ''}</output>
      {props.kindSlot && (
        <button
          type="button"
          onClick={() =>
            props.kindSlot?.onChange(
              props.kindSlot.value === 'SINGLE' ? 'COLLECTION' : 'SINGLE',
            )
          }
        >
          _toggleKind
        </button>
      )}
      {props.titleSuggestionSlot && (
        <button type="button" onClick={props.titleSuggestionSlot.onApply}>
          {props.titleSuggestionSlot.label} 적용
        </button>
      )}
      {props.typeSlot}
      {props.recordsSlot?.content}
      <output data-testid="startDate">{props.startDate}</output>
      <output data-testid="endDate">{props.endDate}</output>
      <output data-testid="thumbnail">{props.thumbnail}</output>
      <output data-testid="keywords">{props.keywords.join('|')}</output>
      {props.locationSlot && (
        <>
          <input
            aria-label="위치"
            value={props.locationSlot.location}
            onChange={(event) => props.locationSlot?.setLocation(event.target.value)}
          />
          <output data-testid="locationCoords">
            {props.locationSlot.latitude != null &&
            props.locationSlot.longitude != null
              ? `${props.locationSlot.latitude},${props.locationSlot.longitude}`
              : ''}
          </output>
          <button type="button" onClick={props.locationSlot.onOpenMapModal}>
            _openLocationMap
          </button>
        </>
      )}
      <output data-testid="relatedCountries">
        {props.relatedCountries
          .map(
            (participant) =>
              `${participant.countryId ?? participant.historicalCountryId}:${participant.role ?? ''}:${participant.roleDescription ?? ''}`,
          )
          .join('|')}
      </output>
      <output data-testid="hasParentSlot">
        {String(Boolean(props.parentEventSlot))}
      </output>
      {props.parentEventSlot && (
        <>
          <output data-testid="parentTitle">
            {props.parentEventSlot.parent?.title ?? ''}
          </output>
          <button type="button" onClick={props.parentEventSlot.onOpenPicker}>
            _openParentPicker
          </button>
          <button type="button" onClick={props.parentEventSlot.onClear}>
            _clearParent
          </button>
        </>
      )}
      {props.relatedEventsSlot && (
        <>
          <output data-testid="relatedEvents">
            {props.relatedEventsSlot.items
              .map(
                (item) =>
                  `${item.relatedEventId}:${item.title}:${item.relationType}:${item.direction}`,
              )
              .join('|')}
          </output>
          <output data-testid="lastSavedEvent">
            {props.relatedEventsSlot.lastSavedEvent
              ? `${props.relatedEventsSlot.lastSavedEvent.id}:${props.relatedEventsSlot.lastSavedEvent.title}`
              : ''}
          </output>
          <button
            type="button"
            onClick={() =>
              props.relatedEventsSlot?.onChange([
                {
                  relatedEventId: 'evt-cause',
                  title: '사라예보 사건',
                  startYear: 1914,
                  relationType: 'LED_TO',
                  direction: 'incoming',
                  description: '',
                },
              ])
            }
          >
            _addRelatedCause
          </button>
        </>
      )}
    </div>
  ),
}))

const eventsApi = jest.requireMock('@/shared/api/events') as {
  getEventById: jest.Mock
  createEvent: jest.Mock
  updateEvent: jest.Mock
  getEventLinkCandidates: jest.Mock
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function wrap(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <ThemeProvider theme={getTheme('light')}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </ThemeProvider>
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  window.localStorage.clear()
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
      /**
       * 역할·역할 서술까지 하이드레이션돼야 편집 저장이 큐레이션을 지우지 않는다
       * (예전엔 id만 복원하고 INITIATOR 하나만 별표로 되살렸다).
       */
      relatedCountries: [
        { id: 'c1', name: '프랑스', role: 'PARTICIPANT', sortOrder: 0 },
        {
          id: 'c2',
          name: '오스트리아',
          role: 'INITIATOR',
          roleDescription: '회의를 주재',
          sortOrder: 1,
        },
      ],
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
    expect(screen.getByTestId('relatedCountries')).toHaveTextContent(
      'c1:PARTICIPANT:|c2:INITIATOR:회의를 주재',
    )
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
    fireEvent.change(screen.getByLabelText('분야'), {
      target: { value: 'MILITARY' },
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
    fireEvent.change(screen.getByLabelText('분야'), { target: { value: 'MILITARY' } })
    await act(async () => {
      await formRef.current?.submit()
    })

    // 기본값('active')이면 목록이 뒤에 살아 있는 모달에서 소진해 둔 N페이지가 즉시 재조회된다
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['events'],
      refetchType: 'none',
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['events', 'count'],
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
      domain: 'DIPLOMACY',
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

// ────────────────────────────────────────────────────────────────
describe('EventBasicForm — 상위 사건(트리 등록)', () => {
  /** 필수값(사건명·시작일·분야)을 채워 submit 가능 상태로 만든다 */
  function fillRequired() {
    fireEvent.change(screen.getByLabelText('사건명'), {
      target: { value: '하위 전투' },
    })
    fireEvent.change(screen.getByLabelText('시작일'), {
      target: { value: '1914-08-04' },
    })
    fireEvent.change(screen.getByLabelText('분야'), {
      target: { value: 'MILITARY' },
    })
  }

  it('initialParent가 있으면 프리필된 채 열리고, dirty 기준선에 포함된다', async () => {
    const onDirtyChange = jest.fn()
    const client = makeClient()
    render(
      <EventBasicForm
        initialParent={{ id: 'evt-parent', title: '제1차 세계 대전' }}
        onDirtyChange={onDirtyChange}
      />,
      { wrapper: wrap(client) },
    )

    expect(screen.getByTestId('parentTitle')).toHaveTextContent(
      '제1차 세계 대전',
    )
    // 프리필은 기준선의 일부 — '열자마자 dirty' 오판이 없어야 한다
    expect(onDirtyChange).not.toHaveBeenCalledWith(true)
  })

  it('프리필된 상위는 제출 시 parentEventId로 전송된다', async () => {
    eventsApi.createEvent.mockResolvedValue({ id: 'evt-child' })
    const client = makeClient()
    jest.spyOn(client, 'ensureQueryData').mockResolvedValue({} as never)

    const formRef = { current: null } as React.RefObject<
      import('./event-basic-form').EventBasicFormHandle | null
    >
    render(
      <EventBasicForm
        formRef={formRef}
        initialParent={{ id: 'evt-parent', title: '제1차 세계 대전' }}
      />,
      { wrapper: wrap(client) },
    )
    fillRequired()

    await act(async () => {
      await formRef.current?.submit()
    })

    expect(eventsApi.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ parentEventId: 'evt-parent' }),
    )
  })

  it('상위 미선택이면 parentEventId를 전송하지 않는다 (기존 계약 유지)', async () => {
    eventsApi.createEvent.mockResolvedValue({ id: 'evt-orphan' })
    const client = makeClient()
    jest.spyOn(client, 'ensureQueryData').mockResolvedValue({} as never)

    const formRef = { current: null } as React.RefObject<
      import('./event-basic-form').EventBasicFormHandle | null
    >
    render(<EventBasicForm formRef={formRef} />, { wrapper: wrap(client) })
    fillRequired()

    await act(async () => {
      await formRef.current?.submit()
    })

    expect(eventsApi.createEvent).toHaveBeenCalledTimes(1)
    expect(
      eventsApi.createEvent.mock.calls[0][0].parentEventId,
    ).toBeUndefined()
  })

  it('프리필을 해제하면 dirty가 되고, 제출에서도 빠진다', async () => {
    eventsApi.createEvent.mockResolvedValue({ id: 'evt-child' })
    const onDirtyChange = jest.fn()
    const client = makeClient()
    jest.spyOn(client, 'ensureQueryData').mockResolvedValue({} as never)

    const formRef = { current: null } as React.RefObject<
      import('./event-basic-form').EventBasicFormHandle | null
    >
    render(
      <EventBasicForm
        formRef={formRef}
        initialParent={{ id: 'evt-parent', title: '제1차 세계 대전' }}
        onDirtyChange={onDirtyChange}
      />,
      { wrapper: wrap(client) },
    )

    fireEvent.click(screen.getByText('_clearParent'))
    await waitFor(() => expect(onDirtyChange).toHaveBeenCalledWith(true))
    expect(screen.getByTestId('parentTitle')).toHaveTextContent('')

    fillRequired()
    await act(async () => {
      await formRef.current?.submit()
    })
    expect(
      eventsApi.createEvent.mock.calls[0][0].parentEventId,
    ).toBeUndefined()
  })

  it('피커에서 고른 후보가 칩·제출 payload에 반영된다', async () => {
    eventsApi.getEventLinkCandidates.mockResolvedValue([
      { id: 'evt-picked', title: '보스니아 위기' },
    ])
    eventsApi.createEvent.mockResolvedValue({ id: 'evt-child' })
    const client = makeClient()
    jest.spyOn(client, 'ensureQueryData').mockResolvedValue({} as never)

    const formRef = { current: null } as React.RefObject<
      import('./event-basic-form').EventBasicFormHandle | null
    >
    render(<EventBasicForm formRef={formRef} />, { wrapper: wrap(client) })

    fireEvent.click(screen.getByText('_openParentPicker'))
    fireEvent.click(await screen.findByText('보스니아 위기'))

    expect(screen.getByTestId('parentTitle')).toHaveTextContent('보스니아 위기')

    fillRequired()
    await act(async () => {
      await formRef.current?.submit()
    })
    expect(eventsApi.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ parentEventId: 'evt-picked' }),
    )
  })

  it('편집 모드에서는 상위 사건 슬롯을 렌더하지 않는다 (계층 편집은 상세 연관이 정본)', async () => {
    eventsApi.getEventById.mockResolvedValue({
      id: 'evt-1',
      title: '빈 회의',
      startDate: '1814-09-18T00:00:00.000Z',
      keywords: [],
    })
    const client = makeClient()
    render(<EventBasicForm eventId="evt-1" />, { wrapper: wrap(client) })

    await waitFor(() =>
      expect(screen.getByLabelText('사건명')).toHaveValue('빈 회의'),
    )
    expect(screen.getByTestId('hasParentSlot')).toHaveTextContent('false')
  })
})

// ────────────────────────────────────────────────────────────────
describe('EventBasicForm — 분야 · 세부 분야 상호작용', () => {
  it('분야를 고르기 전에 세부부터 고르면 어울리는 기본 분야가 함께 채워지고, 전쟁은 묶음 사건이 된다', () => {
    const client = makeClient()
    render(<EventBasicForm />, { wrapper: wrap(client) })

    expect(screen.getByTestId('category')).toHaveTextContent('')
    expect(screen.getByTestId('kind')).toHaveTextContent('SINGLE')

    fireEvent.click(screen.getByRole('radio', { name: '전쟁' }))

    expect(screen.getByTestId('category')).toHaveTextContent('MILITARY')
    expect(screen.getByTestId('kind')).toHaveTextContent('COLLECTION')
    expect(screen.getByTestId('recordsTitle')).toHaveTextContent('전쟁 기록')
    expect(screen.getByTestId('participantsCoreOf')).toHaveTextContent('전쟁')
  })

  it('분야를 해제하거나 그 세부가 앞줄에 없는 다른 분야로 바꾸면 고아 세부·기록 섹션을 함께 비운다', () => {
    const client = makeClient()
    render(<EventBasicForm />, { wrapper: wrap(client) })

    fireEvent.change(screen.getByLabelText('분야'), { target: { value: 'MILITARY' } })
    fireEvent.click(screen.getByRole('radio', { name: '전투·작전' }))
    expect(screen.getByTestId('recordsTitle')).toHaveTextContent('전투·작전 기록')

    // 전투·작전이 앞줄에 없는 문화(CULTURE)로 바꾸면 세부가 정리된다
    fireEvent.change(screen.getByLabelText('분야'), { target: { value: 'CULTURE' } })
    expect(screen.getByTestId('recordsTitle')).toHaveTextContent('')
    expect(screen.getByTestId('participantsCoreOf')).toHaveTextContent('')

    // 반대로 양쪽 앞줄에 모두 있는 세부(법령·정책·개혁: 군사 ↔ 경제)는 분야를 바꿔도 유지된다
    fireEvent.change(screen.getByLabelText('분야'), { target: { value: 'MILITARY' } })
    fireEvent.click(screen.getByRole('radio', { name: '법령·정책·개혁' }))
    expect(screen.getByTestId('participantsCoreOf')).toHaveTextContent('법령·정책·개혁')

    fireEvent.change(screen.getByLabelText('분야'), { target: { value: 'ECONOMY' } })
    expect(screen.getByTestId('participantsCoreOf')).toHaveTextContent('법령·정책·개혁')

    // 분야를 해제('')하면 세부도 함께 비운다
    fireEvent.change(screen.getByLabelText('분야'), { target: { value: '' } })
    expect(screen.getByTestId('participantsCoreOf')).toHaveTextContent('')
  })

  it('initialParent에 domain이 있으면 초기 분야로 채워지고 dirty가 되지 않는다', () => {
    const onDirtyChange = jest.fn()
    const client = makeClient()
    render(
      <EventBasicForm
        initialParent={{ id: 'evt-parent', title: '제1차 세계 대전', domain: 'MILITARY' }}
        onDirtyChange={onDirtyChange}
      />,
      { wrapper: wrap(client) },
    )

    expect(screen.getByTestId('category')).toHaveTextContent('MILITARY')
    expect(onDirtyChange).not.toHaveBeenCalledWith(true)
  })

  it('reset({ keepCategory: true })는 분야·세부를 남기되 수동으로 바꾼 종류(kind)는 세부의 기본값으로 되돌린다', () => {
    const client = makeClient()
    const formRef = { current: null } as React.RefObject<
      import('./event-basic-form').EventBasicFormHandle | null
    >
    render(<EventBasicForm formRef={formRef} />, { wrapper: wrap(client) })

    fireEvent.change(screen.getByLabelText('분야'), { target: { value: 'MILITARY' } })
    fireEvent.click(screen.getByRole('radio', { name: '전투·작전' }))
    expect(screen.getByTestId('kind')).toHaveTextContent('SINGLE')

    // 사용자가 수동으로 묶음 사건으로 변경
    fireEvent.click(screen.getByText('_toggleKind'))
    expect(screen.getByTestId('kind')).toHaveTextContent('COLLECTION')

    act(() => {
      formRef.current?.reset({ keepCategory: true })
    })

    expect(screen.getByTestId('category')).toHaveTextContent('MILITARY')
    expect(screen.getByTestId('participantsCoreOf')).toHaveTextContent('전투·작전')
    expect(screen.getByTestId('kind')).toHaveTextContent('SINGLE')
  })

  it('사건명 추천 배지를 클릭하면 분야·세부·묶음 여부가 한 번에 채워진다', () => {
    const client = makeClient()
    render(<EventBasicForm />, { wrapper: wrap(client) })

    fireEvent.change(screen.getByLabelText('사건명'), {
      target: { value: '제1차 세계 대전' },
    })

    const suggestionBtn = screen.getByRole('button', {
      name: '군사 › 전쟁 적용',
    })
    fireEvent.click(suggestionBtn)

    expect(screen.getByTestId('category')).toHaveTextContent('MILITARY')
    expect(screen.getByTestId('kind')).toHaveTextContent('COLLECTION')
    expect(screen.getByTestId('recordsTitle')).toHaveTextContent('전쟁 기록')
  })

  it('세부 분야를 바꾸면 이전 세부 전용 facetDrafts(조약·취임 등)가 정리되어 오커밋되지 않는다', () => {
    const client = makeClient()
    render(<EventBasicForm />, { wrapper: wrap(client) })

    // 조약 세부를 고르고 조약 초안을 채운다
    fireEvent.click(screen.getByRole('radio', { name: '조약·협정·가입' }))
    expect(screen.getByTestId('core-records-group')).toHaveTextContent(
      'DIPLOMACY:TREATY:none',
    )
    fireEvent.click(screen.getByText('_fillTreatyAndPowerDraft'))
    expect(screen.getByTestId('core-records-group')).toHaveTextContent(
      'DIPLOMACY:TREATY:create',
    )

    // 회담(SUMMIT)으로 바꾸면 조약·취임 초안이 정리된다
    fireEvent.click(screen.getByRole('radio', { name: '회담·회의·교섭' }))
    expect(screen.getByTestId('core-records-group')).toHaveTextContent(
      'DIPLOMACY:SUMMIT:none',
    )
  })

  it('initialDomain·initialEventType·initialCountries가 주어지면 초기값으로 채워지고 dirty가 되지 않는다', () => {
    const onDirtyChange = jest.fn()
    const client = makeClient()
    render(
      <EventBasicForm
        initialDomain="DIPLOMACY"
        initialEventType="TREATY"
        initialCountries={[{ countryId: 'c1', role: 'PARTICIPANT' }]}
        onDirtyChange={onDirtyChange}
      />,
      { wrapper: wrap(client) },
    )

    expect(screen.getByTestId('category')).toHaveTextContent('DIPLOMACY')
    expect(screen.getByTestId('recordsTitle')).toHaveTextContent(
      '조약·협정·가입 기록',
    )
    expect(screen.getByTestId('relatedCountries')).toHaveTextContent(
      'c1:PARTICIPANT:',
    )
    expect(onDirtyChange).not.toHaveBeenCalledWith(true)
  })

  it('사건 시작 연도에 맞춰 CountryPicker에 시대 힌트와 역사국가 초기 탭을 전달하고, 세부 분야에 맞는 참여국 서술 placeholder를 내려보낸다', () => {
    const client = makeClient()
    render(<EventBasicForm />, { wrapper: wrap(client) })

    fireEvent.change(screen.getByLabelText('시작일'), {
      target: { value: '1683-07-14' },
    })
    fireEvent.click(screen.getByRole('radio', { name: '조약·협정·가입' }))

    expect(screen.getByTestId('country-picker-meta')).toHaveTextContent(
      'historical:1683:1683',
    )
    expect(screen.getByTestId('roleDescriptionPlaceholder')).toHaveTextContent(
      '비준·할양·배상 등 이 나라의 조약 내용 (선택)',
    )
  })

  it('initialRelatedEvents가 주어지면 프리필된 채 열리고 dirty 기준선에 포함된다', () => {
    const onDirtyChange = jest.fn()
    const client = makeClient()
    render(
      <EventBasicForm
        initialRelatedEvents={[
          {
            relatedEventId: 'evt-prev',
            title: '사라예보 사건',
            relationType: 'LED_TO',
            direction: 'incoming',
          },
        ]}
        onDirtyChange={onDirtyChange}
      />,
      { wrapper: wrap(client) },
    )

    expect(screen.getByTestId('relatedEvents')).toHaveTextContent(
      'evt-prev:사라예보 사건:LED_TO:incoming',
    )
    expect(onDirtyChange).not.toHaveBeenCalledWith(true)
  })

  it('신규 등록 시 연관 사건이 commitRegisterFacets로 전달되고, 저장 후 reset() 시 방금 등록한 사건이 lastSavedEvent로 남아 연속 연결할 수 있다', async () => {
    const registerFacets = jest.requireMock(
      '@/features/event-facets/model/register-facets',
    ) as { commitRegisterFacets: jest.Mock }
    eventsApi.createEvent.mockResolvedValue({
      id: 'evt-new',
      title: '마른 전투',
    })

    const client = makeClient()
    jest.spyOn(client, 'ensureQueryData').mockResolvedValue({} as never)

    const formRef = { current: null } as React.RefObject<
      import('./event-basic-form').EventBasicFormHandle | null
    >
    render(<EventBasicForm formRef={formRef} />, { wrapper: wrap(client) })

    fireEvent.change(screen.getByLabelText('사건명'), {
      target: { value: '마른 전투' },
    })
    fireEvent.change(screen.getByLabelText('시작일'), {
      target: { value: '1914-09-05' },
    })
    fireEvent.change(screen.getByLabelText('분야'), {
      target: { value: 'MILITARY' },
    })

    fireEvent.click(screen.getByText('_addRelatedCause'))
    expect(screen.getByTestId('relatedEvents')).toHaveTextContent(
      'evt-cause:사라예보 사건:LED_TO:incoming',
    )

    await act(async () => {
      await formRef.current?.submit()
    })

    expect(registerFacets.commitRegisterFacets).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'evt-new',
        relatedEvents: [
          expect.objectContaining({
            relatedEventId: 'evt-cause',
            title: '사라예보 사건',
            relationType: 'LED_TO',
            direction: 'incoming',
          }),
        ],
      }),
    )

    // 연속 등록을 위해 reset()을 호출하면 연관 사건 목록은 비워지되 방금 등록한 사건은 lastSavedEvent로 남는다
    act(() => {
      formRef.current?.reset({ keepCategory: true })
    })
    expect(screen.getByTestId('relatedEvents')).toHaveTextContent('')
    expect(screen.getByTestId('lastSavedEvent')).toHaveTextContent(
      'evt-new:마른 전투',
    )
  })

  it('작성 중 창이 닫혀 언마운트되더라도 임시 저장본이 localStorage에 보존되고, 다시 열면 이어쓰기 배너로 복원할 수 있다', () => {
    const client = makeClient()
    const firstRender = render(<EventBasicForm />, { wrapper: wrap(client) })

    fireEvent.change(screen.getByLabelText('사건명'), {
      target: { value: '베스트팔렌 조약' },
    })
    fireEvent.change(screen.getByLabelText('시작일'), {
      target: { value: '1648-10-24' },
    })
    fireEvent.change(screen.getByLabelText('분야'), {
      target: { value: 'DIPLOMACY' },
    })
    fireEvent.click(screen.getByRole('radio', { name: '조약·협정·가입' }))
    fireEvent.click(screen.getByText('_fillTreatyAndPowerDraft'))

    // 디바운스 타이머가 돌기 전에 창이 닫혀도(unmount) 즉시 플러시되어야 한다
    firstRender.unmount()

    const secondRender = render(<EventBasicForm />, { wrapper: wrap(client) })
    expect(
      screen.getByRole('status', { name: '임시 저장된 사건 초안 안내' }),
    ).toHaveTextContent('베스트팔렌 조약')

    // 이어쓰기를 누르기 전에는 초기 빈 상태를 유지한다
    expect(screen.getByLabelText('사건명')).toHaveValue('')

    fireEvent.click(screen.getByRole('button', { name: '임시 저장본 이어쓰기' }))

    expect(screen.getByLabelText('사건명')).toHaveValue('베스트팔렌 조약')
    expect(screen.getByTestId('startDate')).toHaveTextContent('1648-10-24')
    expect(screen.getByTestId('category')).toHaveTextContent('DIPLOMACY')
    expect(screen.getByTestId('core-records-group')).toHaveTextContent(
      'DIPLOMACY:TREATY:create',
    )
    expect(
      screen.queryByRole('status', { name: '임시 저장된 사건 초안 안내' }),
    ).not.toBeInTheDocument()

    secondRender.unmount()
  })

  it('임시 저장 배너에서 "버리기"를 누르면 초안이 삭제되고 다시 열어도 배너가 뜨지 않는다', () => {
    const client = makeClient()
    const firstRender = render(<EventBasicForm />, { wrapper: wrap(client) })

    fireEvent.change(screen.getByLabelText('사건명'), {
      target: { value: '임시 메모 사건' },
    })
    firstRender.unmount()

    const secondRender = render(<EventBasicForm />, { wrapper: wrap(client) })
    expect(
      screen.getByRole('status', { name: '임시 저장된 사건 초안 안내' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '임시 저장본 버리기' }))
    expect(
      screen.queryByRole('status', { name: '임시 저장된 사건 초안 안내' }),
    ).not.toBeInTheDocument()

    secondRender.unmount()

    render(<EventBasicForm />, { wrapper: wrap(client) })
    expect(
      screen.queryByRole('status', { name: '임시 저장된 사건 초안 안내' }),
    ).not.toBeInTheDocument()
  })

  it('사건 등록을 완료하면 임시 저장본도 함께 비워져 다음 등록 시 이전 초안 배너가 남지 않는다', async () => {
    eventsApi.createEvent.mockResolvedValue({
      id: 'evt-created',
      title: '워털루 전투',
    })
    const client = makeClient()
    jest.spyOn(client, 'ensureQueryData').mockResolvedValue({} as never)

    const formRef = { current: null } as React.RefObject<
      import('./event-basic-form').EventBasicFormHandle | null
    >
    const firstRender = render(<EventBasicForm formRef={formRef} />, {
      wrapper: wrap(client),
    })

    fireEvent.change(screen.getByLabelText('사건명'), {
      target: { value: '워털루 전투' },
    })
    fireEvent.change(screen.getByLabelText('시작일'), {
      target: { value: '1815-06-18' },
    })
    fireEvent.change(screen.getByLabelText('분야'), {
      target: { value: 'MILITARY' },
    })

    await act(async () => {
      await formRef.current?.submit()
    })

    firstRender.unmount()

    render(<EventBasicForm />, { wrapper: wrap(client) })
    expect(
      screen.queryByRole('status', { name: '임시 저장된 사건 초안 안내' }),
    ).not.toBeInTheDocument()
  })

  it('이전 초안 배너가 떠 있을 때 실수로 글자를 먼저 입력해도 배너가 사라지지 않고 "이어쓰기"로 직전 초안을 복원할 수 있다', () => {
    jest.useFakeTimers()
    try {
      const client = makeClient()
      const firstRender = render(<EventBasicForm />, { wrapper: wrap(client) })

      fireEvent.change(screen.getByLabelText('사건명'), {
        target: { value: '30년 전쟁' },
      })
      fireEvent.change(screen.getByLabelText('시작일'), {
        target: { value: '1618-05-23' },
      })
      firstRender.unmount()

      const secondRender = render(<EventBasicForm />, { wrapper: wrap(client) })
      expect(
        screen.getByRole('status', { name: '임시 저장된 사건 초안 안내' }),
      ).toHaveTextContent('30년 전쟁')

      // 배너를 누르기 전에 실수로 한 글자를 입력하고 디바운스 시간이 지나도 배너와 이전 초안은 유지된다
      fireEvent.change(screen.getByLabelText('사건명'), {
        target: { value: 'ㄱ' },
      })
      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(
        screen.getByRole('status', { name: '임시 저장된 사건 초안 안내' }),
      ).toHaveTextContent('30년 전쟁')

      fireEvent.click(screen.getByRole('button', { name: '임시 저장본 이어쓰기' }))
      expect(screen.getByLabelText('사건명')).toHaveValue('30년 전쟁')
      expect(screen.getByTestId('startDate')).toHaveTextContent('1618-05-23')

      secondRender.unmount()
    } finally {
      jest.useRealTimers()
    }
  })

  it('위치 선택 모달에서 장소 이름과 좌표를 고르면 임시 저장·복원 및 사건 등록 payload에 함께 반영된다', async () => {
    eventsApi.createEvent.mockResolvedValue({
      id: 'evt-versailles',
      title: '베르사유 조약',
    })
    const client = makeClient()
    jest.spyOn(client, 'ensureQueryData').mockResolvedValue({} as never)

    const formRef = { current: null } as React.RefObject<
      import('./event-basic-form').EventBasicFormHandle | null
    >
    render(<EventBasicForm formRef={formRef} />, { wrapper: wrap(client) })

    fireEvent.change(screen.getByLabelText('사건명'), {
      target: { value: '베르사유 조약' },
    })
    fireEvent.change(screen.getByLabelText('시작일'), {
      target: { value: '1919-06-28' },
    })
    fireEvent.change(screen.getByLabelText('분야'), {
      target: { value: 'DIPLOMACY' },
    })

    fireEvent.click(screen.getByText('_openLocationMap'))
    expect(screen.getByTestId('location-picker-modal')).toBeInTheDocument()
    fireEvent.click(screen.getByText('_saveLocationFromMap'))

    expect(screen.getByLabelText('위치')).toHaveValue('베르사유 궁전')
    expect(screen.getByTestId('locationCoords')).toHaveTextContent(
      '48.8049,2.1204',
    )

    await act(async () => {
      await formRef.current?.submit()
    })

    expect(eventsApi.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '베르사유 조약',
        location: '베르사유 궁전',
        locationLatitude: 48.8049,
        locationLongitude: 2.1204,
      }),
    )
  })
})
