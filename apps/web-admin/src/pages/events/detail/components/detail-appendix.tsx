import { useEffect, useRef, useState } from 'react'

import { FiPlus, FiStar, FiUploadCloud, FiX } from 'react-icons/fi'
import { toast } from 'react-hot-toast'
import styled, { css } from 'styled-components'

import { ledgerHairlineStrong } from '@/pages/events/ledger/styles/ledger-tokens'
import { type UpdateEventDto } from '@/shared/api/events'
import { getUploadImageUrl, uploadImage } from '@/shared/api/upload'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'
import { InlineText } from './inline'

interface DetailAppendixProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto) => void
}

/**
 * 부록 — 이미지 갤러리.
 *
 * 추가: + 이미지 추가 → 파일 업로드 또는 URL 인풋 → eventImages 배열에 append.
 *   * 드롭존 활성화 — Grid·AddBtn 영역 모두에 파일 drop 가능.
 * 캡션/출처: 그리드 안에서 click-to-edit (InlineText).
 * Primary: 별 아이콘 토글 — 한 번에 1개만 primary.
 * 삭제: 우상단 ✕.
 */
export function DetailAppendix({ event, onPatch }: DetailAppendixProps) {
  const [lightbox, setLightbox] = useState<{ src: string; caption?: string } | null>(
    null,
  )
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ url: '', caption: '', source: '' })
  /** 파일 업로드 진행 상태 — UI 잠금·중복 트리거 방지. */
  const [uploading, setUploading] = useState(false)
  /** 드롭존 hover 효과(전체 그리드 영역에 작용). */
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  /* lightbox 열릴 때 trigger 저장 → 닫힐 때 focus 복원. */
  const lightboxTriggerRef = useRef<HTMLElement | null>(null)
  const lightboxCloseRef = useRef<HTMLButtonElement | null>(null)

  /* Esc로 lightbox 닫기 + 열릴 때 close 버튼 focus, 닫힐 때 trigger 복원. */
  useEffect(() => {
    if (!lightbox) return undefined
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    /* 다음 프레임에 close 버튼으로 focus 이동 — Tab이 lightbox 안에서 시작. */
    const focusTimer = window.setTimeout(() => {
      lightboxCloseRef.current?.focus()
    }, 0)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(focusTimer)
      /* 닫힘 직후 원래 trigger로 focus 복원. */
      lightboxTriggerRef.current?.focus()
      lightboxTriggerRef.current = null
    }
  }, [lightbox])

  /**
   * 표시 순서는 *primary 먼저, 이후 배열 index 순*.
   *
   * server `order` 필드는 array index와 1:1이라 별도 정렬 키로 쓰지 않는다 —
   * `serialize`가 idx로 덮어쓰므로 권위는 array 순서. primary만 sort에 영향.
   */
  const images = (event.eventImages ?? [])
    .slice()
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
      return (a.order ?? 0) - (b.order ?? 0)
    })

  /* 서버에 보낼 형태로 직렬화 — id 빠지고 imageUrl/caption/source/order/isPrimary만.
     order는 array index와 동기화 — 호출 측은 array를 *원하는 순서로* 넘기면 됨. */
  const serialize = (list: typeof images) =>
    list.map((img, idx) => ({
      imageUrl: img.imageUrl,
      caption: img.caption,
      source: img.source,
      order: idx,
      isPrimary: img.isPrimary,
    }))

  const removeImage = (id: string) => {
    const filtered = images.filter((img) => img.id !== id)
    /* primary였던 이미지를 제거하면 첫 번째 남은 이미지를 primary로 승격 —
       모든 이미지가 isPrimary=false가 되는 상태를 만들지 않도록. */
    if (
      images.find((img) => img.id === id)?.isPrimary &&
      filtered.length > 0 &&
      !filtered.some((img) => img.isPrimary)
    ) {
      filtered[0] = { ...filtered[0], isPrimary: true }
    }
    onPatch({ eventImages: serialize(filtered) })
  }

  /** primary 토글 — 항상 1개만 primary. 같은 이미지를 다시 누르면 토글 X(유지). */
  const setPrimary = (id: string) => {
    const next = images.map((img) => ({ ...img, isPrimary: img.id === id }))
    onPatch({ eventImages: serialize(next) })
  }

  /** 캡션·출처 인라인 수정 — 같은 array에서 해당 row만 업데이트하고 통째로 PUT. */
  const updateImageField = (
    id: string,
    patch: { caption?: string; source?: string },
  ) => {
    const next = images.map((img) => {
      if (img.id !== id) return img
      return {
        ...img,
        caption:
          patch.caption !== undefined
            ? patch.caption.trim() || undefined
            : img.caption,
        source:
          patch.source !== undefined
            ? patch.source.trim() || undefined
            : img.source,
      }
    })
    onPatch({ eventImages: serialize(next) })
  }

  const addImage = () => {
    const url = draft.url.trim()
    if (!url) return

    // URL 검증 — 형식·scheme 화이트리스트. 상대 경로(/uploads/...)는 허용.
    if (!isAcceptableImageUrl(url)) {
      toast.error('이미지 URL이 올바르지 않습니다. http(s):// 또는 /uploads/ 경로를 사용하세요.')
      return
    }

    // 중복 URL 차단 — 같은 이미지를 두 번 추가하지 않게.
    if (images.some((img) => img.imageUrl === url)) {
      toast.error('이미 추가된 이미지입니다.')
      return
    }

    appendImage({
      imageUrl: url,
      caption: draft.caption.trim() || undefined,
      source: draft.source.trim() || undefined,
    })
    setDraft({ url: '', caption: '', source: '' })
    setAdding(false)
  }

  /**
   * 신규 이미지 1건 append 후 서버에 PUT. URL/업로드 경로 양쪽이 같은 종착점이라
   * 한 함수로 묶어 동작 일관성 보장.
   */
  const appendImage = (entry: { imageUrl: string; caption?: string; source?: string }) => {
    const next = [
      ...images,
      {
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        imageUrl: entry.imageUrl,
        caption: entry.caption,
        source: entry.source,
        order: images.length,
        isPrimary: images.length === 0, // 첫 이미지는 자동 primary
      },
    ]
    onPatch({ eventImages: serialize(next) })
  }

  /**
   * 파일 업로드 — 다중 파일 지원. 각 파일은 *직렬로* 업로드 후 즉시 append.
   * 병렬로 보내면 onPatch가 빠르게 연달아 호출되며 race가 생길 수 있다(`event` 스냅샷이
   * 서버 반영 전 stale 상태로 다음 patch에 들어감).
   */
  const handleFiles = async (files: FileList | File[]) => {
    if (uploading) return
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (list.length === 0) return
    setUploading(true)
    try {
      for (const file of list) {
        try {
          const result = await uploadImage(file, 'events')
          const url = getUploadImageUrl(result.url) || result.url
          if (images.some((img) => img.imageUrl === url)) {
            toast.error(`이미 추가된 이미지입니다: ${file.name}`)
            continue
          }
          appendImage({ imageUrl: url })
          /* 다음 파일이 현재 images snapshot 위에 쌓이도록 — useUndoablePatch 토스트가
             1건씩 발생하지만 의도된 흐름. */
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          toast.error(`${file.name}: ${msg}`)
        }
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  /**
   * 허용 URL 정책:
   *  - 절대 URL: http:// 또는 https://. javascript:/data:/file: 등은 차단.
   *  - 상대 경로: `/uploads/...` (서버 업로드 결과).
   */
  function isAcceptableImageUrl(value: string): boolean {
    if (value.startsWith('/uploads/')) return true
    try {
      const u = new URL(value)
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
      return false
    }
  }

  return (
    <S.Section id="appendix">
      <S.SectionHeader>
        <S.SectionTitle>이미지</S.SectionTitle>
        {images.length > 0 && (
          <S.SectionSubtitle>{images.length}건</S.SectionSubtitle>
        )}
      </S.SectionHeader>

      {images.length === 0 && !adding && (
        <EmptyDropZone
          $dragOver={dragOver}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            if (uploading) return
            e.preventDefault()
            if (!dragOver) setDragOver(true)
          }}
          onDragLeave={(e) => {
            const next = e.relatedTarget as Node | null
            if (next && e.currentTarget.contains(next)) return
            setDragOver(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            if (uploading) return
            const files = e.dataTransfer?.files
            if (files && files.length > 0) handleFiles(files)
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              fileInputRef.current?.click()
            }
          }}
          aria-label="이미지 파일 추가"
        >
          <FiUploadCloud />
          <span>
            {uploading
              ? '업로드 중…'
              : '파일을 끌어다 놓거나 클릭해 업로드'}
          </span>
          <small>또는 아래 "+ 이미지 추가"로 URL 입력</small>
        </EmptyDropZone>
      )}

      {images.length > 0 && (
        <Grid
          $dragOver={dragOver}
          onDragOver={(e) => {
            if (uploading) return
            e.preventDefault()
            if (!dragOver) setDragOver(true)
          }}
          onDragLeave={(e) => {
            // Grid 내부 자식 사이에서 enter/leave 이벤트 노이즈가 있어 relatedTarget이
            // Grid 안에 있으면 leave 무시.
            const next = e.relatedTarget as Node | null
            if (next && e.currentTarget.contains(next)) return
            setDragOver(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            if (uploading) return
            const files = e.dataTransfer?.files
            if (files && files.length > 0) handleFiles(files)
          }}
        >
          {images.map((image) => (
            <ImageCell key={image.id}>
              <ImageButton
                type="button"
                onClick={(e) => {
                  lightboxTriggerRef.current = e.currentTarget
                  setLightbox({ src: image.imageUrl, caption: image.caption })
                }}
              >
                <img
                  src={getUploadImageUrl(image.imageUrl) || image.imageUrl}
                  alt={image.caption ?? ''}
                  loading="lazy"
                />
              </ImageButton>
              <CaptionEdit onClick={(e) => e.stopPropagation()}>
                <InlineText
                  value={image.caption ?? ''}
                  onSave={(next) => updateImageField(image.id, { caption: next })}
                  placeholder="캡션 추가"
                />
                <SourceEdit>
                  <InlineText
                    value={image.source ?? ''}
                    onSave={(next) => updateImageField(image.id, { source: next })}
                    placeholder="출처"
                  />
                </SourceEdit>
              </CaptionEdit>
              <PrimaryToggle
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setPrimary(image.id)
                }}
                $active={image.isPrimary}
                aria-label={image.isPrimary ? '대표 이미지' : '대표로 설정'}
                aria-pressed={image.isPrimary}
                title={image.isPrimary ? '대표 이미지' : '대표로 설정'}
              >
                <FiStar />
              </PrimaryToggle>
              <RemoveImage
                type="button"
                onClick={() => removeImage(image.id)}
                aria-label="이미지 제거"
              >
                <FiX />
              </RemoveImage>
            </ImageCell>
          ))}
        </Grid>
      )}

      {adding ? (
        <AddForm>
          <FormField>
            <FormLabel htmlFor="img-url">이미지 URL</FormLabel>
            <FormInput
              id="img-url"
              autoFocus
              type="url"
              value={draft.url}
              onChange={(e) => setDraft((s) => ({ ...s, url: e.target.value }))}
              placeholder="https://…"
            />
          </FormField>
          <FormField>
            <FormLabel htmlFor="img-caption">캡션</FormLabel>
            <FormInput
              id="img-caption"
              type="text"
              value={draft.caption}
              onChange={(e) => setDraft((s) => ({ ...s, caption: e.target.value }))}
              placeholder="짧은 설명"
            />
          </FormField>
          <FormField>
            <FormLabel htmlFor="img-source">출처</FormLabel>
            <FormInput
              id="img-source"
              type="text"
              value={draft.source}
              onChange={(e) => setDraft((s) => ({ ...s, source: e.target.value }))}
              placeholder="출처 표기"
            />
          </FormField>
          <FormActions>
            <FormCancel
              type="button"
              onClick={() => {
                setAdding(false)
                setDraft({ url: '', caption: '', source: '' })
              }}
            >
              취소
            </FormCancel>
            <FormSave type="button" onClick={addImage} disabled={!draft.url.trim()}>
              추가
            </FormSave>
          </FormActions>
        </AddForm>
      ) : (
        <AddRow>
          <AddBtn
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <FiUploadCloud /> {uploading ? '업로드 중…' : '파일 업로드'}
          </AddBtn>
          <AddBtn type="button" onClick={() => setAdding(true)}>
            <FiPlus /> URL로 추가
          </AddBtn>
        </AddRow>
      )}
      <HiddenFileInput
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          const files = e.target.files
          if (files && files.length > 0) handleFiles(files)
        }}
      />

      {lightbox && (
        <Lightbox
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label="이미지 미리보기"
        >
          <LightboxClose
            ref={lightboxCloseRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setLightbox(null)
            }}
            aria-label="닫기"
          >
            <FiX />
          </LightboxClose>
          {/* image/caption 클릭은 닫기로 전파 — Lightbox onClick이 처리. */}
          <LightboxImage src={lightbox.src} alt={lightbox.caption ?? ''} />
          {lightbox.caption && <LightboxCaption>{lightbox.caption}</LightboxCaption>}
        </Lightbox>
      )}
    </S.Section>
  )
}

const Grid = styled.div<{ $dragOver: boolean }>`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  padding: 6px;
  border-radius: 8px;
  border: 1px dashed transparent;
  transition: border-color 0.14s, background 0.14s;

  ${({ $dragOver, theme }) =>
    $dragOver &&
    css`
      border-color: ${theme.colors.primary};
      background: ${theme.mode === 'dark'
        ? 'rgba(99,102,241,0.08)'
        : 'rgba(99,102,241,0.05)'};
    `}
`

const EmptyDropZone = styled.div<{ $dragOver: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 36px 20px;
  border-radius: 10px;
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
  cursor: pointer;
  transition: border-color 0.14s, color 0.14s, background 0.14s;

  ${({ $dragOver, theme }) =>
    $dragOver &&
    css`
      border-color: ${theme.colors.primary};
      color: ${theme.colors.text.primary};
      background: ${theme.mode === 'dark'
        ? 'rgba(99,102,241,0.08)'
        : 'rgba(99,102,241,0.05)'};
    `}

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  svg {
    width: 22px;
    height: 22px;
  }

  span {
    font-size: 13.5px;
    font-weight: 600;
  }

  small {
    font-size: 11.5px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const HiddenFileInput = styled.input`
  display: none;
`

const ImageCell = styled.div`
  position: relative;
`

const ImageButton = styled.button`
  width: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
  border: none;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  text-align: left;
  transition: opacity 0.16s;

  &:hover {
    opacity: 0.92;
  }

  img {
    width: 100%;
    aspect-ratio: 16 / 10;
    object-fit: cover;
    display: block;
  }
`

const RemoveImage = styled.button`
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.14s, background 0.14s;

  ${ImageCell}:hover & {
    opacity: 1;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.error};
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

const CaptionEdit = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 4px 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SourceEdit = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PrimaryToggle = styled.button<{ $active: boolean }>`
  position: absolute;
  top: 6px;
  left: 6px;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: ${({ $active }) =>
    $active ? 'rgba(245, 158, 11, 0.95)' : 'rgba(0, 0, 0, 0.45)'};
  color: ${({ $active }) => ($active ? '#fff' : 'rgba(255,255,255,0.92)')};
  cursor: pointer;
  opacity: ${({ $active }) => ($active ? 1 : 0)};
  transition: opacity 0.14s, background 0.14s;

  ${ImageCell}:hover & {
    opacity: 1;
  }

  &:hover {
    background: ${({ $active }) =>
      $active ? 'rgba(245, 158, 11, 1)' : 'rgba(0,0,0,0.7)'};
  }

  &:focus-visible {
    opacity: 1;
    outline: 2px solid #fff;
    outline-offset: 2px;
  }

  svg {
    width: 13px;
    height: 13px;
    ${({ $active }) =>
      $active &&
      css`
        fill: currentColor;
      `}
  }
`

const AddRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
`

const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 7px;
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.14s, border-color 0.14s;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.text.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

const AddForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 0 4px;
  max-width: 540px;
`

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const FormLabel = styled.label`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const FormInput = styled.input`
  font-family: inherit;
  font-size: 13.5px;
  padding: 7px 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  outline: none;
  transition: border-color 0.14s;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
`

const baseFormBtn = `
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: filter 0.14s, color 0.14s;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const FormCancel = styled.button`
  ${baseFormBtn}
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const FormSave = styled.button`
  ${baseFormBtn}
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;

  &:hover:not(:disabled) {
    filter: brightness(1.05);
  }
`

const Lightbox = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 32px;
  cursor: zoom-out;
`

const LightboxImage = styled.img`
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
`

const LightboxCaption = styled.div`
  color: #ffffff;
  font-size: 13.5px;
  text-align: center;
  max-width: 720px;
`

const LightboxClose = styled.button`
  position: absolute;
  top: 18px;
  right: 18px;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  cursor: pointer;
  transition: background 0.14s;

  &:hover,
  &:focus-visible {
    background: rgba(255, 255, 255, 0.24);
    outline: none;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`
