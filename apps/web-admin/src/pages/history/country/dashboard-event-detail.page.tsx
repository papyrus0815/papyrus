/**
 * 대시보드 연대표 전용 사건 상세
 * /history/dashboard/events/:eventId (국가 목록과 함께 오른쪽 패널에서 스크롤)
 */
import React, { useCallback, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'

import { AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { FiEdit2, FiX } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { useFormEntities } from '@/entities/event-form/model'
import { mapEventResponseToHistoricalEvent } from '@/pages/events/utils/event-detail.mapper'
import { formatDateRange } from '@/pages/events/utils/events.utils'
import {
  type EventResponseDto,
  getEventById,
  updateEvent,
} from '@/shared/api/events'
import { getPersonDetailById } from '@/shared/api/persons-detail'
import { getUploadImageUrl, uploadImage } from '@/shared/api/upload'
import {
  useRichTextProseClick,
  useRichTextTooltipEscape,
  type RichTextDynastyTooltipState,
  type RichTextTermTooltipState,
} from '@/shared/hooks/use-rich-text-prose-click'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { PersonDetailPanel } from '@/widgets/person/person-detail-panel/person-detail-panel'

import {
  BackLink,
  Byline,
  CasualtiesBlock,
  ContentArea,
  CountryChip,
  DashboardRichText,
  DynastyTooltipPopover,
  EditButton,
  ErrorWrap,
  Figcaption,
  HeaderArea,
  Headline,
  ImageSource,
  ImageWrap,
  Kicker,
  LoadingWrap,
  MentionModalBody,
  MentionModalClose,
  MentionModalHeader,
  MentionModalOverlay,
  MentionModalPanel,
  MentionModalTitle,
  MetaNote,
  Page,
  Section,
  SectionEditActions,
  SectionEditBtn,
  SectionEditorWrap,
  SectionSaveBtn,
  SectionTitle,
  SectionTitleRow,
  SideBlock,
  SideDetail,
  SideName,
  SubEventBtn,
  SubEventMeta,
  Tag,
  TagRow,
  TermTooltipOverlay,
  TermTooltipPopover,
  TopBar,
  TwoCol,
} from './dashboard-event-detail.styles'


export function DashboardEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const theme = useTheme()
  const isDark = theme.mode === 'dark'

  // 사건 상세 — React Query로 관리 (loading/error/refetch 제공)
  const {
    data: dto,
    isLoading: loading,
    error,
    refetch: refetchDto,
  } = useQuery<EventResponseDto>({
    queryKey: ['event-detail', eventId],
    queryFn: () => getEventById(eventId!),
    enabled: !!eventId,
  })

  const [mentionPersonId, setMentionPersonId] = useState<string | null>(null)
  const [termTooltip, setTermTooltip] =
    useState<RichTextTermTooltipState | null>(null)
  const [dynastyTooltip, setDynastyTooltip] =
    useState<RichTextDynastyTooltipState | null>(null)
  type EditingSection =
    | { type: 'description' }
    | { type: 'background' }
    | { type: 'aftermath' }
    | { type: 'section'; id: string }
    | { type: 'section-new' }
  const [editingSection, setEditingSection] = useState<EditingSection | null>(
    null,
  )
  const [draftValue, setDraftValue] = useState('')
  const [draftSectionTitle, setDraftSectionTitle] = useState('')
  const [savingSection, setSavingSection] = useState(false)

  const {
    availablePersons,
    availableCountries,
    availableHistoricalCountries,
    availableEvents,
    availableMilitaryUnits,
    availableDynasties,
    availablePoliticalParties,
    isLoading: entitiesLoading,
    refetch: refetchEntities,
  } = useFormEntities()

  const mentionEntities = useMemo(
    () => ({
      persons: availablePersons,
      events: availableEvents,
      countries: availableCountries,
      historicalCountries: availableHistoricalCountries,
      militaryUnits: availableMilitaryUnits ?? [],
      dynasties: availableDynasties ?? [],
      politicalParties: availablePoliticalParties ?? [],
    }),
    [
      availablePersons,
      availableEvents,
      availableCountries,
      availableHistoricalCountries,
      availableMilitaryUnits,
      availableDynasties,
      availablePoliticalParties,
    ],
  )

  /** 사건 본문 에디터 이미지 — 미전달 시 툴바 이미지 버튼이 비활성·금지 커서로 보임 */
  const handleRichTextImageUpload = useCallback(async (file: File) => {
    try {
      const result = await uploadImage(file, 'events')
      return getUploadImageUrl(result.url) || result.url
    } catch {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    }
  }, [])

  const { data: mentionPerson } = useQuery({
    queryKey: ['person-detail', mentionPersonId],
    queryFn: () => getPersonDetailById(mentionPersonId!),
    enabled: !!mentionPersonId,
  })
  const mentionPersonName = mentionPerson
    ? getPersonDisplayName(mentionPerson)
    : ''

  const { handleProseClick } = useRichTextProseClick({
    navigate,
    onPersonClick: setMentionPersonId,
    setTermTooltip,
    setDynastyTooltip,
  })

  useRichTextTooltipEscape(
    !!termTooltip,
    !!dynastyTooltip,
    () => setTermTooltip(null),
    () => setDynastyTooltip(null),
  )

  const startEditSection = useCallback(
    (key: EditingSection, initialValue: string, initialTitle?: string) => {
      setEditingSection(key)
      setDraftValue(initialValue ?? '')
      setDraftSectionTitle(
        initialTitle ?? (key.type === 'section-new' ? 'Part 1' : ''),
      )
    },
    [],
  )
  const cancelEditSection = useCallback(() => {
    setEditingSection(null)
    setDraftValue('')
    setDraftSectionTitle('')
  }, [])
  const saveEditSection = useCallback(async () => {
    if (!eventId || !dto || editingSection === null) return
    setSavingSection(true)
    try {
      if (editingSection.type === 'description') {
        await updateEvent(eventId, { description: draftValue || undefined })
      } else if (editingSection.type === 'background') {
        await updateEvent(eventId, { background: draftValue || undefined })
      } else if (editingSection.type === 'aftermath') {
        await updateEvent(eventId, { aftermath: draftValue || undefined })
      } else if (editingSection.type === 'section') {
        const sections = (dto.eventSections ?? [])
          .slice()
          .sort(
            (left: { order: number }, right: { order: number }) =>
              left.order - right.order,
          )
        const next = sections.map(
          (sectionRow: {
            id: string
            title: string
            content: string
            order: number
          }) =>
            sectionRow.id === editingSection.id
              ? {
                  title: sectionRow.title,
                  content: draftValue,
                  order: sectionRow.order,
                }
              : {
                  title: sectionRow.title,
                  content: sectionRow.content ?? '',
                  order: sectionRow.order,
                },
        )
        await updateEvent(eventId, { eventSections: next })
      } else if (editingSection.type === 'section-new') {
        const sections = (dto.eventSections ?? [])
          .slice()
          .sort(
            (left: { order: number }, right: { order: number }) =>
              left.order - right.order,
          )
        const next = sections.map(
          (sectionRow: {
            title: string
            content: string
            order: number
            sectionType?: string
          }) => ({
            title: sectionRow.title,
            content: sectionRow.content ?? '',
            order: sectionRow.order,
            sectionType: sectionRow.sectionType ?? 'content',
          }),
        )
        next.push({
          title: draftSectionTitle.trim() || 'Part 1',
          content: draftValue,
          order: sections.length,
          sectionType: 'content',
        })
        await updateEvent(eventId, { eventSections: next })
      }
      await refetchDto()
      setEditingSection(null)
      setDraftValue('')
      setDraftSectionTitle('')
      toast.success('저장되었습니다.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSavingSection(false)
    }
  }, [eventId, dto, editingSection, draftValue])

  const goToList = () => navigate(pathKeys.history.dashboardEvents())
  const goToEvent = (id: string) =>
    navigate(pathKeys.history.dashboardEventDetail(id))

  const mapped = dto ? mapEventResponseToHistoricalEvent(dto) : null
  const dateLabel =
    mapped?.startDate &&
    (mapped.endDate
      ? formatDateRange(
          mapped.startDate,
          mapped.endDate,
          mapped.startDatePrecision,
          mapped.endDatePrecision,
        )
      : formatDateRange(mapped.startDate, undefined, mapped.startDatePrecision))
  const heroImage =
    dto?.eventImages?.find((i: { isPrimary?: boolean }) => i.isPrimary)
      ?.imageUrl ??
    dto?.thumbnail ??
    dto?.eventImages?.[0]?.imageUrl

  if (loading) {
    return (
      <Page
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <LoadingWrap>사건 정보를 불러오는 중…</LoadingWrap>
      </Page>
    )
  }

  if (error || !dto || !mapped) {
    return (
      <Page
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <ErrorWrap>{error?.message ?? '사건을 찾을 수 없습니다.'}</ErrorWrap>
        <BackLink type="button" onClick={goToList}>
          ← 연대표 목록으로
        </BackLink>
      </Page>
    )
  }

  const hasBelligerents =
    dto.belligerents?.sides && dto.belligerents.sides.length > 0
  const casualtiesObj =
    dto.casualties && typeof dto.casualties === 'object'
      ? (dto.casualties as Record<string, unknown>)
      : null
  const eventSections = (dto.eventSections ?? [])
    .slice()
    .sort(
      (left: { order: number }, right: { order: number }) =>
        left.order - right.order,
    )
  // 상단 히어로에 이미 쓴 이미지는 갤러리에서 제외 (한 장만 있을 때 중복 표시 방지)
  const galleryWithoutHero =
    heroImage && mapped.visuals.gallery.length > 0
      ? mapped.visuals.gallery.filter(
          (galleryItem) => galleryItem.url !== heroImage,
        )
      : mapped.visuals.gallery

  const goToEdit = () => navigate(pathKeys.history.dashboardEventEdit(dto.id))

  return (
    <Page
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <HeaderArea>
        <TopBar>
          <BackLink type="button" onClick={goToList}>
            ← 연대표 목록
          </BackLink>
          <EditButton type="button" onClick={goToEdit} aria-label="사건 수정">
            <FiEdit2 size={14} />
            수정
          </EditButton>
        </TopBar>

        {mapped.category && <Kicker>{mapped.category}</Kicker>}
        <Headline>{mapped.title}</Headline>
        <Byline>
          {dateLabel && <span>{dateLabel}</span>}
          {mapped.location && (
            <>
              {dateLabel && ' · '}
              <span>{mapped.location}</span>
            </>
          )}
        </Byline>
      </HeaderArea>

      <ContentArea>
        {heroImage && (
          <ImageWrap>
            <img src={heroImage} alt="" />
          </ImageWrap>
        )}

        <Section>
          <SectionTitleRow>
            <SectionTitle>개요</SectionTitle>
            {editingSection?.type !== 'description' && (
              <SectionEditBtn
                type="button"
                onClick={() =>
                  startEditSection(
                    { type: 'description' },
                    dto?.description ?? '',
                  )
                }
              >
                <FiEdit2 size={14} />
                {mapped.description ? '수정' : '추가'}
              </SectionEditBtn>
            )}
          </SectionTitleRow>
          {editingSection?.type === 'description' ? (
            <>
              <SectionEditorWrap>
                <RichTextEditor
                  value={draftValue}
                  onChange={setDraftValue}
                  placeholder="개요를 입력하세요..."
                  mentionEntities={mentionEntities}
                  mentionEntitiesLoading={entitiesLoading}
                  onEntityModalOpen={refetchEntities}
                  onImageUpload={handleRichTextImageUpload}
                  documentScope={
                    eventId ? { type: 'event', id: eventId } : undefined
                  }
                />
              </SectionEditorWrap>
              <SectionEditActions>
                <SectionEditBtn
                  type="button"
                  onClick={cancelEditSection}
                  disabled={savingSection}
                >
                  취소
                </SectionEditBtn>
                <SectionSaveBtn
                  type="button"
                  onClick={saveEditSection}
                  disabled={savingSection}
                >
                  {savingSection ? '저장 중…' : '저장'}
                </SectionSaveBtn>
              </SectionEditActions>
            </>
          ) : (
            mapped.description && (
              <div onClick={handleProseClick} role="presentation">
                <DashboardRichText html={mapped.description ?? ''} />
              </div>
            )
          )}
        </Section>

        {/* 본문: 없을 때 추가 블록, 있을 때 목록 + 수정 */}
        {(eventSections.length === 0 ||
          editingSection?.type === 'section-new') && (
          <Section>
            <SectionTitleRow>
              <SectionTitle>본문</SectionTitle>
              {editingSection?.type !== 'section-new' && (
                <SectionEditBtn
                  type="button"
                  onClick={() =>
                    startEditSection({ type: 'section-new' }, '', 'Part 1')
                  }
                >
                  <FiEdit2 size={14} />
                  본문 (제목과 내용) 추가
                </SectionEditBtn>
              )}
            </SectionTitleRow>
            {editingSection?.type === 'section-new' ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: theme.colors.text.primary,
                      marginBottom: 6,
                    }}
                  >
                    제목
                  </label>
                  <input
                    type="text"
                    value={draftSectionTitle}
                    onChange={(e) => setDraftSectionTitle(e.target.value)}
                    placeholder="예: Part 1"
                    style={{
                      width: '100%',
                      maxWidth: 400,
                      padding: '10px 12px',
                      fontSize: 14,
                      border: `1px solid ${theme.colors.border.default}`,
                      borderRadius: 8,
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                      color: theme.colors.text.primary,
                    }}
                  />
                </div>
                <SectionEditorWrap>
                  <RichTextEditor
                    value={draftValue}
                    onChange={setDraftValue}
                    placeholder="본문 내용을 입력하세요..."
                    mentionEntities={mentionEntities}
                  mentionEntitiesLoading={entitiesLoading}
                    onEntityModalOpen={refetchEntities}
                    onImageUpload={handleRichTextImageUpload}
                    documentScope={
                      eventId ? { type: 'event', id: eventId } : undefined
                    }
                  />
                </SectionEditorWrap>
                <SectionEditActions>
                  <SectionEditBtn
                    type="button"
                    onClick={cancelEditSection}
                    disabled={savingSection}
                  >
                    취소
                  </SectionEditBtn>
                  <SectionSaveBtn
                    type="button"
                    onClick={saveEditSection}
                    disabled={savingSection}
                  >
                    {savingSection ? '저장 중…' : '저장'}
                  </SectionSaveBtn>
                </SectionEditActions>
              </>
            ) : eventSections.length === 0 ? (
              <p
                style={{
                  fontSize: 14,
                  color: theme.colors.text.secondary,
                  margin: 0,
                }}
              >
                본문이 없습니다. 위 버튼으로 제목과 내용을 추가하세요.
              </p>
            ) : null}
          </Section>
        )}

        {eventSections.length > 0 &&
          eventSections.map(
            (sec: { id: string; title?: string; content?: string }) => (
              <Section key={sec.id}>
                <SectionTitleRow>
                  <SectionTitle>{sec.title}</SectionTitle>
                  {editingSection?.type !== 'section' ||
                  editingSection?.id !== sec.id ? (
                    <SectionEditBtn
                      type="button"
                      onClick={() =>
                        startEditSection(
                          { type: 'section', id: sec.id },
                          sec.content ?? '',
                        )
                      }
                    >
                      <FiEdit2 size={14} />
                      수정
                    </SectionEditBtn>
                  ) : null}
                </SectionTitleRow>
                {editingSection?.type === 'section' &&
                editingSection.id === sec.id ? (
                  <>
                    <SectionEditorWrap>
                      <RichTextEditor
                        value={draftValue}
                        onChange={setDraftValue}
                        placeholder="본문 내용을 입력하세요..."
                        mentionEntities={mentionEntities}
                  mentionEntitiesLoading={entitiesLoading}
                        onEntityModalOpen={refetchEntities}
                        onImageUpload={handleRichTextImageUpload}
                        documentScope={
                          eventId ? { type: 'event', id: eventId } : undefined
                        }
                      />
                    </SectionEditorWrap>
                    <SectionEditActions>
                      <SectionEditBtn
                        type="button"
                        onClick={cancelEditSection}
                        disabled={savingSection}
                      >
                        취소
                      </SectionEditBtn>
                      <SectionSaveBtn
                        type="button"
                        onClick={saveEditSection}
                        disabled={savingSection}
                      >
                        {savingSection ? '저장 중…' : '저장'}
                      </SectionSaveBtn>
                    </SectionEditActions>
                  </>
                ) : (
                  <div onClick={handleProseClick} role="presentation">
                    <DashboardRichText html={sec.content ?? ''} />
                  </div>
                )}
              </Section>
            ),
          )}

        {(mapped.background ||
          mapped.aftermath ||
          editingSection?.type === 'background' ||
          editingSection?.type === 'aftermath') && (
          <TwoCol>
            <Section>
              <SectionTitleRow>
                <SectionTitle>배경</SectionTitle>
                {editingSection?.type !== 'background' && (
                  <SectionEditBtn
                    type="button"
                    onClick={() =>
                      startEditSection(
                        { type: 'background' },
                        dto?.background ?? '',
                      )
                    }
                  >
                    <FiEdit2 size={14} />
                    {mapped.background ? '수정' : '추가'}
                  </SectionEditBtn>
                )}
              </SectionTitleRow>
              {editingSection?.type === 'background' ? (
                <>
                  <SectionEditorWrap>
                    <RichTextEditor
                      value={draftValue}
                      onChange={setDraftValue}
                      placeholder="배경을 입력하세요..."
                      mentionEntities={mentionEntities}
                  mentionEntitiesLoading={entitiesLoading}
                      onEntityModalOpen={refetchEntities}
                      onImageUpload={handleRichTextImageUpload}
                      documentScope={
                        eventId ? { type: 'event', id: eventId } : undefined
                      }
                    />
                  </SectionEditorWrap>
                  <SectionEditActions>
                    <SectionEditBtn
                      type="button"
                      onClick={cancelEditSection}
                      disabled={savingSection}
                    >
                      취소
                    </SectionEditBtn>
                    <SectionSaveBtn
                      type="button"
                      onClick={saveEditSection}
                      disabled={savingSection}
                    >
                      {savingSection ? '저장 중…' : '저장'}
                    </SectionSaveBtn>
                  </SectionEditActions>
                </>
              ) : (
                mapped.background && (
                  <div onClick={handleProseClick} role="presentation">
                    <DashboardRichText html={mapped.background ?? ''} />
                  </div>
                )
              )}
            </Section>
            <Section>
              <SectionTitleRow>
                <SectionTitle>여파</SectionTitle>
                {editingSection?.type !== 'aftermath' && (
                  <SectionEditBtn
                    type="button"
                    onClick={() =>
                      startEditSection(
                        { type: 'aftermath' },
                        dto?.aftermath ?? '',
                      )
                    }
                  >
                    <FiEdit2 size={14} />
                    {mapped.aftermath ? '수정' : '추가'}
                  </SectionEditBtn>
                )}
              </SectionTitleRow>
              {editingSection?.type === 'aftermath' ? (
                <>
                  <SectionEditorWrap>
                    <RichTextEditor
                      value={draftValue}
                      onChange={setDraftValue}
                      placeholder="여파를 입력하세요..."
                      mentionEntities={mentionEntities}
                  mentionEntitiesLoading={entitiesLoading}
                      onEntityModalOpen={refetchEntities}
                      onImageUpload={handleRichTextImageUpload}
                      documentScope={
                        eventId ? { type: 'event', id: eventId } : undefined
                      }
                    />
                  </SectionEditorWrap>
                  <SectionEditActions>
                    <SectionEditBtn
                      type="button"
                      onClick={cancelEditSection}
                      disabled={savingSection}
                    >
                      취소
                    </SectionEditBtn>
                    <SectionSaveBtn
                      type="button"
                      onClick={saveEditSection}
                      disabled={savingSection}
                    >
                      {savingSection ? '저장 중…' : '저장'}
                    </SectionSaveBtn>
                  </SectionEditActions>
                </>
              ) : (
                mapped.aftermath && (
                  <div onClick={handleProseClick} role="presentation">
                    <DashboardRichText html={mapped.aftermath ?? ''} />
                  </div>
                )
              )}
            </Section>
          </TwoCol>
        )}

        {hasBelligerents && (
          <Section>
            <SectionTitle>교전 세력</SectionTitle>
            {dto.belligerents!.sides.map(
              (
                side: {
                  name?: string
                  commander?: string
                  forces?: string
                  description?: string
                  countries?: unknown[]
                },
                i: number,
              ) => (
                <SideBlock key={i}>
                  <SideName>{side.name}</SideName>
                  {side.commander && (
                    <SideDetail>지휘: {side.commander}</SideDetail>
                  )}
                  {side.forces && <SideDetail>병력: {side.forces}</SideDetail>}
                  {side.description && (
                    <SideDetail>{side.description}</SideDetail>
                  )}
                  {(side.countries?.length ?? 0) > 0 && (
                    <SideDetail>
                      참여:{' '}
                      {([] as unknown[])
                        .concat(side.countries ?? [])
                        .map((countryItem: unknown) => {
                          if (
                            typeof countryItem === 'object' &&
                            countryItem !== null &&
                            'name' in countryItem &&
                            typeof (countryItem as { name: unknown }).name ===
                              'string'
                          ) {
                            return (countryItem as { name: string }).name
                          }
                          return String(countryItem)
                        })
                        .join(', ')}
                    </SideDetail>
                  )}
                </SideBlock>
              ),
            )}
          </Section>
        )}

        {(casualtiesObj || dto.warCost) && (
          <Section>
            <SectionTitle>피해·비용</SectionTitle>
            <CasualtiesBlock>
              {casualtiesObj &&
                Object.entries(casualtiesObj).map(([key, val]) =>
                  val != null && String(val).trim() !== '' ? (
                    <p key={key} style={{ marginBottom: 6 }}>
                      <strong>{key.replace(/([A-Z])/g, ' $1').trim()}: </strong>
                      {typeof val === 'object'
                        ? JSON.stringify(val)
                        : String(val)}
                    </p>
                  ) : null,
                )}
              {dto.warCost && (
                <p style={{ marginBottom: 0 }}>
                  <strong>전쟁 비용:</strong> {dto.warCost}
                </p>
              )}
            </CasualtiesBlock>
          </Section>
        )}

        {(mapped.relatedCountries?.length ||
          mapped.relatedHistoricalCountries?.length) && (
          <Section>
            <SectionTitle>관련 국가</SectionTitle>
            <TagRow>
              {mapped.relatedCountries?.map((country) => (
                <CountryChip key={country.id}>
                  {country.flagEmoji ? `${country.flagEmoji} ` : ''}
                  {country.name}
                </CountryChip>
              ))}
              {mapped.relatedHistoricalCountries?.map((histCountry) => (
                <CountryChip key={histCountry.id} $historical>
                  {histCountry.name}
                </CountryChip>
              ))}
            </TagRow>
          </Section>
        )}

        {dto.parentEvent && (
          <Section>
            <SectionTitle>상위 사건</SectionTitle>
            <SubEventBtn
              type="button"
              onClick={() => goToEvent(dto.parentEvent!.id)}
            >
              {dto.parentEvent.title}
              {dto.parentEvent.startDate && (
                <SubEventMeta>
                  {formatDateRange(
                    dto.parentEvent.startDate,
                    dto.parentEvent.endDate ?? undefined,
                    dto.parentEvent.startDatePrecision,
                    dto.parentEvent.endDatePrecision,
                  )}
                </SubEventMeta>
              )}
            </SubEventBtn>
          </Section>
        )}

        {dto.childEvents && dto.childEvents.length > 0 && (
          <Section>
            <SectionTitle>하위 사건</SectionTitle>
            {dto.childEvents.map(
              (child: {
                id: string
                title?: string
                startDate?: string
                endDate?: string
                startDatePrecision?: string
                endDatePrecision?: string
              }) => (
                <SubEventBtn
                  key={child.id}
                  type="button"
                  onClick={() => goToEvent(child.id)}
                >
                  {child.title}
                  {child.startDate && (
                    <SubEventMeta>
                      {formatDateRange(
                        child.startDate,
                        child.endDate ?? undefined,
                        child.startDatePrecision,
                        child.endDatePrecision,
                      )}
                    </SubEventMeta>
                  )}
                </SubEventBtn>
              ),
            )}
          </Section>
        )}

        {mapped.keywords && mapped.keywords.length > 0 && (
          <Section>
            <SectionTitle>키워드</SectionTitle>
            <TagRow>
              {mapped.keywords.map((keyword) => (
                <Tag key={keyword}>{keyword}</Tag>
              ))}
            </TagRow>
          </Section>
        )}

        {galleryWithoutHero.length > 0 && (
          <Section>
            <SectionTitle>이미지</SectionTitle>
            {galleryWithoutHero.map((galleryItem) => (
              <ImageWrap key={galleryItem.id}>
                <img src={galleryItem.url} alt={galleryItem.title} />
                <Figcaption>
                  {galleryItem.caption || galleryItem.title}
                  {galleryItem.source && (
                    <ImageSource>{galleryItem.source}</ImageSource>
                  )}
                </Figcaption>
              </ImageWrap>
            ))}
          </Section>
        )}

        {(dto.updatedAt || dto.createdAt) && (
          <MetaNote>
            {dto.updatedAt &&
              `수정: ${new Date(dto.updatedAt).toLocaleString('ko-KR')}`}
            {dto.createdAt && dto.updatedAt && ' · '}
            {dto.createdAt &&
              `등록: ${new Date(dto.createdAt).toLocaleString('ko-KR')}`}
          </MetaNote>
        )}
      </ContentArea>

      <AnimatePresence>
        {mentionPersonId && (
          <MentionModalOverlay
            key="mention-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setMentionPersonId(null)}
            role="presentation"
          >
            <MentionModalPanel
              key="mention-modal-panel"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <MentionModalHeader>
                <MentionModalTitle title={mentionPersonName}>
                  {mentionPersonName || '인물'}
                </MentionModalTitle>
                <MentionModalClose
                  type="button"
                  onClick={() => setMentionPersonId(null)}
                  aria-label="닫기"
                >
                  <FiX size={20} strokeWidth={2.5} />
                </MentionModalClose>
              </MentionModalHeader>
              <MentionModalBody>
                <PersonDetailPanel
                  personId={mentionPersonId}
                  onClose={() => setMentionPersonId(null)}
                  onEdit={() => setMentionPersonId(null)}
                  hideHeaderActions
                  embedInModal
                  onLinkedPersonClick={setMentionPersonId}
                />
              </MentionModalBody>
            </MentionModalPanel>
          </MentionModalOverlay>
        )}

        {termTooltip && (
          <TermTooltipOverlay
            role="presentation"
            onClick={() => setTermTooltip(null)}
          >
            <TermTooltipPopover
              $x={termTooltip.x}
              $y={termTooltip.y}
              onClick={(e) => e.stopPropagation()}
            >
              <strong>{termTooltip.name}</strong>
              <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {termTooltip.description === null
                  ? ' 로딩…'
                  : termTooltip.description || '(설명 없음)'}
              </span>
            </TermTooltipPopover>
          </TermTooltipOverlay>
        )}

        {dynastyTooltip && (
          <TermTooltipOverlay
            role="presentation"
            onClick={() => setDynastyTooltip(null)}
          >
            <DynastyTooltipPopover
              $x={dynastyTooltip.x}
              $y={dynastyTooltip.y}
              onClick={(e) => e.stopPropagation()}
            >
              <strong>가문 · {dynastyTooltip.name}</strong>
              <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {dynastyTooltip.description === null
                  ? ' 로딩…'
                  : dynastyTooltip.description || '(설명 없음)'}
              </span>
            </DynastyTooltipPopover>
          </TermTooltipOverlay>
        )}
      </AnimatePresence>
    </Page>
  )
}
