/**
 * 인물 상세 패널 (리스트 페이지 우측 컨텐츠 영역)
 * - /persons/:id 상세 페이지 기능을 행정조직 디자인으로 표시
 */
import React, { useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
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

import { personApi } from '@/shared/api/person'
import { getPersonDetailById } from '@/shared/api/persons-detail'
import { getUploadImageUrl, uploadImage } from '@/shared/api/upload'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/RichTextEditor'
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

/**
 * 전기 편집 시 에디터에 넣을 값: 일반 텍스트면 \n → <br> 변환, 이미 HTML이면 그대로.
 * (RichTextEditor는 HTML을 다루므로 평문 개행이 보이지 않음)
 */
function biographyToEditorValue(raw: string | null | undefined): string {
  if (raw == null || raw === '') return ''
  const trimmed = raw.trimStart()
  if (trimmed.startsWith('<')) return raw
  return raw.replace(/\n/g, '<br>')
}

/**
 * 특정 시점에 몇 살이었는지 계산 (출생년월일 + 해당 날짜)
 * 출생 정보 없으면 null
 */
function getAgeAtDate(
  birthYear: number | null | undefined,
  birthMonth?: number | null,
  birthDay?: number | null,
  dateIso?: string | null,
): number | null {
  if (birthYear == null || !dateIso) return null
  try {
    const d = new Date(dateIso)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()
    let age = y - birthYear
    if (age < 0) return null
    if (birthMonth != null && birthDay != null) {
      if (m < birthMonth || (m === birthMonth && day < birthDay)) age--
    }
    return age
  } catch {
    return null
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
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [tenureModalOpen, setTenureModalOpen] = useState(false)
  const [editingTenureId, setEditingTenureId] = useState<string | null>(null)
  const [editingBiography, setEditingBiography] = useState(false)
  const [biographyDraft, setBiographyDraft] = useState('')
  const [savingBiography, setSavingBiography] = useState(false)

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

  const registeredAtLabel = (() => {
    const raw = (person as any).createdAt
    if (!raw) return null
    try {
      const d = new Date(raw)
      return d.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return null
    }
  })()

  return (
    <PanelRoot
      $embed={embedInModal}
      as={motion.div}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* 상단 네비바: 목록으로 버튼(좌) + 수정 버튼(우) */}
      {!hideHeaderActions && (
        <TopNavBar>
          <BackToListButton
            type="button"
            onClick={() => {
              playClickSound()
              onClose()
            }}
          >
            <FiArrowLeft size={14} />
            {backLabel}
          </BackToListButton>
          <HeaderActions>
            <OutlineButton
              type="button"
              onClick={() => {
                playClickSound()
                onEdit(person.id)
              }}
            >
              <FiEdit2 size={13} />
              수정
            </OutlineButton>
          </HeaderActions>
        </TopNavBar>
      )}

      {/* 헤더: 썸네일 + 이름 */}
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
              <FiUsers size={24} aria-hidden />
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
            {registeredAtLabel && (
              <RegisteredByline>등록 {registeredAtLabel}</RegisteredByline>
            )}
          </HeaderTitleBlock>
        </HeaderLeft>
      </HeaderRow>

      {/* 기본정보 + 요약: 생몰·직업·국가·성별·가문·종교·배우자·저작·정부직위·사건·조직 */}
      <KpiStrip $compact={embedInModal}>
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
                  <TenureListWrap>
                    <TenureList>
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
                        const ageAtStart = getAgeAtDate(
                          person.birthYear,
                          person.birthMonth,
                          person.birthDay,
                          tenure.startDate,
                        )
                        return (
                          <TenureRow key={tenure.id}>
                            <TenureRowMain>
                              <TenureRowTitle>{positionTitle}</TenureRowTitle>
                              <TenureRowMeta>
                                {countryName && (
                                  <TenureRowMetaItem>
                                    {countryName}
                                  </TenureRowMetaItem>
                                )}
                                {termNum != null && (
                                  <TenureRowMetaItem>
                                    제{termNum}대
                                  </TenureRowMetaItem>
                                )}
                                <TenureRowMetaItem>{period}</TenureRowMetaItem>
                                {ageAtStart != null && (
                                  <TenureRowAgeBadge>
                                    {ageAtStart}세에 취임
                                  </TenureRowAgeBadge>
                                )}
                              </TenureRowMeta>
                              {(appointmentMethod || endReason || notes) && (
                                <TenureRowSub>
                                  {appointmentMethod && (
                                    <span>취임: {appointmentMethod}</span>
                                  )}
                                  {endReason && <span>퇴임: {endReason}</span>}
                                  {notes && <span>{notes}</span>}
                                </TenureRowSub>
                              )}
                            </TenureRowMain>
                            {!embedInModal && (
                              <TenureRowEditBtn
                                type="button"
                                onClick={() => {
                                  playClickSound()
                                  setEditingTenureId(tenure.id)
                                  setTenureModalOpen(true)
                                }}
                              >
                                <FiEdit2 size={12} />
                                수정
                              </TenureRowEditBtn>
                            )}
                          </TenureRow>
                        )
                      })}
                    </TenureList>
                  </TenureListWrap>
                ) : (
                  <TenureEmpty>
                    {embedInModal ? (
                      '등록된 재임 기록이 없습니다.'
                    ) : (
                      <>
                        등록된 재임 기록이 없습니다. <strong>수반 등록</strong>
                        으로 직책·국가·기간을 추가하세요.
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

              <section aria-label="전기">
                <BioSectionLabelRow>
                  <BioSectionLabel>전기</BioSectionLabel>
                  {!editingBiography ? (
                    <OutlineButton
                      type="button"
                      onClick={() => {
                        playClickSound()
                        setBiographyDraft(
                          biographyToEditorValue(person.biography),
                        )
                        setEditingBiography(true)
                      }}
                    >
                      <FiEdit2 size={14} />
                      {person.biography ? '수정' : '추가'}
                    </OutlineButton>
                  ) : null}
                </BioSectionLabelRow>
                {editingBiography ? (
                  <SectionCardBio>
                    <BioEditorWrap>
                      <RichTextEditor
                        value={biographyDraft}
                        onChange={setBiographyDraft}
                        showTitle={false}
                        placeholder="전기(약력)를 입력하세요. 서식·이미지를 넣을 수 있습니다."
                        onImageUpload={async (file) => {
                          const result = await uploadImage(file, 'persons')
                          return result.url
                        }}
                      />
                      <BioEditActions>
                        <OutlineButton
                          type="button"
                          onClick={() => {
                            playClickSound()
                            setEditingBiography(false)
                            setBiographyDraft('')
                          }}
                          disabled={savingBiography}
                        >
                          취소
                        </OutlineButton>
                        <PrimaryButton
                          type="button"
                          onClick={async () => {
                            playClickSound()
                            setSavingBiography(true)
                            try {
                              await personApi.update(person.id, {
                                biography: biographyDraft?.trim() || undefined,
                              })
                              await queryClient.invalidateQueries({
                                queryKey: ['person-detail', personId],
                              })
                              setEditingBiography(false)
                              setBiographyDraft('')
                              toast.success('전기가 저장되었습니다.')
                            } catch (err: unknown) {
                              toast.error(
                                err instanceof Error
                                  ? err.message
                                  : '전기 저장에 실패했습니다.',
                              )
                            } finally {
                              setSavingBiography(false)
                            }
                          }}
                          disabled={savingBiography}
                        >
                          {savingBiography ? '저장 중…' : '저장'}
                        </PrimaryButton>
                      </BioEditActions>
                    </BioEditorWrap>
                  </SectionCardBio>
                ) : person.biography ? (
                  <SectionCardBio>
                    <BioProse>
                      {person.biography.trimStart().startsWith('<') ||
                      /<br\s*\/?>/i.test(person.biography) ? (
                        <BioContent
                          dangerouslySetInnerHTML={{
                            __html: person.biography,
                          }}
                        />
                      ) : (
                        <BioText>{person.biography}</BioText>
                      )}
                    </BioProse>
                  </SectionCardBio>
                ) : (
                  <SectionCardBio>
                    <BioEmptyHint>
                      전기(약력)가 없습니다. 수정 버튼으로 추가할 수 있습니다.
                    </BioEmptyHint>
                  </SectionCardBio>
                )}
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
  gap: 0;
  min-width: 0;
  background: transparent;

  @media (max-width: 968px) {
    padding: ${(p) => (p.$embed ? '0' : '0')};
  }
`

/* ── 상단 네비바 ── */
const TopNavBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`

const HeaderRow = styled.header`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
`

const PersonAvatar = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 14px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  border: 1px solid rgba(226, 232, 240, 0.8);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
  }
`

const HeaderTitleBlock = styled.div`
  min-width: 0;
  flex: 1;
`

const PageTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const CountryFlagImg = styled.img`
  width: 22px;
  height: 15px;
  object-fit: cover;
  border-radius: 3px;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.14);
`

const CountryBracket = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: #7c3aed;
  background: rgba(124, 58, 237, 0.08);
  padding: 2px 7px;
  border-radius: 5px;
  letter-spacing: 0.02em;
`

const PageTitle = styled.h1`
  margin: 0;
  font-size: 21px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.04em;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  @media (max-width: 640px) {
    font-size: 18px;
    white-space: normal;
  }
`

const PageSubtitle = styled.p`
  margin: 5px 0 0;
  font-size: 12.5px;
  color: #64748b;
  line-height: 1.5;
  font-weight: 400;
`

const RegisteredByline = styled.p`
  margin: 8px 0 0;
  font-size: 11px;
  font-weight: 400;
  color: #94a3b8;
  letter-spacing: 0.03em;
  font-style: italic;
  font-family: Georgia, 'Times New Roman', serif;
`

const BackToListButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
  flex-shrink: 0;
  &:hover {
    color: #111827;
    text-decoration: underline;
  }
`

const OutlineButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
  &:hover {
    color: #111827;
    text-decoration: underline;
  }
`

const KpiStrip = styled.div<{ $compact?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${(p) => (p.$compact ? 12 : 22)}px;
  flex-wrap: wrap;
  padding: ${(p) => (p.$compact ? '12px 18px' : '14px 22px')};
  background: #f8fafc;
  border-radius: 13px;
  border: 1px solid #e2e8f0;
  margin-bottom: 40px;
`

const KpiItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const KpiLabel = styled.span`
  font-size: 9.5px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.07em;
  text-transform: uppercase;
`

const KpiValue = styled.span`
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
  line-height: 1.3;
`

const KpiDivider = styled.span`
  width: 1px;
  height: 26px;
  background: linear-gradient(
    to bottom,
    transparent,
    #cbd5e1 30%,
    #cbd5e1 70%,
    transparent
  );
  flex-shrink: 0;
`

const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

const SectionLabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f1f5f9;
`

const TenureAddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
  &:hover {
    color: #111827;
    text-decoration: underline;
  }
`

const TenureEmpty = styled.p`
  margin: 0;
  padding: 18px 20px;
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.5;
  background: rgba(248, 250, 252, 0.5);
  border-radius: 11px;
  border: 1.5px dashed #e2e8f0;
  text-align: center;
  strong {
    color: #64748b;
    font-weight: 600;
  }
`

const SectionCard = styled.div`
  background: #fff;
  border-radius: 14px;
  padding: 22px 24px;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 2px 8px rgba(0, 0, 0, 0.03);
  border: 1px solid #e2e8f0;
`

/** 전기 전용 — border 없음 */
const SectionCardBio = styled.div`
  background: #fff;
  padding: 4px 0 150px;
`

const BioSectionLabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f1f5f9;
`

const BioSectionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

const BioText = styled.div`
  font-size: 14.5px;
  line-height: 1.85;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 68ch;
`

const BioEditorWrap = styled.div`
  max-width: 680px;
  margin: 0 auto;
  width: 100%;
`

const BioProse = styled.div`
  max-width: 680px;
  margin: 0 auto;
  padding: 0 16px;
  hr,
  .prose-hr {
    border: none !important;
    border-top: 1px solid #e5e7eb !important;
    margin: 20px 0 !important;
    height: 0 !important;
    padding: 0 !important;
    background: none !important;
    display: block !important;
  }
`

const BioContent = styled.div`
  font-size: 14.5px;
  line-height: 1.8;
  color: #1e293b;
  word-break: break-word;
  & p {
    margin: 0 0 0.75em;
  }
  & p:last-child {
    margin-bottom: 0;
  }
`

const BioEditActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
`

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  font-size: 12.5px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border: none;
  border-radius: 9px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.28);
  transition:
    box-shadow 0.15s,
    opacity 0.15s;
  &:hover:not(:disabled) {
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.38);
    opacity: 0.95;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const BioEmptyHint = styled.p`
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.6;
  text-align: center;
  padding: 4px 0;
`

const LoadingWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 56px 24px;
  color: #64748b;
`

const Spinner = styled.div`
  width: 32px;
  height: 32px;
  border: 2.5px solid rgba(99, 102, 241, 0.15);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

const LoadingText = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
`

const ErrorWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 56px 24px;
  text-align: center;
`

const ErrorIcon = styled.div`
  font-size: 40px;
  opacity: 0.55;
`

const ErrorTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
`

const ErrorDesc = styled.div`
  font-size: 13px;
  color: #94a3b8;
`

const CloseBtn = styled.button`
  margin-top: 10px;
  padding: 9px 18px;
  font-size: 12.5px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border: none;
  border-radius: 9px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
  transition: opacity 0.15s;
  &:hover {
    opacity: 0.9;
  }
`

const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
  margin-left: auto;
  align-items: center;
  flex-shrink: 0;
`

const TabNav = styled.nav`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 4px 6px;
  margin-bottom: 48px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  background: #f1f5f9;
  border-radius: 13px;
  border: 1px solid rgba(226, 232, 240, 0.55);
  overflow-x: hidden;
`

const TabBtn = styled.button<{ $active: boolean }>`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 15px;
  border-radius: 9px;
  border: none;
  background: ${({ $active }) => ($active ? '#ffffff' : 'transparent')};
  color: ${({ $active }) => ($active ? '#4f46e5' : '#64748b')};
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? '700' : '500')};
  cursor: pointer;
  transition:
    color 0.12s,
    background 0.12s,
    box-shadow 0.15s;
  white-space: nowrap;
  box-shadow: ${({ $active }) =>
    $active
      ? '0 1px 5px rgba(79, 70, 229, 0.14), 0 0 0 1px rgba(99, 102, 241, 0.1)'
      : 'none'};
  svg {
    flex-shrink: 0;
    opacity: ${({ $active }) => ($active ? 1 : 0.6)};
  }
  &:hover {
    color: ${({ $active }) => ($active ? '#4f46e5' : '#334155')};
    background: ${({ $active }) =>
      $active ? '#ffffff' : 'rgba(255,255,255,0.65)'};
  }
  @media (max-width: 768px) {
    padding: 7px 11px;
    font-size: 12px;
    gap: 5px;
  }
`

const TabContentArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
`

const TabContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 40px;
`

const ListBlock = styled.div`
  border-radius: 13px;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(226, 232, 240, 0.65);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
`

const ListRowGroupLabel = styled.div`
  padding: 8px 16px;
  font-size: 9.5px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: #f8fafc;
  border-bottom: 1px solid rgba(226, 232, 240, 0.65);
`

const ListRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.45);
  min-height: 44px;
  transition: background 0.12s;
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: rgba(248, 250, 252, 0.7);
  }
`

const ListRowLabel = styled.div`
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  flex-shrink: 0;
  min-width: 60px;
`

const ListRowPrimary = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  flex: 1;
  min-width: 0;
`

const ListRowMeta = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  flex-shrink: 0;
`

const TenureListWrap = styled.div`
  max-width: 100%;
`

const TenureList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  border-radius: 13px;
  overflow: hidden;
  background: #fff;
  border: 1.5px solid #e8ecf8;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
`

const TenureRow = styled.li`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid #f0f2f7;
  transition: background 0.12s;
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: #fafbff;
  }
`

const TenureRowMain = styled.div`
  min-width: 0;
  flex: 1;
`

const TenureRowTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.35;
  margin-bottom: 6px;
`

const TenureRowMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  font-size: 11.5px;
  font-weight: 500;
  color: #64748b;
  line-height: 1.4;
`

const TenureRowMetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: #f1f5f9;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  color: #475569;
`

const TenureRowAgeBadge = styled.span`
  padding: 2px 8px;
  font-size: 10.5px;
  font-weight: 600;
  color: #7c3aed;
  background: rgba(124, 58, 237, 0.08);
  border-radius: 5px;
`

const TenureRowSub = styled.div`
  margin-top: 7px;
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
  line-height: 1.6;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  padding: 6px 10px;
  background: #f8fafc;
  border-radius: 7px;

  span::before {
    content: '·';
    margin-right: 4px;
    opacity: 0.4;
  }
  span:first-child::before {
    content: none;
  }
`

const TenureRowEditBtn = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  font-size: 11.5px;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.07);
  border: 1px solid rgba(99, 102, 241, 0.18);
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.12s;
  &:hover {
    background: rgba(99, 102, 241, 0.13);
  }
`

const TenureSectionCard = styled.div`
  max-width: 720px;
  background: #fff;
  border: 1px solid rgba(226, 232, 240, 0.65);
  border-radius: 13px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
`
const TenureSectionLabel = styled.div`
  padding: 10px 16px;
  font-size: 9.5px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: #f8fafc;
  border-bottom: 1px solid rgba(226, 232, 240, 0.65);
`
const TenureItem = styled.div`
  padding: 14px 16px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.45);
  transition: background 0.12s;
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: rgba(248, 250, 252, 0.5);
  }
`
const TenurePositionTitle = styled.div`
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 5px;
`
const TenureMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 9px;
  font-size: 11.5px;
  color: #64748b;
  font-weight: 500;
`
const TenureCountryBadge = styled.span`
  padding: 1.5px 7px;
  font-size: 11px;
  font-weight: 600;
  color: #4f46e5;
  background: rgba(79, 70, 229, 0.07);
  border-radius: 5px;
`
const TenurePeriod = styled.span`
  color: #475569;
  font-weight: 500;
`
const TenureTerm = styled.span`
  color: #94a3b8;
  font-weight: 500;
  font-size: 10.5px;
`
const TenureSub = styled.div`
  margin-top: 6px;
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
`

const EmptyState = styled.div`
  padding: 40px 20px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
  background: rgba(248, 250, 252, 0.4);
  border-radius: 13px;
  border: 1.5px dashed #e2e8f0;
`
