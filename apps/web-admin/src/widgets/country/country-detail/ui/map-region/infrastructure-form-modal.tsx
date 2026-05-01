/**
 * 인프라 항목 등록·수정 모달.
 */
import { useEffect, useState } from 'react'

import { FiX } from 'react-icons/fi'
import { toast } from 'react-hot-toast'

import {
  type Infrastructure,
  type InfrastructureType,
  useCreateInfrastructure,
  useUpdateInfrastructure,
} from '@/entities/country/api.infrastructure'
import {
  ModalBody,
  ModalBox,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from '@/shared/ui/modal'

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

interface InfrastructureFormModalProps {
  isOpen: boolean
  countryId: string
  editing: Infrastructure | null
  defaultType?: InfrastructureType
  onClose: () => void
}

interface FormState {
  type: InfrastructureType
  name: string
  localName: string
  code: string
  region: string
  latitude: string
  longitude: string
  lengthKm: string
  capacity: string
  operatorName: string
  openedYear: string
}

const TYPE_OPTIONS: { value: InfrastructureType; label: string }[] = [
  { value: 'highway', label: '고속도로' },
  { value: 'railway', label: '철도' },
  { value: 'airport', label: '공항' },
  { value: 'port', label: '항구' },
]

const empty = (defaultType: InfrastructureType): FormState => ({
  type: defaultType,
  name: '',
  localName: '',
  code: '',
  region: '',
  latitude: '',
  longitude: '',
  lengthKm: '',
  capacity: '',
  operatorName: '',
  openedYear: '',
})

const fromExisting = (i: Infrastructure): FormState => ({
  type: i.type,
  name: i.name,
  localName: i.localName ?? '',
  code: i.code ?? '',
  region: i.region ?? '',
  latitude: i.latitude == null ? '' : String(i.latitude),
  longitude: i.longitude == null ? '' : String(i.longitude),
  lengthKm: i.lengthKm == null ? '' : String(i.lengthKm),
  capacity: i.capacity ?? '',
  operatorName: i.operatorName ?? '',
  openedYear: i.openedYear == null ? '' : String(i.openedYear),
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
  if (form.lengthKm.trim() !== '') {
    const l = Number(form.lengthKm)
    if (!Number.isFinite(l) || l < 0) errs.lengthKm = '길이는 0 이상의 숫자'
  }
  if (form.openedYear.trim() !== '') {
    const y = Number(form.openedYear)
    if (!Number.isInteger(y) || y < 0 || y > 9999)
      errs.openedYear = '연도는 0~9999 정수'
  }
  return errs
}

const codeLabel: Record<InfrastructureType, string> = {
  highway: '노선번호',
  railway: '노선번호/식별자',
  airport: 'IATA 코드',
  port: '항구 코드',
}

const codePlaceholder: Record<InfrastructureType, string> = {
  highway: '예: 1번',
  railway: '예: KTX',
  airport: '예: ICN',
  port: '예: KRPUS',
}

export function InfrastructureFormModal({
  isOpen,
  countryId,
  editing,
  defaultType = 'highway',
  onClose,
}: InfrastructureFormModalProps) {
  const [form, setForm] = useState<FormState>(() =>
    editing ? fromExisting(editing) : empty(defaultType),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createMut = useCreateInfrastructure()
  const updateMut = useUpdateInfrastructure()
  const submitting = createMut.isPending || updateMut.isPending

  useEffect(() => {
    if (!isOpen) return
    setForm(editing ? fromExisting(editing) : empty(defaultType))
    setErrors({})
  }, [isOpen, editing, defaultType])

  if (!isOpen) return null

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
      code: form.code.trim() || null,
      region: form.region.trim() || null,
      latitude: parseNumber(form.latitude) ?? null,
      longitude: parseNumber(form.longitude) ?? null,
      lengthKm: parseNumber(form.lengthKm) ?? null,
      capacity: form.capacity.trim() || null,
      operatorName: form.operatorName.trim() || null,
      openedYear: parseNumber(form.openedYear) ?? null,
    }

    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, data: payload })
        toast.success('인프라 항목을 수정했습니다')
      } else {
        await createMut.mutateAsync({ countryId, ...payload })
        toast.success('인프라 항목을 등록했습니다')
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장에 실패했습니다')
    }
  }

  const showLength = form.type === 'highway' || form.type === 'railway'
  const showCapacity = form.type === 'airport' || form.type === 'port'

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
            {editing ? '인프라 항목 수정' : '인프라 항목 등록'}
          </ModalTitle>
          <ModalCloseButton type="button" onClick={onClose} aria-label="닫기">
            <FiX />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <FormGrid>
            <Field>
              <Label htmlFor="if-type">
                유형<Required>*</Required>
              </Label>
              <Select
                id="if-type"
                value={form.type}
                onChange={(e) =>
                  set('type', e.target.value as InfrastructureType)
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
              <Label htmlFor="if-name">
                명칭<Required>*</Required>
              </Label>
              <Input
                id="if-name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="예: 인천국제공항"
                autoFocus
              />
              {errors.name && <ErrorText>{errors.name}</ErrorText>}
            </Field>

            <Field>
              <Label htmlFor="if-localName">현지어 명칭</Label>
              <Input
                id="if-localName"
                value={form.localName}
                onChange={(e) => set('localName', e.target.value)}
                placeholder="예: Incheon International Airport"
              />
            </Field>
            <Field>
              <Label htmlFor="if-code">{codeLabel[form.type]}</Label>
              <Input
                id="if-code"
                value={form.code}
                onChange={(e) => set('code', e.target.value)}
                placeholder={codePlaceholder[form.type]}
              />
            </Field>

            <Field>
              <Label htmlFor="if-region">지역</Label>
              <Input
                id="if-region"
                value={form.region}
                onChange={(e) => set('region', e.target.value)}
                placeholder="예: 인천광역시 중구"
              />
            </Field>
            <Field>
              <Label htmlFor="if-operator">운영 기관</Label>
              <Input
                id="if-operator"
                value={form.operatorName}
                onChange={(e) => set('operatorName', e.target.value)}
                placeholder="예: 인천국제공항공사"
              />
            </Field>

            <Field>
              <Label htmlFor="if-lat">위도</Label>
              <Input
                id="if-lat"
                type="number"
                step="0.0000001"
                value={form.latitude}
                onChange={(e) => set('latitude', e.target.value)}
                placeholder="-90 ~ 90"
              />
              {errors.latitude && <ErrorText>{errors.latitude}</ErrorText>}
            </Field>
            <Field>
              <Label htmlFor="if-lng">경도</Label>
              <Input
                id="if-lng"
                type="number"
                step="0.0000001"
                value={form.longitude}
                onChange={(e) => set('longitude', e.target.value)}
                placeholder="-180 ~ 180"
              />
              {errors.longitude && <ErrorText>{errors.longitude}</ErrorText>}
            </Field>

            {showLength && (
              <Field>
                <Label htmlFor="if-length">길이 (km)</Label>
                <Input
                  id="if-length"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.lengthKm}
                  onChange={(e) => set('lengthKm', e.target.value)}
                  placeholder="예: 416.0"
                />
                {errors.lengthKm && <ErrorText>{errors.lengthKm}</ErrorText>}
              </Field>
            )}
            {showCapacity && (
              <Field>
                <Label htmlFor="if-capacity">이용량/처리능력</Label>
                <Input
                  id="if-capacity"
                  value={form.capacity}
                  onChange={(e) => set('capacity', e.target.value)}
                  placeholder="예: 연 7천만명, 20만 TEU"
                />
              </Field>
            )}
            <Field>
              <Label htmlFor="if-opened">개통 연도</Label>
              <Input
                id="if-opened"
                type="number"
                step="1"
                min="0"
                max="9999"
                value={form.openedYear}
                onChange={(e) => set('openedYear', e.target.value)}
                placeholder="예: 2001"
              />
              {errors.openedYear && (
                <ErrorText>{errors.openedYear}</ErrorText>
              )}
            </Field>

            <FieldFull>
              <HintText>
                노선 구간·차로수·역 수 등 부가 정보는 추후 attributes 필드로
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
      </ModalBox>
    </ModalOverlay>
  )
}
