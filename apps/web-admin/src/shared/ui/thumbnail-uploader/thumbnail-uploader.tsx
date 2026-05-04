/**
 * 미니멀 정사각형 썸네일 업로더 — 국가/인물/조직 등 공용.
 *
 * 디자인:
 * - 96×96 정사각형, radius 8px
 * - 빈 상태: 1px 회색 실선 + 작은 아이콘 + 라벨
 * - 채워진 상태: 이미지만 표시
 * - 호버 시: 반투명 오버레이 + 인라인 변경/삭제 텍스트 버튼
 * - 업로드 중: 단순 spinner (장식 X)
 * - D&D 지원
 */
import React, { useRef, useState } from 'react'

import { FiImage } from 'react-icons/fi'
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
  /** 빈 상태 라벨 (기본: "이미지 추가") */
  emptyLabel?: string
  /** 채워진 상태 보조 안내 (기본: 표시 안 함) */
  hasImageHint?: string
  /** alt 텍스트 */
  alt?: string
}

const Wrap = styled.div`
  display: inline-flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
`

const DropZone = styled.label<{ $hasImage: boolean; $dragOver: boolean }>`
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc'};
  border: 1px solid
    ${({ theme, $dragOver }) =>
      $dragOver ? theme.colors.primary : theme.colors.border.default};
  transition:
    border-color 0.12s ease,
    background 0.12s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

/** 빈 상태 placeholder */
const Placeholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: ${({ theme }) => theme.colors.text.tertiary};

  svg {
    opacity: 0.7;
  }

  span {
    font-size: 11.5px;
    font-weight: 400;
  }
`

/** 호버 오버레이 — 반투명 + 인라인 액션 */
const HoverOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  opacity: 0;
  transition: opacity 0.12s ease;

  ${DropZone}:hover & {
    opacity: 1;
  }
`

const InlineAction = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  color: #fff;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  transition: background 0.1s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  &.danger {
    color: #fca5a5;
  }
`

/** 업로드 중 spinner */
const spin = keyframes`
  to { transform: rotate(360deg); }
`

const Spinner = styled.span`
  position: absolute;
  width: 20px;
  height: 20px;
  border: 2px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.15)'
        : 'rgba(15,23,42,0.1)'};
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`

const Hint = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.4;
`

const ErrorText = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.alert.danger.fg};
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
  emptyLabel = '이미지 추가',
  hasImageHint,
  alt = '대표 이미지',
}: ThumbnailUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
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
    try {
      const result = await uploadImage(file, category)
      const url = result.url ?? ''
      if (url.length > 255) {
        setError('이미지 URL이 너무 깁니다. 짧은 경로의 이미지를 사용해주세요.')
        return
      }
      onChange(url)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
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
          <Placeholder>
            <FiImage size={20} />
            <span>{emptyLabel}</span>
          </Placeholder>
        )}

        {value && !uploading && (
          <HoverOverlay>
            <InlineAction onClick={handleReplace}>변경</InlineAction>
            <InlineAction className="danger" onClick={handleDelete}>
              삭제
            </InlineAction>
          </HoverOverlay>
        )}

        {uploading && <Spinner />}
      </DropZone>

      <HiddenInput
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        disabled={uploading}
      />

      {error && <ErrorText>{error}</ErrorText>}
      {!error && hasImageHint && value && <Hint>{hasImageHint}</Hint>}
    </Wrap>
  )
}
