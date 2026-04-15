import React, { useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { FiEdit2, FiPlus } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { TenureRegisterPanel } from '@/shared/ui/tenure-register-panel/tenure-register-panel'
import { PersonGenealogyInfographic } from '@/widgets/person/person-genealogy-infographic/person-genealogy-infographic'

interface PersonDetailViewProps {
  person: any
  /** 수반 등록 후 상세 다시 불러올 때 호출 (예: 부모에서 setPersonDetail) */
  onTenureAdded?: () => void
}

type TabType = 'overview' | 'genealogy' | 'activities' | 'works'

export function PersonDetailView({
  person,
  onTenureAdded,
}: PersonDetailViewProps) {
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

  const fullName = getPersonDisplayName(person)

  const birthYearText = person.birthYear
    ? `${person.birthYear}${person.birthEra === 'BC' ? ' BC' : ''}`
    : '?'
  const deathYearText = person.deathYear
    ? `${person.deathYear}${person.deathEra === 'BC' ? ' BC' : ''}`
    : '?'
  const lifespanText = `${birthYearText} ~ ${deathYearText}`

  return (
    <Container>
      {/* 히어로: 썸네일 + 이름 */}
      <Hero>
        {person.profileImageUrl ? (
          <HeroImage src={person.profileImageUrl} alt={fullName} />
        ) : (
          <HeroPlaceholder>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
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
                  {
                    (
                      person.governmentPositions ??
                      person.governmentTenures ??
                      []
                    ).length
                  }
                  건
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
              {person.father && (
                <InfoCard>
                  <InfoCardLabel>아버지</InfoCardLabel>
                  <InfoCardValue>
                    {getPersonDisplayName(person.father)}
                  </InfoCardValue>
                </InfoCard>
              )}
              {person.mother && (
                <InfoCard>
                  <InfoCardLabel>어머니</InfoCardLabel>
                  <InfoCardValue>
                    {getPersonDisplayName(person.mother)}
                  </InfoCardValue>
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
            !person.spouse &&
            (!person.children || person.children.length === 0) ? (
              <EmptyState>가족 정보가 없습니다</EmptyState>
            ) : (
              <PersonGenealogyInfographic
                ego={person}
                father={person.father}
                mother={person.mother}
                paternalGrandfather={person.father?.father}
                paternalGrandmother={person.father?.mother}
                maternalGrandfather={person.mother?.father}
                maternalGrandmother={person.mother?.mother}
                spouse={person.spouse}
                spouses={(person.spouseRelations ?? []).map((r: any) => r.spouse).filter(Boolean)}
                siblings={person.siblings}
                children={person.children}
              />
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
                          <ActivityName>{role.organization.name}</ActivityName>
                          <ActivityMeta>{role.roleTitle}</ActivityMeta>
                        </ActivityItem>
                      ))}
                    </ActivityList>
                  </ActivityCard>
                )}
              <ActivityCard>
                <ActivityCardTitleRow>
                  <ActivityCardTitle>
                    정부 직위 (
                    {
                      (
                        person.governmentPositions ??
                        person.governmentTenures ??
                        []
                      ).length
                    }
                    건)
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
                {(person.governmentPositions ?? person.governmentTenures ?? [])
                  .length > 0 ? (
                  <ActivityList>
                    {(
                      person.governmentPositions ??
                      person.governmentTenures ??
                      []
                    ).map((tenure: any) => (
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
                              {new Date(tenure.startDate).toLocaleDateString(
                                'ko-KR',
                                {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                },
                              )}
                              {tenure.endDate &&
                                ` ~ ${new Date(tenure.endDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}`}
                            </EventDate>
                          )}
                        </EventHeader>
                        {(tenure.country ?? tenure.position?.country) && (
                          <EventDescription>
                            🏛️{' '}
                            {(tenure.country ?? tenure.position?.country)?.name}
                            {tenure.position?.rank != null &&
                              ` • 서열 ${tenure.position.rank}`}
                          </EventDescription>
                        )}
                        {(tenure.historicalCountry ??
                          tenure.position?.historicalCountry) && (
                          <EventDescription>
                            🏛️{' '}
                            {
                              (
                                tenure.historicalCountry ??
                                tenure.position?.historicalCountry
                              )?.name
                            }
                            {tenure.position?.rank != null &&
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
                    등록된 재임 기록이 없습니다. <strong>수반 등록</strong>으로
                    추가하세요.
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
                              {new Date(evt.event.startDate).toLocaleDateString(
                                'ko-KR',
                                {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                },
                              )}
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

/* 인물 등록 모달 폼(PersonRegisterModal·PersonRegisterView·register-form-layout)과 동일한 디자인 토큰 */
const ACCENT = '#6366f1'
const ACCENT_HOVER = '#4f46e5'
const RADIUS_CARD = 12
const RADIUS_BTN = 8
const RADIUS_TAB = 14
const FORM_PADDING_X = 28
const FORM_PADDING_Y = 24

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const DetailPageHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`

const DetailPageTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: ${({ theme }) => theme.colors.text.primary};
`

const DetailPageDesc = styled.p`
  margin: 4px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Hero = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: ${FORM_PADDING_Y}px ${FORM_PADDING_X}px;
  border-radius: ${RADIUS_CARD}px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        `
      : css`
          background: #fff;
          border: 1px solid #e5e7eb;
          border-bottom-color: #f3f4f6;
        `}
`

const HeroImage = styled.img`
  width: 64px;
  height: 64px;
  border-radius: 10px;
  object-fit: cover;
  object-position: top center;
  flex-shrink: 0;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
`

const HeroPlaceholder = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f8fafc'};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const HeroOverlay = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const HeroTitle = styled.h1`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HeroSubtitle = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TabMenu = styled.nav`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  width: fit-content;
  border-radius: 20px;
  overflow-x: auto;
  &::-webkit-scrollbar {
    display: none;
  }

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.07);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        `
      : css`
          background: #f1f5f9;
          border: 1px solid transparent;
        `}
`

const TabButton = styled.button<{ $active?: boolean }>`
  flex: 0 0 auto;
  padding: 10px 18px;
  border: none;
  border-radius: ${RADIUS_TAB}px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.2s ease;

  ${({ $active, theme }) =>
    theme.mode === 'dark'
      ? css`
          background: ${$active ? 'rgba(99, 106, 242, 0.25)' : 'transparent'};
          color: ${$active ? '#ffffff' : theme.colors.text.secondary};
          font-weight: ${$active ? 600 : 500};
          box-shadow: ${$active
            ? '0 2px 8px rgba(99, 106, 242, 0.25)'
            : 'none'};
          &:hover {
            color: #ffffff;
            background: ${$active
              ? 'rgba(99, 106, 242, 0.3)'
              : 'rgba(255,255,255,0.07)'};
          }
        `
      : css`
          background: ${$active ? '#ffffff' : 'transparent'};
          color: ${$active ? ACCENT_HOVER : '#6b7280'};
          font-weight: ${$active ? 600 : 500};
          box-shadow: ${$active ? '0 2px 8px rgba(79, 70, 229, 0.12)' : 'none'};
          &:hover {
            color: ${$active ? ACCENT_HOVER : '#475569'};
            background: ${$active ? '#ffffff' : 'rgba(255,255,255,0.6)'};
          }
        `}

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
  }
`

const TabContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: ${FORM_PADDING_Y}px ${FORM_PADDING_X}px ${FORM_PADDING_X}px;
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 10px;
`

const StatCard = styled.div`
  border-radius: ${RADIUS_CARD}px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        `
      : css`
          background: #fff;
          border: 1px solid #e5e7eb;
        `}
`

const StatLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const StatValue = styled.div`
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: ${({ theme }) => theme.colors.text.primary};
`

const StatSubtext = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
`

const InfoCard = styled.div`
  border-radius: ${RADIUS_CARD}px;
  padding: 14px 18px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        `
      : css`
          background: #fff;
          border: 1px solid #e5e7eb;
        `}
`

const InfoCardLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const InfoCardValue = styled.div`
  font-size: 14px;
  font-weight: 500;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.primary};
`

const BiographyCard = styled.div`
  border-radius: ${RADIUS_CARD}px;
  padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        `
      : css`
          background: #fff;
          border: 1px solid #e5e7eb;
        `}
`

const BiographyTitle = styled.h3`
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const BiographyText = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 24px;
  border-radius: ${RADIUS_CARD}px;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  font-size: 14px;
  font-weight: 500;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ActivitiesGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const ActivityCard = styled.div`
  border-radius: ${RADIUS_CARD}px;
  padding: 18px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        `
      : css`
          background: #fff;
          border: 1px solid #e5e7eb;
        `}
`

const ActivityCardTitle = styled.h4`
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ActivityCardTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  ${ActivityCardTitle} {
    margin: 0;
  }
`

const TenureAddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: ${ACCENT};
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
  &:hover {
    background: ${ACCENT_HOVER};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
`

const TenureEmptyText = styled.p`
  margin: 0;
  font-size: 14px;
  text-align: center;
  padding: 12px 0 4px;
  color: ${({ theme }) => theme.colors.text.secondary};
  strong {
    color: ${({ theme }) => theme.colors.text.secondary};
    font-weight: 600;
  }
`

const TenureRowEditBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s;
  color: ${ACCENT};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.25)' : '#e5e7eb'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.12)' : '#fff'};
  &:hover {
    border-color: ${ACCENT};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.2)' : '#faf5ff'};
  }
  &:focus-visible {
    outline: none;
    border-color: ${ACCENT_HOVER};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
`

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const ActivityItem = styled.div`
  padding: 12px 14px;
  border-radius: ${RADIUS_BTN}px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e5e7eb'};
`

const ActivityName = styled.div`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ActivityMeta = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const WorksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
`

const WorkCard = styled.div`
  border-radius: ${RADIUS_CARD}px;
  padding: 16px 18px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        `
      : css`
          background: #fff;
          border: 1px solid #e5e7eb;
        `}
`

const WorkTitle = styled.h4`
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
  color: ${({ theme }) => theme.colors.text.primary};
`

const WorkYear = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EventItem = styled.div`
  padding: 14px 16px;
  border-radius: ${RADIUS_CARD}px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.15s;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e5e7eb'};
  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,106,242,0.4)' : '#cbd5e1'};
  }
`

const EventHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
`

const EventName = styled.div`
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
  flex: 1;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EventDate = styled.div`
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  padding: 4px 8px;
  border-radius: ${RADIUS_BTN}px;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e5e7eb'};
`

const EventRole = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const RoleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 20px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  width: fit-content;
  color: ${ACCENT_HOVER};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99,102,241,0.18)'
      : 'rgba(99, 102, 241, 0.08)'};
`

const EventRoleDesc = styled.div`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EventDescription = styled.div`
  font-size: 13px;
  line-height: 1.6;
  padding-top: 8px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#e5e7eb'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EventNote = styled.div`
  font-size: 12px;
  line-height: 1.5;
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 3px solid ${ACCENT};
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e5e7eb'};
  border-right: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e5e7eb'};
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e5e7eb'};
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'};
`

const EventNoteLabel = styled.span`
  font-weight: 600;
  margin-right: 6px;
  color: ${ACCENT_HOVER};
`

const TimelineSection = styled.div`
  margin-top: 8px;
  padding: 12px 14px;
  border-radius: 9px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.07)'
        : 'rgba(226, 232, 240, 0.6)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'};
`

const TimelineTitle = styled.div`
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  margin-bottom: 10px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TimelineItem = styled.div`
  padding: 9px 11px;
  border-radius: 7px;
  margin-bottom: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
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
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TimelineDate = styled.div`
  font-size: 11px;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TimelineRole = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
`

const TimelineDesc = styled.div`
  font-size: 11.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TimelinePersons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 6px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.07)'
        : 'rgba(226, 232, 240, 0.5)'};
`

const TimelinePerson = styled.div`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 32px;
  text-align: center;
  border-radius: ${RADIUS_CARD}px;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  min-height: 300px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fff'};
`

const ErrorIcon = styled.div`
  font-size: 40px;
  margin-bottom: 14px;
  opacity: 0.5;
`

const ErrorTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ErrorDesc = styled.p`
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
`
