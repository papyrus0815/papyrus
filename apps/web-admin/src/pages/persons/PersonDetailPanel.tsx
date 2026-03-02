/**
 * 인물 상세 패널 (리스트 페이지 우측 컨텐츠 영역)
 * - /persons/:id 상세 페이지 기능을 행정조직 디자인으로 표시
 */
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FiBook,
  FiCalendar,
  FiEdit2,
  FiInfo,
  FiUsers,
  FiBriefcase,
  FiArrowLeft,
} from 'react-icons/fi'
import styled from 'styled-components'

import { getPersonDetailById } from '@/shared/api/persons-detail'
import { getUploadImageUrl } from '@/shared/api/upload'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

type TabType = 'overview' | 'genealogy' | 'activities' | 'events' | 'works'

interface PersonDetailPanelProps {
  personId: string
  onClose: () => void
  onEdit: (id: string) => void
  /** 닫기 버튼 툴팁 (예: "목록 보기") */
  closeLabel?: string
}

export function PersonDetailPanel({
  personId,
  onClose,
  onEdit,
  closeLabel = '닫기',
}: PersonDetailPanelProps) {
  const playClickSound = useClickSound()
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  const { data: person, isLoading, isError } = useQuery({
    queryKey: ['person-detail', personId],
    queryFn: () => getPersonDetailById(personId),
    enabled: !!personId,
  })

  if (isLoading) {
    return (
      <PanelRoot>
        <LoadingWrap>
          <Spinner />
          <LoadingText>인물 정보를 불러오는 중...</LoadingText>
        </LoadingWrap>
      </PanelRoot>
    )
  }

  if (isError || !person) {
    return (
      <PanelRoot>
        <ErrorWrap>
          <ErrorIcon>⚠️</ErrorIcon>
          <ErrorTitle>인물을 찾을 수 없습니다</ErrorTitle>
          <ErrorDesc>목록에서 다시 선택해 주세요.</ErrorDesc>
          <CloseBtn type="button" onClick={onClose}>
            닫기
          </CloseBtn>
        </ErrorWrap>
      </PanelRoot>
    )
  }

  const fullName = getPersonDisplayName(person)
  const birthYearText = person.birthYear
    ? `${person.birthYear}${person.birthEra === 'BC' ? ' BC' : ''}`
    : '?'
  const deathYearText = person.deathYear
    ? `${person.deathYear}${person.deathEra === 'BC' ? ' BC' : ''}`
    : null
  const isDeceased = person.deathYear != null
  const currentYear = new Date().getFullYear()
  const ageAtDeath =
    isDeceased && person.birthYear != null && person.deathYear != null
      ? person.deathYear - person.birthYear
      : null
  const currentAge =
    !isDeceased && person.birthYear != null && person.birthEra !== 'BC'
      ? currentYear - person.birthYear
      : null
  const lifespanText = isDeceased
    ? `${birthYearText} ~ ${deathYearText}${ageAtDeath != null ? ` · 사망 · ${ageAtDeath}세` : ' · 사망'}`
    : `${birthYearText} ~ ${currentAge != null ? `생존 (${currentAge}세)` : '생존'}`

  const genderLabel =
    person.gender === 'MALE' ? '남' : person.gender === 'FEMALE' ? '여' : person.gender ?? '—'

  const backLabel = closeLabel === '닫기' ? '목록으로' : closeLabel

  return (
    <PanelRoot
      as={motion.div}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* 헤더: 썸네일 + 이름(좌측), 수정·목록으로(우측) — 목록으로는 이름 좌측에 두지 않음 */}
      <HeaderRow>
        <HeaderLeft>
          <PersonAvatar>
            {person.profileImageUrl ? (
              <img
                src={
                  getUploadImageUrl(person.profileImageUrl) ||
                  person.profileImageUrl
                }
                alt={fullName}
              />
            ) : (
              <FiUsers size={28} aria-hidden />
            )}
          </PersonAvatar>
          <HeaderTitleBlock>
            <PageTitle>{fullName}</PageTitle>
            <PageSubtitle>
              {person.job?.title || '인물 상세'}
            </PageSubtitle>
          </HeaderTitleBlock>
        </HeaderLeft>
        <HeaderActions>
          <OutlineButton
            type="button"
            onClick={() => {
              playClickSound()
              onEdit(person.id)
            }}
          >
            <FiEdit2 size={16} />
            수정
          </OutlineButton>
          <BackToListButton
            type="button"
            onClick={() => {
              playClickSound()
              onClose()
            }}
          >
            <FiArrowLeft size={16} />
            {backLabel}
          </BackToListButton>
        </HeaderActions>
      </HeaderRow>

      {/* KPI 스트립: 생애·직업만 (국가는 기본 정보에 한 곳만) */}
      <KpiStrip>
        <KpiItem>
          <KpiLabel>생애</KpiLabel>
          <KpiValue>{lifespanText}</KpiValue>
        </KpiItem>
        <KpiDivider />
        <KpiItem>
          <KpiLabel>직업</KpiLabel>
          <KpiValue>{person.job?.title || '—'}</KpiValue>
        </KpiItem>
      </KpiStrip>

      {/* 탭 네비게이션 */}
      <TabNav>
        <TabBtn
          type="button"
          $active={activeTab === 'overview'}
          onClick={() => {
            playClickSound()
            setActiveTab('overview')
          }}
        >
          <FiInfo size={14} />
          개요
        </TabBtn>
        <TabBtn
          type="button"
          $active={activeTab === 'genealogy'}
          onClick={() => {
            playClickSound()
            setActiveTab('genealogy')
          }}
        >
          <FiUsers size={14} />
          가계도
        </TabBtn>
        <TabBtn
          type="button"
          $active={activeTab === 'activities'}
          onClick={() => {
            playClickSound()
            setActiveTab('activities')
          }}
        >
          <FiBriefcase size={14} />
          활동
        </TabBtn>
        <TabBtn
          type="button"
          $active={activeTab === 'events'}
          onClick={() => {
            playClickSound()
            setActiveTab('events')
          }}
        >
          <FiCalendar size={14} />
          사건
        </TabBtn>
        <TabBtn
          type="button"
          $active={activeTab === 'works'}
          onClick={() => {
            playClickSound()
            setActiveTab('works')
          }}
        >
          <FiBook size={14} />
          저작
        </TabBtn>
      </TabNav>

      {/* 탭 컨텐츠 */}
      <TabContentArea>
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <TabContent
              key="overview"
              as={motion.div}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <section aria-label="기본 정보">
                <SectionLabel>기본 정보</SectionLabel>
                <ListBlock>
                  <ListRow>
                    <ListRowLabel>생애</ListRowLabel>
                    <ListRowPrimary>{lifespanText}</ListRowPrimary>
                  </ListRow>
                  {person.country && (
                    <ListRow>
                      <ListRowLabel>국가</ListRowLabel>
                      <ListRowPrimary>{person.country.name}</ListRowPrimary>
                    </ListRow>
                  )}
                  {(person.gender === 'MALE' || person.gender === 'FEMALE') && (
                    <ListRow>
                      <ListRowLabel>성별</ListRowLabel>
                      <ListRowPrimary>{genderLabel}</ListRowPrimary>
                    </ListRow>
                  )}
                  {person.dynasty && (
                    <ListRow>
                      <ListRowLabel>가문</ListRowLabel>
                      <ListRowPrimary>{person.dynasty.name}</ListRowPrimary>
                    </ListRow>
                  )}
                  {person.religion && (
                    <ListRow>
                      <ListRowLabel>종교</ListRowLabel>
                      <ListRowPrimary>{person.religion.name}</ListRowPrimary>
                    </ListRow>
                  )}
                  {person.job && (
                    <ListRow>
                      <ListRowLabel>직업</ListRowLabel>
                      <ListRowPrimary>{person.job.title}</ListRowPrimary>
                    </ListRow>
                  )}
                  {person.spouse && (
                    <ListRow>
                      <ListRowLabel>배우자</ListRowLabel>
                      <ListRowPrimary>
                        {getPersonDisplayName(person.spouse)}
                      </ListRowPrimary>
                    </ListRow>
                  )}
                </ListBlock>
              </section>

              {person.biography && (
                <section aria-label="전기">
                  <SectionLabel>전기</SectionLabel>
                  <SectionCard>
                    <BioText>{person.biography}</BioText>
                  </SectionCard>
                </section>
              )}

              <section aria-label="요약">
                <SectionLabel>요약</SectionLabel>
                <KpiStrip $compact>
                  <KpiItem>
                    <KpiLabel>저작</KpiLabel>
                    <KpiValue>{person.books?.length ?? 0}건</KpiValue>
                  </KpiItem>
                  <KpiDivider />
                  <KpiItem>
                    <KpiLabel>정부 직위</KpiLabel>
                    <KpiValue>{person.governmentPositions?.length ?? 0}건</KpiValue>
                  </KpiItem>
                  <KpiDivider />
                  <KpiItem>
                    <KpiLabel>주요 사건</KpiLabel>
                    <KpiValue>{person.events?.length ?? 0}건</KpiValue>
                  </KpiItem>
                  <KpiDivider />
                  <KpiItem>
                    <KpiLabel>조직 활동</KpiLabel>
                    <KpiValue>{person.organizationRoles?.length ?? 0}건</KpiValue>
                  </KpiItem>
                </KpiStrip>
              </section>
            </TabContent>
          )}

          {activeTab === 'genealogy' && (
            <TabContent
              key="genealogy"
              as={motion.div}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <section aria-label="가족 관계">
                <SectionLabel>가족 관계</SectionLabel>
                {!person.father &&
                !person.mother &&
                !person.spouse &&
                (!person.children || person.children.length === 0) ? (
                  <EmptyState>가족 정보가 없습니다</EmptyState>
                ) : (
                  <ListBlock>
                    {person.spouse && (
                      <>
                        <ListRowGroupLabel>배우자</ListRowGroupLabel>
                        <ListRow>
                          <ListRowPrimary>
                            {getPersonDisplayName(person.spouse)}
                          </ListRowPrimary>
                        </ListRow>
                      </>
                    )}
                    {(person.father || person.mother) && (
                      <>
                        <ListRowGroupLabel>부모</ListRowGroupLabel>
                        {person.father && (
                          <ListRow>
                            <ListRowPrimary>
                              {getPersonDisplayName(person.father)}
                            </ListRowPrimary>
                            <ListRowMeta>아버지</ListRowMeta>
                          </ListRow>
                        )}
                        {person.mother && (
                          <ListRow>
                            <ListRowPrimary>
                              {getPersonDisplayName(person.mother)}
                            </ListRowPrimary>
                            <ListRowMeta>어머니</ListRowMeta>
                          </ListRow>
                        )}
                      </>
                    )}
                    {person.children && person.children.length > 0 && (
                      <>
                        <ListRowGroupLabel>
                          자녀 ({person.children.length}명)
                        </ListRowGroupLabel>
                        {person.children.map((child: any) => (
                          <ListRow key={child.id}>
                            <ListRowPrimary>
                              {getPersonDisplayName(child)}
                            </ListRowPrimary>
                            <ListRowMeta>자녀</ListRowMeta>
                          </ListRow>
                        ))}
                      </>
                    )}
                  </ListBlock>
                )}
              </section>
            </TabContent>
          )}

          {activeTab === 'activities' && (
            <TabContent
              key="activities"
              as={motion.div}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <section aria-label="활동">
                <SectionLabel>활동</SectionLabel>
                {(!person.militaryCommands ||
                  person.militaryCommands.length === 0) &&
                (!person.organizationRoles ||
                  person.organizationRoles.length === 0) &&
                (!person.governmentPositions ||
                  person.governmentPositions.length === 0) ? (
                  <EmptyState>활동 정보가 없습니다</EmptyState>
                ) : (
                  <ListBlock>
                    {person.governmentPositions?.map((tenure: any) => (
                      <ListRow key={tenure.id}>
                        <ListRowPrimary>{tenure.position?.title}</ListRowPrimary>
                        <ListRowMeta>
                          {tenure.startDate &&
                            new Date(tenure.startDate).toLocaleDateString(
                              'ko-KR',
                            )}
                          {tenure.endDate &&
                            ` ~ ${new Date(tenure.endDate).toLocaleDateString('ko-KR')}`}
                        </ListRowMeta>
                      </ListRow>
                    ))}
                    {person.militaryCommands?.map((cmd: any) => (
                      <ListRow key={cmd.id}>
                        <ListRowPrimary>{cmd.unit?.name}</ListRowPrimary>
                        <ListRowMeta>
                          {cmd.rank} · {cmd.role}
                        </ListRowMeta>
                      </ListRow>
                    ))}
                    {person.organizationRoles?.map((role: any) => (
                      <ListRow key={role.id}>
                        <ListRowPrimary>{role.organization?.name}</ListRowPrimary>
                        <ListRowMeta>{role.roleTitle}</ListRowMeta>
                      </ListRow>
                    ))}
                  </ListBlock>
                )}
              </section>
            </TabContent>
          )}

          {activeTab === 'events' && (
            <TabContent
              key="events"
              as={motion.div}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <section aria-label="주요 사건">
                <SectionLabel>주요 사건</SectionLabel>
                {!person.events || person.events.length === 0 ? (
                  <EmptyState>사건 정보가 없습니다</EmptyState>
                ) : (
                  <ListBlock>
                    {person.events.map((evt: any) => (
                      <ListRow key={evt.id}>
                        <ListRowPrimary>{evt.event?.title}</ListRowPrimary>
                        <ListRowMeta>
                          {evt.event?.startDate &&
                            new Date(
                              evt.event.startDate,
                            ).toLocaleDateString('ko-KR')}
                          {evt.role && ` · ${evt.role}`}
                        </ListRowMeta>
                      </ListRow>
                    ))}
                  </ListBlock>
                )}
              </section>
            </TabContent>
          )}

          {activeTab === 'works' && (
            <TabContent
              key="works"
              as={motion.div}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <section aria-label="저작">
                <SectionLabel>저작</SectionLabel>
                {!person.books || person.books.length === 0 ? (
                  <EmptyState>저작물 정보가 없습니다</EmptyState>
                ) : (
                  <ListBlock>
                    {person.books.map((book: any) => (
                      <ListRow key={book.id}>
                        <ListRowPrimary>{book.title}</ListRowPrimary>
                        <ListRowMeta>
                          {book.publishedYear &&
                            `${book.publishedYear}년 출판`}
                        </ListRowMeta>
                      </ListRow>
                    ))}
                  </ListBlock>
                )}
              </section>
            </TabContent>
          )}
        </AnimatePresence>
      </TabContentArea>
    </PanelRoot>
  )
}

/* 행정조직 루트와 동일: padding 36 32 48, gap 32, 흰 배경 — 요약 아래까지 흰색 유지 */
const PanelRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  padding: 36px 32px 48px;
  background: #ffffff;
  min-height: 70vh;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
  }

  @media (max-width: 968px) {
    max-height: none;
    padding: 24px 20px 32px;
    gap: 24px;
  }
`

const HeaderRow = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  padding-bottom: 24px;
  border-bottom: 1px solid #f3f4f6;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 0;
`

const PersonAvatar = styled.div`
  width: 88px;
  height: 88px;
  border-radius: 16px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
  }
`

const HeaderTitleBlock = styled.div`
  min-width: 0;
`

const PageTitle = styled.h1`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.025em;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  @media (max-width: 640px) {
    font-size: 18px;
    white-space: normal;
  }
`

const PageSubtitle = styled.p`
  margin: 10px 0 0;
  font-size: 15px;
  color: #64748b;
  line-height: 1.55;
  font-weight: 500;
`

/* 인물 등록 폼 BackButton과 동일 */
const BackToListButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  background: transparent;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;
  flex-shrink: 0;

  &:hover {
    color: #475569;
    background: #f1f5f9;
    svg {
      transform: translateX(-2px);
    }
  }
  svg {
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }
`

/* 인물 등록 폼과 동일: 아웃라인 버튼 */
const OutlineButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #374151;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: background 0.2s, border-color 0.2s;

  &:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }
  &:focus-visible {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
`

/* 인물 등록 폼 구분선 톤과 맞춤 */
const KpiStrip = styled.div<{ $compact?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${(p) => (p.$compact ? 20 : 28)}px;
  flex-wrap: wrap;
  padding: ${(p) => (p.$compact ? '16px 24px' : '20px 28px')};
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
`

const KpiItem = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-direction: column;
`

const KpiLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

const KpiValue = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.03em;
  line-height: 1.2;
  @media (max-width: 640px) {
    font-size: 17px;
  }
`

const KpiDivider = styled.span`
  width: 1px;
  height: 24px;
  background: #e2e8f0;
  border-radius: 1px;
  flex-shrink: 0;
`

/* 행정조직 SectionLabel과 동일 */
const SectionLabel = styled.div`
  margin-bottom: 18px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  line-height: 1.4;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

/* 인물 등록 FormCardWrapper와 동일: 20px radius, 1px shadow */
const SectionCard = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
`

const BioText = styled.div`
  font-size: 14px;
  line-height: 1.8;
  color: #374151;
`

const LoadingWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px 24px;
  color: #64748b;
`

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(99, 102, 241, 0.2);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`

const LoadingText = styled.div`
  font-size: 14px;
  font-weight: 500;
`

const ErrorWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  text-align: center;
`

const ErrorIcon = styled.div`
  font-size: 48px;
  opacity: 0.7;
`

const ErrorTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
`

const ErrorDesc = styled.div`
  font-size: 14px;
  color: #64748b;
`

/* 인물 등록 SubmitButton과 동일 */
const CloseBtn = styled.button`
  margin-top: 12px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #6366f1;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
  transition: background 0.2s ease;
  &:hover {
    background: #4f46e5;
  }
`

const HeaderActions = styled.div`
  display: flex;
  gap: 10px;
  margin-left: auto;
  align-items: center;
  flex-shrink: 0;
`

/* 인물 등록 폼 TabNavigation과 동일 */
const TabNav = styled.nav`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  margin-bottom: 24px;
  width: fit-content;
  background: #f1f5f9;
  border-radius: 20px;
  overflow-x: auto;
  &::-webkit-scrollbar {
    display: none;
  }
`

const TabBtn = styled.button<{ $active: boolean }>`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 14px;
  border: none;
  background: ${({ $active }) => ($active ? '#ffffff' : 'transparent')};
  color: ${({ $active }) => ($active ? '#4f46e5' : '#64748b')};
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, box-shadow 0.2s ease;
  white-space: nowrap;
  box-shadow: ${({ $active }) =>
    $active ? '0 2px 8px rgba(79, 70, 229, 0.12)' : 'none'};

  svg {
    flex-shrink: 0;
  }

  &:hover {
    color: ${({ $active }) => ($active ? '#4f46e5' : '#475569')};
    background: ${({ $active }) =>
      $active ? '#ffffff' : 'rgba(255,255,255,0.6)'};
  }

  &:active {
    transform: none;
  }

  @media (max-width: 768px) {
    padding: 8px 14px;
    font-size: 12px;

    svg {
      width: 14px;
      height: 14px;
    }
  }
`

// 행정조직 우측 탭 콘텐츠 영역: 스크롤은 PanelRoot에서 처리
const TabContentArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const TabContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 24px;
`

/* 단일 컨테이너: 카드 중첩 없이 리스트만 */
const ListBlock = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
`

const ListRowGroupLabel = styled.div`
  padding: 10px 20px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
`

const ListRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  border-bottom: 1px solid #e5e7eb;
  min-height: 48px;

  &:last-child {
    border-bottom: none;
  }
`

const ListRowLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  flex-shrink: 0;
  min-width: 72px;
`

const ListRowPrimary = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  flex: 1;
  min-width: 0;
`

const ListRowMeta = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  flex-shrink: 0;
`

const EmptyState = styled.div`
  padding: 48px 24px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: #78716c;
  background: #ffffff;
  border-radius: 18px;
  border: 1px dashed #e5e7eb;
`

