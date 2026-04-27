/**
 * 이벤트 상세 정보 패널
 * FSD: widgets/event-list/ui
 */
import React from 'react'

import { toast } from 'react-hot-toast'
import {
  FiArrowRight,
  FiBookOpen,
  FiCalendar,
  FiClock,
  FiEdit2,
  FiGitBranch,
  FiGlobe,
  FiLayers,
  FiMapPin,
  FiShare2,
  FiTarget,
  FiTrash2,
  FiUsers,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

import { getCategoryName } from '@/features/event-list/lib'
import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '@/pages/events/create/events.types'
import * as Detail from '@/pages/events/styles/detail.styles'
import * as Modal from '@/pages/events/styles/modal.styles'
import * as Skeleton from '@/pages/events/styles/skeleton.styles'
import { formatCompactNumber } from '@/pages/events/utils/events.utils'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import { deleteEvent } from '@/shared/api/events'
import { pathKeys } from '@/shared/router'

interface EventDetailPanelProps {
  isLoading: boolean
  selectedEvent: HistoricalEvent | null
  selectedNode: EventHierarchyNode | null
  dbCategories: EventCategoryDto[]
  personsWithGovPositions?: any[]
  eventHeadsOfState?: Map<string, any[]>
  onSelectEvent?: (eventId: string) => void
  onExpandEvent?: (eventId: string) => void
  onShowSummary?: (eventId: string) => void
}

export const EventDetailPanel: React.FC<EventDetailPanelProps> = ({
  isLoading,
  selectedEvent,
  selectedNode,
  dbCategories,
  personsWithGovPositions = [],
  eventHeadsOfState = new Map(),
  onSelectEvent,
  onExpandEvent,
  onShowSummary,
}) => {
  const navigate = useNavigate()

  // 현재 선택된 사건의 국가 원수 정보 가져오기
  const currentHeadsOfState =
    selectedEvent && eventHeadsOfState
      ? eventHeadsOfState.get(selectedEvent.id) || []
      : []

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
          {/* 히어로 이미지 */}
          <Detail.DetailHeroImage
            $isEmpty={!selectedEvent.visuals.heroImageUrl}
            style={
              selectedEvent.visuals.heroImageUrl
                ? {
                    backgroundImage: `url(${selectedEvent.visuals.heroImageUrl})`,
                  }
                : undefined
            }
          >
            {selectedEvent.visuals.heroImageUrl && (
              <Detail.DetailCategory $category={selectedEvent.category}>
                {getCategoryName(selectedEvent.category, dbCategories)}
              </Detail.DetailCategory>
            )}
          </Detail.DetailHeroImage>

          {/* 제목 및 액션 버튼 */}
          <Detail.DetailPanelHeader
            style={{ position: 'relative', paddingRight: '0' }}
          >
            <Detail.DetailTitle>{selectedNode.title}</Detail.DetailTitle>
            {selectedNode.summary && (
              <Detail.DetailDescription>
                {selectedNode.summary}
              </Detail.DetailDescription>
            )}

            {/* 액션 버튼 */}
            <ActionButtonRow>
              <ActionButton
                $variant="default"
                onClick={() => {
                  const url = `${window.location.origin}${pathKeys.events.detail(selectedNode.id)}`
                  navigator.clipboard.writeText(url).then(() => {
                    alert('링크가 복사되었습니다!')
                  })
                }}
              >
                <FiShare2 size={15} />
                공유
              </ActionButton>
              <ActionButton
                $variant="default"
                onClick={() => navigate(pathKeys.events.edit(selectedNode.id))}
              >
                <FiEdit2 size={15} />
                수정
              </ActionButton>
              <ActionButton
                $variant="danger"
                onClick={async () => {
                  if (
                    confirm(
                      '이 사건을 삭제하시겠습니까?\n\n3일 간 보관되며, 이후 자동으로 완전히 삭제됩니다.',
                    )
                  ) {
                    try {
                      await deleteEvent(selectedNode.id)
                      toast.success('사건이 삭제되었습니다. (3일 간 복구 가능)')
                      window.location.reload()
                    } catch (error) {
                      toast.error('사건 삭제에 실패했습니다.')
                    }
                  }
                }}
              >
                <FiTrash2 size={15} />
                삭제
              </ActionButton>
              <ActionButton
                $variant="primary"
                onClick={() =>
                  navigate(pathKeys.events.detail(selectedNode.id))
                }
              >
                상세 보기
                <FiArrowRight size={15} />
              </ActionButton>
            </ActionButtonRow>
          </Detail.DetailPanelHeader>

          {/* 핵심 정보 - 한눈에 보기 */}
          <InfoBlock>
            <InfoGrid>
              <InfoLabel>
                <FiCalendar size={14} />
                <span>기간</span>
              </InfoLabel>
              <InfoValue>
                {formatDate(selectedNode.period.start)}
                {selectedNode.period.end &&
                  selectedNode.period.start !== selectedNode.period.end && (
                    <> ~ {formatDate(selectedNode.period.end)}</>
                  )}
                <InfoMutedHint>({calculateDuration()})</InfoMutedHint>
              </InfoValue>

              {selectedEvent.location && (
                <>
                  <InfoLabel>
                    <FiMapPin size={14} />
                    <span>위치</span>
                  </InfoLabel>
                  <InfoValue>{selectedEvent.location}</InfoValue>
                </>
              )}

              {selectedNode.children && selectedNode.children.length > 0 && (
                <>
                  <InfoLabel>
                    <FiLayers size={14} />
                    <span>하위 사건</span>
                  </InfoLabel>
                  <InfoValue>{selectedNode.children.length}개</InfoValue>
                </>
              )}

              {selectedEvent.category === 'military' && (
                <>
                  {selectedEvent.stats.participatingNations > 0 && (
                    <>
                      <InfoLabel>
                        <FiGlobe size={14} />
                        <span>참전국</span>
                      </InfoLabel>
                      <InfoValue>
                        {selectedEvent.stats.participatingNations}개국
                      </InfoValue>
                    </>
                  )}

                  {selectedEvent.stats.casualties.total > 0 && (
                    <>
                      <InfoLabel>
                        <FiUsers size={14} />
                        <span>사상자</span>
                      </InfoLabel>
                      <InfoValue>
                        {formatCompactNumber(
                          selectedEvent.stats.casualties.total,
                        )}
                        명
                      </InfoValue>
                    </>
                  )}
                </>
              )}

              {/* 관련 국가 */}
              {((selectedEvent as any).relatedCountries?.length > 0 ||
                (selectedEvent as any).relatedHistoricalCountries?.length >
                  0) && (
                <>
                  <InfoLabel>
                    <FiGlobe size={14} />
                    <span>관련 국가</span>
                  </InfoLabel>
                  <ChipRow>
                    {(selectedEvent as any).relatedCountries?.map(
                      (country: any) => (
                        <CountryChip key={country.id}>
                          {country.flagEmoji} {country.name}
                        </CountryChip>
                      ),
                    )}
                    {(selectedEvent as any).relatedHistoricalCountries?.map(
                      (country: any) => (
                        <HistoricalCountryChip key={country.id}>
                          🏛️ {country.name}
                        </HistoricalCountryChip>
                      ),
                    )}
                  </ChipRow>
                </>
              )}

              {/* 작성된 섹션 */}
              {((selectedEvent.eventSections &&
                selectedEvent.eventSections.length > 0) ||
                (selectedEvent.sectionTitles &&
                  selectedEvent.sectionTitles.length > 0)) && (
                <>
                  <InfoLabel>
                    <FiBookOpen size={14} />
                    <span>본문 구성</span>
                  </InfoLabel>
                  <ChipRow>
                    {selectedEvent.eventSections?.map((section) => (
                      <SectionChip key={section.id}>
                        {section.title}
                      </SectionChip>
                    )) ||
                      selectedEvent.sectionTitles?.map((title, idx) => (
                        <SectionChip key={idx}>{title}</SectionChip>
                      ))}
                  </ChipRow>
                </>
              )}
            </InfoGrid>
          </InfoBlock>

          {/* 배경 */}
          {selectedEvent.id === selectedNode.id && selectedEvent.background && (
            <Detail.DetailSection>
              <Detail.DetailSectionTitle>배경</Detail.DetailSectionTitle>
              <Detail.DetailText>{selectedEvent.background}</Detail.DetailText>
            </Detail.DetailSection>
          )}

          {/* 여파 */}
          {selectedEvent.id === selectedNode.id && selectedEvent.aftermath && (
            <Detail.DetailSection>
              <Detail.DetailSectionTitle>여파</Detail.DetailSectionTitle>
              <Detail.DetailText>{selectedEvent.aftermath}</Detail.DetailText>
            </Detail.DetailSection>
          )}

          {/* 하위 사건 */}
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
                  <FiGitBranch size={14} />
                  전체 계층 구조 보기 ({selectedNode.children.length}개)
                </Modal.ViewAllHierarchyButton>
              )}
            </Detail.DetailSection>
          )}
        </Detail.DetailPanelContent>
      ) : (
        <Detail.DetailPanelEmpty>
          <Detail.DetailPanelEmptyIcon>
            <FiTarget />
          </Detail.DetailPanelEmptyIcon>
          <Detail.DetailPanelEmptyContent>
            <Detail.DetailPanelEmptyTitle>
              사건을 선택해주세요
            </Detail.DetailPanelEmptyTitle>
            <Detail.DetailPanelEmptyDescription>
              좌측 목록에서 사건을 클릭하여 상세 정보를 확인할 수 있습니다
            </Detail.DetailPanelEmptyDescription>
          </Detail.DetailPanelEmptyContent>
        </Detail.DetailPanelEmpty>
      )}
    </Detail.DetailPanel>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// styled (theme-aware)
// ─────────────────────────────────────────────────────────────────────────────

const ActionButtonRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
`

type ActionVariant = 'default' | 'danger' | 'primary'

const ActionButton = styled.button<{ $variant: ActionVariant }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ $variant, theme }) => {
    if ($variant === 'primary') {
      return theme.mode === 'dark'
        ? css`
            background: #f8fafc;
            border: 1px solid #f8fafc;
            color: #0f172a;
            &:hover {
              background: #e2e8f0;
              border-color: #e2e8f0;
            }
          `
        : css`
            background: #0f172a;
            border: 1px solid #0f172a;
            color: #ffffff;
            &:hover {
              background: #1e293b;
              border-color: #1e293b;
            }
          `
    }
    if ($variant === 'danger') {
      return theme.mode === 'dark'
        ? css`
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(239, 68, 68, 0.45);
            color: #f87171;
            &:hover {
              background: rgba(239, 68, 68, 0.12);
              border-color: rgba(239, 68, 68, 0.6);
            }
          `
        : css`
            background: #ffffff;
            border: 1px solid #ef4444;
            color: #ef4444;
            &:hover {
              background: #fef2f2;
              border-color: #dc2626;
            }
          `
    }
    // default
    return theme.mode === 'dark'
      ? css`
          flex: 1;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: ${theme.colors.text.secondary};
          &:hover {
            border-color: rgba(99, 102, 241, 0.45);
            color: #a5b4fc;
            background: rgba(255, 255, 255, 0.07);
          }
        `
      : css`
          flex: 1;
          background: #ffffff;
          border: 1px solid #d1d5db;
          color: #374151;
          &:hover {
            border-color: #6366f1;
            color: #6366f1;
          }
        `
  }}
`

const InfoBlock = styled.div`
  padding: 0 20px 16px 20px;
`

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 16px;
  font-size: 13px;
  line-height: 1.8;
`

const InfoLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const InfoValue = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 500;
`

const InfoMutedHint = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-left: 8px;
`

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
`

const CountryChip = styled.span`
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 8px;
  font-weight: 600;
  border: 1px solid rgba(99, 102, 241, 0.2);
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(99, 102, 241, 0.18);
          color: #c7d2fe;
          border-color: rgba(99, 102, 241, 0.35);
        `
      : css`
          background: linear-gradient(
            135deg,
            #eef2ff 0%,
            #e0e7ff 100%
          );
          color: #4f46e5;
        `}
`

const HistoricalCountryChip = styled.span`
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 8px;
  font-weight: 600;
  border: 1px solid rgba(245, 158, 11, 0.2);
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(245, 158, 11, 0.18);
          color: #fcd34d;
          border-color: rgba(245, 158, 11, 0.35);
        `
      : css`
          background: linear-gradient(
            135deg,
            #fef3c7 0%,
            #fde68a 100%
          );
          color: #92400e;
        `}
`

const SectionChip = styled.span`
  display: inline-block;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.06);
          color: ${theme.colors.text.secondary};
        `
      : css`
          background: #f1f5f9;
          color: #475569;
        `}
`
