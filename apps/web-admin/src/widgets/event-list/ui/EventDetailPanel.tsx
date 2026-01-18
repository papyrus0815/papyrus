/**
 * 이벤트 상세 정보 패널
 * FSD: widgets/event-list/ui
 */
import React from 'react'

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
  FiTarget,
  FiUsers,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

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
  const currentHeadsOfState = selectedEvent && eventHeadsOfState
    ? eventHeadsOfState.get(selectedEvent.id) || []
    : []

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
  }

  const calculateDuration = () => {
    if (!selectedNode) return ''
    const start = new Date(selectedNode.period.start)
    const end = selectedNode.period.end ? new Date(selectedNode.period.end) : null

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
          <Detail.DetailPanelHeader style={{ position: 'relative', paddingRight: '0' }}>
            <Detail.DetailTitle>{selectedNode.title}</Detail.DetailTitle>
            {selectedNode.summary && (
              <Detail.DetailDescription>
                {selectedNode.summary}
              </Detail.DetailDescription>
            )}
            
            {/* 액션 버튼 - 개별 크기 */}
            <div style={{
              display: 'flex',
              gap: '10px',
              marginTop: '20px'
            }}>
              <button
                onClick={() =>
                  navigate(pathKeys.events.create(), {
                    state: { editEventId: selectedNode.id },
                  })
                }
                style={{
                  padding: '11px 20px',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#9ca3af'
                  e.currentTarget.style.background = '#f9fafb'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db'
                  e.currentTarget.style.background = 'white'
                }}
              >
                <FiEdit2 size={15} />
                수정
              </button>
              <button
                onClick={() =>
                  navigate(pathKeys.events.detail(selectedNode.id))
                }
                style={{
                  padding: '11px 20px',
                  background: '#0f172a',
                  border: '1px solid #0f172a',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1e293b'
                  e.currentTarget.style.borderColor = '#1e293b'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#0f172a'
                  e.currentTarget.style.borderColor = '#0f172a'
                }}
              >
                상세 보기
                <FiArrowRight size={15} />
              </button>
            </div>
          </Detail.DetailPanelHeader>

          {/* 핵심 정보 - 한눈에 보기 */}
          <div style={{ padding: '0 20px 16px 20px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '8px 16px',
              fontSize: '13px',
              lineHeight: '1.8'
            }}>
              <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiCalendar size={14} />
                <span>기간</span>
              </div>
              <div style={{ color: '#1e293b', fontWeight: 500 }}>
                {formatDate(selectedNode.period.start)}
                {selectedNode.period.end && selectedNode.period.start !== selectedNode.period.end && (
                  <> ~ {formatDate(selectedNode.period.end)}</>
                )}
                <span style={{ color: '#94a3b8', marginLeft: '8px' }}>({calculateDuration()})</span>
              </div>

              {selectedEvent.location && (
                <>
                  <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiMapPin size={14} />
                    <span>위치</span>
                  </div>
                  <div style={{ color: '#1e293b', fontWeight: 500 }}>
                    {selectedEvent.location}
                  </div>
                </>
              )}

              {selectedNode.children && selectedNode.children.length > 0 && (
                <>
                  <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiLayers size={14} />
                    <span>하위 사건</span>
                  </div>
                  <div style={{ color: '#1e293b', fontWeight: 500 }}>
                    {selectedNode.children.length}개
                  </div>
                </>
              )}

              {selectedEvent.category === 'military' && (
                <>
                  {selectedEvent.stats.participatingNations > 0 && (
                    <>
                      <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FiGlobe size={14} />
                        <span>참전국</span>
                      </div>
                      <div style={{ color: '#1e293b', fontWeight: 500 }}>
                        {selectedEvent.stats.participatingNations}개국
                      </div>
                    </>
                  )}

                  {selectedEvent.stats.casualties.total > 0 && (
                    <>
                      <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FiUsers size={14} />
                        <span>사상자</span>
                      </div>
                      <div style={{ color: '#1e293b', fontWeight: 500 }}>
                        {formatCompactNumber(selectedEvent.stats.casualties.total)}명
                      </div>
                    </>
                  )}
                </>
              )}

              {/* 작성된 섹션 */}
              {selectedEvent.sectionTitles && selectedEvent.sectionTitles.length > 0 && (
                <>
                  <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiBookOpen size={14} />
                    <span>본문 구성</span>
                  </div>
                  <div style={{ color: '#1e293b' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                      {selectedEvent.sectionTitles.map((title, idx) => (
                        <span 
                          key={idx}
                          style={{
                            display: 'inline-block',
                            fontSize: '12px',
                            padding: '2px 8px',
                            background: '#f1f5f9',
                            borderRadius: '4px',
                            color: '#475569',
                            fontWeight: 500
                          }}
                        >
                          {title}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 배경 */}
          {selectedEvent.id === selectedNode.id && selectedEvent.background && (
            <Detail.DetailSection>
              <Detail.DetailSectionTitle>배경</Detail.DetailSectionTitle>
              <Detail.DetailText>
                {selectedEvent.background}
              </Detail.DetailText>
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
