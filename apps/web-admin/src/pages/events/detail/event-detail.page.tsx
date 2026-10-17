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

import { useQueryClient } from '@tanstack/react-query'

import { syncEventSides } from '@/shared/api/event-sides'
import { type UpdateEventDto } from '@/shared/api/events'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { notify } from '@/shared/ui/toast'
import { FiPlus } from 'react-icons/fi'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import { categoryFeatures, participantKey, toParticipants } from '@/entities/event/model'
import { resolveCategory,
  ledgerAccent,
} from '@/entities/event/ui/ledger-tokens'
import { CommentSection } from '@/entities/comment'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import { pathKeys } from '@/shared/router'
import { SmartErrorBoundary } from '@/shared/ui/error-handler/smart-error-boundary'

import { CollectionDevelopment } from './components/collection-development'
import { CountryInfoModal } from './components/country-info-modal'
import { DetailActors } from './components/detail-actors'
import { DetailAppendix } from './components/detail-appendix'
import { ContemporaryHeadsLink, DetailHero, DetailSummary } from './components/detail-hero'
import {
  EventDetailLoading,
  type LoadingGate,
  MIN_LOADING_MS,
  createLoadingGate,
} from './components/detail-loading'
import { DetailNarrative } from './components/detail-narrative'
import { DetailNetwork } from './components/detail-network'
import { DetailTreaties } from './components/detail-treaties'
import { DetailFacts } from './components/detail-facts'
import { DetailOrganizations } from './components/detail-organizations'
import { DetailPower, hasPowerData } from './components/detail-power'
import { DetailRail } from './components/detail-rail'
import { DetailStatehood, statehoodEntries } from './components/detail-statehood'
import { DevelopmentTimeline } from './components/development-timeline'
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
  { id: 'actors', label: '참여', hint: '인물·국가 · 성립·소멸 · 권력 교체 · 기업·조직' },
  { id: 'modules', label: '진영·수치', hint: '진영 · 수치 · 작전 정보 · 관련 행정부' },
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
  if (/^(background|narrative|aftermath|comments|development)/.test(id)) return 'overview'
  if (/^(actors|statehood|power|organizations)/.test(id)) return 'actors'
  if (id.startsWith('module-')) return 'modules'
  if (id === 'treaties') return promoteTreaties ? 'overview' : 'links'
  if (id === 'network') return 'links'
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
 * 캐시가 있는 재방문도 같은 시간 동안 로딩을 보여준다.
 */
function EventDetailShell({ eventId }: { eventId: string }) {
  const [loadingGate] = useState(() => createLoadingGate(MIN_LOADING_MS))

  return (
    <SmartErrorBoundary FallbackComponent={EventDetailError}>
      <Suspense fallback={<EventDetailLoading />}>
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
  const { event, enabledModules: serverModules } = useEventDetail(eventId)
  use(loadingGate)
  /*
   * 수치 모듈은 저장할 빈 값이 없다 — '모듈 추가'로 펼치면 첫 수치를 기록할 때까지 화면에서만 연다.
   * (빈 stub을 저장하던 예전 방식은 '전사 0명'이 데이터로 굳는 오염을 낳았다.)
   */
  const [metricsOpened, setMetricsOpened] = useState(false)
  const enabledModules = useMemo(
    () =>
      metricsOpened && !serverModules.includes('metrics')
        ? [...serverModules, 'metrics' as const]
        : serverModules,
    [metricsOpened, serverModules],
  )
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
            ...existing.map((p) => ({
              personId: p.personId,
              role: p.role ?? undefined,
              note: p.note ?? undefined,
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
   * 카테고리 기능 — 회담/조약 사건은 조약 섹션을 본문 바로 뒤로 올리고 비어 있어도 접지 않는다
   * (조약이 그 사건의 결과물이라 '채우기' 띠에 숨기면 핵심 동선이 사라진다).
   */
  const features = categoryFeatures(event.category?.name)
  const promoteTreaties = features.promoteTreaties
  /* 국가 성립·소멸 — 역할(건국·멸망)이 있으면 늘, 건국/멸망 사건이면 비어 있어도 보인다 */
  const showStatehood = features.expectStatehood || statehoodEntries(event).length > 0
  /* 권력 교체·선거 — 취임·즉위·선거가 걸려 있으면 늘, 정치 사건이면 비어 있어도 보인다 */
  const showPower = features.expectPower || hasPowerData(event)
  /* 관련 기업·조직 — 연결이 있으면 늘, 경제 사건이면 비어 있어도 보인다 */
  const showOrganizations = features.expectOrganizations || (event.organizations?.length ?? 0) > 0
  /** 묶음 사건 — 전개 자리는 하위 사건이라 비어 있어도 접지 않는다(빈 상태가 곧 '첫 하위 등록' 안내) */
  const isCollection = event.kind === 'COLLECTION'
  const isVisible = (id: FoldableSectionId) =>
    filled[id] ||
    pinned.has(id) ||
    (id === 'treaties' && promoteTreaties) ||
    (id === 'narrative' && isCollection)
  const folded = FOLDABLE_SECTIONS.filter((section) => !isVisible(section.id))

  /* 탭 — URL(?tab=)이 정본(replace: 탭을 오가도 '뒤로'가 탭을 되감지 않는다). 개요는 파라미터 없음 */
  const tabParam = searchParams.get('tab')
  const visibleTabs = isCollection ? EVENT_TABS : EVENT_TABS.filter((tab) => tab.id !== 'survey')
  const activeTab: EventTabId =
    isEventTab(tabParam) && visibleTabs.some((tab) => tab.id === tabParam) ? tabParam : 'overview'
  /** '하위 사건으로 나누기'(단일 → 묶음) 모달 */
  const [splitOpen, setSplitOpen] = useState(false)
  const setActiveTab = useCallback(
    (next: EventTabId) =>
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          if (next === 'overview') params.delete('tab')
          else params.set('tab', next)
          return params
        },
        { replace: true },
      ),
    [setSearchParams],
  )
  const tabOf = useCallback(
    (sectionId: string) => tabOfSection(sectionId, promoteTreaties),
    [promoteTreaties],
  )

  /* 탭 옆 건수 — 열어 보기 전에 어디에 기록이 있는지 */
  const countOf = (list?: unknown[] | null) => list?.length ?? 0
  const tabCounts: Record<EventTabId, number> = {
    overview: 0,
    survey: countOf(event.childEvents) + countOf(event.extraChildren),
    actors:
      countOf(event.relatedPersons) +
      countOf(event.relatedCountries) +
      countOf(event.relatedHistoricalCountries) +
      countOf(event.organizations),
    modules: enabledModules.length,
    links:
      (promoteTreaties ? 0 : countOf(event.treaties)) +
      (event.parentEvent ? 1 : 0) +
      countOf(event.extraParents) +
      countOf(event.childEvents) +
      countOf(event.extraChildren) +
      countOf(event.keywords) +
      relatedCount,
    media: countOf(event.eventImages),
  }

  /* 탭 바는 sticky라, 길게 내려 읽다 탭을 바꾸면 새 패널 중간이 보인다 — 붙어 있을 때만 패널 머리로 되감는다 */
  const tabsAnchorRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
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
  const revealSection = useCallback(
    (id: FoldableSectionId) => {
      setActiveTab(tabOf(id))
      setPinned((prev) => new Set(prev).add(id))
      setRevealTarget(id)
    },
    [setActiveTab, tabOf],
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
    const withParagraphs = (kind: 'background' | 'narrative' | 'aftermath') => {
      const children = paragraphOutline(event, kind)
      return children.length >= 2 ? children : undefined
    }

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
    if (showStatehood) items.push({ id: 'statehood', label: '성립·소멸' })
    if (showPower) items.push({ id: 'power', label: '권력 교체·선거' })
    if (showOrganizations) items.push({ id: 'organizations', label: '관련 기업·조직' })
    if (promoteTreaties && shown('treaties')) items.push({ id: 'treaties', label: '조약' })
    if (shown('actors')) items.push({ id: 'actors', label: '참여 행위자' })

    if (enabledModules.includes('sides'))
      items.push({ id: 'module-sides', label: '진영' })
    if (enabledModules.includes('metrics'))
      items.push({ id: 'module-metrics', label: '수치' })
    if (enabledModules.includes('military-details'))
      items.push({ id: 'module-military-details', label: '작전 정보' })
    if (enabledModules.includes('cabinets'))
      items.push({ id: 'module-cabinets', label: '관련 행정부' })

    if (!promoteTreaties && shown('treaties')) items.push({ id: 'treaties', label: '조약' })
    if (shown('network')) items.push({ id: 'network', label: '연관' })
    if (shown('appendix')) items.push({ id: 'appendix', label: '이미지' })
    // 댓글 — 최상위 사건은 댓글 스레드, 하위 사건은 상위 댓글로 유도하는 안내(둘 다 #comments
    // 앵커를 렌더하므로 rail 항목은 항상 노출). 백엔드가 하위 사건엔 댓글을 노출/허용하지
    // 않아(스코프 불일치) 하위에선 스레드 대신 안내만 보여준다.
    items.push({ id: 'comments', label: '댓글' })

    return items
    // 섹션 구성은 보임 여부·단락 제목·모듈에만 의존한다 — event 전체를 deps에 두면
    // 인라인 patch refetch마다 재계산된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey, event.eventSections, enabledModules, promoteTreaties, showStatehood, showPower, showOrganizations])

  /**
   * URL hash → 섹션 스크롤. 사건 id가 바뀐 첫 렌더에서 1회만 실행.
   * (deps에 event 전체를 두면 매 patch refetch마다 재실행돼 편집 중 위로 점프하는 회귀.)
   */
  const scrolledHashForEventRef = useRef<string | null>(null)
  /* 해시가 다른 탭의 섹션이면 그 탭을 먼저 열고, 렌더된 다음에 스크롤한다 */
  const [pendingHash, setPendingHash] = useState<string | null>(null)
  useEffect(() => {
    if (scrolledHashForEventRef.current === event.id) return
    scrolledHashForEventRef.current = event.id
    const hash = window.location.hash.slice(1)
    if (!hash) return
    setActiveTab(tabOf(hash))
    setPendingHash(hash)
  }, [event.id, setActiveTab, tabOf])
  useEffect(() => {
    if (!pendingHash) return
    const target = document.getElementById(pendingHash)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setPendingHash(null)
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
          ' 이름과 소속은 진영 모듈에서 고칠 수 있습니다.',
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

  /* 조약 — 회담/조약 사건이면 본문 바로 뒤, 그 밖에는 모듈 뒤(연관 앞) */
  const treatiesSection = isVisible('treaties') ? (
    <DetailTreaties
      event={event}
      onInvalidate={() =>
        void queryClient.invalidateQueries({
          queryKey: eventKeys.detail(event.id),
        })
      }
    />
  ) : null

  /* Page = 내부 스크롤 컨테이너 — 읽기 진행률 바가 이 ref로 scrollTop을 읽는다. */
  const scrollRef = useRef<HTMLDivElement>(null)
  const accentColor = resolveCategory(event.category?.name).color

  return (
    <InlineEditProvider imageCategory="events">
      <S.Page ref={scrollRef}>
        <ReadingProgress targetRef={scrollRef} color={accentColor} />
        <S.PageInner>
          <SaveStatus isPending={mutation.isPending} lastSavedAt={lastSavedAt} />
          <S.Body>
            <DetailHero
              event={event}
              onPatch={onPatch}
              onPersonClick={onPersonClick}
              onCountryClick={onCountryClick}
              withSummary={false}
              onShowActors={() => setActiveTab('actors')}
              onOpenMedia={() => setActiveTab('media')}
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
                      title={tab.hint}
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
                  {/* 요약 — 히어로에서 옮겨 와 개요의 머리글이 된다(히어로는 제목·행위자·국가만) */}
                  <DetailSummary event={event} onPatch={onPatch} />
                  {/* 전개 타임라인(D2) — 하위 사건이 날짜를 가질 때만 */}
                  <DevelopmentTimeline event={event} />
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
                  />
                  {/* 회담/조약 사건은 조약이 그 사건의 결과물이라 개요에 둔다 */}
                  {promoteTreaties && treatiesSection}
                </>
              )}

              {activeTab === 'survey' && (
                <Suspense fallback={<S.HelperText>하위 사건을 모으는 중…</S.HelperText>}>
                  <LazyEventOverviewPanel eventId={event.id} />
                </Suspense>
              )}

              {activeTab === 'actors' && (
                <>
                  {isVisible('actors') && (
                    <DetailActors
                      event={event}
                      onPatch={onPatch}
                      onPersonClick={onPersonClick}
                      onCountryClick={onCountryClick}
                    />
                  )}
                  {showStatehood && (
                    <DetailStatehood
                      event={event}
                      expectStatehood={features.expectStatehood}
                      onCountryClick={onCountryClick}
                      onPersonClick={onPersonClick}
                    />
                  )}
                  {showPower && (
                    <DetailPower
                      event={event}
                      expectPower={features.expectPower}
                      onPersonClick={onPersonClick}
                    />
                  )}
                  {showOrganizations && (
                    <DetailOrganizations event={event} expectOrganizations={features.expectOrganizations} />
                  )}
                </>
              )}

              {activeTab === 'modules' && enabledModules.length === 0 && (
                <S.TabEmpty aria-labelledby="modules-empty-title">
                  <S.TabEmptyHead>
                    <S.TabEmptyTitle id="modules-empty-title">아직 붙인 기능이 없습니다</S.TabEmptyTitle>
                    <S.TabEmptyText>
                      진영·수치·작전 정보는 사건마다 필요한 것만 켜는 기록입니다. 하나를 시작하면 이 탭에 자리가 생깁니다.
                    </S.TabEmptyText>
                  </S.TabEmptyHead>
                  <ModuleAdd
                    variant="cards"
                    event={event}
                    enabledModules={enabledModules}
                    onPatch={onPatch}
                    onStartSides={startSides}
                    onShowMetrics={() => setMetricsOpened(true)}
                  />
                </S.TabEmpty>
              )}

              {activeTab === 'modules' && enabledModules.length > 0 && (
                <>
                  <ModuleAdd
                    event={event}
                    enabledModules={enabledModules}
                    onPatch={onPatch}
                    onStartSides={startSides}
                    onShowMetrics={() => setMetricsOpened(true)}
                  />
                  {enabledModules.includes('sides') && <ModuleSides event={event} onPatch={onPatch} />}
                  {enabledModules.includes('metrics') && <ModuleMetrics event={event} />}
                  {enabledModules.includes('military-details') && (
                    <ModuleMilitaryDetails event={event} onPatch={onPatch} />
                  )}
                  {enabledModules.includes('cabinets') && <ModuleCabinets event={event} />}
                </>
              )}

              {activeTab === 'links' && (
                <>
                  {/* 조약 — 사건과 조약을 잇는 유일한 지점(본문·서명자는 조약이 정본) */}
                  {!promoteTreaties && treatiesSection}
                  {isVisible('network') && (
                    <DetailNetwork
                      event={event}
                      onPatch={onPatch}
                      onRequestSplit={() => setSplitOpen(true)}
                    />
                  )}
                </>
              )}

              {activeTab === 'media' && isVisible('appendix') && (
                <DetailAppendix event={event} onPatch={onPatch} />
              )}
              {activeTab === 'media' && !isVisible('appendix') && (
                <S.TabEmpty aria-labelledby="media-empty-title">
                  <S.TabEmptyHead>
                    <S.TabEmptyTitle id="media-empty-title">아직 자료가 없습니다</S.TabEmptyTitle>
                    <S.TabEmptyText>
                      지도·사진·문서 이미지를 캡션과 함께 둘 수 있습니다.
                    </S.TabEmptyText>
                  </S.TabEmptyHead>
                  <S.TabEmptyAction type="button" onClick={() => revealSection('appendix')}>
                    <FiPlus aria-hidden />
                    이미지 추가
                  </S.TabEmptyAction>
                </S.TabEmpty>
              )}

              {/* 이 탭에서 내용이 없어 접힌 섹션들 — 누르면 제자리에 펼쳐진다
                  (자료 탭이 통째로 비었으면 위의 빈 탭 머리가 같은 버튼을 이미 든다) */}
              <FillInStrip
                items={folded.filter(
                  (section) =>
                    tabOf(section.id) === activeTab &&
                    !(activeTab === 'media' && section.id === 'appendix'),
                )}
                onReveal={revealSection}
              />

              {activeTab === 'overview' && (
                <S.Section id="comments">
                  <S.SectionHeader>
                    <S.SectionTitle>댓글</S.SectionTitle>
                  </S.SectionHeader>
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
                </S.Section>
              )}
            </S.Main>

            <S.Aside>
              <DetailFacts
                event={event}
                onPatch={onPatch}
                contemporaryLink={<ContemporaryHeadsLink event={event} />}
                onCountryClick={onCountryClick}
                foldedCount={folded.length}
              />
              {/* 목차는 긴 글이 있는 개요에서만 — 다른 탭은 탭 자체가 목차다 */}
              {activeTab === 'overview' && (
                <DetailRail sections={sections.filter((item) => tabOf(item.id) === 'overview')} />
              )}
            </S.Aside>
          </S.Body>
        </S.PageInner>
      </S.Page>

      {splitOpen && <SplitIntoChildrenModal event={event} onClose={() => setSplitOpen(false)} />}
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
