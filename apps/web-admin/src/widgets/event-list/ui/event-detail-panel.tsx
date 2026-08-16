/**
 * 이벤트 상세 정보 패널
 * FSD: widgets/event-list/ui
 *
 * - sticky 헤더 (제목·summary clamp·액션) + 본문 (정보 그리드·배경·여파·하위)
 * - 데스크톱은 grid column, 모바일은 drawer가 호스트. 위젯은 표시/숨김 비관여.
 * - 자식 사건 선택 시에도 root event의 배경/여파 노출 (이전엔 root==selected만 표시 — 정보 손실).
 * - confirm/reload → ConfirmDialog + onAfterDelete 콜백 (페이지 새로고침 회피).
 * - clipboard 실패 fallback + native share API 우선 시도.
 */
import React, { useState } from 'react'

import styled from 'styled-components'

import {
  FiAlertCircle,
  FiArrowRight,
  FiBookOpen,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiCornerLeftUp,
  FiEdit2,
  FiGitBranch,
  FiGlobe,
  FiImage,
  FiLayers,
  FiMapPin,
  FiShare2,
  FiTag,
  FiTarget,
  FiTrash2,
  FiX,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

/** 드로어 하위 사건 목록의 기본 노출 개수 — 나머지는 '더 보기'로 편다. */
const CHILD_PREVIEW_COUNT = 5

import { getCategoryName } from '@/features/event-list/lib'
import { formatDateRange } from '@/pages/events/utils/events.utils'
import { formatDateWithPrecision, isoDaySpan } from '@/shared/lib/iso-date'
import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '@/pages/events/create/events.types'
import * as Detail from '@/pages/events/styles/detail.styles'
import { RichTextReadView } from '@/shared/ui/rich-text-read-view'
import * as Modal from '@/pages/events/styles/modal.styles'
import * as Skeleton from '@/pages/events/styles/skeleton.styles'
import { ICON_SIZE } from '@/pages/events/styles/theme'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import { deleteEvent } from '@/shared/api/events'
import { pathKeys } from '@/shared/router'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog'
import { notify } from '@/shared/ui/toast'

interface EventDetailPanelProps {
  isLoading: boolean
  selectedEvent: HistoricalEvent | null
  selectedNode: EventHierarchyNode | null
  /**
   * 선택 사건의 **상위 사건** — 있으면 정보 그리드에 '상위 사건' 행을 그리고,
   * 클릭 시 `onSelectEvent(parent.id)`로 드로어를 그 사건으로 전환한다.
   * 호출부(events.page)가 평탄화 배열의 parentNodeId로 해석해 내려준다.
   * null/미전달 = 최상위 사건 → 행 자체를 그리지 않는다.
   */
  parentEventRef?: { id: string; title: string } | null
  dbCategories: EventCategoryDto[]
  onSelectEvent?: (eventId: string) => void
  onExpandEvent?: (eventId: string) => void
  onShowSummary?: (eventId: string) => void
  /** 삭제 후 부모가 캐시 invalidate 하도록 — 미전달 시 fallback으로 reload (기존 동작 유지) */
  onAfterDelete?: (eventId: string) => void
  /** 이전/다음 사건으로 이동 — 키보드(↑↓)와 동등하나 마우스 사용자용. 더 이상 없으면 undefined. */
  onPrev?: () => void
  onNext?: () => void
  /**
   * 이 사건이 **현재 목록 조건 밖**인가(필터·검색·북마크로 목록에서 사라졌지만 드로어는
   * 열려 있는 상태). 드로어는 필터를 거치지 않은 맵에서 사건을 뽑으므로 목록과 다른
   * 모집단을 보여주게 되고, 이전/다음은 인덱스 -1이라 둘 다 disabled가 된다 —
   * 끝 항목의 정상 비활성과 구분되지 않아 '고장'처럼 보였다(검토 INT-3).
   */
  isOutOfScope?: boolean
  /** 조건 밖 배너의 '필터 초기화' 액션 */
  onResetFilters?: () => void
  /** 상세 패널 닫기 — 데스크톱 column 모드에서도 X 버튼으로 명시적 닫기 제공 */
  onClose?: () => void
  /**
   * `?event=<삭제된 id>`처럼 **끝까지 로드했는데 찾지 못한** 선택인가(검토 URL-4).
   *
   * 예전엔 이 상황이 '아직 아무것도 안 골랐다'와 같은 화면('사건을 선택해주세요')이었고,
   * 그 분기에는 닫기 어포던스가 하나도 없었다 — 데스크톱(≥1200px)은 백드롭도 없어
   * 상세 컬럼이 자리를 차지한 채 Esc 말고는 빠져나갈 길이 없었다.
   */
  notFound?: boolean
  /** 못 찾은 사건 id — 무엇이 사라졌는지 밝히는 데만 쓴다 */
  missingEventId?: string | null
}

export const EventDetailPanel: React.FC<EventDetailPanelProps> = ({
  isLoading,
  selectedEvent,
  selectedNode,
  parentEventRef = null,
  dbCategories,
  onSelectEvent,
  onExpandEvent,
  onShowSummary,
  onAfterDelete,
  onPrev,
  onNext,
  isOutOfScope = false,
  onResetFilters,
  onClose,
  notFound = false,
  missingEventId = null,
}) => {
  const navigate = useNavigate()
  const [descExpanded, setDescExpanded] = useState(false)
  /** 하위 사건 미리보기 개수 — 이 수를 넘으면 '더 보기'가 붙는다. */
  const [childrenExpanded, setChildrenExpanded] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  // 새 사건 선택될 때마다 description clamp 초기화
  React.useEffect(() => {
    setDescExpanded(false)
  }, [selectedNode?.id])

  /**
   * 날짜·기간은 프로젝트 표준 파서(shared/lib/iso-date)로만 만든다.
   *
   * 예전엔 `new Date(dateString)` + 로컬 게터를 썼다. 그런데 이 앱의 사건 날짜는
   * BC(`-0044-03-15`)와 '미상'(빈 문자열)을 포함해서, 네이티브 파서는 둘 다
   * Invalid Date로 만들고 화면에 `NaN.NaN.NaN`을 찍었다. 같은 데이터를 목록 행과
   * 요약 모달은 이미 iso-date로 안전하게 렌더하고 있었다(2026-07-28 검토 DATA-2/IX-4).
   */
  const dateLabel = (iso: string | undefined, precision: string | null | undefined) =>
    iso ? formatDateWithPrecision(iso, precision) : '미상'

  /**
   * 기간 — 종료 정보가 없으면 빈 문자열(토큰 생략). 예전엔 '미입력'과 '당일 종료'를
   * 모두 '1일'로 합쳐 종료 시점이 기록되지 않은 사건까지 하루짜리로 단정했다(DATA-4).
   * 연·월 정밀도 사건은 일 단위 기간 자체가 의미 없으므로 계산하지 않는다.
   */
  const calculateDuration = () => {
    if (!selectedNode) return ''
    const { start, end, startPrecision, endPrecision } = selectedNode.period
    if (!end) return ''
    if (startPrecision === 'year' || endPrecision === 'year') return ''
    const days = isoDaySpan(start, end)
    if (days === null) return ''
    if (days <= 0) return '1일'
    if (days >= 365) {
      const years = Math.floor(days / 365)
      const remainingDays = days % 365
      return remainingDays > 0 ? `${years}년 ${remainingDays}일` : `${years}년`
    }
    return `${days}일`
  }

  /** 공유 — native share 우선, 실패 시 clipboard, 그것도 실패 시 fallback */
  const handleShare = async () => {
    if (!selectedNode) return
    const url = `${window.location.origin}${pathKeys.events.detail(selectedNode.id)}`
    const title = selectedNode.title

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url })
        return
      } catch (err) {
        // 사용자 취소(AbortError)는 silent — 그 외만 clipboard fallback
        if ((err as Error).name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      notify.success('링크가 복사되었습니다')
    } catch {
      // clipboard 미지원 / permission denied → input fallback
      const ta = document.createElement('textarea')
      ta.value = url
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        notify.success('링크가 복사되었습니다')
      } catch {
        notify.error('링크 복사에 실패했습니다')
      } finally {
        document.body.removeChild(ta)
      }
    }
  }

  /** 삭제 — ConfirmDialog → 성공 시 onAfterDelete 콜백 (없으면 reload fallback) */
  const handleConfirmDelete = async () => {
    if (!selectedNode) return
    setConfirmDeleteOpen(false)
    try {
      await deleteEvent(selectedNode.id)
      // 관리자 UI에 복구 동선이 없으므로 '복구 가능'을 약속하지 않는다.
      notify.success('사건이 삭제되었습니다.')
      if (onAfterDelete) {
        onAfterDelete(selectedNode.id)
      } else {
        // 부모가 콜백 안 주면 기존 동작 유지 (호환)
        window.location.reload()
      }
    } catch {
      notify.error('사건 삭제에 실패했습니다.')
    }
  }

  const renderHero = () => {
    if (!selectedNode) return null
    const heroUrl = selectedEvent?.visuals.heroImageUrl
    if (heroUrl) {
      return (
        <Detail.HeroFigure>
          <Detail.HeroImg src={heroUrl} alt={selectedNode.title} />
        </Detail.HeroFigure>
      )
    }
    // placeholder — 이미지 추가는 상세의 이미지 CRUD가 담당한다(대표 지정 포함).
    return (
      <Detail.HeroFigure>
        <Detail.HeroPlaceholder
          type="button"
          aria-label="이미지 추가 — 상세로 이동"
          onClick={() => navigate(pathKeys.events.detail(selectedNode.id))}
        >
          <FiImage size={28} aria-hidden="true" />
          <span>대표 이미지 없음 — 클릭하여 추가</span>
        </Detail.HeroPlaceholder>
      </Detail.HeroFigure>
    )
  }

  const renderInfo = () => {
    if (!selectedEvent || !selectedNode) return null
    const durationLabel = calculateDuration()
    const relatedCountries = selectedEvent.relatedCountries ?? []
    const relatedHistorical = selectedEvent.relatedHistoricalCountries ?? []
    const sections = selectedEvent.eventSections ?? []
    const sectionTitles = selectedEvent.sectionTitles ?? []
    const hasSections = sections.length > 0 || sectionTitles.length > 0

    return (
      <Detail.InfoBlock>
        <Detail.InfoGrid>
          {/* 카테고리 — hero image 유무와 무관하게 항상 표시 */}
          <Detail.InfoLabel>
            <FiTag size={ICON_SIZE.base} aria-hidden="true" />
            <span>분류</span>
          </Detail.InfoLabel>
          <Detail.InfoValue>
            <Detail.CategoryChip $category={selectedEvent.category}>
              {getCategoryName(selectedEvent.category, dbCategories)}
            </Detail.CategoryChip>
          </Detail.InfoValue>

          <Detail.InfoLabel>
            <FiCalendar size={ICON_SIZE.base} aria-hidden="true" />
            <span>기간</span>
          </Detail.InfoLabel>
          <Detail.InfoValue>
            {dateLabel(
              selectedNode.period.start,
              selectedNode.period.startPrecision,
            )}
            {selectedNode.period.end &&
              selectedNode.period.start !== selectedNode.period.end && (
                <>
                  {' ~ '}
                  {dateLabel(
                    selectedNode.period.end,
                    selectedNode.period.endPrecision,
                  )}
                </>
              )}
            {durationLabel && (
              <Detail.InfoMutedHint>({durationLabel})</Detail.InfoMutedHint>
            )}
          </Detail.InfoValue>

          {selectedEvent.location && (
            <>
              <Detail.InfoLabel>
                <FiMapPin size={ICON_SIZE.base} aria-hidden="true" />
                <span>위치</span>
              </Detail.InfoLabel>
              <Detail.InfoValue>{selectedEvent.location}</Detail.InfoValue>
            </>
          )}

          {/* 상위 사건 — 하위(5개 프리뷰)만 있고 위로 갈 길이 없던 비대칭 해소.
              클릭 시 드로어가 상위 사건으로 전환된다. 최상위면 행 미표시. */}
          {parentEventRef && (
            <>
              <Detail.InfoLabel>
                <FiCornerLeftUp size={ICON_SIZE.base} aria-hidden="true" />
                <span>상위 사건</span>
              </Detail.InfoLabel>
              <Detail.InfoValue>
                <ParentEventLink
                  type="button"
                  title="상위 사건 상세 보기"
                  onClick={() => onSelectEvent?.(parentEventRef.id)}
                >
                  {parentEventRef.title}
                </ParentEventLink>
              </Detail.InfoValue>
            </>
          )}

          {selectedNode.children && selectedNode.children.length > 0 && (
            <>
              <Detail.InfoLabel>
                <FiLayers size={ICON_SIZE.base} aria-hidden="true" />
                <span>하위 사건</span>
              </Detail.InfoLabel>
              <Detail.InfoValue>
                {/* 숫자가 정적 div였다 — 누르면 아무 일도 없는데 그 아래 실제 목록은
                    리치텍스트 두 덩이를 지나야 나왔다(검토 DISC-7).
                    이제 여기서 바로 계층 전체를 연다. */}
                {onShowSummary ? (
                  <ParentEventLink
                    type="button"
                    onClick={() => onShowSummary(selectedNode.id)}
                    aria-label={`하위 사건 ${selectedNode.children.length}개 — 계층 전체 보기`}
                  >
                    {selectedNode.children.length}개
                  </ParentEventLink>
                ) : (
                  `${selectedNode.children.length}개`
                )}
              </Detail.InfoValue>
            </>
          )}

          {(relatedCountries.length > 0 || relatedHistorical.length > 0) && (
            <>
              <Detail.InfoLabel>
                <FiGlobe size={ICON_SIZE.base} aria-hidden="true" />
                <span>관련 국가</span>
              </Detail.InfoLabel>
              <Detail.ChipRow>
                {relatedCountries.map((country) => (
                  <Detail.CountryChip key={country.id}>
                    {country.flagEmoji} {country.name}
                  </Detail.CountryChip>
                ))}
                {relatedHistorical.map((country) => (
                  <Detail.HistoricalCountryChip key={country.id}>
                    🏛️ {country.name}
                  </Detail.HistoricalCountryChip>
                ))}
              </Detail.ChipRow>
            </>
          )}

          {hasSections && (
            <>
              <Detail.InfoLabel>
                <FiBookOpen size={ICON_SIZE.base} aria-hidden="true" />
                <span>본문 구성</span>
              </Detail.InfoLabel>
              <Detail.ChipRow>
                {sections.length > 0
                  ? sections.map((section) => (
                      <Detail.SectionChip key={section.id}>
                        {section.title}
                      </Detail.SectionChip>
                    ))
                  : sectionTitles.map((title, idx) => (
                      <Detail.SectionChip key={idx}>{title}</Detail.SectionChip>
                    ))}
              </Detail.ChipRow>
            </>
          )}
        </Detail.InfoGrid>
      </Detail.InfoBlock>
    )
  }

  // ───────────────────────────────────────────────────────────────────────
  // render
  // ───────────────────────────────────────────────────────────────────────
  return (
    <Detail.DetailPanel>
      {notFound ? (
        /**
         * 링크가 가리키는 사건이 없다 — 삭제됐거나 잘못된 id(검토 URL-4).
         * 이 분기에 도달했을 때 페이지는 이미 `event` 키를 URL에서 떨어뜨렸다.
         * 그래야 새로고침·공유가 같은 유령을 되살리지 않는다.
         */
        <Detail.DetailPanelEmpty>
          <PanelDismissButton
            type="button"
            aria-label="상세 닫기"
            title="닫기 (Esc)"
            onClick={() => onClose?.()}
          >
            <FiX size={ICON_SIZE.lg} aria-hidden="true" />
          </PanelDismissButton>
          <Detail.DetailPanelEmptyIcon>
            <FiAlertCircle size={ICON_SIZE.lg} aria-hidden="true" />
          </Detail.DetailPanelEmptyIcon>
          <Detail.DetailPanelEmptyContent>
            <Detail.DetailPanelEmptyTitle>
              사건을 찾을 수 없습니다
            </Detail.DetailPanelEmptyTitle>
            <Detail.DetailPanelEmptyDescription>
              링크가 가리키는 사건이 삭제되었거나 주소가 잘못되었습니다. 주소에서
              선택은 해제했습니다.
            </Detail.DetailPanelEmptyDescription>
            {missingEventId && (
              <MissingIdHint>id: {missingEventId}</MissingIdHint>
            )}
          </Detail.DetailPanelEmptyContent>
          {onClose && (
            <NotFoundAction type="button" onClick={onClose}>
              선택 해제
            </NotFoundAction>
          )}
        </Detail.DetailPanelEmpty>
      ) : isLoading ? (
        <Detail.DetailPanelContent>
          <>
            <Skeleton.SkeletonDetailHeroImage />
            <Skeleton.DetailPanelSkeleton>
              <Skeleton.SkeletonDetailTitle />
              <Skeleton.SkeletonText $width="90%" />
              <Skeleton.SkeletonText $width="70%" />
              <div style={{ marginTop: '10px' }}>
                <Skeleton.SkeletonCard />
                <div style={{ marginTop: '10px' }}>
                  <Skeleton.SkeletonCard />
                </div>
              </div>
            </Skeleton.DetailPanelSkeleton>
          </>
        </Detail.DetailPanelContent>
      ) : selectedEvent && selectedNode ? (
        <Detail.DetailPanelContent>
          {/* 조건 밖 선택 고지 — 목록엔 없는데 상세만 열려 있는 상태를 설명한다. */}
          {isOutOfScope && (
            <OutOfScopeBanner role="status">
              <span>
                이 사건은 현재 목록 조건 밖입니다 — 목록에는 표시되지 않아
                이전/다음 이동을 쓸 수 없습니다.
              </span>
              {/**
               * 라벨이 '필터 초기화'이던 시절엔 원인이 접힘(연·세기 밴드나 하위 접기)일 때
               * 눌러도 화면이 그대로였다 — 완전한 먹통 버튼(검토 URL-6). 호출부의 초기화
               * 범위에 접힘이 들어왔으므로 라벨도 그 범위를 말한다.
               */}
              {onResetFilters && (
                <OutOfScopeAction
                  type="button"
                  title="필터·검색어·북마크와 접어 둔 연도·세기·하위 사건을 모두 해제합니다"
                  onClick={onResetFilters}
                >
                  필터·접힘 초기화
                </OutOfScopeAction>
              )}
            </OutOfScopeBanner>
          )}
          {/* sticky 헤더 — 제목·summary·액션 */}
          <Detail.DetailPanelHeader>
            <Detail.DetailTitleRow>
              <Detail.DetailTitle>{selectedNode.title}</Detail.DetailTitle>
              {onClose && (
                <Detail.DetailCloseButton
                  type="button"
                  aria-label="상세 닫기"
                  title="닫기 (Esc)"
                  onClick={onClose}
                >
                  <FiX size={ICON_SIZE.lg} aria-hidden="true" />
                </Detail.DetailCloseButton>
              )}
            </Detail.DetailTitleRow>
            {selectedNode.summary && (
              <Detail.DescriptionWrap>
                <Detail.DescriptionText $expanded={descExpanded}>
                  {selectedNode.summary}
                </Detail.DescriptionText>
                {selectedNode.summary.length > 160 && (
                  <Detail.DescriptionToggle
                    type="button"
                    onClick={() => setDescExpanded((v) => !v)}
                    aria-expanded={descExpanded}
                  >
                    {descExpanded ? '접기' : '더 보기'}
                  </Detail.DescriptionToggle>
                )}
              </Detail.DescriptionWrap>
            )}

            <Detail.ActionButtonRow>
              {/* 이전/다음 사건 — 키보드 ↑↓와 동등. 끝/처음에서는 disabled */}
              <Detail.ActionButton
                $variant="ghost"
                title={
                  isOutOfScope
                    ? '이 사건이 목록 조건 밖이라 이동할 수 없습니다'
                    : '이전 사건 (↑)'
                }
                aria-label="이전 사건"
                disabled={!onPrev}
                onClick={() => onPrev?.()}
              >
                <FiChevronLeft size={ICON_SIZE.base} aria-hidden="true" />
              </Detail.ActionButton>
              <Detail.ActionButton
                $variant="ghost"
                title={
                  isOutOfScope
                    ? '이 사건이 목록 조건 밖이라 이동할 수 없습니다'
                    : '다음 사건 (↓)'
                }
                aria-label="다음 사건"
                disabled={!onNext}
                onClick={() => onNext?.()}
              >
                <FiChevronRight size={ICON_SIZE.base} aria-hidden="true" />
              </Detail.ActionButton>
              <Detail.ActionButton
                $variant="ghost"
                title="공유"
                aria-label="공유 — 링크 복사 또는 공유 시트"
                onClick={handleShare}
              >
                <FiShare2 size={ICON_SIZE.base} aria-hidden="true" />
              </Detail.ActionButton>
              <Detail.ActionButton
                $variant="ghost"
                title="수정"
                aria-label="이 사건 수정"
                /* 수정 표면은 상세 인라인 편집 하나 — 별도 편집 페이지는 흡수됐다. */
                onClick={() => navigate(pathKeys.events.detail(selectedNode.id))}
              >
                <FiEdit2 size={ICON_SIZE.base} aria-hidden="true" />
              </Detail.ActionButton>
              <Detail.ActionButton
                $variant="ghost-danger"
                title="삭제"
                aria-label="이 사건 삭제"
                onClick={() => setConfirmDeleteOpen(true)}
              >
                <FiTrash2 size={ICON_SIZE.base} aria-hidden="true" />
              </Detail.ActionButton>
              <Detail.ActionButton
                $variant="primary"
                data-cta="primary"
                onClick={() =>
                  navigate(pathKeys.events.detail(selectedNode.id))
                }
              >
                <span>상세 보기</span>
                <FiArrowRight size={ICON_SIZE.base} aria-hidden="true" />
              </Detail.ActionButton>
            </Detail.ActionButtonRow>
          </Detail.DetailPanelHeader>

          {/* hero image — 헤더 아래 (스크롤 시 함께 흘러감) */}
          {renderHero()}

          {/* 핵심 정보 그리드 */}
          {renderInfo()}

          {/**
           * 하위 사건 — **배경·여파보다 위**에 둔다(검토 DISC-7).
           *
           * 예전엔 리치텍스트 두 덩이를 다 지나야 나오는 맨 아래였고, 그나마 5개만
           * 잘라 보여 주면서 날짜가 없었다. 이 패널을 여는 흔한 이유 하나가
           * '이 사건 밑에 무엇이 있나'인데 그 답이 가장 멀리 있었다.
           */}
          {selectedNode.children && selectedNode.children.length > 0 && (
            <Detail.DetailSection>
              <Detail.DetailSectionTitle>
                하위 사건 ({selectedNode.children.length}개)
              </Detail.DetailSectionTitle>
              <Detail.DetailChildrenList>
                {(childrenExpanded
                  ? selectedNode.children
                  : selectedNode.children.slice(0, CHILD_PREVIEW_COUNT)
                ).map((child) => (
                  <Detail.DetailChildItem
                    key={child.id}
                    type="button"
                    onClick={() => {
                      if (onSelectEvent) {
                        onSelectEvent(child.id)
                        if (onExpandEvent) {
                          onExpandEvent(selectedNode.id)
                        }
                      }
                    }}
                  >
                    <strong>{child.title}</strong>
                    {/* 날짜가 없으면 목록에서 보던 순서와 대조할 수 없다. */}
                    <Detail.DetailChildDate>
                      {formatDateRange(
                        child.period.start,
                        child.period.end,
                        child.period.startPrecision,
                        child.period.endPrecision,
                      )}
                    </Detail.DetailChildDate>
                    <span>{child.summary}</span>
                  </Detail.DetailChildItem>
                ))}
              </Detail.DetailChildrenList>
              {selectedNode.children.length > CHILD_PREVIEW_COUNT && (
                <Detail.DetailChildrenMoreRow>
                  <Detail.DetailChildrenMoreButton
                    type="button"
                    onClick={() => setChildrenExpanded((open) => !open)}
                    aria-expanded={childrenExpanded}
                  >
                    {childrenExpanded
                      ? '접기'
                      : `나머지 ${selectedNode.children.length - CHILD_PREVIEW_COUNT}개 더 보기`}
                  </Detail.DetailChildrenMoreButton>
                  <Modal.ViewAllHierarchyButton
                    type="button"
                    onClick={() => {
                      if (onShowSummary) {
                        onShowSummary(selectedNode.id)
                      }
                    }}
                  >
                    <FiGitBranch size={ICON_SIZE.base} aria-hidden="true" />
                    전체 계층 구조 보기
                  </Modal.ViewAllHierarchyButton>
                </Detail.DetailChildrenMoreRow>
              )}
            </Detail.DetailSection>
          )}

          {/**
           * 배경 — 자식 노드 선택 시에도 root event의 배경 노출.
           * 이전엔 `selectedEvent.id === selectedNode.id` 분기로 root만 → 자식 선택 시 정보 손실.
           */}
          {selectedEvent.background && (
            <Detail.DetailSection>
              <Detail.DetailSectionTitle>
                배경
                {selectedEvent.id !== selectedNode.id && (
                  <Detail.InfoMutedHint>
                    (전체 사건 배경)
                  </Detail.InfoMutedHint>
                )}
              </Detail.DetailSectionTitle>
              {/* 배경은 리치텍스트(HTML) — plain text로 두면 태그가 그대로 노출됨. */}
              <RichTextReadView html={selectedEvent.background} />
            </Detail.DetailSection>
          )}

          {selectedEvent.aftermath && (
            <Detail.DetailSection>
              <Detail.DetailSectionTitle>
                여파
                {selectedEvent.id !== selectedNode.id && (
                  <Detail.InfoMutedHint>
                    (전체 사건 여파)
                  </Detail.InfoMutedHint>
                )}
              </Detail.DetailSectionTitle>
              {/* 여파도 리치텍스트(HTML) — RichTextReadView로 렌더. */}
              <RichTextReadView html={selectedEvent.aftermath} />
            </Detail.DetailSection>
          )}

        </Detail.DetailPanelContent>
      ) : (
        <Detail.DetailPanelEmpty>
          {/* 빈 상태에도 닫기 — 데스크톱 컬럼은 백드롭이 없어 여기에 ✕가 없으면
              상세 자리를 차지한 채 Esc 외 탈출로가 없다(검토 URL-4). */}
          {onClose && (
            <PanelDismissButton
              type="button"
              aria-label="상세 닫기"
              title="닫기 (Esc)"
              onClick={onClose}
            >
              <FiX size={ICON_SIZE.lg} aria-hidden="true" />
            </PanelDismissButton>
          )}
          <Detail.DetailPanelEmptyIcon>
            <FiTarget size={ICON_SIZE.lg} aria-hidden="true" />
          </Detail.DetailPanelEmptyIcon>
          <Detail.DetailPanelEmptyContent>
            <Detail.DetailPanelEmptyTitle>
              사건을 선택해주세요
            </Detail.DetailPanelEmptyTitle>
            <Detail.DetailPanelEmptyDescription>
              좌측에서 사건을 클릭하면 이 자리에 상세가 표시됩니다.
            </Detail.DetailPanelEmptyDescription>
          </Detail.DetailPanelEmptyContent>
        </Detail.DetailPanelEmpty>
      )}

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="사건 삭제"
        message={
          <>
            이 사건을 삭제하시겠습니까?
            <br />
            삭제 후에는 목록에서 복구할 수 없습니다.
            {/* 서버가 살아있는 하위 사건을 최상위로 승격시킨다(계층은 복원되지
                않음) — 삭제 전에 그 결과를 고지한다. */}
            {selectedNode?.children && selectedNode.children.length > 0 && (
              <>
                <br />
                <br />
                하위 사건 {selectedNode.children.length}개는 삭제되지 않고{' '}
                <strong>최상위 사건으로 이동</strong>합니다. 이 상·하위 연결은
                되돌릴 수 없습니다.
              </>
            )}
          </>
        }
        confirmLabel="삭제"
        cancelLabel="취소"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </Detail.DetailPanel>
  )
}

/**
 * 빈 상태·미발견 상태의 닫기 ✕ — 헤더가 없는 분기의 유일한 탈출로(검토 URL-4).
 * `DetailPanelEmpty`가 `position: relative`라 우상단에 얹는다.
 */
const PanelDismissButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'};
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
  }
`

/* 상위 사건 링크 — 정보 그리드 값 자리의 텍스트 버튼. 드로어 전환 액션임을
   링크 시각(파랑·hover 밑줄)으로 신호한다. */
const ParentEventLink = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: inherit;
  font-weight: 600;
  text-align: left;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#93c5fd' : '#2563eb')};
  cursor: pointer;
  word-break: keep-all;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: none;
    border-radius: 4px;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
  }
`

/* 사라진 사건의 id — 지원 문의·URL 확인용 단서. 본문보다 한 단계 약하게. */
const MissingIdHint = styled.code`
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: ${({ theme }) => theme.colors.text.tertiary};
  word-break: break-all;
`

const NotFoundAction = styled.button`
  margin-top: 16px;
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

/* 조건 밖 선택 배너 — 목록과 드로어가 다른 모집단을 보여줄 때만 뜬다(검토 INT-3). */
const OutOfScopeBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  font-size: 12.5px;
  line-height: 1.5;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(251,191,36,0.24)' : 'rgba(180,83,9,0.22)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(251,191,36,0.10)' : 'rgba(251,191,36,0.14)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#854d0e')};
`

const OutOfScopeAction = styled.button`
  flex-shrink: 0;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(251,191,36,0.4)' : 'rgba(180,83,9,0.35)'};
  background: transparent;
  color: inherit;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(251,191,36,0.16)' : 'rgba(180,83,9,0.10)'};
  }
`
