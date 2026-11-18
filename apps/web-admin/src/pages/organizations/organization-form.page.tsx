import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FiArrowLeft, FiSave, FiUser } from 'react-icons/fi'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import styled, { css } from 'styled-components'

import { apiConnection } from '@/shared/api/client'
import type { CountryResponseDto } from '@/shared/api/countries'
import { getAllCountries } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import type {
  CreateOrganizationBody,
  OrganizationScope,
  OrganizationType,
} from '@/shared/api/organizations'
import {
  createOrganization,
  getOrganizationById,
  getOrganizations,
  isInternationalOrgType,
  ORGANIZATION_SCOPE_LABEL,
  ORGANIZATION_TYPE_LABEL,
  updateOrganization,
} from '@/shared/api/organizations'
import { personCareerApi } from '@/shared/api/person-career'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { CountryPicker, CountryPickerField } from '@/shared/ui/country-picker'
import { notify } from '@/shared/ui/toast'

const ORGANIZATION_TYPES: { value: OrganizationType; label: string }[] = [
  {
    value: 'MULTILATERAL_FORUM',
    label: '다자 협의체·국가 블록 (쿼드·G7·G20·APEC·BRICS·ASEM 등)',
  },
  {
    value: 'INTERGOVERNMENTAL_ORG',
    label: '국제기구 (아세안·UN·WTO·EU·국제연맹 등)',
  },
  {
    value: 'MILITARY_ALLIANCE',
    label: '군사 동맹 (NATO·바르샤바 조약기구·델로스 동맹 등)',
  },
  { value: 'NGO', label: '비정부기구(NGO)·시민단체' },
  { value: 'TRADE_UNION', label: '노동조합·직능연맹' },
  { value: 'BUSINESS_ASSOCIATION', label: '상공회의소·업계단체' },
  { value: 'RELIGIOUS_ORG', label: '종교단체·교단·기사단' },
  { value: 'EDUCATION', label: '교육·학술기관·연구소' },
  { value: 'MILITARY_ACADEMY', label: '군사교육기관' },
  { value: 'OTHER', label: '기타 민간결사·단체 (예: 자유군단 등)' },
]

const Page = styled.div`
  padding: calc(var(--header-height, 64px) + 24px) 20px 48px;
  max-width: 680px;
  margin: 0 auto;
`
const FormWrap = styled.div`
  max-width: 680px;
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
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`
const Form = styled.form`
  padding: 1.5rem;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  box-shadow: 0 1px 3px ${({ theme }) => theme.colors.shadow.sm};
`

function describeSelectedCountry(
  form: Pick<CreateOrganizationBody, 'countryId' | 'historicalCountryId'>,
  countries: CountryResponseDto[],
  historicalCountries: HistoricalCountryResponseDto[],
) {
  if (form.countryId) {
    const modern = countries.find((country) => country.id === form.countryId)
    return modern ? { name: modern.name, flagEmoji: modern.flagEmoji } : null
  }
  if (form.historicalCountryId) {
    const historical = historicalCountries.find(
      (country) => country.id === form.historicalCountryId,
    )
    return historical ? { name: historical.name, isHistorical: true } : null
  }
  return null
}

const Row2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`

const Field = styled.div`
  margin-bottom: 16px;
`
const Label = styled.label`
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 6px;
`
const Hint = styled.div`
  margin-top: 5px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
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

function toDateInputValue(iso?: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function fromDateInputValue(val: string): string | null {
  const trimmed = val.trim()
  if (!trimmed) return null
  return `${trimmed}T00:00:00.000Z`
}

function OrganizationHeadsSection({ organizationId }: { organizationId: string }) {
  const { data: heads = [] } = useQuery({
    queryKey: ['organization-heads', organizationId],
    queryFn: () => personCareerApi.getOrganizationHeads(organizationId),
    enabled: !!organizationId,
  })
  const formatDate = (d: string) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('ko-KR', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }
  return (
    <HeadsSection>
      <HeadsTitle>
        <FiUser size={18} />
        역대 수장·사무총장 ({heads.length}명)
      </HeadsTitle>
      {heads.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
          이 기구·조직에 연결된 직위(관직 정의)의 재임 기록이 없습니다. 상세 패널의 직위 설정에서 사무총장·의장 등을 지정한 뒤 인물 재임으로 등록하면 여기에 표시됩니다.
        </p>
      ) : (
        <HeadsList>
          {(heads as any[]).map((t: any) => (
            <li key={t.id}>
              <strong>{t.title ?? t.positionDefinition?.title ?? '—'}</strong>
              {' · '}
              {getPersonDisplayName({
                name: t.person?.name ?? '',
                surname: t.person?.surname ?? '',
                middleName: t.person?.middleName ?? '',
                nameDisplayOrder: t.person?.nameDisplayOrder ?? null,
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
  const typeFromQuery = (searchParams.get('type') as OrganizationType | null) ?? null
  const playClickSound = useClickSound()
  const isEdit = Boolean(id && id !== 'new')
  const [loading, setLoading] = useState(isEdit)
  const [countries, setCountries] = useState<CountryResponseDto[]>([])
  const [countryPickerOpen, setCountryPickerOpen] = useState(false)
  const [historicalCountries, setHistoricalCountries] = useState<
    HistoricalCountryResponseDto[]
  >([])

  const rawInitialType: OrganizationType =
    typeFromQuery ?? (countryIdFromQuery ? 'NGO' : 'MULTILATERAL_FORUM')
  const initialType: OrganizationType =
    rawInitialType === 'COMPANY' ||
    rawInitialType === 'POLITICAL_PARTY' ||
    rawInitialType === 'GOVERNMENT_AGENCY'
      ? countryIdFromQuery
        ? 'NGO'
        : 'MULTILATERAL_FORUM'
      : rawInitialType

  const [form, setForm] = useState<CreateOrganizationBody>({
    name: '',
    type: initialType,
    shortName: null,
    localName: null,
    scope: isInternationalOrgType(initialType) ? 'INTERNATIONAL' : 'NATIONAL',
    description: null,
    foundedDate: null,
    dissolvedDate: null,
    websiteUrl: null,
    logoUrl: null,
    ideology: null,
    headquartersCityId: null,
    predecessorOrganizationId: null,
    countryId: countryIdFromQuery ?? null,
    historicalCountryId: null,
  })

  const { data: allOrganizations = [] } = useQuery({
    queryKey: ['organizations', 'for-lineage-select'],
    queryFn: () => getOrganizations(apiConnection, { excludeCompanies: true }),
    staleTime: 60_000,
  })
  const lineageCandidates = allOrganizations.filter((item) => item.id !== id)

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
          predecessorOrganizationId: org.predecessorOrganizationId ?? null,
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
        const updated = await updateOrganization(apiConnection, id!, form)
        notify.success('수정되었습니다.')
        navigate(`/organizations?selected=${encodeURIComponent(updated.id)}`)
      } else {
        const created = await createOrganization(apiConnection, form)
        notify.success(
          isInternationalOrgType(created.type)
            ? '등록되었습니다. 회원국과 정기 회의를 이어서 설정할 수 있습니다.'
            : '등록되었습니다.',
        )
        const nextTab = isInternationalOrgType(created.type) ? 'countries' : 'edit'
        const nextView = isInternationalOrgType(created.type)
          ? 'international'
          : 'all'
        navigate(
          `/organizations?view=${nextView}&selected=${encodeURIComponent(created.id)}&tab=${nextTab}`,
        )
      }
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

  const isInternational = isInternationalOrgType(form.type)

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
        <FormTitle>{isEdit ? '기구·조직 수정' : '기구·협의체·조직 등록'}</FormTitle>
        <FormDesc>
          유엔·아세안·WTO 같은 국제기구, 쿼드(Quad)·G7·G20·APEC·BRICS 같은 다자 협의체, 군사 동맹, 또는 비정부기구(NGO)·노조·학술·종교·민간단체를 등록합니다. 정당은{' '}
          <a
            href="/political-parties"
            onClick={(ev) => {
              ev.preventDefault()
              navigate('/political-parties')
            }}
            style={{ fontWeight: 600, textDecoration: 'underline' }}
          >
            정당(/political-parties)
          </a>
          , 국가 행정부처·기관은{' '}
          <a
            href="/government?tab=departments"
            onClick={(ev) => {
              ev.preventDefault()
              navigate('/government?tab=departments')
            }}
            style={{ fontWeight: 600, textDecoration: 'underline' }}
          >
            정부·부처(/government)
          </a>
          , 영리 기업·특허회사는{' '}
          <a
            href="/companies"
            onClick={(ev) => {
              ev.preventDefault()
              navigate('/companies')
            }}
            style={{ fontWeight: 600, textDecoration: 'underline' }}
          >
            기업(/companies)
          </a>{' '}
          전용 메뉴에서 등록합니다.
        </FormDesc>
        <Form onSubmit={handleSubmit}>
          <Field>
            <Label>유형 *</Label>
            <Select
              value={form.type}
              onChange={(e) => {
                const nextType = e.target.value as OrganizationType
                setForm((f) => ({
                  ...f,
                  type: nextType,
                  scope: isInternationalOrgType(nextType)
                    ? f.scope === 'NATIONAL' || !f.scope
                      ? 'INTERNATIONAL'
                      : f.scope
                    : f.scope ?? 'NATIONAL',
                }))
              }}
            >
              {ORGANIZATION_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field>
            <Label>공식 명칭 *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={
                isInternational
                  ? '예: 쿼드(4자 안보 대화), 동남아시아국가연합, 아시아태평양경제협력체'
                  : '예: 남만주철도주식회사, 관동군, 공안위원회'
              }
            />
          </Field>

          <Row2>
            <Field>
              <Label>약칭</Label>
              <Input
                value={form.shortName ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, shortName: e.target.value || null }))
                }
                placeholder={isInternational ? '예: Quad, ASEAN, APEC' : '예: 만철'}
              />
            </Field>
            <Field>
              <Label>현지·영문 명칭</Label>
              <Input
                value={form.localName ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, localName: e.target.value || null }))
                }
                placeholder={
                  isInternational
                    ? '예: Quadrilateral Security Dialogue'
                    : '예: Comité de salut public'
                }
              />
            </Field>
          </Row2>

          <Row2>
            <Field>
              <Label>활동 범위</Label>
              <Select
                value={form.scope ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    scope: (e.target.value as OrganizationScope) || null,
                  }))
                }
              >
                <option value="">미지정</option>
                {(Object.keys(ORGANIZATION_SCOPE_LABEL) as OrganizationScope[]).map(
                  (sc) => (
                    <option key={sc} value={sc}>
                      {ORGANIZATION_SCOPE_LABEL[sc]}
                    </option>
                  ),
                )}
              </Select>
            </Field>
            <Field>
              <Label htmlFor="organization-country">
                {isInternational ? '사무국 소재국 (선택)' : '소속 국가'}
              </Label>
              <CountryPickerField
                id="organization-country"
                value={describeSelectedCountry(form, countries, historicalCountries)}
                placeholder={
                  isInternational ? '비워 두기 권장 (회원국 탭에서 관리)' : '선택 안 함'
                }
                onOpen={() => setCountryPickerOpen(true)}
                onClear={() =>
                  setForm((previous) => ({
                    ...previous,
                    countryId: null,
                    historicalCountryId: null,
                  }))
                }
              />
              {isInternational && (
                <Hint>
                  다자 기구의 참가국들은 저장 후 ‘회원국·파트너국’ 탭에서 창립국·정회원·대화상대국 등으로 등록합니다.
                </Hint>
              )}
              <CountryPicker
                isOpen={countryPickerOpen}
                onClose={() => setCountryPickerOpen(false)}
                mode="single"
                title={isInternational ? '사무국 소재국 선택' : '소속 국가 선택'}
                modernCountries={countries}
                historicalCountries={historicalCountries}
                selectedIds={[
                  form.countryId ?? form.historicalCountryId ?? '',
                ].filter(Boolean)}
                onSelect={(country) =>
                  setForm((previous) => ({
                    ...previous,
                    countryId: country.isHistorical ? null : country.id,
                    historicalCountryId: country.isHistorical ? country.id : null,
                  }))
                }
              />
            </Field>
          </Row2>

          <Row2>
            <Field>
              <Label>설립·출범일 (AD 1000년 이후)</Label>
              <Input
                type="date"
                value={toDateInputValue(form.foundedDate)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    foundedDate: fromDateInputValue(e.target.value),
                  }))
                }
              />
            </Field>
            <Field>
              <Label>해산·종료일 (해산된 경우)</Label>
              <Input
                type="date"
                value={toDateInputValue(form.dissolvedDate)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    dissolvedDate: fromDateInputValue(e.target.value),
                  }))
                }
              />
            </Field>
          </Row2>

          <Field>
            <Label>전신 기구 (계보 연결 — 선택)</Label>
            <Select
              value={form.predecessorOrganizationId ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  predecessorOrganizationId: e.target.value || null,
                }))
              }
            >
              <option value="">전신 없음 (신설 기구·조직)</option>
              {lineageCandidates.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                  {org.shortName ? ` (${org.shortName})` : ''} ·{' '}
                  {ORGANIZATION_TYPE_LABEL[org.type] ?? org.type}
                </option>
              ))}
            </Select>
            <Hint>
              예: GATT → WTO, 국제연맹 → 유엔(UN), 유럽공동체(EC) → 유럽연합(EU)처럼 전신 기구를 지정하면 양방향 계보가 연결됩니다.
            </Hint>
          </Field>

          <Row2>
            <Field>
              <Label>공식 웹사이트 URL</Label>
              <Input
                value={form.websiteUrl ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, websiteUrl: e.target.value || null }))
                }
                placeholder="https://..."
              />
            </Field>
            <Field>
              <Label>로고 이미지 URL</Label>
              <Input
                value={form.logoUrl ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, logoUrl: e.target.value || null }))
                }
                placeholder="https://... 또는 업로드 경로"
              />
            </Field>
          </Row2>

          <Field>
            <Label>설명</Label>
            <Textarea
              value={form.description ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value || null }))
              }
              placeholder="설립 배경, 목적, 의사결정 구조, 주요 활동 등"
            />
          </Field>

          {isEdit && id && <OrganizationHeadsSection organizationId={id} />}

          <FormActions>
            <SubmitBtn type="submit">
              <FiSave size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              {isEdit ? '수정 저장' : '등록하기'}
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
