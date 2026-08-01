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
  FiX,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

import { getCategoryName } from '@/features/event-list/lib'
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
  isOutOfScope = false,
  onResetFilters,
  onClose,
}) => {
  const navigate = useNavigate()
  const [descExpanded, setDescExpanded] = useState(false)
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

          {selectedNode.children && selectedNode.children.length > 0 && (
            <>
              <Detail.InfoLabel>
                <FiLayers size={ICON_SIZE.base} aria-hidden="true" />
                <span>하위 사건</span>
              </Detail.InfoLabel>
              <Detail.InfoValue>{selectedNode.children.length}개</Detail.InfoValue>
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
          {/* 조건 밖 선택 고지 — 목록엔 없는데 상세만 열려 있는 상태를 설명한다. */}
          {isOutOfScope && (
            <OutOfScopeBanner role="status">
              <span>
                이 사건은 현재 목록 조건 밖입니다 — 목록에는 표시되지 않아
                이전/다음 이동을 쓸 수 없습니다.
              </span>
              {onResetFilters && (
                <OutOfScopeAction type="button" onClick={onResetFilters}>
                  필터 초기화
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
