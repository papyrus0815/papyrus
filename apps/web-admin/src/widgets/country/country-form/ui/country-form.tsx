import React, { useEffect, useState } from 'react'

import { useForm } from 'react-hook-form'
import { FiBarChart2, FiInfo, FiPlusCircle } from 'react-icons/fi'
import styled from 'styled-components'

import {
  type ContinentOption,
  type Country,
  type CountryFormData,
} from '@/entities/country/api'
import { countrySchema } from '@/entities/country/model/schema'
import { uploadImage } from '@/shared/api/upload'
import { FormInput } from '@/shared/ui/form-input/form-input'
import { FormSidePanel } from '@/shared/ui/form-side-panel/form-side-panel'
import {
  FormHeader,
  FormSectionInner,
  SubmitButton,
  TabButton,
  TabNavigation,
} from '@/shared/ui/register-form-layout'
import {
  SelectModal,
  SelectOption,
} from '@/shared/ui/select-modal/select-modal'
import { zodResolver } from '@hookform/resolvers/zod'

import * as S from './country-form.styles'

/** 모달: 역사적 국가 폼과 동일 디자인 — 섹션/필드 그리드·간격·보더 */
const CountryFormModalLayout = styled.div`
  ${FormHeader} {
    padding: 12px 28px 8px;
    border-bottom: none;
  }
  ${FormSectionInner} {
    padding-top: 16px;
  }
  ${TabNavigation} {
    margin-bottom: 24px;
  }
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
    grid-template-columns: 360px 1fr;
    gap: 24px;
    align-items: start;
    padding: 20px 0;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  }
  @media (max-width: 768px) {
    ${S.FormField} {
      grid-template-columns: 1fr;
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
  ${S.FormField}[style*='marginBottom'] {
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 24px;
    align-items: start;
  }
  /* 모달: 대표 이미지 — 역사적 국가와 동일(원형 96px + 안내 문구) */
  ${S.FormField}[data-field='thumbnail'] {
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 24px;
    align-items: start;
    padding: 20px 0;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
    min-width: 0;
  }
  ${S.FormField}[data-field='thumbnail'] ${S.FormLabel} {
    padding-top: 8px;
    grid-column: 1;
    grid-row: 1;
  }
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
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.1)'
        : 'linear-gradient(145deg, #eef2ff 0%, #e0e7ff 100%)'};
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
  }
  ${S.FormField}[data-field='thumbnail'] .thumbnail-circle[data-has-image] {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#fff'};
    border-color: ${({ theme }) => theme.colors.border.default};
    border-style: solid;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }
  ${S.FormField}[data-field='thumbnail'] .thumbnail-circle[data-has-image]:hover {
    border-color: #6366f1;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.12);
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
  ${S.FormField}[data-field='thumbnail'] ${S.ErrorMessage} {
    grid-column: 2;
    width: 100%;
  }
  @media (max-width: 768px) {
    ${S.FormField}[data-field='thumbnail'] {
      grid-template-columns: 1fr;
    }
    ${S.FormField}[data-field='thumbnail'] .thumbnail-right {
      grid-column: unset;
    }
  }
  /* 입력 필드 성격별 너비 — 들어갈 데이터 길이·인물 등록 모달 비율 고려 */
  ${S.FormField} .input-iso {
    max-width: 100px;
  } /* ISO 3166-1 alpha-2 (2~3자) */
  ${S.FormField} .input-flag-emoji {
    max-width: 96px;
  } /* 이모지 1~2자 */
  ${S.FormField} .input-name,
  ${S.FormField} .input-local-name {
    max-width: 480px;
  } /* 국가명·로컬명 (인물 원어 480px 수준) */
  ${S.FormField} .input-capital {
    max-width: 280px;
  } /* 수도명 */
  ${S.FormField} .input-number {
    max-width: 220px;
  } /* 인구·면적·GDP (큰 숫자) */
  ${S.FormField} .input-currency,
  ${S.FormField} .input-language {
    max-width: 180px;
  } /* 화폐·언어 코드 */
  ${S.SelectButton} {
    padding: 10px 14px;
    font-size: 14px;
    max-width: 380px;
  }
`

/**
 * 국가 폼 Props 인터페이스
 */
interface CountryFormProps {
  /** 수정할 국가 정보 (null이면 신규 등록) */
  editing: Country | null
  /** 대륙 옵션 목록 */
  continents: ContinentOption[]
  /** 폼 닫기 핸들러 */
  onClose: () => void
  /** 저장 핸들러 */
  onSave: (data: Omit<Country, 'id'> & { id?: string }) => Promise<void>
  /** 'panel' = 우측 사이드바(기본), 'modal' = 모달 래퍼용 */
  embedIn?: 'panel' | 'modal'
}

/**
 * 국가 Form 컴포넌트
 * - 국가 생성 및 수정 기능 제공
 * - React Hook Form + Zod 유효성 검증
 * - 파일 업로드 (국기, 썸네일)
 */
export function CountryForm({
  editing,
  continents,
  onClose,
  onSave,
  embedIn = 'panel',
}: CountryFormProps) {
  // ==================== 상태 관리 ====================

  /** 썸네일 이미지 미리보기 URL */
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('')

  /** 업로드할 국기 이미지 파일 */
  const [flagImageFile, setFlagImageFile] = useState<File | null>(null)

  /** 업로드할 썸네일 파일 */
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)

  /** 국기/썸네일 업로드 중 */
  const [imageUploading, setImageUploading] = useState(false)
  const [imageUploadError, setImageUploadError] = useState<string | null>(null)

  /** 대륙 선택 모달 표시 여부 */
  const [showContinentModal, setShowContinentModal] = useState(false)

  /** 모달일 때 탭 (기본 정보 / 통계 / 추가) */
  const [modalTab, setModalTab] = useState<'basic' | 'stats' | 'extra'>('basic')

  // ==================== Form Hook 설정 ====================

  /**
   * React Hook Form 설정
   * - Zod 스키마로 유효성 검증
   * - 모든 이벤트에서 실시간 검증 (onChange, onBlur)
   */
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(countrySchema),
    mode: 'all', // 모든 이벤트에서 검증
    reValidateMode: 'onChange', // 재검증도 onChange
    criteriaMode: 'all', // 모든 에러 표시
  })

  /** 선택된 대륙 ID */
  const selectedContinentId = watch('continentId')

  // ==================== useEffect 훅 ====================

  /**
   * editing 객체가 변경될 때마다 form 초기화
   * - 수정 모드: 기존 데이터로 폼 채우기
   * - 생성 모드 (editing.id가 없음): 빈 값으로 초기화
   * - 숫자 필드는 undefined로 초기화하여 빈 값 처리
   */
  useEffect(() => {
    if (editing) {
      // 수정 모드: 기존 데이터로 폼 채우기
      if (editing.id) {
        reset({
          name: editing.name || '',
          fullName: (editing as any).fullName || '',
          localName: editing.localName || '',
          isoCode: editing.isoCode || '',
          flagEmoji: editing.flagEmoji || '',
          capital: editing.capital || '',
          continentId: editing.continentId || '',
          population: editing.population,
          areaSqKm: editing.areaSqKm,
          gdpUsdBn: editing.gdpUsdBn,
          thumbnailUrl: editing.thumbnailUrl || '',
          currencyId: editing.currencyId || '',
          languageId: editing.languageId || '',
        })
        setThumbnailPreview(editing.thumbnailUrl || '')
      } else {
        // 생성 모드: 완전히 빈 값으로 초기화
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
          gdpUsdBn: undefined,
          thumbnailUrl: '',
          currencyId: '',
          languageId: '',
        })
        setThumbnailPreview('')
      }
      setFlagImageFile(null)
      setThumbnailFile(null)
    }
  }, [editing, reset])

  /** 썸네일 URL 필드 값 감시 */
  const thumbnailUrl = watch('thumbnailUrl')

  /**
   * 썸네일 URL 변경 시 미리보기 업데이트
   * - URL 입력 시 실시간으로 미리보기 반영
   */
  useEffect(() => {
    if (thumbnailUrl) {
      setThumbnailPreview(thumbnailUrl)
    } else {
      setThumbnailPreview('')
    }
  }, [thumbnailUrl])

  // ==================== 이벤트 핸들러 ====================

  /**
   * 국기/썸네일 이미지 업로드 핸들러
   * - 서버에 업로드 후 thumbnailUrl에만 저장 (국기 = 썸네일, 255자 제한)
   */
  const handleFlagImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFlagImageFile(file)
    setImageUploadError(null)
    setImageUploading(true)
    try {
      const result = await uploadImage(file, 'countries')
      const url =
        (result.url ?? '').length > 255
          ? (result.url ?? '').slice(0, 255)
          : (result.url ?? '')
      setValue('thumbnailUrl', url, { shouldValidate: true })
      setThumbnailPreview(result.url ?? '')
    } catch (err) {
      setImageUploadError((err as Error).message)
      setThumbnailPreview('')
      setValue('thumbnailUrl', '')
    } finally {
      setImageUploading(false)
    }
  }

  /**
   * 썸네일 파일 업로드 핸들러
   * - 파일을 Base64로 변환하여 미리보기 및 폼에 저장
   * - FileReader API 사용
   */
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setThumbnailFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setThumbnailPreview(result)
        setValue('thumbnailUrl', result, { shouldValidate: true })
      }
      reader.readAsDataURL(file)
    }
  }

  /**
   * 폼 제출 핸들러
   * - 데이터를 API 형식에 맞게 변환
   * - 수정 모드인 경우 id 포함
   */
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
      // 이미지 삭제 시 빈 문자열을 명시해 DB에서도 제거되도록 함 (undefined면 요청에서 빠져 갱신 안 됨)
      thumbnailUrl: data.thumbnailUrl ?? '',
      currencyId: data.currencyId,
      languageId: data.languageId,
      continentId: data.continentId,
      gdpUsdBn: data.gdpUsdBn,
    })
  }

  /**
   * 국가 이미지(썸네일) 삭제
   * - 미리보기·폼 값·선택된 파일 초기화
   */
  const handleDeleteImage = () => {
    setThumbnailPreview('')
    setValue('thumbnailUrl', '', { shouldValidate: true })
    setFlagImageFile(null)
    setThumbnailFile(null)
    setImageUploadError(null)
    const input = document.getElementById(
      'flag-image-upload',
    ) as HTMLInputElement | null
    if (input) input.value = ''
  }

  /**
   * 대륙 선택 핸들러
   * - 모달에서 대륙을 선택하면 폼에 반영
   */
  const handleContinentSelect = (continentId: string) => {
    setValue('continentId', continentId, { shouldValidate: true })
    setShowContinentModal(false)
  }

  /**
   * 선택된 대륙 이름 가져오기
   * - 모달 버튼에 표시할 텍스트
   */
  const getContinentLabel = () => {
    if (!selectedContinentId) return '대륙 선택'
    const continent = continents.find(
      (continent) => continent.id === selectedContinentId,
    )
    return continent ? continent.name : '대륙 선택'
  }

  /**
   * 대륙 옵션을 SelectModal 형식으로 변환
   */
  const continentOptions: SelectOption[] = continents.map((continent) => ({
    value: continent.id,
    label: continent.name,
    icon: '🌍',
  }))

  // ==================== 조기 반환 ====================

  /** editing이 null이면 렌더링하지 않음 */
  if (!editing) return null

  // ==================== JSX 렌더링 ====================

  const submitLabel = isSubmitting
    ? '처리 중...'
    : editing.id
      ? '수정 완료'
      : '국가 등록'

  const formBody = (
    <S.Form id="country-form" onSubmit={handleSubmit(onSubmit)}>
      {embedIn === 'modal' && (
        <TabNavigation>
          <TabButton
            type="button"
            $active={modalTab === 'basic'}
            onClick={() => setModalTab('basic')}
          >
            <FiInfo size={16} />
            기본 정보
          </TabButton>
          <TabButton
            type="button"
            $active={modalTab === 'stats'}
            onClick={() => setModalTab('stats')}
          >
            <FiBarChart2 size={16} />
            통계 정보
          </TabButton>
          <TabButton
            type="button"
            $active={modalTab === 'extra'}
            onClick={() => setModalTab('extra')}
          >
            <FiPlusCircle size={16} />
            추가 정보
          </TabButton>
        </TabNavigation>
      )}

      {(embedIn !== 'modal' || modalTab === 'basic') && (
        <S.FormSection>
          <S.FormSectionHeader>
            <S.FormSectionIcon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
                  fill="currentColor"
                />
              </svg>
            </S.FormSectionIcon>
            <div>
              <S.FormSectionTitle>기본 정보</S.FormSectionTitle>
              <S.FormSectionDescription>
                국가의 이름, 위치, 식별 정보를 입력하세요
              </S.FormSectionDescription>
            </div>
          </S.FormSectionHeader>

          {/* 국가 이미지 — 모달에서는 역사적 국가와 동일한 대표 이미지(원형) 디자인 */}
          <S.FormField
            data-field={embedIn === 'modal' ? 'thumbnail' : undefined}
            style={{ marginBottom: embedIn === 'modal' ? undefined : '16px' }}
          >
            <S.FormLabel htmlFor="flag-image-upload">
              {embedIn === 'modal' ? '대표 이미지' : '국기 이미지 (썸네일)'}
            </S.FormLabel>
            {embedIn === 'modal' ? (
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
                </div>
                <span className="thumbnail-hint">
                  {thumbnailPreview
                    ? '클릭하면 이미지를 변경할 수 있습니다'
                    : '클릭하여 국기·상징 이미지를 넣어주세요 (선택)'}
                </span>
                <S.FileInput
                  id="flag-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFlagImageChange}
                  disabled={imageUploading}
                />
              </div>
            ) : (
              <div>
                {thumbnailPreview && (
                  <S.FlagImagePreview
                    style={{
                      maxWidth: '100%',
                      overflow: 'hidden',
                      marginBottom: '12px',
                    }}
                  >
                    <S.FlagImage
                      src={thumbnailPreview}
                      alt="국기 미리보기"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleDeleteImage}
                      style={{
                        marginTop: '8px',
                        padding: '6px 12px',
                        fontSize: '13px',
                        color: '#dc2626',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      이미지 삭제
                    </button>
                  </S.FlagImagePreview>
                )}
                <S.FileUploadWrapper>
                  <S.FileUploadLabel htmlFor="flag-image-upload">
                    <S.FileUploadIcon>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
                          fill="currentColor"
                        />
                      </svg>
                    </S.FileUploadIcon>
                    <S.FileUploadText>
                      {imageUploading
                        ? '업로드 중...'
                        : flagImageFile
                          ? flagImageFile.name
                          : '이미지 파일 선택'}
                    </S.FileUploadText>
                  </S.FileUploadLabel>
                  <S.FileInput
                    id="flag-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFlagImageChange}
                    disabled={imageUploading}
                  />
                </S.FileUploadWrapper>
              </div>
            )}
            {imageUploadError && (
              <S.ErrorMessage style={{ marginTop: '8px' }}>
                {imageUploadError}
              </S.ErrorMessage>
            )}
          </S.FormField>

          <S.FormRow>
            <S.FormField>
              <S.FormLabel>
                국가명 <S.RequiredStar>*</S.RequiredStar>
              </S.FormLabel>
              <FormInput
                className="input-name"
                {...register('name')}
                placeholder="대한민국"
                $error={!!errors.name}
              />
              {errors.name && (
                <S.ErrorMessage>{errors.name.message}</S.ErrorMessage>
              )}
            </S.FormField>
            <S.FormField>
              <S.FormLabel>로컬명</S.FormLabel>
              <FormInput
                className="input-local-name"
                {...register('localName')}
                placeholder="Korea"
                $error={!!errors.localName}
              />
              {errors.localName && (
                <S.ErrorMessage>{errors.localName.message}</S.ErrorMessage>
              )}
            </S.FormField>
          </S.FormRow>
          <S.FormField>
            <S.FormLabel>공식 명칭 (풀네임)</S.FormLabel>
            <FormInput
              {...register('fullName')}
              placeholder="예: 대한민국, 일본국, Republic of Korea"
              $error={!!errors.fullName}
            />
            {errors.fullName && (
              <S.ErrorMessage>{errors.fullName.message}</S.ErrorMessage>
            )}
          </S.FormField>
          <S.FormRow>
            <S.FormField>
              <S.FormLabel>ISO 코드</S.FormLabel>
              <FormInput
                className="input-iso"
                {...register('isoCode')}
                placeholder="KR"
                maxLength={3}
                style={{ textTransform: 'uppercase' }}
                $error={!!errors.isoCode}
              />
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
          </S.FormRow>
          <S.FormRow>
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
              <input type="hidden" {...register('continentId')} />
              {errors.continentId && (
                <S.ErrorMessage>{errors.continentId.message}</S.ErrorMessage>
              )}
            </S.FormField>
          </S.FormRow>
        </S.FormSection>
      )}

      {(embedIn !== 'modal' || modalTab === 'stats') && (
        <S.FormSection>
          <S.FormSectionHeader>
            <S.FormSectionIcon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"
                  fill="currentColor"
                />
              </svg>
            </S.FormSectionIcon>
            <div>
              <S.FormSectionTitle>통계 정보</S.FormSectionTitle>
              <S.FormSectionDescription>
                인구, 면적, GDP 등 국가 통계 데이터를 입력하세요
              </S.FormSectionDescription>
            </div>
          </S.FormSectionHeader>
          <S.FormRow>
            <S.FormField>
              <S.FormLabel>인구</S.FormLabel>
              <FormInput
                className="input-number"
                {...register('population', { valueAsNumber: true })}
                type="number"
                placeholder="51700000"
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
          </S.FormRow>
          <S.FormRow>
            <S.FormField>
              <S.FormLabel>GDP (USD Billion)</S.FormLabel>
              <FormInput
                className="input-number"
                {...register('gdpUsdBn', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="1630.5"
                $error={!!errors.gdpUsdBn}
              />
              {errors.gdpUsdBn && (
                <S.ErrorMessage>{errors.gdpUsdBn.message}</S.ErrorMessage>
              )}
            </S.FormField>
          </S.FormRow>
        </S.FormSection>
      )}

      {(embedIn !== 'modal' || modalTab === 'extra') && (
        <S.FormSection>
          <S.FormSectionHeader>
            <S.FormSectionIcon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                  fill="currentColor"
                />
              </svg>
            </S.FormSectionIcon>
            <div>
              <S.FormSectionTitle>추가 정보</S.FormSectionTitle>
              <S.FormSectionDescription>
                화폐, 언어 등 부가적인 정보를 입력하세요 (선택)
              </S.FormSectionDescription>
            </div>
          </S.FormSectionHeader>
          <S.FormRow>
            <S.FormField>
              <S.FormLabel>화폐 ID</S.FormLabel>
              <FormInput
                className="input-currency"
                {...register('currencyId')}
                placeholder="KRW"
                maxLength={10}
                $error={!!errors.currencyId}
              />
              {errors.currencyId && (
                <S.ErrorMessage>{errors.currencyId.message}</S.ErrorMessage>
              )}
            </S.FormField>
            <S.FormField>
              <S.FormLabel>언어 ID</S.FormLabel>
              <FormInput
                className="input-language"
                {...register('languageId')}
                placeholder="ko"
                maxLength={10}
                $error={!!errors.languageId}
              />
              {errors.languageId && (
                <S.ErrorMessage>{errors.languageId.message}</S.ErrorMessage>
              )}
            </S.FormField>
          </S.FormRow>
        </S.FormSection>
      )}
    </S.Form>
  )

  const continentSelectModal = (
    <SelectModal
      isOpen={showContinentModal}
      onClose={() => setShowContinentModal(false)}
      title="대륙 선택"
      options={continentOptions}
      selectedValue={selectedContinentId}
      onSelect={handleContinentSelect}
    />
  )

  if (embedIn === 'modal') {
    return (
      <CountryFormModalLayout>
        <FormHeader style={{ justifyContent: 'flex-end' }}>
          <SubmitButton
            type="submit"
            form="country-form"
            disabled={!isValid || isSubmitting}
          >
            {submitLabel}
          </SubmitButton>
        </FormHeader>
        <FormSectionInner>{formBody}</FormSectionInner>
        {continentSelectModal}
      </CountryFormModalLayout>
    )
  }

  return (
    <FormSidePanel
      isOpen={!!editing}
      title={editing.id ? '국가 수정' : '국가 등록'}
      onClose={onClose}
      submitLabel={submitLabel}
      formId="country-form"
      submitDisabled={!isValid || isSubmitting}
      headerExtra={
        <S.RequiredFieldsNotice>
          <S.RequiredFieldsIcon>⚠️</S.RequiredFieldsIcon>
          <S.RequiredFieldsText>
            <S.RequiredFieldsTitle>필수 항목:</S.RequiredFieldsTitle>
            <S.RequiredFieldsList>
              <S.RequiredFieldItem $completed={!!watch('name')}>
                국가명
              </S.RequiredFieldItem>
              ,{' '}
              <S.RequiredFieldItem $completed={!!watch('continentId')}>
                대륙
              </S.RequiredFieldItem>
            </S.RequiredFieldsList>
          </S.RequiredFieldsText>
        </S.RequiredFieldsNotice>
      }
    >
      {formBody}
      {continentSelectModal}
    </FormSidePanel>
  )
}
