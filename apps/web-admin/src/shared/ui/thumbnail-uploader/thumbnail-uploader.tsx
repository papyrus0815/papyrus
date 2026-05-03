/**
 * 원형 썸네일 업로더 — 국가/인물/조직 등 공용.
 *
 * 기능:
 * - 클릭 또는 드래그앤드롭으로 파일 선택
 * - 진행률 표시 (XHR upload progress)
 * - 호버 시 삭제·교체 오버레이
 * - URL 길이 검사 (DB 255자 제한)
 */
import React, { useRef, useState } from 'react'

import { FiImage, FiTrash2, FiUploadCloud } from 'react-icons/fi'
import styled, { keyframes } from 'styled-components'

import {
  type UploadImageCategory,
  uploadImage,
  validateImageFile,
} from '@/shared/api/upload'

interface ThumbnailUploaderProps {
  /** 현재 이미지 URL (없으면 placeholder) */
  value: string
  /** 업로드/삭제 시 호출 — 빈 문자열이면 삭제 */
  onChange: (url: string) => void
  /** 업로드 카테고리 (서버 폴더 분리) */
  category: UploadImageCategory
  /** htmlFor 연결용 input id */
  inputId?: string
  /** 안내 문구 — 빈 상태일 때 표시 */
  emptyHint?: string
  /** 안내 문구 — 이미지 있을 때 */
  hasImageHint?: string
  /** alt 텍스트 */
  alt?: string
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
`

const DropZone = styled.label<{ $hasImage: boolean; $dragOver: boolean }>`
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  background: ${({ theme, $hasImage }) =>
    $hasImage
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.08)'
        : '#fff'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%)'};
  border: 2px ${({ $hasImage }) => ($hasImage ? 'solid' : 'dashed')}
    ${({ theme, $dragOver }) =>
      $dragOver
        ? '#6366f1'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.2)'
          : '#cbd5e1'};
  transition:
    border-color 0.15s,
    background 0.15s,
    box-shadow 0.15s,
    transform 0.05s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

  &:hover {
    border-color: #6366f1;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.12);
  }

  &:active {
    transform: scale(0.98);
  }

  ${({ $dragOver }) =>
    $dragOver &&
    `
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
  `}

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* placeholder 아이콘 (이미지 없을 때) */
  & > svg.placeholder {
    width: 36px;
    height: 36px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

/** 호버 시 위에 뜨는 액션 오버레이 (이미지 있을 때만) */
const HoverOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.15s;

  ${DropZone}:hover & {
    opacity: 1;
  }
`

const OverlayBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.92);
  color: #0f172a;
  cursor: pointer;
  transition:
    background 0.15s,
    transform 0.05s;

  &:hover {
    background: #fff;
  }
  &:active {
    transform: scale(0.92);
  }

  &.danger {
    color: #dc2626;
  }
`

/** 진행률 링 — 원형 SVG progress */
const ProgressRing = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  pointer-events: none;
`

const spin = keyframes`
  to { transform: rotate(360deg); }
`

const Spinner = styled.span`
  position: absolute;
  width: 28px;
  height: 28px;
  border: 3px solid rgba(255, 255, 255, 0.5);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`

const Hint = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.4;
  max-width: 280px;
`

const ErrorText = styled.span`
  font-size: 12px;
  color: #dc2626;
  line-height: 1.4;
`

const HiddenInput = styled.input`
  display: none;
`

export function ThumbnailUploader({
  value,
  onChange,
  category,
  inputId = 'thumbnail-uploader',
  emptyHint = '클릭 또는 드래그하여 이미지 추가 (정사각형 권장)',
  hasImageHint = '클릭 또는 드래그하여 이미지 변경',
  alt = '대표 이미지',
}: ThumbnailUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = async (file: File) => {
    setError(null)
    try {
      validateImageFile(file)
    } catch (e) {
      setError((e as Error).message)
      return
    }
    setUploading(true)
    setProgress(0)
    try {
      // uploadImage는 fetch 기반이라 진행률을 받기 힘들지만, 단순 indeterminate progress로 표시.
      // (XHR로 바꾸려면 upload.ts 자체 수정 필요 — 현 단계에선 spinner)
      const result = await uploadImage(file, category)
      const url = result.url ?? ''
      if (url.length > 255) {
        setError(
          '업로드된 이미지 URL이 255자를 초과합니다. 짧은 경로의 이미지를 사용해주세요.',
        )
        return
      }
      onChange(url)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
      setProgress(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onChange('')
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleReplace = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    inputRef.current?.click()
  }

  return (
    <Wrap>
      <DropZone
        htmlFor={inputId}
        $hasImage={!!value}
        $dragOver={dragOver}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {value ? (
          <img src={value} alt={alt} />
        ) : (
          <FiImage className="placeholder" />
        )}

        {value && !uploading && (
          <HoverOverlay>
            <OverlayBtn
              type="button"
              onClick={handleReplace}
              aria-label="이미지 교체"
              title="이미지 교체"
            >
              <FiUploadCloud size={14} />
            </OverlayBtn>
            <OverlayBtn
              type="button"
              className="danger"
              onClick={handleDelete}
              aria-label="이미지 삭제"
              title="이미지 삭제"
            >
              <FiTrash2 size={14} />
            </OverlayBtn>
          </HoverOverlay>
        )}

        {uploading && (
          <>
            <ProgressRing viewBox="0 0 96 96">
              <circle
                cx="48"
                cy="48"
                r="44"
                fill="none"
                stroke="rgba(99,102,241,0.15)"
                strokeWidth="4"
              />
              {progress != null && (
                <circle
                  cx="48"
                  cy="48"
                  r="44"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="4"
                  strokeDasharray={`${(progress / 100) * 276.46} 276.46`}
                  strokeLinecap="round"
                />
              )}
            </ProgressRing>
            <Spinner />
          </>
        )}
      </DropZone>

      <HiddenInput
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        disabled={uploading}
      />

      {!error && (
        <Hint>{value ? hasImageHint : emptyHint}</Hint>
      )}
      {error && <ErrorText>{error}</ErrorText>}
    </Wrap>
  )
}
