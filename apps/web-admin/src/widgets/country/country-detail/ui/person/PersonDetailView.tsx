import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styled from 'styled-components'
import { FiEdit2, FiPlus } from 'react-icons/fi'

import { TenureRegisterPanel } from '@/shared/ui/tenure-register-panel'

interface PersonDetailViewProps {
  person: any
  /** 수반 등록 후 상세 다시 불러올 때 호출 (예: 부모에서 setPersonDetail) */
  onTenureAdded?: () => void
}

type TabType = 'overview' | 'genealogy' | 'activities' | 'works'

// Error styled components (선언을 먼저)
const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 40px;
  text-align: center;
  background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
  border-radius: 20px;
  border: 2px dashed #e5e7eb;
  min-height: 400px;
`

const ErrorIcon = styled.div`
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.6;
`

const ErrorTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: #374151;
  margin: 0 0 12px 0;
`

const ErrorDesc = styled.p`
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
  margin: 0;
`

export function PersonDetailView({ person, onTenureAdded }: PersonDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [tenureModalOpen, setTenureModalOpen] = useState(false)
  const [editingTenureId, setEditingTenureId] = useState<string | null>(null)

  // 데이터 검증
  if (!person) {
    return (
      <ErrorContainer>
        <ErrorIcon>⚠️</ErrorIcon>
        <ErrorTitle>인물을 찾을 수 없습니다</ErrorTitle>
        <ErrorDesc>
          요청하신 인물 정보를 불러올 수 없습니다.
          <br />
          목록에서 다시 선택해주세요.
        </ErrorDesc>
      </ErrorContainer>
    )
  }

  const fullName = person.surname
    ? `${person.surname} ${person.name}`
    : person.name

  const birthYearText = person.birthYear
    ? `${person.birthYear}${person.birthEra === 'BC' ? ' BC' : ''}`
    : '?'
  const deathYearText = person.deathYear
    ? `${person.deathYear}${person.deathEra === 'BC' ? ' BC' : ''}`
    : '?'
  const lifespanText = `${birthYearText} ~ ${deathYearText}`

  return (
    <Container>
      {/* 인물 상세 헤더 (통계·리스트 헤더와 동일 구조) */}
      <DetailPageHeader>
        <div>
          <DetailPageTitle>인물 상세</DetailPageTitle>
          <DetailPageDesc>
            기본 정보, 가계도, 활동, 저작을 확인할 수 있습니다.
          </DetailPageDesc>
        </div>
      </DetailPageHeader>

      {/* 히어로 이미지 */}
      <Hero>
        {person.profileImageUrl ? (
          <HeroImage src={person.profileImageUrl} alt={fullName} />
        ) : (
          <HeroPlaceholder>
            <svg
              width="120"
              height="120"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </HeroPlaceholder>
        )}
        <HeroOverlay>
          <HeroTitle>{fullName}</HeroTitle>
          {person.job && <HeroSubtitle>{person.job.title}</HeroSubtitle>}
        </HeroOverlay>
      </Hero>

      {/* 탭 메뉴 */}
      <TabMenu>
        <TabButton
          $active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
        >
          개요
        </TabButton>
        <TabButton
          $active={activeTab === 'genealogy'}
          onClick={() => setActiveTab('genealogy')}
        >
          가계도
        </TabButton>
        <TabButton
          $active={activeTab === 'activities'}
          onClick={() => setActiveTab('activities')}
        >
          활동
        </TabButton>
        <TabButton
          $active={activeTab === 'works'}
          onClick={() => setActiveTab('works')}
        >
          저작
        </TabButton>
      </TabMenu>

      {/* 탭 컨텐츠 */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <TabContent
            key="overview"
            as={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* 통계 카드 */}
            <StatsGrid>
              <StatCard>
                <StatLabel>생애 기간</StatLabel>
                <StatValue>
                  {person.birthYear && person.deathYear
                    ? `${person.deathYear - person.birthYear}년`
                    : '?'}
                </StatValue>
                <StatSubtext>{lifespanText}</StatSubtext>
              </StatCard>
              <StatCard>
                <StatLabel>저작 활동</StatLabel>
                <StatValue>{person.books?.length || 0}건</StatValue>
                <StatSubtext>출간 저서</StatSubtext>
              </StatCard>
              <StatCard>
                <StatLabel>정부 직위</StatLabel>
                <StatValue>
                  {(person.governmentPositions ?? person.governmentTenures ?? []).length}건
                </StatValue>
                <StatSubtext>역임 직위</StatSubtext>
              </StatCard>
              <StatCard>
                <StatLabel>주요 사건</StatLabel>
                <StatValue>{person.events?.length || 0}건</StatValue>
                <StatSubtext>참여 사건</StatSubtext>
              </StatCard>
              <StatCard>
                <StatLabel>조직 활동</StatLabel>
                <StatValue>{person.organizationRoles?.length || 0}건</StatValue>
                <StatSubtext>소속 조직</StatSubtext>
              </StatCard>
            </StatsGrid>

            {/* 기본 정보 */}
            <InfoGrid>
              {person.birthYear && (
                <InfoCard>
                  <InfoCardLabel>생애</InfoCardLabel>
                  <InfoCardValue>{lifespanText}</InfoCardValue>
                </InfoCard>
              )}
              {person.country && (
                <InfoCard>
                  <InfoCardLabel>국가</InfoCardLabel>
                  <InfoCardValue>
                    {person.country.flagEmoji || '🏳️'} {person.country.name}
                  </InfoCardValue>
                </InfoCard>
              )}
              {person.gender && (
                <InfoCard>
                  <InfoCardLabel>성별</InfoCardLabel>
                  <InfoCardValue>{person.gender}</InfoCardValue>
                </InfoCard>
              )}
              {person.dynasty && (
                <InfoCard>
                  <InfoCardLabel>가문</InfoCardLabel>
                  <InfoCardValue>{person.dynasty.name}</InfoCardValue>
                </InfoCard>
              )}
            </InfoGrid>

            {/* 전기 */}
            {person.biography && (
              <BiographyCard>
                <BiographyTitle>전기</BiographyTitle>
                <BiographyText>{person.biography}</BiographyText>
              </BiographyCard>
            )}
          </TabContent>
        )}

        {activeTab === 'genealogy' && (
          <TabContent
            key="genealogy"
            as={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {!person.father &&
            !person.mother &&
            (!person.children || person.children.length === 0) ? (
              <EmptyState>가족 정보가 없습니다</EmptyState>
            ) : (
              <GenealogySection>
                <SectionTitle>가족 관계</SectionTitle>
                {(person.father || person.mother) && (
                  <FamilyGroup>
                    <FamilyGroupTitle>부모</FamilyGroupTitle>
                    <FamilyGrid>
                      {person.father && (
                        <FamilyCard>
                          <FamilyName>
                            {person.father.surname} {person.father.name}
                          </FamilyName>
                          <FamilyMeta>아버지</FamilyMeta>
                        </FamilyCard>
                      )}
                      {person.mother && (
                        <FamilyCard>
                          <FamilyName>
                            {person.mother.surname} {person.mother.name}
                          </FamilyName>
                          <FamilyMeta>어머니</FamilyMeta>
                        </FamilyCard>
                      )}
                    </FamilyGrid>
                  </FamilyGroup>
                )}
                {person.children && person.children.length > 0 && (
                  <FamilyGroup>
                    <FamilyGroupTitle>
                      자녀 ({person.children.length}명)
                    </FamilyGroupTitle>
                    <FamilyGrid>
                      {person.children.map((child: any) => (
                        <FamilyCard key={child.id}>
                          <FamilyName>
                            {child.surname} {child.name}
                          </FamilyName>
                          <FamilyMeta>자녀</FamilyMeta>
                        </FamilyCard>
                      ))}
                    </FamilyGrid>
                  </FamilyGroup>
                )}
              </GenealogySection>
            )}
          </TabContent>
        )}

        {activeTab === 'activities' && (
          <TabContent
            key="activities"
            as={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ActivitiesGrid>
                {person.militaryCommands &&
                  person.militaryCommands.length > 0 && (
                    <ActivityCard>
                      <ActivityCardTitle>군 경력</ActivityCardTitle>
                      <ActivityList>
                        {person.militaryCommands.map((cmd: any) => (
                          <ActivityItem key={cmd.id}>
                            <ActivityName>{cmd.unit.name}</ActivityName>
                            <ActivityMeta>
                              {cmd.rank} · {cmd.role}
                            </ActivityMeta>
                          </ActivityItem>
                        ))}
                      </ActivityList>
                    </ActivityCard>
                  )}
                {person.organizationRoles &&
                  person.organizationRoles.length > 0 && (
                    <ActivityCard>
                      <ActivityCardTitle>조직 활동</ActivityCardTitle>
                      <ActivityList>
                        {person.organizationRoles.map((role: any) => (
                          <ActivityItem key={role.id}>
                            <ActivityName>
                              {role.organization.name}
                            </ActivityName>
                            <ActivityMeta>{role.roleTitle}</ActivityMeta>
                          </ActivityItem>
                        ))}
                      </ActivityList>
                    </ActivityCard>
                  )}
                <ActivityCard>
                  <ActivityCardTitleRow>
                    <ActivityCardTitle>
                      정부 직위 ({(person.governmentPositions ?? person.governmentTenures ?? []).length}건)
                    </ActivityCardTitle>
                    <TenureAddBtn
                      type="button"
                      onClick={() => {
                        setEditingTenureId(null)
                        setTenureModalOpen(true)
                      }}
                    >
                      <FiPlus size={14} />
                      수반 등록
                    </TenureAddBtn>
                  </ActivityCardTitleRow>
                  {(person.governmentPositions ?? person.governmentTenures ?? []).length > 0 ? (
                    <ActivityList>
                      {(person.governmentPositions ?? person.governmentTenures ?? []).map((tenure: any) => (
                          <EventItem key={tenure.id}>
                            <EventHeader>
                              <EventName>
                                {tenure.positionDefinition?.title ??
                                  tenure.position?.title ??
                                  tenure.title ??
                                  '직책'}
                              </EventName>
                              {tenure.startDate && (
                                <EventDate>
                                  {new Date(
                                    tenure.startDate,
                                  ).toLocaleDateString('ko-KR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  })}
                                  {tenure.endDate &&
                                    ` ~ ${new Date(tenure.endDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}`}
                                </EventDate>
                              )}
                            </EventHeader>
                            {(tenure.country ?? tenure.position?.country) && (
                              <EventDescription>
                                🏛️ {(tenure.country ?? tenure.position?.country)?.name}
                                {(tenure.position?.rank != null) &&
                                  ` • 서열 ${tenure.position.rank}`}
                              </EventDescription>
                            )}
                            {(tenure.historicalCountry ?? tenure.position?.historicalCountry) && (
                              <EventDescription>
                                🏛️ {(tenure.historicalCountry ?? tenure.position?.historicalCountry)?.name}
                                {(tenure.position?.rank != null) &&
                                  ` • 서열 ${tenure.position.rank}`}
                              </EventDescription>
                            )}
                            {tenure.notes && (
                              <EventNote>
                                <EventNoteLabel>참고:</EventNoteLabel>
                                {tenure.notes}
                              </EventNote>
                            )}
                            <TenureRowEditBtn
                              type="button"
                              onClick={() => {
                                setEditingTenureId(tenure.id)
                                setTenureModalOpen(true)
                              }}
                            >
                              <FiEdit2 size={12} />
                              수정
                            </TenureRowEditBtn>
                          </EventItem>
                        ))}
                    </ActivityList>
                  ) : (
                    <TenureEmptyText>
                      등록된 재임 기록이 없습니다. <strong>수반 등록</strong>으로 추가하세요.
                    </TenureEmptyText>
                  )}
                </ActivityCard>
                <TenureRegisterPanel
                  personId={person.id}
                  open={tenureModalOpen}
                  onClose={() => {
                    setTenureModalOpen(false)
                    setEditingTenureId(null)
                  }}
                  onSuccess={() => {
                    setTenureModalOpen(false)
                    setEditingTenureId(null)
                    onTenureAdded?.()
                  }}
                  tenureId={editingTenureId ?? undefined}
                />
                {person.events && person.events.length > 0 ? (
                  <ActivityCard>
                    <ActivityCardTitle>
                      주요 사건 ({person.events.length}건)
                    </ActivityCardTitle>
                    <ActivityList>
                      {person.events.map((evt: any) => (
                        <EventItem key={evt.id}>
                          <EventHeader>
                            <EventName>{evt.event.title}</EventName>
                            {evt.event.startDate && (
                              <EventDate>
                                {new Date(
                                  evt.event.startDate,
                                ).toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </EventDate>
                            )}
                          </EventHeader>
                          {evt.event.category && (
                            <EventDescription>
                              📂 카테고리:{' '}
                              {typeof evt.event.category === 'string'
                                ? evt.event.category
                                : evt.event.category.name}
                            </EventDescription>
                          )}
                          {evt.role && (
                            <EventRole>
                              <RoleBadge>{evt.role}</RoleBadge>
                            </EventRole>
                          )}
                          {evt.event.description && (
                            <EventDescription>
                              {evt.event.description}
                            </EventDescription>
                          )}
                          {evt.note && (
                            <EventNote>
                              <EventNoteLabel>참고사항:</EventNoteLabel>
                              {evt.note}
                            </EventNote>
                          )}
                          {evt.event.countryRelations &&
                            evt.event.countryRelations.length > 0 && (
                              <TimelineSection>
                                <TimelineTitle>관련 국가</TimelineTitle>
                                {evt.event.countryRelations.map((rel: any) => (
                                  <TimelineItem key={rel.id}>
                                    <TimelineLocation>
                                      {rel.country
                                        ? `🌐 ${rel.country.name}`
                                        : rel.historicalCountry
                                          ? `🏛️ ${rel.historicalCountry.name}`
                                          : '알 수 없음'}
                                    </TimelineLocation>
                                    <TimelineRole>
                                      <RoleBadge>{rel.role}</RoleBadge>
                                      {rel.roleDescription && (
                                        <TimelineDesc>
                                          {rel.roleDescription}
                                        </TimelineDesc>
                                      )}
                                    </TimelineRole>
                                    {rel.note && (
                                      <TimelineDesc>{rel.note}</TimelineDesc>
                                    )}
                                  </TimelineItem>
                                ))}
                              </TimelineSection>
                            )}
                        </EventItem>
                      ))}
                    </ActivityList>
                  </ActivityCard>
                ) : null}
              </ActivitiesGrid>
          </TabContent>
        )}

        {activeTab === 'works' && (
          <TabContent
            key="works"
            as={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {person.books && person.books.length > 0 ? (
              <WorksGrid>
                {person.books.map((book: any) => (
                  <WorkCard key={book.id}>
                    <WorkTitle>{book.title}</WorkTitle>
                    {book.publishedYear && (
                      <WorkYear>{book.publishedYear}년 출판</WorkYear>
                    )}
                  </WorkCard>
                ))}
              </WorksGrid>
            ) : (
              <EmptyState>저작물 정보가 없습니다</EmptyState>
            )}
          </TabContent>
        )}
      </AnimatePresence>
    </Container>
  )
}

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 0 4px;
`

const DetailPageHeader = styled.header`
  padding-bottom: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
`

const DetailPageTitle = styled.h2`
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.04em;
  line-height: 1.25;
`

const DetailPageDesc = styled.p`
  margin: 10px 0 0 0;
  font-size: 15px;
  color: #64748b;
  line-height: 1.55;
  max-width: 540px;
  font-weight: 500;
`

const Hero = styled.div`
  position: relative;
  width: 100%;
  height: 280px;
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
`

const HeroImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const HeroPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.25);
`

const HeroOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 32px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 100%);
`

const HeroTitle = styled.h1`
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
`

const HeroSubtitle = styled.p`
  margin: 6px 0 0 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
`

const TabMenu = styled.nav`
  display: flex;
  gap: 4px;
  padding: 6px;
  background: #f1f5f9;
  border-radius: 12px;
  width: fit-content;
`

const TabButton = styled.button<{ $active?: boolean }>`
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  background: ${({ $active }) => ($active ? '#fff' : 'transparent')};
  color: ${({ $active }) => ($active ? '#0f172a' : '#64748b')};
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  cursor: pointer;
  box-shadow: ${({ $active }) => ($active ? '0 1px 3px rgba(0,0,0,0.06)' : 'none')};
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;

  &:hover {
    color: #0f172a;
    background: ${({ $active }) => ($active ? '#fff' : 'rgba(255,255,255,0.7)')};
  }
`

const TabContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 28px;
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 14px;
`

const StatCard = styled.div`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: border-color 0.2s, box-shadow 0.2s;
  &:hover {
    border-color: #e2e8f0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }
`

const StatLabel = styled.div`
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
  letter-spacing: 0.02em;
`

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
`

const StatSubtext = styled.div`
  font-size: 12px;
  color: #94a3b8;
`

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`

const InfoCard = styled.div`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
`

const InfoCardLabel = styled.div`
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
`

const InfoCardValue = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #111;
`

const BiographyCard = styled.div`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
`

const BiographyTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #111;
`

const BiographyText = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  color: #666;
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 40px;
  background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
  border-radius: 16px;
  border: 2px dashed #e5e7eb;

  &::before {
    content: '';
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: linear-gradient(135deg, #fff 0%, #fafafa 100%);
    border: 2px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    background-image: url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='M20 20l-3.5-3.5' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: center;
  }

  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
`

const GenealogySection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #111;
`

const FamilyGroup = styled.div`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
`

const FamilyGroupTitle = styled.h4`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
`

const FamilyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
`

const FamilyCard = styled.div`
  background: #f8fafc;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid #f1f5f9;
`

const FamilyName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #111;
  margin-bottom: 4px;
`

const FamilyMeta = styled.div`
  font-size: 12px;
  color: #999;
`

const ActivitiesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
`

const ActivityCard = styled.div`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 22px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
`

const ActivityCardTitle = styled.h4`
  margin: 0 0 16px 0;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
`

const ActivityCardTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  ${ActivityCardTitle} { margin: 0; }
`

const TenureAddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.06);
    color: #4f46e5;
  }
`

const TenureEmptyText = styled.p`
  margin: 0;
  font-size: 13px;
  color: #64748b;
  strong { color: #475569; font-weight: 600; }
`

const TenureRowEditBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  color: #6366f1;
  background: #fff;
  border: 1px solid #e0e7ff;
  border-radius: 6px;
  cursor: pointer;
  &:hover {
    background: #eef2ff;
    border-color: #c7d2fe;
  }
`

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const ActivityItem = styled.div`
  padding: 14px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #f1f5f9;
`

const ActivityName = styled.div`
  font-size: 14px;
  color: #334155;
  font-weight: 600;
  margin-bottom: 4px;
`

const ActivityMeta = styled.div`
  font-size: 12px;
  color: #64748b;
`

const WorksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
`

const WorkCard = styled.div`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
`

const WorkTitle = styled.h4`
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
`

const WorkYear = styled.div`
  font-size: 12px;
  color: #999;
`

const EventItem = styled.div`
  padding: 16px;
  background: linear-gradient(135deg, #fafafa 0%, #f8f9fa 100%);
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #ad46ff;
    box-shadow: 0 2px 8px rgba(173, 70, 255, 0.1);
    transform: translateY(-2px);
  }
`

const EventHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
`

const EventName = styled.div`
  font-size: 15px;
  color: #111;
  font-weight: 600;
  line-height: 1.4;
  flex: 1;
`

const EventDate = styled.div`
  font-size: 12px;
  color: #666;
  font-weight: 500;
  white-space: nowrap;
  background: #fff;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
`

const EventRole = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const RoleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background: linear-gradient(135deg, #ad46ff 0%, #9146ff 100%);
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  width: fit-content;
`

const EventRoleDesc = styled.div`
  font-size: 13px;
  color: #666;
  line-height: 1.5;
`

const EventDescription = styled.div`
  font-size: 13px;
  color: #555;
  line-height: 1.6;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
`

const EventNote = styled.div`
  font-size: 12px;
  color: #666;
  line-height: 1.5;
  padding: 10px 12px;
  background: #fff;
  border-left: 3px solid #ad46ff;
  border-radius: 6px;
`

const EventNoteLabel = styled.span`
  font-weight: 600;
  color: #ad46ff;
  margin-right: 6px;
`

const TimelineSection = styled.div`
  margin-top: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`

const TimelineTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #111;
  margin-bottom: 12px;
`

const TimelineItem = styled.div`
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`

const TimelineHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
`

const TimelineLocation = styled.div`
  font-size: 13px;
  color: #374151;
  font-weight: 600;
`

const TimelineDate = styled.div`
  font-size: 11px;
  color: #6b7280;
  white-space: nowrap;
`

const TimelineRole = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const TimelineDesc = styled.div`
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
`

const TimelinePersons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
`

const TimelinePerson = styled.div`
  font-size: 12px;
  color: #374151;
`
