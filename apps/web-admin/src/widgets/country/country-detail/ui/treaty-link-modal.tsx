import React from 'react'

import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import {
  FiCalendar,
  FiChevronDown,
  FiGlobe,
  FiLayers,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiTrash2,
} from 'react-icons/fi'
import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { type AdministrativeDivision, cityApi } from '@/shared/api/city'
import type { CountryResponseDto } from '@/shared/api/countries'
import { getAllCountries } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import { personCareerApi } from '@/shared/api/person-career'
import type { PersonResponseDto } from '@/shared/api/persons'
import {
  TREATY_PARTICIPATION_LABELS,
  TREATY_TYPE_LABELS,
  type TreatyDto,
  type TreatyParticipationType,
  type TreatyType,
  treatyApi,
} from '@/shared/api/treaty'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog'
import { CountrySelectModal } from '@/shared/ui/country-select-modal/country-select-modal'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { PersonSelectField } from '@/shared/ui/form-fields/person-select-field'
import {
  DateFieldBtn,
  DateFieldsRow,
  FieldControl,
  FieldHint,
  FieldLabel,
  FieldRow,
  FormRows,
  FormSectionInner,
  Input as RegisterInput,
  Required,
  SubmitButton,
  TabButton,
  TabNavigation,
  Textarea,
} from '@/shared/ui/register-form-layout'
import { SelectModal } from '@/shared/ui/select-modal/select-modal'
import { SidePanel } from '@/shared/ui/side-panel'
import { CABINET_SECTION_MAIN as MAIN } from './cabinets-section.constants'
import { getPersonName } from './cabinets-section.helpers'
import * as CabS from './cabinets-section.styled'

/** 조약 모달 — 관직 정의 목록 (getPositionDefinitions 응답) */
type TreatyPositionDefinitionItem = {
  id: string
  title: string
  titleEn?: string | null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 조약 연결 모달 — 인물 등록 폼과 동일 FieldRow 레이아웃 + 조약·서명 정보 전체 입력
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export interface TreatyLinkModalProps {
  cabinetId: string
  country: UnifiedCountry
  countryId?: string | null
  historicalCountryId?: string | null
  cabinets: any[]
  allPersons: PersonResponseDto[]
  currentTreaties: TreatyDto[]
  isDark: boolean
  onClose: () => void
  onLinked: () => Promise<void>
}

export function TreatyLinkModal({
  cabinetId,
  country,
  countryId,
  historicalCountryId,
  cabinets,
  allPersons,
  currentTreaties,
  isDark,
  onClose,
  onLinked,
}: TreatyLinkModalProps) {
  const cabPalette = getCabinetsSectionPalette(isDark)

  type TreatyDateField =
    | 'signDate'
    | 'effectiveDate'
    | 'expiryDate'
    | 'violationDate'
  type DatePickerCtx =
    | { kind: 'treaty'; field: TreatyDateField }
    | { kind: 'signedAt'; rowIndex: number }
    | null

  type DraftSignatoryRow = {
    id: string
    countryId: string | null
    historicalCountryId: string | null
    countryLabel: string
    cabinetId: string | null
    personId: string | null
    /** 행정부 관직 정의 (선택) */
    positionDefinitionId: string | null
    /** 직책 직접 입력 (선택, 마스터와 병행 가능) */
    role: string
    /** UI: 관직 정의 ↔ 직접 입력 — 한쪽만 표시 */
    positionInputMode: 'definition' | 'free'
    participationType: TreatyParticipationType
    signedAt: string
    note: string
  }

  const makeSignatoryRow = React.useCallback((): DraftSignatoryRow => {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    return {
      id,
      countryId: countryId ?? null,
      historicalCountryId: historicalCountryId ?? null,
      countryLabel: country.name,
      cabinetId,
      personId: null,
      positionDefinitionId: null,
      role: '',
      positionInputMode: 'definition',
      participationType: 'SIGNATORY',
      signedAt: '',
      note: '',
    }
  }, [cabinetId, country.name, countryId, historicalCountryId])

  const [tab, setTab] = React.useState<'link' | 'new'>('new')
  const [newSubTab, setNewSubTab] = React.useState<
    'basic' | 'dates' | 'narrative' | 'signatory'
  >('basic')
  const [datePickerContext, setDatePickerContext] =
    React.useState<DatePickerCtx>(null)
  const [personPickerRowIndex, setPersonPickerRowIndex] = React.useState<
    number | null
  >(null)
  const [countryPickerRowIndex, setCountryPickerRowIndex] = React.useState<
    number | null
  >(null)
  const [positionPickerRowIndex, setPositionPickerRowIndex] = React.useState<
    number | null
  >(null)
  /** 서명 장소 행정구역 — 국가(현대) 기준 목록 */
  const [signingVenueCountryId, setSigningVenueCountryId] = React.useState('')
  const [signingAdministrativeDivisionId, setSigningAdministrativeDivisionId] =
    React.useState<string | null>(null)
  const [signingAdminDivisionLabel, setSigningAdminDivisionLabel] =
    React.useState('')
  const [signingAdminDivisions, setSigningAdminDivisions] = React.useState<
    AdministrativeDivision[]
  >([])
  const [showSigningVenueCountryModal, setShowSigningVenueCountryModal] =
    React.useState(false)
  const [showSigningDivisionModal, setShowSigningDivisionModal] =
    React.useState(false)
  /** 서명 장소: 직접 입력 ↔ 행정구역 DB — 한쪽만 표시 */
  const [signingVenueInputMode, setSigningVenueInputMode] = React.useState<
    'text' | 'division'
  >('text')

  const [signatoryRows, setSignatoryRows] = React.useState<DraftSignatoryRow[]>(
    () => [makeSignatoryRow()],
  )

  const { data: treatyModernCountries = [] } = useQuery({
    queryKey: ['treaty-modal-countries'],
    queryFn: () => getAllCountries(),
    staleTime: 60_000,
  })
  const { data: treatyHistoricalCountries = [] } = useQuery({
    queryKey: ['treaty-modal-hist-countries'],
    queryFn: () => getAllHistoricalCountries(),
    staleTime: 60_000,
  })
  const { data: treatyPositionDefinitions = [] } = useQuery<
    TreatyPositionDefinitionItem[]
  >({
    queryKey: [
      'treaty-modal-position-definitions',
      countryId,
      historicalCountryId,
    ],
    queryFn: () =>
      personCareerApi.getPositionDefinitions({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
      }) as Promise<TreatyPositionDefinitionItem[]>,
    staleTime: 60_000,
  })

  const [allTreaties, setAllTreaties] = React.useState<TreatyDto[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQ, setSearchQ] = React.useState('')
  const debouncedSearchQ = useDebouncedValue(searchQ, 280)
  const [linking, setLinking] = React.useState(false)
  const [treatyCloseConfirmOpen, setTreatyCloseConfirmOpen] =
    React.useState(false)
  const [selectedTreatyForLink, setSelectedTreatyForLink] =
    React.useState<TreatyDto | null>(null)

  /** 기존 조약 연결: 현재 국가 1행만 사용 */
  React.useEffect(() => {
    if (tab !== 'link') return
    setSignatoryRows(() => [
      {
        ...makeSignatoryRow(),
        countryId: countryId ?? null,
        historicalCountryId: historicalCountryId ?? null,
        countryLabel: country.name,
        cabinetId,
      },
    ])
  }, [
    tab,
    countryId,
    historicalCountryId,
    cabinetId,
    country.name,
    makeSignatoryRow,
  ])

  React.useEffect(() => {
    setSignatoryRows((rows) => {
      if (rows.length === 0) return [makeSignatoryRow()]
      const [first, ...rest] = rows
      if (tab === 'link') return rows
      const matchesContext =
        country.type === 'modern'
          ? first.countryId === countryId && !first.historicalCountryId
          : first.historicalCountryId === historicalCountryId
      if (matchesContext && first.cabinetId !== cabinetId) {
        return [{ ...first, cabinetId }, ...rest]
      }
      return rows
    })
  }, [
    cabinetId,
    country.type,
    countryId,
    historicalCountryId,
    makeSignatoryRow,
    tab,
  ])

  const [name, setName] = React.useState('')
  const [alias, setAlias] = React.useState('')
  const [type, setType] = React.useState<TreatyType>('NON_AGGRESSION')
  const [signDate, setSignDate] = React.useState('')
  const [effectiveDate, setEffectiveDate] = React.useState('')
  const [expiryDate, setExpiryDate] = React.useState('')
  const [violationDate, setViolationDate] = React.useState('')
  const [violationReason, setViolationReason] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [summary, setSummary] = React.useState('')
  const [background, setBackground] = React.useState('')
  const [aftermath, setAftermath] = React.useState('')
  const [creating, setCreating] = React.useState(false)

  React.useEffect(() => {
    if (countryId && country.type === 'modern') {
      setSigningVenueCountryId(countryId)
    }
  }, [countryId, country.type])

  React.useEffect(() => {
    if (!signingVenueCountryId) {
      setSigningAdminDivisions([])
      return
    }
    cityApi
      .getAdministrativeDivisions(signingVenueCountryId)
      .then(setSigningAdminDivisions)
      .catch(() => setSigningAdminDivisions([]))
  }, [signingVenueCountryId])

  const formatIsoDateLabel = (iso: string) => {
    if (!iso?.trim()) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  React.useEffect(() => {
    setLoading(true)
    treatyApi
      .getAll(
        countryId
          ? { countryId }
          : historicalCountryId
            ? { historicalCountryId }
            : {},
      )
      .then((r) => setAllTreaties(r.items))
      .catch(() => setAllTreaties([]))
      .finally(() => setLoading(false))
  }, [countryId, historicalCountryId])

  const linkedIds = new Set(currentTreaties.map((t) => t.id))
  const filtered = allTreaties
    .filter((t) => !linkedIds.has(t.id))
    .filter((t) => {
      const q = debouncedSearchQ.trim().toLowerCase()
      if (!q) return true
      return (
        t.name.toLowerCase().includes(q) ||
        (t.alias ?? '').toLowerCase().includes(q)
      )
    })

  /** 직위: 관직 정의(DB) ↔ 당시 호칭(직접 입력) 둘 중 하나만 전송 */
  const rowToApiPayload = (row: DraftSignatoryRow) => {
    const roleTrim = row.role.trim()
    let positionDefinitionId: string | null = null
    let role: string | null = null
    if (row.positionInputMode === 'definition') {
      positionDefinitionId = row.positionDefinitionId
      role = null
    } else if (roleTrim) {
      role = roleTrim
      positionDefinitionId = null
    }
    return {
      personId: row.personId || null,
      cabinetId: row.cabinetId || null,
      positionDefinitionId,
      role,
      participationType: row.participationType,
      signedAt: row.signedAt || null,
      note: row.note.trim() || null,
    }
  }

  const handleLink = async () => {
    if (!selectedTreatyForLink) {
      toast.error('목록에서 조약을 선택하세요.')
      return
    }
    const row = signatoryRows[0]
    if (!row || (!row.countryId && !row.historicalCountryId)) {
      toast.error('서명국 정보를 확인하세요.')
      return
    }
    setLinking(true)
    try {
      const treaty = selectedTreatyForLink
      const existing = treaty.signatories?.find(
        (s) =>
          (row.countryId && s.countryId === row.countryId) ||
          (row.historicalCountryId &&
            s.historicalCountryId === row.historicalCountryId),
      )
      const payload = rowToApiPayload(row)
      if (existing) {
        await treatyApi.updateSignatory(existing.id, payload)
      } else {
        await treatyApi.addSignatory({
          treatyId: treaty.id,
          countryId: row.countryId ?? undefined,
          historicalCountryId: row.historicalCountryId ?? undefined,
          ...payload,
        })
      }
      toast.success(`'${treaty.name}' 조약에 연결되었습니다.`)
      await onLinked()
    } catch (e) {
      toast.error(getApiErrorMessage(e, '조약 연결에 실패했습니다.'))
    } finally {
      setLinking(false)
    }
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      setNewSubTab('basic')
      toast.error('조약명을 입력하세요.')
      return
    }
    if (!signDate.trim()) {
      setNewSubTab('dates')
      toast.error('서명일을 선택하세요.')
      return
    }
    for (const row of signatoryRows) {
      if (!row.countryId && !row.historicalCountryId) {
        setNewSubTab('signatory')
        toast.error(
          '각 서명국에 국가를 선택하세요. (다자 조약은 서명국 행을 여러 개 추가하세요)',
        )
        return
      }
    }
    setCreating(true)
    try {
      const loc = location.trim()
      const divId = signingAdministrativeDivisionId
      /** 서명 장소: 직접 입력 ↔ 행정구역 DB 둘 중 하나 (직접 입력이 있으면 텍스트 우선) */
      const locationPayload = loc ? loc : null
      const signingDivPayload = loc ? null : divId || null

      await treatyApi.create({
        name: name.trim(),
        alias: alias.trim() || null,
        type,
        signDate,
        effectiveDate: effectiveDate || null,
        expiryDate: expiryDate || null,
        violationDate: violationDate || null,
        violationReason: violationReason.trim() || null,
        location: locationPayload,
        signingAdministrativeDivisionId: signingDivPayload,
        summary: summary.trim() || null,
        background: background.trim() || null,
        aftermath: aftermath.trim() || null,
        signatories: signatoryRows.map((row) => ({
          countryId: row.countryId ?? undefined,
          historicalCountryId: row.historicalCountryId ?? undefined,
          ...rowToApiPayload(row),
        })),
      })
      toast.success(
        `조약이 등록되었습니다. 서명국 ${signatoryRows.length}건이 저장되었습니다.`,
      )
      await onLinked()
    } catch (e) {
      toast.error(getApiErrorMessage(e, '등록 중 오류가 발생했습니다.'))
    } finally {
      setCreating(false)
    }
  }

  const treatyFormIsDirty = () =>
    Boolean(
      name.trim() ||
      signDate.trim() ||
      alias.trim() ||
      location.trim() ||
      summary.trim() ||
      background.trim() ||
      aftermath.trim() ||
      effectiveDate ||
      expiryDate ||
      violationDate ||
      violationReason.trim() ||
      signingAdministrativeDivisionId,
    ) ||
    signatoryRows.some(
      (r) =>
        r.personId ||
        r.role.trim() ||
        r.note.trim() ||
        r.signedAt ||
        r.positionDefinitionId,
    )

  const handleTreatyPanelClose = () => {
    if (tab === 'new' && treatyFormIsDirty()) {
      setTreatyCloseConfirmOpen(true)
      return
    }
    onClose()
  }

  /** 기존 조약 연결: 해당 국가 서명 행이 이미 있으면 서명국 수정, 없으면 추가 */
  const linkExistingSignatory = React.useMemo(() => {
    if (tab !== 'link' || !selectedTreatyForLink) return null
    const row = signatoryRows[0]
    if (!row || (!row.countryId && !row.historicalCountryId)) return null
    return (
      selectedTreatyForLink.signatories?.find(
        (s) =>
          (row.countryId && s.countryId === row.countryId) ||
          (row.historicalCountryId &&
            s.historicalCountryId === row.historicalCountryId),
      ) ?? null
    )
  }, [tab, selectedTreatyForLink, signatoryRows])

  const cabinetLabel = (c: any) => {
    const head = c?.headTenure
    const tn = head?.termNumber ?? head?.regnalNumber
    const sub = head?.subTermNumber
    const term =
      tn != null ? (sub != null ? `제${tn}대 ${sub}기` : `제${tn}대`) : ''
    const pn = head?.person ? getPersonName(head.person) : ''
    const nm = c?.name?.trim()
    return [nm, term, pn].filter(Boolean).join(' · ') || '행정부'
  }

  const pickerInitialDate = (): string | undefined => {
    if (!datePickerContext) return undefined
    if (datePickerContext.kind === 'treaty') {
      const v = {
        signDate,
        effectiveDate,
        expiryDate,
        violationDate,
      }[datePickerContext.field]
      return v?.trim() || undefined
    }
    const row = signatoryRows[datePickerContext.rowIndex]
    return row?.signedAt?.trim() || undefined
  }

  const pickerTitle = !datePickerContext
    ? '날짜 선택'
    : datePickerContext.kind === 'treaty'
      ? datePickerContext.field === 'signDate'
        ? '서명일 선택'
        : datePickerContext.field === 'effectiveDate'
          ? '발효일 선택'
          : datePickerContext.field === 'expiryDate'
            ? '만료일 선택'
            : '파기일 선택'
      : '국가별 서명일 선택'

  const applyPickerDate = (iso: string) => {
    const d = iso.slice(0, 10)
    if (!datePickerContext) return
    if (datePickerContext.kind === 'treaty') {
      switch (datePickerContext.field) {
        case 'signDate':
          setSignDate(d)
          break
        case 'effectiveDate':
          setEffectiveDate(d)
          break
        case 'expiryDate':
          setExpiryDate(d)
          break
        case 'violationDate':
          setViolationDate(d)
          break
        default:
          break
      }
    } else {
      const i = datePickerContext.rowIndex
      setSignatoryRows((rows) => {
        const next = [...rows]
        const cur = next[i]
        if (cur) next[i] = { ...cur, signedAt: d }
        return next
      })
    }
    setDatePickerContext(null)
  }

  const isRowCurrentContextCountry = (row: DraftSignatoryRow) =>
    country.type === 'modern'
      ? row.countryId === countryId && !row.historicalCountryId
      : row.historicalCountryId === historicalCountryId && !row.countryId

  const updateRow = (index: number, patch: Partial<DraftSignatoryRow>) => {
    setSignatoryRows((rows) => {
      const next = [...rows]
      const cur = next[index]
      if (!cur) return rows
      next[index] = { ...cur, ...patch }
      return next
    })
  }

  const signatoryFormRows = (
    <>
      <CabS.TreatyExamplePanel>
        <CabS.TreatyExampleSummary>
          <FiChevronDown size={18} aria-hidden />
          <span>어디서 뭘 등록하나요? (예: 독소 불가침 조약)</span>
        </CabS.TreatyExampleSummary>
        <CabS.TreatyExampleBody>
          <CabS.TreatyExampleScrollWrap>
            <CabS.TreatyExampleTable>
              <caption>
                <strong>다른 화면</strong>에서 미리 만들어 두는 것과,{' '}
                <strong>이 화면</strong>에서만 다루는 것을 구분했습니다.
              </caption>
              <thead>
                <tr>
                  <th scope="col">구분</th>
                  <th scope="col">어디서?</th>
                  <th scope="col">독소 불가침 조약 예시</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>인물(몰로토프, 리벤트로프 등)</td>
                  <td>
                    인물 등록·인물 목록 — <strong>이 조약 화면이 아님</strong>
                  </td>
                  <td>
                    인물 DB에 등록된 뒤, 아래에서 「인물 선택」으로만 연결
                  </td>
                </tr>
                <tr>
                  <td>직책 마스터(외무장관 등)</td>
                  <td>
                    직책(직업) 테이블 — <strong>이 조약 화면이 아님</strong>
                  </td>
                  <td>
                    「직책에서 선택」으로 고르거나, 옆 칸에 당시 호칭을 직접
                    적음
                  </td>
                </tr>
                <tr>
                  <td>조약 자체·서명 행</td>
                  <td>
                    <strong>이 화면</strong> (새 조약 등록 →
                    기본·일정·서명·참여)
                  </td>
                  <td>
                    조약명·서명일·모스크바 서명 등은 여기서 입력. 소련 행·독일
                    행을 각각 한 줄씩 추가
                  </td>
                </tr>
              </tbody>
            </CabS.TreatyExampleTable>
          </CabS.TreatyExampleScrollWrap>
        </CabS.TreatyExampleBody>
      </CabS.TreatyExamplePanel>

      {signatoryRows.map((row, rowIndex) => {
        const selectedPerson =
          row.personId != null
            ? (allPersons.find((p) => p.id === row.personId) ?? null)
            : null
        const showCabinetList = isRowCurrentContextCountry(row)
        const isLinkSingle = tab === 'link'
        return (
          <CabS.SignatoryRowCard key={row.id}>
            <CabS.SignatoryRowHead>
              <span>
                서명국 {rowIndex + 1}
                {row.countryLabel ? ` · ${row.countryLabel}` : ''}
              </span>
              {!isLinkSingle && signatoryRows.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setSignatoryRows((rows) =>
                      rows.filter((_, i) => i !== rowIndex),
                    )
                  }
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#b91c1c',
                    background: 'transparent',
                    border: '1px solid rgba(185,28,28,0.35)',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  <FiTrash2 size={13} />행 삭제
                </button>
              ) : null}
            </CabS.SignatoryRowHead>

            <FieldRow>
              <FieldLabel>소속 국가</FieldLabel>
              <FieldControl>
                {isLinkSingle ? (
                  <>
                    <RegisterInput readOnly value={row.countryLabel} />
                    <FieldHint>
                      기존 조약 연결은 현재 국가·행정부 맥락만 다룹니다.
                    </FieldHint>
                  </>
                ) : (
                  <>
                    <CabS.CabinetSelectTrigger
                      type="button"
                      onClick={() => setCountryPickerRowIndex(rowIndex)}
                      $hasValue={!!row.countryLabel}
                    >
                      <FiGlobe size={18} />
                      <span>{row.countryLabel || '국가 선택'}</span>
                      <FiChevronDown size={18} />
                    </CabS.CabinetSelectTrigger>
                    <FieldHint>각 참여국마다 한 행씩 추가하세요.</FieldHint>
                  </>
                )}
              </FieldControl>
            </FieldRow>

            <FieldRow>
              <FieldLabel>소속 행정부</FieldLabel>
              <FieldControl>
                {showCabinetList ? (
                  <CabS.TreatyFormSelect
                    value={row.cabinetId ?? ''}
                    onChange={(e) =>
                      updateRow(rowIndex, {
                        cabinetId: e.target.value || null,
                      })
                    }
                  >
                    <option value="">선택 안 함</option>
                    {cabinets.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {cabinetLabel(c)}
                      </option>
                    ))}
                  </CabS.TreatyFormSelect>
                ) : (
                  <RegisterInput
                    readOnly
                    value={
                      row.cabinetId
                        ? '다른 국가 행정부 — 조약 상세에서 지정 가능'
                        : '이 국가가 아니면 행정부는 비워 두거나 조약 상세에서 지정'
                    }
                  />
                )}
                <FieldHint>
                  현재 화면 국가와 일치할 때만 이 국가의 행정부 목록을
                  불러옵니다.
                </FieldHint>
              </FieldControl>
            </FieldRow>

            <PersonSelectField
              label="서명·대표 인물"
              hint="해당 국가 기준 서명·대표 인물."
              value={row.personId ?? ''}
              selectedPerson={selectedPerson}
              persons={allPersons}
              isModalOpen={personPickerRowIndex === rowIndex}
              onModalOpenChange={(open) =>
                setPersonPickerRowIndex(open ? rowIndex : null)
              }
              onSelect={(id) => updateRow(rowIndex, { personId: id || null })}
              placeholder="인물 선택"
            />

            <FieldRow>
              <FieldLabel>서명 대표 직위</FieldLabel>
              <FieldControl>
                <CabS.TreatyFieldModeRow
                  role="group"
                  aria-label="직위 입력 방식"
                >
                  <CabS.TreatyFieldModeBtn
                    type="button"
                    $active={row.positionInputMode === 'definition'}
                    onClick={() =>
                      updateRow(rowIndex, {
                        positionInputMode: 'definition',
                        role: '',
                      })
                    }
                  >
                    관직 정의 (DB)
                  </CabS.TreatyFieldModeBtn>
                  <CabS.TreatyFieldModeBtn
                    type="button"
                    $active={row.positionInputMode === 'free'}
                    onClick={() =>
                      updateRow(rowIndex, {
                        positionInputMode: 'free',
                        positionDefinitionId: null,
                      })
                    }
                  >
                    당시 직명·호칭 (직접 입력)
                  </CabS.TreatyFieldModeBtn>
                </CabS.TreatyFieldModeRow>
                {row.positionInputMode === 'definition' ? (
                  <>
                    <CabS.CabinetSelectTrigger
                      type="button"
                      onClick={() => setPositionPickerRowIndex(rowIndex)}
                      $hasValue={!!row.positionDefinitionId}
                    >
                      <FiLayers size={18} />
                      <span>
                        {row.positionDefinitionId
                          ? (treatyPositionDefinitions.find(
                              (d) => d.id === row.positionDefinitionId,
                            )?.title ?? '직위')
                          : '관직 정의에서 선택'}
                      </span>
                      <FiChevronDown size={18} />
                    </CabS.CabinetSelectTrigger>
                    <FieldHint>
                      연대표·각료와 동일한 <strong>관직 정의</strong>{' '}
                      목록입니다. 다른 표기가 필요하면 위에서 「직접 입력」을
                      선택하세요.
                    </FieldHint>
                  </>
                ) : (
                  <>
                    <CabS.TreatyFieldWide>
                      <RegisterInput
                        value={row.role}
                        onChange={(e) => {
                          const v = e.target.value
                          updateRow(rowIndex, {
                            role: v,
                            positionInputMode: 'free',
                            ...(v.trim() ? { positionDefinitionId: null } : {}),
                          })
                        }}
                        placeholder="예: 외무인민위원, 인민위원회 외무상 (당시 표기 그대로)"
                      />
                    </CabS.TreatyFieldWide>
                    <FieldHint>
                      관직 정의에 없는 당시 호칭만 적습니다. DB 직위를 쓰려면
                      위에서 「관직 정의」를 선택하세요.
                    </FieldHint>
                  </>
                )}
              </FieldControl>
            </FieldRow>
            <FieldRow>
              <FieldLabel>참여 유형</FieldLabel>
              <CabS.TreatyFieldNarrow>
                <CabS.TreatyFormSelect
                  value={row.participationType}
                  onChange={(e) =>
                    updateRow(rowIndex, {
                      participationType: e.target
                        .value as TreatyParticipationType,
                    })
                  }
                >
                  {(
                    Object.entries(TREATY_PARTICIPATION_LABELS) as [
                      TreatyParticipationType,
                      string,
                    ][]
                  ).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </CabS.TreatyFormSelect>
              </CabS.TreatyFieldNarrow>
            </FieldRow>
            <FieldRow>
              <FieldLabel>이 국가 기준 서명일</FieldLabel>
              <FieldControl $variant="datePair">
                <DateFieldsRow style={{ maxWidth: '100%' }}>
                  <DateFieldBtn
                    type="button"
                    onClick={() =>
                      setDatePickerContext({
                        kind: 'signedAt',
                        rowIndex,
                      })
                    }
                    $hasValue={!!row.signedAt}
                  >
                    <FiCalendar size={16} />
                    <span>
                      {row.signedAt
                        ? formatIsoDateLabel(row.signedAt)
                        : '서명일 (달력)'}
                    </span>
                    <FiChevronDown size={20} />
                  </DateFieldBtn>
                </DateFieldsRow>
                <FieldHint>조약 전체 서명일과 다를 수 있습니다.</FieldHint>
              </FieldControl>
            </FieldRow>
            <FieldRow>
              <FieldLabel>비고</FieldLabel>
              <CabS.TreatyFullWidthFieldControl>
                <Textarea
                  value={row.note}
                  onChange={(e) =>
                    updateRow(rowIndex, { note: e.target.value })
                  }
                  placeholder="추가 메모"
                  rows={6}
                />
              </CabS.TreatyFullWidthFieldControl>
            </FieldRow>
          </CabS.SignatoryRowCard>
        )
      })}

      {tab === 'new' ? (
        <div style={{ marginTop: 4, marginBottom: 8 }}>
          <SubmitButton
            type="button"
            onClick={() =>
              setSignatoryRows((rows) => [...rows, makeSignatoryRow()])
            }
            style={{
              background: 'transparent',
              color: MAIN,
              border: `1.5px dashed ${MAIN}`,
              boxShadow: 'none',
            }}
          >
            <FiPlus size={14} /> 서명국 추가
          </SubmitButton>
        </div>
      ) : null}
    </>
  )

  return (
    <>
      <SidePanel
        isOpen
        onClose={handleTreatyPanelClose}
        title="조약 등록 · 연결"
        subtitle="조약과 서명 행을 등록·연결합니다. 인물·관직·국가는 다른 메뉴에서 먼저 등록하세요. 주요 작업은 하단 버튼에서 합니다."
        footer={
          <CabS.TreatyPanelFooterBar>
            {tab === 'new' ? (
              <CabS.TreatyPanelPrimaryBtn
                type="button"
                disabled={creating}
                aria-busy={creating}
                onClick={handleCreate}
              >
                {creating ? '등록 중…' : '등록'}
              </CabS.TreatyPanelPrimaryBtn>
            ) : (
              <CabS.TreatyPanelPrimaryBtn
                type="button"
                disabled={linking || !selectedTreatyForLink}
                aria-busy={linking}
                title={
                  !selectedTreatyForLink
                    ? '목록에서 조약을 선택하세요.'
                    : linkExistingSignatory
                      ? '선택한 조약의 이 국가·정부 서명(참여) 정보를 수정합니다.'
                      : '선택한 조약을 이 국가·정부에 연결합니다.'
                }
                onClick={handleLink}
              >
                {linking
                  ? linkExistingSignatory
                    ? '수정 중…'
                    : '연결 중…'
                  : linkExistingSignatory
                    ? '수정'
                    : '연결'}
              </CabS.TreatyPanelPrimaryBtn>
            )}
          </CabS.TreatyPanelFooterBar>
        }
        width="min(1180px, 100vw)"
      >
        <CabS.TreatySidePanelTabBarWrap>
          <CabS.TreatyModeTabBar role="tablist" aria-label="조약 등록 방식">
            <CabS.TreatyModeTab
              type="button"
              role="tab"
              aria-selected={tab === 'new'}
              id="treaty-tab-new"
              aria-controls="treaty-panel-content"
              $active={tab === 'new'}
              onClick={() => setTab('new')}
            >
              새 조약 등록
            </CabS.TreatyModeTab>
            <CabS.TreatyModeTab
              type="button"
              role="tab"
              aria-selected={tab === 'link'}
              id="treaty-tab-link"
              aria-controls="treaty-panel-content"
              $active={tab === 'link'}
              onClick={() => setTab('link')}
            >
              기존 조약 연결
            </CabS.TreatyModeTab>
          </CabS.TreatyModeTabBar>
        </CabS.TreatySidePanelTabBarWrap>

        <FormSectionInner
          id="treaty-panel-content"
          role="tabpanel"
          aria-labelledby={tab === 'new' ? 'treaty-tab-new' : 'treaty-tab-link'}
          style={{ paddingTop: 4 }}
        >
          {tab === 'new' && (
            <>
              <div style={{ padding: '4px 0 16px' }}>
                <TabNavigation style={{ marginBottom: 0 }}>
                  <TabButton
                    type="button"
                    $active={newSubTab === 'basic'}
                    onClick={() => setNewSubTab('basic')}
                  >
                    기본 정보
                  </TabButton>
                  <TabButton
                    type="button"
                    $active={newSubTab === 'dates'}
                    onClick={() => setNewSubTab('dates')}
                  >
                    일정
                  </TabButton>
                  <TabButton
                    type="button"
                    $active={newSubTab === 'narrative'}
                    onClick={() => setNewSubTab('narrative')}
                  >
                    상세·서술
                  </TabButton>
                  <TabButton
                    type="button"
                    $active={newSubTab === 'signatory'}
                    onClick={() => setNewSubTab('signatory')}
                  >
                    서명·참여
                  </TabButton>
                </TabNavigation>
              </div>

              {newSubTab === 'basic' && (
                <FormRows>
                  <FieldRow>
                    <FieldLabel>
                      조약명 <Required title="필수" />
                    </FieldLabel>
                    <FieldControl>
                      <RegisterInput
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="예: 독소 불가침 조약"
                      />
                    </FieldControl>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>별칭</FieldLabel>
                    <FieldControl>
                      <RegisterInput
                        value={alias}
                        onChange={(e) => setAlias(e.target.value)}
                        placeholder="예: 몰로토프-리벤트로프 조약"
                      />
                    </FieldControl>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>
                      조약 유형 <Required title="필수" />
                    </FieldLabel>
                    <CabS.TreatyFieldNarrow>
                      <CabS.TreatyFormSelect
                        value={type}
                        onChange={(e) => setType(e.target.value as TreatyType)}
                      >
                        {(
                          Object.entries(TREATY_TYPE_LABELS) as [
                            TreatyType,
                            string,
                          ][]
                        ).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </CabS.TreatyFormSelect>
                    </CabS.TreatyFieldNarrow>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>서명 장소</FieldLabel>
                    <CabS.TreatyFullWidthFieldControl>
                      <CabS.TreatyFieldModeRow
                        role="group"
                        aria-label="서명 장소 입력 방식"
                      >
                        <CabS.TreatyFieldModeBtn
                          type="button"
                          $active={signingVenueInputMode === 'text'}
                          onClick={() => {
                            setSigningVenueInputMode('text')
                            setSigningAdministrativeDivisionId(null)
                            setSigningAdminDivisionLabel('')
                          }}
                        >
                          직접 입력
                        </CabS.TreatyFieldModeBtn>
                        <CabS.TreatyFieldModeBtn
                          type="button"
                          $active={signingVenueInputMode === 'division'}
                          onClick={() => {
                            setSigningVenueInputMode('division')
                            setLocation('')
                          }}
                        >
                          행정구역 (DB)
                        </CabS.TreatyFieldModeBtn>
                      </CabS.TreatyFieldModeRow>
                      {signingVenueInputMode === 'text' ? (
                        <>
                          <Textarea
                            value={location}
                            onChange={(e) => {
                              const v = e.target.value
                              setLocation(v)
                              setSigningVenueInputMode('text')
                              if (v.trim()) {
                                setSigningAdministrativeDivisionId(null)
                                setSigningAdminDivisionLabel('')
                              }
                            }}
                            rows={4}
                            placeholder="예: 모스크바 크렘린궁, 외무인민위원회 청사"
                          />
                          <FieldHint>
                            자유 서술로 저장됩니다. 행정구역 코드로 맞출 때는
                            위에서 「행정구역 (DB)」을 선택하세요.
                          </FieldHint>
                        </>
                      ) : (
                        <>
                          <FieldHint style={{ marginBottom: 10 }}>
                            국가를 고른 뒤 행정구역을 선택합니다. 직접 서술이
                            필요하면 「직접 입력」으로 전환하세요.
                          </FieldHint>
                          <CabS.CabinetSelectTrigger
                            type="button"
                            onClick={() =>
                              setShowSigningVenueCountryModal(true)
                            }
                            $hasValue={!!signingVenueCountryId}
                            style={{ marginBottom: 10 }}
                          >
                            <FiGlobe size={18} />
                            <span>
                              {treatyModernCountries.find(
                                (c) => c.id === signingVenueCountryId,
                              )?.name ?? '국가 선택 (행정구역 목록 기준)'}
                            </span>
                            <FiChevronDown size={18} />
                          </CabS.CabinetSelectTrigger>
                          <CabS.CabinetSelectTrigger
                            type="button"
                            disabled={!signingVenueCountryId}
                            onClick={() => setShowSigningDivisionModal(true)}
                            $hasValue={!!signingAdministrativeDivisionId}
                          >
                            <FiMapPin size={18} />
                            <span>
                              {signingAdminDivisionLabel || '행정구역 선택'}
                            </span>
                            <FiChevronDown size={18} />
                          </CabS.CabinetSelectTrigger>
                        </>
                      )}
                    </CabS.TreatyFullWidthFieldControl>
                  </FieldRow>
                </FormRows>
              )}

              {newSubTab === 'dates' && (
                <FormRows>
                  <FieldRow>
                    <FieldLabel>
                      서명·발효 <Required title="필수: 서명일" />
                    </FieldLabel>
                    <FieldControl $variant="datePair">
                      <DateFieldsRow style={{ maxWidth: '100%' }}>
                        <DateFieldBtn
                          type="button"
                          onClick={() =>
                            setDatePickerContext({
                              kind: 'treaty',
                              field: 'signDate',
                            })
                          }
                          $hasValue={!!signDate}
                        >
                          <FiCalendar size={16} />
                          <span>
                            {signDate ? formatIsoDateLabel(signDate) : '서명일'}
                          </span>
                          <FiChevronDown size={20} />
                        </DateFieldBtn>
                        <DateFieldBtn
                          type="button"
                          onClick={() =>
                            setDatePickerContext({
                              kind: 'treaty',
                              field: 'effectiveDate',
                            })
                          }
                          $hasValue={!!effectiveDate}
                        >
                          <FiCalendar size={16} />
                          <span>
                            {effectiveDate
                              ? formatIsoDateLabel(effectiveDate)
                              : '발효일'}
                          </span>
                          <FiChevronDown size={20} />
                        </DateFieldBtn>
                      </DateFieldsRow>
                      <FieldHint>
                        서명일은 필수입니다. 공용 달력에서 선택합니다.
                      </FieldHint>
                    </FieldControl>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>만료·파기</FieldLabel>
                    <FieldControl $variant="datePair">
                      <DateFieldsRow style={{ maxWidth: '100%' }}>
                        <DateFieldBtn
                          type="button"
                          onClick={() =>
                            setDatePickerContext({
                              kind: 'treaty',
                              field: 'expiryDate',
                            })
                          }
                          $hasValue={!!expiryDate}
                        >
                          <FiCalendar size={16} />
                          <span>
                            {expiryDate
                              ? formatIsoDateLabel(expiryDate)
                              : '만료일'}
                          </span>
                          <FiChevronDown size={20} />
                        </DateFieldBtn>
                        <DateFieldBtn
                          type="button"
                          onClick={() =>
                            setDatePickerContext({
                              kind: 'treaty',
                              field: 'violationDate',
                            })
                          }
                          $hasValue={!!violationDate}
                        >
                          <FiCalendar size={16} />
                          <span>
                            {violationDate
                              ? formatIsoDateLabel(violationDate)
                              : '파기일'}
                          </span>
                          <FiChevronDown size={20} />
                        </DateFieldBtn>
                      </DateFieldsRow>
                      <FieldHint>
                        효력 종료·파기 시점을 같은 줄에서 입력합니다.
                      </FieldHint>
                    </FieldControl>
                  </FieldRow>
                  {violationDate ? (
                    <FieldRow>
                      <FieldLabel>파기 사유</FieldLabel>
                      <CabS.TreatyFieldWide>
                        <RegisterInput
                          value={violationReason}
                          onChange={(e) => setViolationReason(e.target.value)}
                          placeholder="파기 이유"
                        />
                      </CabS.TreatyFieldWide>
                    </FieldRow>
                  ) : null}
                </FormRows>
              )}

              {newSubTab === 'narrative' && (
                <FormRows>
                  <FieldRow>
                    <FieldLabel>개요</FieldLabel>
                    <CabS.TreatyFullWidthFieldControl>
                      <Textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        rows={7}
                        placeholder="조약 핵심 요약"
                      />
                    </CabS.TreatyFullWidthFieldControl>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>배경</FieldLabel>
                    <CabS.TreatyFullWidthFieldControl>
                      <Textarea
                        value={background}
                        onChange={(e) => setBackground(e.target.value)}
                        rows={7}
                        placeholder="체결 배경"
                      />
                    </CabS.TreatyFullWidthFieldControl>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>이후 영향</FieldLabel>
                    <CabS.TreatyFullWidthFieldControl>
                      <Textarea
                        value={aftermath}
                        onChange={(e) => setAftermath(e.target.value)}
                        rows={7}
                        placeholder="주요 결과·여파"
                      />
                    </CabS.TreatyFullWidthFieldControl>
                  </FieldRow>
                </FormRows>
              )}

              {newSubTab === 'signatory' && (
                <FormRows>{signatoryFormRows}</FormRows>
              )}
            </>
          )}

          {tab === 'link' && (
            <>
              <CabS.TreatySubSectionTitle
                style={{ border: 'none', marginTop: 0, paddingTop: 0 }}
              >
                조약 선택
              </CabS.TreatySubSectionTitle>
              <p
                style={{
                  margin: '0 0 12px',
                  fontSize: 13,
                  color: cabPalette.textMuted,
                  lineHeight: 1.55,
                }}
              >
                아래 목록에서 조약을 한 건 선택한 뒤, 서명·참여 정보를 확인하고
                하단의 「연결」 또는 「수정」을 누릅니다.
              </p>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <FiSearch
                  size={14}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: cabPalette.slate400,
                  }}
                />
                <RegisterInput
                  type="text"
                  placeholder="조약명 검색…"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  style={{ paddingLeft: 40, maxWidth: 480 }}
                />
              </div>

              {loading ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    padding: '20px 0 28px',
                  }}
                >
                  <CabS.TreatyListSkeletonPulse aria-hidden />
                  <CabS.TreatyListSkeletonPulse aria-hidden />
                  <CabS.TreatyListSkeletonPulse aria-hidden />
                  <CabS.TreatyListSkeletonPulse aria-hidden />
                </div>
              ) : filtered.length === 0 ? (
                <p
                  style={{
                    textAlign: 'center',
                    color: cabPalette.textMuted,
                    padding: '24px 0',
                    lineHeight: 1.7,
                  }}
                >
                  {allTreaties.filter((t) => !linkedIds.has(t.id)).length === 0
                    ? '연결 가능한 조약이 없습니다. 새 조약 등록 모드에서 먼저 등록하세요.'
                    : '검색 결과가 없습니다.'}
                </p>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    maxHeight: 280,
                    overflowY: 'auto',
                    marginBottom: 8,
                  }}
                >
                  {filtered.map((treaty) => (
                    <CabS.TreatyListRow
                      key={treaty.id}
                      type="button"
                      $selected={selectedTreatyForLink?.id === treaty.id}
                      onClick={() => {
                        setSelectedTreatyForLink(treaty)
                        const sig = treaty.signatories?.find(
                          (s) =>
                            (countryId && s.countryId === countryId) ||
                            (historicalCountryId &&
                              s.historicalCountryId === historicalCountryId),
                        )
                        const base = makeSignatoryRow()
                        if (!sig) {
                          setSignatoryRows([base])
                          return
                        }
                        setSignatoryRows([
                          {
                            ...base,
                            countryId: sig.countryId ?? null,
                            historicalCountryId:
                              sig.historicalCountryId ?? null,
                            countryLabel:
                              sig.country?.name ??
                              sig.historicalCountry?.name ??
                              base.countryLabel,
                            cabinetId: sig.cabinetId ?? cabinetId,
                            personId: sig.personId ?? null,
                            positionDefinitionId:
                              sig.positionDefinitionId ?? null,
                            role: sig.role ?? '',
                            positionInputMode: sig.positionDefinitionId
                              ? ('definition' as const)
                              : sig.role?.trim()
                                ? ('free' as const)
                                : 'definition',
                            participationType: sig.participationType,
                            signedAt: sig.signedAt
                              ? new Date(sig.signedAt)
                                  .toISOString()
                                  .slice(0, 10)
                              : '',
                            note: sig.note ?? '',
                          },
                        ])
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#fff',
                          background: MAIN,
                          borderRadius: 4,
                          padding: '2px 7px',
                          flexShrink: 0,
                        }}
                      >
                        {TREATY_TYPE_LABELS[treaty.type] ?? treaty.type}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: cabPalette.treatyTitleText,
                          }}
                        >
                          {treaty.name}
                        </div>
                        {treaty.alias ? (
                          <div
                            style={{
                              fontSize: 12,
                              color: cabPalette.slate400,
                            }}
                          >
                            {treaty.alias}
                          </div>
                        ) : null}
                      </div>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        {treaty.signDate
                          ? new Date(treaty.signDate).getFullYear()
                          : '—'}
                      </span>
                    </CabS.TreatyListRow>
                  ))}
                </div>
              )}

              {selectedTreatyForLink ? (
                <>
                  <CabS.TreatySubSectionTitle>
                    서명·참여 ({selectedTreatyForLink.name})
                  </CabS.TreatySubSectionTitle>
                  <FormRows>{signatoryFormRows}</FormRows>
                </>
              ) : null}
            </>
          )}
        </FormSectionInner>
      </SidePanel>

      <ConfirmDialog
        isOpen={treatyCloseConfirmOpen}
        title="작성 중인 내용이 있습니다"
        message="저장하지 않고 닫으시겠습니까?"
        confirmLabel="닫기"
        cancelLabel="계속 작성"
        danger
        onConfirm={() => {
          setTreatyCloseConfirmOpen(false)
          onClose()
        }}
        onCancel={() => setTreatyCloseConfirmOpen(false)}
      />

      {datePickerContext ? (
        <DatePickerModal
          isOpen
          onClose={() => setDatePickerContext(null)}
          onSelect={(date) => applyPickerDate(date)}
          initialDate={pickerInitialDate()}
          title={pickerTitle}
        />
      ) : null}

      {countryPickerRowIndex !== null ? (
        <CountrySelectModal
          isOpen
          onClose={() => setCountryPickerRowIndex(null)}
          modernCountries={treatyModernCountries as CountryResponseDto[]}
          historicalCountries={
            treatyHistoricalCountries as HistoricalCountryResponseDto[]
          }
          onSelect={(c) => {
            updateRow(countryPickerRowIndex, {
              countryId: c.isHistorical ? null : c.id,
              historicalCountryId: c.isHistorical ? c.id : null,
              countryLabel: c.name,
              cabinetId: null,
            })
            setCountryPickerRowIndex(null)
          }}
          title="서명국 선택"
        />
      ) : null}

      {showSigningVenueCountryModal ? (
        <CountrySelectModal
          isOpen
          onClose={() => setShowSigningVenueCountryModal(false)}
          modernCountries={treatyModernCountries as CountryResponseDto[]}
          historicalCountries={
            treatyHistoricalCountries as HistoricalCountryResponseDto[]
          }
          onSelect={(c) => {
            setSigningVenueCountryId(c.id)
            setSigningAdministrativeDivisionId(null)
            setSigningAdminDivisionLabel('')
            setLocation('')
            setSigningVenueInputMode('division')
            setShowSigningVenueCountryModal(false)
          }}
          title="서명 지역 국가 (행정구역 목록 기준)"
          selectedCountryId={signingVenueCountryId || undefined}
        />
      ) : null}

      {showSigningDivisionModal ? (
        <SelectModal
          isOpen
          onClose={() => setShowSigningDivisionModal(false)}
          title="서명 장소 행정구역"
          options={[
            { value: '', label: '선택 안 함' },
            ...signingAdminDivisions.map((d) => ({
              value: d.id,
              label: d.localName ? `${d.name} (${d.localName})` : d.name,
            })),
          ]}
          selectedValue={signingAdministrativeDivisionId ?? ''}
          onSelect={(v) => {
            setSigningAdministrativeDivisionId(v || null)
            const d = signingAdminDivisions.find((x) => x.id === v)
            setSigningAdminDivisionLabel(
              d ? (d.localName ? `${d.name} (${d.localName})` : d.name) : '',
            )
            if (v) {
              setLocation('')
              setSigningVenueInputMode('division')
            }
            setShowSigningDivisionModal(false)
          }}
        />
      ) : null}

      {positionPickerRowIndex !== null ? (
        <SelectModal
          isOpen
          onClose={() => setPositionPickerRowIndex(null)}
          title="행정부 직위 (관직 정의)"
          options={[
            { value: '', label: '선택 안 함' },
            ...treatyPositionDefinitions.map((d) => ({
              value: d.id,
              label:
                d.titleEn && d.titleEn !== d.title
                  ? `${d.title} (${d.titleEn})`
                  : d.title,
            })),
          ]}
          selectedValue={
            signatoryRows[positionPickerRowIndex]?.positionDefinitionId ?? ''
          }
          onSelect={(v) => {
            const idx = positionPickerRowIndex
            setPositionPickerRowIndex(null)
            if (idx !== null) {
              updateRow(idx, {
                positionDefinitionId: v || null,
                ...(v
                  ? { role: '', positionInputMode: 'definition' as const }
                  : { positionInputMode: 'free' as const }),
              })
            }
          }}
        />
      ) : null}
    </>
  )
}
