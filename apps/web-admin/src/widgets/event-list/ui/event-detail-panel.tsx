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

import { toast } from 'react-hot-toast'
import {
  FiArrowRight,
  FiBookOpen,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
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
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

import { getCategoryName } from '@/features/event-list/lib'
import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '@/pages/events/create/events.types'
import * as Detail from '@/pages/events/styles/detail.styles'
import { RichTextReadView } from '@/shared/ui/rich-text-read-view'
import * as Modal from '@/pages/events/styles/modal.styles'
import * as Skeleton from '@/pages/events/styles/skeleton.styles'
import { ICON_SIZE } from '@/pages/events/styles/theme'
import { formatCompactNumber } from '@/pages/events/utils/events.utils'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import { deleteEvent } from '@/shared/api/events'
import { pathKeys } from '@/shared/router'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog'

interface EventDetailPanelProps {
  isLoading: boolean
  selectedEvent: HistoricalEvent | null
  selectedNode: EventHierarchyNode | null
  dbCategories: EventCategoryDto[]
  /** events.page에서 정의 — 이벤트별 국가 원수 맵. 현재 미사용이지만 후속 기능 대비 prop 보존 (optional) */
  eventHeadsOfState?: Map<string, unknown[]>
  onSelectEvent?: (eventId: string) => void
  onExpandEvent?: (eventId: string) => void
  onShowSummary?: (eventId: string) => void
  /** 삭제 후 부모가 캐시 invalidate 하도록 — 미전달 시 fallback으로 reload (기존 동작 유지) */
  onAfterDelete?: (eventId: string) => void
  /** 이전/다음 사건으로 이동 — 키보드(↑↓)와 동등하나 마우스 사용자용. 더 이상 없으면 undefined. */
  onPrev?: () => void
  onNext?: () => void
  /** 상세 패널 닫기 — 데스크톱 column 모드에서도 X 버튼으로 명시적 닫기 제공 */
  onClose?: () => void
}

export const EventDetailPanel: React.FC<EventDetailPanelProps> = ({
  isLoading,
  selectedEvent,
  selectedNode,
  dbCategories,
  onSelectEvent,
  onExpandEvent,
  onShowSummary,
  onAfterDelete,
  onPrev,
  onNext,
  onClose,
}) => {
  const navigate = useNavigate()
  const [descExpanded, setDescExpanded] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  // 새 사건 선택될 때마다 description clamp 초기화
  React.useEffect(() => {
    setDescExpanded(false)
  }, [selectedNode?.id])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
  }

  const calculateDuration = () => {
    if (!selectedNode) return ''
    const start = new Date(selectedNode.period.start)
    const end = selectedNode.period.end
      ? new Date(selectedNode.period.end)
      : null

    if (!end || start.getTime() === end.getTime()) {
      return '1일'
    }

    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays >= 365) {
      const years = Math.floor(diffDays / 365)
      const remainingDays = diffDays % 365
      return remainingDays > 0 ? `${years}년 ${remainingDays}일` : `${years}년`
    }

    return `${diffDays}일`
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
      toast.success('링크가 복사되었습니다')
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
        toast.success('링크가 복사되었습니다')
      } catch {
        toast.error('링크 복사에 실패했습니다')
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
      toast.success('사건이 삭제되었습니다. (3일 간 복구 가능)')
      if (onAfterDelete) {
        onAfterDelete(selectedNode.id)
      } else {
        // 부모가 콜백 안 주면 기존 동작 유지 (호환)
        window.location.reload()
      }
    } catch {
      toast.error('사건 삭제에 실패했습니다.')
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
    // placeholder — 클릭 시 편집 페이지로 (이미지 추가 동선)
    return (
      <Detail.HeroFigure>
        <Detail.HeroPlaceholder
          type="button"
          aria-label="이미지 추가 — 편집으로 이동"
          onClick={() => navigate(pathKeys.events.edit(selectedNode.id))}
        >
          <FiImage size={28} aria-hidden="true" />
          <span>대표 이미지 없음 — 클릭하여 추가</span>
        </Detail.HeroPlaceholder>
      </Detail.HeroFigure>
    )
  }

  const renderInfo = () => {
    if (!selectedEvent || !selectedNode) return null
    const relatedCountries = selectedEvent.relatedCountries ?? []
    const relatedHistorical = selectedEvent.relatedHistoricalCountries ?? []
    const sections = selectedEvent.eventSections ?? []
    const sectionTitles = selectedEvent.sectionTitles ?? []
    const hasSections = sections.length > 0 || sectionTitles.length > 0
    const isMilitary = selectedEvent.category === 'military'

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
            {formatDate(selectedNode.period.start)}
            {selectedNode.period.end &&
              selectedNode.period.start !== selectedNode.period.end && (
                <> ~ {formatDate(selectedNode.period.end)}</>
              )}
            <Detail.InfoMutedHint>({calculateDuration()})</Detail.InfoMutedHint>
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

          {selectedNode.children && selectedNode.children.length > 0 && (
            <>
              <Detail.InfoLabel>
                <FiLayers size={ICON_SIZE.base} aria-hidden="true" />
                <span>하위 사건</span>
              </Detail.InfoLabel>
              <Detail.InfoValue>{selectedNode.children.length}개</Detail.InfoValue>
            </>
          )}

          {isMilitary && selectedEvent.stats.participatingNations > 0 && (
            <>
              <Detail.InfoLabel>
                <FiGlobe size={ICON_SIZE.base} aria-hidden="true" />
                <span>참전국</span>
              </Detail.InfoLabel>
              <Detail.InfoValue>
                {selectedEvent.stats.participatingNations}개국
              </Detail.InfoValue>
            </>
          )}

          {isMilitary && selectedEvent.stats.casualties.total > 0 && (
            <>
              <Detail.InfoLabel>
                <FiUsers size={ICON_SIZE.base} aria-hidden="true" />
                <span>사상자</span>
              </Detail.InfoLabel>
              <Detail.InfoValue>
                {formatCompactNumber(selectedEvent.stats.casualties.total)}명
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
      {isLoading ? (
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
                title="이전 사건 (↑)"
                aria-label="이전 사건"
                disabled={!onPrev}
                onClick={() => onPrev?.()}
              >
                <FiChevronLeft size={ICON_SIZE.base} aria-hidden="true" />
              </Detail.ActionButton>
              <Detail.ActionButton
                $variant="ghost"
                title="다음 사건 (↓)"
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
                onClick={() => navigate(pathKeys.events.edit(selectedNode.id))}
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

          {selectedNode.children && selectedNode.children.length > 0 && (
            <Detail.DetailSection>
              <Detail.DetailSectionTitle>
                하위 사건 ({selectedNode.children.length}개)
              </Detail.DetailSectionTitle>
              <Detail.DetailChildrenList>
                {selectedNode.children.slice(0, 5).map((child) => (
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
                    <span>{child.summary}</span>
                  </Detail.DetailChildItem>
                ))}
              </Detail.DetailChildrenList>
              {selectedNode.children.length > 5 && (
                <Modal.ViewAllHierarchyButton
                  type="button"
                  onClick={() => {
                    if (onShowSummary) {
                      onShowSummary(selectedNode.id)
                    }
                  }}
                >
                  <FiGitBranch size={ICON_SIZE.base} aria-hidden="true" />
                  전체 계층 구조 보기 ({selectedNode.children.length}개)
                </Modal.ViewAllHierarchyButton>
              )}
            </Detail.DetailSection>
          )}
        </Detail.DetailPanelContent>
      ) : (
        <Detail.DetailPanelEmpty>
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
            3일 간 보관되며, 이후 자동으로 완전히 삭제됩니다.
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
