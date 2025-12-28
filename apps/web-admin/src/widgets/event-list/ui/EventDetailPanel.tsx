/**
 * 이벤트 상세 정보 패널
 * FSD: widgets/event-list/ui
 */
import React from 'react'

import {
  FiArrowRight,
  FiClock,
  FiEdit2,
  FiGitBranch,
  FiGlobe,
  FiLayers,
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
  onSelectEvent?: (eventId: string) => void
  onExpandEvent?: (eventId: string) => void
  onShowSummary?: (eventId: string) => void
}

export const EventDetailPanel: React.FC<EventDetailPanelProps> = ({
  isLoading,
  selectedEvent,
  selectedNode,
  dbCategories,
  onSelectEvent,
  onExpandEvent,
  onShowSummary,
}) => {
  const navigate = useNavigate()

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
              <div style={{ marginTop: '10px' }}>
                <Skeleton.SkeletonText $width="80%" />
                <div style={{ marginTop: '8px' }}>
                  <Skeleton.SkeletonText $width="95%" />
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Skeleton.SkeletonText $width="88%" />
                </div>
              </div>
            </Skeleton.DetailPanelSkeleton>
          </>
        </Detail.DetailPanelContent>
      ) : selectedEvent && selectedNode ? (
        <Detail.DetailPanelContent>
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
          <Detail.DetailPanelHeader>
            <Detail.DetailTitle>{selectedNode.title}</Detail.DetailTitle>
            <Detail.DetailDescription>
              {selectedNode.summary}
            </Detail.DetailDescription>
          </Detail.DetailPanelHeader>

          <Detail.DetailSection>
            <Detail.DetailSectionTitle>핵심 정보</Detail.DetailSectionTitle>
            <Detail.DetailStatsGrid>
              <Detail.DetailStatCard>
                <FiClock />
                <div>
                  <small>기간</small>
                  <strong>
                    {(() => {
                      const start = new Date(selectedNode.period.start)
                      const end = selectedNode.period.end
                        ? new Date(selectedNode.period.end)
                        : null

                      if (!end || start.getTime() === end.getTime()) {
                        return '1일'
                      }

                      const diffTime = Math.abs(end.getTime() - start.getTime())
                      const diffDays = Math.ceil(
                        diffTime / (1000 * 60 * 60 * 24),
                      )
                      return `${diffDays}일`
                    })()}
                  </strong>
                </div>
              </Detail.DetailStatCard>
              {selectedEvent.category === 'military' && (
                <>
                  <Detail.DetailStatCard>
                    <FiUsers />
                    <div>
                      <small>총 사상자</small>
                      <strong>
                        {formatCompactNumber(
                          selectedEvent.stats.casualties.total,
                        )}
                        명
                      </strong>
                    </div>
                  </Detail.DetailStatCard>
                  <Detail.DetailStatCard>
                    <FiGlobe />
                    <div>
                      <small>참전국</small>
                      <strong>
                        {selectedEvent.stats.participatingNations}개국
                      </strong>
                    </div>
                  </Detail.DetailStatCard>
                </>
              )}
              <Detail.DetailStatCard>
                <FiLayers />
                <div>
                  <small>하위 사건</small>
                  <strong>{selectedNode.children?.length ?? 0}개</strong>
                </div>
              </Detail.DetailStatCard>
            </Detail.DetailStatsGrid>
          </Detail.DetailSection>

          {selectedEvent.id === selectedNode.id && (
            <>
              <Detail.DetailSection>
                <Detail.DetailSectionTitle>배경</Detail.DetailSectionTitle>
                <Detail.DetailText>
                  {selectedEvent.background}
                </Detail.DetailText>
              </Detail.DetailSection>

              <Detail.DetailSection>
                <Detail.DetailSectionTitle>여파</Detail.DetailSectionTitle>
                <Detail.DetailText>{selectedEvent.aftermath}</Detail.DetailText>
              </Detail.DetailSection>
            </>
          )}

          {selectedEvent.id === selectedNode.id && (
            <>
              {selectedEvent.keyFigures.length > 0 && (
                <Detail.DetailSection>
                  <Detail.DetailSectionTitle>
                    핵심 인물
                  </Detail.DetailSectionTitle>
                  <Detail.DetailFiguresList>
                    {selectedEvent.keyFigures.slice(0, 3).map((figure) => (
                      <Detail.DetailFigureCard key={figure.id}>
                        <Detail.DetailFigureAvatar>
                          {figure.name
                            .split(' ')
                            .map((token) => token[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </Detail.DetailFigureAvatar>
                        <div>
                          <strong>{figure.name}</strong>
                          <span>{figure.role}</span>
                          <small>{figure.nation}</small>
                        </div>
                      </Detail.DetailFigureCard>
                    ))}
                  </Detail.DetailFiguresList>
                </Detail.DetailSection>
              )}

              {selectedEvent.category === 'military' &&
                selectedEvent.countries.length > 0 && (
                  <Detail.DetailSection>
                    <Detail.DetailSectionTitle>
                      참전 국가
                    </Detail.DetailSectionTitle>
                    <Detail.DetailCountriesGrid>
                      {selectedEvent.countries.slice(0, 6).map((country) => (
                        <Detail.DetailCountryTag key={country.id}>
                          {country.name}
                        </Detail.DetailCountryTag>
                      ))}
                    </Detail.DetailCountriesGrid>
                  </Detail.DetailSection>
                )}
            </>
          )}

          {selectedNode.children && selectedNode.children.length > 0 && (
            <Detail.DetailSection>
              <Detail.DetailSectionTitle>
                하위 사건 ({selectedNode.children.length}개)
              </Detail.DetailSectionTitle>
              <Detail.DetailChildrenList>
                {selectedNode.children.slice(0, 3).map((child) => (
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
              {selectedNode.children.length > 3 && (
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

          <Detail.DetailActions>
            <Detail.SecondaryActionsRow>
              <Detail.SecondaryActionButton
                onClick={() =>
                  navigate(pathKeys.history.eventsCreate(), {
                    state: { editEventId: selectedNode.id },
                  })
                }
              >
                <FiEdit2 />
                수정
              </Detail.SecondaryActionButton>
              {selectedNode.children && selectedNode.children.length > 0 && (
                <Detail.SecondaryActionButton
                  onClick={() => {
                    if (onShowSummary) {
                      onShowSummary(selectedNode.id)
                    }
                  }}
                >
                  <FiGitBranch />
                  관계
                </Detail.SecondaryActionButton>
              )}
              <Detail.SecondaryActionButton
                onClick={() =>
                  navigate(pathKeys.history.eventsDetail(selectedNode.id))
                }
              >
                상세
                <FiArrowRight />
              </Detail.SecondaryActionButton>
            </Detail.SecondaryActionsRow>
          </Detail.DetailActions>
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
