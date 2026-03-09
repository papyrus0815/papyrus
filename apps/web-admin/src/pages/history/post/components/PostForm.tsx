import { useState, useEffect } from 'react'
import styled from 'styled-components'
import { FiArrowLeft } from 'react-icons/fi'
import { useCreatePost, useUpdatePost } from '@/features/post/use-posts.hook'
import type { PostItem } from '@/shared/api/post'
import {
  BackButton,
  FormHeaderTitle,
  SubmitButton,
  FormRows,
  FieldRow,
  FieldLabel,
  FieldControl,
  Required,
  Input,
  BORDER_COLOR,
  FOCUS_COLOR,
} from '@/shared/ui/register-form-layout'

export interface PostFormProps {
  post?: PostItem | null
  /** 목록으로 돌아가기 (제공 시 등록 폼 뷰, 미제공 시 모달) */
  onBack?: () => void
  /** 저장 성공 시 (등록 폼 뷰) */
  onSuccess?: () => void
  /** 모달 닫기 (모달 모드일 때만 사용) */
  onClose?: () => void
}

const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: '공개' },
  { value: 'FOLLOWERS_ONLY', label: '팔로워만' },
  { value: 'PRIVATE', label: '비공개' },
]

export const PostForm = ({ post, onBack, onSuccess, onClose }: PostFormProps) => {
  const createPost = useCreatePost()
  const updatePost = useUpdatePost()
  const isEmbedded = Boolean(onBack && onSuccess)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    keywords: '',
    visibility: 'PUBLIC',
    publish: true,
  })

  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title ?? '',
        keywords: post.keywords ?? '',
        visibility: post.visibility ?? 'PUBLIC',
        publish: post.status === 'PUBLISHED',
      })
    }
  }, [post])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!formData.title.trim()) {
      setError('제목을 입력해주세요.')
      return
    }

    try {
      if (post) {
        await updatePost.mutateAsync({
          id: post.id,
          data: {
            title: formData.title,
            keywords: formData.keywords.trim() || undefined,
            visibility: formData.visibility,
          },
        })
      } else {
        await createPost.mutateAsync({
          title: formData.title,
          content: '',
          keywords: formData.keywords.trim() || undefined,
          visibility: formData.visibility,
          publish: formData.publish,
        })
      }
      if (isEmbedded) onSuccess!()
      else onClose?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const name = e.target.name
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const isSaving = createPost.isPending || updatePost.isPending

  // 등록 폼 뷰 (사건 등록처럼 전체 화면)
  if (isEmbedded) {
    return (
      <FormWrap>
        <FormHeader>
          <BackButton type="button" onClick={onBack}>
            <FiArrowLeft size={18} />
            목록으로
          </BackButton>
          <FormHeaderTitle>
            {post ? '글 수정' : '글 작성'}
          </FormHeaderTitle>
          <SubmitButton
            type="submit"
            form="post-form"
            disabled={isSaving}
          >
            {isSaving ? (post ? '수정 중…' : '등록 중…') : post ? '저장' : '등록'}
          </SubmitButton>
        </FormHeader>

        <form
          id="post-form"
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
        >
          <FormBodyScroll>
            {error && <ErrorBlock>{error}</ErrorBlock>}

            <FormRows>
              <FieldRow>
                <FieldLabel>제목 <Required /></FieldLabel>
                <FieldControl>
                  <Input
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="제목을 입력하세요"
                    required
                  />
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>키워드</FieldLabel>
                <FieldControl>
                  <Input
                    name="keywords"
                    value={formData.keywords}
                    onChange={handleChange}
                    placeholder="쉼표로 구분하여 입력 (예: 이순신, 임진왜란)"
                  />
                </FieldControl>
              </FieldRow>

              <FieldRow>
                <FieldLabel>가시성</FieldLabel>
                <FieldControl>
                  <Select name="visibility" value={formData.visibility} onChange={handleChange}>
                    {VISIBILITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </FieldControl>
              </FieldRow>

              {!post && (
                <FieldRow>
                  <FieldLabel>게시</FieldLabel>
                  <FieldControl>
                    <LabelRow>
                      <input
                        type="checkbox"
                        name="publish"
                        id="publish"
                        checked={formData.publish}
                        onChange={handleChange}
                      />
                      <span>바로 게시 (체크 시 게시됨, 미체크 시 임시저장)</span>
                    </LabelRow>
                  </FieldControl>
                </FieldRow>
              )}
            </FormRows>
          </FormBodyScroll>
        </form>
      </FormWrap>
    )
  }

  // 모달 (onClose만 있는 경우)
  return (
    <Overlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <FormHeader>
          <FormTitle>{post ? '글 수정' : '새 글 작성'}</FormTitle>
          <CloseButton onClick={onClose} type="button" aria-label="닫기">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </CloseButton>
        </FormHeader>

        <form onSubmit={handleSubmit}>
          {error && <ErrorBox>{error}</ErrorBox>}
          <Field>
            <Label>제목 *</Label>
            <Input name="title" value={formData.title} onChange={handleChange} placeholder="제목" required />
          </Field>
          <Field>
            <Label>키워드</Label>
            <Input name="keywords" value={formData.keywords} onChange={handleChange} placeholder="쉼표로 구분 (예: 이순신, 임진왜란)" />
          </Field>
          <Field>
            <Label>가시성</Label>
            <Select name="visibility" value={formData.visibility} onChange={handleChange}>
              {VISIBILITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </Field>
          {!post && (
            <Field>
              <LabelRow>
                <input type="checkbox" name="publish" id="publish" checked={formData.publish} onChange={handleChange} />
                <Label htmlFor="publish">바로 게시</Label>
              </LabelRow>
            </Field>
          )}
          <Actions>
            <CancelButton type="button" onClick={onClose}>취소</CancelButton>
            <SubmitButton type="submit" disabled={isSaving}>{post ? '저장' : '작성'}</SubmitButton>
          </Actions>
        </form>
      </ModalContainer>
    </Overlay>
  )
}

// ----- 등록 폼 뷰 스타일 (사건 등록과 동일) -----
const FormWrap = styled.div`
  background: #ffffff;
  border-radius: 0;
  overflow: hidden;
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`

const FormHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 28px;
  background: #fff;
  border-bottom: 1px solid #f1f5f9;
  flex-shrink: 0;
`

const FormBodyScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px 28px 32px;
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
`

const Select = styled.select`
  width: 100%;
  max-width: 380px;
  padding: 12px 16px;
  font-size: 14px;
  color: #111827;
  background: #fff;
  border: 1px solid ${BORDER_COLOR};
  border-radius: 12px;
  outline: none;
  &:focus {
    border-color: ${FOCUS_COLOR};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
`

const LabelRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
`

const ErrorBlock = styled.div`
  margin-bottom: 24px;
  padding: 12px 16px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  color: #dc2626;
  font-size: 14px;
`

// ----- 모달 스타일 -----
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
`

const ModalContainer = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.15);
  max-width: 640px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
`

const FormTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
`

const CloseButton = styled.button`
  padding: 8px;
  border: none;
  background: none;
  color: #64748b;
  cursor: pointer;
  border-radius: 8px;
  &:hover {
    background: #f1f5f9;
    color: #0f172a;
  }
`

const ErrorBox = styled.div`
  margin: 16px 24px 0;
  padding: 12px 16px;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 8px;
  font-size: 14px;
`

const Field = styled.div`
  padding: 16px 24px 0;
`

const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
`

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #e2e8f0;
`

const CancelButton = styled.button`
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  background: #f1f5f9;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  &:hover {
    background: #e2e8f0;
  }
`

