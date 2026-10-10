/**
 * 기업 등록·수정 모달 — 옛 `/companies/new`·`/companies/:id/edit` 풀 페이지를 대체한다.
 *
 * 사건 등록 모달(`widgets/event-form/ui/event-register-modal`)과 같은 규약을 따른다:
 * - 셸은 `RegisterModal`(Esc·스크롤락·포커스 트랩은 `useModalBehavior`가 담당)
 * - 닫기(Esc·오버레이·취소)는 dirty면 확인부터, 저장 중에는 닫히지 않는다
 * - 신규 등록 후 3지 분기 — 상세 보기 / 기업 계속 등록 / 닫기
 *
 * 사는 것은 **복귀 충실도**다. 페이지로 나갔다 오면 목록의 검색어·필터·정렬·스크롤이
 * 사라졌다. 모달은 뒤의 목록을 언마운트하지 않는다.
 *
 * 폼 상태는 `CompanyFormBody`(열릴 때 마운트)에 둔다 — 바깥 컴포넌트는 늘 마운트돼 있어서
 * 여기에 상태를 두면 닫았다 다시 열 때 지난 입력이 남는다.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { FiBriefcase, FiGlobe, FiImage } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

import type {
  Company,
  CompanyStatus,
  CreateCompanyInput,
} from '@/shared/api/company'
import { companyApi } from '@/shared/api/company'
import { cityApi } from '@/shared/api/city'
import { getAllCountries, type CountryResponseDto } from '@/shared/api/countries'
import {
  getAllHistoricalCountries,
  type HistoricalCountryResponseDto,
} from '@/shared/api/historical-countries'
import { getAllPersons, type PersonResponseDto } from '@/shared/api/persons'
import { getUploadImageUrl } from '@/shared/api/upload'
import { dateSortKey } from '@/shared/lib/iso-date'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { ConfirmDialog, confirm } from '@/shared/ui/confirm-dialog'
import { DateRangeField } from '@/shared/ui/form-fields/date-range-field'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalFormScroll,
  PersonRegisterModalPrimaryBtn,
  PersonRegisterModalStickyFooter,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import { notify } from '@/shared/ui/toast'

import { type PickerOption, SearchPicker } from './company-search-picker'

/** 상태별 라벨 + 색조 — 목록(companies-list STATUS_META)과 같은 값. */
export const COMPANY_STATUS_META: Record<
  CompanyStatus,
  { label: string; tone: string }
> = {
  ACTIVE: { label: '활동 중', tone: '#16a34a' },
  DISSOLVED: { label: '해산', tone: '#dc2626' },
  MERGED: { label: '합병', tone: '#2563eb' },
  SUSPENDED: { label: '중단', tone: '#d97706' },
  OTHER: { label: '기타', tone: '#64748b' },
}

export const COMPANY_STATUS_ORDER: CompanyStatus[] = [
  'ACTIVE',
  'DISSOLVED',
  'MERGED',
  'SUSPENDED',
  'OTHER',
]

const LEAVE_MESSAGE = '저장하지 않은 변경 사항이 있습니다. 닫으시겠습니까?'

/* ───────────────────────── 폼 상태 ───────────────────────── */

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
  founderId: '',
  headquartersCityId: '',
}

type FormErrors = {
  name?: string
  dateRange?: string
  websiteUrl?: string
  logoUrl?: string
}

function personLabel(person: PersonResponseDto): string {
  return getPersonDisplayName({
    name: person.name ?? '',
    surname: (person as { surname?: string }).surname ?? '',
    middleName: (person as { middleName?: string }).middleName ?? '',
    nameDisplayOrder: person.nameDisplayOrder ?? null,
    country:
      (person as { country?: { defaultNameDisplayOrder?: string | null } | null })
        .country ?? null,
  })
}

function hydrateForm(company: Company): FormState {
  return {
    name: company.name,
    shortName: company.shortName ?? '',
    localName: company.localName ?? '',
    status: company.status ?? 'ACTIVE',
    foundedAt: company.foundedAt ?? '',
    dissolvedAt: company.dissolvedAt ?? '',
    websiteUrl: company.websiteUrl ?? '',
    logoUrl: company.logoUrl ?? '',
    description: company.description ?? '',
    countryId: company.countryId ?? '',
    historicalCountryId: company.historicalCountryId ?? '',
    founderId: company.founderId ?? '',
    headquartersCityId: company.headquartersCityId ?? '',
  }
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {}
  if (!form.name.trim()) errors.name = '기업명을 입력해주세요.'
  if (form.foundedAt && form.dissolvedAt) {
    const foundedKey = dateSortKey(form.foundedAt)
    const dissolvedKey = dateSortKey(form.dissolvedAt)
    if (foundedKey != null && dissolvedKey != null && dissolvedKey < foundedKey) {
      errors.dateRange = '해산일은 설립일보다 빠를 수 없습니다.'
    }
  }
  if (form.websiteUrl.trim() && !/^https?:\/\//i.test(form.websiteUrl.trim())) {
    errors.websiteUrl = '공식 웹사이트는 http(s)://로 시작해야 합니다.'
  }
  if (form.logoUrl.trim() && !/^https?:\/\//i.test(form.logoUrl.trim())) {
    errors.logoUrl = '로고 URL은 http(s)://로 시작해야 합니다.'
  }
  return errors
}

function toPayload(form: FormState): CreateCompanyInput {
  return {
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
    founderId: form.founderId || null,
    headquartersCityId: form.headquartersCityId || null,
  }
}

/* ───────────────────────── 모달 ───────────────────────── */

export interface CompanyRegisterModalProps {
  isOpen: boolean
  /** 닫기 — dirty면 이 컴포넌트가 먼저 확인을 받는다 */
  onClose: () => void
  /** 수정 대상. 없으면 신규 등록. */
  companyId?: string
  /** 저장 성공 통지 — 캐시 무효화는 이미 했으므로 호출부 추가 처리용 */
  onSaved?: (company: Company) => void
}

export const CompanyRegisterModal: React.FC<CompanyRegisterModalProps> = ({
  isOpen,
  onClose,
  companyId,
  onSaved,
}) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = Boolean(companyId)
  const isDirtyRef = useRef(false)
  const [submitting, setSubmitting] = useState(false)
  /** 등록 직후 3지 분기 대상 */
  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(null)
  /** '계속 등록' 시 본문을 새로 마운트해 빈 폼으로 되돌린다 */
  const [formGeneration, setFormGeneration] = useState(0)

  const handleDirtyChange = useCallback((dirty: boolean) => {
    isDirtyRef.current = dirty
  }, [])

  const requestClose = useCallback(async () => {
    if (submitting) return
    if (
      isDirtyRef.current &&
      !(await confirm({ title: '확인', message: LEAVE_MESSAGE }))
    ) {
      return
    }
    isDirtyRef.current = false
    onClose()
  }, [submitting, onClose])

  const handleSaved = useCallback(
    (company: Company) => {
      isDirtyRef.current = false
      // 목록·사이드바·국가 대시보드 기업 섹션·상세가 모두 ['companies', …] 아래다.
      void queryClient.invalidateQueries({ queryKey: ['companies'] })
      onSaved?.(company)
      if (isEdit) {
        notify.success('기업 정보를 수정했습니다.')
        onClose()
      } else {
        setSavedCompanyId(company.id)
      }
    },
    [isEdit, onClose, onSaved, queryClient],
  )

  return (
    <>
      <RegisterModal
        isOpen={isOpen}
        onClose={() => {
          void requestClose()
        }}
        title={isEdit ? '기업 기본 정보 수정' : '기업 등록'}
        maxWidth="min(760px, 96vw)"
        minHeight="min(620px, 86vh)"
        fullBleedOnMobile
        closeOnEsc={!submitting}
        closeOnOverlayClick={!submitting}
      >
        <CompanyFormBody
          key={formGeneration}
          companyId={companyId}
          submitting={submitting}
          onSubmittingChange={setSubmitting}
          onDirtyChange={handleDirtyChange}
          onCancel={() => {
            void requestClose()
          }}
          onSaved={handleSaved}
        />
      </RegisterModal>

      <ConfirmDialog
        isOpen={savedCompanyId !== null}
        title="기업 등록 완료"
        message="등록했습니다. 상세로 이동해 연혁·시설·업종을 이어서 채우거나, 기업을 계속 등록할 수 있습니다."
        confirmLabel="상세 보기"
        altLabel="기업 계속 등록"
        onAlt={() => {
          setSavedCompanyId(null)
          setFormGeneration((generation) => generation + 1)
        }}
        cancelLabel="닫기"
        onConfirm={() => {
          const targetId = savedCompanyId
          setSavedCompanyId(null)
          onClose()
          if (targetId) navigate(pathKeys.companies.detail(targetId))
        }}
        onCancel={() => {
          setSavedCompanyId(null)
          onClose()
        }}
      />
    </>
  )
}

export default CompanyRegisterModal

/* ───────────────────────── 본문(폼) ───────────────────────── */

interface CompanyFormBodyProps {
  companyId?: string
  submitting: boolean
  onSubmittingChange: (submitting: boolean) => void
  onDirtyChange: (dirty: boolean) => void
  onCancel: () => void
  onSaved: (company: Company) => void
}

const CompanyFormBody: React.FC<CompanyFormBodyProps> = ({
  companyId,
  submitting,
  onSubmittingChange,
  onDirtyChange,
  onCancel,
  onSaved,
}) => {
  const isEdit = Boolean(companyId)
  const [loading, setLoading] = useState(isEdit)
  const [loadFailed, setLoadFailed] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const [founderLabel, setFounderLabel] = useState('')
  const [cityLabel, setCityLabel] = useState('')
  const [logoBroken, setLogoBroken] = useState(false)
  const [countries, setCountries] = useState<CountryResponseDto[]>([])
  const [historicalCountries, setHistoricalCountries] = useState<
    HistoricalCountryResponseDto[]
  >([])
  const personsRef = useRef<PersonResponseDto[] | null>(null)
  /** 더티 비교 기준 — 신규는 EMPTY, 수정은 hydrate 직후 캡처 */
  const baselineRef = useRef(JSON.stringify(EMPTY))
  const nameInputRef = useRef<HTMLInputElement>(null)
  const websiteInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const periodRef = useRef<HTMLDivElement>(null)

  useEffect(() => setLogoBroken(false), [form.logoUrl])

  useEffect(() => {
    onDirtyChange(JSON.stringify(form) !== baselineRef.current)
  }, [form, onDirtyChange])

  useEffect(() => {
    getAllCountries()
      .then(setCountries)
      .catch(() => setCountries([]))
    getAllHistoricalCountries()
      .then(setHistoricalCountries)
      .catch(() => setHistoricalCountries([]))
  }, [])

  useEffect(() => {
    if (!companyId) return
    let alive = true
    setLoading(true)
    companyApi
      .getById(companyId)
      .then((company) => {
        if (!alive) return
        if (!company) {
          setLoadFailed(true)
          return
        }
        const hydrated = hydrateForm(company)
        baselineRef.current = JSON.stringify(hydrated)
        setForm(hydrated)
        setFounderLabel(company.founder?.name ?? '')
        setCityLabel(company.headquartersCity?.name ?? '')
      })
      .catch(() => alive && setLoadFailed(true))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [companyId])

  const fetchFounderOptions = useCallback(
    async (query: string): Promise<PickerOption[]> => {
      if (!personsRef.current) {
        personsRef.current = await getAllPersons().catch(() => [])
      }
      const list = personsRef.current ?? []
      const norm = query.trim().toLowerCase()
      const filtered = norm
        ? list.filter((person) => {
            const display = personLabel(person).toLowerCase()
            const orig = (
              (person as { originalName?: string }).originalName ?? ''
            ).toLowerCase()
            return display.includes(norm) || orig.includes(norm)
          })
        : list
      return filtered.slice(0, 30).map((person) => ({
        id: person.id,
        label: personLabel(person),
        sub: (person as { originalName?: string }).originalName ?? undefined,
      }))
    },
    [],
  )

  const fetchCityOptions = useCallback(
    async (query: string): Promise<PickerOption[]> => {
      const cities = await cityApi.searchCities(query)
      return cities.map((city) => ({
        id: city.id,
        label: city.name,
        sub: city.countryName ?? undefined,
      }))
    },
    [],
  )

  const patch = <FieldKey extends keyof FormState>(
    key: FieldKey,
    value: FormState[FieldKey],
  ) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const clearError = (key: keyof FormErrors) => {
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const focusField = (element: HTMLElement | null) => {
    element?.focus()
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting || loading) return
    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (nextErrors.name) return focusField(nameInputRef.current)
    if (nextErrors.dateRange) {
      periodRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (nextErrors.websiteUrl) return focusField(websiteInputRef.current)
    if (nextErrors.logoUrl) return focusField(logoInputRef.current)

    onSubmittingChange(true)
    try {
      const payload = toPayload(form)
      const saved = companyId
        ? await companyApi.update(companyId, payload)
        : await companyApi.create(payload)
      baselineRef.current = JSON.stringify(form)
      onDirtyChange(false)
      onSaved(saved)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      onSubmittingChange(false)
    }
  }

  const logoSrc = getUploadImageUrl(form.logoUrl)
  const showLogo = !!logoSrc && !logoBroken
  // 이름에서 딴다 — 약칭은 종목코드('000660')일 때가 많다
  const initial = form.name.trim().charAt(0)

  return (
    <FormShell onSubmit={handleSubmit} noValidate>
      <PersonRegisterModalFormScroll>
        {loading ? (
          <StateNote role="status">기업 정보를 불러오는 중...</StateNote>
        ) : loadFailed ? (
          <StateNote role="alert">기업 정보를 불러오지 못했습니다.</StateNote>
        ) : (
          <>
            {/* ① 정체성 — 이름이 이 폼의 유일한 필수값이라 맨 위·가장 크게 */}
            <IdentityRow>
              <LogoPreview $hasLogo={showLogo} aria-hidden>
                {showLogo ? (
                  <img src={logoSrc} alt="" onError={() => setLogoBroken(true)} />
                ) : (
                  initial.toUpperCase() || <FiBriefcase size={22} />
                )}
              </LogoPreview>
              <NameBlock>
                <NameLabel htmlFor="company-name">
                  기업명 <Required aria-hidden>*</Required>
                </NameLabel>
                <NameInput
                  id="company-name"
                  ref={nameInputRef}
                  value={form.name}
                  autoFocus={!isEdit}
                  onChange={(event) => {
                    patch('name', event.target.value)
                    clearError('name')
                  }}
                  placeholder="예: 영국 동인도회사"
                  maxLength={100}
                  aria-required
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'company-name-error' : undefined}
                  $error={!!errors.name}
                />
                {errors.name && (
                  <ErrorMessage id="company-name-error" role="alert">
                    {errors.name}
                  </ErrorMessage>
                )}
              </NameBlock>
            </IdentityRow>

            <Grid2>
              <Field>
                <label htmlFor="company-short-name">약칭 / 티커</label>
                <input
                  id="company-short-name"
                  value={form.shortName}
                  onChange={(event) => patch('shortName', event.target.value)}
                  placeholder="예: EIC"
                  maxLength={50}
                />
              </Field>
              <Field>
                <label htmlFor="company-local-name">현지어 / 원어명</label>
                <input
                  id="company-local-name"
                  value={form.localName}
                  onChange={(event) => patch('localName', event.target.value)}
                  placeholder="East India Company"
                  maxLength={200}
                />
              </Field>
            </Grid2>

            <Field as="div">
              <FieldCaption id="company-status-label">상태</FieldCaption>
              <ChipRow role="radiogroup" aria-labelledby="company-status-label">
                {COMPANY_STATUS_ORDER.map((value) => {
                  const meta = COMPANY_STATUS_META[value]
                  const active = form.status === value
                  return (
                    <StatusChip
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      $active={active}
                      $tone={meta.tone}
                      onClick={() => patch('status', value)}
                    >
                      {meta.label}
                    </StatusChip>
                  )
                })}
              </ChipRow>
            </Field>

            {/* ② 소속 · 인물 */}
            <SectionLabel>소속 · 인물</SectionLabel>
            <Grid2>
              <Field>
                <label htmlFor="company-country">소속 국가 (현대)</label>
                <select
                  id="company-country"
                  value={form.countryId}
                  onChange={(event) => patch('countryId', event.target.value)}
                >
                  <option value="">— 없음 —</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <label htmlFor="company-historical-country">소속 국가 (역사)</label>
                <select
                  id="company-historical-country"
                  value={form.historicalCountryId}
                  onChange={(event) =>
                    patch('historicalCountryId', event.target.value)
                  }
                >
                  <option value="">— 없음 —</option>
                  {historicalCountries.map((historical) => (
                    <option key={historical.id} value={historical.id}>
                      {historical.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field as="div">
                <FieldCaption>창립자</FieldCaption>
                <SearchPicker
                  value={form.founderId}
                  selectedLabel={founderLabel}
                  placeholder="인물 이름으로 검색..."
                  label="창립자"
                  showOnEmpty
                  fetchOptions={fetchFounderOptions}
                  onChange={(founderId, label) => {
                    patch('founderId', founderId)
                    setFounderLabel(label)
                  }}
                />
              </Field>
              <Field as="div">
                <FieldCaption>본사 도시</FieldCaption>
                <SearchPicker
                  value={form.headquartersCityId}
                  selectedLabel={cityLabel}
                  placeholder="도시 이름으로 검색..."
                  label="본사 도시"
                  fetchOptions={fetchCityOptions}
                  onChange={(cityId, label) => {
                    patch('headquartersCityId', cityId)
                    setCityLabel(label)
                  }}
                />
              </Field>
            </Grid2>

            {/* ③ 기간 · 링크 */}
            <SectionLabel>기간 · 링크</SectionLabel>
            <Field as="div" ref={periodRef} $error={!!errors.dateRange}>
              <FieldCaption>설립일 · 해산일</FieldCaption>
              <DateRangeField
                renderControlOnly
                startValue={form.foundedAt}
                endValue={form.dissolvedAt}
                onStartChange={(date) => {
                  patch('foundedAt', date)
                  clearError('dateRange')
                }}
                onEndChange={(date) => {
                  patch('dissolvedAt', date)
                  clearError('dateRange')
                }}
                startPlaceholder="설립일"
                endPlaceholder="해산일 (선택)"
                startPickerTitle="설립일 선택"
                endPickerTitle="해산일 선택"
                openEndAfterStart={false}
                clearableEnd
                blockBc
              />
              {errors.dateRange && (
                <ErrorMessage role="alert">{errors.dateRange}</ErrorMessage>
              )}
            </Field>
            <Grid2>
              <IconField $error={!!errors.websiteUrl}>
                <label htmlFor="company-website">공식 웹사이트</label>
                <div className="control">
                  <FiGlobe className="lead" size={14} />
                  <input
                    id="company-website"
                    ref={websiteInputRef}
                    type="url"
                    value={form.websiteUrl}
                    onChange={(event) => {
                      patch('websiteUrl', event.target.value)
                      clearError('websiteUrl')
                    }}
                    placeholder="https://..."
                    maxLength={255}
                    aria-invalid={!!errors.websiteUrl}
                    aria-describedby={
                      errors.websiteUrl ? 'company-website-error' : undefined
                    }
                  />
                </div>
                {errors.websiteUrl && (
                  <ErrorMessage id="company-website-error" role="alert">
                    {errors.websiteUrl}
                  </ErrorMessage>
                )}
              </IconField>
              <IconField $error={!!errors.logoUrl}>
                <label htmlFor="company-logo-url">로고 URL</label>
                <div className="control">
                  <FiImage className="lead" size={14} />
                  <input
                    id="company-logo-url"
                    ref={logoInputRef}
                    type="url"
                    value={form.logoUrl}
                    onChange={(event) => {
                      patch('logoUrl', event.target.value)
                      clearError('logoUrl')
                    }}
                    placeholder="https://..."
                    maxLength={255}
                    aria-invalid={!!errors.logoUrl}
                    aria-describedby={
                      errors.logoUrl ? 'company-logo-url-error' : undefined
                    }
                  />
                </div>
                {errors.logoUrl && (
                  <ErrorMessage id="company-logo-url-error" role="alert">
                    {errors.logoUrl}
                  </ErrorMessage>
                )}
              </IconField>
            </Grid2>
            <Field>
              <label htmlFor="company-description">한 줄 소개</label>
              <textarea
                id="company-description"
                value={form.description}
                onChange={(event) => patch('description', event.target.value)}
                placeholder="기업을 한눈에 설명하는 짧은 소개 (상세 설명은 저장 후 상세에서)"
              />
            </Field>
          </>
        )}
      </PersonRegisterModalFormScroll>

      <PersonRegisterModalStickyFooter>
        <FooterHint>
          {isEdit
            ? '기본 정보만 수정합니다. 연혁·시설·업종은 상세에서 편집하세요.'
            : '기본 정보만 등록합니다. 연혁·시설·업종은 상세에서 이어서 채우세요.'}
        </FooterHint>
        <FooterActions>
          <PersonRegisterModalCancelBtn
            type="button"
            onClick={onCancel}
            disabled={submitting}
          >
            취소
          </PersonRegisterModalCancelBtn>
          <PersonRegisterModalPrimaryBtn
            type="submit"
            disabled={submitting || loading || loadFailed}
          >
            {submitting
              ? '저장 중...'
              : isEdit
                ? '수정 완료'
                : '기업 등록'}
          </PersonRegisterModalPrimaryBtn>
        </FooterActions>
      </PersonRegisterModalStickyFooter>
    </FormShell>
  )
}

/* ───────────────────────── Styled ───────────────────────── */

/** 모달 박스의 flex 열(스크롤 본문 + 고정 푸터)을 깨지 않도록 form은 박스를 만들지 않는다 */
const FormShell = styled.form`
  display: contents;
`

const StateNote = styled.p`
  margin: 48px 0;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const IdentityRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
`

const LogoPreview = styled.div<{ $hasLogo: boolean }>`
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#4338ca')};
  background: ${({ $hasLogo, theme }) =>
    $hasLogo
      ? theme.colors.background.tertiary
      : theme.mode === 'dark'
        ? 'rgba(99,102,241,0.2)'
        : '#eef2ff'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const NameBlock = styled.div`
  flex: 1;
  min-width: 0;
`

const NameLabel = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 4px;
`

const Required = styled.span`
  color: ${({ theme }) => theme.colors.alert.danger.fg};
`

const NameInput = styled.input<{ $error?: boolean }>`
  width: 100%;
  box-sizing: border-box;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  padding: 4px 0 8px;
  background: transparent;
  border: none;
  border-bottom: 2px solid
    ${({ theme, $error }) =>
      $error ? theme.colors.alert.danger.fg : theme.colors.border.default};
  color: ${({ theme }) => theme.colors.text.primary};
  transition: border-color 0.15s;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-weight: 600;
  }
  &:focus,
  &:focus-visible {
    outline: none;
    /* 전역 input 포커스 링(사각 박스)을 끄고 밑줄 색으로만 표시 */
    box-shadow: none;
    border-bottom-color: ${({ theme, $error }) =>
      $error ? theme.colors.alert.danger.fg : theme.colors.primary};
  }
`

const SectionLabel = styled.h3`
  margin: 26px 0 14px;
  padding-top: 18px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Grid2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 16px;
  margin-bottom: 14px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const ErrorMessage = styled.span`
  display: block;
  font-size: 12px;
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.alert.danger.fg};
`

const errorInputBorder = css`
  > input,
  > textarea,
  > .control > input {
    border-color: ${({ theme }) => theme.colors.alert.danger.fg};
  }
`

const FieldCaption = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Field = styled.div<{ $error?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  margin-bottom: 14px;

  ${Grid2} > & {
    margin-bottom: 0;
  }

  > label {
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  /* 직계·.control 안의 컨트롤만 — SearchPicker·DateRangeField 내부 input은 자기 스타일을 쓴다
     (여기서 덮으면 피커의 검색 아이콘 들여쓰기가 지워져 placeholder와 겹친다) */
  > input,
  > select,
  > textarea,
  > .control > input {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff'};
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    color: ${({ theme }) => theme.colors.text.primary};
    transition: border-color 0.15s, box-shadow 0.15s;

    &::placeholder {
      color: ${({ theme }) => theme.colors.text.tertiary};
    }
    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.colors.primary};
      box-shadow: 0 0 0 3px
        ${({ theme }) =>
          theme.mode === 'dark'
            ? 'rgba(99, 102, 241, 0.2)'
            : 'rgba(99, 102, 241, 0.12)'};
    }
  }

  > textarea {
    min-height: 76px;
    resize: vertical;
  }

  > select option {
    background: ${({ theme }) => theme.colors.background.primary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  ${({ $error }) => $error && errorInputBorder}
`

const IconField = styled(Field)`
  .control {
    position: relative;

    svg.lead {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: ${({ theme }) => theme.colors.text.tertiary};
      pointer-events: none;
    }
    > input {
      padding-left: 30px;
    }
  }
`

const ChipRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`

const StatusChip = styled.button<{ $active: boolean; $tone: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  border: 1px solid
    ${({ theme, $active, $tone }) =>
      $active ? `${$tone}66` : theme.colors.border.default};
  background: ${({ $active, $tone }) => ($active ? `${$tone}1a` : 'transparent')};
  color: ${({ theme, $active, $tone }) =>
    $active ? $tone : theme.colors.text.secondary};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ $tone }) => $tone};
    opacity: ${({ $active }) => ($active ? 1 : 0.45)};
  }

  &:hover {
    border-color: ${({ theme, $active, $tone }) =>
      $active ? `${$tone}66` : theme.colors.border.medium};
  }
`

const FooterHint = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.text.tertiary};

  @media (max-width: 768px) {
    display: none;
  }
`

const FooterActions = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
`
