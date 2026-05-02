import React, { useEffect, useRef, useState } from 'react'

import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import styled from 'styled-components'

import {
  type ContinentOption,
  type Country,
  type CountryFormData,
} from '@/entities/country/api'
import { countrySchema } from '@/entities/country/model/schema'
import { useCurrencies } from '@/features/currency/use-currencies.hook'
import { useLanguages } from '@/features/language/use-languages.hook'
import { uploadImage } from '@/shared/api/upload'
import { FormInput } from '@/shared/ui/form-input/form-input'
import { FormSelectNative } from '@/shared/ui/form-select-native/form-select-native'
import {
  SelectModal,
  SelectOption,
} from '@/shared/ui/select-modal/select-modal'
import { zodResolver } from '@hookform/resolvers/zod'

import * as S from './country-form.styles'

/**
 * 국가 등록/수정 폼 — 모달 전용
 * (사이드패널 모드는 사용처가 없어 제거됨)
 */
const CountryFormLayout = styled.div`
  ${S.FormSection} {
    margin-top: 0;
    padding: 0;
    border: none;
    gap: 0;
  }
  ${S.FormSection}:not(:first-of-type) {
    margin-top: 28px;
    padding-top: 32px;
    border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  }
  ${S.FormSectionHeader} {
    margin-bottom: 16px;
  }
  ${S.FormSectionIcon} {
    display: none;
  }
  ${S.FormSectionTitle} {
    font-size: 15px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
    margin: 0 0 4px 0;
  }
  ${S.FormSectionDescription} {
    font-size: 13px;
    color: ${({ theme }) => theme.colors.text.secondary};
    margin: 0;
  }
  ${S.FormRow} {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0;
    border: none;
  }
  ${S.FormField} {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 24px;
    align-items: start;
    padding: 18px 0;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  }
  @media (max-width: 768px) {
    ${S.FormField} {
      grid-template-columns: 1fr;
      gap: 8px;
      padding: 14px 0;
    }
  }
  ${S.FormLabel} {
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
    padding-top: 10px;
    margin: 0;
    grid-column: 1;
    grid-row: 1;
  }
  ${S.FormField} input:not([type='hidden']),
  ${S.FormField} button[type='button'],
  ${S.FormField} select,
  ${S.FormField} textarea {
    grid-column: 2;
    grid-row: 1;
    min-width: 0;
  }
  ${S.FormField} ${S.ErrorMessage} {
    grid-column: 2;
    grid-row: 2;
    font-size: 12px;
    color: #dc2626;
    margin-top: 4px;
  }
  ${S.FormField} > div {
    grid-column: 2;
  }
  /* 대표 이미지 — 원형 96px */
  ${S.FormField}[data-field='thumbnail'] .thumbnail-right {
    grid-column: 2;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    min-width: 0;
  }
  ${S.FormField}[data-field='thumbnail'] .thumbnail-circle {
    width: 96px;
    height: 96px;
    min-width: 96px;
    min-height: 96px;
    max-width: 96px;
    max-height: 96px;
    border-radius: 50%;
    overflow: hidden;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%)'};
    border: 2px dashed
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#cbd5e1'};
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition:
      border-color 0.2s,
      background 0.2s,
      box-shadow 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }
  ${S.FormField}[data-field='thumbnail'] .thumbnail-circle:hover {
    border-color: #6366f1;
  }
  ${S.FormField}[data-field='thumbnail'] .thumbnail-circle[data-has-image] {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#fff'};
    border-color: ${({ theme }) => theme.colors.border.default};
    border-style: solid;
  }
  ${S.FormField}[data-field='thumbnail'] .thumbnail-circle img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  ${S.FormField}[data-field='thumbnail'] .thumbnail-circle svg {
    color: ${({ theme }) => theme.colors.text.secondary};
    width: 36px;
    height: 36px;
  }
  ${S.FormField}[data-field='thumbnail'] .thumbnail-hint {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.secondary};
    line-height: 1.4;
  }
  ${S.FormHelp} {
    grid-column: 2;
    grid-row: 2;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.secondary};
    margin-top: 6px;
    line-height: 1.45;
  }
  /* 입력 필드 폭 */
  ${S.FormField} .input-iso {
    max-width: 100px;
  }
  ${S.FormField} .input-flag-emoji {
    max-width: 96px;
  }
  ${S.FormField} .input-name,
  ${S.FormField} .input-local-name {
    max-width: 480px;
  }
  ${S.FormField} .input-capital {
    max-width: 280px;
  }
  ${S.FormField} .input-number {
    max-width: 220px;
  }
  ${S.SelectButton} {
    padding: 10px 14px;
    font-size: 14px;
    max-width: 480px;
  }
`

interface CountryFormProps {
  /** 폼 모드 */
  mode: 'create' | 'edit'
  /** 수정 모드일 때만 의미 있음. create일 땐 null. */
  editing: Country | null
  /** 대륙 옵션 목록 */
  continents: ContinentOption[]
  /** 저장 핸들러 */
  onSave: (data: Omit<Country, 'id'> & { id?: string }) => Promise<void>
}

/** 동양식(성→이름) 표기를 쓰는 ISO 코드 */
const ASIAN_NAME_ORDER_ISO_CODES = new Set([
  'KR',
  'KP',
  'JP',
  'CN',
  'TW',
  'HK',
  'MO',
  'VN',
  'MN',
])

/** 인구 표시용: 12345678 → "12,345,678" */
function formatPopulation(value: number | undefined): string {
  if (value === undefined || isNaN(value)) return ''
  return new Intl.NumberFormat('en-US').format(value)
}

/** 인구 입력 파싱: "12,345,678" → 12345678 */
function parsePopulation(input: string): number | undefined {
  const digits = input.replace(/[^\d]/g, '')
  if (!digits) return undefined
  const n = Number(digits)
  return isNaN(n) ? undefined : n
}

export function CountryForm({
  mode,
  editing,
  continents,
  onSave,
}: CountryFormProps) {
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('')
  const [imageUploading, setImageUploading] = useState(false)
  const [imageUploadError, setImageUploadError] = useState<string | null>(null)
  const [showContinentModal, setShowContinentModal] = useState(false)
  const [showCurrencyModal, setShowCurrencyModal] = useState(false)
  const [showLanguageModal, setShowLanguageModal] = useState(false)

  /** 사용자가 표기 순서를 수동으로 바꿨는지 — true면 자동 추론 안 함 */
  const nameOrderTouchedRef = useRef(false)

  /** 인구 표시값 (포맷됨) */
  const [populationDisplay, setPopulationDisplay] = useState('')

  const { data: currencies = [], isLoading: currenciesLoading } =
    useCurrencies()
  const { data: languages = [], isLoading: languagesLoading } = useLanguages()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(countrySchema),
    mode: 'onTouched',
    criteriaMode: 'all',
    shouldUnregister: false,
  })

  const selectedContinentId = watch('continentId')
  const selectedCurrencyId = watch('currencyId')
  const selectedLanguageId = watch('languageId')
  const watchedIsoCode = watch('isoCode')
  const watchedNameOrder = watch('defaultNameDisplayOrder')

  // 편집 세션 동기화 (id 기준)
  const editingSyncKey = editing?.id ?? '__new__'
  useEffect(() => {
    nameOrderTouchedRef.current = false
    if (mode === 'edit' && editing?.id) {
      reset({
        name: editing.name || '',
        fullName: (editing as { fullName?: string }).fullName || '',
        localName: editing.localName || '',
        isoCode: editing.isoCode || '',
        flagEmoji: editing.flagEmoji || '',
        capital: editing.capital || '',
        continentId: editing.continentId || '',
        population: editing.population,
        areaSqKm: editing.areaSqKm,
        thumbnailUrl: editing.thumbnailUrl || '',
        currencyId: editing.currencyId || '',
        languageId: editing.languageId || '',
        defaultNameDisplayOrder:
          (editing as { defaultNameDisplayOrder?: 'korean' | 'western' })
            .defaultNameDisplayOrder ?? 'korean',
      })
      setThumbnailPreview(editing.thumbnailUrl || '')
      setPopulationDisplay(formatPopulation(editing.population ?? undefined))
      // 편집 모드: 기존 값을 그대로 두고 자동 추론 비활성
      nameOrderTouchedRef.current = true
    } else {
      reset({
        name: '',
        fullName: '',
        localName: '',
        isoCode: '',
        flagEmoji: '',
        capital: '',
        continentId: '',
        population: undefined,
        areaSqKm: undefined,
        thumbnailUrl: '',
        currencyId: '',
        languageId: '',
        defaultNameDisplayOrder: 'korean',
      })
      setThumbnailPreview('')
      setPopulationDisplay('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- editingSyncKey만 트리거
  }, [editingSyncKey, mode, reset])

  // 썸네일 URL → 미리보기
  const thumbnailUrl = watch('thumbnailUrl')
  useEffect(() => {
    setThumbnailPreview(thumbnailUrl || '')
  }, [thumbnailUrl])

  // ISO 코드 기반 표기 순서 자동 추론 (사용자가 수동 변경하지 않은 경우)
  useEffect(() => {
    if (nameOrderTouchedRef.current) return
    const code = (watchedIsoCode || '').toUpperCase()
    if (!code) return
    const inferred = ASIAN_NAME_ORDER_ISO_CODES.has(code) ? 'korean' : 'western'
    if (inferred !== watchedNameOrder) {
      setValue('defaultNameDisplayOrder', inferred, { shouldValidate: false })
    }
  }, [watchedIsoCode, watchedNameOrder, setValue])

  const handleFlagImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploadError(null)
    setImageUploading(true)
    try {
      const result = await uploadImage(file, 'countries')
      const url = result.url ?? ''
      if (url.length > 255) {
        const message =
          '업로드된 이미지 URL이 255자를 초과합니다. 짧은 경로의 이미지를 사용해 주세요.'
        toast.error(message)
        setImageUploadError(message)
        setThumbnailPreview('')
        setValue('thumbnailUrl', '', { shouldValidate: true })
        return
      }
      setValue('thumbnailUrl', url, { shouldValidate: true })
      setThumbnailPreview(url)
    } catch (err) {
      setImageUploadError((err as Error).message)
      setThumbnailPreview('')
      setValue('thumbnailUrl', '')
    } finally {
      setImageUploading(false)
      e.target.value = ''
    }
  }

  const handleDeleteImage = () => {
    setThumbnailPreview('')
    setValue('thumbnailUrl', '', { shouldValidate: true })
    setImageUploadError(null)
    const input = document.getElementById(
      'flag-image-upload',
    ) as HTMLInputElement | null
    if (input) input.value = ''
  }

  const onSubmit = async (data: CountryFormData) => {
    await onSave({
      id: editing?.id,
      name: data.name,
      fullName: data.fullName,
      localName: data.localName,
      isoCode: data.isoCode,
      flagEmoji: data.flagEmoji,
      capital: data.capital,
      population: data.population,
      areaSqKm: data.areaSqKm,
      thumbnailUrl: data.thumbnailUrl ?? '',
      currencyId: data.currencyId,
      languageId: data.languageId,
      continentId: data.continentId,
      defaultNameDisplayOrder: data.defaultNameDisplayOrder,
    })
  }

  const handleContinentSelect = (continentId: string) => {
    setValue('continentId', continentId, { shouldValidate: true })
    setShowContinentModal(false)
  }
  const handleCurrencySelect = (currencyId: string) => {
    setValue('currencyId', currencyId, { shouldValidate: true })
    setShowCurrencyModal(false)
  }
  const handleLanguageSelect = (languageId: string) => {
    setValue('languageId', languageId, { shouldValidate: true })
    setShowLanguageModal(false)
  }

  const getContinentLabel = () => {
    if (!selectedContinentId) return '대륙 선택'
    const c = continents.find((x) => x.id === selectedContinentId)
    return c ? c.name : '대륙 선택'
  }
  const getCurrencyLabel = () => {
    if (!selectedCurrencyId) return '화폐 선택 (선택)'
    const c = currencies.find((x) => x.id === selectedCurrencyId)
    return c ? `${c.code} — ${c.name}` : '화폐 선택 (선택)'
  }
  const getLanguageLabel = () => {
    if (!selectedLanguageId) return '언어 선택 (선택)'
    const l = languages.find((x) => x.id === selectedLanguageId)
    return l ? `${l.name} (${l.code})` : '언어 선택 (선택)'
  }

  const continentOptions: SelectOption[] = continents.map((continent) => ({
    value: continent.id,
    label: continent.name,
    icon: '🌍',
  }))
  const currencyOptions: SelectOption[] = currencies.map((c) => ({
    value: c.id,
    label: `${c.code} — ${c.name}`,
    icon: c.symbol,
  }))
  const languageOptions: SelectOption[] = languages.map((l) => ({
    value: l.id,
    label: `${l.name} (${l.code})`,
    description: l.originalName ?? undefined,
  }))

  return (
    <CountryFormLayout>
      <S.Form id="country-form" onSubmit={handleSubmit(onSubmit)}>
        {/* ───── 기본 정보 ───── */}
        <S.FormSection>
          <S.FormSectionHeader>
            <div>
              <S.FormSectionTitle>기본 정보</S.FormSectionTitle>
              <S.FormSectionDescription>
                국가 이름·식별 정보를 입력하세요
              </S.FormSectionDescription>
            </div>
          </S.FormSectionHeader>

          {/* 대표 이미지 */}
          <S.FormField data-field="thumbnail">
            <S.FormLabel htmlFor="flag-image-upload">대표 이미지</S.FormLabel>
            <div className="thumbnail-right">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label
                  className="thumbnail-circle"
                  htmlFor="flag-image-upload"
                  data-has-image={!!thumbnailPreview}
                >
                  {thumbnailPreview ? (
                    <img
                      src={thumbnailPreview}
                      alt="대표 이미지 미리보기"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                      />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  )}
                </label>
                {imageUploading && (
                  <span style={{ fontSize: 13, color: '#64748b' }}>
                    업로드 중…
                  </span>
                )}
                {thumbnailPreview && !imageUploading && (
                  <button
                    type="button"
                    onClick={handleDeleteImage}
                    style={{
                      padding: '6px 10px',
                      fontSize: 12,
                      color: '#dc2626',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    이미지 삭제
                  </button>
                )}
              </div>
              <span className="thumbnail-hint">
                {thumbnailPreview
                  ? '클릭하면 이미지를 변경할 수 있습니다 · 정사각형 권장 (96×96)'
                  : '국기·상징 이미지를 클릭하여 추가 (선택, 정사각형 권장)'}
              </span>
              <S.FileInput
                id="flag-image-upload"
                type="file"
                accept="image/*"
                onChange={handleFlagImageChange}
                disabled={imageUploading}
              />
            </div>
            {imageUploadError && (
              <S.ErrorMessage style={{ marginTop: '8px' }}>
                {imageUploadError}
              </S.ErrorMessage>
            )}
          </S.FormField>

          {/* 국가명 */}
          <S.FormField>
            <S.FormLabel>
              국가명 <S.RequiredStar>*</S.RequiredStar>
            </S.FormLabel>
            <FormInput
              className="input-name"
              {...register('name')}
              placeholder="대한민국"
              autoFocus={mode === 'create'}
              $error={!!errors.name}
            />
            {errors.name && (
              <S.ErrorMessage>{errors.name.message}</S.ErrorMessage>
            )}
          </S.FormField>

          {/* 로컬명 */}
          <S.FormField>
            <S.FormLabel>로컬명</S.FormLabel>
            <FormInput
              className="input-local-name"
              {...register('localName')}
              placeholder="예: 大韓民國"
              $error={!!errors.localName}
            />
            <S.FormHelp>
              해당 국가에서 사용하는 표기 (한자·키릴·아랍 등 원어)
            </S.FormHelp>
            {errors.localName && (
              <S.ErrorMessage>{errors.localName.message}</S.ErrorMessage>
            )}
          </S.FormField>

          {/* 풀네임 */}
          <S.FormField>
            <S.FormLabel>공식 명칭</S.FormLabel>
            <FormInput
              {...register('fullName')}
              placeholder="예: Republic of Korea"
              $error={!!errors.fullName}
            />
            <S.FormHelp>
              영문 또는 한글 풀네임 — 외교 문서 등에서 쓰는 정식 국호
            </S.FormHelp>
            {errors.fullName && (
              <S.ErrorMessage>{errors.fullName.message}</S.ErrorMessage>
            )}
          </S.FormField>

          {/* ISO 코드 + 국기 이모지 */}
          <S.FormField>
            <S.FormLabel>ISO 코드</S.FormLabel>
            <FormInput
              className="input-iso"
              {...register('isoCode')}
              placeholder="KR"
              maxLength={3}
              style={{ textTransform: 'uppercase' }}
              onChange={(e) => {
                const upper = e.target.value.toUpperCase()
                if (e.target.value !== upper) e.target.value = upper
                setValue('isoCode', upper, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }}
              $error={!!errors.isoCode}
            />
            <S.FormHelp>ISO 3166-1 alpha-2 (예: KR, JP, US)</S.FormHelp>
            {errors.isoCode && (
              <S.ErrorMessage>{errors.isoCode.message}</S.ErrorMessage>
            )}
          </S.FormField>

          <S.FormField>
            <S.FormLabel>국기 이모지</S.FormLabel>
            <FormInput
              className="input-flag-emoji"
              {...register('flagEmoji')}
              placeholder="🇰🇷"
              $error={!!errors.flagEmoji}
            />
            {errors.flagEmoji && (
              <S.ErrorMessage>{errors.flagEmoji.message}</S.ErrorMessage>
            )}
          </S.FormField>

          {/* 수도 */}
          <S.FormField>
            <S.FormLabel>수도</S.FormLabel>
            <FormInput
              className="input-capital"
              {...register('capital')}
              placeholder="서울"
              $error={!!errors.capital}
            />
            {errors.capital && (
              <S.ErrorMessage>{errors.capital.message}</S.ErrorMessage>
            )}
          </S.FormField>

          {/* 대륙 */}
          <S.FormField>
            <S.FormLabel>
              대륙 <S.RequiredStar>*</S.RequiredStar>
            </S.FormLabel>
            <S.SelectButton
              type="button"
              onClick={() => setShowContinentModal(true)}
              $error={!!errors.continentId}
              $hasValue={!!selectedContinentId}
            >
              <span>{getContinentLabel()}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
              </svg>
            </S.SelectButton>
            {errors.continentId && (
              <S.ErrorMessage>{errors.continentId.message}</S.ErrorMessage>
            )}
          </S.FormField>

          {/* 이름 표기 순서 */}
          <S.FormField>
            <S.FormLabel>이름 표기 순서 기본값</S.FormLabel>
            <FormSelectNative
              {...register('defaultNameDisplayOrder', {
                onChange: () => {
                  nameOrderTouchedRef.current = true
                },
              })}
              className="input-name-order"
              aria-label="인물 이름 표기 순서 기본값"
            >
              <option value="korean">동양식 (성 → 이름)</option>
              <option value="western">서양식 (이름 → 성)</option>
            </FormSelectNative>
            <S.FormHelp>
              이 국가 인물을 한 줄로 표시할 때의 기본 순서. ISO 코드 입력 시
              자동으로 추론됩니다.
            </S.FormHelp>
          </S.FormField>
        </S.FormSection>

        {/* ───── 통계 정보 ───── */}
        <S.FormSection>
          <S.FormSectionHeader>
            <div>
              <S.FormSectionTitle>통계 정보</S.FormSectionTitle>
              <S.FormSectionDescription>
                인구·면적 등 (선택)
              </S.FormSectionDescription>
            </div>
          </S.FormSectionHeader>

          <S.FormField>
            <S.FormLabel>인구</S.FormLabel>
            <FormInput
              className="input-number"
              type="text"
              inputMode="numeric"
              value={populationDisplay}
              onChange={(e) => {
                const parsed = parsePopulation(e.target.value)
                setPopulationDisplay(
                  parsed === undefined ? '' : formatPopulation(parsed),
                )
                setValue('population', parsed as number | undefined, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }}
              placeholder="51,700,000"
              $error={!!errors.population}
            />
            {errors.population && (
              <S.ErrorMessage>{errors.population.message}</S.ErrorMessage>
            )}
          </S.FormField>

          <S.FormField>
            <S.FormLabel>면적 (km²)</S.FormLabel>
            <FormInput
              className="input-number"
              {...register('areaSqKm', { valueAsNumber: true })}
              type="number"
              placeholder="100363"
              $error={!!errors.areaSqKm}
            />
            {errors.areaSqKm && (
              <S.ErrorMessage>{errors.areaSqKm.message}</S.ErrorMessage>
            )}
          </S.FormField>
        </S.FormSection>

        {/* ───── 부가 정보 ───── */}
        <S.FormSection>
          <S.FormSectionHeader>
            <div>
              <S.FormSectionTitle>부가 정보</S.FormSectionTitle>
              <S.FormSectionDescription>
                화폐·언어 (선택)
              </S.FormSectionDescription>
            </div>
          </S.FormSectionHeader>

          <S.FormField>
            <S.FormLabel>화폐</S.FormLabel>
            <S.SelectButton
              type="button"
              onClick={() => setShowCurrencyModal(true)}
              $error={!!errors.currencyId}
              $hasValue={!!selectedCurrencyId}
            >
              <span>
                {currenciesLoading ? '불러오는 중…' : getCurrencyLabel()}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
              </svg>
            </S.SelectButton>
            {errors.currencyId && (
              <S.ErrorMessage>{errors.currencyId.message}</S.ErrorMessage>
            )}
          </S.FormField>

          <S.FormField>
            <S.FormLabel>언어</S.FormLabel>
            <S.SelectButton
              type="button"
              onClick={() => setShowLanguageModal(true)}
              $error={!!errors.languageId}
              $hasValue={!!selectedLanguageId}
            >
              <span>
                {languagesLoading ? '불러오는 중…' : getLanguageLabel()}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
              </svg>
            </S.SelectButton>
            {errors.languageId && (
              <S.ErrorMessage>{errors.languageId.message}</S.ErrorMessage>
            )}
          </S.FormField>
        </S.FormSection>
      </S.Form>

      <SelectModal
        isOpen={showContinentModal}
        onClose={() => setShowContinentModal(false)}
        title="대륙 선택"
        options={continentOptions}
        selectedValue={selectedContinentId}
        onSelect={handleContinentSelect}
      />
      <SelectModal
        isOpen={showCurrencyModal}
        onClose={() => setShowCurrencyModal(false)}
        title="화폐 선택"
        options={currencyOptions}
        selectedValue={selectedCurrencyId}
        onSelect={handleCurrencySelect}
        searchable
        searchPlaceholder="코드·이름으로 검색 (예: USD, 달러)"
        isLoading={currenciesLoading}
      />
      <SelectModal
        isOpen={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        title="언어 선택"
        options={languageOptions}
        selectedValue={selectedLanguageId}
        onSelect={handleLanguageSelect}
        searchable
        searchPlaceholder="코드·이름·원어로 검색"
        isLoading={languagesLoading}
      />
    </CountryFormLayout>
  )
}

export type { CountryFormProps }
