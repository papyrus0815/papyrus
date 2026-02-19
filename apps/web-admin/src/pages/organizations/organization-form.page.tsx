import React, { useEffect, useState } from 'react'
import { FiSave, FiArrowLeft } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import { apiConnection } from '@/shared/api/client'
import type {
  CreateOrganizationBody,
  OrganizationType,
  OrganizationScope,
} from '@/shared/api/organizations'
import {
  getOrganizationById,
  createOrganization,
  updateOrganization,
} from '@/shared/api/organizations'
import { getAllCountries } from '@/shared/api/countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'

const ORGANIZATION_TYPES: { value: OrganizationType; label: string }[] = [
  { value: 'GOVERNMENT_AGENCY', label: '정부기관/행정기구' },
  { value: 'INTERGOVERNMENTAL_ORG', label: '국제기구' },
  { value: 'NGO', label: 'NGO' },
  { value: 'POLITICAL_PARTY', label: '정당' },
  { value: 'TRADE_UNION', label: '노동조합' },
  { value: 'EDUCATION', label: '교육기관' },
  { value: 'COMPANY', label: '기업' },
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
  }
  input,
  select,
  textarea {
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    border: 1px solid #ddd;
  }
  textarea {
    min-height: 80px;
    resize: vertical;
  }
`
const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
`
const Btn = styled.button<{ primary?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 1px solid #ddd;
  background: ${(p) => (p.primary ? 'var(--color-primary, #2563eb)' : '#fff')};
  color: ${(p) => (p.primary ? '#fff' : '#333')};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  &:hover {
    opacity: 0.9;
  }
`

export const OrganizationFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const playClickSound = useClickSound()
  const isEdit = id && id !== 'new'
  const [loading, setLoading] = useState(isEdit)
  const [countries, setCountries] = useState<CountryResponseDto[]>([])
  const [historicalCountries, setHistoricalCountries] = useState<
    HistoricalCountryResponseDto[]
  >([])
  const [form, setForm] = useState<CreateOrganizationBody>({
    name: '',
    type: 'GOVERNMENT_AGENCY',
    shortName: null,
    localName: null,
    scope: null,
    description: null,
    foundedDate: null,
    dissolvedDate: null,
    websiteUrl: null,
    logoUrl: null,
    ideology: null,
    headquartersCityId: null,
    countryId: null,
    historicalCountryId: null,
  })

  useEffect(() => {
    ;(async () => {
      const [c, h] = await Promise.all([
        getAllCountries(),
        getAllHistoricalCountries(),
      ])
      setCountries(c)
      setHistoricalCountries(h)
    })()
  }, [])

  useEffect(() => {
    if (!isEdit) return
    ;(async () => {
      try {
        const org = await getOrganizationById(apiConnection, id!)
        setForm({
          name: org.name,
          type: org.type,
          shortName: org.shortName,
          localName: org.localName,
          scope: org.scope,
          description: org.description,
          foundedDate: org.foundedDate,
          dissolvedDate: org.dissolvedDate,
          websiteUrl: org.websiteUrl,
          logoUrl: org.logoUrl,
          ideology: org.ideology,
          headquartersCityId: org.headquartersCityId,
          countryId: org.countryId,
          historicalCountryId: org.historicalCountryId,
        })
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    })()
  }, [id, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    playClickSound()
    if (!form.name.trim()) {
      alert('이름을 입력하세요.')
      return
    }
    try {
      if (isEdit) {
        await updateOrganization(apiConnection, id!, form)
        alert('수정되었습니다.')
      } else {
        await createOrganization(apiConnection, form)
        alert('등록되었습니다.')
      }
      navigate('/organizations')
    } catch (err: any) {
      console.error(err)
      alert(err?.message || '저장 실패')
    }
  }

  if (loading && isEdit) return <Page>로딩 중...</Page>

  return (
    <Page>
      <Title>
        {isEdit ? '조직 수정' : '조직 등록'}
      </Title>
      <Form onSubmit={handleSubmit}>
        <Row>
          <label>이름 *</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="예: 외교부, 의정부"
          />
        </Row>
        <Row>
          <label>약칭</label>
          <input
            value={form.shortName ?? ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, shortName: e.target.value || null }))
            }
            placeholder="예: MOFA"
          />
        </Row>
        <Row>
          <label>유형</label>
          <select
            value={form.type}
            onChange={(e) =>
              setForm((f) => ({ ...f, type: e.target.value as OrganizationType }))
            }
          >
            {ORGANIZATION_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Row>
        <Row>
          <label>소속 국가 (현대)</label>
          <select
            value={form.countryId ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                countryId: e.target.value || null,
                historicalCountryId: e.target.value ? null : f.historicalCountryId,
              }))
            }
          >
            <option value="">선택 안 함</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Row>
        <Row>
          <label>소속 국가 (역사적)</label>
          <select
            value={form.historicalCountryId ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                historicalCountryId: e.target.value || null,
                countryId: e.target.value ? null : f.countryId,
              }))
            }
          >
            <option value="">선택 안 함</option>
            {historicalCountries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Row>
        <Row>
          <label>설명</label>
          <textarea
            value={form.description ?? ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value || null }))
            }
            placeholder="조직 개요"
          />
        </Row>
        <Actions>
          <Btn type="submit" primary>
            <FiSave size={16} />
            {isEdit ? '수정' : '등록'}
          </Btn>
          <Btn
            type="button"
            onClick={() => {
              playClickSound()
              navigate('/organizations')
            }}
          >
            <FiArrowLeft size={16} />
            목록
          </Btn>
        </Actions>
      </Form>
    </Page>
  )
}
