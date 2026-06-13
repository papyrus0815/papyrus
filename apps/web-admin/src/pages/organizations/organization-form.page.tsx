import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FiArrowLeft, FiSave, FiUser } from 'react-icons/fi'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import styled, { css } from 'styled-components'

import { apiConnection } from '@/shared/api/client'
import { personCareerApi } from '@/shared/api/person-career'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
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
import { notify } from '@/shared/ui/toast'

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
  padding: calc(var(--header-height, 64px) + 24px) 20px 48px;
  max-width: 640px;
  margin: 0 auto;
`
const FormWrap = styled.div`
  max-width: 640px;
`
const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 0 16px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.18s;
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`
const FormTitle = styled.h2`
  margin: 0 0 6px;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`
const FormDesc = styled.p`
  margin: 0 0 24px;
  font-size: 0.875rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`
const Form = styled.form`
  padding: 1.5rem;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  box-shadow: 0 1px 3px ${({ theme }) => theme.colors.shadow.sm};
`
const Field = styled.div`
  margin-bottom: 18px;
`
const Label = styled.label`
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 6px;
`
const fieldStyles = css`
  width: 100%;
  padding: 0.6rem 0.75rem;
  font-size: 0.9375rem;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  transition:
    border-color 0.18s,
    box-shadow 0.18s;
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.25)'
          : 'rgba(99, 102, 241, 0.15)'};
  }
`
const Input = styled.input`
  ${fieldStyles}
`
const Select = styled.select`
  ${fieldStyles}
  cursor: pointer;
  option {
    background: ${({ theme }) => theme.colors.background.primary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
const Textarea = styled.textarea`
  ${fieldStyles}
  min-height: 90px;
  resize: vertical;
  font-family: inherit;
`
const FormActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
`
const SubmitBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.6rem 1.25rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.button.text};
  background: ${({ theme }) => theme.colors.gradient.primary};
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 4px 14px ${({ theme }) => theme.colors.shadow.md};
  transition:
    box-shadow 0.18s,
    transform 0.12s;
  &:hover:not(:disabled) {
    box-shadow: 0 6px 18px ${({ theme }) => theme.colors.shadow.lg};
  }
  &:active {
    transform: scale(0.97);
  }
`
const CancelBtn = styled.button`
  padding: 0.6rem 1.25rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  cursor: pointer;
  transition:
    background 0.18s,
    color 0.18s,
    border-color 0.18s;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
`
const HeadsSection = styled.div`
  margin-top: 20px;
  padding: 16px 20px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
`
const HeadsTitle = styled.h3`
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 10px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`
const HeadsList = styled.ul`
  margin: 0;
  padding-left: 20px;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;
  li {
    margin-bottom: 6px;
  }
  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

function OrganizationHeadsSection({ organizationId }: { organizationId: string }) {
  const { data: heads = [] } = useQuery({
    queryKey: ['organization-heads', organizationId],
    queryFn: () => personCareerApi.getOrganizationHeads(organizationId),
    enabled: !!organizationId,
  })
  const formatDate = (d: string) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }
  return (
    <HeadsSection>
      <HeadsTitle>
        <FiUser size={18} />
        역대 수장 ({heads.length}명)
      </HeadsTitle>
      {heads.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
          이 조직에 연결된 직위(관직 정의)의 재임 기록이 없습니다. 관직 정의에서 이 조직을 소속으로 지정한 뒤, 인물 재임으로 등록하면 여기에서 확인할 수 있습니다.
        </p>
      ) : (
        <HeadsList>
          {(heads as any[]).map((t: any) => (
            <li key={t.id}>
              <strong>{t.positionDefinition?.title ?? t.title ?? '—'}</strong>
              {' · '}
              {getPersonDisplayName({
                name: t.person?.name ?? '',
                surname: t.person?.surname ?? '',
                middleName: t.person?.middleName ?? '',
                country: t.person?.country ?? null,
              })}
              {' · '}
              {formatDate(t.startDate)} ~ {t.endDate ? formatDate(t.endDate) : '현재'}
            </li>
          ))}
        </HeadsList>
      )}
    </HeadsSection>
  )
}

export const OrganizationFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const countryIdFromQuery = searchParams.get('countryId') ?? undefined
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
    countryId: countryIdFromQuery ?? null,
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
      } catch {
        // ignore
      }
      setLoading(false)
    })()
  }, [id, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    playClickSound()
    if (!form.name.trim()) {
      notify.error('이름을 입력하세요.')
      return
    }
    try {
      if (isEdit) {
        await updateOrganization(apiConnection, id!, form)
        notify.success('수정되었습니다.')
      } else {
        await createOrganization(apiConnection, form)
        notify.success('등록되었습니다.')
      }
      navigate('/organizations')
    } catch (err: any) {
      notify.error(err?.message || '저장 실패')
    }
  }

  if (loading && isEdit) {
    return (
      <Page>
        <div style={{ padding: 24, fontSize: 14, color: '#666' }}>로딩 중…</div>
      </Page>
    )
  }

  return (
    <Page>
      <FormWrap>
        <BackButton
          type="button"
          onClick={() => {
            playClickSound()
            navigate(-1)
          }}
        >
          <FiArrowLeft size={18} />
          목록으로
        </BackButton>
        <FormTitle>{isEdit ? '조직 수정' : '조직 등록'}</FormTitle>
        <FormDesc>
          만철·관동군·총독부 등 행정기구를 등록합니다. 소속 국가를 선택하면 해당 국가 상세 → 행정조직 → 행정기구 탭에서 조회됩니다.
        </FormDesc>
        <Form onSubmit={handleSubmit}>
          <Field>
            <Label>이름 *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="예: 남만주철도주식회사, 관동군"
            />
          </Field>
          <Field>
            <Label>약칭</Label>
            <Input
              value={form.shortName ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value || null }))}
              placeholder="예: 만철, MOFA"
            />
          </Field>
          <Field>
            <Label>유형</Label>
            <Select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as OrganizationType }))}
            >
              {ORGANIZATION_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label>소속 국가 (현대)</Label>
            <Select
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
            </Select>
          </Field>
          <Field>
            <Label>소속 국가 (역사적)</Label>
            <Select
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
            </Select>
          </Field>
          <Field>
            <Label>설명</Label>
            <Textarea
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || null }))}
              placeholder="조직 개요"
            />
          </Field>
          {isEdit && id && (
            <OrganizationHeadsSection organizationId={id} />
          )}
          <FormActions>
            <SubmitBtn type="submit">
              <FiSave size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              {isEdit ? '수정' : '등록'}
            </SubmitBtn>
            <CancelBtn
              type="button"
              onClick={() => {
                playClickSound()
                navigate(-1)
              }}
            >
              취소
            </CancelBtn>
          </FormActions>
        </Form>
      </FormWrap>
    </Page>
  )
}
