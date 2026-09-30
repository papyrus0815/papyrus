/**
 * 대표 이미지 업로더 — 국가·역사 국가 등록 폼 공용.
 *
 * 모양은 **사건 등록 폼의 썸네일 칸 그대로**(register-form-kit KitUpload*): 빈 상태는 필드 폭
 * 점선 칸 가운데 아이콘·안내·'이미지 업로드' 버튼, 채운 상태는 같은 점선 칸 가운데 미리보기 +
 * 오른쪽 위 붉은 × 삭제. 예전 96px 정사각 칸은 사건 등록 모달과 나란히 두면 딴 부품이었다.
 * 업로드는 고르는 즉시 서버로(업로드 중엔 버튼이 '업로드 중…'), D&D 지원.
 */
import React, { useRef, useState } from 'react'

import { FiImage, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import {
  type UploadImageCategory,
  uploadImage,
  validateImageFile,
} from '@/shared/api/upload'
import {
  KitUploadArea,
  KitUploadButton,
  KitUploadDeleteButton,
  KitUploadPreview,
} from '@/shared/ui/register-form-kit/register-form-kit'

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
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
`

const ErrorText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.alert.danger.fg};
  line-height: 1.4;
`

const Hint = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
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
  emptyLabel = '대표 이미지를 업로드하세요',
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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
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
      {value ? (
        <KitUploadPreview
          onClick={() => {
            if (!uploading) inputRef.current?.click()
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          title="눌러서 이미지 바꾸기"
        >
          <img src={value} alt={alt} />
          <KitUploadDeleteButton
            type="button"
            onClick={handleDelete}
            aria-label="이미지 삭제"
          >
            <FiX size={16} />
          </KitUploadDeleteButton>
        </KitUploadPreview>
      ) : (
        <KitUploadArea
          $dragOver={dragOver}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <FiImage size={32} aria-hidden="true" />
          <p>{emptyLabel}</p>
          <KitUploadButton
            type="button"
            onClick={handleReplace}
            disabled={uploading}
            aria-controls={inputId}
          >
            {uploading ? '업로드 중…' : '이미지 업로드'}
          </KitUploadButton>
        </KitUploadArea>
      )}

      <HiddenInput
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        disabled={uploading}
      />

      {error && <ErrorText role="alert">{error}</ErrorText>}
      {!error && hasImageHint && value && <Hint>{hasImageHint}</Hint>}
    </Wrap>
  )
}
