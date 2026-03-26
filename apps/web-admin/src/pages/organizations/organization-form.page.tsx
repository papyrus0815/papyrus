import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FiArrowLeft, FiSave, FiUser } from 'react-icons/fi'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

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
  padding: 24px 20px 48px;
  max-width: 640px;
  margin: 0 auto;
`
const FormWrap = styled.div`
  max-width: 640px;
`
const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 0 20px;
  font-size: 15px;
  color: #666;
  background: none;
  border: none;
  cursor: pointer;
  &:hover {
    color: #111;
  }
`
const FormTitle = styled.h2`
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
  color: #111;
`
const FormDesc = styled.p`
  margin: 0 0 24px;
  font-size: 14px;
  color: #666;
`
const Field = styled.div`
  margin-bottom: 20px;
`
const Label = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
`
const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  font-size: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-sizing: border-box;
  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
`
const Select = styled.select`
  width: 100%;
  padding: 12px 14px;
  font-size: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  color: #111;
  cursor: pointer;
  box-sizing: border-box;
  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
`
const Textarea = styled.textarea`
  width: 100%;
  padding: 12px 14px;
  font-size: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  min-height: 80px;
  resize: vertical;
  box-sizing: border-box;
  font-family: inherit;
  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
`
const FormActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`
const SubmitBtn = styled.button`
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  &:hover:not(:disabled) {
    opacity: 0.9;
  }
`
const CancelBtn = styled.button`
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 500;
  color: #666;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }
`
const HeadsSection = styled.div`
  margin-top: 24px;
  padding: 16px 20px;
  background: #f9f9f9;
  border-radius: 10px;
  border: 1px solid #eee;
`
const HeadsTitle = styled.h3`
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin: 0 0 10px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`
const HeadsList = styled.ul`
  margin: 0;
  padding-left: 20px;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  li {
    margin-bottom: 6px;
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
      alert(err?.message || '저장 실패')
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
        <form onSubmit={handleSubmit}>
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
        </form>
      </FormWrap>
    </Page>
  )
}
