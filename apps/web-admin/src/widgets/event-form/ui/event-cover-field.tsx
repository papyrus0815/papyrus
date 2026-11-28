/**
 * 사건 대표 이미지(썸네일) — 등록 폼 **맨 위 왼쪽**의 표지 타일.
 *
 * 예전엔 '맥락 · 부가 정보' 묶음 맨 끝의 가로 업로드 띠라, 사건명보다 한참 아래에 있었고 고른 뒤에도
 * 서류 칸처럼 보였다. 이제 사건명 행의 라벨 열 자리에 4:3 표지가 서서 폼의 얼굴이 된다
 * (인물 등록 모달의 좌상단 아바타와 같은 문법 — 타일 폭 = 라벨 열 폭이라 아래 행들과 필드 x가 맞는다).
 *
 * - 타일을 누르거나 끌어 놓기 · 붙여넣기(⌘V, 폼이 처리) — 빈 타일/찬 타일이 같은 크기라 고른 뒤 출렁이지 않는다
 * - 찬 타일: 올라가면 '바꾸기' 베일, 업로드 중(blob 미리보기)이면 '올리는 중…' 베일
 * - 아래 캡션: 상태 · 안내 · 이미지 제거
 */
import React, { useState } from 'react'

import { FiCamera, FiImage, FiPlus } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { kitC } from '@/shared/ui/register-form-kit/register-form-kit'

export interface EventCoverFieldProps {
  /** 표시할 이미지 주소(업로드 전엔 blob: 미리보기) — 빈 문자열이면 빈 타일 */
  src: string
  /** blob: 미리보기 = 서버로 올리는 중 */
  uploading: boolean
  onPick: () => void
  onFile: (file: File) => void
  onRemove: () => void
  onImageError?: () => void
}

export function EventCoverField({
  src,
  uploading,
  onPick,
  onFile,
  onRemove,
  onImageError,
}: EventCoverFieldProps) {
  const [dragOver, setDragOver] = useState(false)
  const hasImage = Boolean(src)

  const dragHandlers = {
    onDragOver: (dragEvent: React.DragEvent) => {
      dragEvent.preventDefault()
      if (!dragOver) setDragOver(true)
    },
    onDragLeave: (dragEvent: React.DragEvent) => {
      if (!dragEvent.currentTarget.contains(dragEvent.relatedTarget as Node | null)) {
        setDragOver(false)
      }
    },
    onDrop: (dropEvent: React.DragEvent) => {
      dropEvent.preventDefault()
      setDragOver(false)
      const file = dropEvent.dataTransfer.files?.[0]
      if (file) onFile(file)
    },
  }

  return (
    <Shell data-testid="event-cover-field" {...dragHandlers}>
      <TileButton
        type="button"
        onClick={onPick}
        aria-label={hasImage ? '대표 이미지 바꾸기' : '대표 이미지 올리기'}
        aria-describedby="event-cover-hint"
        title={hasImage ? '눌러서 바꾸기' : undefined}
      >
        <Tile $empty={!hasImage} $dragOver={dragOver}>
          {hasImage ? (
            <img src={src} alt="썸네일 미리보기" onError={onImageError} />
          ) : (
            <EmptyFace aria-hidden>
              <FiImage size={24} strokeWidth={1.5} />
              <span>{dragOver ? '여기에 놓기' : '대표 이미지'}</span>
            </EmptyFace>
          )}
          {hasImage && (
            <Veil $visible={dragOver || uploading} aria-hidden>
              <FiCamera size={16} />
              <span>{uploading ? '올리는 중…' : dragOver ? '여기에 놓기' : '바꾸기'}</span>
            </Veil>
          )}
        </Tile>
        <CornerBadge aria-hidden>
          {hasImage ? <FiCamera size={12} /> : <FiPlus size={14} strokeWidth={2.6} />}
        </CornerBadge>
      </TileButton>

      <Caption>
        {hasImage ? (
          <>
            <Meta id="event-cover-hint">목록·상세 머리 표지</Meta>
            <RemoveButton type="button" aria-label="썸네일 제거" onClick={onRemove}>
              이미지 제거
            </RemoveButton>
          </>
        ) : (
          <>
            <Meta id="event-cover-hint">누르기 · 끌어 놓기 · ⌘V</Meta>
            <Spec>10MB 이하 · 선택</Spec>
          </>
        )}
      </Caption>
    </Shell>
  )
}

/* ───────────────────────── 조판 ───────────────────────── */

const Shell = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  width: 100%;
  min-width: 0;

  /* 한 열 폭(모바일) — 타일 옆에 안내를 붙인다 */
  @media (max-width: 768px) {
    flex-direction: row;
    align-items: center;
    gap: 14px;
    /* 모서리 배지(-6px)가 아래 사건명 라벨에 닿지 않게 */
    padding-bottom: 8px;
  }
`

const Tile = styled.span<{ $empty: boolean; $dragOver: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 12px;
  color: ${({ theme }) => kitC(theme).textMuted};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(160deg, #2a2a2e 0%, #1f1f23 100%)'
      : 'linear-gradient(160deg, #eef0f6 0%, #e3e7f0 100%)'};
  /* 흰 링 + 바깥 테 — 인물 아바타와 같은 '사진 액자' */
  box-shadow:
    0 0 0 3px ${({ theme }) => kitC(theme).content},
    0 0 0 4px ${({ theme }) => kitC(theme).border},
    0 6px 16px ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(15,23,42,0.08)')};
  transition:
    box-shadow 0.15s ease,
    color 0.15s ease;

  ${({ $empty, theme }) =>
    $empty &&
    css`
      box-shadow:
        0 0 0 3px ${kitC(theme).content},
        0 0 0 4px ${kitC(theme).borderHover};
    `}

  ${({ $dragOver, theme }) =>
    $dragOver &&
    css`
      color: ${kitC(theme).focus};
      box-shadow:
        0 0 0 3px ${kitC(theme).content},
        0 0 0 5px ${kitC(theme).focus},
        0 0 0 10px ${kitC(theme).focusHalo};
    `}

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`

const EmptyFace = styled.span`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: -0.01em;
`

const Veil = styled.span<{ $visible: boolean }>`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(15, 23, 42, 0.5);
  color: #fff;
  font-size: 11.5px;
  font-weight: 600;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity 0.15s ease;
`

const CornerBadge = styled.span`
  position: absolute;
  right: -6px;
  bottom: -6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 3px solid ${({ theme }) => kitC(theme).content};
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.18);
  transition: transform 0.15s ease;
`

const TileButton = styled.button`
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  border-radius: 12px;
  background: none;
  cursor: pointer;

  &:hover ${Veil} {
    opacity: 1;
  }
  &:hover ${Tile} {
    color: ${({ theme }) => kitC(theme).focus};
  }
  &:hover ${CornerBadge} {
    transform: scale(1.08);
  }
  &:focus-visible {
    outline: none;
  }
  &:focus-visible ${Tile} {
    box-shadow:
      0 0 0 3px ${({ theme }) => kitC(theme).content},
      0 0 0 5px ${({ theme }) => kitC(theme).focus},
      0 0 0 9px ${({ theme }) => kitC(theme).focusHalo};
  }

  @media (max-width: 768px) {
    width: 120px;
    flex-shrink: 0;
  }
`

const Caption = styled.span`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
  text-align: center;
  word-break: keep-all;

  @media (max-width: 768px) {
    align-items: flex-start;
    text-align: left;
  }
`

const Meta = styled.span`
  font-size: 11px;
  line-height: 1.45;
  color: ${({ theme }) => kitC(theme).textSecondary};
`

const Spec = styled.span`
  font-size: 10.5px;
  line-height: 1.4;
  color: ${({ theme }) => kitC(theme).textMuted};
`

const RemoveButton = styled.button`
  margin-top: 2px;
  padding: 2px 6px;
  border: none;
  border-radius: 6px;
  background: none;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => kitC(theme).textSecondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(239,68,68,0.14)' : 'rgba(239,68,68,0.08)')};
  }
`
