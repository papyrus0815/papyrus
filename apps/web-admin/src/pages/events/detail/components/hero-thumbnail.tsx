/**
 * 히어로 대표 이미지(썸네일) — 사건의 성격을 첫 화면에서 보여 주는 자리.
 *
 * 예전엔 대표 이미지가 '자료' 탭 갤러리 안에만 있어, 들어와서 탭을 눌러야 보였다.
 * 썸네일은 목록·미리보기에서도 사건을 대표하는 그림이므로 상세에서도 제목과 같은 높이에 둔다.
 *
 * - 넓은 지면: 제목 오른쪽 340px / 좁은 지면: 상단 줄과 제목 사이 배너(S.Hero 격자가 정한다)
 * - 지도·초상처럼 잘리면 안 되는 그림이 많아 **자르지 않는다**(contain) — 남는 자리는 같은 그림을
 *   흐리게 깔아 메운다
 * - 이미지가 없으면 같은 자리에 올리기 칸(클릭·끌어 놓기). 올린 그림이 곧 대표가 된다
 * - 그림을 누르면 '자료' 탭(갤러리 — 캡션·출처·대표 바꾸기는 거기서)
 */
import { type DragEvent, useRef, useState } from 'react'

import { FiImage, FiRefreshCw, FiUploadCloud } from 'react-icons/fi'
import styled from 'styled-components'

import { ledgerAccent, ledgerHairlineStrong, RADIUS } from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { type UpdateEventDto } from '@/shared/api/events'
import { getUploadImageUrl, toUploadStoragePath, uploadImage } from '@/shared/api/upload'
import { notify } from '@/shared/ui/toast'

import { type EventDetail } from '../use-event-detail'

interface HeroThumbnailProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto) => void
  /** 그림·'자료 N장'을 누르면 — 자료 탭을 연다 */
  onOpenMedia?: () => void
}

export function HeroThumbnail({ event, onPatch, onOpenMedia }: HeroThumbnailProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  /* 갤러리(detail-appendix)와 같은 순서 — 대표 먼저, 그다음 order */
  const images = (event.eventImages ?? []).slice().sort((left, right) => {
    if (left.isPrimary !== right.isPrimary) return left.isPrimary ? -1 : 1
    return (left.order ?? 0) - (right.order ?? 0)
  })
  const primary = images[0]

  /**
   * 새 그림을 **대표로** 앞에 얹는다 — 기존 그림은 그대로 두고 대표만 내려놓는다(지우지 않음).
   * eventImages는 서버가 통째로 delete-and-recreate하므로 전체 배열을 보낸다(갤러리와 같은 직렬화).
   */
  const upload = async (file: File) => {
    if (uploading) return
    if (!file.type.startsWith('image/')) {
      notify.error('이미지 파일만 올릴 수 있습니다')
      return
    }
    setUploading(true)
    try {
      const result = await uploadImage(file, 'events')
      /* 상대 경로(/uploads/…)로 저장 — 호스트를 박으면 서버 주소가 바뀔 때 깨진다(표시는 getUploadImageUrl이 맞춘다) */
      const url = toUploadStoragePath(result.url)
      const next = [
        { imageUrl: url, caption: undefined, source: undefined, isPrimary: true },
        ...images
          .filter((image) => toUploadStoragePath(image.imageUrl) !== url)
          .map((image) => ({
            imageUrl: image.imageUrl,
            caption: image.caption,
            source: image.source,
            isPrimary: false,
          })),
      ]
      onPatch({
        eventImages: next.map((image, index) => ({ ...image, order: index })),
      })
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '이미지를 올리지 못했습니다')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const pickFile = () => fileInputRef.current?.click()
  const onDrop = (dropEvent: DragEvent<HTMLElement>) => {
    dropEvent.preventDefault()
    setDragOver(false)
    const file = dropEvent.dataTransfer.files?.[0]
    if (file) void upload(file)
  }
  const dragHandlers = {
    onDragOver: (dragEvent: DragEvent<HTMLElement>) => {
      dragEvent.preventDefault()
      setDragOver(true)
    },
    onDragLeave: () => setDragOver(false),
    onDrop,
  }

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      hidden
      onChange={(changeEvent) => {
        const file = changeEvent.target.files?.[0]
        if (file) void upload(file)
      }}
    />
  )

  if (!primary) {
    return (
      <Slot>
        <EmptyDrop
          type="button"
          onClick={pickFile}
          disabled={uploading}
          data-drag={dragOver || undefined}
          {...dragHandlers}
        >
          <FiUploadCloud aria-hidden />
          <EmptyText>
            <strong>{uploading ? '올리는 중…' : '대표 이미지 추가'}</strong>
            <span>사건의 성격을 한눈에 — 지도·사진·문서 한 장</span>
          </EmptyText>
        </EmptyDrop>
        {fileInput}
      </Slot>
    )
  }

  const src = getUploadImageUrl(primary.imageUrl) || primary.imageUrl
  return (
    <Slot>
      <Frame data-drag={dragOver || undefined} {...dragHandlers}>
        <Backdrop aria-hidden style={{ backgroundImage: `url("${src}")` }} />
        <ImageButton
          type="button"
          onClick={onOpenMedia}
          aria-label={`대표 이미지${primary.caption ? ` — ${primary.caption}` : ''} · 자료 탭에서 보기`}
        >
          <img src={src} alt="" loading="eager" decoding="async" />
        </ImageButton>
        <FrameActions>
          <FrameAction type="button" onClick={pickFile} disabled={uploading}>
            <FiRefreshCw aria-hidden />
            {uploading ? '올리는 중…' : '바꾸기'}
          </FrameAction>
          {images.length > 1 && (
            <FrameAction type="button" onClick={onOpenMedia}>
              <FiImage aria-hidden />
              자료 {images.length}장
            </FrameAction>
          )}
        </FrameActions>
      </Frame>
      {(primary.caption || primary.source) && (
        <Caption>
          {primary.caption}
          {primary.caption && primary.source && ' · '}
          {primary.source && <CaptionSource>{primary.source}</CaptionSource>}
        </Caption>
      )}
      {fileInput}
    </Slot>
  )
}

/* ───────────────────────── 조판 ───────────────────────── */

const Slot = styled.div`
  grid-area: thumb;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &:has(> button) {
    align-self: stretch;
  }
`

/* 좁은 지면(배너)은 16:9에 높이 상한, 넓은 지면(제목 옆)은 3:2 — S.Hero 격자가 칸 폭을 정한다 */
const Frame = styled.div`
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  /* 280px이었다 — 1500×900에서 탭이 549px, 첫 내용이 840px에야 섰다(첫 화면을 그림이 다 썼다). */
  max-height: 208px;
  width: 100%;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#111' : '#f1f2f4')};

  @container eventdetail (min-width: 1240px) {
    aspect-ratio: 3 / 2;
    max-height: none;
  }

  /* 휴대폰 폭 — 16:9 배너가 200px을 먹어 탭이 y=610(화면 844의 72%)에야 섰다. 얇은 띠로 */
  @container eventdetail (max-width: 639px) {
    aspect-ratio: 21 / 9;
    max-height: 148px;
  }

  &[data-drag] {
    outline: 2px dashed ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 3px;
  }
`

/* 같은 그림을 흐리게 깔아 contain이 남긴 띠를 메운다 */
const Backdrop = styled.div`
  position: absolute;
  inset: -24px;
  background-size: cover;
  background-position: center;
  filter: blur(22px) saturate(1.1);
  opacity: 0.55;
`

const ImageButton = styled.button`
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: none;
  cursor: zoom-in;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }
`

/* 그림 위 보조 동작 — 올리거나 포커스할 때만(늘 떠 있으면 그림을 가린다). 터치 환경은 상시 */
const FrameActions = styled.div`
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.14s;

  ${Frame}:hover &,
  ${Frame}:focus-within & {
    opacity: 1;
  }
  @media (hover: none) {
    opacity: 1;
  }
`

const FrameAction = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: 0;
  border-radius: 999px;
  background: rgba(15, 18, 24, 0.72);
  color: #fff;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  backdrop-filter: blur(6px);

  svg {
    width: 12px;
    height: 12px;
  }
  &:hover:not(:disabled) {
    background: rgba(15, 18, 24, 0.9);
  }
  &:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 1px;
  }
  &:disabled {
    cursor: progress;
    opacity: 0.8;
  }
`

const Caption = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${metaText};
`

const CaptionSource = styled.span`
  font-style: normal;
  opacity: 0.85;
`

/* 빈 칸 — 좁은 지면은 한 줄 높이, 넓은 지면은 그림이 설 자리만큼 */
const EmptyDrop = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  /* 64px이었다 — 글이 하나도 없는 사건에선 제목보다 이 빈 칸이 먼저, 더 크게 보였다 */
  min-height: 52px;
  padding: 8px 14px;
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.MD};
  background: transparent;
  font: inherit;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    border-color 0.14s,
    color 0.14s;

  > svg {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
  }

  /* 넓은 지면에선 제목 묶음 높이만큼만 — 빈 칸 때문에 탭이 내려가지 않게(Slot이 칸 높이로 늘어난다) */
  @container eventdetail (min-width: 1240px) {
    flex: 1;
    flex-direction: column;
    justify-content: center;
    text-align: center;
  }

  &:hover:not(:disabled),
  &[data-drag] {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
  &:disabled {
    cursor: progress;
  }
`

const EmptyText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 3px;

  strong {
    font-size: 13.5px;
    font-weight: 700;
  }
  span {
    font-size: 12px;
    line-height: 1.45;
    color: ${metaText};
  }
`
