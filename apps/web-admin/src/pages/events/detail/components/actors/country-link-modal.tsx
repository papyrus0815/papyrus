/**
 * 참여 국가 잇기 창 — 연관 탭 `RelatedLinkModal`과 동일한 2단 구조(왼쪽 고르기 · 오른쪽 정하기).
 *
 * - 왼쪽: 국가명·영문명·ISO 코드 검색 + 거르기(전체 · 역사적 국가 · 현대 국가 · 이은 것 숨기기)
 *   + 시대 일치 역사국가 상단 구획 + 새 역사국가 즉석 등록
 * - 오른쪽: 당사국 역할(`SegmentControl` + 뜻풀이) · 소속 진영 · 참여 형태 · 가담/이탈 시점 · 한 일/비고
 *   + 한 줄 문장 미리보기 + '연결' / '연결하고 계속' / '마지막 것 되돌리기'
 */
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiArrowLeft, FiExternalLink, FiPlus, FiSearch } from 'react-icons/fi'

import { EVENT_COUNTRY_ROLE_OPTIONS, type EventCountryRole } from '@/entities/event/model'
import { getStateTypeLabel } from '@/entities/historical-country/lib/utils'
import { getAllCountries } from '@/shared/api/countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import { formatCountryPeriod } from '@/shared/lib/country-period'
import {
  type CountryHintYearRange,
  filterCountriesByQuery,
  isHintYearRangeUsable,
  matchesHintYearRange,
} from '@/shared/lib/country-picker-filter'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  type CountryPickerHistoricalOption,
} from '@/shared/ui/country-picker'
import {
  HistoricalCountryCreateHost,
  useCanCreateHistoricalCountry,
} from '@/shared/ui/country-picker-create/historical-country-create'
import { Modal, ModalBody } from '@/shared/ui/modal'
import { SegmentControl } from '@/shared/ui/segment-control/segment-control'
import { notify } from '@/shared/ui/toast'

import {
  Actions,
  BackButton,
  Badge,
  CandidateRow,
  CandidateThumb,
  ChoicePill,
  ChoicePillRow,
  ComposePane,
  CreateButton,
  Empty,
  Field,
  FieldLabel,
  Filters,
  Hint,
  InlineTwoCol,
  koParticle,
  Layout,
  Linked,
  ListPane,
  ListScroll,
  NewEntityBtn,
  OpenLink,
  Picked,
  Placeholder,
  SearchBox,
  SearchRow,
  Section,
  SectionTitle,
  SegmentScroll,
  Sentence,
  UndoButton,
} from './actor-link-modal.styles'
import {
  type CountryRowData,
  countryRowKey,
  formatPointShort,
  parseCompactPoint,
  PARTICIPATION_LABEL,
} from './actors.lib'
import { type UpsertCountryInput } from './use-actor-mutations'

const VISIBLE_ROLE_OPTIONS = EVENT_COUNTRY_ROLE_OPTIONS.filter((option) => !option.deprecated)
const ROLE_MAP = new Map(EVENT_COUNTRY_ROLE_OPTIONS.map((option) => [option.value, option]))

const PARTICIPATION_SEGMENT_OPTIONS: Array<{
  value: NonNullable<CountryRowData['participation']>
  label: string
}> = [
  { value: 'FULL', label: '전면' },
  { value: 'LIMITED', label: '제한 참전' },
  { value: 'INDIRECT', label: '간접 지원' },
  { value: 'NON_COMBATANT', label: '비전투' },
]

interface CountryCandidateItem {
  rowKey: string
  id: string
  isHistorical: boolean
  name: string
  flagEmoji: string | null
  metaText: string | null
  eraMatch: boolean
}

interface CountryLinkDraft {
  rowKey: string
  id: string
  isHistorical: boolean
  name: string
  metaText: string | null
  isExisting: boolean
  role: EventCountryRole
  sideId: string
  participation: NonNullable<CountryRowData['participation']>
  joinText: string
  withdrawText: string
  roleDescription: string
  note: string
}

type CountryScopeFilter = 'all' | 'historical' | 'modern'

export interface CountryLinkModalProps {
  isOpen: boolean
  onClose: () => void
  eventTitle: string
  existingRows: CountryRowData[]
  hintYearRange?: CountryHintYearRange
  initialKind?: 'modern' | 'historical'
  sideOptions: Array<{ value: string; label: string; color?: string }>
  defaultSideId?: string | null
  /** 기존 국가 행에서 '참여 바꾸기'로 열었을 때 바로 고칠 rowKey(`m:...` | `h:...`) */
  initialRowKey?: string | null
  onSave: (input: UpsertCountryInput) => 'added' | 'updated'
  onRemove: (rowKey: string) => void
}

export function CountryLinkModal({
  isOpen,
  onClose,
  eventTitle,
  existingRows,
  hintYearRange,
  initialKind,
  sideOptions,
  defaultSideId = null,
  initialRowKey = null,
  onSave,
  onRemove,
}: CountryLinkModalProps) {
  const canCreateHistorical = useCanCreateHistoricalCountry()

  const {
    data: modernCountries = [],
    isLoading: modernLoading,
    isError: modernError,
    refetch: refetchModern,
  } = useQuery({
    queryKey: ['countries', 'all'],
    queryFn: getAllCountries,
    enabled: isOpen,
    staleTime: 5 * 60_000,
  })

  const {
    data: historicalCountries = [],
    isLoading: historicalLoading,
    isError: historicalError,
    refetch: refetchHistorical,
  } = useQuery({
    queryKey: ['historical-countries', 'all'],
    queryFn: getAllHistoricalCountries,
    enabled: isOpen,
    staleTime: 5 * 60_000,
  })

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<CountryScopeFilter>('all')
  const [hideLinked, setHideLinked] = useState(false)
  const [createHistOpen, setCreateHistOpen] = useState(false)
  const [createdExtras, setCreatedExtras] = useState<CountryPickerHistoricalOption[]>([])
  const [draft, setDraft] = useState<CountryLinkDraft | null>(null)
  const [linkedCount, setLinkedCount] = useState(0)
  const [lastLinked, setLastLinked] = useState<{ rowKey: string; name: string } | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLDivElement>(null)

  const existingByRowKey = useMemo(
    () => new Map(existingRows.map((row) => [countryRowKey(row), row])),
    [existingRows],
  )

  const buildDraft = (
    candidate: {
      rowKey: string
      id: string
      isHistorical: boolean
      name: string
      metaText: string | null
    },
    existingRow: CountryRowData | undefined,
  ): CountryLinkDraft => {
    if (existingRow) {
      return {
        rowKey: candidate.rowKey,
        id: candidate.id,
        isHistorical: candidate.isHistorical,
        name: candidate.name,
        metaText: candidate.metaText,
        isExisting: true,
        role: (existingRow.role ?? 'PARTICIPANT') as EventCountryRole,
        sideId: existingRow.sideId ?? 'none',
        participation: existingRow.participation ?? 'FULL',
        joinText: formatPointShort(existingRow.join) ?? '',
        withdrawText: formatPointShort(existingRow.withdraw) ?? '',
        roleDescription: existingRow.roleDescription ?? '',
        note: existingRow.note ?? '',
      }
    }
    return {
      rowKey: candidate.rowKey,
      id: candidate.id,
      isHistorical: candidate.isHistorical,
      name: candidate.name,
      metaText: candidate.metaText,
      isExisting: false,
      role: 'PARTICIPANT',
      sideId: defaultSideId ?? 'none',
      participation: 'FULL',
      joinText: '',
      withdrawText: '',
      roleDescription: '',
      note: '',
    }
  }

  useEffect(() => {
    if (!isOpen) return
    setQuery('')
    setFilter('all')
    setHideLinked(false)
    setCreateHistOpen(false)
    setCreatedExtras([])
    setLinkedCount(0)
    setLastLinked(null)

    if (initialRowKey) {
      const existingRow = existingByRowKey.get(initialRowKey)
      if (existingRow) {
        setDraft(
          buildDraft(
            {
              rowKey: initialRowKey,
              id: existingRow.id,
              isHistorical: existingRow.isHistorical,
              name: existingRow.name,
              metaText: existingRow.isHistorical ? '역사적 국가' : '현대 국가',
            },
            existingRow,
          ),
        )
        return
      }
    }
    setDraft(null)
  }, [isOpen, initialRowKey])

  const hintActive = isHintYearRangeUsable(hintYearRange)

  const allCandidates = useMemo<{
    eraHistorical: CountryCandidateItem[]
    otherHistorical: CountryCandidateItem[]
    modern: CountryCandidateItem[]
  }>(() => {
    const trimmed = query.trim()

    const mergedHistorical = [
      ...historicalCountries,
      ...createdExtras.filter(
        (extra) => !historicalCountries.some((hist) => hist.id === extra.id),
      ),
    ]

    const matchedHistorical = filterCountriesByQuery(mergedHistorical, trimmed)
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name, 'ko'))
      .map<CountryCandidateItem>((country) => {
        const rowKey = `h:${country.id}`
        const metaParts = [
          formatCountryPeriod(country),
          country.stateType ? getStateTypeLabel(country.stateType) : null,
          country.enName,
        ].filter(Boolean)
        return {
          rowKey,
          id: country.id,
          isHistorical: true,
          name: country.name,
          flagEmoji: null,
          metaText: metaParts.length > 0 ? metaParts.join(' · ') : '역사적 국가',
          eraMatch: Boolean(hintActive && matchesHintYearRange(country, hintYearRange)),
        }
      })
      .filter((item) => !hideLinked || !existingByRowKey.has(item.rowKey))

    const matchedModern = filterCountriesByQuery(modernCountries, trimmed)
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name, 'ko'))
      .map<CountryCandidateItem>((country) => {
        const rowKey = `m:${country.id}`
        const englishName = (country as { enName?: string | null }).enName ?? null
        const metaParts = [
          country.isoCode,
          country.capital ? `수도 ${country.capital}` : null,
          englishName,
        ].filter(Boolean)
        return {
          rowKey,
          id: country.id,
          isHistorical: false,
          name: country.name,
          flagEmoji: country.flagEmoji ?? null,
          metaText: metaParts.length > 0 ? metaParts.join(' · ') : '현대 국가',
          eraMatch: false,
        }
      })
      .filter((item) => !hideLinked || !existingByRowKey.has(item.rowKey))

    return {
      eraHistorical: matchedHistorical.filter((item) => item.eraMatch),
      otherHistorical: matchedHistorical.filter((item) => !item.eraMatch),
      modern: matchedModern,
    }
  }, [
    query,
    historicalCountries,
    createdExtras,
    modernCountries,
    hintActive,
    hintYearRange,
    hideLinked,
    existingByRowKey,
  ])

  const sections = useMemo(() => {
    const histSections = [
      {
        key: 'era-hist',
        title: '이 사건 시대에 존속한 역사국가',
        items: allCandidates.eraHistorical,
      },
      {
        key: 'other-hist',
        title: allCandidates.eraHistorical.length > 0 ? '그 밖의 역사국가' : '역사적 국가',
        items: allCandidates.otherHistorical,
      },
    ]
    const modernSection = {
      key: 'modern',
      title: '현대 국가',
      items: allCandidates.modern,
    }

    const ordered =
      filter === 'historical'
        ? histSections
        : filter === 'modern'
          ? [modernSection]
          : initialKind === 'historical' || hintActive
            ? [...histSections, modernSection]
            : [allCandidates.eraHistorical.length > 0 ? histSections[0] : modernSection, ...(allCandidates.eraHistorical.length > 0 ? [modernSection, histSections[1]] : histSections)]

    return ordered.filter((section) => section.items.length > 0)
  }, [filter, initialKind, hintActive, allCandidates])

  const choose = (candidate: CountryCandidateItem) => {
    const existingRow = existingByRowKey.get(candidate.rowKey)
    setDraft(buildDraft(candidate, existingRow))
    requestAnimationFrame(() =>
      composerRef.current
        ?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')
        ?.focus({ preventScroll: true }),
    )
  }

  const rowButtons = () => [
    ...(listRef.current?.querySelectorAll<HTMLButtonElement>('button[data-row]') ?? []),
  ]

  const moveFocus = (keyEvent: KeyboardEvent<HTMLElement>) => {
    if (keyEvent.key !== 'ArrowDown' && keyEvent.key !== 'ArrowUp') return
    const rows = rowButtons()
    if (rows.length === 0) return
    keyEvent.preventDefault()
    const index = rows.indexOf(document.activeElement as HTMLButtonElement)
    if (index < 0) {
      if (keyEvent.key === 'ArrowDown') rows[0].focus()
      return
    }
    const next = keyEvent.key === 'ArrowDown' ? index + 1 : index - 1
    if (next < 0) searchRef.current?.focus()
    else rows[Math.min(next, rows.length - 1)].focus()
  }

  const save = (keepOpen: boolean) => {
    if (!draft) return
    const parsedJoin = parseCompactPoint(draft.joinText)
    if (parsedJoin === 'invalid') {
      notify.error('중도 가담 시점 형식을 확인해 주세요 (예: 1917, 1917.4, 기원전 44)')
      return
    }
    const parsedWithdraw = parseCompactPoint(draft.withdrawText)
    if (parsedWithdraw === 'invalid') {
      notify.error('중도 이탈 시점 형식을 확인해 주세요 (예: 1918, 1918.3, 기원전 44)')
      return
    }

    const outcome = onSave({
      id: draft.id,
      isHistorical: draft.isHistorical,
      name: draft.name,
      role: draft.role,
      roleDescription: draft.roleDescription,
      note: draft.note,
      sideId: draft.sideId === 'none' ? null : draft.sideId,
      participation: draft.participation,
      join: parsedJoin,
      withdraw: parsedWithdraw,
    })

    if (keepOpen) {
      setLinkedCount((count) => count + 1)
      if (outcome === 'added') {
        setLastLinked({ rowKey: draft.rowKey, name: draft.name })
      }
      setDraft(null)
      requestAnimationFrame(() => searchRef.current?.focus())
    } else {
      onClose()
    }
  }

  const removeExisting = async () => {
    if (!draft?.isExisting) return
    const ok = await confirm({
      title: '참여국 연결을 끊을까요?',
      message: `‘${draft.name}’${koParticle(draft.name, '과/와')} 이 사건의 연결을 해제합니다. 국가 정보 자체는 그대로 남습니다.`,
      confirmLabel: '끊기',
      danger: true,
    })
    if (!ok) return
    onRemove(draft.rowKey)
    setDraft(null)
  }

  const undoLast = () => {
    if (!lastLinked) return
    onRemove(lastLinked.rowKey)
    setLinkedCount((count) => Math.max(0, count - 1))
    setLastLinked(null)
  }

  const roleOptionItems = useMemo(() => {
    const base = VISIBLE_ROLE_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
    }))
    if (draft && !base.some((item) => item.value === draft.role)) {
      const legacy = ROLE_MAP.get(draft.role)
      if (legacy) base.push({ value: legacy.value, label: legacy.label })
    }
    return base
  }, [draft])

  const selectedSideLabel = useMemo(() => {
    if (!draft || draft.sideId === 'none') return null
    return sideOptions.find((option) => option.value === draft.sideId)?.label ?? null
  }, [draft, sideOptions])

  const previewSentence = useMemo(() => {
    if (!draft) return ''
    const roleLabel = ROLE_MAP.get(draft.role)?.label ?? draft.role
    const qualifiers = [
      selectedSideLabel,
      draft.participation !== 'FULL' ? PARTICIPATION_LABEL[draft.participation] : null,
    ].filter(Boolean)
    const qualText = qualifiers.length > 0 ? `(${qualifiers.join(' · ')})` : ''
    return `‘${draft.name}’${qualText}${koParticle(draft.name, '을/를')} ‘${eventTitle}’의 ‘${roleLabel}’ 국가로 ${
      draft.isExisting ? '고칩니다' : '잇습니다'
    }.`
  }, [draft, selectedSideLabel, eventTitle])

  const isLoading = modernLoading || historicalLoading
  const hasError = modernError || historicalError
  const linkedTotal = existingByRowKey.size

  const modernNameOptions = useMemo(
    () => modernCountries.map(({ id, name }) => ({ id, name })),
    [modernCountries],
  )
  const historicalNameOptions = useMemo(
    () => historicalCountries.map(({ id, name }) => ({ id, name })),
    [historicalCountries],
  )

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="참여 국가 잇기"
        subtitle={
          <>
            ‘{eventTitle}’의 당사국 — 고르고, 역할·진영·한 일을 정합니다
            {linkedCount > 0 && <Linked> · 이번에 {linkedCount}건 이음</Linked>}
            {lastLinked && (
              <UndoButton
                type="button"
                onClick={undoLast}
                title={`‘${lastLinked.name}’ 연결 되돌리기`}
              >
                마지막 것 되돌리기
              </UndoButton>
            )}
          </>
        }
        maxWidth="min(1040px, 96vw)"
        initialFocusRef={initialRowKey ? undefined : searchRef}
        closeOnEsc={!createHistOpen}
      >
        <ModalBody>
          <Layout
            data-picked={draft ? '' : undefined}
            onKeyDownCapture={(keyEvent) => {
              if (
                createHistOpen ||
                keyEvent.key !== 'Escape' ||
                !draft ||
                keyEvent.defaultPrevented
              ) {
                return
              }
              keyEvent.preventDefault()
              keyEvent.stopPropagation()
              const previousKey = draft.rowKey
              setDraft(null)
              requestAnimationFrame(() =>
                rowButtons().find((row) => row.dataset.row === previousKey)?.focus(),
              )
            }}
          >
            <ListPane aria-label="국가 고르기">
              <SearchRow>
                <SearchBox>
                  <FiSearch aria-hidden />
                  <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    placeholder="국가명 · 영문명 · ISO 코드로 찾기"
                    aria-label="국가 검색"
                    onChange={(changeEvent) => setQuery(changeEvent.target.value)}
                    onKeyDown={moveFocus}
                  />
                </SearchBox>
                {canCreateHistorical && (
                  <NewEntityBtn
                    type="button"
                    onClick={() => setCreateHistOpen(true)}
                    title="목록에 없는 역사적 국가를 등록합니다"
                  >
                    <FiPlus size={13} aria-hidden />새 역사국가
                  </NewEntityBtn>
                )}
              </SearchRow>

              <Filters role="group" aria-label="국가 분류 거르기">
                <button
                  type="button"
                  aria-pressed={filter === 'all'}
                  onClick={() => setFilter('all')}
                >
                  전체
                </button>
                <button
                  type="button"
                  aria-pressed={filter === 'historical'}
                  onClick={() => setFilter('historical')}
                >
                  역사적 국가
                </button>
                <button
                  type="button"
                  aria-pressed={filter === 'modern'}
                  onClick={() => setFilter('modern')}
                >
                  현대 국가
                </button>
                {linkedTotal > 0 && (
                  <label>
                    <input
                      type="checkbox"
                      checked={hideLinked}
                      onChange={(changeEvent) => setHideLinked(changeEvent.target.checked)}
                    />
                    이은 것 숨기기 {linkedTotal}
                  </label>
                )}
              </Filters>

              <ListScroll ref={listRef} onKeyDown={moveFocus}>
                {hasError ? (
                  <Empty>
                    국가 목록을 불러오지 못했습니다.{' '}
                    <button
                      type="button"
                      onClick={() => {
                        void refetchModern()
                        void refetchHistorical()
                      }}
                    >
                      다시 시도
                    </button>
                  </Empty>
                ) : isLoading ? (
                  <Empty>국가 목록을 불러오는 중…</Empty>
                ) : sections.length === 0 ? (
                  <Empty>
                    {query.trim()
                      ? `‘${query.trim()}’에 맞는 국가가 없습니다.`
                      : '고를 국가가 없습니다.'}
                    {canCreateHistorical && (
                      <CreateButton type="button" onClick={() => setCreateHistOpen(true)}>
                        <FiPlus aria-hidden /> 새 역사국가 등록
                      </CreateButton>
                    )}
                  </Empty>
                ) : (
                  sections.map((section) => (
                    <Section key={section.key} aria-label={section.title}>
                      <SectionTitle>
                        {section.title}
                        <span>{section.items.length}</span>
                      </SectionTitle>
                      <ul>
                        {section.items.map((candidate) => {
                          const selected = draft?.rowKey === candidate.rowKey
                          const existing = existingByRowKey.get(candidate.rowKey)
                          const existingRoleLabel = existing
                            ? (ROLE_MAP.get((existing.role ?? 'PARTICIPANT') as EventCountryRole)
                                ?.label ?? '참여')
                            : null

                          return (
                            <li key={candidate.rowKey}>
                              <CandidateRow
                                type="button"
                                data-row={candidate.rowKey}
                                aria-pressed={selected}
                                onClick={() => choose(candidate)}
                              >
                                <CandidateThumb aria-hidden>
                                  {candidate.flagEmoji || candidate.name.charAt(0)}
                                </CandidateThumb>
                                <span className="main">
                                  <span className="title">
                                    <span>{candidate.name}</span>
                                  </span>
                                  {candidate.metaText && (
                                    <span className="sub">{candidate.metaText}</span>
                                  )}
                                </span>
                                {existingRoleLabel && (
                                  <Badge title="이미 이은 국가 — 고르면 참여 내용을 고칩니다">
                                    {existingRoleLabel}
                                  </Badge>
                                )}
                              </CandidateRow>
                            </li>
                          )
                        })}
                      </ul>
                    </Section>
                  ))
                )}
              </ListScroll>
            </ListPane>

            <ComposePane ref={composerRef} aria-label="참여 내용 정하기">
              {!draft ? (
                <Placeholder>
                  <strong>왼쪽에서 국가를 고르세요</strong>
                  <span>
                    사건에서의 역할(주도·대상·중재 등)과 진영, 수행한 행동을 한 번에 정해 잇습니다.
                  </span>
                </Placeholder>
              ) : (
                <>
                  <BackButton type="button" onClick={() => setDraft(null)}>
                    <FiArrowLeft aria-hidden /> 목록
                  </BackButton>

                  <Picked>
                    <span className="eyebrow">
                      {draft.isExisting ? '이은 국가 고치기' : '이을 국가'}
                    </span>
                    <strong>{draft.name}</strong>
                    {draft.metaText && <span className="meta">{draft.metaText}</span>}
                    <OpenLink
                      href={pathKeys.countryDetail(draft.id)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      상세 새 탭 <FiExternalLink aria-hidden />
                    </OpenLink>
                  </Picked>

                  <Field>
                    <FieldLabel>역할</FieldLabel>
                    <SegmentScroll>
                      <SegmentControl
                        value={draft.role}
                        onChange={(value) =>
                          setDraft({ ...draft, role: value as EventCountryRole })
                        }
                        options={roleOptionItems}
                        ariaLabel="국가 역할"
                      />
                    </SegmentScroll>
                    {ROLE_MAP.get(draft.role)?.hint && (
                      <Hint>{ROLE_MAP.get(draft.role)?.hint}</Hint>
                    )}
                  </Field>

                  {sideOptions.length > 1 && (
                    <Field>
                      <FieldLabel>소속 진영</FieldLabel>
                      <ChoicePillRow role="radiogroup" aria-label="소속 진영">
                        {sideOptions.map((option) => {
                          const selected = draft.sideId === option.value
                          return (
                            <ChoicePill
                              key={option.value}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              $selected={selected}
                              $dotColor={option.color}
                              onClick={() => setDraft({ ...draft, sideId: option.value })}
                            >
                              {option.color && <span className="dot" aria-hidden />}
                              {option.value === 'none' ? '진영 미지정' : option.label}
                            </ChoicePill>
                          )
                        })}
                      </ChoicePillRow>
                    </Field>
                  )}

                  <Field>
                    <FieldLabel>참여 형태</FieldLabel>
                    <SegmentScroll>
                      <SegmentControl
                        value={draft.participation}
                        onChange={(value) =>
                          setDraft({
                            ...draft,
                            participation: value as NonNullable<CountryRowData['participation']>,
                          })
                        }
                        options={PARTICIPATION_SEGMENT_OPTIONS}
                        ariaLabel="참여 형태"
                      />
                    </SegmentScroll>
                  </Field>

                  <InlineTwoCol>
                    <Field>
                      <FieldLabel>중도 가담 시점 (선택)</FieldLabel>
                      <input
                        type="text"
                        value={draft.joinText}
                        placeholder="예: 1917.4"
                        aria-label="중도 가담 시점"
                        onChange={(changeEvent) =>
                          setDraft({ ...draft, joinText: changeEvent.target.value })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel>중도 이탈 시점 (선택)</FieldLabel>
                      <input
                        type="text"
                        value={draft.withdrawText}
                        placeholder="예: 1918.3"
                        aria-label="중도 이탈 시점"
                        onChange={(changeEvent) =>
                          setDraft({ ...draft, withdrawText: changeEvent.target.value })
                        }
                      />
                    </Field>
                  </InlineTwoCol>

                  <Sentence aria-live="polite">{previewSentence}</Sentence>

                  <Field>
                    <FieldLabel>이 나라가 한 일</FieldLabel>
                    <textarea
                      value={draft.roleDescription}
                      onChange={(changeEvent) =>
                        setDraft({ ...draft, roleDescription: changeEvent.target.value })
                      }
                      placeholder="이 사건에서 수행한 역할·행동을 적어 주세요 (선택, *강조*는 굵게 표시)"
                      rows={3}
                      aria-label="이 나라가 한 일"
                      onKeyDown={(keyEvent) => {
                        if (keyEvent.key === 'Enter' && (keyEvent.metaKey || keyEvent.ctrlKey)) {
                          keyEvent.preventDefault()
                          save(false)
                        }
                      }}
                    />
                  </Field>

                  <Field>
                    <FieldLabel>비고 · 출처</FieldLabel>
                    <textarea
                      value={draft.note}
                      onChange={(changeEvent) =>
                        setDraft({ ...draft, note: changeEvent.target.value })
                      }
                      placeholder="근거 · 참고 설명 (선택)"
                      rows={2}
                      aria-label="비고 및 출처"
                      onKeyDown={(keyEvent) => {
                        if (keyEvent.key === 'Enter' && (keyEvent.metaKey || keyEvent.ctrlKey)) {
                          keyEvent.preventDefault()
                          save(false)
                        }
                      }}
                    />
                  </Field>

                  <Actions>
                    {draft.isExisting && (
                      <button type="button" data-danger onClick={() => void removeExisting()}>
                        연결 끊기
                      </button>
                    )}
                    <button type="button" onClick={() => setDraft(null)}>
                      다른 국가 고르기
                    </button>
                    {!draft.isExisting && (
                      <button type="button" onClick={() => save(true)}>
                        연결하고 계속
                      </button>
                    )}
                    <button
                      type="button"
                      data-primary
                      title="⌘/Ctrl+Enter"
                      onClick={() => save(false)}
                    >
                      {draft.isExisting ? '고치기' : '연결'}
                    </button>
                  </Actions>
                </>
              )}
            </ComposePane>
          </Layout>
        </ModalBody>
      </Modal>

      <HistoricalCountryCreateHost
        isOpen={createHistOpen}
        onClose={() => setCreateHistOpen(false)}
        modernCountries={modernNameOptions}
        historicalCountries={historicalNameOptions}
        onCreated={(created) => {
          setCreateHistOpen(false)
          setCreatedExtras((previous) => [...previous, created])
          const rowKey = `h:${created.id}`
          setDraft(
            buildDraft(
              {
                rowKey,
                id: created.id,
                isHistorical: true,
                name: created.name,
                metaText: '역사적 국가',
              },
              undefined,
            ),
          )
        }}
      />
    </>
  )
}
