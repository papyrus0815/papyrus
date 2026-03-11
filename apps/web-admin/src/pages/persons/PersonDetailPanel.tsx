/**
 * 인물 상세 패널 (리스트 페이지 우측 컨텐츠 영역)
 * - /persons/:id 상세 페이지 기능을 행정조직 디자인으로 표시
 */
import React, { useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

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

import { personApi } from '@/shared/api/person'
import { getPersonDetailById } from '@/shared/api/persons-detail'
import { getUploadImageUrl, uploadImage } from '@/shared/api/upload'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/RichTextEditor'
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
          <>
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
            </HeaderActions>
          </>
        )}
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
                                  <TenureRowMetaItem>{countryName}</TenureRowMetaItem>
                                )}
                                {termNum != null && (
                                  <TenureRowMetaItem>제{termNum}대</TenureRowMetaItem>
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
                                  {endReason && (
                                    <span>퇴임: {endReason}</span>
                                  )}
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
                        setBiographyDraft(biographyToEditorValue(person.biography))
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
                                err instanceof Error ? err.message : '전기 저장에 실패했습니다.',
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
                    <BioEmptyHint>전기(약력)가 없습니다. 수정 버튼으로 추가할 수 있습니다.</BioEmptyHint>
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
  gap: ${(p) => (p.$embed ? 16 : 22)}px;
  min-width: 0;
  background: transparent;
  padding-bottom: ${(p) => (p.$embed ? 0 : '56px')};

  @media (max-width: 968px) {
    padding: ${(p) => (p.$embed ? '0' : '24px 20px 48px')};
    gap: ${(p) => (p.$embed ? 18 : 24)}px;
  }
`

const HeaderRow = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  padding: 18px 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`

const PersonAvatar = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 14px;
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
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.03em;
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

/** 전기 전용 카드 — 맨밑 border 없음 */
const SectionCardBio = styled.div`
  background: #fff;
  border-radius: 16px;
  padding: 28px 28px 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: none;
`

/** 전기 섹션 라벨 행 — 눈에 잘 들어오도록 */
const BioSectionLabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
`

const BioSectionLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  letter-spacing: -0.02em;
`

const BioText = styled.div`
  font-size: 15px;
  line-height: 1.75;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
`

/** 전기 편집 시 에디터 감싸기 — 표시 본문(BioProse)과 동일 너비 */
const BioEditorWrap = styled.div`
  max-width: 680px;
  margin: 0 auto;
  width: 100%;
`

/** 전기 본문 감싸기 — 포스트 상세처럼 좌우 여백 + 수평선 스타일 */
const BioProse = styled.div`
  max-width: 680px;
  margin: 0 auto;
  padding: 0 40px;
  hr,
  .prose-hr {
    border: none !important;
    border-top: 1px solid #e5e7eb !important;
    margin: 24px 0 !important;
    height: 0 !important;
    padding: 0 !important;
    background: none !important;
    display: block !important;
  }
`

/** 전기 표시용 (RichTextEditor 저장 HTML 또는 기존 일반 텍스트) */
const BioContent = styled.div`
  font-size: 15px;
  line-height: 1.75;
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
  gap: 10px;
  margin-top: 20px;
`

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #4f46e5;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s ease;
  &:hover:not(:disabled) {
    background: #4338ca;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const BioEmptyHint = styled.p`
  margin: 0;
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
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
  padding-bottom: 56px;
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

/* 등록된 직책(역대 수반) — 개요와 톤 맞춤 */
const TenureListWrap = styled.div`
  max-width: 520px;
`

const TenureList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  border-radius: 14px;
  overflow: hidden;
  background: #fafbfc;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  border: 1px solid #e2e8f0;
`

const TenureRow = styled.li`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 18px;
  border-bottom: 1px solid #e2e8f0;
  min-height: 0;
  &:last-child {
    border-bottom: none;
  }
`

const TenureRowMain = styled.div`
  min-width: 0;
  flex: 1;
`

const TenureRowTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  line-height: 1.4;
  margin-bottom: 4px;
`

const TenureRowMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  line-height: 1.4;
`

const TenureRowMetaItem = styled.span`
  color: inherit;
`

const TenureRowAgeBadge = styled.span`
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
  border-radius: 6px;
  letter-spacing: 0.02em;
`

const TenureRowSub = styled.div`
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  line-height: 1.45;
`

const TenureRowEditBtn = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, color 0.2s;
  &:hover {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.06);
    color: #4f46e5;
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
