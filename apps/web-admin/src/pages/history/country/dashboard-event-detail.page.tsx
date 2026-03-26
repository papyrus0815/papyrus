/**
 * 대시보드 연대표 전용 사건 상세
 * /history/dashboard/events/:eventId (국가 목록과 함께 오른쪽 패널에서 스크롤)
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'

import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { FiEdit2, FiX } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

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
import { RichTextReadView } from '@/shared/ui/rich-text-read-view'
import { PersonDetailPanel } from '@/widgets/person/person-detail-panel/person-detail-panel'

const ARTICLE_MAX_WIDTH = '680px'

const SansFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"

const Page = styled(motion.article)`
  width: 100%;
  padding: 40px 0 64px;
  background: transparent;
  min-height: 100%;
  font-family: ${SansFamily};
`

/** 제목 영역 — 좌우 패딩만, max-width 없음 */
const HeaderArea = styled.div`
  padding: 0 28px;
`

/** 본문 내용 — 폭 제한 + 중앙 정렬 */
const ContentArea = styled.div`
  max-width: ${ARTICLE_MAX_WIDTH};
  margin: 0 auto;
  padding: 0 28px;
`

const Kicker = styled.span`
  display: block;
  font-family: ${SansFamily};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 10px;
`

const BackLink = styled.button`
  font-family: ${SansFamily};
  margin-bottom: 20px;
  padding: 0;
  border: none;
  background: none;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
  }
`

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`

const EditButton = styled.button`
  font-family: ${SansFamily};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
  }
`

const Headline = styled.h1`
  font-family: ${SansFamily};
  font-size: clamp(24px, 4vw, 32px);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 16px;
`

const Byline = styled.p`
  font-family: ${SansFamily};
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
`

const Section = styled.section`
  margin-bottom: 40px;

  &:last-of-type {
    margin-bottom: 0;
  }
`

const SectionTitle = styled.h2`
  font-family: ${SansFamily};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 14px;
`

const SectionTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  ${SectionTitle} {
    margin: 0;
  }
`

/* 연대표 상단 수정 버튼과 동일한 스타일 */
const SectionEditBtn = styled.button`
  font-family: ${SansFamily};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
  }
`

const SectionEditorWrap = styled.div`
  width: 100%;
  min-height: 240px;
  margin-bottom: 12px;
`

const SectionEditActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const SectionSaveBtn = styled.button`
  font-family: ${SansFamily};
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #4f46e5;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover:not(:disabled) {
    background: #4338ca;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const DashboardRichText = styled(RichTextReadView)`
  font-family: ${SansFamily};
`

/** 피해·비용 — 구조화된 필드만 표시(RichText 아님) */
const CasualtiesBlock = styled.div`
  font-family: ${SansFamily};
  font-size: 15px;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text.primary};
  p {
    margin: 0 0 6px;
  }
`

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const Tag = styled.span`
  font-family: ${SansFamily};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 5px 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f9fafb'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 6px;
`

const CountryChip = styled.span<{ $historical?: boolean }>`
  font-family: ${SansFamily};
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 6px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f9fafb'};
  border: 1px solid
    ${(p) => (p.$historical ? '#fef3c7' : p.theme.colors.border.light)};
  color: ${(p) => (p.$historical ? '#b45309' : p.theme.colors.text.tertiary)};
`

const SideBlock = styled.div`
  padding: 18px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  margin-bottom: 0;

  &:last-child {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`

const SideName = styled.div`
  font-family: ${SansFamily};
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 6px;
`

const SideDetail = styled.div`
  font-family: ${SansFamily};
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`

const ImageWrap = styled.figure`
  margin: 28px 0;
  max-width: 100%;

  img {
    width: 100%;
    height: auto;
    display: block;
    background: ${({ theme }) => theme.colors.background.secondary};
  }
`

const Figcaption = styled.figcaption`
  font-family: ${SansFamily};
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: 8px;
  line-height: 1.4;
`

const ImageSource = styled.cite`
  display: block;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 4px;
  font-style: normal;
`

const SubEventBtn = styled.button`
  display: block;
  width: 100%;
  padding: 12px 0;
  text-align: left;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: none;
  font-family: ${SansFamily};
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  transition: color 0.15s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  &:last-child {
    border-bottom: none;
  }
`

const SubEventMeta = styled.span`
  font-family: ${SansFamily};
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 400;
  margin-left: 8px;
`

const MetaNote = styled.p`
  font-family: ${SansFamily};
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin: 28px 0 0;
  padding-top: 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const LoadingWrap = styled.div`
  padding: 80px 32px;
  text-align: center;
  font-family: ${SansFamily};
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ErrorWrap = styled.div`
  padding: 48px 32px;
  font-family: ${SansFamily};
  font-size: 15px;
  color: #c00;
`

const MentionModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.52);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  box-sizing: border-box;
`
const MentionModalPanel = styled(motion.div)`
  position: relative;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(30,30,30,0.85)' : '#ffffff'};
  backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  -webkit-backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  border: ${({ theme }) =>
    theme.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : 'none'};
  border-radius: 24px;
  box-shadow:
    0 32px 64px -16px rgba(0, 0, 0, 0.2),
    0 16px 32px -16px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(0, 0, 0, 0.04);
  width: 100%;
  max-width: 740px;
  height: 68vh;
  min-height: 400px;
  max-height: 78vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`
const MentionModalHeader = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fafbfc'};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`
const MentionModalTitle = styled.span`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`
const MentionModalClose = styled.button`
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#fff'};
  border-radius: 50%;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.background.tertiary};
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  }
  &:active {
    transform: scale(0.97);
  }
`
const MentionModalBody = styled.div`
  overflow: auto;
  flex: 1;
  min-height: 280px;
  padding: 20px 24px 32px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff'};
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: #f8fafc;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`

const TermTooltipOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 999;
  background: transparent;
`
const TermTooltipPopover = styled.div<{ $x: number; $y: number }>`
  position: fixed;
  left: ${({ $x }) => $x}px;
  top: ${({ $y }) => $y}px;
  transform: translate(12px, 12px);
  max-width: 360px;
  padding: 14px 18px;
  background: #fff;
  border-radius: 12px;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(0, 0, 0, 0.06);
  z-index: 1000;
  font-family: ${SansFamily};
  font-size: 13px;
  line-height: 1.5;
  color: #374151;
  strong {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    color: #0d9488;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const DynastyTooltipPopover = styled.div<{ $x: number; $y: number }>`
  position: fixed;
  left: ${({ $x }) => $x}px;
  top: ${({ $y }) => $y}px;
  transform: translate(12px, 12px);
  max-width: 360px;
  padding: 14px 18px;
  background: #fff;
  border-radius: 12px;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(0, 0, 0, 0.06);
  z-index: 1000;
  font-family: ${SansFamily};
  font-size: 13px;
  line-height: 1.5;
  color: #374151;
  strong {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    color: #6d28d9;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export function DashboardEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
  const [dto, setDto] = useState<EventResponseDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
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

  useEffect(() => {
    if (!eventId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    getEventById(eventId)
      .then(setDto)
      .catch((err) =>
        setError(err instanceof Error ? err : new Error(String(err))),
      )
      .finally(() => setLoading(false))
  }, [eventId])

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
      const updated = await getEventById(eventId)
      setDto(updated)
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
