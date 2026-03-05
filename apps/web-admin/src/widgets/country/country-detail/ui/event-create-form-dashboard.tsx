/**
 * 사건 등록/수정 폼 — 공용 register-form-layout + 탭(기본 정보 / 관계 / 본문)
 */
import React, { useEffect, useState, useMemo } from 'react'
import { FiArrowLeft, FiCalendar, FiChevronDown, FiFileText, FiInfo, FiLink, FiPlus, FiX } from 'react-icons/fi'
import { toast } from 'react-hot-toast'
import styled from 'styled-components'
import { useFormEntities } from '@/entities/event-form/model'
import type { EventSection } from '@/features/event-create/model/use-event-basic-info'
import { buildEventSubmitData, extractMentions, validateBasicInfo } from '@/features/event-create/lib'
import { useBasicInfoForm } from '@/features/event-form/model'
import { useRelationshipsForm } from '@/features/event-form/model/useRelationshipsForm'
import { createEvent, getEventById, getEventsByParentId, updateEvent } from '@/shared/api/events'
import { getUploadImageUrl, uploadImage, validateImageFile } from '@/shared/api/upload'
import {
  BackButton,
  DateFieldBtn,
  DateFieldsRow,
  FieldControl,
  FieldLabel,
  FieldRow,
  FormHeaderTitle,
  FormRows,
  Input,
  Required,
  SubmitButton,
  TabButton,
  TabNavigation,
} from '@/shared/ui/register-form-layout'
import { DatePickerModal } from '@/shared/ui/date-picker'
import { AdvancedCountrySelectModal } from '@/shared/ui/advanced-country-select-modal/AdvancedCountrySelectModal'
import { PersonSelectModal } from '@/shared/ui/person-select-modal'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/RichTextEditor'
import { BORDER_COLOR, FOCUS_COLOR } from '@/shared/ui/register-form-layout'

const CategoryChip = styled.button<{ $active?: boolean }>`
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  color: ${(p) => (p.$active ? '#fff' : '#475569')};
  background: ${(p) => (p.$active ? '#6366f1' : '#f1f5f9')};
  border: 1px solid ${(p) => (p.$active ? '#6366f1' : BORDER_COLOR)};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: ${(p) => (p.$active ? '#4f46e5' : '#e2e8f0')};
  }
`

const InputShort = styled(Input)`
  max-width: 280px;
`

const DateFieldsRowWide = styled(DateFieldsRow)`
  max-width: 560px;
  grid-template-columns: 1fr 1fr;
  & > button {
    min-width: 200px;
    white-space: nowrap;
  }
`

const TextArea = styled.textarea`
  width: 100%;
  max-width: 100%;
  min-height: 140px;
  padding: 12px 16px;
  font-size: 14px;
  border: 1px solid ${BORDER_COLOR};
  border-radius: 12px;
  resize: vertical;
  &:focus {
    outline: none;
    border-color: ${FOCUS_COLOR};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
`

const SelectInput = styled.select`
  width: 100%;
  max-width: 380px;
  padding: 12px 16px;
  font-size: 14px;
  color: #111827;
  background: #fff;
  border: 1px solid ${BORDER_COLOR};
  border-radius: 12px;
  outline: none;
  &:focus {
    border-color: ${FOCUS_COLOR};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
`

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f1f5f9;
  border-radius: 10px;
  font-size: 13px;
  color: #374151;
`

const ChipRemoveBtn = styled.button`
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  color: #64748b;
  font-size: 14px;
  &:hover {
    color: #dc2626;
  }
`

const ContentTabWrap = styled.div`
  width: 100%;
  min-height: 0;
`

const DashboardFormWrap = styled.div`
  background: #ffffff;
  border-radius: 0;
  overflow: hidden;
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`

const FormBodyScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px 28px 32px;
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: #f8fafc;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 3px;
  }
`

const DashboardFormHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 28px;
  background: #fff;
  border-bottom: 1px solid #f1f5f9;
  flex-shrink: 0;
  flex-wrap: wrap;
`

const AddSectionBtn = styled.button`
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 12px;
  cursor: pointer;
  &:hover {
    background: #e0e7ff;
  }
`

const RemoveSectionBtn = styled.button<{ $disabled?: boolean }>`
  flex-shrink: 0;
  min-width: 72px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  color: ${(p) => (p.$disabled ? '#9ca3af' : '#64748b')};
  background: ${(p) => (p.$disabled ? '#f3f4f6' : '#f1f5f9')};
  border: none;
  border-radius: 10px;
  cursor: ${(p) => (p.$disabled ? 'not-allowed' : 'pointer')};
  transition: color 0.15s, background 0.15s;
  &:hover {
    color: ${(p) => (p.$disabled ? '#9ca3af' : '#dc2626')};
    background: ${(p) => (p.$disabled ? '#f3f4f6' : '#fee2e2')};
  }
`

const EditorWrap = styled.div`
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 200px;
`

/** 본문 섹션 내용용: 가로 전체 사용(FieldControl max-width 제한 없음) */
const SectionContentControl = styled.div`
  width: 100%;
  max-width: 100%;
  min-width: 0;
`

const ImageGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
  max-width: 520px;
`

const ImageCard = styled.div<{ $isPrimary?: boolean }>`
  position: relative;
  width: 120px;
  height: 90px;
  border-radius: 14px;
  overflow: hidden;
  background: #f1f5f9;
  border: 2px solid ${(p) => (p.$isPrimary ? '#6366f1' : BORDER_COLOR)};
  box-shadow: ${(p) => (p.$isPrimary ? '0 0 0 1px rgba(99,102,241,0.2)' : 'none')};
`
const ImageCardImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`
const ImageCardRemove = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 8px;
  background: rgba(0,0,0,0.55);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
  &:hover {
    background: #dc2626;
  }
`
const ImagePrimaryBadge = styled.span`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 6px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(transparent, rgba(99,102,241,0.9));
  text-align: center;
`
const ImageAddBtn = styled.label`
  width: 120px;
  height: 90px;
  border-radius: 14px;
  border: 2px dashed rgba(99,102,241,0.35);
  background: #fafbff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #6366f1;
  font-size: 12px;
  font-weight: 600;
  transition: background 0.2s, border-color 0.2s;
  &:hover {
    background: #eef2ff;
    border-color: #6366f1;
  }
  input { display: none; }
  svg { flex-shrink: 0; }
`

const CategoryGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  max-width: 480px;
`

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`
const ModalPanel = styled.div`
  background: #fff;
  border-radius: 20px;
  border: 1px solid ${BORDER_COLOR};
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`
const ModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: space-between;
`
const ModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
`
const ModalCloseBtn = styled.button`
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: #64748b;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { background: #f1f5f9; color: #475569; }
`
const ModalBody = styled.div`
  padding: 16px 24px 24px;
  overflow-y: auto;
`
const EventListBtn = styled.button`
  width: 100%;
  padding: 12px 16px;
  text-align: left;
  font-size: 14px;
  color: #111827;
  background: #fff;
  border: 1px solid ${BORDER_COLOR};
  border-radius: 12px;
  cursor: pointer;
  margin-bottom: 8px;
  transition: background 0.2s;
  &:hover {
    background: #f8fafc;
    border-color: #c7d2fe;
  }
`

const CountryChip = styled(Chip)`
  margin: 0;
`

function nextSectionId(sections: EventSection[]): string {
  const nums = sections.map((s) => parseInt(s.id, 10)).filter((n) => !Number.isNaN(n))
  return String((nums.length ? Math.max(...nums) : 0) + 1)
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr || !dateStr.trim()) return '날짜 선택'
  const d = dateStr.trim()
  const match = d.match(/^(-?\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!match) return d
  const [, y, m, day] = match
  const year = parseInt(y!, 10)
  const prefix = year < 0 ? `BC ${Math.abs(year)}` : `${year}년`
  const month = parseInt(m!, 10)
  const date = parseInt(day!, 10)
  return `${prefix} ${month}월 ${date}일`
}

export interface EventCreateFormDashboardProps {
  onBack: () => void
  onSuccess: () => void
  /** 수정 모드: 전달 시 사건 로드 후 수정 폼으로 동작 */
  eventId?: string | null
}

export function EventCreateFormDashboard({
  onBack,
  onSuccess,
  eventId: editEventId,
}: EventCreateFormDashboardProps) {
  const isEditMode = Boolean(editEventId)
  const {
    dbCategories,
    availableCountries,
    availableHistoricalCountries,
    availableEvents,
    availablePersons,
    availableMilitaryUnits,
  } = useFormEntities()
  const [showCountryModal, setShowCountryModal] = useState(false)
  const [showStartDateModal, setShowStartDateModal] = useState(false)
  const [showEndDateModal, setShowEndDateModal] = useState(false)
  const [showParentEventModal, setShowParentEventModal] = useState(false)
  const [showRelatedPersonModal, setShowRelatedPersonModal] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'content' | 'relations'>('basic')
  const [childEventIds, setChildEventIds] = useState<string[]>([])
  const [eventImages, setEventImages] = useState<Array<{ imageUrl: string; caption?: string; order: number; isPrimary: boolean }>>([])
  const [imageUploading, setImageUploading] = useState(false)
  const [parentEventSearch, setParentEventSearch] = useState('')
  const [sections, setSections] = useState<EventSection[]>(() => [
    { id: '1', title: 'Part 1', content: '', mentions: [] },
  ])
  const [isLoadingEvent, setIsLoadingEvent] = useState(isEditMode)
  /** 수정 시 API에서 받은 연관 국가 이름 (availableCountries 로드 전에도 표시용) */
  const [loadedRelatedCountryDisplay, setLoadedRelatedCountryDisplay] = useState<
    Array<{ id: string; name: string; isHistorical: boolean }>
  >([])

  const {
    title,
    setTitle,
    description,
    setDescription,
    startDate,
    setStartDate,
    startTime,
    setStartTime,
    endDate,
    setEndDate,
    endTime,
    setEndTime,
    category,
    setCategory,
    thumbnail,
    setThumbnail,
    location,
    setLocation,
    relatedCountryIds,
    setRelatedCountryIds,
    relatedHistoricalCountryIds,
    setRelatedHistoricalCountryIds,
    tags,
    setKeywords,
    isValid,
    getDateError,
  } = useBasicInfoForm()

  const rel = useRelationshipsForm(availableEvents, availablePersons)
  const dateError = getDateError()

  useEffect(() => {
    if (!editEventId) {
      setLoadedRelatedCountryDisplay([])
      return
    }
    let cancelled = false
    const load = async () => {
      setIsLoadingEvent(true)
      try {
        const event = await getEventById(editEventId)
        if (cancelled) return

        setTitle(event.title ?? '')
        setDescription(event.description ?? '')
        setLocation(event.location ?? '')

        if (event.startDate) {
          const d = String(event.startDate).split('T')[0]
          setStartDate(d)
          const dt = new Date(event.startDate)
          if (!isNaN(dt.getTime()) && (dt.getHours() !== 0 || dt.getMinutes() !== 0)) {
            setStartTime(`${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`)
          }
        }

        const endDateStr =
          event.endDate == null || event.endDate === ''
            ? ''
            : typeof event.endDate === 'string'
              ? event.endDate.includes('T')
                ? event.endDate.split('T')[0]
                : event.endDate
              : (event.endDate as Date)?.toISOString?.()?.slice(0, 10) ?? ''
        setEndDate(endDateStr)
        if (event.endDate) {
          const dt = new Date(event.endDate)
          if (!isNaN(dt.getTime()) && (dt.getHours() !== 0 || dt.getMinutes() !== 0)) {
            setEndTime(`${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`)
          }
        }

        const categoryId = (event as { category?: { id: string } }).category?.id ?? event.categoryId
        if (categoryId != null && String(categoryId) !== '') setCategory(String(categoryId))

        if (event.keywords?.length) setKeywords(event.keywords)

        let modernIds: string[] = Array.isArray(event.relatedCountryIds) ? event.relatedCountryIds.map(String) : (event.relatedCountries?.map((c: { id: string }) => String(c.id)) ?? [])
        let historicalIds: string[] = Array.isArray(event.relatedHistoricalCountryIds) ? event.relatedHistoricalCountryIds.map(String) : (event.relatedHistoricalCountries?.map((c: { id: string }) => String(c.id)) ?? [])
        const countryRels = (event as { countryRelations?: Array<{ countryId?: string; historicalCountryId?: string }> }).countryRelations
        if (countryRels?.length) {
          const fromRelsModern = countryRels.map((r) => r.countryId).filter(Boolean) as string[]
          const fromRelsHistorical = countryRels.map((r) => r.historicalCountryId).filter(Boolean) as string[]
          modernIds = [...new Set([...modernIds, ...fromRelsModern])]
          historicalIds = [...new Set([...historicalIds, ...fromRelsHistorical])]
        }
        setRelatedCountryIds(modernIds)
        setRelatedHistoricalCountryIds(historicalIds)

        const loadedDisplay: Array<{ id: string; name: string; isHistorical: boolean }> = []
        ;(event.relatedCountries ?? []).forEach((c: { id: string; name?: string }) =>
          loadedDisplay.push({ id: String(c.id), name: (c as { name?: string }).name ?? String(c.id), isHistorical: false }),
        )
        ;(event.relatedHistoricalCountries ?? []).forEach((c: { id: string; name?: string }) =>
          loadedDisplay.push({ id: String(c.id), name: (c as { name?: string }).name ?? String(c.id), isHistorical: true }),
        )
        setLoadedRelatedCountryDisplay(loadedDisplay)

        const thumbUrl = event.thumbnail ?? (event.eventImages?.find((img: { isPrimary?: boolean }) => img.isPrimary)?.imageUrl ?? event.eventImages?.[0]?.imageUrl)
        if (thumbUrl) setThumbnail(String(thumbUrl))
        if (event.parentEventId) rel.setParentEventId(event.parentEventId)
        if (event.eventSections?.length) {
          type SectionRow = { id: string; title: string; content: string; order?: number }
          const sectionsRaw: SectionRow[] = event.eventSections as SectionRow[]
          setSections(
            sectionsRaw
              .slice()
              .sort((a: SectionRow, b: SectionRow) => (a.order ?? 0) - (b.order ?? 0))
              .map((s: SectionRow) => ({ id: s.id, title: s.title, content: s.content, mentions: [] })),
          )
        }
        if (event.eventImages?.length) {
          setEventImages(
            event.eventImages.map((img: { imageUrl: string; caption?: string; order: number; isPrimary: boolean }) => ({
              imageUrl: img.imageUrl || '',
              caption: img.caption ?? undefined,
              order: typeof img.order === 'number' ? img.order : 0,
              isPrimary: Boolean(img.isPrimary),
            })),
          )
        } else {
          setEventImages([])
        }
        const childEvents = await getEventsByParentId(editEventId)
        if (cancelled) return
        setChildEventIds(childEvents.map((c) => c.id))
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : '사건 정보를 불러오지 못했습니다.'
          toast.error(msg)
          setFormError(msg.includes('본인') ? '본인이 등록한 사건만 수정할 수 있습니다.' : '사건 정보를 불러오지 못했습니다.')
        }
      } finally {
        if (!cancelled) setIsLoadingEvent(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [editEventId])

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      { id: nextSectionId(prev), title: `Part ${prev.length + 1}`, content: '', mentions: [] },
    ])
  }
  const updateSection = (id: string, patch: Partial<Pick<EventSection, 'title' | 'content'>>) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    )
  }
  const removeSection = (id: string) => {
    if (sections.length <= 1) return
    setSections((prev) => prev.filter((s) => s.id !== id))
  }

  const handleSubmit = async () => {
    setFormError(null)
    if (!validateBasicInfo({ title, startDate })) return
    if (dateError) {
      setFormError(dateError)
      return
    }
    setIsSaving(true)
    try {
      const { mentionedPersons, mentionedEvents } = extractMentions(sections)
      const eventData = buildEventSubmitData({
        title: title.trim(),
        description: description.trim(),
        startDate,
        startTime: startTime ?? '',
        endDate,
        endTime: endTime ?? '',
        category,
        location,
        thumbnail: eventImages.length > 0 ? eventImages[0].imageUrl : thumbnail,
        parentEventId: rel.parentEventId,
        tags: tags ?? [],
        relatedCountryIds,
        relatedHistoricalCountryIds,
        relatedPersons: rel.relatedPersons,
        relatedEventIds: rel.relatedEventIds,
        sections,
        belligerentsGraph: { countries: [], relations: [] },
        warCost: '',
        mentionedPersons,
        mentionedEvents,
        childEventIds: childEventIds.length > 0 ? childEventIds : undefined,
        eventImages: eventImages.length > 0 ? eventImages : undefined,
      })
      if (isEditMode && editEventId) {
        await updateEvent(editEventId, eventData as Parameters<typeof updateEvent>[1])
        toast.success('사건이 수정되었습니다.')
      } else {
        await createEvent(eventData as Parameters<typeof createEvent>[0])
        toast.success('사건이 등록되었습니다.')
      }
      onSuccess()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : '사건 등록에 실패했습니다.'
      setFormError(msg)
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const categories = Array.isArray(dbCategories) ? dbCategories : []
  const parentEventOptions = useMemo(
    () => [{ id: '', title: '— 없음 —' }, ...availableEvents],
    [availableEvents],
  )
  const childEventCandidates = useMemo(
    () => availableEvents.filter((e) => e.id !== rel.parentEventId),
    [availableEvents, rel.parentEventId],
  )
  const relatedEventCandidates = useMemo(
    () =>
      availableEvents.filter(
        (e) => e.id !== rel.parentEventId && !rel.relatedEventIds.includes(e.id),
      ),
    [availableEvents, rel.parentEventId, rel.relatedEventIds],
  )
  const personCandidates = useMemo(
    () =>
      availablePersons.filter(
        (p) => !rel.relatedPersons.some((r) => r.personId === p.id),
      ),
    [availablePersons, rel.relatedPersons],
  )

  const filteredParentEventsForModal = useMemo(() => {
    const q = parentEventSearch.toLowerCase().trim()
    if (!q) return availableEvents.slice(0, 50)
    return availableEvents.filter(
      (e) =>
        (e.title && e.title.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q)),
    ).slice(0, 50)
  }, [availableEvents, parentEventSearch])

  const selectedCountriesForDisplay = useMemo(() => {
    const list: Array<{ id: string; name: string; isHistorical: boolean }> = []
    const idStr = (id: string) => String(id)
    relatedCountryIds.forEach((id) => {
      const loaded = loadedRelatedCountryDisplay.find((x) => x.id === idStr(id) && !x.isHistorical)
      if (loaded) {
        list.push(loaded)
        return
      }
      const c = availableCountries.find((x) => String(x.id) === idStr(id))
      if (c?.name) list.push({ id: idStr(id), name: c.name, isHistorical: false })
      else list.push({ id: idStr(id), name: idStr(id), isHistorical: false })
    })
    relatedHistoricalCountryIds.forEach((id) => {
      const loaded = loadedRelatedCountryDisplay.find((x) => x.id === idStr(id) && x.isHistorical)
      if (loaded) {
        list.push(loaded)
        return
      }
      const c = availableHistoricalCountries.find((x) => String(x.id) === idStr(id))
      list.push({ id: idStr(id), name: (c as { name?: string })?.name ?? idStr(id), isHistorical: true })
    })
    return list
  }, [relatedCountryIds, relatedHistoricalCountryIds, availableCountries, availableHistoricalCountries, loadedRelatedCountryDisplay])

  const handleStartDateSelect = (date: string) => {
    setStartDate(date)
    setShowStartDateModal(false)
    setShowEndDateModal(true)
  }

  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      validateImageFile(file)
      setImageUploading(true)
      const res = await uploadImage(file, 'events')
      setEventImages((prev) => [
        ...prev,
        { imageUrl: res.url, order: prev.length, isPrimary: prev.length === 0 },
      ])
      toast.success('이미지가 추가되었습니다.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.')
    } finally {
      setImageUploading(false)
    }
  }

  const removeEventImage = (index: number) => {
    setEventImages((prev) => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length > 0 && !next.some((img) => img.isPrimary)) {
        next[0].isPrimary = true
      }
      return next.map((img, i) => ({ ...img, order: i }))
    })
  }

  return (
    <>
      <DashboardFormWrap>
        <DashboardFormHeader>
          <BackButton type="button" onClick={onBack}>
            <FiArrowLeft size={18} />
            목록으로
          </BackButton>
          <FormHeaderTitle>{isEditMode ? '사건 수정' : '사건 등록'}</FormHeaderTitle>
          <SubmitButton
            type="button"
            onClick={handleSubmit}
            disabled={!isValid() || isSaving || isLoadingEvent}
          >
            {isSaving ? (isEditMode ? '수정 중…' : '등록 중…') : isLoadingEvent ? '불러오는 중…' : (isEditMode ? '수정' : '등록')}
          </SubmitButton>
        </DashboardFormHeader>

        <form id="event-create-form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <FormBodyScroll>
            {formError && (
              <div
                style={{
                  marginBottom: 24,
                  padding: '12px 16px',
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: 10,
                  color: '#dc2626',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {formError}
              </div>
            )}

            <TabNavigation>
              <TabButton type="button" $active={activeTab === 'basic'} onClick={() => setActiveTab('basic')}>
                <FiInfo size={16} />
                기본 정보
              </TabButton>
              <TabButton type="button" $active={activeTab === 'content'} onClick={() => setActiveTab('content')}>
                <FiFileText size={16} />
                본문
              </TabButton>
              <TabButton type="button" $active={activeTab === 'relations'} onClick={() => setActiveTab('relations')}>
                <FiLink size={16} />
                관계
              </TabButton>
            </TabNavigation>

            {activeTab === 'basic' && (
              <FormRows>
                <FieldRow>
                  <FieldLabel>이미지</FieldLabel>
                  <FieldControl>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <ImageGrid>
                        {eventImages.map((img, idx) => (
                          <ImageCard key={idx} $isPrimary={img.isPrimary}>
                            <ImageCardImg src={getUploadImageUrl(img.imageUrl)} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                            {img.isPrimary && <ImagePrimaryBadge>대표</ImagePrimaryBadge>}
                            <ImageCardRemove type="button" onClick={() => removeEventImage(idx)} aria-label="삭제">
                              <FiX size={14} />
                            </ImageCardRemove>
                          </ImageCard>
                        ))}
                        <ImageAddBtn>
                          <input type="file" accept="image/*" onChange={handleAddImage} disabled={imageUploading} />
                          {imageUploading ? '업로드 중…' : <><FiPlus size={22} /> 이미지 추가</>}
                        </ImageAddBtn>
                      </ImageGrid>
                      <span style={{ fontSize: 12, color: '#64748b' }}>여러 장 등록 가능. 첫 번째 이미지가 대표 이미지로 사용됩니다.</span>
                    </div>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>사건명 <Required /></FieldLabel>
                  <FieldControl>
                    <InputShort value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 6.25 전쟁" />
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>설명</FieldLabel>
                  <FieldControl>
                    <TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="사건 개요 또는 설명" rows={6} />
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>시작일 · 종료일</FieldLabel>
                  <FieldControl>
                    <DateFieldsRowWide>
                      <DateFieldBtn type="button" $hasValue={!!startDate} onClick={() => setShowStartDateModal(true)}>
                        <FiCalendar size={18} />
                        <span>{formatDateDisplay(startDate)}</span>
                        <FiChevronDown size={16} />
                      </DateFieldBtn>
                      <DateFieldBtn type="button" $hasValue={!!endDate} onClick={() => setShowEndDateModal(true)}>
                        <FiCalendar size={18} />
                        <span>{formatDateDisplay(endDate)}</span>
                        <FiChevronDown size={16} />
                      </DateFieldBtn>
                    </DateFieldsRowWide>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>카테고리</FieldLabel>
                  <FieldControl>
                    <CategoryGrid>
                      {categories.map((c) => (
                        <CategoryChip
                          key={c.id}
                          type="button"
                          $active={String(category) === String(c.id)}
                          onClick={() => setCategory(String(category) === String(c.id) ? '' : String(c.id))}
                        >
                          {c.name}
                        </CategoryChip>
                      ))}
                    </CategoryGrid>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>위치</FieldLabel>
                  <FieldControl>
                    <InputShort value={location} onChange={(e) => setLocation(e.target.value)} placeholder="예: 한반도 전역" />
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>연관 국가</FieldLabel>
                  <FieldControl>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {selectedCountriesForDisplay.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {selectedCountriesForDisplay.map((c) => (
                            <CountryChip key={c.id}>
                              {c.name}
                              <ChipRemoveBtn
                                type="button"
                                onClick={() => {
                                  if (c.isHistorical) setRelatedHistoricalCountryIds((prev) => prev.filter((id) => id !== c.id))
                                  else setRelatedCountryIds((prev) => prev.filter((id) => id !== c.id))
                                }}
                                aria-label="제거"
                              >
                                ×
                              </ChipRemoveBtn>
                            </CountryChip>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowCountryModal(true)}
                        style={{ width: '100%', maxWidth: 320, padding: '12px 16px', fontSize: 14, textAlign: 'left', cursor: 'pointer', border: `1px solid ${BORDER_COLOR}`, borderRadius: 12, background: '#fff', color: '#111827' }}
                      >
                        {selectedCountriesForDisplay.length > 0 ? '국가 추가' : '현대·역사적 국가 선택'}
                      </button>
                    </div>
                  </FieldControl>
                </FieldRow>
              </FormRows>
            )}

            {activeTab === 'content' && (
              <ContentTabWrap>
                <FormRows>
                  {sections.map((sec) => (
                    <React.Fragment key={sec.id}>
                      <FieldRow>
                        <FieldLabel>섹션 제목</FieldLabel>
                        <FieldControl>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <Input
                              type="text"
                              value={sec.title}
                              onChange={(e) => updateSection(sec.id, { title: e.target.value })}
                              placeholder="예: Part 1"
                              style={{ maxWidth: 320, flex: '1 1 200px' }}
                            />
                            <RemoveSectionBtn
                              type="button"
                              $disabled={sections.length <= 1}
                              onClick={() => sections.length > 1 && removeSection(sec.id)}
                              title={sections.length <= 1 ? '최소 1개의 섹션이 필요합니다' : '이 섹션 삭제'}
                            >
                              삭제
                            </RemoveSectionBtn>
                          </div>
                        </FieldControl>
                      </FieldRow>
                      <FieldRow>
                        <FieldLabel>섹션 내용</FieldLabel>
                        <SectionContentControl>
                          <EditorWrap>
                            <RichTextEditor
                              value={sec.content}
                              onChange={(value) => updateSection(sec.id, { content: value })}
                              placeholder="본문 내용을 입력하세요..."
                              mentionEntities={{
                                persons: availablePersons,
                                events: availableEvents,
                                countries: availableCountries,
                                historicalCountries: availableHistoricalCountries,
                                militaryUnits: availableMilitaryUnits ?? [],
                              }}
                            />
                          </EditorWrap>
                        </SectionContentControl>
                      </FieldRow>
                    </React.Fragment>
                  ))}
                  <FieldRow style={{ borderBottom: 'none' }}>
                    <FieldLabel>본문 섹션</FieldLabel>
                    <FieldControl>
                      <AddSectionBtn type="button" onClick={addSection}>+ 섹션 추가</AddSectionBtn>
                    </FieldControl>
                  </FieldRow>
                </FormRows>
              </ContentTabWrap>
            )}

            {activeTab === 'relations' && (
              <FormRows>
                <FieldRow>
                  <FieldLabel>상위 사건</FieldLabel>
                  <FieldControl>
                    <button
                      type="button"
                      onClick={() => setShowParentEventModal(true)}
                      style={{ width: '100%', maxWidth: 380, padding: '12px 16px', fontSize: 14, textAlign: 'left', cursor: 'pointer', border: `1px solid ${BORDER_COLOR}`, borderRadius: 12, background: '#fff', color: rel.parentEventId ? '#111827' : '#9ca3af' }}
                    >
                      {rel.parentEventId
                        ? (availableEvents.find((e) => e.id === rel.parentEventId)?.title ?? rel.parentEventId)
                        : '상위 사건 선택'}
                    </button>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>관련 인물</FieldLabel>
                  <FieldControl>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {rel.relatedPersons.map((r) => {
                          const person = availablePersons.find((p) => p.id === r.personId)
                          return (
                            <Chip key={r.personId}>
                              {person?.name ?? r.personId}
                              <ChipRemoveBtn type="button" onClick={() => rel.setRelatedPersons(rel.relatedPersons.filter((x) => x.personId !== r.personId))} aria-label="제거">×</ChipRemoveBtn>
                            </Chip>
                          )
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowRelatedPersonModal(true)}
                        style={{ width: '100%', maxWidth: 320, padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#6366f1', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 12, cursor: 'pointer' }}
                      >
                        + 인물 선택
                      </button>
                    </div>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>관련 사건</FieldLabel>
                  <FieldControl>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {rel.relatedEventIds.map((eventId) => {
                          const ev = availableEvents.find((e) => e.id === eventId)
                          return (
                            <Chip key={eventId}>
                              {ev?.title ?? eventId}
                              <ChipRemoveBtn type="button" onClick={() => rel.setRelatedEventIds(rel.relatedEventIds.filter((id) => id !== eventId))} aria-label="제거">×</ChipRemoveBtn>
                            </Chip>
                          )
                        })}
                      </div>
                      <SelectInput
                        value=""
                        onChange={(e) => {
                          const id = e.target.value
                          if (!id) return
                          if (rel.relatedEventIds.includes(id)) return
                          rel.setRelatedEventIds([...rel.relatedEventIds, id])
                          e.target.value = ''
                        }}
                      >
                        <option value="">사건 추가…</option>
                        {relatedEventCandidates.map((ev) => (
                          <option key={ev.id} value={ev.id}>{ev.title ?? ev.id}</option>
                        ))}
                      </SelectInput>
                    </div>
                  </FieldControl>
                </FieldRow>
                <FieldRow>
                  <FieldLabel>하위 사건</FieldLabel>
                  <FieldControl>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {childEventIds.map((eventId) => {
                          const ev = availableEvents.find((e) => e.id === eventId)
                          return (
                            <Chip key={eventId}>
                              {ev?.title ?? eventId}
                              <ChipRemoveBtn type="button" onClick={() => setChildEventIds((prev) => prev.filter((id) => id !== eventId))} aria-label="제거">×</ChipRemoveBtn>
                            </Chip>
                          )
                        })}
                      </div>
                      <SelectInput
                        value=""
                        onChange={(e) => {
                          const id = e.target.value
                          if (!id) return
                          if (childEventIds.includes(id)) return
                          setChildEventIds((prev) => [...prev, id])
                          e.target.value = ''
                        }}
                      >
                        <option value="">하위 사건 추가…</option>
                        {childEventCandidates.map((ev) => (
                          <option key={ev.id} value={ev.id}>{ev.title ?? ev.id}</option>
                        ))}
                      </SelectInput>
                    </div>
                  </FieldControl>
                </FieldRow>
              </FormRows>
            )}
          </FormBodyScroll>
        </form>
      </DashboardFormWrap>

      <DatePickerModal
        isOpen={showStartDateModal}
        onClose={() => setShowStartDateModal(false)}
        onSelect={handleStartDateSelect}
        initialDate={startDate || undefined}
        title="시작일 선택"
      />
      <DatePickerModal
        isOpen={showEndDateModal}
        onClose={() => setShowEndDateModal(false)}
        onSelect={(date) => { setEndDate(date); setShowEndDateModal(false) }}
        initialDate={endDate || undefined}
        minDate={startDate || undefined}
        title="종료일 선택"
      />

      {showParentEventModal && (
        <ModalOverlay onClick={() => setShowParentEventModal(false)}>
          <ModalPanel onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>상위 사건 선택</ModalTitle>
              <ModalCloseBtn type="button" onClick={() => setShowParentEventModal(false)}><FiX size={20} /></ModalCloseBtn>
            </ModalHeader>
            <ModalBody>
              <Input
                type="text"
                placeholder="사건명 검색..."
                value={parentEventSearch}
                onChange={(e) => setParentEventSearch(e.target.value)}
                style={{ marginBottom: 16 }}
              />
              <EventListBtn type="button" onClick={() => { rel.setParentEventId(''); setShowParentEventModal(false) }}>
                — 없음
              </EventListBtn>
              {filteredParentEventsForModal.map((ev) => (
                <EventListBtn key={ev.id} type="button" onClick={() => { rel.setParentEventId(ev.id); setShowParentEventModal(false) }}>
                  {ev.title ?? ev.id}
                </EventListBtn>
              ))}
            </ModalBody>
          </ModalPanel>
        </ModalOverlay>
      )}

      {showRelatedPersonModal && (
        <PersonSelectModal
          persons={availablePersons}
          selectedPersonId=""
          onSelect={(personId) => {
            if (rel.relatedPersons.some((r) => r.personId === personId)) return
            rel.setRelatedPersons([...rel.relatedPersons, { personId, role: '', note: '' }])
            setShowRelatedPersonModal(false)
          }}
          onClose={() => setShowRelatedPersonModal(false)}
        />
      )}

      <AdvancedCountrySelectModal
        isOpen={showCountryModal}
        onClose={() => setShowCountryModal(false)}
        onSelect={(country) => {
          if (country.isHistorical) {
            if (relatedHistoricalCountryIds.includes(country.id)) {
              setRelatedHistoricalCountryIds(
                relatedHistoricalCountryIds.filter((id) => id !== country.id),
              )
            } else {
              setRelatedHistoricalCountryIds([
                ...relatedHistoricalCountryIds,
                country.id,
              ])
            }
          } else {
            if (relatedCountryIds.includes(country.id)) {
              setRelatedCountryIds(
                relatedCountryIds.filter((id) => id !== country.id),
              )
            } else {
              setRelatedCountryIds([...relatedCountryIds, country.id])
            }
          }
        }}
        modernCountries={availableCountries}
        historicalCountries={availableHistoricalCountries}
        title="연관 국가 선택"
        selectedCountryIds={[...relatedCountryIds, ...relatedHistoricalCountryIds]}
        multiSelect={true}
      />
    </>
  )
}
