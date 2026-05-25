import React, { useEffect, useState } from 'react'

import { FiSave, FiArrowLeft } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import styled, { css } from 'styled-components'

import type { CompanyStatus, CreateCompanyInput } from '@/shared/api/company'
import { companyApi } from '@/shared/api/company'
import { getAllCountries, type CountryResponseDto } from '@/shared/api/countries'

const STATUS_OPTIONS: { value: CompanyStatus; label: string }[] = [
  { value: 'ACTIVE', label: '활동 중' },
  { value: 'DISSOLVED', label: '해산' },
  { value: 'MERGED', label: '합병' },
  { value: 'SUSPENDED', label: '중단' },
  { value: 'OTHER', label: '기타' },
]

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
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
`

const BackIcon = styled(FiArrowLeft)`
  cursor: pointer;
  color: #64748b;
  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#0f172a')};
  }
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const Grid2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
`

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  label {
    font-weight: 500;
    font-size: 0.9rem;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#374151')};
  }

  input,
  select,
  textarea {
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    font-size: 0.875rem;
    transition: all 0.2s;
    ${({ theme }) =>
      theme.mode === 'dark'
        ? css`
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #f1f5f9;
            &:focus {
              outline: none;
              border-color: rgba(99, 102, 241, 0.5);
              background: rgba(255, 255, 255, 0.07);
            }
          `
        : css`
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
    background: ${({ theme }) => (theme.mode === 'dark' ? '#1e1e2e' : 'white')};
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
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
  &:hover {
    opacity: 0.9;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  ${({ theme, $primary }) =>
    $primary
      ? css`
          background: #6366f1;
          color: white;
          border: none;
        `
      : theme.mode === 'dark'
        ? css`
            background: rgba(255, 255, 255, 0.06);
            color: #94a3b8;
            border: 1px solid rgba(255, 255, 255, 0.1);
            &:hover {
              background: rgba(255, 255, 255, 0.1);
              color: #e2e8f0;
            }
          `
        : css`
            background: white;
            color: #374151;
            border: 1px solid #e5e7eb;
          `}
`

const LoadingText = styled.p`
  font-size: 14px;
  color: #64748b;
`

type FormState = {
  name: string
  shortName: string
  localName: string
  status: CompanyStatus
  foundedAt: string
  dissolvedAt: string
  websiteUrl: string
  logoUrl: string
  description: string
  countryId: string
}

const EMPTY: FormState = {
  name: '',
  shortName: '',
  localName: '',
  status: 'ACTIVE',
  foundedAt: '',
  dissolvedAt: '',
  websiteUrl: '',
  logoUrl: '',
  description: '',
  countryId: '',
}

export const CompanyFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id && id !== 'new'
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [countries, setCountries] = useState<CountryResponseDto[]>([])
  const [form, setForm] = useState<FormState>(EMPTY)

  useEffect(() => {
    getAllCountries()
      .then(setCountries)
      .catch(() => setCountries([]))
  }, [])

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    companyApi
      .getById(id!)
      .then((c) => {
        if (c) {
          setForm({
            name: c.name,
            shortName: c.shortName ?? '',
            localName: c.localName ?? '',
            status: c.status ?? 'ACTIVE',
            foundedAt: c.foundedAt ? c.foundedAt.slice(0, 10) : '',
            dissolvedAt: c.dissolvedAt ? c.dissolvedAt.slice(0, 10) : '',
            websiteUrl: c.websiteUrl ?? '',
            logoUrl: c.logoUrl ?? '',
            description: c.description ?? '',
            countryId: c.countryId ?? '',
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      alert('기업명을 입력해주세요.')
      return
    }
    setSaving(true)
    const payload: CreateCompanyInput = {
      name: form.name.trim(),
      shortName: form.shortName.trim() || null,
      localName: form.localName.trim() || null,
      status: form.status,
      foundedAt: form.foundedAt || null,
      dissolvedAt: form.dissolvedAt || null,
      websiteUrl: form.websiteUrl.trim() || null,
      logoUrl: form.logoUrl.trim() || null,
      description: form.description.trim() || null,
      countryId: form.countryId || null,
    }
    try {
      if (isEdit) {
        await companyApi.update(id!, payload)
      } else {
        await companyApi.create(payload)
      }
      navigate('/companies')
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <Page>
        <LoadingText>불러오는 중...</LoadingText>
      </Page>
    )

  return (
    <Page>
      <Title>
        <BackIcon size={20} onClick={() => navigate('/companies')} />
        {isEdit ? '기업 수정' : '기업 추가'}
      </Title>

      <Form onSubmit={handleSubmit}>
        <Grid2>
          <Row>
            <label>기업명 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="예: 영국 동인도회사"
              maxLength={100}
            />
          </Row>
          <Row>
            <label>약칭 / 티커</label>
            <input
              type="text"
              value={form.shortName}
              onChange={(e) => setForm((p) => ({ ...p, shortName: e.target.value }))}
              placeholder="예: EIC"
              maxLength={50}
            />
          </Row>
        </Grid2>
        <Row>
          <label>현지어 / 원어명</label>
          <input
            type="text"
            value={form.localName}
            onChange={(e) => setForm((p) => ({ ...p, localName: e.target.value }))}
            placeholder="예: East India Company"
            maxLength={200}
          />
        </Row>
        <Grid2>
          <Row>
            <label>상태</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((p) => ({ ...p, status: e.target.value as CompanyStatus }))
              }
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Row>
          <Row>
            <label>소속 국가</label>
            <select
              value={form.countryId}
              onChange={(e) => setForm((p) => ({ ...p, countryId: e.target.value }))}
            >
              <option value="">— 없음 —</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Row>
        </Grid2>
        <Grid2>
          <Row>
            <label>설립일</label>
            <input
              type="date"
              value={form.foundedAt}
              onChange={(e) => setForm((p) => ({ ...p, foundedAt: e.target.value }))}
            />
          </Row>
          <Row>
            <label>해산 / 폐업일</label>
            <input
              type="date"
              value={form.dissolvedAt}
              onChange={(e) => setForm((p) => ({ ...p, dissolvedAt: e.target.value }))}
            />
          </Row>
        </Grid2>
        <Row>
          <label>공식 웹사이트</label>
          <input
            type="url"
            value={form.websiteUrl}
            onChange={(e) => setForm((p) => ({ ...p, websiteUrl: e.target.value }))}
            placeholder="https://..."
            maxLength={255}
          />
        </Row>
        <Row>
          <label>로고 URL</label>
          <input
            type="url"
            value={form.logoUrl}
            onChange={(e) => setForm((p) => ({ ...p, logoUrl: e.target.value }))}
            placeholder="https://..."
            maxLength={255}
          />
        </Row>
        <Row>
          <label>설명</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="기업에 대한 간단한 설명"
          />
        </Row>
        <Actions>
          <Btn type="button" onClick={() => navigate('/companies')}>
            취소
          </Btn>
          <Btn $primary type="submit" disabled={saving}>
            <FiSave size={16} />
            {saving ? '저장 중...' : '저장'}
          </Btn>
        </Actions>
      </Form>
    </Page>
  )
}
