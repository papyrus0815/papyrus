import React, { useEffect, useState } from 'react'

import { FiSave, FiArrowLeft } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import styled, { css } from 'styled-components'

import type { Ethnicity } from '@/shared/api/ethnicity'
import { ethnicityApi } from '@/shared/api/ethnicity'
import { uploadImage, validateImageFile } from '@/shared/api/upload'
import { notify } from '@/shared/ui/toast'

const Page = styled.div`
  padding: 1.5rem 2rem;
  max-width: 640px;
  margin: 0 auto;
`

const Title = styled.h1`
  font-size: 1.25rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f1f5f9' : '#0f172a'};
`

const BackIcon = styled(FiArrowLeft)`
  cursor: pointer;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#64748b'};
  &:hover { color: ${({ theme }) => theme.mode === 'dark' ? '#e2e8f0' : '#0f172a'}; }
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  label {
    font-weight: 500;
    font-size: 0.9rem;
    color: ${({ theme }) => theme.mode === 'dark' ? '#94a3b8' : '#374151'};
  }

  input,
  select,
  textarea {
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    font-size: 0.875rem;
    transition: all 0.2s;
    ${({ theme }) => theme.mode === 'dark' ? css`
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #f1f5f9;
      &:focus {
        outline: none;
        border-color: rgba(99, 102, 241, 0.5);
        background: rgba(255, 255, 255, 0.07);
      }
    ` : css`
      background: white;
      border: 1px solid #e5e7eb;
      color: #0f172a;
      &:focus {
        outline: none;
        border-color: #6366f1;
      }
    `}
  }

  textarea {
    min-height: 80px;
    resize: vertical;
    font-family: inherit;
  }

  select option {
    background: ${({ theme }) => theme.mode === 'dark' ? '#1e1e2e' : 'white'};
    color: ${({ theme }) => theme.mode === 'dark' ? '#f1f5f9' : '#0f172a'};
  }
`

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
`

const Btn = styled.button<{ $primary?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
  ${({ theme, $primary }) => $primary ? css`
    background: #6366f1;
    color: white;
    border: none;
  ` : theme.mode === 'dark' ? css`
    background: rgba(255, 255, 255, 0.06);
    color: #94a3b8;
    border: 1px solid rgba(255, 255, 255, 0.1);
    &:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }
  ` : css`
    background: white;
    color: #374151;
    border: 1px solid #e5e7eb;
  `}
`

const ThumbnailMeta = styled.p`
  font-size: 12px;
  margin-top: 4px;
  color: ${({ theme }) => theme.mode === 'dark' ? '#475569' : '#64748b'};
`

const LoadingText = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.mode === 'dark' ? '#475569' : '#64748b'};
`

export const EthnicityFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id && id !== 'new'
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [parentOptions, setParentOptions] = useState<Ethnicity[]>([])
  const [form, setForm] = useState({
    name: '',
    nameLocal: '',
    description: '',
    thumbnailUrl: '',
    parentId: '',
  })

  useEffect(() => {
    ethnicityApi.getAll().then(setParentOptions).catch(() => setParentOptions([]))
  }, [])

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    ethnicityApi
      .getById(id!)
      .then((e) => {
        if (e) {
          setForm({
            name: e.name,
            nameLocal: e.nameLocal ?? '',
            description: e.description ?? '',
            thumbnailUrl: e.thumbnailUrl ?? '',
            parentId: e.parentId ?? '',
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { notify.error('민족명을 입력해주세요.'); return }
    setSaving(true)
    try {
      if (isEdit) {
        await ethnicityApi.update(id!, {
          name: form.name.trim(),
          nameLocal: form.nameLocal.trim() || null,
          description: form.description.trim() || null,
          thumbnailUrl: form.thumbnailUrl.trim() || null,
          parentId: form.parentId || null,
        })
      } else {
        await ethnicityApi.create({
          name: form.name.trim(),
          nameLocal: form.nameLocal.trim() || null,
          description: form.description.trim() || null,
          thumbnailUrl: form.thumbnailUrl.trim() || null,
          parentId: form.parentId || null,
        })
      }
      navigate('/ethnicities')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleFileChange = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0]
    if (!file) return
    try {
      validateImageFile(file)
      const result = await uploadImage(file)
      setForm((prev) => ({ ...prev, thumbnailUrl: result.url }))
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '업로드에 실패했습니다.')
    }
  }

  if (loading) return <Page><LoadingText>불러오는 중...</LoadingText></Page>

  return (
    <Page>
      <Title>
        <BackIcon size={20} onClick={() => navigate('/ethnicities')} />
        {isEdit ? '민족 수정' : '민족 추가'}
      </Title>

      <Form onSubmit={handleSubmit}>
        <Row>
          <label>민족명 *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="예: 한민족"
            maxLength={100}
          />
        </Row>
        <Row>
          <label>현지명 / 원어명</label>
          <input
            type="text"
            value={form.nameLocal}
            onChange={(e) => setForm((p) => ({ ...p, nameLocal: e.target.value }))}
            placeholder="예: 한국어: 한민족"
            maxLength={100}
          />
        </Row>
        <Row>
          <label>상위 민족</label>
          <select value={form.parentId} onChange={(e) => setForm((p) => ({ ...p, parentId: e.target.value }))}>
            <option value="">— 없음 —</option>
            {parentOptions
              .filter((p) => !isEdit || p.id !== id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.nameLocal ? ` (${p.nameLocal})` : ''}
                </option>
              ))}
          </select>
        </Row>
        <Row>
          <label>설명</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="민족에 대한 간단한 설명"
          />
        </Row>
        <Row>
          <label>썸네일</label>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {form.thumbnailUrl && (
            <ThumbnailMeta>현재: {form.thumbnailUrl}</ThumbnailMeta>
          )}
        </Row>
        <Actions>
          <Btn type="button" onClick={() => navigate('/ethnicities')}>취소</Btn>
          <Btn $primary type="submit" disabled={saving}>
            <FiSave size={16} />
            {saving ? '저장 중...' : '저장'}
          </Btn>
        </Actions>
      </Form>
    </Page>
  )
}
