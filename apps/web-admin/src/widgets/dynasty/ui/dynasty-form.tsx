/**
 * 가문 등록·수정 폼 — 모달 본문에 들어가는 필드 그룹.
 * 외부 모달 푸터의 submit 버튼이 `form="<formId>"` 속성으로 submit하므로,
 * 폼 내부에는 저장 버튼이 없고 onSubmit 만 노출.
 */
import { useEffect, useId, useRef, useState } from 'react'

import type { Dynasty } from '@/shared/api/dynasty'
import type { DateInfoInput } from '@/shared/api/persons'
import {
  getUploadImageUrl,
  uploadImage,
  validateImageFile,
} from '@/shared/api/upload'
import {
  type PartialDateParts,
  buildPartialDateString,
  emptyPartialDateParts,
  isPartialRangeInverted,
  parsePartialDateString,
  partialDateFromResponse,
  partialDateFromStructured,
  partialPartsToDateInfo,
} from '@/shared/lib/partial-date-string'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { InlineDateField } from '@/shared/ui/person-register-modal/sections/inline-date-field'

import {
  DangerButton,
  FieldHelpText,
  FormError,
  FormGroupHeader,
  FormLabel,
  FormRow,
  ImagePreviewBox,
  RequiredMark,
  SecondaryButton,
  TextArea,
  TextInput,
} from './dynasty.styles'

/** 서버 응답 구조화 필드(우선) 또는 레거시 ISO+precision → 폼 파츠 복원. */
function partsFromDynasty(
  year: number | null,
  month: number | null,
  day: number | null,
  era: string | null,
  iso: string | null,
  precision: string | null,
): PartialDateParts {
  return parsePartialDateString(
    partialDateFromStructured(year, month, day, era) ||
      partialDateFromResponse(iso, era, precision),
  )
}

export type DynastyFormPayload = {
  name: string
  description: string
  /** 구조화 시작일 — BC·고대·연단위. 비우면 null(=시작일 축 클리어). */
  startDateInfo: DateInfoInput | null
  /** 구조화 종료일 — 비우면 null(=현재/미상). */
  endDateInfo: DateInfoInput | null
  startReason: string
  endReason: string
  originPlace: string
  founderText: string
  motto: string
  thumbnailUrl?: string | null
  crestImageUrl?: string | null
}

interface Props {
  /** 외부 submit 버튼이 `form` 속성으로 가리킬 form id */
  formId: string
  editing: Dynasty | null
  onSubmit: (data: DynastyFormPayload) => void | Promise<void>
}

/** 저장/업로드 에러 메시지 추출 — Unique constraint는 친화적 메시지로 변환. */
function extractErrorMessage(err: unknown, fallback: string): string {
  const e = err as {
    message?: string
    response?: { data?: { error?: { message?: string } } }
  }
  const apiMsg = e?.response?.data?.error?.message
  if (
    apiMsg?.includes('Unique constraint failed') ||
    e?.message?.includes('Unique constraint failed')
  ) {
    return '이미 존재하는 가문명입니다. 다른 이름을 사용해주세요.'
  }
  return apiMsg || e?.message || fallback
}

export function DynastyForm({ formId, editing, onSubmit }: Props) {
  const reactId = useId()
  const fieldId = (suffix: string) => `${reactId}-${suffix}`

  const [form, setForm] = useState({
    name: '',
    description: '',
    startReason: '',
    endReason: '',
    originPlace: '',
    founderText: '',
    motto: '',
  })
  // 날짜는 BC·고대·연단위 지원 위해 구조화 파츠로 별도 보관(문자열 input[type=date] 대체).
  const [start, setStart] = useState<PartialDateParts>(emptyPartialDateParts())
  const [end, setEnd] = useState<PartialDateParts>(emptyPartialDateParts())
  const [datePickerSide, setDatePickerSide] = useState<'start' | 'end' | null>(
    null,
  )
  const patchStart = (patch: Partial<PartialDateParts>) =>
    setStart((prev) => ({ ...prev, ...patch }))
  const patchEnd = (patch: Partial<PartialDateParts>) =>
    setEnd((prev) => ({ ...prev, ...patch }))
  const [thumbPath, setThumbPath] = useState('')
  const [thumbRemoved, setThumbRemoved] = useState(false)
  const [thumbUploading, setThumbUploading] = useState(false)
  const thumbInitialRef = useRef('')
  const thumbInputRef = useRef<HTMLInputElement>(null)
  const [crestPath, setCrestPath] = useState('')
  const [crestRemoved, setCrestRemoved] = useState(false)
  const [crestUploading, setCrestUploading] = useState(false)
  const crestInitialRef = useRef('')
  const crestInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name ?? '',
        description: editing.description ?? '',
        startReason: editing.startReason ?? '',
        endReason: editing.endReason ?? '',
        originPlace: editing.originPlace ?? '',
        founderText: editing.founderText ?? '',
        motto: editing.motto ?? '',
      })
      setStart(
        partsFromDynasty(
          editing.startYear,
          editing.startMonth,
          editing.startDay,
          editing.startEra,
          editing.startDate,
          editing.startDatePrecision,
        ),
      )
      setEnd(
        partsFromDynasty(
          editing.endYear,
          editing.endMonth,
          editing.endDay,
          editing.endEra,
          editing.endDate,
          editing.endDatePrecision,
        ),
      )
      const t = editing.thumbnailUrl ?? ''
      thumbInitialRef.current = t
      setThumbPath(t)
      setThumbRemoved(false)
      const c = editing.crestImageUrl ?? ''
      crestInitialRef.current = c
      setCrestPath(c)
      setCrestRemoved(false)
    } else {
      setForm({
        name: '',
        description: '',
        startReason: '',
        endReason: '',
        originPlace: '',
        founderText: '',
        motto: '',
      })
      setStart(emptyPartialDateParts())
      setEnd(emptyPartialDateParts())
      thumbInitialRef.current = ''
      setThumbPath('')
      setThumbRemoved(false)
      crestInitialRef.current = ''
      setCrestPath('')
      setCrestRemoved(false)
    }
    setError(null)
  }, [editing])

  // 종료 < 시작 소프트 경고(하드 거부 아님 — 추정·소급 등 정당 사례 허용).
  const dateInverted = isPartialRangeInverted(start, end)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) {
      setError('가문명을 입력해주세요.')
      return
    }
    try {
      await onSubmit({
        ...form,
        // partialPartsToDateInfo: 연도 없으면 undefined → null(축 클리어). 구조화 우선.
        startDateInfo: partialPartsToDateInfo(start) ?? null,
        endDateInfo: partialPartsToDateInfo(end) ?? null,
        thumbnailUrl: thumbRemoved ? null : thumbPath || undefined,
        crestImageUrl: crestRemoved ? null : crestPath || undefined,
      })
    } catch (err) {
      setError(extractErrorMessage(err, '저장 중 오류가 발생했습니다.'))
    }
  }

  return (
    <>
      <form id={formId} onSubmit={handleSave} noValidate>
      {error && <FormError role="alert">{error}</FormError>}

      <FormGroupHeader>기본 정보</FormGroupHeader>

        <FormRow>
          <FormLabel htmlFor={fieldId('name')}>
            가문명 <RequiredMark>*</RequiredMark>
          </FormLabel>
          <TextInput
            id={fieldId('name')}
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="예: 조선 왕조"
            required
          />
        </FormRow>

        <FormRow>
          <FormLabel>시작일 · 종료일</FormLabel>
          <div style={{ display: 'flex', flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <FieldHelpText style={{ margin: 0 }}>성립</FieldHelpText>
              <InlineDateField
                ariaLabel="가문 시작일"
                era={start.era}
                year={start.year}
                month={start.month}
                day={start.day}
                onEra={(era) => patchStart({ era })}
                onYear={(year) => patchStart({ year })}
                onMonth={(month) => patchStart({ month })}
                onDay={(day) => patchStart({ day })}
                onOpenPicker={() => setDatePickerSide('start')}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <FieldHelpText style={{ margin: 0 }}>단절 (비우면 존속 중)</FieldHelpText>
              <InlineDateField
                ariaLabel="가문 종료일"
                era={end.era}
                year={end.year}
                month={end.month}
                day={end.day}
                onEra={(era) => patchEnd({ era })}
                onYear={(year) => patchEnd({ year })}
                onMonth={(month) => patchEnd({ month })}
                onDay={(day) => patchEnd({ day })}
                onOpenPicker={() => setDatePickerSide('end')}
                error={dateInverted}
                ariaDescribedBy={dateInverted ? fieldId('date-error') : undefined}
              />
            </div>
          </div>
          <FieldHelpText>
            연도만 입력해도 됩니다(월·일 생략 가능). 기원전은 BC 버튼, 정확한 날짜는 달력(📅)으로.
          </FieldHelpText>
          {dateInverted && (
            <FieldHelpText id={fieldId('date-error')} role="alert" style={{ color: 'var(--danger, #ef4444)' }}>
              종료일이 시작일보다 앞섭니다. 확인해 주세요.
            </FieldHelpText>
          )}
        </FormRow>

        <FormRow>
          <FormLabel htmlFor={fieldId('startReason')}>성립 사유 · 단절 사유</FormLabel>
          <div style={{ display: 'flex', flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <TextInput
              id={fieldId('startReason')}
              type="text"
              value={form.startReason}
              onChange={(e) => setForm((f) => ({ ...f, startReason: e.target.value }))}
              placeholder="성립 사유 — 예: 역성혁명 건국, 초대 백작 서임"
              aria-label="성립 사유"
              maxLength={200}
              style={{ flex: '1 1 220px', minWidth: 0 }}
            />
            <TextInput
              id={fieldId('endReason')}
              type="text"
              value={form.endReason}
              onChange={(e) => setForm((f) => ({ ...f, endReason: e.target.value }))}
              placeholder="단절 사유 — 예: 경술국치 병합, 2월혁명 폐위"
              aria-label="단절 사유"
              maxLength={200}
              style={{ flex: '1 1 220px', minWidth: 0 }}
            />
          </div>
          <FieldHelpText>
            가문 자체의 흥망 서사입니다. 특정 국가 통치의 종료(통치 종료 사유)와는 별개입니다.
          </FieldHelpText>
        </FormRow>

        <FormRow>
          <FormLabel htmlFor={fieldId('description')}>설명</FormLabel>
          <TextArea
            id={fieldId('description')}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="가문에 대한 설명, 역할 등"
            rows={3}
          />
        </FormRow>

        <FormGroupHeader>메타데이터</FormGroupHeader>

        <FormRow>
          <FormLabel htmlFor={fieldId('originPlace')}>본관 · 발상지</FormLabel>
          <TextInput
            id={fieldId('originPlace')}
            type="text"
            value={form.originPlace}
            onChange={(e) => setForm((f) => ({ ...f, originPlace: e.target.value }))}
            placeholder="예: 김해, Habsburg"
          />
        </FormRow>

        <FormRow>
          <FormLabel htmlFor={fieldId('founderText')}>시조</FormLabel>
          <TextInput
            id={fieldId('founderText')}
            type="text"
            value={form.founderText}
            onChange={(e) => setForm((f) => ({ ...f, founderText: e.target.value }))}
            placeholder="시조 이름 (인물 등록되어 있으면 추후 연결)"
          />
        </FormRow>

        <FormRow>
          <FormLabel htmlFor={fieldId('motto')}>가훈 · 모토</FormLabel>
          <TextInput
            id={fieldId('motto')}
            type="text"
            value={form.motto}
            onChange={(e) => setForm((f) => ({ ...f, motto: e.target.value }))}
            placeholder='예: "AEIOU"'
          />
        </FormRow>

        <FormGroupHeader>미디어</FormGroupHeader>

        <FormRow>
          <FormLabel htmlFor={fieldId('thumbnail')}>썸네일</FormLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              id={fieldId('thumbnail')}
              ref={thumbInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                try {
                  validateImageFile(file)
                } catch (err) {
                  setError(extractErrorMessage(err, '이미지를 처리할 수 없습니다.'))
                  return
                }
                setThumbUploading(true)
                setError(null)
                try {
                  const r = await uploadImage(file, 'dynasties')
                  setThumbPath(r.url)
                  setThumbRemoved(false)
                } catch (err) {
                  setError(extractErrorMessage(err, '이미지 업로드에 실패했습니다.'))
                } finally {
                  setThumbUploading(false)
                }
              }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <SecondaryButton
                type="button"
                disabled={thumbUploading}
                onClick={() => thumbInputRef.current?.click()}
              >
                {thumbUploading ? '업로드 중…' : '이미지 선택'}
              </SecondaryButton>
              {(thumbPath ||
                (editing && thumbInitialRef.current && !thumbRemoved)) && (
                <DangerButton
                  type="button"
                  disabled={thumbUploading}
                  onClick={() => {
                    setThumbPath('')
                    setThumbRemoved(true)
                  }}
                >
                  썸네일 제거
                </DangerButton>
              )}
            </div>
            <FieldHelpText>
              JPG·PNG·WebP 등 이미지 파일을 업로드합니다. (최대 10MB)
            </FieldHelpText>
            {!thumbRemoved && thumbPath && (
              <ImagePreviewBox>
                <img
                  src={getUploadImageUrl(thumbPath)}
                  alt={form.name ? `${form.name} 가문 썸네일 미리보기` : '가문 썸네일 미리보기'}
                  onError={(ev) => {
                    ev.currentTarget.style.display = 'none'
                  }}
                />
              </ImagePreviewBox>
            )}
          </div>
        </FormRow>

        <FormRow>
          <FormLabel htmlFor={fieldId('crest')}>가문 상징(문장)</FormLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              id={fieldId('crest')}
              ref={crestInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                try {
                  validateImageFile(file)
                } catch (err) {
                  setError(extractErrorMessage(err, '이미지를 처리할 수 없습니다.'))
                  return
                }
                setCrestUploading(true)
                setError(null)
                try {
                  const r = await uploadImage(file, 'dynasties')
                  setCrestPath(r.url)
                  setCrestRemoved(false)
                } catch (err) {
                  setError(extractErrorMessage(err, '이미지 업로드에 실패했습니다.'))
                } finally {
                  setCrestUploading(false)
                }
              }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <SecondaryButton
                type="button"
                disabled={crestUploading}
                onClick={() => crestInputRef.current?.click()}
              >
                {crestUploading ? '업로드 중…' : '문장 이미지 선택'}
              </SecondaryButton>
              {(crestPath ||
                (editing && crestInitialRef.current && !crestRemoved)) && (
                <DangerButton
                  type="button"
                  disabled={crestUploading}
                  onClick={() => {
                    setCrestPath('')
                    setCrestRemoved(true)
                  }}
                >
                  문장 제거
                </DangerButton>
              )}
            </div>
            {!crestRemoved && crestPath && (
              <ImagePreviewBox $contain>
                <img
                  src={getUploadImageUrl(crestPath)}
                  alt={form.name ? `${form.name} 가문 상징(문장) 미리보기` : '가문 상징(문장) 미리보기'}
                  onError={(ev) => {
                    ev.currentTarget.style.display = 'none'
                  }}
                />
              </ImagePreviewBox>
            )}
          </div>
        </FormRow>
      </form>

      {datePickerSide &&
        (() => {
          const parts = datePickerSide === 'start' ? start : end
          const initialDate =
            parts.year && parts.month && parts.day
              ? buildPartialDateString(parts)
              : undefined
          const apply = datePickerSide === 'start' ? patchStart : patchEnd
          return (
            <DatePickerModal
              isOpen
              initialDate={initialDate}
              title={datePickerSide === 'start' ? '가문 시작일' : '가문 종료일'}
              onSelect={(date) => {
                apply(parsePartialDateString(date))
                setDatePickerSide(null)
              }}
              onClose={() => setDatePickerSide(null)}
            />
          )
        })()}
    </>
  )
}
