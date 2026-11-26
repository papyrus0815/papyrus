import {
  type KeyboardEvent,
  Suspense,
  lazy,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as eventDepartmentsApi from '@api/functional/events/departments'

import { getApiConnection } from '@/shared/api/client'
import { listEventContextLinks } from '@/shared/api/event-context-links'
import { getEventTerritoryTransfers, territoryTransferKeys } from '@/shared/api/territory-transfers'
import { syncEventSides } from '@/shared/api/event-sides'
import { type UpdateEventDto } from '@/shared/api/events'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { notify } from '@/shared/ui/toast'
import { permanentlyDeleteEvent } from '@/shared/api/events'
import {
  EventDeleteDialog,
  restoreEventFromTrash,
  TRASH_RETENTION_DAYS,
  useDeleteEventToTrash,
} from '@/widgets/event/event-trash/event-trash'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import {
  eventDomainDef,
  eventTypeFeatures,
  isMilitaryOperationsContext,
  participantKey,
  toParticipants,
} from '@/entities/event/model'
import { ledgerAccent, ledgerHairline, ledgerHairlineStrong } from '@/entities/event/ui/ledger-tokens'
import { EventPanelLoading } from '@/entities/event/ui/panel-loading'
import { CommentSection } from '@/entities/comment'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import { pathKeys } from '@/shared/router'
import { SmartErrorBoundary } from '@/shared/ui/error-handler/smart-error-boundary'

import { CollectionDevelopment } from './components/collection-development'
import { SectionHintText } from './components/actors/actors.styles'
import { CollectionWholeTextNotice } from './components/collection-whole-text-notice'
import { CountryInfoModal } from './components/country-info-modal'
import { DetailActors } from './components/detail-actors'
import { DetailAppendix } from './components/detail-appendix'
import { ContemporaryHeadsLink, DetailHero, DetailSummary } from './components/detail-hero'
import {
  EventDetailLoading,
  gateForEntry,
  type LoadingGate,
} from './components/detail-loading'
import { DetailNarrative } from './components/detail-narrative'
import { EventActionsMenu } from './components/event-actions-menu'
import { DetailNetwork } from './components/detail-network'
import { DetailContextLinks } from './components/detail-context-links'
import { DetailTreaties } from './components/detail-treaties'
import { EventKindGuideModal } from './components/event-kind-guide-modal'
import { DetailFacts } from './components/detail-facts'
import { DetailDepartments, eventDepartmentsQueryKey } from './components/detail-departments'
import { DetailOrganizations } from './components/detail-organizations'
import { DetailPoliticalParties } from './components/detail-political-parties'
import { DetailPower, hasPowerData } from './components/detail-power'
import { DetailRail } from './components/detail-rail'
import { DetailStatehood, statehoodEntries } from './components/detail-statehood'
import { DetailTerritory } from './components/detail-territory'
import { DetailWarDeclaration } from './components/detail-war-declaration'
import { FillInStrip } from './components/fill-in-strip'
import { InlineEditProvider } from './components/inline'
import { ModuleAdd } from './components/module-add'
import { ModuleCabinets } from './components/module-cabinets'
import { ModuleMetrics } from './components/module-metrics'
import { ModuleMilitaryDetails } from './components/module-military-details'
import { ModuleSides } from './components/module-sides'
import { PersonDetailModal } from './components/person-detail-modal'
import { ReadingProgress } from './components/reading-progress'
import { SaveStatus } from './components/save-status'
import { scrollToAnchor } from './components/scroll-to-anchor'
import { SplitIntoChildrenModal } from './components/split-into-children-modal'
import {
  FOLDABLE_SECTIONS,
  type FoldableSectionId,
  type OutlineItem,
  filledSections,
  paragraphOutline,
} from './components/section-outline.lib'
import { groupByPhase } from './components/collection-development.lib'
import { orderByPhase, phaseReach, phaseReachLabel } from './components/event-phase.lib'
import { compactStartText } from './components/development-date.lib'
import { compareEventStart } from './components/detail-network.lib'
import * as S from './styles'
import { type EventDetail, eventKeys, useEventDetail } from './use-event-detail'
import { useEventMutation } from './use-event-mutation'
import { useEventRelations } from './use-event-relations'
import { draftSidesFromRoles } from './side-draft.lib'
import { useUndoablePatch } from './use-undoable-patch'

/**
 * 가로 탭 — 기업 상세와 같은 문법(2026-10-14 사용자: "사건 상세도 기업 상세처럼").
 * 한 줄로 끝없이 이어지던 문서를 주제별로 나눈다. 우측 사실 장부는 모든 탭에서 그대로 따라온다
 * (기업 상세의 사실 띠 역할). 목차는 긴 글이 있는 '개요'에서만.
 */
type EventTabId = 'overview' | 'survey' | 'actors' | 'modules' | 'links' | 'media'

const EVENT_TABS: ReadonlyArray<{ id: EventTabId; label: string; hint: string }> = [
  { id: 'overview', label: '개요', hint: '배경 · 전개 · 여파 · 댓글' },
  /* 묶음 사건만 — 하위 사건 전부를 한 화면에 모은다 */
  { id: 'survey', label: '조망', hint: '하위 사건 전부 — 전개 간트 · 참여국 · 분포 · 기록 점검' },
  { id: 'actors', label: '참여', hint: '참여 국가·인물 · 대립 진영 · 기관·정당·내각 · 성립·영토·권력 변동' },
  { id: 'modules', label: '수치·전력', hint: '병력·사상자·피해 규모 등 정량 지표와 전투서열·병기·작전 분석' },
  { id: 'links', label: '연관', hint: '조약 · 상위·하위·관련 사건' },
  { id: 'media', label: '자료', hint: '이미지' },
]

const isEventTab = (value: string | null): value is EventTabId =>
  EVENT_TABS.some((tab) => tab.id === value)

/** 조망 패널 — 묶음 사건에서 탭을 열 때만 받는다(간트·매트릭스 청크가 커서 상세 초기 번들에 얹지 않는다) */
const LazyEventOverviewPanel = lazy(() =>
  import('../overview/event-overview.page').then((module) => ({
    default: module.EventOverviewPanel,
  })),
)

/**
 * 섹션(앵커 id) → 탭. '채우기'·#해시 딥링크·목차가 다른 탭의 섹션을 가리킬 때 먼저 그 탭을 연다.
 * 단락 앵커(배경·전개·여파의 하위 항목)도 접두사로 개요에 묶인다.
 */
function tabOfSection(id: string, promoteTreaties: boolean): EventTabId {
  /* 선전포고 당사국 보드는 개요에만 선다(그 사건의 핵심 사실) — 참여 탭에는 같은 나라의 목록이 이미 있다 */
  if (/^(background|narrative|aftermath|comments|development|war-declaration)/.test(id)) return 'overview'
  if (/^(actors|statehood|territory|power|departments|political-parties|organizations|companies|module-cabinets)/.test(id)) return 'actors'
  if (id.startsWith('module-')) return 'modules'
  if (id === 'treaties') return promoteTreaties ? 'overview' : 'links'
  if (id === 'network' || id === 'context-links') return 'links'
  if (id === 'appendix') return 'media'
  return 'overview'
}

/**
 * 사건 상세 페이지 — 단일 칼럼 narrative-first.
 *
 * 데이터 계층(현대화)
 * - 셸(EventDetailPage)이 ErrorBoundary > Suspense > 본문(EventDetailContent)을 감싼다.
 * - 본문은 `useEventDetail`(useSuspenseQuery) — 로딩은 Suspense, 에러는 ErrorBoundary로
 *   위임하므로 본문 코드엔 `isLoading/isError` 분기가 없다.
 *
 * 디자인 원칙
 * - 사건 = 시간 내러티브 + 행위자 + 카테고리별 모듈 + 연관 네트워크.
 * - 편집은 *click-to-edit* 일원화. 모든 자식은 단일 `onPatch(UpdateEventDto)` 채널만 본다.
 */
const EventDetailPage = () => {
  const { eventId } = useParams<{ eventId: string }>()

  // 라우트상 항상 존재하지만 타입 가드 — 없으면 즉시 안내(훅 호출 전이라 안전).
  if (!eventId) {
    return (
      <S.Page>
        <S.PageInner>
          <S.StateBox>
            <S.ErrorText>잘못된 접근입니다.</S.ErrorText>
            <S.StateBackLink to={pathKeys.events.root()}>
              목록으로 돌아가기
            </S.StateBackLink>
          </S.StateBox>
        </S.PageInner>
      </S.Page>
    )
  }

  // key={eventId} — 다른 사건으로 이동 시 에러 상태·최소 로딩 타이머를 리셋.
  return <EventDetailShell key={eventId} eventId={eventId} />
}

/**
 * 셸 — ErrorBoundary > Suspense > 본문.
 *
 * **최소 로딩 시간**: 응답이 수십 ms라 로딩 화면(초상+명언)이 한 프레임 번쩍이고 사라졌다
 * (2026-10-07 사용자: "로딩이 너무 짧아서 안 보임"). 타이머를 Suspense *밖*(여기)에서 마운트 시점에
 * 만들고, 본문이 데이터를 받은 뒤 그 타이머를 `use()`로 한 번 더 기다린다 — 같은 경계 안에서
 * 두 번 suspend하므로 fallback은 리마운트 없이 이어진다(명언이 중간에 바뀌지 않는다).
 * 데이터 요청은 첫 렌더에서 바로 시작되므로 둘은 병렬이고, 화면은 max(응답, MIN_LOADING_MS)에 열린다.
 * 단 최소 시간은 **이 탭의 첫 진입만** — 캐시가 있거나 앱 안에서 옮겨 다닐 땐 응답만 기다린다(gateForEntry).
 */
function EventDetailShell({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient()
  const [{ gate: loadingGate, appearDelayMs }] = useState(() =>
    gateForEntry(queryClient.getQueryData(eventKeys.detail(eventId)) !== undefined),
  )

  return (
    <SmartErrorBoundary FallbackComponent={EventDetailError}>
      <Suspense fallback={<EventDetailLoading appearDelayMs={appearDelayMs} />}>
        <EventDetailContent eventId={eventId} loadingGate={loadingGate} />
      </Suspense>
    </SmartErrorBoundary>
  )
}

/* ───────────────────────── 본문(데이터 해소 후) ───────────────────────── */

function EventDetailContent({
  eventId,
  loadingGate,
}: {
  eventId: string
  loadingGate: LoadingGate
}) {
  const { event, enabledModules: serverModules, filledModuleCount } = useEventDetail(eventId)
  use(loadingGate)
  /*
   * 수치 모듈과 전투서열·병기·교리 모듈은 첫 데이터를 적기 전에도 '모듈 추가'나 #module-sides 딥링크로
   * 화면에서 바로 펼칠 수 있다(빈 stub을 서버에 미리 저장하지 않는다).
   */
  const [metricsOpened, setMetricsOpened] = useState(false)
  const [forcesOpened, setForcesOpened] = useState(
    () =>
      typeof window !== 'undefined' &&
      (Boolean(new URLSearchParams(window.location.search).get('unit')?.trim()) ||
        window.location.hash === '#module-sides'),
  )
  const enabledModules = useMemo(() => {
    const merged = [...serverModules]
    if (metricsOpened && !merged.includes('metrics')) {
      merged.push('metrics')
    }
    if (forcesOpened && !merged.includes('sides')) {
      merged.push('sides')
    }
    return merged
  }, [metricsOpened, forcesOpened, serverModules])
  /* 탭·히스토리 식별 — 사건명을 문서 제목에 반영. */
  useDocumentTitle(event.title)

  const queryClient = useQueryClient()
  const mutation = useEventMutation(eventId)
  /**
   * onPatch — mutation.mutate에 1단계 undo 토스트를 얹은 wrapper.
   * 모든 인라인 편집은 이 함수를 통해 patch한다 → 직후 5초간 "되돌리기" 토스트.
   */
  const onPatch = useUndoablePatch({ event, mutate: mutation.mutate })

  /* 마지막 저장 성공 시각 — SaveStatus가 "방금 저장됨" 플래시를 띄우기 위한 트리거. */
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  /**
   * 직전에 처리한 mutation submit 타임스탬프. mutation.submittedAt은 매 mutate마다
   * 갱신되므로, 이 값과의 비교로 *새 성공*만 골라낸다.
   */
  const lastHandledSubmitAtRef = useRef(0)
  useEffect(() => {
    if (
      mutation.isSuccess &&
      mutation.submittedAt !== lastHandledSubmitAtRef.current
    ) {
      lastHandledSubmitAtRef.current = mutation.submittedAt
      setLastSavedAt(Date.now())
    }
  }, [mutation.isSuccess, mutation.submittedAt])

  /**
   * 인물 클릭 → 같은 페이지에서 인물 상세 모달.
   * URL 쿼리(`?person=<id>`)와 sync — 새로고침·공유로도 같은 모달 상태 복원 가능.
   */
  const [searchParams, setSearchParams] = useSearchParams()
  const viewingPersonId = searchParams.get('person')
  const onPersonClick = useCallback(
    (personId: string) => {
      const next = new URLSearchParams(searchParams)
      next.set('person', personId)
      // 인물/국가 모달은 상호 배타 — 겹치면 서로 다른 포커스트랩 구현이 경합한다.
      next.delete('country')
      setSearchParams(next, { replace: false })
    },
    [searchParams, setSearchParams],
  )
  const onPersonModalClose = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.delete('person')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  /**
   * 관련국 클릭 → 같은 페이지에서 국가 정보 모달 (인물 모달과 대칭).
   * URL 쿼리(`?country=<id>`) sync — kind(현대/역사)는 CountryInfoModal이
   * 사건 응답의 두 배열에서 복원하므로 URL에는 id만 담는다.
   */
  const viewingCountryId = searchParams.get('country')
  const onCountryClick = useCallback(
    (countryId: string) => {
      const next = new URLSearchParams(searchParams)
      next.set('country', countryId)
      // 인물/국가 모달은 상호 배타 — 겹치면 서로 다른 포커스트랩 구현이 경합한다.
      next.delete('person')
      setSearchParams(next, { replace: false })
    },
    [searchParams, setSearchParams],
  )
  const onCountryModalClose = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.delete('country')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  /**
   * 크래프트 딥링크로 `?person=`과 `?country=`가 동시에 실려 오면 두 모달이
   * 겹쳐 뜨고 포커스트랩이 경합(Tab 고착)한다 — 인물 우선, country는 정리.
   * (클릭 경로는 위 핸들러의 상호 배타 delete가 이미 막는다.)
   */
  useEffect(() => {
    if (viewingPersonId && viewingCountryId) {
      const next = new URLSearchParams(searchParams)
      next.delete('country')
      setSearchParams(next, { replace: true })
    }
  }, [viewingPersonId, viewingCountryId, searchParams, setSearchParams])

  /**
   * 본문에 *인물* 엔티티를 링크하면 참여 행위자로 자동 등록.
   * - 이미 행위자면 무시(기존 role/note 보존).
   * - relatedPersons는 delete-and-recreate라 *전체 배열*을 PUT — 기존 항목은
   *   payload로 직렬화해 함께 보낸다. onPatch 경유라 직후 "되돌리기" 토스트로 취소 가능.
   * - 본문 편집 commit과 독립적 — 본문을 취소(Esc)해도 이미 등록된 행위자는 유지(정책 A).
   * - 즉시 표시: mutation의 낙관적 빌더는 신규 인물 이름을 `['persons','all']`
   *   캐시(행위자 모달 열 때만 적재)에서 찾으므로, 에디터 링크만으론 캐시가 비어
   *   낙관 갱신이 스킵된다. 에디터가 넘긴 표시명으로 상세 캐시에 직접 써넣어
   *   링크 즉시(저장·새로고침 없이) 행위자가 뜨도록 한다. 직후 PUT·refetch가 정본 반영.
   * - race 차단: 기존 목록·중복 판정·PUT 페이로드를 모두 *그 시점 캐시 스냅샷*에서
   *   도출한다. 렌더 상태(`event.relatedPersons`)는 직전 링크의 낙관 갱신을 아직
   *   반영하지 못했을 수 있어, 연속 링크 시 먼저 추가한 인물이 delete-and-recreate
   *   PUT에서 누락될 수 있었다. 낙관 setQueryData는 동기 반영이므로 캐시는 항상 최신.
   */
  const onPersonEntityLink = useCallback(
    (person: { id: string; name: string; imageUrl?: string | null }) => {
      const detailKey = eventKeys.detail(eventId)
      const existing =
        queryClient.getQueryData<EventDetail>(detailKey)?.relatedPersons ??
        event.relatedPersons ??
        []
      if (existing.some((p) => p.personId === person.id)) return

      queryClient.setQueryData<EventDetail>(detailKey, (prev) =>
        prev
          ? {
              ...prev,
              relatedPersons: [
                ...(prev.relatedPersons ?? []),
                {
                  id: `opt-${person.id}`,
                  personId: person.id,
                  role: null,
                  note: null,
                  person: {
                    id: person.id,
                    name: person.name,
                    surname: null,
                    profileImageUrl: person.imageUrl ?? null,
                  },
                },
              ],
            }
          : prev,
      )

      onPatch(
        {
          relatedPersons: [
            ...existing.map((personEntry) => ({
              personId: personEntry.personId,
              role: personEntry.role ?? undefined,
              note: personEntry.note ?? undefined,
            })),
            { personId: person.id },
          ],
        },
        { savedLabel: `행위자에 추가 · ${person.name}` },
      )
    },
    [event.relatedPersons, onPatch, queryClient, eventId],
  )

  /**
   * 섹션 접힘 — 내용이 없는 섹션은 본문·목차에서 빠지고 본문 끝 '더 채울 수 있는 것'으로
   * 모인다(판정·배경은 section-outline.lib).
   *
   * `pinned` — 이 방문에서 한 번이라도 펼쳐졌던 섹션. 두 경우를 막는다:
   *  - '채우기'로 펼친 빈 섹션이 아직 저장 전이라 다음 렌더에 다시 접히는 것
   *  - 마지막 이미지·키워드를 지운 순간 섹션이 눈앞에서 사라지는 것
   * 다른 사건으로 가면 ErrorBoundary key 리셋으로 리마운트되어 함께 비워진다.
   */
  const relatedCount = useEventRelations(event.id).data?.length ?? 0
  const filled = useMemo(
    () => filledSections(event, relatedCount),
    [event, relatedCount],
  )
  const [pinned, setPinned] = useState<ReadonlySet<FoldableSectionId>>(
    () => new Set(),
  )
  /** 묶음 '전체 글' 안내의 '요약 쓰기'로 연 요약 입력칸 — 빈 요약 자리표시는 안내가 대신 든다 */
  const [summaryOpen, setSummaryOpen] = useState(false)
  /** 빈 탭에서 보조 진입점으로 전체 편집 구역을 펼쳤는지 */
  const [overviewTreatyOpened, setOverviewTreatyOpened] = useState(false)
  const [actorsWorkspaceOpen, setActorsWorkspaceOpen] = useState(false)
  const [modulesWorkspaceOpen, setModulesWorkspaceOpen] = useState(false)
  const [linksWorkspaceOpen, setLinksWorkspaceOpen] = useState(false)
  const [treatyOpenLinkSeq, setTreatyOpenLinkSeq] = useState(0)
  const [contextLinkOpenSeq, setContextLinkOpenSeq] = useState(0)
  /** 장부 '+ 부제 · 이칭'으로 연 히어로 부제 입력 */
  const [subtitleOpen, setSubtitleOpen] = useState(false)
  /** 장부 '+ 원어 사건명'으로 연 히어로 입력 */
  const [originalTitleOpen, setOriginalTitleOpen] = useState(false)
  /** 휴지통 사건 — 읽기만 한다. 쓰기 안내·댓글은 세우지 않는다(댓글 API는 지운 사건에 404) */
  const trashedView = Boolean(event.deletedAt)
  useEffect(() => {
    const newlyFilled = FOLDABLE_SECTIONS.filter(
      (section) => filled[section.id] && !pinned.has(section.id),
    )
    if (newlyFilled.length === 0) return
    setPinned((prev) => {
      const next = new Set(prev)
      for (const section of newlyFilled) next.add(section.id)
      return next
    })
  }, [filled, pinned])
  /*
   * 형식(과 분야)이 정하는 기능 — 조약 체결 사건은 조약 섹션을 본문 바로 뒤로 올리고 비어 있어도 접지 않는다
   * (조약이 그 사건의 결과물이라 '채우기' 띠에 숨기면 핵심 동선이 사라진다).
   */
  const features = eventTypeFeatures(event.type, event.domain)
  const promoteTreaties = features.promoteTreaties
  /* 선전포고 — 선전포고(WAR_DECLARATION) 사건이면 선포국·대상국 구도 보드를 세운다 */
  const showWarDeclaration = features.expectWarDeclaration
  /* 국가 성립·소멸 — 역할(건국·멸망)이 있으면 늘, 건국/멸망 사건이면 비어 있어도 보인다 */
  const showStatehood = features.expectStatehood || statehoodEntries(event).length > 0
  /* 영토 이전 — 줄이 있으면 늘, 영토 변경 사건이면 비어 있어도 보인다(같은 캐시를 섹션도 읽는다) */
  const territoryQuery = useQuery({
    queryKey: territoryTransferKeys.event(event.id),
    queryFn: () => getEventTerritoryTransfers(event.id),
    staleTime: 30_000,
  })
  const showTerritory = features.expectTerritory || (territoryQuery.data?.length ?? 0) > 0
  /* 권력 교체·선거 — 취임·즉위·선거가 걸려 있으면 늘, 즉위·취임·선거 형식이면 비어 있어도 보인다 */
  const showPower = features.expectPower || hasPowerData(event)
  /* 관련 국가 기관 — 연결이 있으면 탭 건수·목차에 포함하고, 비어 있을 땐 지령·동원·기관 설립 사건만 기본 펼침 */
  const departmentsQuery = useQuery({
    queryKey: eventDepartmentsQueryKey(event.id),
    queryFn: () => eventDepartmentsApi.list(getApiConnection(), event.id),
    staleTime: 30_000,
  })
  const departmentCount = departmentsQuery.data?.length ?? 0
  const expectDepartments = features.expectDepartments
  /* 관련 기업·조직 — 연결이 있으면 늘, 경제 사건이면 비어 있어도 보인다 */
  const showOrganizations = features.expectOrganizations || (event.organizations?.length ?? 0) > 0
  /* 배경 맥락 연결 — 연관 탭 건수·목차와 캐시를 공유한다 */
  const contextLinksQuery = useQuery({
    queryKey: eventKeys.contextLinks(event.id),
    queryFn: () => listEventContextLinks(event.id),
    staleTime: 30_000,
  })
  const contextLinkCount = contextLinksQuery.data?.length ?? 0
  const childCount = (event.childEvents?.length ?? 0) + (event.extraChildren?.length ?? 0)
  /** 묶음 사건 — 전개 자리는 하위 사건이라 비어 있어도 접지 않는다(빈 상태가 곧 '첫 하위 등록' 안내) */
  const isCollection = event.kind === 'COLLECTION'
  const isVisible = (id: FoldableSectionId) =>
    filled[id] ||
    pinned.has(id) ||
    (id === 'treaties' && promoteTreaties) ||
    (id === 'narrative' && isCollection)
  const folded = FOLDABLE_SECTIONS.filter((section) => !isVisible(section.id))
  const hasSummary = Boolean(event.description?.trim())
  const hasPromotedTreaty =
    promoteTreaties &&
    ((event.treaties?.length ?? 0) > 0 || overviewTreatyOpened || pinned.has('treaties'))
  const hasWarDeclarationParticipants =
    showWarDeclaration &&
    ((event.relatedCountries?.length ?? 0) > 0 ||
      (event.relatedHistoricalCountries?.length ?? 0) > 0)
  /** 개요 탭이 통째로 비어 있을 때 — 여러 빈 섹션 대신 단일 Empty State만 세운다 */
  const isOverviewTabEmpty =
    !hasSummary &&
    !summaryOpen &&
    !hasPromotedTreaty &&
    !hasWarDeclarationParticipants &&
    !filled.background &&
    !pinned.has('background') &&
    !filled.aftermath &&
    !pinned.has('aftermath') &&
    (isCollection ? childCount === 0 : !filled.narrative && !pinned.has('narrative'))

  /* 탭 — URL(?tab=)이 정본(replace: 탭을 오가도 '뒤로'가 탭을 되감지 않는다). 개요는 파라미터 없음 */
  const tabParam = searchParams.get('tab')
  const focusUnitId = searchParams.get('unit')?.trim() || null
  const isMilitaryTabContext =
    isMilitaryOperationsContext(event.type, event.domain) ||
    enabledModules.includes('sides') ||
    enabledModules.includes('military-details')
  const hasMultipleSides = (event.sides?.length ?? 0) >= 2
  const visibleTabs = useMemo(
    () =>
      (isCollection ? EVENT_TABS : EVENT_TABS.filter((tab) => tab.id !== 'survey')).map((tab) => {
        if (tab.id === 'actors' && hasMultipleSides) {
          return { ...tab, label: '참여 · 진영' }
        }
        if (tab.id === 'modules' && !isMilitaryTabContext) {
          return {
            ...tab,
            label: '수치 · 지표',
            hint: '사상자·피해액·득표율 등 출처 기반 정량 지표 비교',
          }
        }
        if (tab.id === 'modules') {
          return { ...tab, label: '수치 · 전력' }
        }
        return tab
      }),
    [isCollection, hasMultipleSides, isMilitaryTabContext],
  )
  const activeTab: EventTabId =
    isEventTab(tabParam) && visibleTabs.some((tab) => tab.id === tabParam)
      ? tabParam
      : !isCollection && (tabParam === 'survey' || focusUnitId)
        ? 'modules'
        : 'overview'
  /** '하위 사건으로 나누기'(단일 → 묶음) 모달 */
  const [splitOpen, setSplitOpen] = useState(false)
  /** 사건 종류 안내(머리의 '단일 사건 ?'·'최상위 사건 ?') */
  const [kindGuideOpen, setKindGuideOpen] = useState(false)
  const navigateTab = useNavigate()
  /**
   * 탭 바꾸기 — `setSearchParams`는 #해시를 버린다. 그래서 '#background'로 들어와도 탭을 맞추는 순간 주소에서
   * 위치가 사라져 새로고침·공유가 개요 맨 위로 갔다. 해시가 가리키는 섹션이 그 탭에 있으면 해시를 남긴다.
   */
  const setActiveTab = useCallback(
    (next: EventTabId) => {
      const params = new URLSearchParams(window.location.search)
      if (next === 'overview') params.delete('tab')
      else params.set('tab', next)
      const hash = window.location.hash.slice(1)
      const keepHash = hash && tabOfSection(decodeURIComponent(hash), promoteTreaties) === next
      const search = params.toString()
      navigateTab(
        { search: search ? `?${search}` : '', hash: keepHash ? `#${hash}` : '' },
        { replace: true },
      )
    },
    [navigateTab, promoteTreaties],
  )
  const tabOf = useCallback(
    (sectionId: string) => tabOfSection(sectionId, promoteTreaties),
    [promoteTreaties],
  )

  /* 탭 옆 건수 — 열어 보기 전에 어디에 기록이 있는지 */
  const countOf = (list?: unknown[] | null) => list?.length ?? 0
  const tabCounts: Record<EventTabId, number> = {
    overview: 0,
    survey: childCount,
    actors:
      countOf(event.relatedPersons) +
      countOf(event.relatedCountries) +
      countOf(event.relatedHistoricalCountries) +
      departmentCount +
      countOf(event.politicalParties) +
      countOf(event.organizations) +
      countOf(event.cabinetEvents) +
      (territoryQuery.data?.length ?? 0),
    modules: filledModuleCount,
    links:
      (promoteTreaties ? 0 : countOf(event.treaties)) +
      (event.parentEvent ? 1 : 0) +
      countOf(event.extraParents) +
      childCount +
      relatedCount +
      contextLinkCount,
    media: countOf(event.eventImages),
  }

  const hasActorsTabData =
    countOf(event.relatedCountries) > 0 ||
    countOf(event.relatedHistoricalCountries) > 0 ||
    countOf(event.relatedPersons) > 0 ||
    countOf(event.sides) > 0 ||
    departmentCount > 0 ||
    countOf(event.politicalParties) > 0 ||
    countOf(event.organizations) > 0 ||
    countOf(event.cabinetEvents) > 0 ||
    statehoodEntries(event).length > 0 ||
    (territoryQuery.data?.length ?? 0) > 0 ||
    hasPowerData(event)
  const isActorsTabEmpty = !hasActorsTabData && !actorsWorkspaceOpen

  const isModulesTabEmpty =
    filledModuleCount === 0 &&
    !metricsOpened &&
    !forcesOpened &&
    !modulesWorkspaceOpen

  const hasLinksTabData =
    (!promoteTreaties && countOf(event.treaties) > 0) ||
    Boolean(event.parentEvent) ||
    Boolean(event.parentEventId) ||
    countOf(event.extraParents) > 0 ||
    childCount > 0 ||
    relatedCount > 0 ||
    countOf(event.keywords) > 0 ||
    contextLinkCount > 0
  const isLinksTabEmpty =
    !hasLinksTabData &&
    (promoteTreaties || !pinned.has('treaties')) &&
    contextLinkOpenSeq === 0 &&
    !linksWorkspaceOpen

  const isMediaTabEmpty = countOf(event.eventImages) === 0
  const tabsAnchorRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  /**
   * 탭 바 높이를 CSS 변수(--event-tabs-height)로 — 탭 안에서 그 아래에 붙는 것(조망 섹션 목차)이
   * 탭 바 밑으로 숨지 않게. 탭 바는 sticky라 그 높이만큼 아래가 '화면 위쪽'이다.
   */
  useEffect(() => {
    const bar = tabsRef.current
    const host = bar?.parentElement?.parentElement
    if (!bar || !host || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(() =>
      host.style.setProperty('--event-tabs-height', `${bar.offsetHeight}px`),
    )
    observer.observe(bar)
    return () => observer.disconnect()
  }, [])
  /**
   * 탭 줄이 가로로 넘칠 때(휴대폰 폭) — 잘린 쪽에 페이드를 걸어 '더 있다'를 알리고(예전엔 '연…'에서 말없이 잘렸다),
   * 선택한 탭이 화면 밖이면 그 탭까지 민다(딥링크 ?tab=media로 들어온 경우).
   */
  useEffect(() => {
    const bar = tabsRef.current
    if (!bar) return undefined
    const sync = () => {
      const overflowStart = bar.scrollLeft > 2
      const overflowEnd = bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 2
      bar.toggleAttribute('data-fade-start', overflowStart)
      bar.toggleAttribute('data-fade-end', overflowEnd)
    }
    sync()
    bar.addEventListener('scroll', sync, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(sync)
    observer?.observe(bar)
    return () => {
      bar.removeEventListener('scroll', sync)
      observer?.disconnect()
    }
  }, [])
  useEffect(() => {
    const bar = tabsRef.current
    const selectedTab = bar?.querySelector<HTMLElement>(`#event-tab-${activeTab}`)
    if (!bar || !selectedTab || bar.scrollWidth <= bar.clientWidth) return
    const barRect = bar.getBoundingClientRect()
    const tabRect = selectedTab.getBoundingClientRect()
    if (tabRect.left < barRect.left || tabRect.right > barRect.right) {
      bar.scrollTo({ left: bar.scrollLeft + tabRect.left - barRect.left - 24 })
    }
  }, [activeTab])
  const isFirstTabRef = useRef(true)
  useEffect(() => {
    if (isFirstTabRef.current) {
      isFirstTabRef.current = false
      return
    }
    const anchor = tabsAnchorRef.current
    const tabs = tabsRef.current
    if (anchor && tabs && anchor.getBoundingClientRect().top < tabs.getBoundingClientRect().top - 1) {
      anchor.scrollIntoView({ block: 'start' })
    }
  }, [activeTab])

  /** ←/→/Home/End 탭 이동(ARIA 탭 패턴) — 포커스와 선택이 함께 */
  const handleTabKeyDown = (keyEvent: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(keyEvent.key)) return
    keyEvent.preventDefault()
    const current = visibleTabs.findIndex((tab) => tab.id === activeTab)
    const last = visibleTabs.length - 1
    const nextIndex =
      keyEvent.key === 'Home'
        ? 0
        : keyEvent.key === 'End'
          ? last
          : keyEvent.key === 'ArrowLeft'
            ? current === 0
              ? last
              : current - 1
            : current === last
              ? 0
              : current + 1
    const next = visibleTabs[nextIndex].id
    setActiveTab(next)
    tabsRef.current?.querySelector<HTMLButtonElement>(`#event-tab-${next}`)?.focus()
  }

  /* 펼친 섹션으로 스크롤 — 펼침이 렌더에 반영된 뒤라야 앵커가 존재한다.
     빈 섹션은 짧아(제목 + 안내 한 줄) 'start'로 올리면 문서 끝에 걸려 위로 지나치기 쉽다 —
     가운데에 세워 앞뒤 맥락과 함께 보이게 한다. */
  const [revealTarget, setRevealTarget] = useState<FoldableSectionId | null>(null)
  const [narrativeAutoStart, setNarrativeAutoStart] = useState<{
    kind: 'background' | 'narrative' | 'aftermath'
    seq: number
  } | null>(null)
  const revealSection = useCallback(
    (id: FoldableSectionId) => {
      if (id === 'treaties') {
        if (promoteTreaties) setOverviewTreatyOpened(true)
        else setLinksWorkspaceOpen(true)
      }
      setActiveTab(tabOf(id))
      setPinned((prev) => new Set(prev).add(id))
      setRevealTarget(id)
      if (id === 'background' || id === 'narrative' || id === 'aftermath') {
        setNarrativeAutoStart((prev) => ({ kind: id, seq: (prev?.seq ?? 0) + 1 }))
      }
    },
    [promoteTreaties, setActiveTab, tabOf],
  )
  useEffect(() => {
    if (!revealTarget) return
    scrollToAnchor(revealTarget, { block: 'center', updateHash: false })
    setRevealTarget(null)
  }, [revealTarget])

  /**
   * 목차 — 보이는 섹션만. 배경·전개·여파는 단락이 2개 이상이면 단락 목차를 단다.
   * 예전엔 빈 섹션까지 전부 세워 '이 문서에 무엇이 있는지'를 부풀려 말했다.
   */
  const visibleKey = FOLDABLE_SECTIONS.map((section) =>
    isVisible(section.id) ? '1' : '0',
  ).join('')
  const sections = useMemo(() => {
    const items: OutlineItem[] = []
    const shown = (id: FoldableSectionId) =>
      visibleKey[FOLDABLE_SECTIONS.findIndex((section) => section.id === id)] ===
      '1'
    /**
     * 묶음의 전개 목차 — 본문과 **같은 차례**(국면이 있으면 국면별로 모은 순서)와 같은 표지.
     * 본문은 번호 노드를 지웠는데 목차만 1·2·3을 달아, 본문에 없는 번호를 가리켰다 → 시작 날짜(앞 줄과 같은 해는 생략).
     */
    const collectionOutline = () => {
      const dated = [...(event.childEvents ?? []), ...(event.extraChildren ?? [])].sort((first, second) =>
        compareEventStart(first.startDate, second.startDate),
      )
      const chapters = [...(event.phases ?? [])].sort((left, right) => left.order - right.order)
      const reachById = new Map(
        dated.map((child) => [
          child.id,
          phaseReach(chapters, {
            id: child.id,
            phaseId: (child as { phaseId?: string | null }).phaseId ?? null,
            startDate: child.startDate,
            startDatePrecision: child.startDatePrecision,
          }),
        ]),
      )
      const ordered =
        chapters.length > 0 ? orderByPhase(dated, reachById) : groupByPhase(dated, event).flatMap((group) => group.items)
      return ordered.map((child, position) => {
        const previous = ordered[position - 1]
        /* 시작만 쓰되 정밀도는 끝까지 본 행 전체로 — 정밀도 없는 '7.1 ~ 12.31'은 '7월' */
        const marker = compactStartText(child, previous ?? null) ?? undefined
        if (chapters.length === 0) return { id: `narrative-${child.id}`, label: child.title, marker }
        const reach = reachById.get(child.id)!
        const chapter = reach.from != null ? chapters[reach.from - 1] : null
        return {
          id: `narrative-${child.id}`,
          label: child.title,
          marker,
          chapter: chapter ? `${reach.from}국면 · ${chapter.title}` : phaseReachLabel(reach),
        }
      })
    }
    const withParagraphs = (kind: 'background' | 'narrative' | 'aftermath') => {
      /* 묶음의 전개는 하위 사건이 맡는다 — 목차도 화면과 같은 차례로 하위를 가리킨다 */
      const children =
        kind === 'narrative' && event.kind === 'COLLECTION'
          ? collectionOutline()
          : paragraphOutline(event, kind)
      return children.length >= 2 ? children : undefined
    }

    /* 개요에서 요약 바로 뒤, 배경 앞에 선다 — 목차도 같은 차례 */
    if (!isOverviewTabEmpty) {
      if (showWarDeclaration) items.push({ id: 'war-declaration', label: '선전포고 당사국' })
      if (shown('background'))
        items.push({
          id: 'background',
          label: '배경',
          children: withParagraphs('background'),
        })
      if (shown('narrative'))
        items.push({
          id: 'narrative',
          label: '전개',
          children: withParagraphs('narrative'),
        })
      if (shown('aftermath'))
        items.push({
          id: 'aftermath',
          label: '여파',
          children: withParagraphs('aftermath'),
        })
      if (promoteTreaties && shown('treaties')) items.push({ id: 'treaties', label: '조약' })
    }

    if (!isActorsTabEmpty) {
      if (!trashedView || shown('actors')) items.push({ id: 'actors', label: '참여 국가·인물' })
      if (departmentCount > 0 || expectDepartments) items.push({ id: 'departments', label: '국가 기관·사령부' })
      const politicalPartyCount = (event.politicalParties ?? []).length
      if (politicalPartyCount > 0 || features.expectPoliticalParties) {
        items.push({ id: 'political-parties', label: '관련 정당' })
      }
      const nonCompanyOrgCount = (event.organizations ?? []).filter((orgRel) => !orgRel.companyId).length
      const companyOrgCount = (event.organizations ?? []).filter((orgRel) => Boolean(orgRel.companyId)).length
      if (
        nonCompanyOrgCount > 0 ||
        event.type === 'SUMMIT' ||
        event.type === 'INSTITUTION'
      ) {
        items.push({ id: 'organizations', label: '관련 기구·조직' })
      }
      if (
        companyOrgCount > 0 ||
        event.type === 'COMPANY' ||
        event.type === 'PRODUCT'
      ) {
        items.push({ id: 'companies', label: '관련 기업' })
      }
      if ((event.cabinetEvents?.length ?? 0) > 0)
        items.push({ id: 'module-cabinets', label: '관련 행정부' })
      if (showStatehood) items.push({ id: 'statehood', label: '성립·소멸' })
      if (showTerritory) items.push({ id: 'territory', label: '영토 이전' })
      if (showPower) items.push({ id: 'power', label: '권력 교체·선거' })
    }

    if (!isModulesTabEmpty) {
      if (!trashedView || enabledModules.includes('metrics'))
        items.push({ id: 'module-metrics', label: isMilitaryTabContext ? '정량 수치' : '수치 · 지표' })
      if (enabledModules.includes('sides'))
        items.push({ id: 'module-sides', label: '전투서열·병기·교리' })
      if (enabledModules.includes('military-details'))
        items.push({ id: 'module-military-details', label: '작전 정보' })
    }

    if (!isLinksTabEmpty) {
      if (!promoteTreaties && shown('treaties')) items.push({ id: 'treaties', label: '조약' })
      if (!trashedView || shown('network')) items.push({ id: 'network', label: '연관 사건·키워드' })
      if (contextLinkCount > 0 || contextLinkOpenSeq > 0)
        items.push({ id: 'context-links', label: '배경 맥락' })
    }
    if (shown('appendix')) items.push({ id: 'appendix', label: '이미지' })
    // 댓글 — 최상위 사건은 댓글 스레드, 하위 사건은 상위 댓글로 유도하는 안내(둘 다 #comments
    // 앵커를 렌더하므로 rail 항목은 항상 노출). 백엔드가 하위 사건엔 댓글을 노출/허용하지
    // 않아(스코프 불일치) 하위에선 스레드 대신 안내만 보여준다.
    if (!event.deletedAt && !isOverviewTabEmpty) items.push({ id: 'comments', label: '댓글' })

    return items
  }, [
    visibleKey,
    event,
    trashedView,
    enabledModules,
    isMilitaryTabContext,
    promoteTreaties,
    showWarDeclaration,
    showStatehood,
    showTerritory,
    showPower,
    departmentCount,
    expectDepartments,
    features.expectPoliticalParties,
    contextLinkCount,
    contextLinkOpenSeq,
    isOverviewTabEmpty,
    isActorsTabEmpty,
    isModulesTabEmpty,
    isLinksTabEmpty,
  ])

  /**
   * URL hash → 섹션 스크롤. 사건 id가 바뀐 첫 렌더에서 1회만 실행.
   * (deps에 event 전체를 두면 매 patch refetch마다 재실행돼 편집 중 위로 점프하는 회귀.)
   */
  const scrolledHashForEventRef = useRef<string | null>(null)
  /* 해시가 다른 탭의 섹션이면 그 탭을 먼저 열고, 렌더된 다음에 스크롤한다 */
  const [pendingHash, setPendingHash] = useState<string | null>(null)
  /** 장부의 '바로 가기' — 그 섹션의 탭을 열고, 렌더된 다음 스크롤(해시 진입과 같은 길) */
  const jumpToSection = useCallback(
    (anchorId: string) => {
      if (anchorId === 'module-metrics') {
        setMetricsOpened(true)
        setModulesWorkspaceOpen(true)
      }
      if (anchorId === 'module-sides') {
        setForcesOpened(true)
        setModulesWorkspaceOpen(true)
      }
      if (
        /^(statehood|territory|power|departments|political-parties|organizations|companies|module-cabinets)$/.test(
          anchorId,
        )
      ) {
        setActorsWorkspaceOpen(true)
      }
      if (anchorId === 'context-links') {
        setLinksWorkspaceOpen(true)
      }
      setActiveTab(tabOf(anchorId))
      setPendingHash(anchorId)
    },
    [setActiveTab, tabOf],
  )
  useEffect(() => {
    if (scrolledHashForEventRef.current === event.id) return
    scrolledHashForEventRef.current = event.id
    const hash = window.location.hash.slice(1)
    if (!hash) return
    // 비어서 접힌 섹션(#background 등)은 그 자리가 아예 없다 — 조망 점검표의 '채우러 가기'가
    // 여기로 온다. 채우기 칩을 누른 것처럼 펼친 다음 스크롤한다
    if (FOLDABLE_SECTIONS.some((section) => section.id === hash)) {
      revealSection(hash as FoldableSectionId)
      return
    }
    setActiveTab(tabOf(hash))
    setPendingHash(hash)
  }, [event.id, setActiveTab, tabOf, revealSection])
  useEffect(() => {
    if (!pendingHash) return
    const target = document.getElementById(pendingHash)
    if (!target) return
    setPendingHash(null)
    /* 줄여 둔 배경 안의 단락(#background-3)이면 펼친 뒤에 잰다 — 펼치기는 flushSync라
       effect 안(렌더 중)에서는 못 부른다. 다음 프레임에 넘겨 React 바깥에서 부른다. */
    /* cleanup으로 취소하지 않는다 — 바로 위 setPendingHash(null)이 이 effect를 다시 돌려 취소해 버린다 */
    window.requestAnimationFrame(() => scrollToAnchor(pendingHash, { updateHash: false }))
  }, [pendingHash, activeTab])

  /**
   * 진영 시작 — 참여국 역할(주도·대상…)로 편을 가를 수 있으면 **초안**을 보여 주고 확인받아 만든다
   * (side-draft.lib). 가를 수 없으면 예전처럼 빈 '진영 1·2'. 초안의 나라 배정은 사건 patch라
   * 되돌리기(Ctrl+Z 토스트)로 무를 수 있다 — 진영 자체는 진영 모듈에서 지운다.
   */
  const startSides = async () => {
    try {
      const draft = draftSidesFromRoles(event.relatedCountries, event.relatedHistoricalCountries)
      if (!draft) {
        await syncEventSides(event.id, [
          { name: '진영 1', level: 'COALITION', color: '#1d4ed8' },
          { name: '진영 2', level: 'COALITION', color: '#b91c1c' },
        ])
        await queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) })
        return
      }

      const [sideA, sideB] = draft.sides
      const ok = await confirm({
        title: '참여국 역할로 진영 나누기',
        message:
          `${sideA.name}: ${sideA.memberNames.join(', ')} / ${sideB.name}: ${sideB.memberNames.join(', ')}` +
          (draft.unassigned.length > 0
            ? ` — ${draft.unassigned.join(', ')}은(는) 역할만으로 편을 알 수 없어 넣지 않습니다.`
            : '') +
          ' 진영 이름과 승패 결과는 바로 이 자리에서 고칠 수 있습니다.',
        confirmLabel: '이대로 만들기',
      })
      if (!ok) return

      const created = await syncEventSides(event.id, draft.sides.map((side) => ({
        name: side.name,
        level: 'COALITION' as const,
        color: side.color,
      })))
      /*
       * 진영을 반영한 상세를 **먼저** 받아 두고 나서 배정 patch를 보낸다. 순서를 바꾸면(patch 뒤
       * invalidate) 재조회 GET이 patch보다 먼저 끝나 배정 전 상태로 화면을 덮는다(실측 — DB엔 들어갔는데
       * 새로고침 전까지 '진영 미지정'으로 보였다). patch 응답은 useEventMutation이 캐시에 반영한다.
       */
      await queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) })
      const ordered = [...created].sort((left, right) => left.sortOrder - right.sortOrder)
      const sideIdByKey = new Map<string, string>()
      draft.sides.forEach((side, index) => {
        const sideId = ordered[index]?.id
        if (sideId) for (const key of side.memberKeys) sideIdByKey.set(key, sideId)
      })
      /* sideId를 안 보낸 줄은 서버가 그대로 둔다(undefined = 무변경) */
      onPatch({
        relatedCountries: toParticipants(event.relatedCountries, event.relatedHistoricalCountries).map(
          (participant) => {
            const sideId = sideIdByKey.get(participantKey(participant))
            return sideId ? { ...participant, sideId } : participant
          },
        ),
      } as UpdateEventDto)
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '진영을 만들지 못했습니다')
    }
  }

  const showForcesModule = async () => {
    setForcesOpened(true)
    if ((event.sides?.length ?? 0) === 0) {
      await startSides()
    }
  }
  const treatiesSection = isVisible('treaties') ? (
    <DetailTreaties
      event={event}
      openLinkSeq={treatyOpenLinkSeq}
      onInvalidate={() =>
        void queryClient.invalidateQueries({
          queryKey: eventKeys.detail(event.id),
        })
      }
    />
  ) : null

  const isActiveTabEmpty =
    (activeTab === 'overview' && isOverviewTabEmpty) ||
    (activeTab === 'survey' && childCount === 0) ||
    (activeTab === 'actors' && isActorsTabEmpty) ||
    (activeTab === 'modules' && isModulesTabEmpty) ||
    (activeTab === 'links' && isLinksTabEmpty) ||
    (activeTab === 'media' && isMediaTabEmpty)

  const foldedInActiveTab = isActiveTabEmpty
    ? []
    : folded.filter(
        (section) =>
          tabOf(section.id) === activeTab &&
          !(activeTab === 'actors' && section.id === 'actors') &&
          !(activeTab === 'links' && (section.id === 'treaties' || section.id === 'network')) &&
          !(activeTab === 'media' && section.id === 'appendix'),
      )

  /* Page = 내부 스크롤 컨테이너 — 읽기 진행률 바가 이 ref로 scrollTop을 읽는다. */
  const scrollRef = useRef<HTMLDivElement>(null)
  const accentColor = eventDomainDef(event.domain).color

  const activeTabOutline = sections.filter((item) => tabOf(item.id) === activeTab)
  const showRail =
    activeTab === 'overview'
      ? activeTabOutline.length >= 3 || activeTabOutline.some((item) => Boolean(item.children?.length))
      : (activeTab === 'actors' || activeTab === 'modules' || activeTab === 'links') &&
        activeTabOutline.length >= 2

  /**
   * 삭제(휴지통) — 히어로 ⋯ 메뉴. 지우면 목록으로 나간다(지운 사건의 상세에 머물 이유가 없다).
   * 휴지통에 있는 사건은 상세가 그냥 열려 편집 버튼이 다 살아 있었다(서버는 수정을 409로 거부) — 위에 띠를 두고
   * 본문을 inert로 잠근다(읽기만, 클릭·포커스·편집 없음). 띠에서 바로 복구·영구 삭제.
   */
  const navigate = useNavigate()
  const isTrashed = Boolean(event.deletedAt)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [trashBusy, setTrashBusy] = useState(false)
  const deleteToTrash = useDeleteEventToTrash()
  const trashTarget = { id: event.id, title: event.title, parentEventId: event.parentEventId ?? null }
  /**
   * 상위에서 빼기(종속 해제) — ⋯ 메뉴. 확인 뒤 parentEventId: null(되돌리기 토스트 포함).
   * 추가 상위가 있으면 서버가 409(추가 상위는 주 상위 전제)라 대표 승격을 고르는 연관 탭 소속 줄로 보낸다.
   */
  const detachFromParent = async () => {
    const parent = event.parentEvent
    if (!parent) return
    if ((event.extraParents?.length ?? 0) > 0) {
      setActiveTab('links')
      notify.info('추가 상위가 있어 연관 탭 맨 위 소속 줄에서 대표 상위를 정한 뒤 빼세요')
      return
    }
    const ok = await confirm({
      title: '상위 사건에서 빼기',
      message: `‘${event.title}’을(를) ‘${parent.title}’의 하위에서 뺄까요?\n이 사건은 최상위 사건이 되고, ‘${parent.title}’은(는) 그대로 남습니다.`,
      confirmLabel: '빼기',
    })
    if (!ok) return
    onPatch({ parentEventId: null } as unknown as UpdateEventDto, { savedLabel: `‘${parent.title}’에서 뺌` })
  }
  const confirmDelete = async (withChildren: boolean) => {
    setTrashBusy(true)
    const ok = await deleteToTrash(trashTarget, withChildren)
    setTrashBusy(false)
    setDeleteOpen(false)
    if (ok) navigate(pathKeys.events.root())
  }
  const restoreFromTrash = async () => {
    setTrashBusy(true)
    await restoreEventFromTrash(queryClient, trashTarget)
    setTrashBusy(false)
  }
  const deleteForever = async () => {
    const ok = await confirm({
      title: '영구 삭제',
      message: `'${event.title}'을(를) 영구 삭제할까요? 되돌릴 수 없습니다. 함께 지운 하위 사건도 함께 사라집니다.`,
      confirmLabel: '영구 삭제',
      danger: true,
    })
    if (!ok) return
    setTrashBusy(true)
    try {
      await permanentlyDeleteEvent(event.id)
      notify.success(`'${event.title}'을(를) 영구 삭제했습니다`)
      void queryClient.invalidateQueries({ queryKey: ['events'] })
      navigate(pathKeys.events.root())
    } catch {
      notify.error('영구 삭제하지 못했습니다')
      setTrashBusy(false)
    }
  }
  const trashDaysLeft = event.deletedAt
    ? Math.max(0, TRASH_RETENTION_DAYS - Math.floor((Date.now() - new Date(event.deletedAt).getTime()) / 86_400_000))
    : null

  return (
    <InlineEditProvider imageCategory="events">
      <S.Page ref={scrollRef}>
        <ReadingProgress targetRef={scrollRef} color={accentColor} />
        <S.PageInner>
          <SaveStatus isPending={mutation.isPending} lastSavedAt={lastSavedAt} />
          {isTrashed && (
            <TrashBanner role="status">
              <TrashText>
                <strong>휴지통에 있는 사건입니다.</strong> 읽기만 할 수 있습니다
                {trashDaysLeft != null && ` · ${trashDaysLeft}일 뒤 자동으로 영구 삭제`}
              </TrashText>
              <TrashActions>
                <TrashButton type="button" $primary onClick={() => void restoreFromTrash()} disabled={trashBusy}>
                  복구
                </TrashButton>
                <TrashButton type="button" onClick={() => void deleteForever()} disabled={trashBusy}>
                  영구 삭제
                </TrashButton>
              </TrashActions>
            </TrashBanner>
          )}
          <S.Body
            inert={isTrashed}
            data-trashed={isTrashed || undefined}
            /* 조망은 대시보드라 본문이 장부 칸까지 넓게 쓴다(S.Body data-wide) */
            data-wide={activeTab === 'survey' || undefined}
          >
            <DetailHero
              event={event}
              onPatch={onPatch}
              withSummary={false}
              /* 휴지통 사건은 사진이 없으면 '대표 이미지 추가' 칸을 세우지 않는다 */
              onOpenMedia={
                isTrashed && (event.eventImages?.length ?? 0) === 0 ? undefined : () => setActiveTab('media')
              }
              onOpenKindGuide={() => setKindGuideOpen(true)}
              menu={
                isTrashed ? undefined : (
                  <EventActionsMenu
                    onDelete={() => setDeleteOpen(true)}
                    parentTitle={event.parentEvent?.title ?? null}
                    onDetachFromParent={() => void detachFromParent()}
                    onAddSubtitle={!event.subtitle?.trim() ? () => setSubtitleOpen(true) : undefined}
                    onAddOriginalTitle={
                      !event.originalTitle?.trim() ? () => setOriginalTitleOpen(true) : undefined
                    }
                    onAddPrimaryImage={
                      (event.eventImages?.length ?? 0) === 0 ? () => revealSection('appendix') : undefined
                    }
                  />
                )
              }
              subtitleOpen={subtitleOpen}
              onSubtitleClose={() => setSubtitleOpen(false)}
              originalTitleOpen={originalTitleOpen}
              onOriginalTitleClose={() => setOriginalTitleOpen(false)}
            />

            <S.TabsArea>
              <div ref={tabsAnchorRef} />
              <S.TabBar
                ref={tabsRef}
                role="tablist"
                aria-label="사건 정보 보기"
                onKeyDown={handleTabKeyDown}
              >
                {visibleTabs.map((tab) => {
                  const count = tabCounts[tab.id]
                  const selected = activeTab === tab.id
                  const isEmptyTab = tab.id !== 'overview' && count === 0
                  return (
                    <S.Tab
                      key={tab.id}
                      type="button"
                      role="tab"
                      id={`event-tab-${tab.id}`}
                      aria-controls={`event-panel-${tab.id}`}
                      aria-selected={selected}
                      tabIndex={selected ? 0 : -1}
                      $active={selected}
                      /* 기록이 없는 탭은 한 단 흐리게 — 눌러 봐야 '아직 …없습니다'인 탭이 셋씩 서 있었다(누르면 그대로 추가 안내) */
                      data-empty={isEmptyTab ? 'true' : undefined}
                      title={isEmptyTab ? `${tab.hint} — 아직 없음` : tab.hint}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                      {count > 0 && <S.TabCount>{count}</S.TabCount>}
                    </S.Tab>
                  )
                })}
              </S.TabBar>
            </S.TabsArea>

            {/* 문서 열이 DOM에서 먼저 온다 — 읽기·스크린리더 순서는 '글 → 장부'.
                좁은 폭에서 장부가 위로 올라가는 것은 시각 순서만 바꾸는 order다. */}
            <S.Main
              role="tabpanel"
              id={`event-panel-${activeTab}`}
              aria-labelledby={`event-tab-${activeTab}`}
            >
              {activeTab === 'overview' && (
                <>
                  {isOverviewTabEmpty ? (
                    <CollectionWholeTextNotice
                      event={event}
                      readOnly={trashedView}
                      onWriteSummary={() => setSummaryOpen(true)}
                      onWriteBackground={() => revealSection('background')}
                      onWriteNarrative={!isCollection ? () => revealSection('narrative') : undefined}
                      onWriteAftermath={() => revealSection('aftermath')}
                      onGatherExisting={isCollection ? () => setActiveTab('links') : undefined}
                      onAddTreaty={
                        promoteTreaties
                          ? () => {
                              setOverviewTreatyOpened(true)
                              setTreatyOpenLinkSeq((seq) => seq + 1)
                              revealSection('treaties')
                            }
                          : undefined
                      }
                    />
                  ) : (
                    <>
                      <DetailSummary
                        event={event}
                        onPatch={onPatch}
                        autoEdit={summaryOpen && !hasSummary}
                      />
                      {showWarDeclaration && (
                        <DetailWarDeclaration
                          event={event}
                          expectWarDeclaration={features.expectWarDeclaration}
                          onCountryClick={onCountryClick}
                          onPatch={trashedView ? undefined : onPatch}
                          onJumpToActors={() => jumpToSection('actors')}
                        />
                      )}
                      <DetailNarrative
                        event={event}
                        onPatch={onPatch}
                        onPersonClick={onPersonClick}
                        onPersonEntityLink={onPersonEntityLink}
                        visible={{
                          background: isVisible('background'),
                          narrative: isVisible('narrative'),
                          aftermath: isVisible('aftermath'),
                        }}
                        developmentSlot={
                          isCollection ? (
                            <CollectionDevelopment
                              event={event}
                              onPatch={onPatch}
                              onGatherExisting={() => setActiveTab('links')}
                            />
                          ) : undefined
                        }
                        onRequestSplit={isCollection ? undefined : () => setSplitOpen(true)}
                        autoStartTarget={narrativeAutoStart}
                      />
                      {/* 회담/조약 사건은 조약이 그 사건의 결과물이라 개요에 둔다 */}
                      {promoteTreaties && treatiesSection}
                    </>
                  )}
                </>
              )}

              {activeTab === 'survey' && (
                /* 청크 받기와 데이터 받기(패널 안)가 같은 로딩을 써서 같은 자리에서 이어진다 */
                <Suspense fallback={<EventPanelLoading label="하위 사건을 모으는 중…" />}>
                  <LazyEventOverviewPanel
                    eventId={event.id}
                    readOnly={trashedView}
                    accessionTargets={[
                      ...(event.relatedCountries ?? []).map((country) => ({ kind: 'C' as const, id: country.id })),
                      ...(event.relatedHistoricalCountries ?? []).map((country) => ({
                        kind: 'H' as const,
                        id: country.id,
                      })),
                    ]}
                    onGatherExisting={() => setActiveTab('links')}
                    onPersonClick={onPersonClick}
                  />
                </Suspense>
              )}

              {activeTab === 'actors' && (
                <>
                  <DetailActors
                    event={event}
                    departmentCount={departmentCount}
                    readOnly={trashedView}
                    fullTabEmpty={isActorsTabEmpty}
                    onOpenExtendedActors={() => setActorsWorkspaceOpen(true)}
                    onPatch={onPatch}
                    onPersonClick={onPersonClick}
                    onCountryClick={onCountryClick}
                    onStartSides={trashedView ? undefined : () => void startSides()}
                    onShowMetrics={() => jumpToSection('module-metrics')}
                  />

                  {!isActorsTabEmpty && (
                    <>
                      {/* 2단: 이미 등록되었거나 사건 성격상 기본 펼쳐지는 기관·정당·기구·기업·행정부 */}
                      <DetailDepartments
                        event={event}
                        expectDepartments={expectDepartments}
                        readOnly={trashedView}
                        displayFilter="expanded-only"
                      />
                      <DetailPoliticalParties
                        event={event}
                        readOnly={trashedView}
                        displayFilter="expanded-only"
                        onPatch={onPatch}
                      />
                      {(!trashedView || showOrganizations) && (
                        <DetailOrganizations
                          event={event}
                          expectOrganizations={features.expectOrganizations}
                          readOnly={trashedView}
                          displayFilter="expanded-only"
                          onPatch={onPatch}
                        />
                      )}
                      {(event.cabinetEvents?.length ?? 0) > 0 && <ModuleCabinets event={event} />}

                      {/* 2단 보조: 아직 비어 있는 기관·단체 추가 연결 안내 (섹션과 뒤섞이지 않게 한곳에 모음) */}
                      {!trashedView && (
                        <ActorLinkExtrasSection aria-label="기관·정당·기구·기업 참여 주체 연결">
                          <ActorLinkExtrasHeader>
                            <span>기관 · 정당 · 단체 추가 연결</span>
                            <small>국가·인물 외에 이 사건에 직접 관여한 기관이나 단체가 있다면 선택해 연결합니다.</small>
                          </ActorLinkExtrasHeader>
                          <ActorLinkExtras>
                            <DetailDepartments
                              event={event}
                              expectDepartments={expectDepartments}
                              readOnly={trashedView}
                              displayFilter="collapsed-only"
                            />
                            <DetailPoliticalParties
                              event={event}
                              readOnly={trashedView}
                              displayFilter="collapsed-only"
                              onPatch={onPatch}
                            />
                            <DetailOrganizations
                              event={event}
                              expectOrganizations={features.expectOrganizations}
                              readOnly={trashedView}
                              displayFilter="collapsed-only"
                              onPatch={onPatch}
                            />
                          </ActorLinkExtras>
                        </ActorLinkExtrasSection>
                      )}

                      {/* 3단: 사건으로 인한 국가 성립·영토·권력 변동 (참여 주체 목록과 명확히 구분) */}
                      {(showStatehood || showTerritory || showPower) && (
                        <OutcomeChapterSection aria-label="사건 결과 및 제도 변동">
                          <OutcomeChapterHeader>
                            <strong>사건 결과 · 제도 변동</strong>
                            <small>이 사건으로 성립·소멸한 국가, 이전된 영토, 교체된 권력·선거를 기록합니다.</small>
                          </OutcomeChapterHeader>
                          {showStatehood && (
                            <DetailStatehood
                              event={event}
                              expectStatehood={features.expectStatehood}
                              onCountryClick={onCountryClick}
                              onPersonClick={onPersonClick}
                              onPatch={onPatch}
                            />
                          )}
                          {showTerritory && (
                            <DetailTerritory
                              event={event}
                              expectTerritory={features.expectTerritory}
                              readOnly={trashedView}
                              onCountryClick={onCountryClick}
                            />
                          )}
                          {showPower && (
                            <DetailPower
                              event={event}
                              expectPower={features.expectPower}
                              onPersonClick={onPersonClick}
                            />
                          )}
                        </OutcomeChapterSection>
                      )}
                    </>
                  )}
                </>
              )}

              {activeTab === 'modules' && (
                <>
                  <ModuleMetrics
                    event={event}
                    readOnly={trashedView}
                    isMilitaryContext={isMilitaryTabContext}
                    fullTabEmpty={isModulesTabEmpty}
                    onStartForces={
                      !trashedView && isMilitaryTabContext
                        ? () => void showForcesModule()
                        : undefined
                    }
                    onOpenModulesWorkspace={() => {
                      setMetricsOpened(true)
                      setModulesWorkspaceOpen(true)
                    }}
                  />
                  {!isModulesTabEmpty && (
                    <>
                      {enabledModules.includes('sides') && (
                        <ModuleSides
                          event={event}
                          onPatch={onPatch}
                          focusUnitId={focusUnitId}
                          onJumpToActors={() => setActiveTab('actors')}
                          onStartSides={trashedView ? undefined : startSides}
                        />
                      )}
                      {enabledModules.includes('military-details') && (
                        <ModuleMilitaryDetails event={event} onPatch={onPatch} />
                      )}
                      {!trashedView && (
                        <ModuleAdd
                          event={event}
                          enabledModules={
                            enabledModules.includes('metrics')
                              ? enabledModules
                              : [...enabledModules, 'metrics']
                          }
                          onPatch={onPatch}
                          onShowForces={showForcesModule}
                          onShowMetrics={() => setMetricsOpened(true)}
                        />
                      )}
                    </>
                  )}
                </>
              )}

              {activeTab === 'links' && (
                <>
                  {!isLinksTabEmpty && !promoteTreaties && treatiesSection}
                  <DetailNetwork
                    readOnly={trashedView}
                    fullTabEmpty={isLinksTabEmpty}
                    onOpenLinksWorkspace={() => setLinksWorkspaceOpen(true)}
                    event={event}
                    onPatch={onPatch}
                    onRequestSplit={() => setSplitOpen(true)}
                    onAddTreaty={
                      !promoteTreaties && !isVisible('treaties')
                        ? () => {
                            setTreatyOpenLinkSeq((seq) => seq + 1)
                            revealSection('treaties')
                          }
                        : undefined
                    }
                    onAddContextLink={
                      !trashedView
                        ? () => {
                            setLinksWorkspaceOpen(true)
                            setContextLinkOpenSeq((seq) => seq + 1)
                          }
                        : undefined
                    }
                    contextLinksOpened={contextLinkOpenSeq > 0}
                  />
                  {!isLinksTabEmpty && (
                    <DetailContextLinks
                      event={event}
                      readOnly={trashedView}
                      openAddSeq={contextLinkOpenSeq}
                      hideCollapsedSlot={!trashedView}
                    />
                  )}
                </>
              )}

              {activeTab === 'media' && (
                <DetailAppendix event={event} readOnly={trashedView} onPatch={onPatch} />
              )}

              {/* 이 탭에서 내용이 없어 접힌 섹션들 — 탭 전체가 비어 있을 땐 Empty State가 단독으로 서므로 숨긴다 */}
              {!isActiveTabEmpty && !trashedView && (
                <FillInStrip items={foldedInActiveTab} onReveal={revealSection} />
              )}

              {activeTab === 'overview' && !trashedView && (
                <CommentsSection id="comments">
                  <S.SectionHeaderGroup>
                    <S.SectionHeader>
                      <S.SectionTitle>댓글</S.SectionTitle>
                    </S.SectionHeader>
                    <SectionHintText>
                      이 사건 기록의 사료 출처, 보완 의견, 편집 논의를 남깁니다.
                    </SectionHintText>
                  </S.SectionHeaderGroup>
                  {event.parentEvent ? (
                    // 하위 사건은 자체 댓글 스레드가 없다 — 논의가 이어지는 상위 사건 댓글로 유도.
                    // 분기 기준은 *생존* 상위(parentEvent 객체) — 상위가 소프트삭제되면 스칼라
                    // parentEventId만 남는데(유령), 그걸 기준 삼으면 삭제된 사건으로 유도하는
                    // 데드엔드가 된다. 유령 상태는 실질 루트로 보고 스레드를 렌더(서버 게이트 동일).
                    <S.HelperText>
                      이 사건은 하위 사건입니다 — 논의는{' '}
                      <ParentCommentsLink
                        to={`${pathKeys.events.detail(event.parentEvent.id)}#comments`}
                      >
                        상위 사건 댓글
                      </ParentCommentsLink>
                      에서 이어집니다.
                    </S.HelperText>
                  ) : (
                    <CommentSection ownerType="EVENT" recordId={eventId} />
                  )}
                </CommentsSection>
              )}
            </S.Main>

            <S.Aside>
              <DetailFacts
                event={event}
                onPatch={onPatch}
                contemporaryLink={<ContemporaryHeadsLink event={event} />}
                onCountryClick={onCountryClick}
                onPersonClick={onPersonClick}
                onJump={jumpToSection}
                onAddSubtitle={trashedView ? undefined : () => setSubtitleOpen(true)}
                onAddOriginalTitle={trashedView ? undefined : () => setOriginalTitleOpen(true)}
                onAddPrimaryImage={
                  trashedView || (event.eventImages?.length ?? 0) > 0
                    ? undefined
                    : () => revealSection('appendix')
                }
              />
              {/* 목차 — 개요뿐 아니라 섹션이 2개 이상 이어지는 참여·수치·연관 탭에서도 현재 탭의 섹션 길을 안내한다 */}
              {showRail && <DetailRail sections={activeTabOutline} />}
            </S.Aside>
          </S.Body>
        </S.PageInner>
      </S.Page>

      {deleteOpen && (
        <EventDeleteDialog
          isOpen
          title={event.title}
          childCount={(event.childEvents?.length ?? 0) + (event.extraChildren?.length ?? 0)}
          busy={trashBusy}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={(withChildren) => void confirmDelete(withChildren)}
        />
      )}

      {splitOpen && <SplitIntoChildrenModal event={event} onClose={() => setSplitOpen(false)} />}
      <EventKindGuideModal
        event={event}
        isOpen={kindGuideOpen}
        onClose={() => setKindGuideOpen(false)}
        onSplit={() => setSplitOpen(true)}
        onGoToDevelopment={() => revealSection('narrative')}
        onGoToLinks={() => revealSection('network')}
        onBecomeSingle={() =>
          onPatch({ kind: 'SINGLE' } as UpdateEventDto, {
            savedLabel: `'${event.title}'을(를) 단일 사건으로 바꿈`,
          })
        }
      />
      <PersonDetailModal personId={viewingPersonId} onClose={onPersonModalClose} />
      <CountryInfoModal
        event={event}
        countryId={viewingCountryId}
        onOpen={onCountryClick}
        onClose={onCountryModalClose}
      />
    </InlineEditProvider>
  )
}

const CommentsSection = styled(S.Section)`
  padding-top: 32px;
  border-top: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const ActorLinkExtrasSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-top: 40px;
  border-top: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};

  &:has(> div:empty) {
    display: none;
  }
`

const ActorLinkExtrasHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;

  span {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  small {
    font-size: 13px;
    line-height: 1.55;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

/** 아직 연결하지 않은 기관·단체 항목 — 넓은 화면에서는 다단 원장 열로 나란히 배치 */
const ActorLinkExtras = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  &:empty {
    display: none;
  }

  @container eventdetail (min-width: 1180px) {
    &:has(> :nth-child(2)) {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 0 40px;
      align-items: stretch;
    }
  }
`

const OutcomeChapterSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 48px;
  margin-top: 8px;
  padding-top: 44px;
  border-top: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const OutcomeChapterHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  strong {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.012em;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  small {
    font-size: 12.5px;
    line-height: 1.5;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

/** 하위 사건 → 상위 사건 댓글로 유도하는 인라인 링크. */
const ParentCommentsLink = styled(Link)`
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-weight: 600;
  text-decoration: none;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-underline-offset: 2px;
    outline: none;
  }
`

/* ───────────────────────── Suspense / Error fallback ───────────────────────── */

function EventDetailError({ error }: { error: Error }) {
  const notFound = (error as { status?: number }).status === 404
  return (
    <S.Page>
      <S.PageInner>
        <S.StateBox>
          <S.ErrorText>
            {notFound ? '사건을 찾을 수 없습니다' : '사건을 불러오지 못했습니다.'}
          </S.ErrorText>
          {error.message && <S.HelperText>{error.message}</S.HelperText>}
          <S.StateBackLink to={pathKeys.events.root()}>
            목록으로 돌아가기
          </S.StateBackLink>
        </S.StateBox>
      </S.PageInner>
    </S.Page>
  )
}

export default EventDetailPage

/** 휴지통 띠 — 본문 위, 한 줄 설명 + 복구·영구 삭제 */
const TrashBanner = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-bottom: 20px;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.error};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.06)')};
`

const TrashText = styled.p`
  flex: 1 1 280px;
  margin: 0;
  font-size: 13.5px;
  line-height: 1.6;
  word-break: keep-all;
  color: ${({ theme }) => theme.colors.text.secondary};

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const TrashActions = styled.div`
  display: flex;
  gap: 8px;
`

const TrashButton = styled.button<{ $primary?: boolean }>`
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid ${({ theme, $primary }) => ($primary ? ledgerAccent(theme.mode) : theme.colors.border.light)};
  background: ${({ theme, $primary }) => ($primary ? ledgerAccent(theme.mode) : 'transparent')};
  /* 채운 면의 전경은 지면색 — 다크 강조색은 밝은 인디고라 흰 글자가 묻힌다 */
  color: ${({ theme, $primary }) => ($primary ? (theme.mode === 'dark' ? '#111827' : '#ffffff') : theme.colors.text.primary)};
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
`
