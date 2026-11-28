/**
 * 국가 상세 — 법령 등록·수정 모달.
 *
 * 사건 등록 모달(`EventRegisterModal`)·선거 등록 모달(`ElectionFormModal`)과 동일한 문법을 따른다:
 * - 외곽 셸: `RegisterModal` + 헤더 섹션 이동 알약(`RegisterSectionJumpNav`) + 초기화 + 2단/1단 보기 전환
 * - 본문 조판: 카드 상자 없이 점(•) 머리글 섹션(`기본 정보` · `시행·조문` · `내용·경위`),
 *   법 분류는 사건 분야 칩(`ToneChipGroup`), 날짜는 사건 시작·종료 칸(`YmdDateField`)
 * - 하단 고정 푸터: 빠진 필수 칸 이동 알약(`RegisterFooterStatus`) + 단축키(`⌘↵` / `⌘⇧↵`) + `등록 후 계속`
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { IconType } from 'react-icons'
import {
  FiBookmark,
  FiBookOpen,
  FiColumns,
  FiFileText,
  FiGlobe,
  FiLayers,
  FiPlus,
  FiShield,
} from 'react-icons/fi'
import styled from 'styled-components'

import * as EventFormS from '@/pages/events/create/event-create.styles'
import {
  defaultPassedChamberIdFromSystem,
  findPoliticalSystemAtDate,
  GOVERNMENT_FORM_LABEL,
  LEGISLATURE_TYPE_LABEL,
} from '@/entities/political-system/model/political-system'
import {
  type ChamberDto,
  chamberLabel,
  labelChamberRole,
} from '@/shared/api/chamber'
import type { LawRow, LawTypeRow } from '@/shared/api/election'
import type { PoliticalSystem } from '@/shared/api/political-system'
import { confirm } from '@/shared/ui/confirm-dialog'
import { FormSelectNative } from '@/shared/ui/form-select-native'
import {
  activeSectionAt,
  FooterActions,
  HeaderActionsBar,
  HeaderResetBtn,
  RegisterFooterStatus,
  RegisterSectionJumpNav,
  useModalSubmitShortcut,
} from '@/shared/ui/register-modal-shell/register-modal-chrome'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalStickyFooter,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import { notify } from '@/shared/ui/toast'

import * as FormS from './military-unit-form/styles'
import {
  ToneChipGroup,
  type ToneChipOption,
  useSplitLayoutMode,
  YmdDateField,
} from './politics-form/politics-form-parts'

const LAW_FORM_SECTION_ID = {
  basic: 'law-form-section-basic',
  timing: 'law-form-section-timing',
  narrative: 'law-form-section-narrative',
} as const

const LAW_FORM_SECTION_IDS = [
  LAW_FORM_SECTION_ID.basic,
  LAW_FORM_SECTION_ID.timing,
  LAW_FORM_SECTION_ID.narrative,
] as const

const LAW_SPLIT_LEFT_ID = 'law-form-split-left'
const LAW_SPLIT_RIGHT_ID = 'law-form-split-right'
const START_DATE_ANCHOR_ID = 'country-law-form-start-date'

export function getLawTypeHierarchyRank(label: string): number {
  if (/헌법|기본법|대헌장|장전/.test(label)) return 0
  if (/법률|법전|율령|대전|통전/.test(label)) return 1
  if (/조약|협약|국제법/.test(label)) return 2
  if (/대통령령|칙령|시행령|정령|명령|교지/.test(label)) return 3
  if (/총리령|부령|시행규칙|규칙|조례|예규/.test(label)) return 4
  if (label === '미분류') return 9
  return 5
}

interface ToneSpec {
  Icon: IconType
  rgb: string
  text: string
  textDark: string
  accent: string
}

function getLawTypeTone(label: string): ToneSpec {
  if (/헌법|기본법|대헌장|장전/.test(label)) {
    return {
      Icon: FiShield,
      rgb: '124, 58, 237',
      text: '#6d28d9',
      textDark: '#c4b5fd',
      accent: '#7c3aed',
    }
  }
  if (/법률|법전|율령|대전|통전/.test(label)) {
    return {
      Icon: FiBookOpen,
      rgb: '99, 102, 241',
      text: '#4f46e5',
      textDark: '#a5b4fc',
      accent: '#6366f1',
    }
  }
  if (/조약|협약|국제법/.test(label)) {
    return {
      Icon: FiGlobe,
      rgb: '2, 132, 199',
      text: '#0369a1',
      textDark: '#7dd3fc',
      accent: '#0284c7',
    }
  }
  if (/대통령령|칙령|시행령|정령|명령|교지/.test(label)) {
    return {
      Icon: FiFileText,
      rgb: '217, 119, 6',
      text: '#b45309',
      textDark: '#fcd34d',
      accent: '#d97706',
    }
  }
  if (/총리령|부령|시행규칙|규칙|조례|예규/.test(label)) {
    return {
      Icon: FiLayers,
      rgb: '13, 148, 136',
      text: '#0f766e',
      textDark: '#5eead4',
      accent: '#0d9488',
    }
  }
  return {
    Icon: FiBookmark,
    rgb: '100, 116, 139',
    text: '#475569',
    textDark: '#cbd5e1',
    accent: '#64748b',
  }
}

export function toLawDateYmd(raw: string | null | undefined): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const dateObj = new Date(trimmed)
  if (Number.isNaN(dateObj.getTime())) return ''
  const year = dateObj.getUTCFullYear()
  if (year < 1000) return ''
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getUTCDate()).padStart(2, '0')
  return `${String(year).padStart(4, '0')}-${month}-${day}`
}

/** 숫자만 허용, 비어 있으면 null, 1 이상만 API로 전달 */
export function parseClauseDigits(raw: string): number | null {
  const digitsOnly = raw.replace(/\D/g, '').trim()
  if (digitsOnly === '') return null
  const parsed = Number.parseInt(digitsOnly, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return null
  return parsed
}

export function formatClauseLabel(
  articleNumber: number | null | undefined,
  paragraphNumber: number | null | undefined,
): string | null {
  if (articleNumber == null && paragraphNumber == null) return null
  if (articleNumber != null && paragraphNumber != null) {
    return `제${articleNumber}조 제${paragraphNumber}항`
  }
  if (articleNumber != null) return `제${articleNumber}조`
  return `제${paragraphNumber}항`
}

function resolveLawScopeForSubmit(
  lawScope: { countryId?: string; historicalCountryId?: string },
  selectedHistoricalCountryId: string,
): { countryId: string | null; historicalCountryId: string | null } {
  if (lawScope.historicalCountryId) {
    return {
      countryId: null,
      historicalCountryId: lawScope.historicalCountryId,
    }
  }
  return {
    countryId: lawScope.countryId ?? null,
    historicalCountryId: selectedHistoricalCountryId.trim() || null,
  }
}

export interface LawFormSubmitPayload {
  mode: 'create' | 'edit'
  id?: string
  continueAfterSave?: boolean
  body: {
    name: string
    summary: string | null
    articleNumber: number | null
    paragraphNumber: number | null
    startDate: string | null
    endDate: string | null
    note: string | null
    lawTypeId: string | null
    countryId: string | null
    historicalCountryId: string | null
    passedChamberId?: string | null
    yeas?: number | null
    nays?: number | null
    abstentions?: number | null
  }
}

export interface LawFormModalProps {
  isOpen: boolean
  mode: 'create' | 'edit'
  initial?: LawRow | null
  lawScope: { countryId?: string; historicalCountryId?: string }
  historicalCountryOptions?: ReadonlyArray<{ id: string; name: string }>
  chambers?: ReadonlyArray<ChamberDto>
  politicalSystems?: ReadonlyArray<PoliticalSystem>
  lawTypes: ReadonlyArray<LawTypeRow>
  saving: boolean
  creatingLawType?: boolean
  onCreateLawType?: (name: string) => Promise<LawTypeRow | null | undefined>
  onClose: () => void
  onSubmit: (payload: LawFormSubmitPayload) => Promise<boolean> | boolean | void
}

export function LawFormModal({
  isOpen,
  mode,
  initial,
  lawScope,
  historicalCountryOptions = [],
  chambers = [],
  politicalSystems = [],
  lawTypes,
  saving,
  creatingLawType = false,
  onCreateLawType,
  onClose,
  onSubmit,
}: LawFormModalProps) {
  const [name, setName] = useState(() => initial?.name ?? '')
  const [lawTypeId, setLawTypeId] = useState(
    () => initial?.lawTypeId ?? initial?.lawType?.id ?? '',
  )
  const [scopeHistoricalCountryId, setScopeHistoricalCountryId] = useState(
    () => initial?.historicalCountryId ?? '',
  )
  const [startDateInput, setStartDateInput] = useState(() =>
    toLawDateYmd(initial?.startDate),
  )
  const [endDateInput, setEndDateInput] = useState(() =>
    toLawDateYmd(initial?.endDate),
  )
  const [articleInput, setArticleInput] = useState(() =>
    initial?.articleNumber != null ? String(initial.articleNumber) : '',
  )
  const [paragraphInput, setParagraphInput] = useState(() =>
    initial?.paragraphNumber != null ? String(initial.paragraphNumber) : '',
  )
  const [passedChamberId, setPassedChamberId] = useState(
    () => initial?.passedChamberId ?? initial?.passedChamber?.id ?? '',
  )
  const passedChamberManuallyTouchedRef = useRef(
    Boolean(initial?.passedChamberId ?? initial?.passedChamber?.id),
  )
  const [yeasInput, setYeasInput] = useState(() =>
    initial?.yeas != null ? String(initial.yeas) : '',
  )
  const [naysInput, setNaysInput] = useState(() =>
    initial?.nays != null ? String(initial.nays) : '',
  )
  const [abstentionsInput, setAbstentionsInput] = useState(() =>
    initial?.abstentions != null ? String(initial.abstentions) : '',
  )
  const [summary, setSummary] = useState(() => initial?.summary ?? '')
  const [noteInput, setNoteInput] = useState(() => initial?.note ?? '')
  const [dateInputKey, setDateInputKey] = useState(0)

  const [inlineTypeOpen, setInlineTypeOpen] = useState(false)
  const [newLawTypeName, setNewLawTypeName] = useState('')

  const [dateErrors, setDateErrors] = useState<Record<string, string | null>>(
    {},
  )
  const setDateError = useCallback(
    (key: string) => (message: string | null) =>
      setDateErrors((prev) =>
        prev[key] === message ? prev : { ...prev, [key]: message },
      ),
    [],
  )

  const { layoutMode, toggleLayoutMode } = useSplitLayoutMode(
    'papyrus:law-register-layout',
  )
  const formScrollRef = useRef<HTMLDivElement | null>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<string>(
    LAW_FORM_SECTION_ID.basic,
  )

  const applyFromInitial = useCallback(
    (target: LawRow | null | undefined) => {
      setName(target?.name ?? '')
      setLawTypeId(target?.lawTypeId ?? target?.lawType?.id ?? '')
      setScopeHistoricalCountryId(target?.historicalCountryId ?? '')
      setStartDateInput(toLawDateYmd(target?.startDate))
      setEndDateInput(toLawDateYmd(target?.endDate))
      setArticleInput(
        target?.articleNumber != null ? String(target.articleNumber) : '',
      )
      setParagraphInput(
        target?.paragraphNumber != null ? String(target.paragraphNumber) : '',
      )
      setPassedChamberId(
        target?.passedChamberId ?? target?.passedChamber?.id ?? '',
      )
      passedChamberManuallyTouchedRef.current = Boolean(
        target?.passedChamberId ?? target?.passedChamber?.id,
      )
      setYeasInput(target?.yeas != null ? String(target.yeas) : '')
      setNaysInput(target?.nays != null ? String(target.nays) : '')
      setAbstentionsInput(
        target?.abstentions != null ? String(target.abstentions) : '',
      )
      setSummary(target?.summary ?? '')
      setNoteInput(target?.note ?? '')
      setDateErrors({})
      setDateInputKey((prev) => prev + 1)
      setInlineTypeOpen(false)
      setNewLawTypeName('')
      setActiveSectionId(LAW_FORM_SECTION_ID.basic)
    },
    [],
  )

  useEffect(() => {
    if (!isOpen) return
    applyFromInitial(mode === 'edit' ? initial : null)
  }, [isOpen, mode, initial, applyFromInitial])

  const matchedPoliticalSystem = useMemo(
    () =>
      findPoliticalSystemAtDate(politicalSystems, {
        countryId: lawScope.countryId ?? null,
        historicalCountryId:
          lawScope.historicalCountryId ?? (scopeHistoricalCountryId || null),
        isoDate: startDateInput || null,
        fallbackToCurrent: !startDateInput,
      }),
    [
      politicalSystems,
      lawScope.countryId,
      lawScope.historicalCountryId,
      scopeHistoricalCountryId,
      startDateInput,
    ],
  )

  const sortedChambers = useMemo(() => {
    const activeIds = new Set(
      [
        matchedPoliticalSystem?.lowerChamberId,
        matchedPoliticalSystem?.upperChamberId,
      ].filter((id): id is string => Boolean(id)),
    )
    return [...chambers].sort((left, right) => {
      const leftActive = activeIds.has(left.id) ? 0 : 1
      const rightActive = activeIds.has(right.id) ? 0 : 1
      if (leftActive !== rightActive) return leftActive - rightActive
      return left.name.localeCompare(right.name, 'ko')
    })
  }, [chambers, matchedPoliticalSystem])

  useEffect(() => {
    if (
      !isOpen ||
      mode !== 'create' ||
      passedChamberManuallyTouchedRef.current ||
      passedChamberId ||
      chambers.length === 0
    ) {
      return
    }
    const suggestedChamberId = defaultPassedChamberIdFromSystem(
      matchedPoliticalSystem,
    )
    if (
      suggestedChamberId &&
      chambers.some((chamber) => chamber.id === suggestedChamberId)
    ) {
      setPassedChamberId(suggestedChamberId)
    }
  }, [isOpen, mode, passedChamberId, chambers, matchedPoliticalSystem])

  const showHistoricalCountryPicker = Boolean(
    lawScope.countryId &&
      !lawScope.historicalCountryId &&
      historicalCountryOptions.length > 0,
  )

  const lawTypeChipOptions = useMemo<ToneChipOption[]>(() => {
    const sortedTypes = [...lawTypes].sort((left, right) => {
      const leftRank = getLawTypeHierarchyRank(left.name)
      const rightRank = getLawTypeHierarchyRank(right.name)
      if (leftRank !== rightRank) return leftRank - rightRank
      return left.name.localeCompare(right.name, 'ko')
    })

    const mapped: ToneChipOption[] = sortedTypes.map((typeRow) => ({
      value: typeRow.id,
      label: typeRow.name,
      title: typeRow.description ?? undefined,
      ...getLawTypeTone(typeRow.name),
    }))

    if (
      lawTypeId &&
      !mapped.some((chipOption) => chipOption.value === lawTypeId)
    ) {
      const orphanLabel = initial?.lawType?.name ?? '(목록에 없는 분류)'
      mapped.unshift({
        value: lawTypeId,
        label: orphanLabel,
        ...getLawTypeTone(orphanLabel),
      })
    }

    return mapped
  }, [lawTypes, lawTypeId, initial?.lawType?.name])

  const currentSnapshot = JSON.stringify([
    name,
    lawTypeId,
    scopeHistoricalCountryId,
    startDateInput,
    endDateInput,
    articleInput,
    paragraphInput,
    summary,
    noteInput,
  ])

  const baselineSnapshot = useMemo(
    () =>
      JSON.stringify([
        mode === 'edit' ? (initial?.name ?? '') : '',
        mode === 'edit'
          ? (initial?.lawTypeId ?? initial?.lawType?.id ?? '')
          : '',
        mode === 'edit' ? (initial?.historicalCountryId ?? '') : '',
        mode === 'edit' ? toLawDateYmd(initial?.startDate) : '',
        mode === 'edit' ? toLawDateYmd(initial?.endDate) : '',
        mode === 'edit' && initial?.articleNumber != null
          ? String(initial.articleNumber)
          : '',
        mode === 'edit' && initial?.paragraphNumber != null
          ? String(initial.paragraphNumber)
          : '',
        mode === 'edit' ? (initial?.summary ?? '') : '',
        mode === 'edit' ? (initial?.note ?? '') : '',
      ]),
    [mode, initial],
  )

  const isDirty = currentSnapshot !== baselineSnapshot

  const articleParsed = parseClauseDigits(articleInput)
  const paragraphParsed = parseClauseDigits(paragraphInput)
  const articleInvalid =
    articleInput.trim() !== '' && articleParsed == null
  const paragraphInvalid =
    paragraphInput.trim() !== '' && paragraphParsed == null
  const paragraphWithoutArticle =
    paragraphParsed != null && articleParsed == null

  const dateOrderInvalid = Boolean(
    startDateInput && endDateInput && endDateInput < startDateInput,
  )
  const firstDateError =
    Object.values(dateErrors).find((message) => Boolean(message)) ?? null

  const missingRequired = useMemo(
    () => (!name.trim() ? ['명칭'] : []),
    [name],
  )

  const validationProblem =
    firstDateError ??
    (dateOrderInvalid
      ? '폐지·종료일은 제정·시행일보다 빠를 수 없습니다.'
      : articleInvalid
        ? '조 번호는 1 이상의 숫자만 입력할 수 있습니다.'
        : paragraphInvalid
          ? '항 번호는 1 이상의 숫자만 입력할 수 있습니다.'
          : paragraphWithoutArticle
            ? '항을 입력하려면 조 번호를 먼저 입력하세요.'
            : null)

  const canSubmit =
    !saving && missingRequired.length === 0 && !validationProblem

  const timingFilledCount = useMemo(
    () =>
      [
        startDateInput,
        endDateInput,
        articleInput.trim(),
        paragraphInput.trim(),
        passedChamberId.trim(),
        yeasInput.trim(),
        naysInput.trim(),
        abstentionsInput.trim(),
      ].filter(Boolean).length,
    [
      startDateInput,
      endDateInput,
      articleInput,
      paragraphInput,
      passedChamberId,
      yeasInput,
      naysInput,
      abstentionsInput,
    ],
  )

  const narrativeFilledCount = useMemo(
    () => [summary.trim(), noteInput.trim()].filter(Boolean).length,
    [summary, noteInput],
  )

  const clausePreview = formatClauseLabel(articleParsed, paragraphParsed)

  const splitActive = () =>
    layoutMode === 'split' &&
    typeof window !== 'undefined' &&
    window.matchMedia?.(`(min-width: ${FormS.SPLIT_MIN_WIDTH}px)`).matches ===
      true

  const scrollToTopAndFocusName = useCallback(() => {
    setActiveSectionId(LAW_FORM_SECTION_ID.basic)
    formScrollRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' })
    document
      .getElementById(LAW_SPLIT_LEFT_ID)
      ?.scrollTo?.({ top: 0, behavior: 'smooth' })
    document
      .getElementById(LAW_SPLIT_RIGHT_ID)
      ?.scrollTo?.({ top: 0, behavior: 'smooth' })
    nameInputRef.current?.focus()
  }, [])

  const jumpToSection = useCallback((sectionId: string) => {
    setActiveSectionId(sectionId)
    if (splitActive()) {
      if (sectionId === LAW_FORM_SECTION_ID.basic) {
        document
          .getElementById(LAW_SPLIT_LEFT_ID)
          ?.scrollTo?.({ top: 0, behavior: 'smooth' })
        return
      }
      if (sectionId === LAW_FORM_SECTION_ID.narrative) {
        document
          .getElementById(LAW_SPLIT_RIGHT_ID)
          ?.scrollTo?.({ top: 0, behavior: 'smooth' })
        return
      }
    }
    document
      .getElementById(sectionId)
      ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }, [layoutMode])

  const handleFormScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    let nextId: string
    if (target?.id === LAW_SPLIT_LEFT_ID) {
      nextId = activeSectionAt(target, [
        LAW_FORM_SECTION_ID.basic,
        LAW_FORM_SECTION_ID.timing,
      ])
    } else if (target?.id === LAW_SPLIT_RIGHT_ID) {
      nextId = LAW_FORM_SECTION_ID.narrative
    } else {
      nextId = activeSectionAt(event.currentTarget, LAW_FORM_SECTION_IDS)
    }
    setActiveSectionId((prev) => (prev === nextId ? prev : nextId))
  }

  const requestClose = useCallback(async () => {
    if (saving) return
    if (
      isDirty &&
      !(await confirm({
        title: '확인',
        message:
          mode === 'create'
            ? '작성 중인 법령 정보가 사라집니다. 창을 닫으시겠습니까?'
            : '저장하지 않은 변경 사항이 있습니다. 닫으시겠습니까?',
      }))
    ) {
      return
    }
    onClose()
  }, [isDirty, mode, onClose, saving])

  const handleReset = async () => {
    if (saving) return
    if (
      !(await confirm({
        title: '작성 내용 초기화',
        message: '작성 중인 내용을 모두 지우고 처음 상태로 되돌리시겠습니까?',
      }))
    ) {
      return
    }
    applyFromInitial(null)
    requestAnimationFrame(() => scrollToTopAndFocusName())
  }

  const focusFirstMissing = () => {
    jumpToSection(LAW_FORM_SECTION_ID.basic)
    nameInputRef.current?.focus()
  }

  const handleCreateInlineLawType = async () => {
    const trimmed = newLawTypeName.trim()
    if (!trimmed || !onCreateLawType || creatingLawType) return
    const created = await onCreateLawType(trimmed)
    if (created?.id) {
      setLawTypeId(created.id)
    }
    setNewLawTypeName('')
    setInlineTypeOpen(false)
  }

  const handleSubmit = useCallback(
    async (options?: { continueAfterSave?: boolean }) => {
      if (!canSubmit) {
        if (!name.trim()) {
          notify.error('명칭을 입력하세요.')
          focusFirstMissing()
        } else if (validationProblem) {
          notify.error(validationProblem)
        }
        return
      }

      const continueAfterSave = Boolean(
        mode === 'create' && options?.continueAfterSave,
      )
      const scopeFields = resolveLawScopeForSubmit(
        lawScope,
        scopeHistoricalCountryId,
      )

      const parseVoteInt = (raw: string): number | null => {
        const trimmed = raw.trim()
        if (!trimmed) return null
        const num = Number(trimmed)
        return Number.isInteger(num) && num >= 0 ? num : null
      }
      const hasAnyChamberVoteFields = Boolean(
        passedChamberId ||
          yeasInput.trim() ||
          naysInput.trim() ||
          abstentionsInput.trim() ||
          mode === 'edit',
      )
      const chamberVoteFields = hasAnyChamberVoteFields
        ? {
            passedChamberId: passedChamberId || null,
            yeas: parseVoteInt(yeasInput),
            nays: parseVoteInt(naysInput),
            abstentions: parseVoteInt(abstentionsInput),
          }
        : {}

      const result = await onSubmit({
        mode,
        id: mode === 'edit' ? initial?.id : undefined,
        continueAfterSave,
        body: {
          name: name.trim(),
          summary: summary.trim() || null,
          articleNumber: articleParsed,
          paragraphNumber: paragraphParsed,
          startDate: startDateInput.trim() || null,
          endDate: endDateInput.trim() || null,
          note: noteInput.trim() || null,
          lawTypeId: lawTypeId || null,
          ...scopeFields,
          ...chamberVoteFields,
        },
      })

      if (continueAfterSave && result !== false) {
        setName('')
        setArticleInput('')
        setParagraphInput('')
        setPassedChamberId('')
        setYeasInput('')
        setNaysInput('')
        setAbstentionsInput('')
        setStartDateInput('')
        setEndDateInput('')
        setSummary('')
        setNoteInput('')
        setDateErrors({})
        setDateInputKey((prev) => prev + 1)
        requestAnimationFrame(() => scrollToTopAndFocusName())
      }
    },
    [
      canSubmit,
      name,
      validationProblem,
      mode,
      lawScope,
      scopeHistoricalCountryId,
      onSubmit,
      initial?.id,
      summary,
      articleParsed,
      paragraphParsed,
      startDateInput,
      endDateInput,
      noteInput,
      lawTypeId,
      passedChamberId,
      yeasInput,
      naysInput,
      abstentionsInput,
      scrollToTopAndFocusName,
    ],
  )

  useModalSubmitShortcut({
    enabled: isOpen && canSubmit,
    scrollContainerRef: formScrollRef,
    onSubmit: ({ continueAfterSave }) => {
      void handleSubmit({ continueAfterSave })
    },
  })

  const lawSections = [
    {
      id: LAW_FORM_SECTION_ID.basic,
      label: '기본 정보',
      badge: missingRequired.length === 0 ? '✓' : null,
    },
    {
      id: LAW_FORM_SECTION_ID.timing,
      label: '시행·조문',
      badge: timingFilledCount > 0 ? String(timingFilledCount) : null,
    },
    {
      id: LAW_FORM_SECTION_ID.narrative,
      label: '내용·경위',
      badge: narrativeFilledCount > 0 ? String(narrativeFilledCount) : null,
    },
  ]

  const basicSectionNode = (
    <FormS.FormGroupSection
      id={LAW_FORM_SECTION_ID.basic}
      aria-labelledby={`${LAW_FORM_SECTION_ID.basic}-title`}
    >
      <FormS.FormGroupTitle id={`${LAW_FORM_SECTION_ID.basic}-title`}>
        기본 정보
      </FormS.FormGroupTitle>

      <EventFormS.FormRow>
        <EventFormS.FormLabel htmlFor="country-law-name">
          명칭 <EventFormS.Required>*</EventFormS.Required>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <FormS.TitleInput
            ref={nameInputRef}
            id="country-law-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
            aria-required
            placeholder="예: 바이마르 헌법, 경국대전, 대헌장, 국가보안법"
          />
        </EventFormS.FormField>
      </EventFormS.FormRow>

      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div" id="country-law-type-label">
          법 분류<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          {lawTypeChipOptions.length > 0 ? (
            <ToneChipGroup
              ariaLabelledBy="country-law-type-label"
              value={lawTypeId}
              onChange={(next) => setLawTypeId(next)}
              options={lawTypeChipOptions}
              allowDeselect
            />
          ) : (
            <EventFormS.Hint>
              등록된 법 분류가 없습니다. 아래 버튼으로 헌법·법률·칙령·율령 등을 바로 추가할 수 있습니다.
            </EventFormS.Hint>
          )}

          {onCreateLawType ? (
            <>
              <FormS.OptionalRevealRow>
                <FormS.OptionalRevealBtn
                  type="button"
                  $open={inlineTypeOpen}
                  aria-expanded={inlineTypeOpen}
                  onClick={() => setInlineTypeOpen((prev) => !prev)}
                >
                  <FiPlus size={12} aria-hidden="true" />
                  <span>새 법 분류 추가</span>
                </FormS.OptionalRevealBtn>
              </FormS.OptionalRevealRow>

              {inlineTypeOpen ? (
                <InlineLawTypeBox>
                  <EventFormS.Input
                    id="country-law-inline-type-name"
                    aria-label="새 법 분류명"
                    value={newLawTypeName}
                    onChange={(event) => setNewLawTypeName(event.target.value)}
                    placeholder="예: 헌법, 법률, 시행령, 칙령, 율령, 조례"
                    autoComplete="off"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void handleCreateInlineLawType()
                      }
                    }}
                  />
                  <InlineLawTypeSaveBtn
                    type="button"
                    disabled={creatingLawType || !newLawTypeName.trim()}
                    onClick={() => {
                      void handleCreateInlineLawType()
                    }}
                  >
                    {creatingLawType ? '추가 중...' : '분류 저장'}
                  </InlineLawTypeSaveBtn>
                </InlineLawTypeBox>
              ) : null}
            </>
          ) : null}

          {lawTypeChipOptions.length > 0 ? (
            <EventFormS.Hint>
              선택한 칩을 다시 누르면 분류 선택이 해제됩니다.
            </EventFormS.Hint>
          ) : null}
        </EventFormS.FormField>
      </EventFormS.FormRow>

      {showHistoricalCountryPicker ? (
        <EventFormS.FormRow>
          <EventFormS.FormLabel htmlFor="country-law-historical-country">
            역사 국가<FormS.OptionalTag>(선택)</FormS.OptionalTag>
          </EventFormS.FormLabel>
          <EventFormS.FormField>
            <FormSelectNative
              id="country-law-historical-country"
              value={scopeHistoricalCountryId}
              onChange={(event) =>
                setScopeHistoricalCountryId(event.target.value)
              }
            >
              <option value="">(미지정 · 이 현대 국가에만 연결)</option>
              {[...historicalCountryOptions]
                .sort((left, right) =>
                  left.name.localeCompare(right.name, 'ko', {
                    sensitivity: 'base',
                  }),
                )
                .map((historical) => (
                  <option key={historical.id} value={historical.id}>
                    {historical.name}
                  </option>
                ))}
            </FormSelectNative>
            <EventFormS.Hint>
              과거 왕조·정체 시기에 제정된 율령·헌법이면 해당 역사 국가를 함께 지정합니다.
            </EventFormS.Hint>
          </EventFormS.FormField>
        </EventFormS.FormRow>
      ) : null}
    </FormS.FormGroupSection>
  )

  const timingSectionNode = (
    <FormS.FormGroupSection
      id={LAW_FORM_SECTION_ID.timing}
      aria-labelledby={`${LAW_FORM_SECTION_ID.timing}-title`}
    >
      <FormS.FormGroupTitle id={`${LAW_FORM_SECTION_ID.timing}-title`}>
        시행·조문
        {timingFilledCount > 0 ? (
          <FormS.FormGroupSummaryBadge>
            {timingFilledCount}칸
          </FormS.FormGroupSummaryBadge>
        ) : null}
      </FormS.FormGroupTitle>

      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div">
          시행 기간<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <FormS.DateRangeGrid key={dateInputKey}>
            <FormS.DateColumn>
              <FormS.SubTitleLabel>제정·시행일</FormS.SubTitleLabel>
              <YmdDateField
                anchorId={START_DATE_ANCHOR_ID}
                ariaLabel="제정·시행일"
                pickerTitle="제정·시행일 선택"
                value={startDateInput}
                onChange={setStartDateInput}
                onErrorChange={setDateError('start')}
              />
            </FormS.DateColumn>
            <FormS.DateColumn>
              <FormS.SubTitleLabel>폐지·종료일 (선택)</FormS.SubTitleLabel>
              <YmdDateField
                ariaLabel="폐지·종료일"
                pickerTitle="폐지·종료일 선택"
                value={endDateInput}
                onChange={setEndDateInput}
                onErrorChange={setDateError('end')}
                error={dateOrderInvalid}
                minDate={startDateInput || undefined}
              />
            </FormS.DateColumn>
          </FormS.DateRangeGrid>
          {dateOrderInvalid ? (
            <EventFormS.ErrorMessage role="alert">
              폐지·종료일({endDateInput})이 제정·시행일({startDateInput})보다 앞설 수 없습니다.
            </EventFormS.ErrorMessage>
          ) : (
            <EventFormS.Hint>
              현행 유지 중인 법령이면 폐지·종료일은 비워 둡니다.
            </EventFormS.Hint>
          )}
        </EventFormS.FormField>
      </EventFormS.FormRow>

      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div">
          조·항 번호<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <FormS.SubTitleGrid>
            <FormS.SubTitleField htmlFor="country-law-article">
              <FormS.SubTitleLabel>조 (제N조)</FormS.SubTitleLabel>
              <EventFormS.Input
                id="country-law-article"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={articleInput}
                onChange={(event) =>
                  setArticleInput(event.target.value.replace(/\D/g, ''))
                }
                placeholder="예: 1 · 숫자만 입력"
              />
            </FormS.SubTitleField>
            <FormS.SubTitleField htmlFor="country-law-paragraph">
              <FormS.SubTitleLabel>항 (제M항 · 선택)</FormS.SubTitleLabel>
              <EventFormS.Input
                id="country-law-paragraph"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={paragraphInput}
                onChange={(event) =>
                  setParagraphInput(event.target.value.replace(/\D/g, ''))
                }
                placeholder="예: 2 · 조 입력 후 작성"
              />
            </FormS.SubTitleField>
          </FormS.SubTitleGrid>
          {paragraphWithoutArticle ? (
            <EventFormS.ErrorMessage role="alert">
              항을 입력하려면 조 번호를 먼저 입력하세요.
            </EventFormS.ErrorMessage>
          ) : articleInvalid ? (
            <EventFormS.ErrorMessage role="alert">
              조 번호는 1 이상의 숫자만 입력할 수 있습니다.
            </EventFormS.ErrorMessage>
          ) : paragraphInvalid ? (
            <EventFormS.ErrorMessage role="alert">
              항 번호는 1 이상의 숫자만 입력할 수 있습니다.
            </EventFormS.ErrorMessage>
          ) : clausePreview ? (
            <EventFormS.Hint>
              표시 조문: <strong>{clausePreview}</strong>
            </EventFormS.Hint>
          ) : (
            <EventFormS.Hint>
              특정 조문을 가리킬 때 1 이상의 숫자만 입력합니다(예: 1 입력 시 제1조).
            </EventFormS.Hint>
          )}
        </EventFormS.FormField>
      </EventFormS.FormRow>

      {chambers.length > 0 ||
      passedChamberId ||
      yeasInput ||
      naysInput ||
      abstentionsInput ? (
        <EventFormS.FormRow>
          <EventFormS.FormLabel htmlFor="country-law-passed-chamber">
            의결 원·표결<FormS.OptionalTag>(선택)</FormS.OptionalTag>
          </EventFormS.FormLabel>
          <EventFormS.FormField>
            {sortedChambers.length > 0 ? (
              <FormSelectNative
                id="country-law-passed-chamber"
                value={passedChamberId}
                onChange={(event) => {
                  passedChamberManuallyTouchedRef.current = true
                  setPassedChamberId(event.target.value)
                }}
              >
                <option value="">(미지정 · 의결 원 기록 안 함)</option>
                {sortedChambers.map((chamber) => (
                  <option key={chamber.id} value={chamber.id}>
                    {chamberLabel(chamber)} · {labelChamberRole(chamber.role)}
                  </option>
                ))}
              </FormSelectNative>
            ) : null}
            {matchedPoliticalSystem ? (
              <EventFormS.Hint>
                활성 헌정 체제:{' '}
                <strong>
                  {matchedPoliticalSystem.name?.trim() || '헌정 체제'}
                </strong>
                {matchedPoliticalSystem.governmentForm
                  ? ` · ${GOVERNMENT_FORM_LABEL[matchedPoliticalSystem.governmentForm]}`
                  : ''}
                {matchedPoliticalSystem.legislatureType
                  ? ` · ${LEGISLATURE_TYPE_LABEL[matchedPoliticalSystem.legislatureType]}`
                  : ''}
              </EventFormS.Hint>
            ) : null}
            <FormS.SubTitleGrid
              style={{ marginTop: chambers.length > 0 ? 8 : 0 }}
            >
              <FormS.SubTitleField htmlFor="country-law-yeas">
                <FormS.SubTitleLabel>찬성(석)</FormS.SubTitleLabel>
                <EventFormS.Input
                  id="country-law-yeas"
                  type="text"
                  inputMode="numeric"
                  value={yeasInput}
                  onChange={(event) =>
                    setYeasInput(event.target.value.replace(/\D/g, ''))
                  }
                  placeholder="예: 198"
                />
              </FormS.SubTitleField>
              <FormS.SubTitleField htmlFor="country-law-nays">
                <FormS.SubTitleLabel>반대(석)</FormS.SubTitleLabel>
                <EventFormS.Input
                  id="country-law-nays"
                  type="text"
                  inputMode="numeric"
                  value={naysInput}
                  onChange={(event) =>
                    setNaysInput(event.target.value.replace(/\D/g, ''))
                  }
                  placeholder="예: 2"
                />
              </FormS.SubTitleField>
            </FormS.SubTitleGrid>
            <EventFormS.Hint>
              제헌국회·하원·상원 등 가결 의회와 표결 의석 수를 함께 남깁니다.
            </EventFormS.Hint>
          </EventFormS.FormField>
        </EventFormS.FormRow>
      ) : null}
    </FormS.FormGroupSection>
  )

  const narrativeSectionNode = (
    <FormS.FormGroupSection
      id={LAW_FORM_SECTION_ID.narrative}
      aria-labelledby={`${LAW_FORM_SECTION_ID.narrative}-title`}
    >
      <FormS.FormGroupTitle id={`${LAW_FORM_SECTION_ID.narrative}-title`}>
        내용·경위
        {narrativeFilledCount > 0 ? (
          <FormS.FormGroupSummaryBadge>
            {narrativeFilledCount}칸
          </FormS.FormGroupSummaryBadge>
        ) : null}
      </FormS.FormGroupTitle>

      <EventFormS.FormRow>
        <EventFormS.FormLabel htmlFor="country-law-summary">
          요약<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <EventFormS.Textarea
            id="country-law-summary"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="법령의 제정 취지·주요 규율 대상·핵심 조항 내용을 요약합니다 (선택)"
            rows={7}
          />
        </EventFormS.FormField>
      </EventFormS.FormRow>

      <EventFormS.FormRow>
        <EventFormS.FormLabel htmlFor="country-law-note">
          비고·제헌 경위<FormS.OptionalTag>(선택)</FormS.OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <EventFormS.Textarea
            id="country-law-note"
            value={noteInput}
            onChange={(event) => setNoteInput(event.target.value)}
            placeholder="예: 제헌의회 의결·국민투표 경위, 개정 연혁, 정당·선거 적용 맥락 등 (선택)"
            rows={5}
          />
        </EventFormS.FormField>
      </EventFormS.FormRow>
    </FormS.FormGroupSection>
  )

  const modalTitle = mode === 'create' ? '법령 등록' : '법령 수정'

  return (
    <RegisterModal
      isOpen={isOpen}
      onClose={() => {
        void requestClose()
      }}
      closeOnEsc={!saving}
      closeOnOverlayClick={!saving}
      trapFocus={false}
      initialFocusRef={mode === 'create' ? nameInputRef : undefined}
      title={modalTitle}
      headerActions={
        <HeaderActionsBar>
          <RegisterSectionJumpNav
            sections={lawSections}
            activeId={activeSectionId}
            onJump={jumpToSection}
          />
          {mode === 'create' && isDirty ? (
            <HeaderResetBtn
              type="button"
              disabled={saving}
              onClick={() => {
                void handleReset()
              }}
            >
              초기화
            </HeaderResetBtn>
          ) : null}
          <FormS.LayoutModeToggleBtn
            type="button"
            $active={layoutMode === 'split'}
            aria-pressed={layoutMode === 'split'}
            aria-label={
              layoutMode === 'split'
                ? '1단 세로 보기로 전환'
                : '2단 좌우 분할 보기로 전환'
            }
            title={
              layoutMode === 'split'
                ? '좌우 2단 분할 보기 중 (클릭 시 1단 세로 보기로 전환)'
                : '1단 세로 보기 중 (클릭 시 좌우 2단 분할 보기로 전환)'
            }
            onClick={toggleLayoutMode}
          >
            <FiColumns size={13} aria-hidden="true" />
            <span>{layoutMode === 'split' ? '2단 분할' : '1단 보기'}</span>
          </FormS.LayoutModeToggleBtn>
        </HeaderActionsBar>
      }
      maxWidth={
        layoutMode === 'split' ? 'min(1380px, 96vw)' : 'min(1000px, 96vw)'
      }
      minHeight="84vh"
      height={layoutMode === 'split' ? '86vh' : undefined}
      fullBleedOnMobile
    >
      <FormS.MilitaryModalFormScroll
        ref={formScrollRef}
        $layoutMode={layoutMode}
        onScroll={handleFormScroll}
        onScrollCapture={handleFormScroll}
      >
        {saving ? (
          <FormS.BusyBar role="status" aria-live="polite">
            {mode === 'create'
              ? '법령을 등록하는 중...'
              : '수정 사항을 저장하는 중...'}
          </FormS.BusyBar>
        ) : null}

        <EventFormS.FormSection>
          {layoutMode === 'split' ? (
            <LawHalfSplitGrid>
              <FormS.SplitColumnLeft id={LAW_SPLIT_LEFT_ID}>
                {basicSectionNode}
                {timingSectionNode}
              </FormS.SplitColumnLeft>
              <FormS.SplitColumnRight id={LAW_SPLIT_RIGHT_ID}>
                {narrativeSectionNode}
              </FormS.SplitColumnRight>
            </LawHalfSplitGrid>
          ) : (
            <>
              {basicSectionNode}
              {timingSectionNode}
              {narrativeSectionNode}
            </>
          )}
        </EventFormS.FormSection>
      </FormS.MilitaryModalFormScroll>

      <PersonRegisterModalStickyFooter>
        <RegisterFooterStatus
          missing={missingRequired}
          onJumpToMissing={focusFirstMissing}
          problem={validationProblem}
          readyLabel={mode === 'create' ? '등록 준비 완료' : '수정 준비 완료'}
          shortcuts={
            mode === 'create'
              ? [
                  { keys: '⌘↵', label: '저장' },
                  { keys: '⌘⇧↵', label: '등록 후 계속' },
                ]
              : [{ keys: '⌘↵', label: '저장' }]
          }
        />
        <FooterActions>
          <PersonRegisterModalCancelBtn
            type="button"
            onClick={() => {
              void requestClose()
            }}
            disabled={saving}
          >
            취소
          </PersonRegisterModalCancelBtn>
          {mode === 'create' ? (
            <PersonRegisterModalCancelBtn
              type="button"
              disabled={!canSubmit}
              title="저장 후 창을 닫지 않고 다음 법령을 이어서 등록합니다 (⌘/Ctrl + Shift + Enter)"
              onClick={() => {
                void handleSubmit({ continueAfterSave: true })
              }}
            >
              등록 후 계속
            </PersonRegisterModalCancelBtn>
          ) : null}
          <FormS.ModalPrimarySubmitBtn
            type="button"
            disabled={!canSubmit}
            title={
              missingRequired.length > 0
                ? `필수 입력: ${missingRequired.join(', ')}`
                : (validationProblem ?? '단축키: ⌘/Ctrl + Enter')
            }
            onClick={() => {
              void handleSubmit({ continueAfterSave: false })
            }}
          >
            {saving
              ? mode === 'create'
                ? '등록 중...'
                : '저장 중...'
              : mode === 'create'
                ? '법령 등록'
                : '저장'}
          </FormS.ModalPrimarySubmitBtn>
        </FooterActions>
      </PersonRegisterModalStickyFooter>
    </RegisterModal>
  )
}

const LawHalfSplitGrid = styled(FormS.SplitColumnsGrid)`
  @media (min-width: ${FormS.SPLIT_MIN_WIDTH}px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const InlineLawTypeBox = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.025)' : '#f8fafc'};

  > input {
    flex: 1 1 200px;
    min-width: 160px;
  }
`

const InlineLawTypeSaveBtn = styled.button`
  height: 38px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 0.14s ease,
    opacity 0.14s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.button.hover};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`
