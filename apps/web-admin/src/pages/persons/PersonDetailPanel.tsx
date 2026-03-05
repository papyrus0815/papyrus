/**
 * 인물 상세 패널 (리스트 페이지 우측 컨텐츠 영역)
 * - /persons/:id 상세 페이지 기능을 행정조직 디자인으로 표시
 */
import React, { useState } from 'react'

import { useQuery } from '@tanstack/react-query'

import { AnimatePresence, motion } from 'framer-motion'
import {
  FiArrowLeft,
  FiBook,
  FiBriefcase,
  FiCalendar,
  FiEdit2,
  FiInfo,
  FiPlus,
  FiUsers,
} from 'react-icons/fi'
import styled from 'styled-components'

import { getPersonDetailById } from '@/shared/api/persons-detail'
import { getUploadImageUrl } from '@/shared/api/upload'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { TenureRegisterPanel } from '@/shared/ui/tenure-register-panel'

type TabType = 'overview' | 'genealogy' | 'activities' | 'events' | 'works'

/** "YYYY년 M월 D일" 형식 (월·일 없으면 년만) */
function formatDateKo(
  year: number | null | undefined,
  month?: number | null,
  day?: number | null,
  era?: string | null,
): string {
  if (year == null) return ''
  const prefix = era === 'BC' ? '기원전 ' : ''
  if (month != null && day != null)
    return `${prefix}${year}년 ${month}월 ${day}일`
  if (month != null) return `${prefix}${year}년 ${month}월`
  return `${prefix}${year}년`
}

/** ISO 날짜 문자열 → "YYYY년 M월 D일" */
function formatIsoDateKo(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()
    return `${y}년 ${m}월 ${day}일`
  } catch {
    return ''
  }
}

interface PersonDetailPanelProps {
  personId: string
  onClose: () => void
  onEdit: (id: string) => void
  /** 닫기/뒤로가기 버튼 문구 (예: "목록으로", "닫기") */
  closeLabel?: string
  /** true면 헤더의 수정·닫기 버튼 숨김 (모달 등 외부에서 닫기 제공 시) */
  hideHeaderActions?: boolean
  /** true면 수반 등록·직책 수정 버튼 숨김 (모달에서 정보만 볼 때) */
  embedInModal?: boolean
}

export function PersonDetailPanel({
  personId,
  onClose,
  onEdit,
  closeLabel = '닫기',
  hideHeaderActions = false,
  embedInModal = false,
}: PersonDetailPanelProps) {
  const playClickSound = useClickSound()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [tenureModalOpen, setTenureModalOpen] = useState(false)
  const [editingTenureId, setEditingTenureId] = useState<string | null>(null)

  const {
    data: person,
    isLoading,
    isError,
  } = useQuery({
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

  /** 이름 밑: 년월일~년월일 (출생~사망 또는 출생~생존) */
  const birthDateStr = formatDateKo(
    person.birthYear ?? undefined,
    person.birthMonth ?? undefined,
    person.birthDay ?? undefined,
    person.birthEra,
  )
  const deathDateStr = formatDateKo(
    person.deathYear ?? undefined,
    person.deathMonth ?? undefined,
    person.deathDay ?? undefined,
    person.deathEra,
  )
  const rangeStr = [birthDateStr, deathDateStr].filter(Boolean).join(' ~ ')
  const subtitleLifespan = isDeceased
    ? rangeStr
      ? rangeStr + (ageAtDeath != null ? `(향년 ${ageAtDeath}세)` : '')
      : '생몰년 미상'
    : birthDateStr
      ? `${birthDateStr} ~ 생존${currentAge != null ? ` (${currentAge}세)` : ''}`
      : currentAge != null
        ? `생존 (${currentAge}세)`
        : '생존'

  const genderLabel =
    person.gender === 'MALE'
      ? '남'
      : person.gender === 'FEMALE'
        ? '여'
        : (person.gender ?? '—')

  const backLabel = closeLabel

  /** API가 governmentPositions 또는 governmentTenures 중 하나로 내려줄 수 있음 */
  const tenuresList =
    person.governmentPositions ?? person.governmentTenures ?? []

  const countryFlagSrc = person.country
    ? (person.country as { thumbnailUrl?: string }).thumbnailUrl
      ? getUploadImageUrl(
          (person.country as { thumbnailUrl?: string }).thumbnailUrl,
        ) || (person.country as { thumbnailUrl?: string }).thumbnailUrl
      : (person.country as { isoCode?: string }).isoCode
        ? `https://flagcdn.com/w80/${((person.country as { isoCode?: string }).isoCode || '').toLowerCase()}.png`
        : null
    : null

  return (
    <PanelRoot
      $embed={embedInModal}
      as={motion.div}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* 헤더: 썸네일 + 이름(좌측), 수정·닫기(우측, hideHeaderActions 시 숨김) */}
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
            <PageTitleRow>
              {countryFlagSrc ? (
                <CountryFlagImg src={countryFlagSrc} alt="" aria-hidden />
              ) : person.country?.name ? (
                <CountryBracket>[{person.country.name}]</CountryBracket>
              ) : null}
              <PageTitle>{fullName}</PageTitle>
            </PageTitleRow>
            <PageSubtitle>{subtitleLifespan}</PageSubtitle>
          </HeaderTitleBlock>
        </HeaderLeft>
        {!hideHeaderActions && (
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
        )}
      </HeaderRow>

      {/* 기본정보 + 요약: 생몰·직업·국가·성별·가문·종교·배우자·저작·정부직위·사건·조직 */}
      <KpiStrip $compact={embedInModal}>
        <KpiItem>
          <KpiLabel>생몰</KpiLabel>
          <KpiValue>{lifespanText}</KpiValue>
        </KpiItem>
        <KpiDivider />
        <KpiItem>
          <KpiLabel>직업</KpiLabel>
          <KpiValue>{person.job?.title || '—'}</KpiValue>
        </KpiItem>
        <KpiDivider />
        {person.country && (
          <>
            <KpiItem>
              <KpiLabel>국가</KpiLabel>
              <KpiValue>{person.country.name}</KpiValue>
            </KpiItem>
            <KpiDivider />
          </>
        )}
        {(person.gender === 'MALE' || person.gender === 'FEMALE') && (
          <>
            <KpiItem>
              <KpiLabel>성별</KpiLabel>
              <KpiValue>{genderLabel}</KpiValue>
            </KpiItem>
            <KpiDivider />
          </>
        )}
        <KpiItem>
          <KpiLabel>저작</KpiLabel>
          <KpiValue>{person.books?.length ?? 0}건</KpiValue>
        </KpiItem>
        <KpiDivider />
        <KpiItem>
          <KpiLabel>정부 직위</KpiLabel>
          <KpiValue>{tenuresList.length}건</KpiValue>
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
        {person.dynasty && (
          <>
            <KpiDivider />
            <KpiItem>
              <KpiLabel>가문</KpiLabel>
              <KpiValue>{person.dynasty.name}</KpiValue>
            </KpiItem>
          </>
        )}
        {person.religion && (
          <>
            <KpiDivider />
            <KpiItem>
              <KpiLabel>종교</KpiLabel>
              <KpiValue>{person.religion.name}</KpiValue>
            </KpiItem>
          </>
        )}
        {person.spouse && (
          <>
            <KpiDivider />
            <KpiItem>
              <KpiLabel>배우자</KpiLabel>
              <KpiValue>{getPersonDisplayName(person.spouse)}</KpiValue>
            </KpiItem>
          </>
        )}
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
              <section aria-label="등록된 직책">
                <SectionLabelRow>
                  <SectionLabel>등록된 직책</SectionLabel>
                  {!embedInModal && (
                    <TenureAddButton
                      type="button"
                      onClick={() => {
                        playClickSound()
                        setEditingTenureId(null)
                        setTenureModalOpen(true)
                      }}
                    >
                      <FiPlus size={14} />
                      수반 등록
                    </TenureAddButton>
                  )}
                </SectionLabelRow>
                {tenuresList.length > 0 ? (
                  <TenureCardWrap>
                    <TenureCardGrid>
                      {tenuresList.map((tenure: any) => {
                        const positionTitle =
                          tenure.positionDefinition?.title ??
                          tenure.title ??
                          '직책'
                        const countryName =
                          tenure.country?.name ??
                          tenure.historicalCountry?.name ??
                          null
                        const startStr = formatIsoDateKo(tenure.startDate)
                        const endStr = tenure.endDate
                          ? formatIsoDateKo(tenure.endDate)
                          : null
                        const period = startStr
                          ? endStr
                            ? `${startStr} ~ ${endStr}`
                            : `${startStr} ~ 현재`
                          : '—'
                        const termNum = tenure.termNumber ?? tenure.regnalNumber
                        const appointmentMethod = tenure.appointmentMethod
                        const endReason =
                          tenure.endReason ?? tenure.endReasonDetail
                        const notes = tenure.notes
                        return (
                          <TenureCard key={tenure.id}>
                            <TenureCardTitle>{positionTitle}</TenureCardTitle>
                            <TenureCardMeta>
                              {countryName && <span>{countryName}</span>}
                              {countryName &&
                                (termNum != null || period) &&
                                ' · '}
                              {termNum != null && <span>제{termNum}대</span>}
                              {termNum != null && period && ' · '}
                              <span>{period}</span>
                            </TenureCardMeta>
                            {(appointmentMethod || endReason || notes) && (
                              <TenureCardSub>
                                {appointmentMethod && (
                                  <span>취임: {appointmentMethod}</span>
                                )}
                                {endReason && <span>퇴임: {endReason}</span>}
                                {notes && <span>{notes}</span>}
                              </TenureCardSub>
                            )}
                            {!embedInModal && (
                              <TenureCardActions>
                                <TenureCardEditBtn
                                  type="button"
                                  onClick={() => {
                                    playClickSound()
                                    setEditingTenureId(tenure.id)
                                    setTenureModalOpen(true)
                                  }}
                                >
                                  <FiEdit2 size={14} />
                                  수정
                                </TenureCardEditBtn>
                              </TenureCardActions>
                            )}
                          </TenureCard>
                        )
                      })}
                    </TenureCardGrid>
                  </TenureCardWrap>
                ) : (
                  <TenureEmpty>
                    {embedInModal
                      ? '등록된 재임 기록이 없습니다.'
                      : (
                        <>
                          등록된 재임 기록이 없습니다. <strong>수반 등록</strong>으로
                          직책·국가·기간을 추가하세요.
                        </>
                        )}
                  </TenureEmpty>
                )}
              </section>

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
                }}
                tenureId={editingTenureId ?? undefined}
              />

              {person.biography && (
                <section aria-label="전기">
                  <SectionLabel>전기</SectionLabel>
                  <SectionCard>
                    <BioText>{person.biography}</BioText>
                  </SectionCard>
                </section>
              )}
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
                tenuresList.length === 0 ? (
                  <EmptyState>활동 정보가 없습니다</EmptyState>
                ) : (
                  <>
                    {tenuresList.length > 0 && (
                      <TenureSectionCard>
                        <TenureSectionLabel>
                          정부 직위 ({tenuresList.length}건)
                        </TenureSectionLabel>
                        {tenuresList.map((tenure: any) => {
                          const positionTitle =
                            tenure.positionDefinition?.title ??
                            tenure.position?.title ??
                            tenure.title ??
                            '직책'
                          const countryName =
                            tenure.country?.name ??
                            tenure.historicalCountry?.name ??
                            null
                          const startStr = tenure.startDate
                            ? new Date(tenure.startDate).toLocaleDateString(
                                'ko-KR',
                                {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                },
                              )
                            : null
                          const endStr = tenure.endDate
                            ? new Date(tenure.endDate).toLocaleDateString(
                                'ko-KR',
                                {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                },
                              )
                            : null
                          const period =
                            [startStr, endStr].filter(Boolean).join(' ~ ') ||
                            '—'
                          const termNum =
                            tenure.termNumber ?? tenure.regnalNumber
                          return (
                            <TenureItem key={tenure.id}>
                              <TenurePositionTitle>
                                {positionTitle}
                              </TenurePositionTitle>
                              <TenureMetaRow>
                                {countryName && (
                                  <TenureCountryBadge>
                                    {countryName}
                                  </TenureCountryBadge>
                                )}
                                {termNum != null && (
                                  <TenureTerm>제{termNum}대</TenureTerm>
                                )}
                                <TenurePeriod>{period}</TenurePeriod>
                              </TenureMetaRow>
                            </TenureItem>
                          )
                        })}
                      </TenureSectionCard>
                    )}
                    {(person.militaryCommands?.length > 0 ||
                      person.organizationRoles?.length > 0) && (
                      <ListBlock>
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
                            <ListRowPrimary>
                              {role.organization?.name}
                            </ListRowPrimary>
                            <ListRowMeta>{role.roleTitle}</ListRowMeta>
                          </ListRow>
                        ))}
                      </ListBlock>
                    )}
                  </>
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
                            new Date(evt.event.startDate).toLocaleDateString(
                              'ko-KR',
                            )}
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
                          {book.publishedYear && `${book.publishedYear}년 출판`}
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

const PanelRoot = styled.div<{ $embed?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${(p) => (p.$embed ? 20 : 28)}px;
  max-height: ${(p) => (p.$embed ? 'none' : 'calc(100vh - 200px)')};
  overflow-y: ${(p) => (p.$embed ? 'visible' : 'auto')};
  overflow-x: hidden;
  min-width: 0;
  background: transparent;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  @media (max-width: 968px) {
    max-height: none;
    padding: ${(p) => (p.$embed ? '0' : '24px 20px 32px')};
    gap: ${(p) => (p.$embed ? 18 : 24)}px;
  }
`

const HeaderRow = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  padding: 24px 28px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 0;
`

const PersonAvatar = styled.div`
  width: 120px;
  height: 120px;
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

const PageTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const CountryFlagImg = styled.img`
  width: 28px;
  height: 20px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
`

const CountryBracket = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
`

const PageTitle = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.03em;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  @media (max-width: 640px) {
    font-size: 19px;
    white-space: normal;
  }
`

const PageSubtitle = styled.p`
  margin: 10px 0 0;
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
  font-weight: 500;
  max-width: 520px;
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
  transition:
    color 0.2s ease,
    background 0.2s ease;
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
  transition:
    background 0.2s,
    border-color 0.2s;

  &:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }
  &:focus-visible {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
`

const KpiStrip = styled.div<{ $compact?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${(p) => (p.$compact ? 16 : 24)}px;
  flex-wrap: wrap;
  padding: ${(p) => (p.$compact ? '16px 20px' : '20px 24px')};
  background: #fafbfc;
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
`

const KpiItem = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-direction: column;
`

const KpiLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

const KpiValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.01em;
  line-height: 1.4;
  @media (max-width: 640px) {
    font-size: 13px;
  }
`

const KpiDivider = styled.span`
  width: 1px;
  height: 24px;
  background: #e2e8f0;
  border-radius: 1px;
  flex-shrink: 0;
`

const SectionLabel = styled.div`
  margin-bottom: 12px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  line-height: 1.4;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

const SectionLabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
`

const TenureAddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s;
  &:hover {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.06);
    color: #4f46e5;
  }
`

const TenureEmpty = styled.p`
  margin: 0;
  padding: 20px 24px;
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
  background: #f8fafc;
  border-radius: 14px;
  border: 1px dashed #e2e8f0;
  strong {
    color: #475569;
    font-weight: 600;
  }
`

const SectionCard = styled.div`
  background: #fff;
  border-radius: 16px;
  padding: 24px 28px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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
    to {
      transform: rotate(360deg);
    }
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

/* 인물 등록 폼 TabNavigation과 동일 — 가로 스크롤 없이 줄바꿈 */
const TabNav = styled.nav`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px;
  margin-top: 32px;
  margin-bottom: 28px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  background: #f8fafc;
  border-radius: 14px;
  overflow-x: hidden;
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
  transition:
    color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.2s ease;
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
  gap: 28px;
  padding-bottom: 32px;
`

const ListBlock = styled.div`
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
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

/* 등록된 직책(역대 수반) */
const TenureCardWrap = styled.div`
  max-width: 680px;
`

const TenureCardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
`

const TenureCard = styled.div`
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  transition: box-shadow 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }
`

const TenureCardTitle = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  padding: 18px 20px 14px;
  line-height: 1.4;
`

const TenureCardMeta = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  padding: 0 20px 16px;
  line-height: 1.55;
`

const TenureCardSub = styled.div`
  padding: 14px 20px 16px;
  background: #f8fafc;
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  line-height: 1.6;
`

const TenureCardActions = styled.div`
  padding: 10px 18px 14px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: flex-end;
`

const TenureCardEditBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #6366f1;
  background: #fff;
  border: 1px solid #e0e7ff;
  border-radius: 8px;
  cursor: pointer;
  &:hover {
    background: #eef2ff;
    border-color: #c7d2fe;
  }
`

/* 활동 탭 내 정부 직위 블록 */
const TenureSectionCard = styled.div`
  max-width: 720px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
`
const TenureSectionLabel = styled.div`
  padding: 12px 20px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
`
const TenureItem = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  &:last-child {
    border-bottom: none;
  }
`
const TenurePositionTitle = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 6px;
`
const TenureMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
`
const TenureCountryBadge = styled.span`
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  background: #f1f5f9;
  border-radius: 6px;
`
const TenurePeriod = styled.span`
  color: #475569;
  font-weight: 500;
`
const TenureTerm = styled.span`
  color: #64748b;
  font-weight: 500;
  font-size: 12px;
`
const TenureSub = styled.div`
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
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
