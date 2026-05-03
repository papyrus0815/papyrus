/**
 * 행정구역 등록·수정 모달.
 *
 * - 등록 시 호출 측에서 대상 레벨/부모를 미리 세팅해 전달.
 * - 해당 레벨의 단위(CountryAdminDivisionConfig)가 없으면 인라인 입력으로 함께 생성.
 * - 좌표(중심), 시간성(설립·폐지일), 이전 행정구역(predecessor) 모두 선택 입력.
 */
import { useEffect, useMemo, useState } from 'react'

import { FiMapPin, FiX } from 'react-icons/fi'
import { toast } from 'react-hot-toast'

import { useCountry } from '@/entities/country/api'
import {
  type AdminDivisionConfig,
  type AdministrativeDivision,
  useAdminDivisionConfigs,
  useAdministrativeDivisions,
  useCreateAdminDivisionConfig,
  useCreateAdministrativeDivision,
  useUpdateAdministrativeDivision,
} from '@/entities/country/api.administrative-divisions'
import { type PlaceSearchResult, cityApi } from '@/shared/api/city'
import { CoordPickerMap } from '@/shared/ui/google-map/coord-picker-map'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import {
  ModalBody,
  ModalBox,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from '@/shared/ui/modal'

import { DivisionAutocomplete } from './division-autocomplete'
import {
  ErrorText,
  Field,
  FieldFull,
  FooterBtn,
  FormGrid,
  HintText,
  Input,
  Label,
  Required,
  Select,
} from './form-fields'

interface AdminDivisionFormModalProps {
  isOpen: boolean
  countryId: string
  /** 수정 시 채워진 데이터, 등록 시 null */
  editing: AdministrativeDivision | null
  /** 등록 시 대상 레벨 (1, 2, ...). 수정 시 무시 (editing 기준). */
  defaultLevel: number
  /** 상위 구역(있으면 read-only로 표시). level === 1이면 항상 null. */
  defaultParent: { id: string; name: string } | null
  onClose: () => void
}

interface FormState {
  configId: string
  newConfigLabel: string
  name: string
  localName: string
  nameMeaning: string
  centerLat: string
  centerLng: string
  establishedDate: string
  abolishedDate: string
  predecessorId: string
  parentId: string
}

const empty = (defaultParentId: string | null): FormState => ({
  configId: '',
  newConfigLabel: '',
  name: '',
  localName: '',
  nameMeaning: '',
  centerLat: '',
  centerLng: '',
  establishedDate: '',
  abolishedDate: '',
  predecessorId: '',
  parentId: defaultParentId ?? '',
})

const fromExisting = (
  d: AdministrativeDivision,
  configs: AdminDivisionConfig[],
): FormState => ({
  configId: configs.some((c) => c.id === d.adminDivisionId)
    ? d.adminDivisionId
    : '',
  newConfigLabel: '',
  name: d.name,
  localName: d.localName ?? '',
  nameMeaning: d.nameMeaning ?? '',
  centerLat: d.centerLat == null ? '' : String(d.centerLat),
  centerLng: d.centerLng == null ? '' : String(d.centerLng),
  establishedDate: d.establishedDate ?? '',
  abolishedDate: d.abolishedDate ?? '',
  predecessorId: d.predecessorId ?? '',
  parentId: d.parentId ?? '',
})

function parseCoord(value: string): number | null | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

/** ISO 날짜 문자열을 한국어로 표시 (BCE 지원) */
function formatHistoricalDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  const prefix = year < 0 ? 'BCE ' : ''
  return `${prefix}${Math.abs(year)}년 ${month}월 ${day}일`
}

/** 트리에서 id로 노드 찾기 (predecessor 표시용) */
function findInTree(
  roots: AdministrativeDivision[],
  id: string,
): AdministrativeDivision | null {
  for (const node of roots) {
    if (node.id === id) return node
    if (node.children?.length) {
      const f = findInTree(node.children, id)
      if (f) return f
    }
  }
  return null
}

export function AdminDivisionFormModal({
  isOpen,
  countryId,
  editing,
  defaultLevel,
  defaultParent,
  onClose,
}: AdminDivisionFormModalProps) {
  const { data: allConfigs = [] } = useAdminDivisionConfigs(countryId)
  const { data: allDivisions = [] } = useAdministrativeDivisions(countryId)
  const { data: countryDetail } = useCountry(countryId)
  const createConfigMut = useCreateAdminDivisionConfig(countryId)
  const createDivisionMut = useCreateAdministrativeDivision(countryId)
  const updateDivisionMut = useUpdateAdministrativeDivision(countryId)
  const [autoFilling, setAutoFilling] = useState(false)
  const [coordCandidates, setCoordCandidates] = useState<
    PlaceSearchResult[] | null
  >(null)
  const [establishedPickerOpen, setEstablishedPickerOpen] = useState(false)
  const [abolishedPickerOpen, setAbolishedPickerOpen] = useState(false)
  const [mapPickerOpen, setMapPickerOpen] = useState(false)
  const [mapPickerLarge, setMapPickerLarge] = useState(false)

  const editingLevel = editing
    ? allConfigs.find((c) => c.id === editing.adminDivisionId)?.divisionLevel ??
      defaultLevel
    : defaultLevel

  const configsForLevel = allConfigs.filter(
    (c) => c.divisionLevel === editingLevel,
  )

  const [form, setForm] = useState<FormState>(() =>
    editing
      ? fromExisting(editing, allConfigs)
      : empty(defaultParent?.id ?? null),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const selectedPredecessor = useMemo(
    () =>
      form.predecessorId
        ? findInTree(allDivisions, form.predecessorId)
        : null,
    [allDivisions, form.predecessorId],
  )

  const selectedParent = useMemo(
    () =>
      form.parentId ? findInTree(allDivisions, form.parentId) : null,
    [allDivisions, form.parentId],
  )


  useEffect(() => {
    if (!isOpen) return
    if (editing) {
      setForm(fromExisting(editing, allConfigs))
    } else {
      const auto =
        configsForLevel.length === 1 ? configsForLevel[0]!.id : ''
      setForm({ ...empty(defaultParent?.id ?? null), configId: auto })
    }
    setErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editing])

  if (!isOpen) return null

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const submitting =
    createConfigMut.isPending ||
    createDivisionMut.isPending ||
    updateDivisionMut.isPending

  const needsNewConfig =
    !editing && configsForLevel.length === 0 && form.configId === ''

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = '이름은 필수입니다'
    if (!editing) {
      if (configsForLevel.length === 0) {
        if (!form.newConfigLabel.trim())
          errs.newConfigLabel = `${editingLevel}차 단위명은 필수입니다`
      } else {
        if (!form.configId) errs.configId = '단위를 선택하세요'
      }
    }
    if (form.centerLat.trim() !== '') {
      const lat = Number(form.centerLat)
      if (!Number.isFinite(lat) || lat < -90 || lat > 90)
        errs.centerLat = '위도는 -90 ~ 90 사이여야 합니다'
    }
    if (form.centerLng.trim() !== '') {
      const lng = Number(form.centerLng)
      if (!Number.isFinite(lng) || lng < -180 || lng > 180)
        errs.centerLng = '경도는 -180 ~ 180 사이여야 합니다'
    }
    if (form.establishedDate && form.abolishedDate) {
      const est = new Date(form.establishedDate).getTime()
      const ab = new Date(form.abolishedDate).getTime()
      if (Number.isFinite(est) && Number.isFinite(ab) && est > ab) {
        errs.abolishedDate = '폐지일은 설립일 이후여야 합니다'
      }
    }
    return errs
  }

  const handleAutofillCoords = async () => {
    const q = form.name.trim()
    if (!q) {
      toast.error('이름을 먼저 입력하세요')
      return
    }
    setAutoFilling(true)
    try {
      const isoCode = (countryDetail as { isoCode?: string } | undefined)
        ?.isoCode
      const results = await cityApi.searchPlaces(q, isoCode)
      if (results.length === 0) {
        toast.error(`"${q}" 위치를 찾을 수 없습니다`)
        return
      }
      setCoordCandidates(results.slice(0, 5))
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : '좌표 검색에 실패했습니다',
      )
    } finally {
      setAutoFilling(false)
    }
  }

  const pickCandidate = (hit: PlaceSearchResult) => {
    setForm((prev) => ({
      ...prev,
      centerLat: hit.lat.toFixed(6),
      centerLng: hit.lng.toFixed(6),
    }))
    setErrors((prev) => ({ ...prev, centerLat: '', centerLng: '' }))
    toast.success(`좌표 채움: ${hit.shortName}`)
    setCoordCandidates(null)
  }

  /** 서버 에러 메시지를 키워드로 form 필드에 매핑 */
  const mapServerError = (msg: string): Record<string, string> => {
    const errs: Record<string, string> = {}
    if (msg.includes('동일한 이름') || msg.includes('이름의 행정구역')) {
      errs.name = msg
    } else if (msg.includes('단위')) {
      errs.configId = msg
    } else if (msg.includes('상위') || msg.includes('자기 자신을 상위')) {
      errs.parentId = msg
    } else if (msg.includes('이전 행정구역') || msg.includes('predecessor')) {
      errs.predecessorId = msg
    } else {
      errs._global = msg
    }
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const optionalFields = {
      localName: form.localName.trim() || null,
      nameMeaning: form.nameMeaning.trim() || null,
      centerLat: parseCoord(form.centerLat) ?? null,
      centerLng: parseCoord(form.centerLng) ?? null,
      establishedDate: form.establishedDate || null,
      abolishedDate: form.abolishedDate || null,
      predecessorId: form.predecessorId || null,
    }

    try {
      if (editing) {
        await updateDivisionMut.mutateAsync({
          id: editing.id,
          input: {
            name: form.name.trim(),
            parentId: form.parentId || null,
            ...optionalFields,
          },
        })
        toast.success('행정구역을 수정했습니다')
      } else {
        let configId = form.configId
        if (!configId) {
          const created = await createConfigMut.mutateAsync({
            countryId,
            divisionLevel: editingLevel,
            divisionLabel: form.newConfigLabel.trim(),
          })
          configId = created.id
        }
        await createDivisionMut.mutateAsync({
          countryId,
          adminDivisionId: configId,
          name: form.name.trim(),
          parentId: form.parentId || null,
          ...optionalFields,
        })
        toast.success('행정구역을 등록했습니다')
      }
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '저장에 실패했습니다'
      const mapped = mapServerError(msg)
      setErrors((prev) => ({ ...prev, ...mapped }))
      toast.error(msg)
    }
  }

  return (
    <ModalOverlay onClick={onClose}>
      <ModalBox
        $maxWidth="560px"
        onClick={(e) => e.stopPropagation()}
        as="form"
        onSubmit={handleSubmit}
      >
        <ModalHeader>
          <ModalTitle>
            {editing ? '행정구역 수정' : `${editingLevel}차 행정구역 등록`}
          </ModalTitle>
          <ModalCloseButton type="button" onClick={onClose} aria-label="닫기">
            <FiX />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          {errors._global && (
            <div
              style={{
                padding: '10px 12px',
                marginBottom: 12,
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 10,
                color: '#b91c1c',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {errors._global}
            </div>
          )}
          <FormGrid>
            <FieldFull>
              <Label htmlFor="ad-parent">상위 구역</Label>
              <DivisionAutocomplete
                id="ad-parent"
                countryId={countryId}
                selected={selectedParent}
                onChange={(id) => set('parentId', id)}
                onClear={() => set('parentId', '')}
                excludeIds={editing ? [editing.id] : []}
                placeholder="이름으로 검색 — 비워두면 최상위 (1차)"
              />
              <HintText>
                상위가 없으면 최상위 (1차) 행정구역으로 등록됩니다.
              </HintText>
              {errors.parentId && <ErrorText>{errors.parentId}</ErrorText>}
            </FieldFull>
            {selectedParent && (
              <FieldFull>
                <HintText>
                  단위 레벨이 상위(<strong>{
                    allConfigs.find((c) => c.id === selectedParent.adminDivisionId)
                      ?.divisionLabel ?? '?'
                  }</strong>) 바로 아래여야 합니다.
                </HintText>
              </FieldFull>
            )}

            {!editing && (
              <FieldFull>
                <Label htmlFor="ad-config">
                  단위<Required>*</Required>
                </Label>
                {configsForLevel.length > 0 ? (
                  <Select
                    id="ad-config"
                    value={form.configId}
                    onChange={(e) => set('configId', e.target.value)}
                  >
                    <option value="">단위를 선택하세요</option>
                    {configsForLevel.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.divisionLabel}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    id="ad-config"
                    value={form.newConfigLabel}
                    onChange={(e) => set('newConfigLabel', e.target.value)}
                    placeholder={`${editingLevel}차 단위명 (예: ${
                      editingLevel === 1
                        ? '도, 주'
                        : editingLevel === 2
                        ? '시, 구'
                        : '읍, 면, 동'
                    })`}
                  />
                )}
                {errors.configId && <ErrorText>{errors.configId}</ErrorText>}
                {errors.newConfigLabel && (
                  <ErrorText>{errors.newConfigLabel}</ErrorText>
                )}
                {needsNewConfig && (
                  <HintText>
                    이 국가에 {editingLevel}차 단위가 아직 없어 함께 생성됩니다.
                  </HintText>
                )}
              </FieldFull>
            )}

            <FieldFull>
              <Label htmlFor="ad-name">
                이름<Required>*</Required>
              </Label>
              <Input
                id="ad-name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="예: 경기도, 도쿄도"
                autoFocus
              />
              {errors.name && <ErrorText>{errors.name}</ErrorText>}
            </FieldFull>

            <Field>
              <Label htmlFor="ad-local">현지어 명칭</Label>
              <Input
                id="ad-local"
                value={form.localName}
                onChange={(e) => set('localName', e.target.value)}
                placeholder="예: 京畿道, 東京都, Gyeonggi-do"
              />
            </Field>
            <Field>
              <Label htmlFor="ad-meaning">명칭 뜻</Label>
              <Input
                id="ad-meaning"
                value={form.nameMeaning}
                onChange={(e) => set('nameMeaning', e.target.value)}
                placeholder="예: 京幾 — 수도 가까운 땅"
              />
            </Field>

            <FieldFull>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <Label as="span">중심 좌표</Label>
                <div style={{ display: 'inline-flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setMapPickerOpen((v) => !v)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '5px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      border: '1px solid #6366f1',
                      color: mapPickerOpen ? '#ffffff' : '#6366f1',
                      background: mapPickerOpen ? '#6366f1' : 'transparent',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    {mapPickerOpen ? '지도 닫기' : '🗺 지도에서 선택'}
                  </button>
                  <button
                    type="button"
                    onClick={handleAutofillCoords}
                    disabled={autoFilling || !form.name.trim()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '5px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      border: '1px solid #6366f1',
                      color: '#6366f1',
                      background: 'transparent',
                      borderRadius: 8,
                      cursor:
                        autoFilling || !form.name.trim()
                          ? 'not-allowed'
                          : 'pointer',
                      opacity: autoFilling || !form.name.trim() ? 0.5 : 1,
                    }}
                  >
                    <FiMapPin size={11} />
                    {autoFilling ? '검색 중…' : '이름으로 자동 채우기'}
                  </button>
                </div>
              </div>
              {mapPickerOpen && (
                <div>
                  <CoordPickerMap
                    lat={
                      form.centerLat.trim() === ''
                        ? null
                        : Number(form.centerLat)
                    }
                    lng={
                      form.centerLng.trim() === ''
                        ? null
                        : Number(form.centerLng)
                    }
                    onPick={(lat, lng) => {
                      setForm((prev) => ({
                        ...prev,
                        centerLat: String(lat),
                        centerLng: String(lng),
                      }))
                      setErrors((prev) => ({
                        ...prev,
                        centerLat: '',
                        centerLng: '',
                      }))
                    }}
                    fallbackLat={
                      (countryDetail as { latitude?: number | null } | undefined)
                        ?.latitude ?? null
                    }
                    fallbackLng={
                      (countryDetail as { longitude?: number | null } | undefined)
                        ?.longitude ?? null
                    }
                    height={mapPickerLarge ? 480 : 220}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginTop: 4,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setMapPickerLarge((v) => !v)}
                      style={{
                        padding: '4px 8px',
                        fontSize: 11,
                        fontWeight: 500,
                        border: 'none',
                        background: 'transparent',
                        color: '#6366f1',
                        cursor: 'pointer',
                      }}
                    >
                      {mapPickerLarge ? '⤢ 작게' : '⤡ 크게'}
                    </button>
                  </div>
                </div>
              )}
              <HintText>
                OpenStreetMap에서 이름으로 검색해 위·경도를 채웁니다. 후보가
                여러 개면 골라야 합니다.
              </HintText>
              {coordCandidates && coordCandidates.length > 0 && (
                <div
                  style={{
                    marginTop: 6,
                    border: '1px solid #cbd5e1',
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '6px 12px',
                      background: '#f1f5f9',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#475569',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>후보를 선택하세요</span>
                    <button
                      type="button"
                      onClick={() => setCoordCandidates(null)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: 11,
                        color: '#64748b',
                        cursor: 'pointer',
                      }}
                    >
                      취소
                    </button>
                  </div>
                  {coordCandidates.map((hit) => (
                    <button
                      key={hit.placeId}
                      type="button"
                      onClick={() => pickCandidate(hit)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        border: 'none',
                        borderTop: '1px solid #e2e8f0',
                        background: '#ffffff',
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f8fafc'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff'
                      }}
                    >
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {hit.shortName}
                      </div>
                      <div
                        style={{
                          color: '#64748b',
                          fontSize: 11,
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {hit.displayName}
                      </div>
                      <div
                        style={{
                          color: '#94a3b8',
                          fontSize: 11,
                          marginTop: 2,
                        }}
                      >
                        {hit.lat.toFixed(4)}, {hit.lng.toFixed(4)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </FieldFull>
            <Field>
              <Label htmlFor="ad-lat">위도</Label>
              <Input
                id="ad-lat"
                type="number"
                step="0.000001"
                value={form.centerLat}
                onChange={(e) => set('centerLat', e.target.value)}
                placeholder="-90 ~ 90"
              />
              {errors.centerLat && <ErrorText>{errors.centerLat}</ErrorText>}
            </Field>
            <Field>
              <Label htmlFor="ad-lng">경도</Label>
              <Input
                id="ad-lng"
                type="number"
                step="0.000001"
                value={form.centerLng}
                onChange={(e) => set('centerLng', e.target.value)}
                placeholder="-180 ~ 180"
              />
              {errors.centerLng && <ErrorText>{errors.centerLng}</ErrorText>}
            </Field>

            <Field>
              <Label>설립일</Label>
              <DateButton
                onClick={() => setEstablishedPickerOpen(true)}
                value={form.establishedDate}
                onClear={() => set('establishedDate', '')}
                placeholder="설립일 선택 (BCE 지원)"
              />
            </Field>
            <Field>
              <Label>폐지일</Label>
              <DateButton
                onClick={() => setAbolishedPickerOpen(true)}
                value={form.abolishedDate}
                onClear={() => set('abolishedDate', '')}
                placeholder="폐지일 선택"
              />
              {errors.abolishedDate && (
                <ErrorText>{errors.abolishedDate}</ErrorText>
              )}
            </Field>

            <FieldFull>
              <Label htmlFor="ad-predecessor">이전 행정구역 (모체)</Label>
              <DivisionAutocomplete
                id="ad-predecessor"
                countryId={countryId}
                selected={selectedPredecessor}
                onChange={(id) => set('predecessorId', id)}
                onClear={() => set('predecessorId', '')}
                excludeIds={editing ? [editing.id] : []}
                placeholder="이름으로 검색"
              />
              <HintText>
                분리·승격으로 신설된 구역이라면 이전 모체를 지정할 수 있습니다.
              </HintText>
              {errors.predecessorId && (
                <ErrorText>{errors.predecessorId}</ErrorText>
              )}
            </FieldFull>
          </FormGrid>
        </ModalBody>
        <ModalFooter>
          <FooterBtn type="button" onClick={onClose} disabled={submitting}>
            취소
          </FooterBtn>
          <FooterBtn type="submit" $primary disabled={submitting}>
            {submitting ? '저장 중…' : editing ? '수정' : '등록'}
          </FooterBtn>
        </ModalFooter>
      </ModalBox>

      <DatePickerModal
        isOpen={establishedPickerOpen}
        onClose={() => setEstablishedPickerOpen(false)}
        onSelect={(date) => {
          set('establishedDate', date)
          setEstablishedPickerOpen(false)
        }}
        initialDate={form.establishedDate || undefined}
        title="설립일 선택"
      />
      <DatePickerModal
        isOpen={abolishedPickerOpen}
        onClose={() => setAbolishedPickerOpen(false)}
        onSelect={(date) => {
          set('abolishedDate', date)
          setAbolishedPickerOpen(false)
        }}
        initialDate={form.abolishedDate || undefined}
        title="폐지일 선택"
      />
    </ModalOverlay>
  )
}

interface DateButtonProps {
  onClick: () => void
  value: string
  onClear: () => void
  placeholder: string
}

function DateButton({ onClick, value, onClear, placeholder }: DateButtonProps) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button
        type="button"
        onClick={onClick}
        style={{
          flex: 1,
          padding: '9px 12px',
          fontSize: 13,
          fontWeight: value ? 600 : 400,
          textAlign: 'left',
          border: '1px solid #cbd5e1',
          borderRadius: 10,
          background: '#ffffff',
          color: value ? '#0f172a' : '#94a3b8',
          cursor: 'pointer',
        }}
      >
        {value ? formatHistoricalDate(value) : placeholder}
      </button>
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="지우기"
          style={{
            padding: '0 10px',
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            background: '#ffffff',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
