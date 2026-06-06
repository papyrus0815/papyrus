import React, { useEffect, useRef, useState } from 'react'

import { useForm } from 'react-hook-form'
import { FiDollarSign, FiGlobe } from 'react-icons/fi'
import styled from 'styled-components'

import {
  type ContinentOption,
  type Country,
  type CountryFormData,
} from '@/entities/country/api'
import {
  inferNameOrderFromIso,
  isoCodeToFlagEmoji,
} from '@/entities/country/lib/name-order'
import { countrySchema } from '@/entities/country/model/schema'
import { useFormDraft } from '@/shared/lib/use-form-draft'
import { useCurrencies } from '@/features/currency/use-currencies.hook'
import { useLanguages } from '@/features/language/use-languages.hook'
import { EmptyHint } from '@/shared/ui/empty-hint/empty-hint'
import { FormInput } from '@/shared/ui/form-input/form-input'
import { ThumbnailUploader } from '@/shared/ui/thumbnail-uploader/thumbnail-uploader'
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
  padding-bottom: 24px;
  ${S.FormSection} {
    margin-top: 0;
    padding: 0;
    border: none;
    gap: 0;
  }
  ${S.FormSection}:not(:first-of-type) {
    margin-top: 40px;
  }
  ${S.FormSectionHeader} {
    margin-bottom: 12px;
    padding: 0;
  }
  ${S.FormSectionIcon} {
    display: none;
  }
  ${S.FormSectionTitle} {
    font-size: 11px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
    margin: 0;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  ${S.FormSectionDescription} {
    display: none;
  }
  /* 필드: top-label (라벨 위, 입력 아래) */
  ${S.FormRow} {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    padding: 0;
    border: none;
  }
  @media (max-width: 640px) {
    ${S.FormRow} {
      grid-template-columns: 1fr;
    }
  }
  ${S.FormField} {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 0;
    border: none;
    margin-top: 18px;
  }
  ${S.FormField}:first-child,
  ${S.FormRow} ${S.FormField} {
    margin-top: 0;
  }
  ${S.FormSection} > ${S.FormField}:first-of-type,
  ${S.FormSection} > ${S.FormRow}:first-of-type {
    margin-top: 0;
  }
  ${S.FormSection} > ${S.FormRow} {
    margin-top: 18px;
  }
  ${S.FormLabel} {
    font-size: 13px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.secondary};
    padding-top: 0;
    margin: 0;
  }
  ${S.FormField} input:not([type='hidden']),
  ${S.FormField} button[type='button'],
  ${S.FormField} select,
  ${S.FormField} textarea {
    min-width: 0;
  }
  ${S.FormField} ${S.ErrorMessage} {
    font-size: 12px;
    margin-top: 0;
  }
  ${S.FormHelp} {
    margin-top: 0;
  }
  /* 입력 폭 — 3단계 통일 */
  ${S.FormField} .input-xs {
    max-width: 88px;
  }
  ${S.FormField} .input-sm {
    max-width: 200px;
  }
  ${S.FormField} .input-iso,
  ${S.FormField} .input-flag-emoji {
    max-width: 88px;
  }
  ${S.FormField} .input-capital,
  ${S.FormField} .input-number {
    max-width: 200px;
  }
  ${S.FormField} .input-name,
  ${S.FormField} .input-local-name {
    max-width: 100%;
  }
  ${S.SelectButton} {
    font-size: 14px;
    max-width: 100%;
  }
`

/** 큰 숫자의 한국어 보조 표시 (예: "약 5,170만") */
const KoreanShortHint = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

/** 숫자 입력 + 단위 suffix 배치 (예: 면적 km²) */
const NumberWithSuffix = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  max-width: 220px;

  input {
    padding-right: 44px;
  }
`

const NumberSuffix = styled.span`
  position: absolute;
  right: 12px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  pointer-events: none;
`

/** ISO 코드에서 자동 추론된 값임을 표시 */
const InferredBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.tertiary};

  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.alert.success.fg};
  }
`

interface CountryFormProps {
  /** 폼 모드 */
  mode: 'create' | 'edit'
  /** 수정 모드일 때만 의미 있음. create일 땐 null. */
  editing: Country | null
  /** 대륙 옵션 목록 */
  continents: ContinentOption[]
  /** 저장 핸들러 — RHF 검증 통과한 formData + (수정 시) id */
  onSave: (data: CountryFormData & { id?: string }) => Promise<void>
  /** RHF 값 변경 콜백 — 외부 헤더의 진척률 인디케이터 등에 사용 */
  onValuesChange?: (values: Partial<CountryFormData>) => void
  /** RHF dirty 상태 변경 콜백 — 모달 close 가드 */
  onDirtyChange?: (isDirty: boolean) => void
}

/** 정수 표시용: 12345678 → "12,345,678" (인구·면적 공용) */
function formatNumberWithCommas(value: number | undefined): string {
  if (value === undefined || isNaN(value)) return ''
  return new Intl.NumberFormat('en-US').format(value)
}

/** 콤마 입력 파싱: "12,345,678" → 12345678 */
function parseNumberWithCommas(input: string): number | undefined {
  const digits = input.replace(/[^\d]/g, '')
  if (!digits) return undefined
  const n = Number(digits)
  return isNaN(n) ? undefined : n
}

/** 큰 숫자 한국어 약수 표시: 51700000 → "약 5,170만", 1234567890 → "약 12억 3,456만" */
function formatKoreanShort(value: number | undefined): string {
  if (value === undefined || isNaN(value) || value === 0) return ''
  const eok = Math.floor(value / 100_000_000)
  const man = Math.floor((value % 100_000_000) / 10_000)
  const parts: string[] = []
  if (eok > 0) parts.push(`${eok.toLocaleString()}억`)
  if (man > 0) parts.push(`${man.toLocaleString()}만`)
  if (parts.length === 0) return `${value.toLocaleString()}`
  return `약 ${parts.join(' ')}`
}

export function CountryForm({
  mode,
  editing,
  continents,
  onSave,
  onValuesChange,
  onDirtyChange,
}: CountryFormProps) {
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('')
  const [showCurrencyModal, setShowCurrencyModal] = useState(false)
  const [showLanguageModal, setShowLanguageModal] = useState(false)

  /** 사용자가 표기 순서를 수동으로 바꿨는지 — true면 자동 추론 안 함 */
  const nameOrderTouchedRef = useRef(false)

  /** 인구 표시값 (포맷됨) */
  const [populationDisplay, setPopulationDisplay] = useState('')

  /** 면적 표시값 (포맷됨) */
  const [areaDisplay, setAreaDisplay] = useState('')

  const { data: currencies = [], isLoading: currenciesLoading } =
    useCurrencies()
  const { data: languages = [], isLoading: languagesLoading } = useLanguages()

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(countrySchema),
    mode: 'onTouched',
    criteriaMode: 'all',
    shouldUnregister: false,
  })

  const selectedCurrencyId = watch('currencyId')
  const selectedLanguageId = watch('languageId')
  const watchedIsoCode = watch('isoCode')
  const watchedNameOrder = watch('defaultNameDisplayOrder')

  // 외부 헤더(인디케이터)·모달(close 가드) 동기화 — RHF 값/dirty 변경 시 콜백
  const onValuesChangeRef = useRef(onValuesChange)
  onValuesChangeRef.current = onValuesChange
  useEffect(() => {
    if (!onValuesChangeRef.current) return
    const sub = watch((values) => {
      onValuesChangeRef.current?.(values as Partial<CountryFormData>)
    })
    return () => sub.unsubscribe()
  }, [watch])

  const onDirtyChangeRef = useRef(onDirtyChange)
  onDirtyChangeRef.current = onDirtyChange
  useEffect(() => {
    onDirtyChangeRef.current?.(isDirty)
  }, [isDirty])

  // 편집 세션 동기화 (id 기준)
  const editingSyncKey = editing?.id ?? '__new__'
  useEffect(() => {
    nameOrderTouchedRef.current = false
    if (mode === 'edit' && editing?.id) {
      reset({
        name: editing.name || '',
        fullName: editing.fullName || '',
        localName: editing.localName || '',
        isoCode: editing.isoCode || '',
        flagEmoji: editing.flagEmoji || '',
        capital: editing.capital || '',
        continentId: editing.continentId || '',
        population: editing.population
          ? Number(editing.population)
          : undefined,
        areaSqKm: editing.areaSqKm ?? undefined,
        thumbnailUrl: editing.thumbnailUrl || '',
        currencyId: editing.currencyId || '',
        languageId: editing.languageId || '',
        defaultNameDisplayOrder: editing.defaultNameDisplayOrder ?? 'korean',
      })
      setThumbnailPreview(editing.thumbnailUrl || '')
      setPopulationDisplay(
        formatNumberWithCommas(
          editing.population != null ? Number(editing.population) : undefined,
        ),
      )
      setAreaDisplay(formatNumberWithCommas(editing.areaSqKm ?? undefined))
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
      setAreaDisplay('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- editingSyncKey만 트리거
  }, [editingSyncKey, mode, reset])

  // 썸네일 URL → 미리보기
  const thumbnailUrl = watch('thumbnailUrl')
  useEffect(() => {
    setThumbnailPreview(thumbnailUrl || '')
  }, [thumbnailUrl])

  /** 마지막 자동 추론된 값 — UI 피드백용 (ISO에서 추론됨 배지) */
  const [lastInferredFromIso, setLastInferredFromIso] = useState<
    'korean' | 'western' | null
  >(null)

  /** 사용자가 국기 이모지를 수동 변경했는지 — true면 ISO 자동 채우기 안 함 */
  const flagEmojiTouchedRef = useRef(false)

  // ISO 코드 기반 자동 채우기:
  // 1) 표기 순서 (사용자가 수동 변경 안 했을 때)
  // 2) 국기 이모지 (사용자가 수동 변경 안 했을 때)
  useEffect(() => {
    // 표기 순서
    if (!nameOrderTouchedRef.current) {
      const inferred = inferNameOrderFromIso(watchedIsoCode)
      if (inferred) {
        if (inferred !== watchedNameOrder) {
          setValue('defaultNameDisplayOrder', inferred, {
            shouldValidate: false,
          })
        }
        setLastInferredFromIso(inferred)
      } else {
        setLastInferredFromIso(null)
      }
    }
    // 국기 이모지 자동 채우기
    if (!flagEmojiTouchedRef.current) {
      const flag = isoCodeToFlagEmoji(watchedIsoCode)
      if (flag) {
        setValue('flagEmoji', flag, { shouldValidate: false })
      }
    }
  }, [watchedIsoCode, watchedNameOrder, setValue])

  // create 모드 자동 저장 (localStorage draft)
  const watchedAll = watch()
  const { clear: clearDraft } = useFormDraft({
    key: 'country-create',
    enabled: mode === 'create',
    values: watchedAll,
    onRestore: (data) => {
      reset(data)
      if (data.population != null) {
        setPopulationDisplay(formatNumberWithCommas(Number(data.population)))
      }
      if (data.areaSqKm != null) {
        setAreaDisplay(formatNumberWithCommas(Number(data.areaSqKm)))
      }
      if (data.thumbnailUrl) setThumbnailPreview(data.thumbnailUrl)
    },
  })

  const onSubmit = async (data: CountryFormData) => {
    await onSave({ ...data, id: editing?.id })
    clearDraft()
  }

  const handleCurrencySelect = (currencyId: string) => {
    setValue('currencyId', currencyId, { shouldValidate: true })
    setShowCurrencyModal(false)
  }
  const handleLanguageSelect = (languageId: string) => {
    setValue('languageId', languageId, { shouldValidate: true })
    setShowLanguageModal(false)
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
      <S.Form
        id="country-form"
        onSubmit={handleSubmit(onSubmit)}
        autoComplete="off"
        noValidate
      >
        {/* ───── 기본 정보 ───── */}
        <S.FormSection data-form-section="basic">
          <S.FormSectionHeader>
            <div>
              <S.FormSectionTitle>기본 정보</S.FormSectionTitle>
              <S.FormSectionDescription>
                국가 이름·식별 정보를 입력하세요
              </S.FormSectionDescription>
            </div>
          </S.FormSectionHeader>

          {/* 대표 이미지 — 미니멀 정사각형 96px */}
          <S.FormField data-field="thumbnail">
            <S.FormLabel htmlFor="flag-image-upload">대표 이미지</S.FormLabel>
            <ThumbnailUploader
              value={thumbnailPreview}
              category="countries"
              inputId="flag-image-upload"
              alt="국가 대표 이미지 미리보기"
              onChange={(url) => {
                setThumbnailPreview(url)
                setValue('thumbnailUrl', url, { shouldValidate: true })
              }}
            />
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
              autoComplete="off"
              autoFocus={mode === 'create'}
              aria-required="true"
              aria-invalid={!!errors.name}
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
              placeholder="大韓民國"
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
              placeholder="Republic of Korea"
              $error={!!errors.fullName}
            />
            <S.FormHelp>
              영문 또는 한글 풀네임 — 외교 문서 등에서 쓰는 정식 국호
            </S.FormHelp>
            {errors.fullName && (
              <S.ErrorMessage>{errors.fullName.message}</S.ErrorMessage>
            )}
          </S.FormField>

          {/* ISO 코드 + 국기 한 행 */}
          <S.FormRow>
            <S.FormField>
              <S.FormLabel>ISO 코드</S.FormLabel>
              <FormInput
                className="input-xs"
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
              {errors.isoCode && (
                <S.ErrorMessage>{errors.isoCode.message}</S.ErrorMessage>
              )}
            </S.FormField>

            <S.FormField>
              <S.FormLabel>국기</S.FormLabel>
              <FormInput
                className="input-xs"
                {...register('flagEmoji', {
                  onChange: () => {
                    flagEmojiTouchedRef.current = true
                  },
                })}
                placeholder="🇰🇷"
                $error={!!errors.flagEmoji}
              />
              {!flagEmojiTouchedRef.current && watch('flagEmoji') && (
                <S.FormHelp>
                  <InferredBadge>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                        fill="currentColor"
                      />
                    </svg>
                    자동
                  </InferredBadge>
                </S.FormHelp>
              )}
              {errors.flagEmoji && (
                <S.ErrorMessage>{errors.flagEmoji.message}</S.ErrorMessage>
              )}
            </S.FormField>
          </S.FormRow>

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

          {/* 대륙 — 옵션 5~8개라 인라인 dropdown이 모달보다 가벼움 */}
          <S.FormField>
            <S.FormLabel htmlFor="continentId">
              대륙 <S.RequiredStar>*</S.RequiredStar>
            </S.FormLabel>
            <FormSelectNative
              id="continentId"
              {...register('continentId')}
              className="input-continent"
              aria-label="대륙"
              aria-required="true"
              aria-invalid={!!errors.continentId}
              $error={!!errors.continentId}
            >
              <option value="">대륙 선택</option>
              {continents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </FormSelectNative>
            {errors.continentId && (
              <S.ErrorMessage>{errors.continentId.message}</S.ErrorMessage>
            )}
          </S.FormField>

        </S.FormSection>

        {/* ───── 통계 정보 ───── */}
        <S.FormSection data-form-section="stats">
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
                const parsed = parseNumberWithCommas(e.target.value)
                setPopulationDisplay(
                  parsed === undefined ? '' : formatNumberWithCommas(parsed),
                )
                setValue('population', parsed as number | undefined, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }}
              placeholder="51,700,000"
              $error={!!errors.population}
            />
            {watch('population') != null && watch('population')! > 0 && (
              <S.FormHelp>
                <KoreanShortHint>
                  {formatKoreanShort(watch('population') as number)}
                </KoreanShortHint>
              </S.FormHelp>
            )}
            {errors.population && (
              <S.ErrorMessage>{errors.population.message}</S.ErrorMessage>
            )}
          </S.FormField>

          <S.FormField>
            <S.FormLabel>면적</S.FormLabel>
            <NumberWithSuffix>
              <FormInput
                className="input-number"
                type="text"
                inputMode="numeric"
                value={areaDisplay}
                onChange={(e) => {
                  const parsed = parseNumberWithCommas(e.target.value)
                  setAreaDisplay(
                    parsed === undefined
                      ? ''
                      : formatNumberWithCommas(parsed),
                  )
                  setValue('areaSqKm', parsed as number | undefined, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }}
                placeholder="100,363"
                $error={!!errors.areaSqKm}
              />
              <NumberSuffix>km²</NumberSuffix>
            </NumberWithSuffix>
            {errors.areaSqKm && (
              <S.ErrorMessage>{errors.areaSqKm.message}</S.ErrorMessage>
            )}
          </S.FormField>
        </S.FormSection>

        {/* ───── 부가 정보 ───── */}
        <S.FormSection data-form-section="extra">
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
            {!currenciesLoading && currencies.length === 0 && (
              <EmptyHint
                icon={<FiDollarSign size={14} />}
                message="등록된 화폐가 없습니다"
                actionLabel="화폐 관리"
                actionHref="/currencies"
              />
            )}
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
            {!languagesLoading && languages.length === 0 && (
              <EmptyHint
                icon={<FiGlobe size={14} />}
                message="등록된 언어가 없습니다"
                actionLabel="언어 관리"
                actionHref="/languages"
              />
            )}
            {errors.languageId && (
              <S.ErrorMessage>{errors.languageId.message}</S.ErrorMessage>
            )}
          </S.FormField>
        </S.FormSection>

        {/* ───── 표시 설정 ───── */}
        <S.FormSection data-form-section="display">
          <S.FormSectionHeader>
            <div>
              <S.FormSectionTitle>표시 설정</S.FormSectionTitle>
              <S.FormSectionDescription>
                이 국가 인물·국호의 표시 방식 (선택)
              </S.FormSectionDescription>
            </div>
          </S.FormSectionHeader>

          <S.FormField>
            <S.FormLabel>인물 이름 표기 순서</S.FormLabel>
            <FormSelectNative
              {...register('defaultNameDisplayOrder', {
                onChange: () => {
                  nameOrderTouchedRef.current = true
                  setLastInferredFromIso(null)
                },
              })}
              className="input-name-order"
              aria-label="인물 이름 표기 순서 기본값"
            >
              <option value="korean">동양식 (성 → 이름)</option>
              <option value="western">서양식 (이름 → 성)</option>
            </FormSelectNative>
            <S.FormHelp>
              {lastInferredFromIso &&
              !nameOrderTouchedRef.current &&
              lastInferredFromIso === watchedNameOrder ? (
                <InferredBadge>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                      fill="currentColor"
                    />
                  </svg>
                  ISO 코드({(watchedIsoCode || '').toUpperCase()})에서 자동
                  설정됨
                </InferredBadge>
              ) : (
                '이 국가 인물을 한 줄로 표시할 때의 기본 순서'
              )}
            </S.FormHelp>
          </S.FormField>
        </S.FormSection>
      </S.Form>

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
