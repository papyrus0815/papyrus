import { useEffect, useRef, useState } from 'react'

import { FiPlus, FiX } from 'react-icons/fi'
import { toast } from 'react-hot-toast'
import styled from 'styled-components'

import { ledgerHairlineStrong } from '@/pages/events/ledger/styles/ledger-tokens'
import { type UpdateEventDto } from '@/shared/api/events'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'

interface DetailAppendixProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto) => void
}

/**
 * 부록 — 이미지 갤러리.
 *
 * 추가: + 이미지 추가 → URL 인풋 inline → 저장 시 eventImages 배열에 append.
 * 삭제: 각 이미지 우상단 ✕ → 해당 이미지 제외하고 PUT.
 * 캡션·source·primary 토글은 후속 사이클(별도 modal 또는 inline-edit 확장).
 */
export function DetailAppendix({ event, onPatch }: DetailAppendixProps) {
  const [lightbox, setLightbox] = useState<{ src: string; caption?: string } | null>(
    null,
  )
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ url: '', caption: '', source: '' })

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

  const images = (event.eventImages ?? [])
    .slice()
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
      return (a.order ?? 0) - (b.order ?? 0)
    })

  /* 서버에 보낼 형태로 직렬화 — id 빠지고 imageUrl/caption/source/order/isPrimary만. */
  const serialize = (list: typeof images) =>
    list.map((img, idx) => ({
      imageUrl: img.imageUrl,
      caption: img.caption,
      source: img.source,
      order: idx,
      isPrimary: img.isPrimary,
    }))

  const removeImage = (id: string) => {
    onPatch({ eventImages: serialize(images.filter((img) => img.id !== id)) })
  }

  const addImage = () => {
    const url = draft.url.trim()
    if (!url) return

    // URL 검증 — 형식·scheme 화이트리스트. 상대 경로(/uploads/...)는 허용.
    if (!isAcceptableImageUrl(url)) {
      toast.error('이미지 URL이 올바르지 않습니다. http(s)// 또는 /uploads/ 경로를 사용하세요.')
      return
    }

    // 중복 URL 차단 — 같은 이미지를 두 번 추가하지 않게.
    if (images.some((img) => img.imageUrl === url)) {
      toast.error('이미 추가된 이미지입니다.')
      return
    }

    const next = [
      ...images,
      {
        id: `new-${Date.now()}`,
        imageUrl: url,
        caption: draft.caption.trim() || undefined,
        source: draft.source.trim() || undefined,
        order: images.length,
        isPrimary: images.length === 0, // 첫 이미지는 자동 primary
      },
    ]
    onPatch({ eventImages: serialize(next) })
    setDraft({ url: '', caption: '', source: '' })
    setAdding(false)
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
        <S.EmptyState>
          <S.EmptyStateLine>
            아직 이미지가 없습니다. 아래 "+ 이미지 추가" 버튼으로 추가하세요.
          </S.EmptyStateLine>
        </S.EmptyState>
      )}

      {images.length > 0 && (
        <Grid>
          {images.map((image) => (
            <ImageCell key={image.id}>
              <ImageButton
                type="button"
                onClick={(e) => {
                  lightboxTriggerRef.current = e.currentTarget
                  setLightbox({ src: image.imageUrl, caption: image.caption })
                }}
              >
                <img src={image.imageUrl} alt={image.caption ?? ''} loading="lazy" />
                {(image.caption || image.source) && (
                  <Caption>
                    {image.caption && <span>{image.caption}</span>}
                    {image.source && <Source>{image.source}</Source>}
                  </Caption>
                )}
              </ImageButton>
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
        <AddBtn type="button" onClick={() => setAdding(true)}>
          <FiPlus /> 이미지 추가
        </AddBtn>
      )}

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

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
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

const Caption = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 4px 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Source = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
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
  margin-top: 12px;
  transition: color 0.14s, border-color 0.14s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.text.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
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
