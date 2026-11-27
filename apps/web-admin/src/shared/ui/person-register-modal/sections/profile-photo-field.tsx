/**
 * 인물 프로필 사진 — 등록 폼 맨 위 왼쪽의 **아바타**. 프로필을 만드는 느낌이 나도록 큰 원 하나가
 * 폼의 얼굴이 되고, 오른쪽에 성명·국적·성별이 붙는다(person-register-view ProfileHeader).
 *
 * 예전엔 '프로필 사진' 행 안의 가로 업로드 띠(72px 원 + 28px 목록 원 + 긴 안내)라, 이름·국적보다 아래에
 * 있었고 사진을 고른 뒤에도 서류 칸처럼 보였다.
 *
 * - 상세 머리와 같은 맞춤(원 · cover · top center)으로 미리 본다 — 얼굴이 원 밖으로 잘리는지 바로 보인다
 * - 원을 누르거나 끌어 놓기 · 붙여넣기(⌘V, 폼이 처리) — 빈 원/찬 원이 같은 크기라 고른 뒤 출렁이지 않는다
 * - 사진 정보(크기·용량)와 작거나 가로로 긴 사진 안내는 원 아래 한두 줄(막지 않음)
 * - 불러오기 실패(깨진 주소)는 실패라고 말하고 바꾸기를 권한다
 */
import React, { useState } from 'react'

import { FiAlertTriangle, FiCamera, FiPlus, FiUser } from 'react-icons/fi'
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
  /*
   * 잰 크기·실패는 '어느 주소를 쟀는지'와 함께 둔다 — 사진이 바뀌면 자연히 무효.
   * (예전엔 src 바뀔 때 effect로 비웠는데, 캐시된 사진은 effect보다 onLoad가 먼저 와 잰 값이 지워졌다)
   */
  const [measured, setMeasured] = useState<{ src: string; width: number; height: number } | null>(null)
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null)
  const size = measured && measured.src === src ? measured : null
  const broken = brokenSrc !== null && brokenSrc === src

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
    <Shell {...dragHandlers}>
      <AvatarButton
        type="button"
        onClick={openPicker}
        disabled={disabled}
        aria-label={hasPhoto ? '프로필 사진 바꾸기' : '프로필 사진 올리기'}
        aria-describedby={hintId}
        title={hasPhoto ? '눌러서 바꾸기' : undefined}
      >
        <Avatar $empty={!hasPhoto} $dragOver={dragOver}>
          {hasPhoto && src ? (
            broken ? (
              <FiAlertTriangle size={24} aria-hidden />
            ) : (
              <img
                src={src}
                alt={alt}
                onLoad={(event) =>
                  setMeasured({
                    src,
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                  })
                }
                onError={() => setBrokenSrc(src)}
              />
            )
          ) : (
            <EmptyFace aria-hidden>
              <FiUser size={34} strokeWidth={1.5} />
            </EmptyFace>
          )}
          {/* 찬 원 — 올라가면 '바꾸기' 베일, 끌어 오면 '놓기' 베일 */}
          {(hasPhoto || dragOver) && (
            <Veil $visible={dragOver} aria-hidden>
              <FiCamera size={18} />
              <span>{dragOver ? '여기에 놓기' : '바꾸기'}</span>
            </Veil>
          )}
        </Avatar>
        <CornerBadge aria-hidden>
          {hasPhoto ? <FiCamera size={13} /> : <FiPlus size={15} strokeWidth={2.6} />}
        </CornerBadge>
      </AvatarButton>

      <Caption>
        {hasPhoto ? (
          <>
            {pendingFile && <Status>새 사진 · 저장할 때 올라갑니다</Status>}
            <Meta id={hintId}>
              {facts.length > 0 ? facts.join(' · ') : '끌어 놓기 · ⌘V로 바꾸기'}
            </Meta>
            {warning && (
              <Warning role={broken ? 'alert' : undefined}>
                <FiAlertTriangle size={11} aria-hidden />
                {warning}
              </Warning>
            )}
            <RemoveButton
              type="button"
              onClick={onRemove}
              disabled={disabled}
              aria-label={pendingFile ? '선택한 사진 취소' : '프로필 사진 제거'}
            >
              {pendingFile ? '선택 취소' : '사진 제거'}
            </RemoveButton>
          </>
        ) : (
          <>
            <Status>{dragOver ? '여기에 놓아 올리기' : '프로필 사진'}</Status>
            <Meta id={hintId}>누르기 · 끌어 놓기 · ⌘V</Meta>
            <Spec>JPG·PNG·WEBP · 10MB 이하</Spec>
          </>
        )}
      </Caption>

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

/** 원 지름 — 상위(ProfileHeader)가 폭 단계마다 --profile-avatar-size로 바꾼다 */
const AVATAR_SIZE = 'var(--profile-avatar-size, 112px)'

const Shell = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;

  /* 한 열 폭(모바일) — 원 옆에 안내를 붙인다 */
  @media (max-width: 768px) {
    flex-direction: row;
    align-items: center;
    gap: 16px;
  }
`

const Avatar = styled.span<{ $empty: boolean; $dragOver: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${AVATAR_SIZE};
  height: ${AVATAR_SIZE};
  overflow: hidden;
  border-radius: 50%;
  color: ${({ theme }) => kitC(theme).textMuted};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(160deg, #2a2a2e 0%, #1f1f23 100%)'
      : 'linear-gradient(160deg, #eef0f6 0%, #e3e7f0 100%)'};
  /* 흰 링 + 바깥 테 — 상세 머리 아바타와 같은 '사진 액자' */
  box-shadow:
    0 0 0 3px ${({ theme }) => kitC(theme).content},
    0 0 0 4px ${({ theme }) => kitC(theme).border},
    0 6px 18px ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(15,23,42,0.10)')};
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
    /* 상세 머리와 같은 맞춤 — 원 안에 얼굴(위쪽 가운데)이 오게 */
    object-fit: cover;
    object-position: top center;
  }
`

const EmptyFace = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: translateY(4px);
`

const Veil = styled.span<{ $visible: boolean }>`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.52);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity 0.15s ease;
`

const CornerBadge = styled.span`
  position: absolute;
  right: 2px;
  bottom: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 3px solid ${({ theme }) => kitC(theme).content};
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.18);
  transition: transform 0.15s ease;
`

const AvatarButton = styled.button`
  position: relative;
  flex-shrink: 0;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: none;
  cursor: pointer;

  &:hover:not(:disabled) ${Veil} {
    opacity: 1;
  }
  &:hover:not(:disabled) ${Avatar} {
    color: ${({ theme }) => kitC(theme).focus};
  }
  &:hover:not(:disabled) ${CornerBadge} {
    transform: scale(1.08);
  }
  &:focus-visible {
    outline: none;
  }
  &:focus-visible ${Avatar} {
    box-shadow:
      0 0 0 3px ${({ theme }) => kitC(theme).content},
      0 0 0 5px ${({ theme }) => kitC(theme).focus},
      0 0 0 9px ${({ theme }) => kitC(theme).focusHalo};
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`

const Caption = styled.span`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
  max-width: 100%;
  text-align: center;

  @media (max-width: 768px) {
    align-items: flex-start;
    text-align: left;
  }
`

const Status = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.4;
  color: ${({ theme }) => kitC(theme).textPrimary};
`

const Meta = styled.span`
  font-size: 11.5px;
  line-height: 1.45;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => kitC(theme).textSecondary};
`

const Spec = styled.span`
  font-size: 11px;
  line-height: 1.45;
  color: ${({ theme }) => kitC(theme).textMuted};
`

const Warning = styled.span`
  display: inline-flex;
  align-items: flex-start;
  gap: 4px;
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.4;
  text-align: left;
  color: ${({ theme }) => theme.colors.alert.warning.fg};

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
`

/** 제거 — 평소엔 흐린 글자, hover·focus에서만 파괴색 */
const RemoveButton = styled.button`
  margin-top: 4px;
  padding: 2px 8px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => kitC(theme).textMuted};
  background: transparent;
  border: none;
  border-radius: 6px;
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
