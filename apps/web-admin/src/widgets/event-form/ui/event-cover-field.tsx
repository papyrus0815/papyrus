/**
 * 사건 대표 이미지(썸네일) — 등록 폼 **맨 위**의 넓은 표지 띠.
 *
 * 사건 썸네일은 상세 머리(16:9·3:2 가로 그림)와 목록 표지로 쓰인다. 예전 두 모양은 둘 다 성격과 어긋났다.
 * - 맥락 묶음 맨 끝의 업로드 띠: 사건의 얼굴인데 서류 칸 맨 아래에 있었다
 * - 라벨 열 104px 4:3 타일: 가로 그림을 우표만 하게 줄여 무엇이 찍혔는지 보이지 않았고, 사건명 옆에 끼어 어색했다
 * 이제 왼쪽 판 맨 위에 판 폭 그대로의 표지(글·문서의 커버)로 서고, 그 아래에 사건명이 제목처럼 이어진다.
 *
 * - 빈 표지 = 끌어 놓는 자리(점선) — 누르기 · 끌어 놓기 · 붙여넣기(⌘V, 폼이 처리)
 * - 찬 표지 = 그림 그대로(cover), 오른쪽 아래 '표지 바꾸기 · 제거', 업로드 중엔 '올리는 중…' 띠
 * - 빈/찬 표지 높이가 같아 고른 뒤 폼이 출렁이지 않는다
 */
import React, { useState } from 'react'

import { FiCamera, FiImage, FiTrash2 } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { kitC } from '@/shared/ui/register-form-kit/register-form-kit'

export interface EventCoverFieldProps {
  /** 표시할 이미지 주소(업로드 전엔 blob: 미리보기) — 빈 문자열이면 빈 표지 */
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

  if (!hasImage) {
    return (
      <EmptyCover
        type="button"
        data-testid="event-cover-field"
        $dragOver={dragOver}
        onClick={onPick}
        aria-label="대표 이미지 올리기"
        aria-describedby="event-cover-hint"
        {...dragHandlers}
      >
        <EmptyIcon aria-hidden>
          <FiImage size={20} strokeWidth={1.7} />
        </EmptyIcon>
        <EmptyText>
          <strong>{dragOver ? '여기에 놓아 표지로' : '표지 이미지 추가'}</strong>
          <span id="event-cover-hint">
            목록·상세 머리에 쓰이는 대표 그림 · 누르기 · 끌어 놓기 · ⌘V 붙여넣기 · 10MB 이하 · 선택
          </span>
        </EmptyText>
      </EmptyCover>
    )
  }

  return (
    <FilledCover data-testid="event-cover-field" $dragOver={dragOver} {...dragHandlers}>
      <CoverImageButton
        type="button"
        onClick={onPick}
        aria-label="대표 이미지 바꾸기"
        aria-describedby="event-cover-hint"
        title="눌러서 바꾸기"
      >
        <img src={src} alt="썸네일 미리보기" onError={onImageError} />
      </CoverImageButton>
      {(uploading || dragOver) && (
        <CoverVeil aria-hidden>
          <FiCamera size={16} />
          {uploading ? '올리는 중…' : '여기에 놓아 표지 바꾸기'}
        </CoverVeil>
      )}
      <CoverBadge id="event-cover-hint">대표 이미지 · 목록·상세 머리</CoverBadge>
      <CoverActions>
        <CoverActionButton type="button" onClick={onPick}>
          <FiCamera size={13} aria-hidden />
          표지 바꾸기
        </CoverActionButton>
        <CoverActionButton type="button" aria-label="썸네일 제거" $danger onClick={onRemove}>
          <FiTrash2 size={13} aria-hidden />
          제거
        </CoverActionButton>
      </CoverActions>
    </FilledCover>
  )
}

/* ───────────────────────── 조판 ───────────────────────── */

/* 표지 높이 — 판 폭을 따르되 너무 납작/높지 않게(2단 왼쪽 판 ≈ 660px → 150px) */
const coverBox = css`
  position: relative;
  box-sizing: border-box;
  width: 100%;
  aspect-ratio: 4.4 / 1;
  min-height: 112px;
  max-height: 168px;
  border-radius: 14px;
  overflow: hidden;
`

const EmptyCover = styled.button<{ $dragOver: boolean }>`
  ${coverBox}
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 0 24px;
  border: 1.5px dashed ${({ $dragOver, theme }) => ($dragOver ? kitC(theme).focus : kitC(theme).borderHover)};
  background:
    radial-gradient(circle at 18% 120%, rgba(99, 102, 241, ${({ theme }) => (theme.mode === 'dark' ? 0.14 : 0.08)}) 0%, transparent 55%),
    radial-gradient(circle at 85% -20%, rgba(14, 165, 233, ${({ theme }) => (theme.mode === 'dark' ? 0.12 : 0.07)}) 0%, transparent 50%),
    ${({ theme }) => kitC(theme).section};
  color: ${({ theme }) => kitC(theme).textSecondary};
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    color 0.15s ease;

  ${({ $dragOver, theme }) =>
    $dragOver &&
    css`
      color: ${kitC(theme).focus};
      box-shadow: 0 0 0 4px ${kitC(theme).focusHalo};
    `}

  &:hover {
    border-color: ${({ theme }) => kitC(theme).focus};
    color: ${({ theme }) => kitC(theme).textPrimary};
  }
  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => kitC(theme).focus};
    box-shadow: 0 0 0 4px ${({ theme }) => kitC(theme).focusHalo};
  }

  @media (max-width: 560px) {
    padding: 0 16px;
  }
`

const EmptyIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: ${({ theme }) => kitC(theme).content};
  border: 1px solid ${({ theme }) => kitC(theme).border};
  color: ${({ theme }) => theme.colors.primary};
  box-shadow: 0 2px 6px ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(15,23,42,0.06)')};
`

const EmptyText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;

  strong {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: ${({ theme }) => kitC(theme).textPrimary};
  }
  span {
    font-size: 12px;
    line-height: 1.45;
    word-break: keep-all;
    color: ${({ theme }) => kitC(theme).textSecondary};
  }
`

const FilledCover = styled.div<{ $dragOver: boolean }>`
  ${coverBox}
  border: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).section};
  box-shadow: ${({ $dragOver, theme }) =>
    $dragOver ? `0 0 0 2px ${kitC(theme).focus}, 0 0 0 6px ${kitC(theme).focusHalo}` : 'none'};
`

const CoverImageButton = styled.button`
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 3px ${({ theme }) => kitC(theme).focus};
  }
`

const CoverVeil = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(15, 23, 42, 0.5);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  pointer-events: none;
`

/* 그림 위 글자 — 밝은 사진에서도 읽히게 반투명 검은 면 */
const overlayChip = css`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.62);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  backdrop-filter: blur(6px);
`

const CoverBadge = styled.span`
  ${overlayChip}
  position: absolute;
  left: 10px;
  bottom: 10px;
  height: 24px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 500;
  pointer-events: none;
`

const CoverActions = styled.div`
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: inline-flex;
  gap: 6px;
`

const CoverActionButton = styled.button<{ $danger?: boolean }>`
  ${overlayChip}
  border: none;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.14s ease;

  &:hover {
    background: ${({ $danger }) => ($danger ? 'rgba(220, 38, 38, 0.85)' : 'rgba(15, 23, 42, 0.82)')};
  }
  &:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 1px;
  }
`
