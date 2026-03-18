import { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import {
  useCreateJobCategory,
  useUpdateJobCategory,
  useJobCategories,
} from '@/features/job-category/use-job-categories.hook'
import type { JobCategory } from '@/shared/api/job-category'

interface JobCategoryFormProps {
  category?: JobCategory | null
  onClose: () => void
}

export const JobCategoryForm = ({ category, onClose }: JobCategoryFormProps) => {
  const createCategory = useCreateJobCategory()
  const updateCategory = useUpdateJobCategory()
  const { data: categories = [] } = useJobCategories()
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    thumbnailUrl: '',
    parentId: '',
  })

  // 상위 카테고리 목록 (현재 카테고리는 제외)
  const parentOptions = Array.isArray(categories)
    ? categories.filter((c) => c.id !== category?.id)
    : []

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        thumbnailUrl: category.thumbnailUrl || '',
        parentId: category.parentId || '',
      })
    }
  }, [category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const data = {
      name: formData.name,
      thumbnailUrl: formData.thumbnailUrl || undefined,
      parentId: formData.parentId || undefined,
    }

    try {
      if (category) {
        await updateCategory.mutateAsync({ id: category.id, data })
      } else {
        await createCategory.mutateAsync(data)
      }
      onClose()
    } catch (err: any) {

      if (
        err?.response?.data?.error?.message?.includes('Unique constraint failed')
      ) {
        setError('이미 존재하는 카테고리명입니다. 다른 이름을 사용해주세요.')
      } else if (err?.message?.includes('Unique constraint failed')) {
        setError('이미 존재하는 카테고리명입니다. 다른 이름을 사용해주세요.')
      } else {
        setError(err?.message || '저장 중 오류가 발생했습니다.')
      }
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
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
          <FormTitle>
            {category ? '카테고리 수정' : '새 카테고리 추가'}
          </FormTitle>
          <CloseButton onClick={onClose}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
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
            <Label>
              카테고리명 <Required>*</Required>
            </Label>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="카테고리 이름을 입력하세요"
            />
          </FormGroup>

          <FormGroup>
            <Label>상위 카테고리</Label>
            <Select name="parentId" value={formData.parentId} onChange={handleChange}>
              <option value="">없음 (최상위 카테고리)</option>
              {parentOptions.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>썸네일 URL</Label>
            <Input
              type="text"
              name="thumbnailUrl"
              value={formData.thumbnailUrl}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
            {formData.thumbnailUrl && (
              <ImagePreview>
                <img src={formData.thumbnailUrl} alt="Preview" />
              </ImagePreview>
            )}
          </FormGroup>

          <FormActions>
            <CancelButton type="button" onClick={onClose}>
              취소
            </CancelButton>
            <SubmitButton
              type="submit"
              disabled={createCategory.isPending || updateCategory.isPending}
            >
              {createCategory.isPending || updateCategory.isPending
                ? '저장 중...'
                : category
                  ? '수정하기'
                  : '추가하기'}
            </SubmitButton>
          </FormActions>
        </Form>
      </FormContainer>
    </Overlay>
  )
}

// Styled Components
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`

const FormContainer = styled.div`
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`

const FormHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  border-bottom: 1px solid #e2e8f0;
`

const FormTitle = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
`

const CloseButton = styled.button`
  padding: 8px;
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
    color: #1e293b;
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
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  color: #dc2626;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 24px;
`

const ErrorIcon = styled.span`
  font-size: 18px;
`

const FormGroup = styled.div`
  margin-bottom: 24px;
`

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
`

const Required = styled.span`
  color: #dc2626;
`

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 15px;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #4ade80;
    box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
  }
`

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 15px;
  transition: all 0.2s;
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #4ade80;
    box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.1);
  }
`

const ImagePreview = styled.div`
  margin-top: 12px;
  width: 100%;
  height: 160px;
  border-radius: 10px;
  overflow: hidden;
  background: #f1f5f9;

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
  background: #f8fafc;
  color: #475569;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }
`

const SubmitButton = styled.button`
  flex: 1;
  padding: 14px;
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(74, 222, 128, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`


