/**
 * 가문 등록·수정 폼 — 모달 본문에 들어가는 필드 그룹.
 * 외부 모달 푸터의 submit 버튼이 `form="<formId>"` 속성으로 submit하므로,
 * 폼 내부에는 저장 버튼이 없고 onSubmit 만 노출.
 */
import { useEffect, useId, useRef, useState } from 'react'

import type { Dynasty } from '@/shared/api/dynasty'
import {
  getUploadImageUrl,
  uploadImage,
  validateImageFile,
} from '@/shared/api/upload'

import {
  DangerButton,
  DateInput,
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

/** 서버 ISO 문자열을 input[type=date]용 YYYY-MM-DD 로 변환 (TZ 변환 없이 앞 10자만 절단). */
function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  // 서버는 항상 'YYYY-MM-DDT...' 형태로 응답 — Date 객체를 거치면 사용자 TZ 만큼 하루가 밀릴 수 있음
  return iso.length >= 10 ? iso.slice(0, 10) : ''
}

export type DynastyFormPayload = {
  name: string
  description: string
  startDate: string
  endDate: string
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
    startDate: '',
    endDate: '',
    originPlace: '',
    founderText: '',
    motto: '',
  })
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
        startDate: toDateInputValue(editing.startDate),
        endDate: toDateInputValue(editing.endDate),
        originPlace: editing.originPlace ?? '',
        founderText: editing.founderText ?? '',
        motto: editing.motto ?? '',
      })
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
        startDate: '',
        endDate: '',
        originPlace: '',
        founderText: '',
        motto: '',
      })
      thumbInitialRef.current = ''
      setThumbPath('')
      setThumbRemoved(false)
      crestInitialRef.current = ''
      setCrestPath('')
      setCrestRemoved(false)
    }
    setError(null)
  }, [editing])

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
        thumbnailUrl: thumbRemoved ? null : thumbPath || undefined,
        crestImageUrl: crestRemoved ? null : crestPath || undefined,
      })
    } catch (err) {
      setError(extractErrorMessage(err, '저장 중 오류가 발생했습니다.'))
    }
  }

  return (
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
          <FormLabel htmlFor={fieldId('startDate')}>시작일 · 종료일</FormLabel>
          <div style={{ display: 'flex', flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <DateInput
              id={fieldId('startDate')}
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              aria-label="시작일"
              $filled={Boolean(form.startDate)}
            />
            <DateInput
              id={fieldId('endDate')}
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              aria-label="종료일"
              $filled={Boolean(form.endDate)}
            />
          </div>
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
  )
}
