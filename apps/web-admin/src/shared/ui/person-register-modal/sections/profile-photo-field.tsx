/**
 * 인물 프로필 사진 칸 — 등록 폼에서 **실제로 보일 모양 그대로** 미리 본다.
 *
 * 예전엔 공용 업로드 띠(KitUpload*)의 72×48 가로 사각 미리보기였다. 그런데 인물 사진은 상세 머리에서
 * 120px **원**(위쪽 가운데 맞춤, object-position: top center)으로, 목록·검색에선 작은 원으로 선다.
 * 사각 미리보기로는 얼굴이 원 밖으로 잘리는지 알 수 없었다.
 *
 * - 미리보기 두 개: 상세(72px 원) · 목록(28px 원) — 같은 맞춤(cover + top center)
 * - 사진 정보: 크기(px)·파일 용량(새로 고른 파일), 작거나 가로로 긴 사진은 한 줄 안내(막지 않음)
 * - 불러오기 실패(깨진 주소)는 실패라고 말하고 바꾸기를 권한다
 * - 끌어 놓기 · 누르기 · 붙여넣기(⌘V, 폼이 처리) — 빈 칸/찬 칸이 같은 높이라 고른 뒤 폼이 출렁이지 않는다
 */
import React, { useEffect, useState } from 'react'

import { FiAlertTriangle, FiCamera, FiUser, FiX } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { kitC } from '@/shared/ui/register-form-kit/register-form-kit'

export interface ProfilePhotoFieldProps {
  /** 파일 입력 id — 라벨 htmlFor와 잇는다 */
  inputId: string
  hintId: string
  /** 미리보기 주소 — 새로 고른 파일의 object URL 또는 저장된 사진 주소 */
  src: string | null
  /** 새로 고른(아직 안 올린) 파일 */
  pendingFile: File | null
  /** 대체 글·안내에 쓰는 이름 */
  personName: string
  disabled?: boolean
  onFile: (file: File) => void
  onRemove: () => void
}

/** 상세 머리 원(120px)을 2배 밀도로 채우려면 짧은 변이 이 정도는 돼야 한다 */
const SMALL_PHOTO_PX = 240
/** 가로/세로가 이만큼 넘으면 원 안에서 양옆이 크게 잘린다 */
const WIDE_RATIO = 1.25

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

export function ProfilePhotoField({
  inputId,
  hintId,
  src,
  pendingFile,
  personName,
  disabled = false,
  onFile,
  onRemove,
}: ProfilePhotoFieldProps) {
  const [dragOver, setDragOver] = useState(false)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [broken, setBroken] = useState(false)

  /* 사진이 바뀌면 잰 크기·실패 표시를 비운다 */
  useEffect(() => {
    setSize(null)
    setBroken(false)
  }, [src])

  const openPicker = () => {
    if (!disabled) document.getElementById(inputId)?.click()
  }

  const dragHandlers = {
    onDragEnter: (event: React.DragEvent) => {
      event.preventDefault()
      setDragOver(true)
    },
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault()
      setDragOver(true)
    },
    onDragLeave: (event: React.DragEvent) => {
      /* 안쪽 요소로 넘어갈 때의 leave는 무시 — 칸 밖으로 나갈 때만 끈다 */
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
      setDragOver(false)
    },
    onDrop: (event: React.DragEvent) => {
      event.preventDefault()
      setDragOver(false)
      const file = event.dataTransfer.files?.[0]
      if (file && !disabled) onFile(file)
    },
  }

  const alt = personName ? `${personName} 프로필 사진` : '프로필 사진'
  const hasPhoto = Boolean(src)

  /* 사진 정보·안내 한 줄 */
  const facts = [
    size && `${size.width}×${size.height}px`,
    pendingFile && formatBytes(pendingFile.size),
  ].filter(Boolean)
  const warning = broken
    ? '사진을 불러오지 못했습니다 — 다른 사진으로 바꿔 주세요'
    : size && Math.min(size.width, size.height) < SMALL_PHOTO_PX
      ? '작은 사진이라 상세 화면에서 흐릿할 수 있습니다'
      : size && size.width / size.height > WIDE_RATIO
        ? '가로로 긴 사진 — 원 안에는 가운데 위쪽만 보입니다'
        : null

  return (
    <Shell $dragOver={dragOver} $filled={hasPhoto} {...dragHandlers}>
      {hasPhoto && src ? (
        <>
          <Previews>
            <PreviewButton
              type="button"
              onClick={openPicker}
              disabled={disabled}
              aria-label="프로필 사진 바꾸기"
              title="눌러서 바꾸기"
            >
              <Circle $size={72}>
                {broken ? (
                  <FiAlertTriangle size={20} aria-hidden />
                ) : (
                  <img
                    src={src}
                    alt={alt}
                    onLoad={(event) =>
                      setSize({
                        width: event.currentTarget.naturalWidth,
                        height: event.currentTarget.naturalHeight,
                      })
                    }
                    onError={() => setBroken(true)}
                  />
                )}
              </Circle>
              <CameraBadge aria-hidden>
                <FiCamera size={11} />
              </CameraBadge>
            </PreviewButton>
            {!broken && (
              <MiniPreview aria-hidden>
                <Circle $size={28}>
                  <img src={src} alt="" />
                </Circle>
                <span>목록</span>
              </MiniPreview>
            )}
          </Previews>
          <Text>
            <strong>{dragOver ? '여기에 놓아 바꾸기' : pendingFile ? '새 사진 · 저장할 때 올라갑니다' : '프로필 사진'}</strong>
            <span id={hintId}>
              {facts.length > 0 ? `${facts.join(' · ')} · ` : ''}끌어 놓거나 붙여넣어(⌘V) 바꿀 수 있습니다
            </span>
            {warning && (
              <Warning role={broken ? 'alert' : undefined}>
                <FiAlertTriangle size={12} aria-hidden />
                {warning}
              </Warning>
            )}
          </Text>
          <Actions>
            <ChangeButton type="button" onClick={openPicker} disabled={disabled}>
              바꾸기
            </ChangeButton>
            <RemoveButton
              type="button"
              onClick={onRemove}
              disabled={disabled}
              aria-label={pendingFile ? '선택한 사진 취소' : '프로필 사진 제거'}
              title={pendingFile ? '선택 취소' : '사진 제거'}
            >
              <FiX size={15} />
            </RemoveButton>
          </Actions>
        </>
      ) : (
        <EmptyButton type="button" onClick={openPicker} disabled={disabled} aria-describedby={hintId}>
          <Circle $size={72} $empty>
            <FiUser size={26} aria-hidden />
            <PlusBadge aria-hidden>+</PlusBadge>
          </Circle>
          <Text>
            <strong>{dragOver ? '여기에 놓아 올리기' : '프로필 사진 올리기'}</strong>
            <span id={hintId}>누르거나 끌어 놓기 · 붙여넣기(⌘V)도 됩니다</span>
            <span className="spec">JPG·PNG·WEBP 등 · 10MB 이하 · 얼굴이 위쪽에 오는 세로 사진이 잘 맞습니다</span>
          </Text>
        </EmptyButton>
      )}
      <HiddenInput
        id={inputId}
        type="file"
        accept="image/*"
        disabled={disabled}
        aria-label="프로필 사진 업로드"
        aria-describedby={hintId}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) onFile(file)
        }}
      />
    </Shell>
  )
}

/* ───────────────────────── 조판 ───────────────────────── */

const Shell = styled.div<{ $dragOver: boolean; $filled: boolean }>`
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 96px;
  padding: ${({ $filled }) => ($filled ? '10px 10px 10px 12px' : '0')};
  border-radius: 12px;
  border: 1px ${({ $filled, $dragOver }) => ($filled && !$dragOver ? 'solid' : 'dashed')}
    ${({ $dragOver, $filled, theme }) =>
      $dragOver ? kitC(theme).focus : $filled ? kitC(theme).border : kitC(theme).borderHover};
  background: ${({ $dragOver, theme }) => ($dragOver ? kitC(theme).section : kitC(theme).content)};
  box-shadow: ${({ $dragOver, theme }) => ($dragOver ? `0 0 0 3px ${kitC(theme).focusHalo}` : 'none')};
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease;
`

const Previews = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;
`

const Circle = styled.span<{ $size: number; $empty?: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 50%;
  background: ${({ theme }) => kitC(theme).section};
  color: ${({ theme }) => kitC(theme).textMuted};
  ${({ $empty, theme }) =>
    $empty
      ? css`
          overflow: visible;
          border: 1.5px dashed ${kitC(theme).borderHover};
        `
      : css`
          border: 1px solid ${kitC(theme).border};
        `}

  img {
    width: 100%;
    height: 100%;
    /* 상세 머리와 같은 맞춤 — 원 안에 얼굴(위쪽 가운데)이 오게 */
    object-fit: cover;
    object-position: top center;
  }
`

const PreviewButton = styled.button`
  position: relative;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: none;
  cursor: pointer;

  &:hover:not(:disabled) ${Circle} {
    border-color: ${({ theme }) => kitC(theme).focus};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${({ theme }) => kitC(theme).focusHalo};
  }
  &:disabled {
    cursor: not-allowed;
  }
`

const badgeCss = css`
  position: absolute;
  right: -2px;
  bottom: -2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid ${({ theme }) => kitC(theme).content};
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
`

const CameraBadge = styled.span`
  ${badgeCss}
`

const PlusBadge = styled.span`
  ${badgeCss}
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
`

const MiniPreview = styled.span`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  font-size: 10.5px;
  color: ${({ theme }) => kitC(theme).textMuted};
`

const Text = styled.span`
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
  text-align: left;

  strong {
    font-size: 13.5px;
    font-weight: 600;
    color: ${({ theme }) => kitC(theme).textPrimary};
  }
  span {
    font-size: 12px;
    line-height: 1.45;
    color: ${({ theme }) => kitC(theme).textSecondary};
  }
  .spec {
    color: ${({ theme }) => kitC(theme).textMuted};
  }
`

const Warning = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  && {
    color: ${({ theme }) => theme.colors.alert.warning.fg};
  }
  svg {
    flex-shrink: 0;
  }
`

const Actions = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  align-self: center;
`

const ChangeButton = styled.button`
  height: 32px;
  padding: 0 12px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => kitC(theme).textPrimary};
  background: ${({ theme }) => kitC(theme).section};
  border: 1px solid ${({ theme }) => kitC(theme).border};
  border-radius: 8px;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => kitC(theme).borderHover};
  }
  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => kitC(theme).focus};
    box-shadow: 0 0 0 3px ${({ theme }) => kitC(theme).focusHalo};
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

/** 제거 — 평소엔 중성색, hover·focus에서만 파괴색 */
const RemoveButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => kitC(theme).textMuted};
  cursor: pointer;

  &:hover:not(:disabled),
  &:focus-visible {
    color: ${({ theme }) => theme.colors.alert.danger.fg};
    background: ${({ theme }) => kitC(theme).section};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${({ theme }) => kitC(theme).focusHalo};
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const EmptyButton = styled.button`
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 94px;
  padding: 10px 12px;
  border: none;
  border-radius: 12px;
  background: transparent;
  font-family: inherit;
  cursor: pointer;

  &:hover:not(:disabled) ${Circle} {
    border-color: ${({ theme }) => kitC(theme).focus};
    color: ${({ theme }) => kitC(theme).focus};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${({ theme }) => kitC(theme).focusHalo};
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

/** 시각적으로 숨기되 포커스 가능(sr-only) — display:none이면 Tab 순서에서 빠져 키보드로 못 올린다 */
const HiddenInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`
