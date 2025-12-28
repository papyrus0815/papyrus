import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  FiClock,
  FiEdit2,
  FiGlobe,
  FiLayers,
  FiMapPin,
  FiNavigation,
  FiTarget,
  FiUsers,
} from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import { pathKeys } from '@/shared/router'

import { MOCK_HISTORICAL_EVENTS } from './events.mock-data'
import { EventHierarchyNode, EventMapMarker } from './events.types'
import {
  findEventById,
  formatCompactNumber,
  formatDateRange,
  hierarchyDepth,
} from './events.utils'

const SECTION_LINKS = [
  { id: 'overview', label: '개요' },
  { id: 'gallery', label: '이미지' },
  { id: 'context', label: '배경/여파' },
  { id: 'timeline', label: '타임라인' },
  { id: 'theaters', label: '전구' },
  { id: 'figures', label: '핵심 인물' },
  { id: 'countries', label: '참전 국가' },
]

const projectCoordinates = (marker: EventMapMarker) => {
  const clampedLat = Math.max(-60, Math.min(80, marker.coordinates.lat))
  const clampedLng = Math.max(-180, Math.min(180, marker.coordinates.lng))

  const top = ((90 - clampedLat) / 180) * 100
  const left = ((clampedLng + 180) / 360) * 100

  return { top: `${top}%`, left: `${left}%` }
}

export const EventDetailPage: React.FC = () => {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<string>('overview')

  const selectedEvent = useMemo(
    () => findEventById(MOCK_HISTORICAL_EVENTS, eventId),
    [eventId],
  )

  // 관련 사건 목록 (같은 카테고리)
  const relatedEvents = useMemo(() => {
    if (!selectedEvent) return []
    return MOCK_HISTORICAL_EVENTS.filter(
      (event) =>
        event.category === selectedEvent.category &&
        event.id !== selectedEvent.id,
    ).slice(0, 10)
  }, [selectedEvent])

  const scrollToSection = useCallback((targetId: string, updateHash = true) => {
    const target = document.getElementById(targetId)
    if (target) {
      const headerHeight = 80 // 헤더 높이 + 여백
      const targetPosition =
        target.getBoundingClientRect().top + window.pageYOffset - headerHeight

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth',
      })

      if (updateHash) {
        window.history.replaceState(null, '', `#${targetId}`)
      }
    }
  }, [])

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0,
    }

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id)
        }
      })
    }

    const observer = new IntersectionObserver(observerCallback, observerOptions)

    // 모든 섹션을 관찰
    SECTION_LINKS.forEach((link) => {
      const element = document.getElementById(link.id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => {
      observer.disconnect()
    }
  }, [selectedEvent])

  useEffect(() => {
    // URL 해시가 있으면 해당 섹션으로 스크롤
    const hash = window.location.hash.slice(1)
    if (hash && SECTION_LINKS.some((link) => link.id === hash)) {
      setTimeout(() => {
        scrollToSection(hash, false)
      }, 100)
    }
  }, [selectedEvent, scrollToSection])

  if (!selectedEvent) {
    return (
      <PageWrapper>
        <EmptyStateWrapper>
          <EmptyState>
            <p>표시할 사건 데이터가 없습니다.</p>
            <span>mock 데이터를 확인해 주세요.</span>
          </EmptyState>
          <BackLink
            type="button"
            onClick={() => navigate(pathKeys.history.events())}
          >
            사건 목록으로 돌아가기
          </BackLink>
        </EmptyStateWrapper>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <DetailContentWrapper>
        {/* 좌측: 관련 사건 목록 */}
        <LeftSidebar>
          <SidebarActions>
            <BackLink
              type="button"
              onClick={() => navigate(pathKeys.history.events())}
            >
              ← 목록으로
            </BackLink>
            <EditButton
              type="button"
              onClick={() =>
                navigate(pathKeys.history.eventsCreate(), {
                  state: { editEventId: selectedEvent.id },
                })
              }
            >
              <FiEdit2 />
              수정
            </EditButton>
          </SidebarActions>

          <RelatedEventsPanel>
            <RelatedEventsHeader>
              <span>같은 카테고리</span>
              <strong>관련 사건</strong>
            </RelatedEventsHeader>
            <RelatedEventsList>
              {relatedEvents.map((event) => (
                <RelatedEventItem
                  key={event.id}
                  $active={event.id === selectedEvent.id}
                  type="button"
                  onClick={() =>
                    navigate(pathKeys.history.eventsDetail(event.id))
                  }
                >
                  <RelatedEventDot $category={selectedEvent.category} />
                  <RelatedEventContent>
                    <RelatedEventTitle>{event.title}</RelatedEventTitle>
                    <RelatedEventMeta>
                      {formatDateRange(event.startDate, event.endDate)}
                    </RelatedEventMeta>
                  </RelatedEventContent>
                </RelatedEventItem>
              ))}
            </RelatedEventsList>
          </RelatedEventsPanel>

          <SidebarPanel>
            <SidebarSectionTitle>핵심 통계</SidebarSectionTitle>
            <SidebarStat>
              <FiClock />
              <div>
                <span>기간</span>
                <strong>
                  {formatDateRange(
                    selectedEvent.startDate,
                    selectedEvent.endDate,
                  )}
                </strong>
              </div>
            </SidebarStat>
            <SidebarStat>
              <FiUsers />
              <div>
                <span>총 사상자</span>
                <strong>
                  {formatCompactNumber(selectedEvent.stats.casualties.total)}명
                </strong>
                <small>
                  민간{' '}
                  {formatCompactNumber(
                    selectedEvent.stats.casualties.civilians,
                  )}{' '}
                  · 군인{' '}
                  {formatCompactNumber(selectedEvent.stats.casualties.military)}
                </small>
              </div>
            </SidebarStat>
            <SidebarStat>
              <FiGlobe />
              <div>
                <span>규모</span>
                <strong>
                  {selectedEvent.stats.participatingNations}개국 ·{' '}
                  {selectedEvent.stats.theaters}개 전구
                </strong>
                <small>{selectedEvent.stats.durationInYears}년간 지속</small>
              </div>
            </SidebarStat>
          </SidebarPanel>

          <SidebarPanel>
            <SidebarSectionTitle>지리 정보</SidebarSectionTitle>
            <MapBoard>
              <MapSurface>
                {selectedEvent.map.markers.map((marker) => {
                  const projected = projectCoordinates(marker)
                  return (
                    <MapMarker
                      key={marker.id}
                      style={{ top: projected.top, left: projected.left }}
                      $category={marker.category}
                    >
                      <span />
                      <label>{marker.label}</label>
                    </MapMarker>
                  )
                })}
              </MapSurface>
              <MapSummary>{selectedEvent.map.summary}</MapSummary>
              <MapLegend>
                <li>
                  <MarkerLegendDot $category="battle" />
                  전투
                </li>
                <li>
                  <MarkerLegendDot $category="turning-point" />
                  전환점
                </li>
                <li>
                  <MarkerLegendDot $category="occupation" />
                  점령/협상
                </li>
              </MapLegend>
            </MapBoard>
          </SidebarPanel>
        </LeftSidebar>

        {/* 중앙: 메인 콘텐츠 */}
        <MainContent>
          <SectionBlock id="overview">
            <HeroSection $heroImage={selectedEvent.visuals.heroImageUrl}>
              <HeroOverlay>
                <HeroTitle>{selectedEvent.title}</HeroTitle>
                <HeroDescription>{selectedEvent.description}</HeroDescription>
              </HeroOverlay>
            </HeroSection>
          </SectionBlock>

          {selectedEvent.visuals.gallery.length > 0 && (
            <GallerySection id="gallery">
              <GalleryHeader>
                사건 이미지<span>현장 사진과 관련 시각 자료</span>
              </GalleryHeader>
              <GalleryGrid>
                {selectedEvent.visuals.gallery.map((asset) => (
                  <GalleryItem key={asset.id}>
                    <GalleryImage
                      style={{ backgroundImage: `url(${asset.url})` }}
                    />
                    <GalleryMeta>
                      <strong>{asset.title}</strong>
                      {asset.caption && <p>{asset.caption}</p>}
                      {asset.source && <small>{asset.source}</small>}
                    </GalleryMeta>
                  </GalleryItem>
                ))}
              </GalleryGrid>
            </GallerySection>
          )}

          <NarrativeGrid id="context">
            <NarrativeCard>
              <CardTitle>배경 (Event.background)</CardTitle>
              <CardBody
                dangerouslySetInnerHTML={{
                  __html: selectedEvent.background || '',
                }}
              />
            </NarrativeCard>
            <NarrativeCard>
              <CardTitle>여파 (Event.aftermath)</CardTitle>
              <CardBody
                dangerouslySetInnerHTML={{
                  __html: selectedEvent.aftermath || '',
                }}
              />
            </NarrativeCard>
          </NarrativeGrid>

          <Panel id="timeline">
            <PanelHeader>
              <div>
                <span>핵심 타임라인 (EventTimeline)</span>
                <strong>시간 축으로 본 흐름</strong>
              </div>
            </PanelHeader>
            <TimelineList>
              {selectedEvent.timeline.map((point) => (
                <TimelineRow key={point.id}>
                  <TimelineMarker />
                  <TimelineContent>
                    <small>{formatDateRange(point.occurredAt)}</small>
                    <h4>{point.title}</h4>
                    <p>{point.description}</p>
                    <TimelineMeta>
                      {point.locationName && (
                        <MetaChip>
                          <FiMapPin />
                          {point.locationName}
                        </MetaChip>
                      )}
                      {point.involvedPersons?.map((person) => (
                        <MetaChip key={person.id}>
                          <FiUsers />
                          {person.name} ({person.role})
                        </MetaChip>
                      ))}
                    </TimelineMeta>
                  </TimelineContent>
                </TimelineRow>
              ))}
            </TimelineList>
          </Panel>

          <Panel id="theaters">
            <PanelHeader>
              <div>
                <span>전구/작전 (EventTheater)</span>
                <strong>계층적 작전 뷰</strong>
              </div>
            </PanelHeader>
            <TheaterGrid>
              {selectedEvent.theaters.map((theater) => (
                <TheaterCard key={theater.id}>
                  <TheaterHeader>
                    <FiTarget />
                    <div>
                      <small>{theater.strategicFocus}</small>
                      <strong>{theater.name}</strong>
                    </div>
                  </TheaterHeader>
                  <p>{theater.description}</p>
                  <OperationList>
                    {theater.operations.map((operation) => (
                      <li key={operation.id}>
                        <FiNavigation />
                        <div>
                          <strong>{operation.name}</strong>
                          <span>{operation.summary}</span>
                          <small>{operation.outcome}</small>
                        </div>
                      </li>
                    ))}
                  </OperationList>
                </TheaterCard>
              ))}
            </TheaterGrid>
          </Panel>

          <Panel id="figures">
            <PanelHeader>
              <div>
                <span>핵심 인물 (PersonEvent)</span>
                <strong>의사결정 네트워크</strong>
              </div>
            </PanelHeader>
            <KeyFigureGrid>
              {selectedEvent.keyFigures.map((figure) => (
                <KeyFigureCard key={figure.id}>
                  <AvatarCircle>
                    {figure.name
                      .split(' ')
                      .map((token) => token[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarCircle>
                  <div>
                    <strong>{figure.name}</strong>
                    <span>{figure.role}</span>
                    <small>{figure.nation}</small>
                  </div>
                  <p>{figure.contribution}</p>
                </KeyFigureCard>
              ))}
            </KeyFigureGrid>
          </Panel>

          <Panel id="countries">
            <PanelHeader>
              <div>
                <span>참전 국가 (EventCountryRelation)</span>
                <strong>역할 분류</strong>
              </div>
            </PanelHeader>
            <CountryGrid>
              {selectedEvent.countries.map((country) => (
                <CountryCard key={country.id}>
                  <h5>{country.name}</h5>
                  <CountryMeta>
                    <FiLayers />
                    <span>{country.classification}</span>
                  </CountryMeta>
                  <CountryMeta>
                    <FiTarget />
                    <span>{country.role}</span>
                  </CountryMeta>
                  {country.note && <small>{country.note}</small>}
                </CountryCard>
              ))}
            </CountryGrid>
          </Panel>

          {selectedEvent.sources && selectedEvent.sources.length > 0 && (
            <SourcesSection>
              <CardTitle>참고 자료</CardTitle>
              <SourcesList>
                {selectedEvent.sources.map((source) => (
                  <SourceLink
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.label}
                  </SourceLink>
                ))}
              </SourcesList>
            </SourcesSection>
          )}
        </MainContent>

        {/* 우측: 빠른 정보 및 네비게이션 */}
        <RightSidebar>
          <SidebarPanel>
            <SidebarBadge>
              {selectedEvent.category === 'military'
                ? '군사'
                : selectedEvent.category === 'economic'
                  ? '경제'
                  : selectedEvent.category === 'political'
                    ? '정치'
                    : selectedEvent.category === 'social'
                      ? '사회'
                      : '기술'}
            </SidebarBadge>
            <SidebarTitle>{selectedEvent.title}</SidebarTitle>
            <SidebarTagRow>
              {selectedEvent.tags.slice(0, 4).map((tag) => (
                <SidebarTag key={tag}>{tag}</SidebarTag>
              ))}
            </SidebarTagRow>
          </SidebarPanel>

          <SidebarPanel>
            <SidebarSectionTitle>주요 정보</SidebarSectionTitle>
            <SidebarInfoItem>
              <span>지휘 체계</span>
              <strong>{selectedEvent.quickFacts.commandStructure}</strong>
            </SidebarInfoItem>
            <SidebarInfoItem>
              <span>결정적 기술</span>
              <strong>{selectedEvent.quickFacts.decisiveTechnology}</strong>
            </SidebarInfoItem>
            <SidebarInfoItem>
              <span>정보전</span>
              <strong>{selectedEvent.quickFacts.intelligenceNotes}</strong>
            </SidebarInfoItem>
            <SidebarInfoItem>
              <span>병참 규모</span>
              <strong>{selectedEvent.quickFacts.logisticalScale}</strong>
            </SidebarInfoItem>
          </SidebarPanel>

          <SidebarPanel>
            <SidebarSectionTitle>계층 구조</SidebarSectionTitle>
            <HierarchyDepthBadge>
              깊이 {hierarchyDepth(selectedEvent.hierarchy)}
            </HierarchyDepthBadge>
            <CompactHierarchyTree>
              {renderHierarchyNode(selectedEvent.hierarchy)}
            </CompactHierarchyTree>
          </SidebarPanel>

          <SidebarPanel>
            <SidebarSectionTitle>영향 지표</SidebarSectionTitle>
            <InfluenceList>
              {selectedEvent.influence.map((metric) => (
                <CompactInfluenceRow key={metric.label}>
                  <div>
                    <strong>{metric.label}</strong>
                    <small>{metric.description}</small>
                  </div>
                  <InfluenceBar>
                    <InfluenceFill style={{ width: `${metric.value}%` }} />
                  </InfluenceBar>
                  <span>{metric.value}</span>
                </CompactInfluenceRow>
              ))}
            </InfluenceList>
          </SidebarPanel>

          <SectionNav>
            <NavTitle>섹션 바로가기</NavTitle>
            {SECTION_LINKS.map((link) => (
              <SectionNavButton
                key={link.id}
                $active={activeSection === link.id}
                onClick={() => scrollToSection(link.id)}
              >
                {link.label}
              </SectionNavButton>
            ))}
          </SectionNav>
        </RightSidebar>
      </DetailContentWrapper>
    </PageWrapper>
  )
}

const renderHierarchyNode = (
  node: EventHierarchyNode,
  depth = 0,
): React.ReactNode => (
  <Fragment key={node.id}>
    <HierarchyNode $depth={depth} $importance={node.importance}>
      <HierarchyBullet $importance={node.importance} />
      <div>
        <small>{formatDateRange(node.period.start, node.period.end)}</small>
        <strong>{node.title}</strong>
        <p>{node.summary}</p>
      </div>
    </HierarchyNode>
    {node.children?.map((child) => renderHierarchyNode(child, depth + 1))}
  </Fragment>
)

const PageWrapper = styled.div`
  position: fixed;
  top: var(--header-height);
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: calc(100vh - var(--header-height));
  padding: 20px;
  padding-bottom: 20px;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  background: #f6f7fb;
  background-image: none;

  @media (max-width: 1024px) {
    padding: 16px;
    padding-bottom: 16px;
  }
`

const DetailContentWrapper = styled.div`
  display: grid;
  grid-template-columns: 280px minmax(600px, 1fr) 320px;
  gap: 20px;
  max-width: 2400px;
  margin: 0 auto;
  width: 100%;

  @media (max-width: 1600px) {
    grid-template-columns: 260px minmax(500px, 1fr) 300px;
    gap: 18px;
  }

  @media (max-width: 1200px) {
    grid-template-columns: 240px 1fr;
    gap: 20px;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 24px;
  }
`

const LeftSidebar = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: sticky;
  top: calc(var(--header-height) + 20px);
  align-self: flex-start;
  max-height: calc(100vh - var(--header-height) - 40px);
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;

  /* 스크롤바 스타일링 */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.2);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(99, 102, 241, 0.3);
  }

  @media (max-width: 1024px) {
    position: static;
    max-height: none;
    overflow-y: visible;
  }
`

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0; /* 그리드 오버플로우 방지 */
`

const SidebarPanel = styled.div`
  border: 1px solid rgba(20, 19, 34, 0.08);
  border-radius: 16px;
  padding: 18px;
  background: #fff;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
`

const SidebarBadge = styled.span`
  display: inline-flex;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(74, 58, 255, 0.1);
  color: #4a3aff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 12px;
`

const SidebarTitle = styled.h2`
  margin: 0 0 12px;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  color: #0f172a;
`

const SidebarTagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const SidebarTag = styled.span`
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.08);
  color: #4f46e5;
  font-size: 11px;
  font-weight: 600;
`

const SidebarSectionTitle = styled.h4`
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const SidebarStat = styled.div`
  display: flex;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(20, 19, 34, 0.06);

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }

  svg {
    color: #6366f1;
    flex-shrink: 0;
    margin-top: 2px;
  }

  span {
    font-size: 11px;
    color: #8a8f9d;
    display: block;
  }

  strong {
    font-size: 13px;
    display: block;
    margin-top: 2px;
    color: #0f172a;
  }

  small {
    font-size: 11px;
    color: #8a8f9d;
    display: block;
    margin-top: 2px;
  }
`

const SidebarInfoItem = styled.div`
  padding: 10px 0;
  border-bottom: 1px solid rgba(20, 19, 34, 0.06);

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }

  span {
    font-size: 11px;
    color: #8a8f9d;
    display: block;
  }

  strong {
    font-size: 12px;
    display: block;
    margin-top: 4px;
    color: #0f172a;
    line-height: 1.4;
  }
`

const CompactHierarchyTree = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
`

const CompactInfluenceRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(20, 19, 34, 0.06);

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }

  strong {
    font-size: 12px;
    display: block;
  }

  small {
    color: #8a8f9d;
    font-size: 11px;
  }

  span {
    font-size: 12px;
    font-weight: 600;
    color: #4a3aff;
  }
`

const RightSidebar = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: sticky;
  top: calc(var(--header-height) + 20px);
  align-self: flex-start;
  max-height: calc(100vh - var(--header-height) - 40px);
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;

  /* 스크롤바 스타일링 */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.2);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(99, 102, 241, 0.3);
  }

  @media (max-width: 1200px) {
    display: none;
  }
`

const SectionNav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  border: 1px solid rgba(20, 19, 34, 0.08);
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
`

const NavTitle = styled.h4`
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const RelatedEventsPanel = styled.div`
  border: 1px solid rgba(20, 19, 34, 0.08);
  border-radius: 20px;
  padding: 20px;
  background: #fff;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
`

const RelatedEventsHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1.5px solid rgba(99, 102, 241, 0.1);

  span {
    font-size: 11px;
    color: #8a8f9d;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  strong {
    font-size: 16px;
    color: #0f172a;
  }
`

const RelatedEventsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.2);
    border-radius: 2px;
  }
`

const RelatedEventItem = styled.button<{ $active: boolean }>`
  border: 1px solid
    ${({ $active }) =>
      $active ? 'rgba(99, 102, 241, 0.3)' : 'rgba(20, 19, 34, 0.08)'};
  border-radius: 12px;
  padding: 12px;
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.05))'
      : '#fff'};
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  gap: 10px;
  align-items: flex-start;

  &:hover {
    border-color: rgba(99, 102, 241, 0.25);
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.08))'
        : '#f8fafc'};
    transform: translateX(2px);
  }
`

const RelatedEventDot = styled.span<{
  $category: 'military' | 'economic' | 'political' | 'social' | 'technological'
}>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
  background: ${({ $category }) => {
    switch ($category) {
      case 'military':
        return '#db2777'
      case 'economic':
        return '#0ea5e9'
      case 'political':
        return '#a855f7'
      case 'social':
        return '#22c55e'
      case 'technological':
        return '#f97316'
      default:
        return '#4b5563'
    }
  }};
`

const RelatedEventContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const RelatedEventTitle = styled.h5`
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.3;
`

const RelatedEventMeta = styled.span`
  font-size: 11px;
  color: #64748b;
`

const SectionNavButton = styled.button<{ $active?: boolean }>`
  border: none;
  border-radius: 10px;
  padding: 8px 12px;
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.1))'
      : 'transparent'};
  color: ${({ $active }) => ($active ? '#4f46e5' : '#64748b')};
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? '700' : '600')};
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1.5px solid
    ${({ $active }) => ($active ? 'rgba(99, 102, 241, 0.3)' : 'transparent')};
  text-align: left;
  position: relative;
  white-space: nowrap;

  &:hover {
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.15))'
        : 'rgba(99, 102, 241, 0.08)'};
    color: ${({ $active }) => ($active ? '#4f46e5' : '#475569')};
    transform: translateX(2px);
  }

  ${({ $active }) =>
    $active &&
    `
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: linear-gradient(180deg, #6366f1, #a855f7);
      border-radius: 0 2px 2px 0;
    }
  `}

  @media (max-width: 1024px) {
    flex: 1 0 45%;
    text-align: center;
  }
`

const SectionBlock = styled.section`
  scroll-margin-top: calc(var(--header-height) + 32px);
  scroll-padding-top: calc(var(--header-height) + 32px);
`

const SidebarActions = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`

const BackLink = styled.button`
  flex: 1;
  border: 1px solid rgba(99, 102, 241, 0.2);
  background: #fff;
  color: #6366f1;
  font-weight: 600;
  padding: 10px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

  &:hover {
    border-color: rgba(99, 102, 241, 0.4);
    background: rgba(99, 102, 241, 0.05);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.12);
    transform: translateY(-1px);
  }
`

const EditButton = styled.button`
  border: 1.5px solid rgba(99, 102, 241, 0.3);
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.12),
    rgba(168, 85, 247, 0.08)
  );
  color: #4f46e5;
  font-weight: 600;
  padding: 10px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.1);

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    border-color: rgba(99, 102, 241, 0.5);
    background: linear-gradient(
      135deg,
      rgba(99, 102, 241, 0.18),
      rgba(168, 85, 247, 0.12)
    );
    box-shadow: 0 4px 10px rgba(99, 102, 241, 0.2);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`

const HeroSection = styled.div<{ $heroImage: string }>`
  background:
    linear-gradient(120deg, rgba(10, 12, 28, 0.6), rgba(33, 18, 66, 0.5)),
    url(${({ $heroImage }) => $heroImage}) center/cover no-repeat;
  border-radius: 24px;
  min-height: 350px;
  display: flex;
  align-items: flex-end;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(20, 19, 34, 0.08);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);

  @media (max-width: 1024px) {
    min-height: 280px;
  }
`

const HeroOverlay = styled.div`
  padding: 40px;
  color: #fff;
  width: 100%;
  background: linear-gradient(
    to top,
    rgba(10, 12, 28, 0.9) 0%,
    rgba(10, 12, 28, 0.4) 70%,
    transparent 100%
  );

  @media (max-width: 1024px) {
    padding: 32px 24px;
  }
`

const HeroTitle = styled.h1`
  margin: 0 0 12px;
  font-size: 42px;
  font-weight: 700;
  line-height: 1.2;

  @media (max-width: 1024px) {
    font-size: 32px;
  }
`

const HeroDescription = styled.p`
  margin: 0;
  font-size: 16px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.95);
  max-width: 100%;

  @media (max-width: 1024px) {
    font-size: 15px;
  }
`

const GallerySection = styled(SectionBlock)`
  border: 1px solid rgba(20, 19, 34, 0.08);
  border-radius: 24px;
  padding: 24px;
  background: #fff;
`

const GalleryHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;

  span {
    font-size: 13px;
    color: #8a8f9d;
  }
`

const GalleryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
`

const GalleryItem = styled.div`
  border: 1px solid rgba(20, 19, 34, 0.08);
  border-radius: 18px;
  overflow: hidden;
  background: #fff;
  display: flex;
  flex-direction: column;
`

const GalleryImage = styled.div`
  width: 100%;
  padding-top: 62%;
  background-size: cover;
  background-position: center;
`

const GalleryMeta = styled.div`
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  strong {
    font-size: 15px;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: #4a4f5f;
  }

  small {
    font-size: 12px;
    color: #8a8f9d;
  }
`

const NarrativeGrid = styled(SectionBlock)`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const NarrativeCard = styled.article`
  border: 1px solid rgba(20, 19, 34, 0.08);
  border-radius: 20px;
  padding: 20px;
  background: #fff;
`

const CardTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 16px;
`

const CardBody = styled.div`
  margin: 0;
  line-height: 1.6;
  color: #4a4f5f;

  /* Quill 에디터 스타일 */
  img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 12px 0;
  }

  p {
    margin: 0 0 12px 0;
  }

  h1,
  h2,
  h3 {
    margin: 16px 0 8px 0;
    font-weight: 600;
  }

  ul,
  ol {
    margin: 8px 0;
    padding-left: 24px;
  }

  a {
    color: #6366f1;
    text-decoration: underline;
  }

  blockquote {
    border-left: 4px solid #6366f1;
    padding-left: 16px;
    margin: 12px 0;
    color: #64748b;
    font-style: italic;
  }
`

const Panel = styled.section`
  border: 1px solid rgba(20, 19, 34, 0.06);
  border-radius: 20px;
  padding: 22px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
  scroll-margin-top: calc(var(--header-height) + 20px);
  scroll-padding-top: calc(var(--header-height) + 20px);
`

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  span {
    font-size: 12px;
    color: #8a8f9d;
  }

  strong {
    display: block;
    font-size: 18px;
    margin-top: 4px;
  }
`

const HierarchyTree = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const HierarchyNode = styled.div<{ $depth: number; $importance: string }>`
  padding: 8px;
  border-radius: 12px;
  background: ${({ $depth }) =>
    $depth === 0 ? 'rgba(74, 58, 255, 0.08)' : '#fafafa'};
  margin-left: ${({ $depth }) => $depth * 12}px;
  border-left: 2px solid rgba(74, 58, 255, 0.2);
  display: flex;
  gap: 8px;

  small {
    color: #8a8f9d;
    font-size: 10px;
  }

  strong {
    display: block;
    font-size: 12px;
    line-height: 1.3;
  }

  p {
    margin: 2px 0 0;
    color: #5c6173;
    font-size: 11px;
    line-height: 1.4;
  }
`

const HierarchyBullet = styled.span<{ $importance: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
  background: ${({ $importance }) => {
    switch ($importance) {
      case 'critical':
        return '#ed5f5f'
      case 'major':
        return '#f4b400'
      default:
        return '#a0a4b8'
    }
  }};
`

const HierarchyDepthBadge = styled.span`
  font-size: 11px;
  color: #4a3aff;
  background: rgba(74, 58, 255, 0.1);
  border-radius: 999px;
  padding: 4px 10px;
  display: inline-block;
  margin-bottom: 8px;
  font-weight: 600;
`

const InfluenceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const InfluenceRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 12px;
  align-items: center;

  strong {
    display: block;
  }

  small {
    color: #8a8f9d;
  }
`

const InfluenceBar = styled.div`
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: rgba(74, 58, 255, 0.1);
  overflow: hidden;
`

const InfluenceFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #4a3aff, #8a7dff);
`

const MapBoard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const MapSurface = styled.div`
  position: relative;
  height: 200px;
  border-radius: 16px;
  background: radial-gradient(circle, #e0f2ff, #c3d7ff);
  overflow: hidden;
`

const MapMarker = styled.div<{ $category: EventMapMarker['category'] }>`
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;

  span {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid #fff;
    background: ${({ $category }) => {
      switch ($category) {
        case 'battle':
          return '#ed5f5f'
        case 'turning-point':
          return '#f4b400'
        case 'occupation':
          return '#4a3aff'
        default:
          return '#4a3aff'
      }
    }};
  }

  label {
    background: rgba(0, 0, 0, 0.65);
    color: #fff;
    padding: 3px 6px;
    border-radius: 4px;
    font-size: 9px;
    white-space: nowrap;
  }
`

const MapSummary = styled.p`
  margin: 0;
  font-size: 12px;
  color: #4a4f5f;
  line-height: 1.5;
`

const MapLegend = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  gap: 12px;
  align-items: center;
  color: #4a4f5f;
  font-size: 11px;
  flex-wrap: wrap;
`

const MarkerLegendDot = styled.span<{ $category: EventMapMarker['category'] }>`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 4px;
  background: ${({ $category }) => {
    switch ($category) {
      case 'battle':
        return '#ed5f5f'
      case 'turning-point':
        return '#f4b400'
      case 'occupation':
        return '#4a3aff'
      default:
        return '#4a3aff'
    }
  }};
`

const TimelineList = styled.div`
  position: relative;
  padding-left: 24px;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 8px;
    width: 2px;
    background: rgba(74, 58, 255, 0.2);
  }
`

const TimelineRow = styled.div`
  position: relative;
  padding: 16px 0 16px 32px;
`

const TimelineMarker = styled.span`
  position: absolute;
  left: -2px;
  top: 24px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #4a3aff;
  border: 3px solid #fff;
  box-shadow: 0 0 0 4px rgba(74, 58, 255, 0.15);
`

const TimelineContent = styled.div`
  background: #f8f9ff;
  border-radius: 18px;
  padding: 16px;
  small {
    font-size: 12px;
    color: #8a8f9d;
  }
  h4 {
    margin: 6px 0;
  }
  p {
    margin: 0;
    color: #4a4f5f;
  }
`

const TimelineMeta = styled.div`
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const MetaChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(74, 58, 255, 0.1);
  color: #4a3aff;
`

const TheaterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
`

const TheaterCard = styled.div`
  border: 1px solid rgba(20, 19, 34, 0.1);
  border-radius: 20px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #fff;
`

const TheaterHeader = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  small {
    color: #8a8f9d;
  }
  strong {
    display: block;
    font-size: 16px;
  }
`

const OperationList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;

  li {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    font-size: 13px;
  }

  strong {
    display: block;
  }

  span {
    color: #4a4f5f;
  }

  small {
    font-size: 12px;
    color: #8a8f9d;
  }
`

const KeyFigureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
`

const KeyFigureCard = styled.div`
  border: 1px solid rgba(20, 19, 34, 0.1);
  border-radius: 20px;
  padding: 16px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 8px;

  div {
    display: flex;
    flex-direction: column;
  }

  span {
    color: #4a4f5f;
    font-size: 13px;
  }

  small {
    color: #8a8f9d;
    font-size: 12px;
  }

  p {
    margin: 0;
    color: #4a4f5f;
    font-size: 13px;
  }
`

const AvatarCircle = styled.span`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(74, 58, 255, 0.15);
  color: #4a3aff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
`

const CountryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
`

const CountryCard = styled.div`
  border: 1px solid rgba(20, 19, 34, 0.08);
  border-radius: 18px;
  padding: 16px;
  background: #fafbff;
  h5 {
    margin: 0 0 8px;
  }
  small {
    color: #4a4f5f;
  }
`

const CountryMeta = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #4a4f5f;
  margin-right: 8px;
`

const EmptyStateWrapper = styled.div`
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 40px;
`

const EmptyState = styled.div`
  border: 1px dashed rgba(20, 19, 34, 0.2);
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  color: #4a4f5f;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const SourcesSection = styled.section`
  border: 1px solid rgba(20, 19, 34, 0.08);
  border-radius: 20px;
  padding: 20px;
  background: #fff;
`

const SourcesList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
`

const SourceLink = styled.a`
  font-size: 13px;
  color: var(--color-primary);
  font-weight: 600;
  border: 1px solid rgba(74, 58, 255, 0.2);
  border-radius: 999px;
  padding: 6px 14px;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--color-primary);
    background: rgba(74, 58, 255, 0.08);
  }
`

export default EventDetailPage
