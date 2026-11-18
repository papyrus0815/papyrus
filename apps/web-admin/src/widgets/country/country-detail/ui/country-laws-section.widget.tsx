import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiChevronRight,
  FiEdit2,
  FiPlus,
  FiSearch,
  FiTrash2,
} from 'react-icons/fi'
import styled, { useTheme } from 'styled-components'

import {
  BentoCard,
  BentoCardBadge,
  BentoCardBody,
  BentoCardHeader,
  BentoCardTitle,
  BentoCardTitleGroup,
  BentoGrid2Col,
  type SegmentSlice,
  StackedSegmentBar,
} from '@/entities/event/ui/bento-primitives'
import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerHairline,
  ledgerSubtleFill,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import {
  type LawRow,
  createLaw,
  createLawType,
  deleteLaw,
  getLawTypes,
  getLaws,
  updateLaw,
} from '@/shared/api/election'
import { confirm } from '@/shared/ui/confirm-dialog'
import { FormSidePanel } from '@/shared/ui/form-side-panel/form-side-panel'
import {
  FieldLabel,
  FieldRow,
  FormRows,
  Input,
  Required,
  Textarea,
} from '@/shared/ui/register-form-layout'
import {
  SelectModal,
  type SelectOption,
} from '@/shared/ui/select-modal/select-modal'
import { notify } from '@/shared/ui/toast'

import {
  EmptyHint,
  PoliticsTabPanel,
  RowIconBtn,
  SectionHeaderRow,
  SectionKicker,
  SectionLead,
  SubsectionAddBtn,
} from './country-politics-tab.styles'

function getLawTypeHierarchyRank(label: string): number {
  if (/헌법|기본법|대헌장|장전/.test(label)) return 0
  if (/법률|법전|율령|대전|통전/.test(label)) return 1
  if (/조약|협약|국제법/.test(label)) return 2
  if (/대통령령|칙령|시행령|정령|명령|교지/.test(label)) return 3
  if (/총리령|부령|시행규칙|규칙|조례|예규/.test(label)) return 4
  if (label === '미분류') return 9
  return 5
}

function parseLawSignedYear(raw: string | null | undefined): number | null {
  if (!raw) return null
  const match = String(raw).trim().match(/^(-?\d{1,4})/)
  if (match) {
    const parsed = parseInt(match[1], 10)
    if (Number.isFinite(parsed) && parsed !== 0) return parsed
  }
  const dateObj = new Date(raw)
  if (!Number.isNaN(dateObj.getTime())) {
    return dateObj.getUTCFullYear()
  }
  return null
}

function lawsScopeKey(input: {
  countryId?: string
  historicalCountryId?: string
}) {
  if (input.historicalCountryId)
    return `h:${input.historicalCountryId}` as const
  if (input.countryId) return `c:${input.countryId}` as const
  return '' as const
}

function listParams(input: {
  countryId?: string
  historicalCountryId?: string
}) {
  if (input.historicalCountryId)
    return { historicalCountryId: input.historicalCountryId }
  if (input.countryId) return { countryId: input.countryId }
  return {}
}

const qkLaws = (scopeKey: string) => ['laws', scopeKey] as const
const qkLawTypes = ['law-types'] as const

/** 숫자만 허용, 비어 있으면 null, 1 이상만 API로 전달 */
function parseClauseDigits(raw: string): number | null {
  const digitsOnly = raw.replace(/\D/g, '').trim()
  if (digitsOnly === '') return null
  const parsed = parseInt(digitsOnly, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return null
  return parsed
}

function formatClauseLabel(
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

function toDateInputString(raw: string | null | undefined): string {
  if (!raw) return ''
  const dateObj = new Date(raw)
  if (Number.isNaN(dateObj.getTime())) return ''
  const year = dateObj.getUTCFullYear()
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getUTCDate()).padStart(2, '0')
  return `${String(year).padStart(4, '0')}-${month}-${day}`
}

function formatLawDotDate(raw: string | null | undefined): string | null {
  if (!raw) return null
  const dateObj = new Date(raw)
  if (Number.isNaN(dateObj.getTime())) return null
  const year = dateObj.getUTCFullYear()
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getUTCDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

function formatLawDateBadge(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string | null {
  const startLabel = formatLawDotDate(startDate)
  const endLabel = formatLawDotDate(endDate)
  if (startLabel && endLabel) return `${startLabel} ~ ${endLabel}`
  if (startLabel) return `${startLabel} 시행`
  if (endLabel) return `~ ${endLabel} 폐지`
  return null
}

export function CountryLawsSection({
  countryId,
  historicalCountryId,
}: {
  countryId?: string
  historicalCountryId?: string
}) {
  const queryClient = useQueryClient()
  const scopeKey = lawsScopeKey({ countryId, historicalCountryId })
  const params = listParams({ countryId, historicalCountryId })

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<LawRow | null>(null)
  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [articleInput, setArticleInput] = useState('')
  const [paragraphInput, setParagraphInput] = useState('')
  const [startDateInput, setStartDateInput] = useState('')
  const [endDateInput, setEndDateInput] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [lawTypeId, setLawTypeId] = useState('')
  const [newLawTypeName, setNewLawTypeName] = useState('')
  const [lawTypeAddOpen, setLawTypeAddOpen] = useState(false)
  const [lawTypePickerOpen, setLawTypePickerOpen] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [searchParams] = useSearchParams()
  const highlightedLawId = searchParams.get('lawId')?.trim() || ''

  const reactFormId = useId()
  const formId = `country-law-form-${reactFormId.replace(/:/g, '')}`

  const resetEditorForm = useCallback(() => {
    setEditing(null)
    setName('')
    setSummary('')
    setArticleInput('')
    setParagraphInput('')
    setStartDateInput('')
    setEndDateInput('')
    setNoteInput('')
    setLawTypeId('')
  }, [])

  const { data: lawTypes = [], isLoading: lawTypesLoading } = useQuery({
    queryKey: qkLawTypes,
    queryFn: () => getLawTypes(),
  })

  const { data: rows = [], isLoading } = useQuery({
    queryKey: qkLaws(scopeKey),
    queryFn: () => getLaws(params as Record<string, string>),
    enabled: Boolean(scopeKey),
  })

  const sorted = useMemo(
    () =>
      [...rows].sort((left, right) => {
        const leftTime = left.startDate ? Date.parse(left.startDate) : NaN
        const rightTime = right.startDate ? Date.parse(right.startDate) : NaN
        const leftHasDate = Number.isFinite(leftTime)
        const rightHasDate = Number.isFinite(rightTime)
        if (leftHasDate && rightHasDate && leftTime !== rightTime) {
          return leftTime - rightTime
        }
        if (leftHasDate !== rightHasDate) {
          return leftHasDate ? -1 : 1
        }
        return left.name.localeCompare(right.name, 'ko')
      }),
    [rows],
  )

  useEffect(() => {
    if (!highlightedLawId || sorted.length === 0) return
    const targetLaw = sorted.find((row) => row.id === highlightedLawId)
    if (!targetLaw) return
    setTypeFilter('ALL')
    setSearchQuery('')
    const timer = window.setTimeout(() => {
      document
        .getElementById(`country-law-row-${highlightedLawId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 60)
    return () => window.clearTimeout(timer)
  }, [highlightedLawId, sorted])

  const theme = useTheme()
  const isDark = theme.mode === 'dark'

  const distinctTypeCount = useMemo(() => {
    const typeSet = new Set<string>()
    for (const row of sorted) {
      const key = row.lawType?.id ?? row.lawTypeId ?? ''
      if (key) typeSet.add(key)
    }
    return typeSet.size
  }, [sorted])

  const typeChipItems = useMemo(() => {
    const counts = new Map<string, { id: string; label: string; count: number }>()
    let untypedCount = 0
    for (const row of sorted) {
      const resolvedId = row.lawType?.id ?? row.lawTypeId ?? ''
      const resolvedLabel =
        row.lawType?.name ??
        lawTypes.find((lawType) => lawType.id === resolvedId)?.name ??
        ''
      if (!resolvedId || !resolvedLabel) {
        untypedCount += 1
        continue
      }
      const prev = counts.get(resolvedId)
      if (prev) {
        prev.count += 1
      } else {
        counts.set(resolvedId, {
          id: resolvedId,
          label: resolvedLabel,
          count: 1,
        })
      }
    }
    const items = [...counts.values()].sort((left, right) =>
      left.label.localeCompare(right.label, 'ko'),
    )
    if (untypedCount > 0) {
      items.push({ id: 'UNTYPED', label: '미분류', count: untypedCount })
    }
    return items
  }, [sorted, lawTypes])

  const lawInfographic = useMemo(() => {
    const palette = isDark
      ? ['#a5b4fc', '#38bdf8', '#34d399', '#fbbf24', '#c084fc', '#94a3b8']
      : ['#4f46e5', '#0284c7', '#059669', '#d97706', '#7c3aed', '#64748b']

    const hierarchySorted = [...typeChipItems].sort((left, right) => {
      const rLeft = getLawTypeHierarchyRank(left.label)
      const rRight = getLawTypeHierarchyRank(right.label)
      if (rLeft !== rRight) return rLeft - rRight
      return right.count - left.count
    })

    const lawTypeSlices: SegmentSlice[] = hierarchySorted.map((item, idx) => ({
      key: item.id,
      label: item.label,
      value: item.count,
      color:
        item.id === 'UNTYPED'
          ? palette[palette.length - 1]
          : palette[idx % (palette.length - 1)],
      meta: `${item.count}건`,
    }))

    const repealedCount = sorted.filter((row) => Boolean(row.endDate)).length
    const inForceCount = Math.max(0, sorted.length - repealedCount)

    const datedYears: number[] = []
    for (const row of sorted) {
      const y = parseLawSignedYear(row.startDate)
      if (y != null) datedYears.push(y)
    }

    let mode: 'decade' | 'century' = 'century'
    const bucketMap = new Map<
      number,
      { key: string; label: string; shortLabel: string; count: number }
    >()

    if (datedYears.length > 0) {
      const minY = Math.min(...datedYears)
      const maxY = Math.max(...datedYears)
      if (maxY - minY <= 160 && minY >= 1700) {
        mode = 'decade'
        for (const y of datedYears) {
          const d = Math.floor(y / 10) * 10
          const cur = bucketMap.get(d)
          if (cur) {
            cur.count += 1
          } else {
            bucketMap.set(d, {
              key: String(d),
              label: `${d}년대`,
              shortLabel: `'${String(d).slice(-2)}s`,
              count: 1,
            })
          }
        }
      } else {
        mode = 'century'
        for (const y of datedYears) {
          const c = y > 0 ? Math.ceil(y / 100) : -Math.ceil(Math.abs(y) / 100)
          const cur = bucketMap.get(c)
          if (cur) {
            cur.count += 1
          } else {
            bucketMap.set(c, {
              key: String(c),
              label: c > 0 ? `${c}세기` : `BC ${Math.abs(c)}세기`,
              shortLabel: c > 0 ? `${c}c` : `B${Math.abs(c)}c`,
              count: 1,
            })
          }
        }
      }
    }

    const buckets = [...bucketMap.entries()]
      .sort((left, right) => left[0] - right[0])
      .slice(-12)
      .map(([, val]) => val)
    const maxBucketCount = Math.max(0, ...buckets.map((b) => b.count))
    const peakBucket = buckets.reduce<{ label: string; count: number } | null>(
      (best, cur) => (!best || cur.count > best.count ? cur : best),
      null,
    )

    return {
      lawTypeSlices,
      inForceCount,
      repealedCount,
      mode,
      buckets,
      maxBucketCount,
      peakBucket,
      datedCount: datedYears.length,
      earliestYear: datedYears.length > 0 ? Math.min(...datedYears) : null,
    }
  }, [typeChipItems, sorted, isDark])

  const filteredRows = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()
    return sorted.filter((row) => {
      const rowTypeId = row.lawType?.id ?? row.lawTypeId ?? ''
      if (typeFilter === 'UNTYPED') {
        if (rowTypeId) return false
      } else if (typeFilter !== 'ALL') {
        if (rowTypeId !== typeFilter) return false
      }
      if (!keyword) return true
      const clauseLabel = formatClauseLabel(
        row.articleNumber,
        row.paragraphNumber,
      )
      return [
        row.name,
        row.lawType?.name,
        row.historicalCountry?.name,
        clauseLabel,
        row.summary,
        row.note,
      ].some((field) => field?.toLowerCase().includes(keyword))
    })
  }, [sorted, typeFilter, searchQuery])

  const lawTypeSelectOptions = useMemo((): SelectOption<string>[] => {
    const fromApi = lawTypes.map((typeItem) => ({
      value: typeItem.id,
      label: typeItem.name,
    }))
    const staleSelection =
      lawTypeId !== '' &&
      !lawTypes.some((typeItem) => typeItem.id === lawTypeId)
    const orphan: SelectOption<string>[] = staleSelection
      ? [{ value: lawTypeId, label: '(목록에 없는 분류)' }]
      : []
    return [{ value: '', label: '(분류 없음)' }, ...orphan, ...fromApi]
  }, [lawTypes, lawTypeId])

  const lawTypeButtonLabel = useMemo(() => {
    if (!lawTypeId) return '(분류 없음)'
    const found = lawTypes.find((typeItem) => typeItem.id === lawTypeId)
    if (found) return found.name
    if (lawTypesLoading) return '…'
    return '(목록에 없는 분류)'
  }, [lawTypeId, lawTypes, lawTypesLoading])

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['laws'] })
  }

  const lawTypeCreateMut = useMutation({
    mutationFn: () => createLawType({ name: newLawTypeName.trim() }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: qkLawTypes })
      setNewLawTypeName('')
      setLawTypeAddOpen(false)
      if (created?.id) setLawTypeId(created.id)
      notify.success('법 분류를 추가했습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  const createMut = useMutation({
    mutationFn: (body: Parameters<typeof createLaw>[0]) => createLaw(body),
    onSuccess: () => {
      invalidate()
      setEditorOpen(false)
      resetEditorForm()
      notify.success('법령을 등록했습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  const updateMut = useMutation({
    mutationFn: (body: Parameters<typeof updateLaw>[1]) =>
      updateLaw(editing!.id, body),
    onSuccess: () => {
      invalidate()
      setEditorOpen(false)
      resetEditorForm()
      notify.success('저장했습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteLaw(id),
    onSuccess: () => {
      invalidate()
      notify.success('삭제했습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  const openCreate = () => {
    resetEditorForm()
    setEditorOpen(true)
  }

  const openEdit = (row: LawRow) => {
    setEditing(row)
    setName(row.name ?? '')
    setSummary(row.summary ?? '')
    setArticleInput(row.articleNumber != null ? String(row.articleNumber) : '')
    setParagraphInput(
      row.paragraphNumber != null ? String(row.paragraphNumber) : '',
    )
    setStartDateInput(toDateInputString(row.startDate))
    setEndDateInput(toDateInputString(row.endDate))
    setNoteInput(row.note ?? '')
    setLawTypeId(row.lawTypeId ?? row.lawType?.id ?? '')
    setEditorOpen(true)
  }

  const busy = createMut.isPending || updateMut.isPending || deleteMut.isPending

  const submitLawForm = () => {
    if (!name.trim()) {
      notify.error('명칭을 입력하세요.')
      return
    }
    const article = parseClauseDigits(articleInput)
    const paragraph = parseClauseDigits(paragraphInput)
    if (articleInput.trim() !== '' && article == null) {
      notify.error('조 번호는 1 이상의 숫자만 입력할 수 있습니다.')
      return
    }
    if (paragraphInput.trim() !== '' && paragraph == null) {
      notify.error('항 번호는 1 이상의 숫자만 입력할 수 있습니다.')
      return
    }
    if (paragraph != null && article == null) {
      notify.error('항을 입력하려면 조 번호를 먼저 입력하세요.')
      return
    }

    const startDate = startDateInput.trim() || null
    const endDate = endDateInput.trim() || null
    if (startDate && endDate && Date.parse(endDate) < Date.parse(startDate)) {
      notify.error('폐지·종료일은 제정·시행일보다 빠를 수 없습니다.')
      return
    }

    const payload = {
      name: name.trim(),
      summary: summary.trim() || null,
      articleNumber: article,
      paragraphNumber: paragraph,
      startDate,
      endDate,
      note: noteInput.trim() || null,
      lawTypeId: lawTypeId || null,
      countryId: countryId ?? null,
      historicalCountryId: historicalCountryId ?? null,
    }

    if (editing) {
      updateMut.mutate({
        name: payload.name,
        summary: payload.summary,
        articleNumber: payload.articleNumber,
        paragraphNumber: payload.paragraphNumber,
        startDate: payload.startDate,
        endDate: payload.endDate,
        note: payload.note,
        lawTypeId: payload.lawTypeId,
      })
    } else {
      createMut.mutate(payload)
    }
  }

  const hasActiveFilter =
    typeFilter !== 'ALL' || searchQuery.trim().length > 0

  return (
    <CountryLawsSectionRoot>
      <LawsPoliticsTabPanel>
        <SectionHeaderRow>
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <SectionKicker>법령</SectionKicker>
            <SectionLead>
              이 국가의 헌법·법률·율령·조례 목록입니다. 조·항은 숫자만 입력하며,
              선거·정당 화면에서 여기 등록한 법령을 근거 법으로 연결합니다.
            </SectionLead>
          </div>
          <HeaderActionGroup>
            <HeaderGhostBtn
              type="button"
              onClick={() => setLawTypeAddOpen((prev) => !prev)}
              aria-expanded={lawTypeAddOpen}
            >
              <FiPlus size={14} strokeWidth={2.25} />법 분류 추가
            </HeaderGhostBtn>
            <SubsectionAddBtn type="button" onClick={openCreate}>
              <FiPlus size={15} strokeWidth={2.25} />
              법령 등록
            </SubsectionAddBtn>
          </HeaderActionGroup>
        </SectionHeaderRow>

        {lawTypeAddOpen ? (
          <LawTypeAddStrip>
            <LawTypeAddHint>
              새 법 분류(예: 헌법, 법률, 칙령, 율령, 시행령)를 저장하면 분류 선택 목록에 즉시 반영됩니다.
            </LawTypeAddHint>
            <LawTypeAddControls>
              <Input
                id="law-type-add-name"
                value={newLawTypeName}
                onChange={(changeEvent) =>
                  setNewLawTypeName(changeEvent.target.value)
                }
                placeholder="예: 법률, 시행령, 율령, 조례"
                autoComplete="off"
                style={{ flex: '1 1 200px', minWidth: 160, maxWidth: 380 }}
                onKeyDown={(keyEvent) => {
                  if (keyEvent.key === 'Enter') {
                    keyEvent.preventDefault()
                    if (newLawTypeName.trim() && !lawTypeCreateMut.isPending)
                      lawTypeCreateMut.mutate()
                  }
                }}
              />
              <LawTypeSaveBtn
                type="button"
                disabled={
                  lawTypeCreateMut.isPending || !newLawTypeName.trim()
                }
                onClick={() => lawTypeCreateMut.mutate()}
              >
                분류 저장
              </LawTypeSaveBtn>
            </LawTypeAddControls>
          </LawTypeAddStrip>
        ) : null}

        {!isLoading && sorted.length > 0 && (
          <BentoGrid2Col aria-label="법령 요약 인포그래픽">
            {/* Card 1: 법령 분류·위계 분포 */}
            <BentoCard>
              <BentoCardHeader>
                <BentoCardTitleGroup>
                  <BentoCardTitle>법령 분류 · 위계 분포</BentoCardTitle>
                  <BentoCardBadge>
                    총 {sorted.length.toLocaleString('ko-KR')}건 ·{' '}
                    {distinctTypeCount}종
                  </BentoCardBadge>
                </BentoCardTitleGroup>
              </BentoCardHeader>
              <BentoCardBody>
                <StackedSegmentBar
                  slices={lawInfographic.lawTypeSlices}
                  height={10}
                  showPercent
                />
                <LawBentoLegendList>
                  {lawInfographic.lawTypeSlices.map((slice) => {
                    const isActive = typeFilter === slice.key
                    return (
                      <LawBentoLegendBtn
                        key={slice.key}
                        type="button"
                        $active={isActive}
                        onClick={() =>
                          setTypeFilter((prev) =>
                            prev === slice.key ? 'ALL' : slice.key,
                          )
                        }
                      >
                        <LawBentoDot $color={slice.color} />
                        <span>{slice.label}</span>
                        <strong>{slice.meta}</strong>
                      </LawBentoLegendBtn>
                    )
                  })}
                </LawBentoLegendList>
                <LawBentoFooterLine>
                  <span>
                    현행·시행 유지{' '}
                    <strong>{lawInfographic.inForceCount}건</strong>
                  </span>
                  <span>
                    폐지·종료 명시{' '}
                    <strong>{lawInfographic.repealedCount}건</strong>
                  </span>
                </LawBentoFooterLine>
              </BentoCardBody>
            </BentoCard>

            {/* Card 2: 세기·연대별 제정 분포 미니 막대 차트 */}
            <BentoCard>
              <BentoCardHeader>
                <BentoCardTitleGroup>
                  <BentoCardTitle>
                    {lawInfographic.mode === 'decade'
                      ? '연대별 제정 분포'
                      : '세기별 제정 분포'}
                  </BentoCardTitle>
                  <BentoCardBadge>
                    {lawInfographic.datedCount > 0
                      ? `시행일 확인 ${lawInfographic.datedCount}건`
                      : '시행일 미기재'}
                  </BentoCardBadge>
                </BentoCardTitleGroup>
              </BentoCardHeader>
              <BentoCardBody>
                {lawInfographic.buckets.length > 0 ? (
                  <>
                    <LawHistBars role="img" aria-label="시기별 법령 제정 분포">
                      {lawInfographic.buckets.map((bucket) => {
                        const heightPct =
                          lawInfographic.maxBucketCount > 0
                            ? Math.max(
                                10,
                                (bucket.count /
                                  lawInfographic.maxBucketCount) *
                                  100,
                              )
                            : 10
                        const isPeak =
                          lawInfographic.peakBucket?.label === bucket.label
                        return (
                          <LawHistCol
                            key={bucket.key}
                            title={`${bucket.label}: ${bucket.count}건`}
                          >
                            <LawHistCount>{bucket.count}</LawHistCount>
                            <LawHistTrack>
                              <LawHistFill
                                $peak={isPeak}
                                style={{ height: `${heightPct}%` }}
                              />
                            </LawHistTrack>
                            <LawHistAxis>{bucket.shortLabel}</LawHistAxis>
                          </LawHistCol>
                        )
                      })}
                    </LawHistBars>
                    <LawBentoFooterLine>
                      <span>
                        {lawInfographic.earliestYear != null
                          ? `최초 제정: ${lawInfographic.earliestYear < 0 ? `BC ${Math.abs(lawInfographic.earliestYear)}` : lawInfographic.earliestYear}년`
                          : ''}
                      </span>
                      {lawInfographic.peakBucket && (
                        <span>
                          최다 제정기:{' '}
                          <strong>
                            {lawInfographic.peakBucket.label} (
                            {lawInfographic.peakBucket.count}건)
                          </strong>
                        </span>
                      )}
                    </LawBentoFooterLine>
                  </>
                ) : (
                  <LawHistEmpty>
                    법령의 제정·시행일을 입력하면 세기·연대별 제정 분포 막대 차트가 생성됩니다.
                  </LawHistEmpty>
                )}
              </BentoCardBody>
            </BentoCard>
          </BentoGrid2Col>
        )}

        <LawPanelBody>
          {isLoading ? (
            <EmptyHint>불러오는 중…</EmptyHint>
          ) : sorted.length === 0 ? (
            <LawsEmptySpecGrid>
              <LawsEmptySpecCell>
                <LawsEmptySpecTitle>
                  1. 헌법 · 법률 · 역사 율령 등록
                </LawsEmptySpecTitle>
                <LawsEmptySpecDesc>
                  국가의 기본 헌법, 주요 법률, 과거 왕조의 율령·법전(예: 경국대전, 대명률)과 핵심 조·항 번호 및 요약 설명을 등록합니다.
                </LawsEmptySpecDesc>
                <LawsEmptySpecAction type="button" onClick={openCreate}>
                  + 첫 법령 등록 →
                </LawsEmptySpecAction>
              </LawsEmptySpecCell>

              <LawsEmptySpecCell>
                <LawsEmptySpecTitle>
                  2. 법 분류 카탈로그 구성 및 선거·정당 연동
                </LawsEmptySpecTitle>
                <LawsEmptySpecDesc>
                  헌법·법률·시행령·칙령 등 법 분류를 먼저 구성해 두면 법령을 체계적으로 분류할 수 있으며, 선거·정당 탭에서 근거 법령으로 즉시 연결됩니다.
                </LawsEmptySpecDesc>
                <LawsEmptySpecAction
                  type="button"
                  onClick={() => setLawTypeAddOpen(true)}
                >
                  + 법 분류 추가 열기 →
                </LawsEmptySpecAction>
              </LawsEmptySpecCell>
            </LawsEmptySpecGrid>
          ) : (
            <>
              <LawsToolbar>
                <LawsFilterChipRow role="tablist" aria-label="법 분류 필터">
                  <LawsFilterChip
                    type="button"
                    role="tab"
                    aria-selected={typeFilter === 'ALL'}
                    $active={typeFilter === 'ALL'}
                    onClick={() => setTypeFilter('ALL')}
                  >
                    전체 <LawsFilterChipCount>{sorted.length}</LawsFilterChipCount>
                  </LawsFilterChip>
                  {typeChipItems.map((chip) => (
                    <LawsFilterChip
                      key={chip.id}
                      type="button"
                      role="tab"
                      aria-selected={typeFilter === chip.id}
                      $active={typeFilter === chip.id}
                      onClick={() => setTypeFilter(chip.id)}
                    >
                      {chip.label}{' '}
                      <LawsFilterChipCount>{chip.count}</LawsFilterChipCount>
                    </LawsFilterChip>
                  ))}
                </LawsFilterChipRow>

                <LawsToolbarRight>
                  {hasActiveFilter && (
                    <>
                      <LawsResultSummary>
                        검색 결과 {filteredRows.length}건
                      </LawsResultSummary>
                      <LawsResetBtn
                        type="button"
                        onClick={() => {
                          setTypeFilter('ALL')
                          setSearchQuery('')
                        }}
                      >
                        필터 초기화
                      </LawsResetBtn>
                    </>
                  )}
                  <LawsSearchBox>
                    <FiSearch size={13} />
                    <LawsSearchInput
                      type="search"
                      value={searchQuery}
                      onChange={(changeEvent) =>
                        setSearchQuery(changeEvent.target.value)
                      }
                      placeholder="법령명 · 분류 · 조문 · 요약 검색…"
                      aria-label="법령 검색"
                    />
                  </LawsSearchBox>
                </LawsToolbarRight>
              </LawsToolbar>

              {filteredRows.length === 0 ? (
                <LawsNoMatchLine>
                  선택한 법 분류나 검색어와 일치하는 법령이 없습니다.
                </LawsNoMatchLine>
              ) : (
                <LawsLedgerGrid>
                  {filteredRows.map((row) => {
                    const resolvedTypeLabel =
                      row.lawType?.name ??
                      (row.lawTypeId ? '(목록에 없는 분류)' : null)
                    const clauseLabel = formatClauseLabel(
                      row.articleNumber,
                      row.paragraphNumber,
                    )
                    const dateBadgeLabel = formatLawDateBadge(
                      row.startDate,
                      row.endDate,
                    )
                    const historicalPolityLabel =
                      !historicalCountryId && row.historicalCountry?.name
                        ? row.historicalCountry.name
                        : null
                    const summaryText = row.summary?.trim() || ''
                    const noteText = row.note?.trim() || ''

                    return (
                      <LawsLedgerRow
                        key={row.id}
                        id={`country-law-row-${row.id}`}
                        $highlighted={row.id === highlightedLawId}
                      >
                        <LawsLedgerMain>
                          <LawsTitleLine>
                            <LawName>{row.name}</LawName>
                            {resolvedTypeLabel && (
                              <LawTypeBadge>{resolvedTypeLabel}</LawTypeBadge>
                            )}
                            {historicalPolityLabel && (
                              <HistoricalPolityBadge>
                                {historicalPolityLabel}
                              </HistoricalPolityBadge>
                            )}
                            {dateBadgeLabel && (
                              <LawDateBadge>{dateBadgeLabel}</LawDateBadge>
                            )}
                            {clauseLabel && (
                              <ClauseBadge>{clauseLabel}</ClauseBadge>
                            )}
                          </LawsTitleLine>
                          <LawSummaryText $muted={!summaryText}>
                            {summaryText || '등록된 법령 요약 설명이 없습니다.'}
                          </LawSummaryText>
                          {noteText && <LawNoteText>{noteText}</LawNoteText>}
                        </LawsLedgerMain>

                        <LawsRowActions>
                          <RowIconBtn
                            type="button"
                            onClick={() => openEdit(row)}
                            aria-label="수정"
                            title="수정"
                          >
                            <FiEdit2 size={15} strokeWidth={2} />
                          </RowIconBtn>
                          <RowIconBtn
                            type="button"
                            $variant="danger"
                            disabled={deleteMut.isPending}
                            onClick={async () => {
                              if (
                                await confirm({
                                  title: '삭제 확인',
                                  message: `「${row.name}」을(를) 삭제할까요? 선거·정당에 연결된 경우 연결도 함께 해제됩니다.`,
                                  danger: true,
                                })
                              )
                                deleteMut.mutate(row.id)
                            }}
                            aria-label="삭제"
                            title="삭제"
                          >
                            <FiTrash2 size={15} strokeWidth={2} />
                          </RowIconBtn>
                        </LawsRowActions>
                      </LawsLedgerRow>
                    )
                  })}
                </LawsLedgerGrid>
              )}
            </>
          )}
        </LawPanelBody>

        <FormSidePanel
          isOpen={editorOpen}
          title={editing ? '법령 수정' : '법령 등록'}
          onClose={() => {
            if (!busy) {
              setEditorOpen(false)
              resetEditorForm()
            }
          }}
          submitLabel={editing ? '저장' : '등록'}
          formId={formId}
          submitDisabled={busy || !name.trim()}
          panelWidth={760}
        >
          <form
            id={formId}
            onSubmit={(submitEvent) => {
              submitEvent.preventDefault()
              submitLawForm()
            }}
          >
            <FormRows>
              <FieldRow>
                <FieldLabel htmlFor="country-law-name">
                  명칭 <Required>*</Required>
                </FieldLabel>
                <ModalFieldWide>
                  <Input
                    id="country-law-name"
                    value={name}
                    onChange={(changeEvent) =>
                      setName(changeEvent.target.value)
                    }
                    autoComplete="off"
                  />
                </ModalFieldWide>
              </FieldRow>
              <FieldRow>
                <FieldLabel id="country-law-type-label">법 분류</FieldLabel>
                <ModalFieldWide>
                  <LawTypePickerCard
                    type="button"
                    disabled={busy}
                    onClick={() => setLawTypePickerOpen(true)}
                    aria-labelledby="country-law-type-label"
                    aria-haspopup="dialog"
                    aria-expanded={lawTypePickerOpen}
                  >
                    <LawTypePickerValue>
                      {lawTypeButtonLabel}
                    </LawTypePickerValue>
                    <LawTypePickerGo aria-hidden>
                      <FiChevronRight size={20} strokeWidth={2} />
                    </LawTypePickerGo>
                  </LawTypePickerCard>
                </ModalFieldWide>
              </FieldRow>
              <FieldRow>
                <FieldLabel htmlFor="country-law-article">조</FieldLabel>
                <ModalFieldWide>
                  <ClauseInputWrap>
                    <Input
                      id="country-law-article"
                      inputMode="numeric"
                      value={articleInput}
                      onChange={(changeEvent) =>
                        setArticleInput(
                          changeEvent.target.value.replace(/\D/g, ''),
                        )
                      }
                      placeholder="1"
                      autoComplete="off"
                      style={{ width: 80, textAlign: 'center' }}
                      aria-describedby="country-law-article-hint"
                    />
                    <ClauseSuffix>조</ClauseSuffix>
                  </ClauseInputWrap>
                  <span
                    id="country-law-article-hint"
                    style={{
                      display: 'block',
                      marginTop: 6,
                      fontSize: 12,
                      color: 'var(--text-secondary, #64748b)',
                    }}
                  >
                    1조만 해당하면 숫자 <strong>1</strong>만 입력합니다.
                  </span>
                </ModalFieldWide>
              </FieldRow>
              <FieldRow>
                <FieldLabel htmlFor="country-law-paragraph">항</FieldLabel>
                <ModalFieldWide>
                  <ClauseInputWrap>
                    <Input
                      id="country-law-paragraph"
                      inputMode="numeric"
                      value={paragraphInput}
                      onChange={(changeEvent) =>
                        setParagraphInput(
                          changeEvent.target.value.replace(/\D/g, ''),
                        )
                      }
                      placeholder=""
                      autoComplete="off"
                      style={{ width: 80, textAlign: 'center' }}
                    />
                    <ClauseSuffix>항</ClauseSuffix>
                  </ClauseInputWrap>
                </ModalFieldWide>
              </FieldRow>
              <FieldRow>
                <FieldLabel htmlFor="country-law-start-date">
                  제정·시행일
                </FieldLabel>
                <ModalFieldWide>
                  <Input
                    id="country-law-start-date"
                    type="date"
                    value={startDateInput}
                    onChange={(changeEvent) =>
                      setStartDateInput(changeEvent.target.value)
                    }
                    style={{ maxWidth: 220 }}
                  />
                </ModalFieldWide>
              </FieldRow>
              <FieldRow>
                <FieldLabel htmlFor="country-law-end-date">
                  폐지·종료일
                </FieldLabel>
                <ModalFieldWide>
                  <Input
                    id="country-law-end-date"
                    type="date"
                    value={endDateInput}
                    onChange={(changeEvent) =>
                      setEndDateInput(changeEvent.target.value)
                    }
                    style={{ maxWidth: 220 }}
                  />
                </ModalFieldWide>
              </FieldRow>
              <FieldRow>
                <FieldLabel>요약</FieldLabel>
                <FullWidthControl>
                  <Textarea
                    value={summary}
                    onChange={(changeEvent) =>
                      setSummary(changeEvent.target.value)
                    }
                    rows={4}
                  />
                </FullWidthControl>
              </FieldRow>
              <FieldRow>
                <FieldLabel>비고·제헌 경위</FieldLabel>
                <FullWidthControl>
                  <Textarea
                    value={noteInput}
                    onChange={(changeEvent) =>
                      setNoteInput(changeEvent.target.value)
                    }
                    rows={2}
                    placeholder="예: 제헌의회 의결·국민투표 경위, 개정 연혁 등"
                  />
                </FullWidthControl>
              </FieldRow>
            </FormRows>
          </form>
        </FormSidePanel>

        <SelectModal
          isOpen={lawTypePickerOpen}
          onClose={() => setLawTypePickerOpen(false)}
          title="법 분류 선택"
          options={lawTypeSelectOptions}
          selectedValue={lawTypeId}
          onSelect={(value) => {
            setLawTypeId(typeof value === 'string' ? value : String(value))
            setLawTypePickerOpen(false)
          }}
        />
      </LawsPoliticsTabPanel>
    </CountryLawsSectionRoot>
  )
}

const ModalFieldWide = styled.div`
  grid-column: 2;
  min-width: 0;
  max-width: min(720px, 100%);
`

const FullWidthControl = styled.div`
  grid-column: 2;
  min-width: 0;
  max-width: 100%;
  width: 100%;
`

const ClauseInputWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const ClauseSuffix = styled.span`
  font-size: 15px;
  color: ${({ theme }) => theme.colors?.text?.secondary ?? '#64748b'};
  user-select: none;
`

const HeaderActionGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
`

const LawTypeAddStrip = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 14px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const LawTypeAddHint = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors?.text?.secondary ?? '#64748b'};
`

const LawTypeAddControls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`

const LawTypeSaveBtn = styled.button`
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  white-space: nowrap;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const LawTypePickerCard = styled.button`
  display: flex;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.background.secondary : '#fafafa'};
  transition:
    background 0.18s ease,
    border-color 0.18s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? theme.colors.background.tertiary : '#f4f4f5'};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const LawTypePickerValue = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.03em;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const LawTypePickerGo = styled.span`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.85;
`

const HeaderGhostBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: ${({ theme }) => theme.colors?.text?.secondary ?? '#64748b'};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors?.border?.default ?? '#cbd5e1'};
  border-radius: 8px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

const CountryLawsSectionRoot = styled.div`
  flex: 1 1 0%;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-self: stretch;
`

const LawsPoliticsTabPanel = styled(PoliticsTabPanel)`
  flex: 1 1 0%;
  gap: 18px;
  && {
    min-height: 0;
  }
`

const LawPanelBody = styled.div`
  flex: 1 1 0%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const LawsEmptySpecGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const LawsEmptySpecCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 20px 22px;

  &:first-child {
    border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  }

  @media (max-width: 768px) {
    &:first-child {
      border-right: none;
      border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
    }
  }
`

const LawsEmptySpecTitle = styled.div`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const LawsEmptySpecDesc = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LawsEmptySpecAction = styled.button`
  margin-top: 4px;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.hover};
  }
`

const LawsToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const LawsFilterChipRow = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

const LawsFilterChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.light};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const LawsFilterChipCount = styled.span`
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
`

const LawsToolbarRight = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const LawsResultSummary = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LawsResetBtn = styled.button`
  padding: 4px 8px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const LawsSearchBox = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: 240px;
  max-width: 100%;
  padding: 6px 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LawsSearchInput = styled.input`
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const LawsNoMatchLine = styled.div`
  padding: 24px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LawsLedgerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const LawsLedgerRow = styled.div<{ $highlighted?: boolean }>`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ $highlighted, theme }) =>
    $highlighted ? theme.colors.activeLight : 'transparent'};
  box-shadow: ${({ $highlighted, theme }) =>
    $highlighted ? `inset 3px 0 0 ${theme.colors.primary}` : 'none'};
  transition: background 0.14s ease;

  &:nth-child(odd) {
    border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  }

  &:last-child:nth-child(odd) {
    grid-column: 1 / -1;
    border-right: none;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }

  @media (max-width: 900px) {
    &:nth-child(odd) {
      border-right: none;
    }
  }
`

const LawsLedgerMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  flex: 1;
`

const LawsTitleLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const LawName = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const LawTypeBadge = styled.span`
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.activeLight};
`

const ClauseBadge = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const HistoricalPolityBadge = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
`

const LawDateBadge = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  border: 1px dashed ${({ theme }) => theme.colors.border.light};
`

const LawNoteText = styled.p`
  margin: 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LawSummaryText = styled.p<{ $muted?: boolean }>`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ $muted, theme }) =>
    $muted ? theme.colors.text.tertiary : theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const LawsRowActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`

const LawBentoLegendList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px 12px;
`

const LawBentoLegendBtn = styled.button<{ $active?: boolean }>`
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 6px;
  margin: -2px -6px;
  border: none;
  border-radius: ${RADIUS.XS};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  font-family: inherit;
  font-size: 11.5px;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  cursor: pointer;

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
    ${DIGIT_DISPLAY}
  }

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const LawBentoDot = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const LawBentoFooterLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 12px;
  padding-top: 6px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const LawHistBars = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  align-items: end;
  gap: 5px;
  height: 74px;
  padding-top: 4px;
`

const LawHistCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  height: 100%;
  min-width: 0;
`

const LawHistCount = styled.span`
  font-size: 9.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1;
  ${DIGIT_DISPLAY}
`

const LawHistTrack = styled.div`
  width: 100%;
  max-width: 24px;
  flex: 1;
  display: flex;
  align-items: flex-end;
  border-radius: ${RADIUS.XS} ${RADIUS.XS} 0 0;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const LawHistFill = styled.div<{ $peak?: boolean }>`
  width: 100%;
  border-radius: ${RADIUS.XS} ${RADIUS.XS} 0 0;
  background: ${({ theme, $peak }) =>
    $peak
      ? ledgerAccent(theme.mode)
      : theme.mode === 'dark'
        ? 'rgba(165, 180, 252, 0.42)'
        : 'rgba(79, 70, 229, 0.35)'};
`

const LawHistAxis = styled.span`
  font-size: 9.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1;
  white-space: nowrap;
  ${DIGIT_DISPLAY}
`

const LawHistEmpty = styled.div`
  padding: 16px 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

