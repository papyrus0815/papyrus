/**
 * 자연 지리 항목 등록·수정 모달.
 * type별로 보이는 1급 필드가 다름:
 *   - mountain → height_m
 *   - river / coast → length_km
 *   - lake → area_sq_km
 */
import { useEffect, useState } from 'react'

import {
  type NaturalFeature,
  type NaturalFeatureType,
  useCreateNaturalFeature,
  useUpdateNaturalFeature,
} from '@/entities/country/api.natural-feature'
import { Modal, ModalBody, ModalFooter } from '@/shared/ui/modal'
import { notify } from '@/shared/ui/toast'

import {
  CheckboxRow,
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

interface NaturalFeatureFormModalProps {
  isOpen: boolean
  countryId: string
  /** 수정 시 채워진 데이터, 등록 시 null */
  editing: NaturalFeature | null
  /** 등록 모드일 때 미리 선택된 type (선택된 필터 값 등) */
  defaultType?: NaturalFeatureType
  onClose: () => void
}

interface FormState {
  type: NaturalFeatureType
  name: string
  localName: string
  region: string
  latitude: string
  longitude: string
  heightM: string
  lengthKm: string
  areaSqKm: string
  isProtected: boolean
}

const TYPE_OPTIONS: { value: NaturalFeatureType; label: string }[] = [
  { value: 'mountain', label: '산' },
  { value: 'river', label: '강' },
  { value: 'lake', label: '호수' },
  { value: 'coast', label: '해안' },
]

const empty = (defaultType: NaturalFeatureType): FormState => ({
  type: defaultType,
  name: '',
  localName: '',
  region: '',
  latitude: '',
  longitude: '',
  heightM: '',
  lengthKm: '',
  areaSqKm: '',
  isProtected: false,
})

const fromExisting = (f: NaturalFeature): FormState => ({
  type: f.type,
  name: f.name,
  localName: f.localName ?? '',
  region: f.region ?? '',
  latitude: f.latitude == null ? '' : String(f.latitude),
  longitude: f.longitude == null ? '' : String(f.longitude),
  heightM: f.heightM == null ? '' : String(f.heightM),
  lengthKm: f.lengthKm == null ? '' : String(f.lengthKm),
  areaSqKm: f.areaSqKm == null ? '' : String(f.areaSqKm),
  isProtected: f.isProtected,
})

function parseNumber(value: string): number | null | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

function validate(form: FormState): Record<string, string> {
  const errs: Record<string, string> = {}
  if (!form.name.trim()) errs.name = '명칭은 필수입니다'

  if (form.latitude.trim() !== '') {
    const lat = Number(form.latitude)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90)
      errs.latitude = '위도는 -90 ~ 90 사이여야 합니다'
  }
  if (form.longitude.trim() !== '') {
    const lng = Number(form.longitude)
    if (!Number.isFinite(lng) || lng < -180 || lng > 180)
      errs.longitude = '경도는 -180 ~ 180 사이여야 합니다'
  }
  if (form.type === 'mountain' && form.heightM.trim() !== '') {
    const h = Number(form.heightM)
    if (!Number.isFinite(h) || h < 0) errs.heightM = '고도는 0 이상 정수'
  }
  if (
    (form.type === 'river' || form.type === 'coast') &&
    form.lengthKm.trim() !== ''
  ) {
    const l = Number(form.lengthKm)
    if (!Number.isFinite(l) || l < 0) errs.lengthKm = '길이는 0 이상의 숫자'
  }
  if (form.type === 'lake' && form.areaSqKm.trim() !== '') {
    const a = Number(form.areaSqKm)
    if (!Number.isFinite(a) || a < 0) errs.areaSqKm = '면적은 0 이상의 숫자'
  }
  return errs
}

export function NaturalFeatureFormModal({
  isOpen,
  countryId,
  editing,
  defaultType = 'mountain',
  onClose,
}: NaturalFeatureFormModalProps) {
  const [form, setForm] = useState<FormState>(() =>
    editing ? fromExisting(editing) : empty(defaultType),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createMut = useCreateNaturalFeature()
  const updateMut = useUpdateNaturalFeature()
  const submitting = createMut.isPending || updateMut.isPending

  useEffect(() => {
    if (!isOpen) return
    setForm(editing ? fromExisting(editing) : empty(defaultType))
    setErrors({})
  }, [isOpen, editing, defaultType])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const payload = {
      type: form.type,
      name: form.name.trim(),
      localName: form.localName.trim() || null,
      region: form.region.trim() || null,
      latitude: parseNumber(form.latitude) ?? null,
      longitude: parseNumber(form.longitude) ?? null,
      heightM:
        form.type === 'mountain' ? (parseNumber(form.heightM) ?? null) : null,
      lengthKm:
        form.type === 'river' || form.type === 'coast'
          ? (parseNumber(form.lengthKm) ?? null)
          : null,
      areaSqKm:
        form.type === 'lake' ? (parseNumber(form.areaSqKm) ?? null) : null,
      isProtected: form.isProtected,
    }

    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, data: payload })
        notify.success('자연 지리 항목을 수정했습니다')
      } else {
        await createMut.mutateAsync({ countryId, ...payload })
        notify.success('자연 지리 항목을 등록했습니다')
      }
      onClose()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '저장에 실패했습니다')
    }
  }

  const showHeight = form.type === 'mountain'
  const showLength = form.type === 'river' || form.type === 'coast'
  const showArea = form.type === 'lake'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? '자연 지리 항목 수정' : '자연 지리 항목 등록'}
      maxWidth="560px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
        <ModalBody>
          <FormGrid>
            <Field>
              <Label htmlFor="nf-type">
                유형<Required>*</Required>
              </Label>
              <Select
                id="nf-type"
                value={form.type}
                onChange={(e) =>
                  set('type', e.target.value as NaturalFeatureType)
                }
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label htmlFor="nf-name">
                명칭<Required>*</Required>
              </Label>
              <Input
                id="nf-name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="예: 한라산"
                autoFocus
              />
              {errors.name && <ErrorText>{errors.name}</ErrorText>}
            </Field>

            <Field>
              <Label htmlFor="nf-localName">현지어 명칭</Label>
              <Input
                id="nf-localName"
                value={form.localName}
                onChange={(e) => set('localName', e.target.value)}
                placeholder="예: Hallasan"
              />
            </Field>
            <Field>
              <Label htmlFor="nf-region">지역</Label>
              <Input
                id="nf-region"
                value={form.region}
                onChange={(e) => set('region', e.target.value)}
                placeholder="예: 제주특별자치도"
              />
            </Field>

            <Field>
              <Label htmlFor="nf-lat">위도</Label>
              <Input
                id="nf-lat"
                type="number"
                step="0.0000001"
                value={form.latitude}
                onChange={(e) => set('latitude', e.target.value)}
                placeholder="-90 ~ 90"
              />
              {errors.latitude && <ErrorText>{errors.latitude}</ErrorText>}
            </Field>
            <Field>
              <Label htmlFor="nf-lng">경도</Label>
              <Input
                id="nf-lng"
                type="number"
                step="0.0000001"
                value={form.longitude}
                onChange={(e) => set('longitude', e.target.value)}
                placeholder="-180 ~ 180"
              />
              {errors.longitude && <ErrorText>{errors.longitude}</ErrorText>}
            </Field>

            {showHeight && (
              <Field>
                <Label htmlFor="nf-height">고도 (m)</Label>
                <Input
                  id="nf-height"
                  type="number"
                  step="1"
                  min="0"
                  value={form.heightM}
                  onChange={(e) => set('heightM', e.target.value)}
                  placeholder="예: 1947"
                />
                {errors.heightM && <ErrorText>{errors.heightM}</ErrorText>}
              </Field>
            )}
            {showLength && (
              <Field>
                <Label htmlFor="nf-length">길이 (km)</Label>
                <Input
                  id="nf-length"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.lengthKm}
                  onChange={(e) => set('lengthKm', e.target.value)}
                  placeholder="예: 525.5"
                />
                {errors.lengthKm && <ErrorText>{errors.lengthKm}</ErrorText>}
              </Field>
            )}
            {showArea && (
              <Field>
                <Label htmlFor="nf-area">면적 (km²)</Label>
                <Input
                  id="nf-area"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.areaSqKm}
                  onChange={(e) => set('areaSqKm', e.target.value)}
                  placeholder="예: 7.85"
                />
                {errors.areaSqKm && <ErrorText>{errors.areaSqKm}</ErrorText>}
              </Field>
            )}

            <CheckboxRow>
              <input
                type="checkbox"
                checked={form.isProtected}
                onChange={(e) => set('isProtected', e.target.checked)}
              />
              <span>국립공원·보호구역으로 지정됨</span>
            </CheckboxRow>

            <FieldFull>
              <HintText>
                추가 부가 정보(수원지·하구·수심 등)는 추후 attributes 필드로
                확장 예정입니다.
              </HintText>
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
      </form>
    </Modal>
  )
}
