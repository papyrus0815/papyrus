import React, { useCallback, useEffect, useRef, useState } from 'react'

import { FiSave, FiArrowLeft, FiX, FiSearch } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import styled, { css } from 'styled-components'

import type { CompanyStatus, CreateCompanyInput } from '@/shared/api/company'
import { companyApi } from '@/shared/api/company'
import { cityApi } from '@/shared/api/city'
import { getApiConnection } from '@/shared/api/client'
import { getAllCountries, type CountryResponseDto } from '@/shared/api/countries'
import {
  getAllHistoricalCountries,
  type HistoricalCountryResponseDto,
} from '@/shared/api/historical-countries'
import {
  getOrganizations,
  type OrganizationResponseDto,
} from '@/shared/api/organizations'
import { getAllPersons, type PersonResponseDto } from '@/shared/api/persons'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

const STATUS_OPTIONS: { value: CompanyStatus; label: string }[] = [
  { value: 'ACTIVE', label: '활동 중' },
  { value: 'DISSOLVED', label: '해산' },
  { value: 'MERGED', label: '합병' },
  { value: 'SUSPENDED', label: '중단' },
  { value: 'OTHER', label: '기타' },
]

const Page = styled.div`
  padding: calc(var(--header-height, 64px) + 1.5rem) 2rem 4rem;
  max-width: 640px;
  margin: 0 auto;
`

const Header = styled.header`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`

const BackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    background 0.18s,
    color 0.18s,
    border-color 0.18s,
    transform 0.12s;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
  &:active {
    transform: scale(0.96);
  }
`

const Title = styled.h1`
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 1.5rem;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  box-shadow: 0 1px 3px ${({ theme }) => theme.colors.shadow.sm};
`

const Grid2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
`

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  label {
    font-weight: 600;
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  input,
  select,
  textarea {
    padding: 0.6rem 0.75rem;
    border-radius: 10px;
    font-size: 0.875rem;
    background: ${({ theme }) => theme.colors.background.primary};
    border: 1px solid ${({ theme }) => theme.colors.border.default};
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
  }

  textarea {
    min-height: 90px;
    resize: vertical;
    font-family: inherit;
  }

  select option {
    background: ${({ theme }) => theme.colors.background.primary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
`

const Btn = styled.button<{ $primary?: boolean }>`
  padding: 0.6rem 1.1rem;
  border-radius: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  transition:
    background 0.18s,
    border-color 0.18s,
    transform 0.12s,
    box-shadow 0.18s;

  &:active {
    transform: scale(0.97);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  ${({ theme, $primary }) =>
    $primary
      ? css`
          background: ${theme.colors.gradient.primary};
          color: ${theme.colors.button.text};
          border: none;
          box-shadow: 0 4px 14px ${theme.colors.shadow.md};
          &:hover:not(:disabled) {
            box-shadow: 0 6px 18px ${theme.colors.shadow.lg};
          }
        `
      : css`
          background: ${theme.colors.background.primary};
          color: ${theme.colors.text.secondary};
          border: 1px solid ${theme.colors.border.default};
          &:hover {
            background: ${theme.colors.hover};
            color: ${theme.colors.text.primary};
            border-color: ${theme.colors.border.medium};
          }
        `}
`

const LoadingText = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

// ── 검색형 선택 picker (창립자·본사 도시) ──────────────────────────────────
// Row와 달리 input 스타일을 강제하지 않는 라벨 전용 래퍼
const PickerRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  label {
    font-weight: 600;
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const PickerControl = styled.div`
  position: relative;
`

const SelectedBox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.6rem 0.55rem 0.75rem;
  border-radius: 10px;
  font-size: 0.875rem;
  background: ${({ theme }) => theme.colors.activeLight};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.4)' : '#c7d2fe'};
  color: ${({ theme }) => theme.colors.text.primary};

  .label {
    flex: 1;
    font-weight: 500;
  }
  button {
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
    display: inline-flex;
    padding: 2px;
    &:hover {
      opacity: 1;
    }
  }
`

const PickerInputWrap = styled.div`
  position: relative;
  svg.lead {
    position: absolute;
    left: 0.6rem;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.colors.text.tertiary};
    pointer-events: none;
  }
  input {
    width: 100%;
    box-sizing: border-box;
    padding: 0.6rem 0.75rem 0.6rem 2rem;
    border-radius: 10px;
    font-size: 0.875rem;
    background: ${({ theme }) => theme.colors.background.primary};
    border: 1px solid ${({ theme }) => theme.colors.border.default};
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
  }
`

const Dropdown = styled.ul`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 30;
  margin: 0;
  padding: 0.25rem;
  list-style: none;
  max-height: 240px;
  overflow-y: auto;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  box-shadow: 0 12px 32px ${({ theme }) => theme.colors.shadow.lg};
`

const DropItem = styled.li`
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 1px;
  .main {
    font-size: 0.875rem;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .sub {
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const DropEmpty = styled.li`
  padding: 0.5rem 0.6rem;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

type PickerOption = { id: string; label: string; sub?: string }

const SearchPicker: React.FC<{
  value: string
  selectedLabel: string
  placeholder: string
  fetchOptions: (q: string) => Promise<PickerOption[]>
  /** 빈 검색어일 때도 목록을 보여줄지 (창립자=true, 도시=false) */
  showOnEmpty?: boolean
  onChange: (id: string, label: string) => void
}> = ({
  value,
  selectedLabel,
  placeholder,
  fetchOptions,
  showOnEmpty = false,
  onChange,
}) => {
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<PickerOption[]>([])
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!editing) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setEditing(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [editing])

  // 검색어 변경 시 옵션 로드 (간단 디바운스)
  useEffect(() => {
    if (!editing) return
    if (!query.trim() && !showOnEmpty) {
      setOptions([])
      return
    }
    let alive = true
    setLoading(true)
    const t = setTimeout(() => {
      fetchOptions(query)
        .then((opts) => alive && setOptions(opts))
        .catch(() => alive && setOptions([]))
        .finally(() => alive && setLoading(false))
    }, 200)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [query, editing, showOnEmpty, fetchOptions])

  if (value && !editing) {
    return (
      <PickerControl>
        <SelectedBox>
          <span className="label">{selectedLabel || '(이름 없음)'}</span>
          <button
            type="button"
            title="변경"
            onClick={() => {
              setQuery('')
              setOptions([])
              setEditing(true)
            }}
          >
            <FiSearch size={15} />
          </button>
          <button type="button" title="해제" onClick={() => onChange('', '')}>
            <FiX size={16} />
          </button>
        </SelectedBox>
      </PickerControl>
    )
  }

  return (
    <PickerControl ref={wrapRef}>
      <PickerInputWrap>
        <FiSearch className="lead" size={15} />
        <input
          autoFocus={editing}
          value={query}
          placeholder={placeholder}
          onFocus={() => setEditing(true)}
          onChange={(e) => setQuery(e.target.value)}
        />
      </PickerInputWrap>
      {editing && (query.trim() || showOnEmpty) && (
        <Dropdown>
          {loading && <DropEmpty>검색 중...</DropEmpty>}
          {!loading && options.length === 0 && (
            <DropEmpty>결과 없음</DropEmpty>
          )}
          {!loading &&
            options.map((o) => (
              <DropItem
                key={o.id}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(o.id, o.label)
                  setEditing(false)
                  setQuery('')
                }}
              >
                <span className="main">{o.label}</span>
                {o.sub && <span className="sub">{o.sub}</span>}
              </DropItem>
            ))}
        </Dropdown>
      )}
    </PickerControl>
  )
}

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
  historicalCountryId: string
  organizationId: string
  founderId: string
  headquartersCityId: string
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
  historicalCountryId: '',
  organizationId: '',
  founderId: '',
  headquartersCityId: '',
}

function personLabel(p: PersonResponseDto): string {
  return getPersonDisplayName({
    name: p.name ?? '',
    surname: (p as { surname?: string }).surname ?? '',
    middleName: (p as { middleName?: string }).middleName ?? '',
    country: (p as { country?: { defaultNameDisplayOrder?: string | null } | null })
      .country ?? null,
  })
}

export const CompanyFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id && id !== 'new'
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [countries, setCountries] = useState<CountryResponseDto[]>([])
  const [historicalCountries, setHistoricalCountries] = useState<
    HistoricalCountryResponseDto[]
  >([])
  const [organizations, setOrganizations] = useState<OrganizationResponseDto[]>(
    [],
  )
  const [form, setForm] = useState<FormState>(EMPTY)
  const [founderLabel, setFounderLabel] = useState('')
  const [cityLabel, setCityLabel] = useState('')
  const personsRef = useRef<PersonResponseDto[] | null>(null)

  const fetchFounderOptions = useCallback(
    async (q: string): Promise<PickerOption[]> => {
      if (!personsRef.current) {
        personsRef.current = await getAllPersons().catch(() => [])
      }
      const list = personsRef.current ?? []
      const norm = q.trim().toLowerCase()
      const filtered = norm
        ? list.filter((p) => {
            const dn = personLabel(p).toLowerCase()
            const orig = (
              (p as { originalName?: string }).originalName ?? ''
            ).toLowerCase()
            return dn.includes(norm) || orig.includes(norm)
          })
        : list
      return filtered.slice(0, 30).map((p) => ({
        id: p.id,
        label: personLabel(p),
        sub: (p as { originalName?: string }).originalName ?? undefined,
      }))
    },
    [],
  )

  const fetchCityOptions = useCallback(
    async (q: string): Promise<PickerOption[]> => {
      const cities = await cityApi.searchCities(q)
      return cities.map((c) => ({
        id: c.id,
        label: c.name,
        sub: c.countryName ?? undefined,
      }))
    },
    [],
  )

  useEffect(() => {
    getAllCountries()
      .then(setCountries)
      .catch(() => setCountries([]))
    getAllHistoricalCountries()
      .then(setHistoricalCountries)
      .catch(() => setHistoricalCountries([]))
    getOrganizations(getApiConnection())
      .then(setOrganizations)
      .catch(() => setOrganizations([]))
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
            historicalCountryId: c.historicalCountryId ?? '',
            organizationId: c.organizationId ?? '',
            founderId: c.founderId ?? '',
            headquartersCityId: c.headquartersCityId ?? '',
          })
          setFounderLabel(c.founder?.name ?? '')
          setCityLabel(c.headquartersCity?.name ?? '')
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
      historicalCountryId: form.historicalCountryId || null,
      organizationId: form.organizationId || null,
      founderId: form.founderId || null,
      headquartersCityId: form.headquartersCityId || null,
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
      <Header>
        <BackBtn
          type="button"
          onClick={() => navigate('/companies')}
          aria-label="목록으로"
        >
          <FiArrowLeft size={18} />
        </BackBtn>
        <Title>{isEdit ? '기업 수정' : '기업 추가'}</Title>
      </Header>

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
            <label>소속 국가 (현대)</label>
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
            <label>소속 국가 (역사)</label>
            <select
              value={form.historicalCountryId}
              onChange={(e) =>
                setForm((p) => ({ ...p, historicalCountryId: e.target.value }))
              }
            >
              <option value="">— 없음 —</option>
              {historicalCountries.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </Row>
          <Row>
            <label>연결 조직</label>
            <select
              value={form.organizationId}
              onChange={(e) =>
                setForm((p) => ({ ...p, organizationId: e.target.value }))
              }
            >
              <option value="">— 없음 —</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </Row>
        </Grid2>
        <Grid2>
          <PickerRow>
            <label>창립자</label>
            <SearchPicker
              value={form.founderId}
              selectedLabel={founderLabel}
              placeholder="인물 이름으로 검색..."
              showOnEmpty
              fetchOptions={fetchFounderOptions}
              onChange={(id, label) => {
                setForm((p) => ({ ...p, founderId: id }))
                setFounderLabel(label)
              }}
            />
          </PickerRow>
          <PickerRow>
            <label>본사 도시</label>
            <SearchPicker
              value={form.headquartersCityId}
              selectedLabel={cityLabel}
              placeholder="도시 이름으로 검색..."
              fetchOptions={fetchCityOptions}
              onChange={(id, label) => {
                setForm((p) => ({ ...p, headquartersCityId: id }))
                setCityLabel(label)
              }}
            />
          </PickerRow>
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
