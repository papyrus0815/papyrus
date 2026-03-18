import { useState, useEffect } from 'react'
import styled, { css } from 'styled-components'
import { motion } from 'framer-motion'
import {
  useCreateDynasty,
  useUpdateDynasty,
} from '@/features/dynasty/use-dynasties.hook'
import type { Dynasty } from '@/shared/api/dynasty'

interface DynastyFormProps {
  dynasty?: Dynasty | null
  onClose: () => void
}

export const DynastyForm = ({ dynasty, onClose }: DynastyFormProps) => {
  const createDynasty = useCreateDynasty()
  const updateDynasty = useUpdateDynasty()
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    thumbnailUrl: '',
  })

  useEffect(() => {
    if (dynasty) {
      setFormData({
        name: dynasty.name || '',
        description: dynasty.description || '',
        startDate: dynasty.startDate ? new Date(dynasty.startDate).toISOString().split('T')[0] : '',
        endDate: dynasty.endDate ? new Date(dynasty.endDate).toISOString().split('T')[0] : '',
        thumbnailUrl: dynasty.thumbnailUrl || '',
      })
    }
  }, [dynasty])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const data = {
      name: formData.name,
      description: formData.description || undefined,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      thumbnailUrl: formData.thumbnailUrl || undefined,
    }

    try {
      if (dynasty) {
        await updateDynasty.mutateAsync({ id: dynasty.id, data })
      } else {
        await createDynasty.mutateAsync(data)
      }
      onClose()
    } catch (err: any) {
      if (err?.response?.data?.error?.message?.includes('Unique constraint failed') ||
          err?.message?.includes('Unique constraint failed')) {
        setError('이미 존재하는 가문명입니다. 다른 이름을 사용해주세요.')
      } else {
        setError(err?.message || '저장 중 오류가 발생했습니다.')
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <Overlay
      as={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <FormContainer
        as={motion.div}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <FormHeader>
          <FormTitle>{dynasty ? '가문 수정' : '새 가문 추가'}</FormTitle>
          <CloseButton onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </CloseButton>
        </FormHeader>

        <Form onSubmit={handleSubmit}>
          {error && (
            <ErrorMessage>
              <ErrorIcon>⚠️</ErrorIcon>
              {error}
            </ErrorMessage>
          )}

          <FormGroup>
            <Label>가문명 <Required>*</Required></Label>
            <Input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="가문 이름을 입력하세요" />
          </FormGroup>

          <FormGroup>
            <Label>설명</Label>
            <TextArea name="description" value={formData.description} onChange={handleChange} placeholder="가문에 대한 설명을 입력하세요" rows={4} />
          </FormGroup>

          <FormRow>
            <FormGroup>
              <Label>시작일</Label>
              <Input type="date" name="startDate" value={formData.startDate} onChange={handleChange} />
            </FormGroup>
            <FormGroup>
              <Label>종료일</Label>
              <Input type="date" name="endDate" value={formData.endDate} onChange={handleChange} />
            </FormGroup>
          </FormRow>

          <FormGroup>
            <Label>썸네일 URL</Label>
            <Input type="text" name="thumbnailUrl" value={formData.thumbnailUrl} onChange={handleChange} placeholder="https://example.com/image.jpg" />
            {formData.thumbnailUrl && (
              <ImagePreview>
                <img src={formData.thumbnailUrl} alt="Preview" />
              </ImagePreview>
            )}
          </FormGroup>

          <FormActions>
            <CancelButton type="button" onClick={onClose}>취소</CancelButton>
            <SubmitButton type="submit" disabled={createDynasty.isPending || updateDynasty.isPending}>
              {createDynasty.isPending || updateDynasty.isPending ? '저장 중...' : dynasty ? '수정하기' : '추가하기'}
            </SubmitButton>
          </FormActions>
        </Form>
      </FormContainer>
    </Overlay>
  )
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
`

const FormContainer = styled.div`
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(20, 20, 28, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  ` : css`
    background: white;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  `}
`

const FormHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  ${({ theme }) => theme.mode === 'dark' ? css`
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  ` : css`
    border-bottom: 1px solid #e2e8f0;
  `}
`

const FormTitle = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f1f5f9' : '#1e293b'};
`

const CloseButton = styled.button`
  padding: 8px;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#64748b'};
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9'};
    color: ${({ theme }) => theme.mode === 'dark' ? '#e2e8f0' : '#1e293b'};
  }
`

const Form = styled.form`
  padding: 32px;
  overflow-y: auto;
`

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 24px;
  background: rgba(220, 38, 38, 0.12);
  border: 1px solid rgba(220, 38, 38, 0.3);
  color: #f87171;
`

const ErrorIcon = styled.span`
  font-size: 18px;
`

const FormGroup = styled.div`
  margin-bottom: 24px;
`

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.mode === 'dark' ? '#94a3b8' : '#334155'};
`

const Required = styled.span`
  color: #f87171;
`

const inputBase = css`
  width: 100%;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 15px;
  transition: all 0.2s;
  box-sizing: border-box;
`

const Input = styled.input`
  ${inputBase}
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #f1f5f9;
    &::placeholder { color: #475569; }
    &:focus {
      outline: none;
      border-color: rgba(102, 126, 234, 0.6);
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
      background: rgba(255, 255, 255, 0.07);
    }
  ` : css`
    background: white;
    border: 2px solid #e2e8f0;
    color: #0f172a;
    &::placeholder { color: #94a3b8; }
    &:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
  `}
`

const TextArea = styled.textarea`
  ${inputBase}
  font-family: inherit;
  resize: vertical;
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #f1f5f9;
    &::placeholder { color: #475569; }
    &:focus {
      outline: none;
      border-color: rgba(102, 126, 234, 0.6);
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
      background: rgba(255, 255, 255, 0.07);
    }
  ` : css`
    background: white;
    border: 2px solid #e2e8f0;
    color: #0f172a;
    &::placeholder { color: #94a3b8; }
    &:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
  `}
`

const ImagePreview = styled.div`
  margin-top: 12px;
  width: 100%;
  height: 200px;
  border-radius: 10px;
  overflow: hidden;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9'};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const FormActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 32px;
`

const CancelButton = styled.button`
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255, 255, 255, 0.05);
    color: #94a3b8;
    border: 1px solid rgba(255, 255, 255, 0.1);
    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #e2e8f0;
    }
  ` : css`
    background: #f8fafc;
    color: #475569;
    border: 2px solid #e2e8f0;
    &:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }
  `}
`

const SubmitButton = styled.button`
  flex: 1;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`
