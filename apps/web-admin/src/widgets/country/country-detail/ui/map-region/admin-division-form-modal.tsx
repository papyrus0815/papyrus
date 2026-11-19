/**
 * 행정구역 등록·수정 모달.
 *
 * - 등록 시 호출 측에서 대상 레벨/부모를 미리 세팅해 전달.
 * - 해당 레벨의 단위(CountryAdminDivisionConfig)가 없으면 인라인 입력으로 함께 생성.
 * - 좌표(중심), 시간성(설립·폐지일), 이전 행정구역(predecessor) 모두 선택 입력.
 */
import { useEffect, useMemo, useState } from 'react'

import { FiMapPin } from 'react-icons/fi'

import { useCountry } from '@/entities/country/api'
import {
  type AdminDivisionConfig,
  type AdministrativeDivision,
  type DivisionOwner,
  useAdminDivisionConfigs,
  useAdministrativeDivisions,
  useCreateAdminDivisionConfig,
  useCreateAdministrativeDivision,
  useUpdateAdministrativeDivision,
} from '@/entities/country/api.administrative-divisions'
import { dateSortKey, parseIsoDateParts } from '@/shared/lib/iso-date'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { Modal, ModalBody, ModalFooter } from '@/shared/ui/modal'
import { notify } from '@/shared/ui/toast'

import { CoordInputSection } from './coord-input-section'
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
import { findInTree } from './tree-utils'
import { type RegionPalette, useRegionPalette } from './use-region-palette'

interface AdminDivisionFormModalProps {
  isOpen: boolean
  /** 소속 — 현대(countryId) 또는 역사(historicalCountryId) 국가 */
  owner: DivisionOwner
  /** 활성 체계 — 지정 시 새 구역·단위가 이 체계 소속으로 등록됨 */
  schemeId?: string | null
  schemeName?: string | null
  /**
   * 헤더·좌표 폴백용 국가 표시 정보.
   * 역사적 국가는 모달이 직접 조회할 수 없어 호출 측에서 내려준다 (현대 국가는 생략 가능).
   */
  countryDisplay?: {
    name?: string
    latitude?: number | null
    longitude?: number | null
  }
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

/** 레벨별 단위 이름 예시 (안내 문구용) */
function levelExamples(level: number): string {
  return level === 1 ? '도, 주' : level === 2 ? '시, 구' : '읍, 면, 동'
}

/** ISO 날짜 문자열을 한국어로 표시 (BCE 안전 파싱) */
function formatHistoricalDate(iso: string): string {
  if (!iso) return ''
  const parts = parseIsoDateParts(iso)
  if (!parts) return iso
  const prefix = parts.year < 0 ? 'BCE ' : ''
  return `${prefix}${Math.abs(parts.year)}년 ${parts.month}월 ${parts.day}일`
}

export function AdminDivisionFormModal({
  isOpen,
  owner,
  schemeId = null,
  schemeName = null,
  countryDisplay,
  editing,
  defaultLevel,
  defaultParent,
  onClose,
}: AdminDivisionFormModalProps) {
  const palette = useRegionPalette()
  const { data: allConfigs = [] } = useAdminDivisionConfigs(owner, schemeId)
  const { data: allDivisions = [] } = useAdministrativeDivisions(
    owner,
    schemeId,
  )
  // 역사적 국가 소속이면 countryId가 없어 자동으로 비활성화된다 (enabled: !!id)
  const { data: countryDetail } = useCountry(owner.countryId ?? '')
  const createConfigMut = useCreateAdminDivisionConfig(owner)
  const createDivisionMut = useCreateAdministrativeDivision(owner)
  const updateDivisionMut = useUpdateAdministrativeDivision(owner)
  const [establishedPickerOpen, setEstablishedPickerOpen] = useState(false)
  const [abolishedPickerOpen, setAbolishedPickerOpen] = useState(false)
  // 점진적 공개: 좌표·시기·모체 등 선택 입력은 기본 접힘. 수정 시 값이 있으면 펼쳐 보여준다.
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [form, setForm] = useState<FormState>(() =>
    editing
      ? fromExisting(editing, allConfigs)
      : empty(defaultParent?.id ?? null),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const selectedPredecessor = useMemo(
    () =>
      form.predecessorId ? findInTree(allDivisions, form.predecessorId) : null,
    [allDivisions, form.predecessorId],
  )

  const selectedParent = useMemo(
    () => (form.parentId ? findInTree(allDivisions, form.parentId) : null),
    [allDivisions, form.parentId],
  )

  // 레벨은 "선택된 상위"에서 도출한다 — 상위가 있으면 그 레벨 + 1, 없으면 최상위(1차).
  // 트리 데이터가 늦게 로드돼 selectedParent가 잠깐 null이어도 레벨이 깜빡이지 않도록 폴백 유지.
  const parentConfig = selectedParent
    ? allConfigs.find((config) => config.id === selectedParent.adminDivisionId)
    : null
  const parentLevel = parentConfig?.divisionLevel ?? null
  const parentLabel = parentConfig?.divisionLabel ?? null
  const editingLevel = editing
    ? (allConfigs.find((config) => config.id === editing.adminDivisionId)
        ?.divisionLevel ?? defaultLevel)
    : defaultLevel
  const targetLevel = form.parentId
    ? parentLevel != null
      ? parentLevel + 1
      : editingLevel
    : 1
  const configsForLevel = allConfigs.filter(
    (config) => config.divisionLevel === targetLevel,
  )

  useEffect(() => {
    if (!isOpen) return
    if (editing) {
      setForm(fromExisting(editing, allConfigs))
      // 기존에 채워진 선택 정보가 있으면 '추가 정보'를 펼친 채로 연다.
      setShowAdvanced(
        editing.centerLat != null ||
          editing.centerLng != null ||
          !!editing.establishedDate ||
          !!editing.abolishedDate ||
          !!editing.predecessorId,
      )
    } else {
      const auto = configsForLevel.length === 1 ? configsForLevel[0]!.id : ''
      setForm({ ...empty(defaultParent?.id ?? null), configId: auto })
      setShowAdvanced(false)
    }
    setErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editing])

  // 상위를 바꾸면 레벨이 달라지므로, 현재 선택된 단위가 새 레벨에 없을 때만 재설정한다.
  useEffect(() => {
    if (!isOpen) return
    setForm((prev) => {
      if (prev.configId && configsForLevel.some((cfg) => cfg.id === prev.configId)) {
        return prev
      }
      const auto = configsForLevel.length === 1 ? configsForLevel[0]!.id : ''
      return { ...prev, configId: auto, newConfigLabel: '' }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLevel])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const submitting =
    createConfigMut.isPending ||
    createDivisionMut.isPending ||
    updateDivisionMut.isPending

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {}
    const trimmedName = form.name.trim()
    if (!trimmedName) {
      errs.name = '이름은 필수입니다'
    } else {
      // 같은 상위 아래 이름 중복 — 서버 왕복 전에 즉시 잡는다.
      const siblings = selectedParent
        ? (selectedParent.children ?? [])
        : allDivisions
      if (
        siblings.some((s) => s.id !== editing?.id && s.name === trimmedName)
      ) {
        errs.name = '같은 상위 안에 같은 이름이 이미 있습니다'
      }
    }
    if (configsForLevel.length === 0) {
      if (!form.newConfigLabel.trim())
        errs.newConfigLabel = `${targetLevel}차 단위명은 필수입니다`
    } else {
      if (!form.configId) errs.configId = '단위를 선택하세요'
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
      const est = dateSortKey(form.establishedDate)
      const ab = dateSortKey(form.abolishedDate)
      if (est != null && ab != null && est > ab) {
        errs.abolishedDate = '폐지일은 설립일 이후여야 합니다'
      }
    }
    return errs
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
      let configId = form.configId
      if (!configId) {
        const created = await createConfigMut.mutateAsync({
          ...owner,
          schemeId: schemeId ?? undefined,
          divisionLevel: targetLevel,
          divisionLabel: form.newConfigLabel.trim(),
        })
        configId = created.id
      }
      if (editing) {
        await updateDivisionMut.mutateAsync({
          id: editing.id,
          input: {
            adminDivisionId: configId,
            name: form.name.trim(),
            parentId: form.parentId || null,
            ...optionalFields,
          },
        })
        notify.success('행정구역을 수정했습니다')
      } else {
        await createDivisionMut.mutateAsync({
          ...owner,
          schemeId: schemeId ?? undefined,
          adminDivisionId: configId,
          name: form.name.trim(),
          parentId: form.parentId || null,
          ...optionalFields,
        })
        notify.success('행정구역을 등록했습니다')
      }
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '저장에 실패했습니다'
      const mapped = mapServerError(msg)
      setErrors((prev) => ({ ...prev, ...mapped }))
      notify.error(msg)
    }
  }

  // 컨텍스트 헤더 배지 — "지금 무엇을, 어디에" 한눈에.
  const countryName =
    (countryDetail as { name?: string } | undefined)?.name ??
    countryDisplay?.name ??
    ''
  const targetUnitLabel =
    configsForLevel.find((c) => c.id === form.configId)?.divisionLabel ||
    form.newConfigLabel.trim() ||
    // 같은 레벨에 단위가 여럿일 수 있으므로 미선택 시 임의 단위로 단정하지 않는다.
    (configsForLevel.length === 1 ? configsForLevel[0]?.divisionLabel : '') ||
    `${targetLevel}차 단위`
  const contextWhere = selectedParent ? `${selectedParent.name} 아래` : '최상위'
  const contextPath = [countryName, schemeName ?? undefined, contextWhere]
    .filter(Boolean)
    .join(' › ')

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? '행정구역 수정' : `${targetLevel}차 행정구역 등록`}
      maxWidth="560px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
        <ModalBody>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              marginBottom: 12,
              background: palette.badgeBg,
              border: `1px solid ${palette.badgeBorder}`,
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 500,
              color: palette.badgeText,
              flexWrap: 'wrap',
            }}
          >
            <FiMapPin size={12} />
            <span>
              {contextPath} ·{' '}
              {editing
                ? `${editing.name} 수정`
                : `${targetLevel}차 ${targetUnitLabel} 등록`}
            </span>
          </div>
          {errors._global && (
            <div
              style={{
                padding: '10px 12px',
                marginBottom: 12,
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 10,
                color: palette.isDark ? '#fca5a5' : '#b91c1c',
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
                owner={owner}
                schemeId={schemeId}
                selected={selectedParent}
                onChange={(id) => set('parentId', id)}
                onClear={() => set('parentId', '')}
                excludeIds={editing ? [editing.id] : []}
                placeholder="이름으로 검색 — 비워두면 최상위 (1차)"
              />
              <HintText>
                {selectedParent
                  ? `'${selectedParent.name}' 아래에 등록합니다.`
                  : '비워두면 최상위(1차) 행정구역으로 등록됩니다.'}
              </HintText>
              {errors.parentId && <ErrorText>{errors.parentId}</ErrorText>}
            </FieldFull>

            <FieldFull>
              <Label htmlFor="ad-config">
                행정 단위<Required>*</Required>
              </Label>
              {configsForLevel.length > 0 ? (
                <Select
                  id="ad-config"
                  value={form.configId}
                  onChange={(event) => set('configId', event.target.value)}
                >
                  <option value="">단위 선택 (예: 도·시·구)</option>
                  {configsForLevel.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.divisionLabel} ({config.divisionLevel}차)
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  id="ad-config"
                  value={form.newConfigLabel}
                  onChange={(event) =>
                    set('newConfigLabel', event.target.value)
                  }
                  maxLength={50}
                  placeholder={`${targetLevel}차 단위 이름 (예: ${levelExamples(targetLevel)})`}
                />
              )}
              {errors.configId && <ErrorText>{errors.configId}</ErrorText>}
              {errors.newConfigLabel && (
                <ErrorText>{errors.newConfigLabel}</ErrorText>
              )}
              <HintText>
                {configsForLevel.length === 0
                  ? `이 나라엔 아직 ${targetLevel}차 행정 단위가 없어요. 단위 이름을 정하면 함께 만들어집니다.`
                  : configsForLevel.length > 1
                    ? `${targetLevel}차에 단위가 여러 개입니다 — 적용할 단위를 선택하세요. (예: 카운티 vs 통합시)`
                    : selectedParent
                      ? `'${parentLabel ?? '상위'}' 바로 아래 단위(${targetLevel}차)입니다.`
                      : `최상위(1차) 단위입니다.`}
              </HintText>
            </FieldFull>

            <FieldFull>
              <Label htmlFor="ad-name">
                이름<Required>*</Required>
              </Label>
              <Input
                id="ad-name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                maxLength={100}
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
                maxLength={100}
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
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                aria-expanded={showAdvanced}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: palette.textSecondary,
                  background: palette.bgSecondary,
                  border: `1px solid ${palette.border}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    transform: showAdvanced ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.15s',
                  }}
                >
                  ▸
                </span>
                추가 정보 (좌표 · 설립/폐지일 · 이전 행정구역)
              </button>
            </FieldFull>

            {showAdvanced && (
              <>
                <CoordInputSection
                  palette={palette}
                  lat={form.centerLat}
                  lng={form.centerLng}
                  onChangeLat={(value) => set('centerLat', value)}
                  onChangeLng={(value) => set('centerLng', value)}
                  onPickCoords={(pickedLat, pickedLng) => {
                    setForm((prev) => ({
                      ...prev,
                      centerLat: pickedLat,
                      centerLng: pickedLng,
                    }))
                    setErrors((prev) => ({
                      ...prev,
                      centerLat: '',
                      centerLng: '',
                    }))
                  }}
                  latError={errors.centerLat}
                  lngError={errors.centerLng}
                  searchQuery={form.name}
                  countryIsoCode={
                    (countryDetail as { isoCode?: string } | undefined)?.isoCode
                  }
                  fallbackLat={
                    (
                      countryDetail as
                        | { latitude?: number | null }
                        | undefined
                    )?.latitude ??
                    countryDisplay?.latitude ??
                    null
                  }
                  fallbackLng={
                    (
                      countryDetail as
                        | { longitude?: number | null }
                        | undefined
                    )?.longitude ??
                    countryDisplay?.longitude ??
                    null
                  }
                  latInputId="ad-lat"
                  lngInputId="ad-lng"
                />

                <Field>
                  <Label>설립일</Label>
                  <DateButton
                    palette={palette}
                    onClick={() => setEstablishedPickerOpen(true)}
                    value={form.establishedDate}
                    onClear={() => set('establishedDate', '')}
                    placeholder="설립일 선택 (BCE 지원)"
                  />
                </Field>
                <Field>
                  <Label>폐지일</Label>
                  <DateButton
                    palette={palette}
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
                    owner={owner}
                    selected={selectedPredecessor}
                    onChange={(id) => set('predecessorId', id)}
                    onClear={() => set('predecessorId', '')}
                    excludeIds={editing ? [editing.id] : []}
                    placeholder="이름으로 검색"
                  />
                  <HintText>
                    분리·승격으로 신설된 구역이라면 이전 모체를 지정할 수
                    있습니다.
                  </HintText>
                  {errors.predecessorId && (
                    <ErrorText>{errors.predecessorId}</ErrorText>
                  )}
                </FieldFull>
              </>
            )}
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
      </form>
    </Modal>
  )
}

interface DateButtonProps {
  palette: RegionPalette
  onClick: () => void
  value: string
  onClear: () => void
  placeholder: string
}

function DateButton({
  palette,
  onClick,
  value,
  onClear,
  placeholder,
}: DateButtonProps) {
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
          border: `1px solid ${palette.borderMedium}`,
          borderRadius: 10,
          background: palette.bg,
          color: value ? palette.text : palette.textMuted,
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
            border: `1px solid ${palette.borderMedium}`,
            borderRadius: 10,
            background: palette.bg,
            color: palette.textSecondary,
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
