/**
 * 인물 등록 뷰 (화면 전환용)
 * - 역대 수반 기본정보/업적 폼과 동일한 공용 레이아웃 사용 (@/shared/ui/register-form-layout)
 * - 인물 등록 페이지와 동일한 폼 기능 (필드·검증·payload)
 */
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { toast } from 'react-hot-toast'
import {
  FiArrowLeft,
  FiCalendar,
  FiChevronDown,
  FiGlobe,
  FiInfo,
  FiTrash2,
  FiUsers,
} from 'react-icons/fi'
import styled from 'styled-components'

import { getAllCountries } from '@/shared/api/countries'
import type { CountryResponseDto } from '@/shared/api/countries'
import { dynastyApi } from '@/shared/api/dynasty'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import {
  type CreatePersonDto as CreatePersonInput,
  type Era,
  createPerson,
  updatePerson,
} from '@/shared/api/persons'
import { type PersonResponseDto, getAllPersons } from '@/shared/api/persons'
import { getPersonDetailById } from '@/shared/api/persons-detail'
import { getAllReligions } from '@/shared/api/religions'
import {
  getUploadImageUrl,
  uploadImage,
  validateImageFile,
} from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { CountrySelectModal } from '@/shared/ui/country-select-modal/country-select-modal'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { FormInput } from '@/shared/ui/form-input/form-input'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import {
  PlaceSelect as PlaceAutocomplete,
  type PlaceResult,
} from '@/shared/ui/place-autocomplete/place-autocomplete'
import {
  BackButton,
  DateFieldBtn,
  DateFieldsRow,
  FOCUS_COLOR,
  FieldControl,
  FieldLabel,
  FieldRow,
  FormCardWrapper,
  FormHeader,
  FormRows,
  FormSectionInner,
  Required,
  SubmitButton,
  TabButton,
  TabNavigation,
  Textarea,
} from '@/shared/ui/register-form-layout/register-form-layout.styles'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import {
  SelectModal,
  type SelectOption,
} from '@/shared/ui/select-modal/select-modal'

/** 썸네일 행 — FieldRow와 동일 그리드(360px 1fr), 라벨·썸네일 간격 확보 */
const ThumbnailWrap = styled.div`
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 32px;
  align-items: start;
  padding: 20px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`

const ThumbnailPreview = styled.label<{ $hasImage?: boolean }>`
  width: 88px;
  height: 88px;
  border-radius: 50%;
  overflow: hidden;
  background: ${(p) =>
    p.$hasImage
      ? 'transparent'
      : p.theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(226, 232, 240, 0.6)'};
  border: 2px dashed
    ${(p) => (p.$hasImage ? 'transparent' : 'rgba(99, 102, 241, 0.35)')};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s;
  &:hover {
    border-color: rgba(99, 102, 241, 0.6);
    background: ${(p) =>
      p.$hasImage
        ? 'transparent'
        : p.theme.mode === 'dark'
          ? 'rgba(99,102,241,0.1)'
          : 'rgba(226, 232, 240, 0.9)'};
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  svg {
    color: ${({ theme }) => theme.colors.text.secondary};
    width: 32px;
    height: 32px;
  }
`

const ThumbnailUploadInput = styled.input`
  display: none;
`

const OriginalNameInputWrap = styled.div`
  max-width: 480px;
  width: 100%;
`

const FieldRowMulti = styled.div`
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 24px;
  align-items: start;
  padding: 20px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const InlineFields = styled.div<{ $cols?: number }>`
  display: grid;
  grid-template-columns: ${(p) => `repeat(${p.$cols ?? 3}, 1fr)`};
  gap: 12px;
  max-width: ${(p) => (p.$cols === 2 ? '400px' : '560px')};

  & > div {
    min-width: 0;
  }
  input,
  select,
  button {
    max-width: 100%;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const InlineFields2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  max-width: 400px;
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const SelectBtn = styled.button<{ $hasValue?: boolean; $error?: boolean }>`
  width: 100%;
  max-width: 380px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  font-size: 14px;
  color: ${({ $hasValue, theme }) =>
    $hasValue ? theme.colors.text.primary : theme.colors.text.tertiary};
  background: ${({ $error, theme }) =>
    $error
      ? theme.mode === 'dark'
        ? 'rgba(234,67,53,0.15)'
        : '#fef2f2'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : '#fff'};
  border: 1px solid
    ${({ $error, theme }) =>
      $error ? '#ea4335' : theme.colors.border.default};
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  outline: none;
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
  &:focus-visible {
    border-color: ${FOCUS_COLOR};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  span {
    flex: 1;
  }
`

const PlaceAutocompleteWrap = styled.div`
  max-width: 480px;
  width: 100%;
`

/** 모달용: 컨트롤 열·입력 그룹을 넓혀 가로 여백을 줄임 */
const PersonFormLayoutWrap = styled.div`
  ${FieldControl} {
    max-width: 520px;
  }
  ${DateFieldsRow} {
    max-width: 520px;
  }
  ${DateFieldBtn} {
    max-width: 100%;
  }
  ${InlineFields} {
    max-width: 600px;
  }
  ${InlineFields2} {
    max-width: 480px;
  }
  ${OriginalNameInputWrap} {
    max-width: 520px;
  }
  ${SelectBtn} {
    max-width: 440px;
  }
  [data-bio-editor-wrap] ${FieldControl} {
    max-width: 720px;
  }
`

const CheckboxRowTwo = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 14px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-wrap: wrap;
  input {
    width: 18px;
    height: 18px;
    accent-color: ${FOCUS_COLOR};
    cursor: pointer;
  }
  label {
    font-size: 14px;
    color: ${({ theme }) => theme.colors.text.primary};
    cursor: pointer;
  }
`

const InlineCheckboxLabel = styled.label<{ $disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: ${({ $disabled }) => ($disabled ? 0.4 : 1)};
  pointer-events: ${({ $disabled }) => ($disabled ? 'none' : 'auto')};
`

const ThumbnailRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
`

const ThumbnailHint = styled.span`
  font-size: 12px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#94a3b8' : '#64748b'};
  max-width: 220px;
  line-height: 1.45;
`

const ThumbnailRemoveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 12px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f87171' : '#b91c1c')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(248,113,113,0.12)' : '#fef2f2'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(248,113,113,0.35)' : '#fecaca'};
  border-radius: 8px;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const SpouseNoteTextarea = styled(Textarea)`
  max-width: 440px;
`

const ErrorText = styled.span`
  font-size: 12px;
  color: #dc2626;
  margin-top: 8px;
  display: block;
`

const FieldError = styled.span`
  display: block;
  font-size: 12px;
  color: #dc2626;
  margin-top: 6px;
  line-height: 1.4;
`

const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.6)'};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  backdrop-filter: blur(2px);
  border-radius: 12px;
`

const LoadingHost = styled.div`
  position: relative;
`

const GENDER_OPTIONS: SelectOption<string>[] = [
  { value: '', label: '선택' },
  { value: 'MALE', label: '남성' },
  { value: 'FEMALE', label: '여성' },
]

const DEATH_TYPE_OPTIONS: SelectOption<string>[] = [
  { value: '', label: '선택 안 함' },
  { value: 'NATURAL', label: '자연사' },
  { value: 'ILLNESS', label: '병사' },
  { value: 'ASSASSINATION', label: '암살' },
  { value: 'EXECUTION', label: '처형' },
  { value: 'BATTLE', label: '전사' },
  { value: 'ACCIDENT', label: '사고사' },
  { value: 'SUICIDE', label: '자살' },
  { value: 'UNKNOWN', label: '불명' },
  { value: 'OTHER', label: '기타' },
]
export interface PersonRegisterViewProps {
  initialCountryId?: string | null
  onCancel: () => void
  onSuccess?: (personId: string) => void
  /** false면 FormCardWrapper 없이 헤더+폼만 렌더 (외부에서 수반 등록 폼처럼 카드로 감쌀 때 사용) */
  embedInCard?: boolean
  /** 있으면 수정 모드: 해당 인물 로드 후 폼에 채우고 저장 시 update 호출 */
  editPersonId?: string | null
  /** 제출 중 상태 변경 시 부모에게 알림 (외부 하단 버튼 disabled 처리용) */
  onSubmittingChange?: (v: boolean) => void
  /** 폼에 미저장 변경이 있는지 부모에게 알림 (닫기 시 경고용) */
  onDirtyChange?: (dirty: boolean) => void
}

export function PersonRegisterView({
  initialCountryId,
  onCancel,
  onSuccess,
  embedInCard = true,
  editPersonId,
  onSubmittingChange,
  onDirtyChange,
}: PersonRegisterViewProps) {
  const isEditMode = Boolean(editPersonId)
  // 기본 정보
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [nameFormat, setNameFormat] = useState<'korean' | 'western'>('korean')
  const [originalName, setOriginalName] = useState('')
  const [surnameMeaning, setSurnameMeaning] = useState('')
  const [nameMeaning, setNameMeaning] = useState('')
  const [middleNameMeaning, setMiddleNameMeaning] = useState('')
  const [gender, setGender] = useState('')
  // 생몰
  const [isBirthDateUnknown, setIsBirthDateUnknown] = useState(false)
  const [birthEra, setBirthEra] = useState<Era>('AD')
  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [isDeathDateUnknown, setIsDeathDateUnknown] = useState(false)
  const [isAlive, setIsAlive] = useState(false)
  const [deathEra, setDeathEra] = useState<Era>('AD')
  const [deathType, setDeathType] = useState<string>('')
  const [deathCause, setDeathCause] = useState<string>('')
  const [deathNote, setDeathNote] = useState<string>('')
  const [deathYear, setDeathYear] = useState('')
  const [deathMonth, setDeathMonth] = useState('')
  const [deathDay, setDeathDay] = useState('')
  // 소속
  const [countryId, setCountryId] = useState<string>(initialCountryId ?? '')
  const [countryName, setCountryName] = useState<string>('')
  const [birthCityId, setBirthCityId] = useState('')
  const [deathCityId, setDeathCityId] = useState('')
  const [birthPlace, setBirthPlace] = useState<PlaceResult | null>(null)
  const [deathPlace, setDeathPlace] = useState<PlaceResult | null>(null)
  const [dynastyId, setDynastyId] = useState('')
  const [religionId, setReligionId] = useState('')
  // 가족
  const [fatherId, setFatherId] = useState('')
  const [motherId, setMotherId] = useState('')
  const [spouseId, setSpouseId] = useState('')
  const [spouseNote, setSpouseNote] = useState('')
  // 기타
  const [biography, setBiography] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [regnalName, setRegnalName] = useState('')
  const [templeName, setTempleName] = useState('')
  const [posthumousName, setPosthumousName] = useState('')

  const [showDeathTypeModal, setShowDeathTypeModal] = useState(false)
  const [showCountryModal, setShowCountryModal] = useState(false)
  const [showGenderModal, setShowGenderModal] = useState(false)
  const [showBirthDateModal, setShowBirthDateModal] = useState(false)
  const [showDeathDateModal, setShowDeathDateModal] = useState(false)
  const [showDynastyModal, setShowDynastyModal] = useState(false)
  const [showReligionModal, setShowReligionModal] = useState(false)
  const [showFatherModal, setShowFatherModal] = useState(false)
  const [showMotherModal, setShowMotherModal] = useState(false)
  const [showSpouseModal, setShowSpouseModal] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'basic' | 'affiliation' | 'family'
  >('basic')
  /** 썸네일 파일은 등록·저장 시에만 업로드. 미리보기용 blob URL */
  const [pendingThumbnailFile, setPendingThumbnailFile] = useState<File | null>(
    null,
  )
  const [thumbnailObjectUrl, setThumbnailObjectUrl] = useState<string | null>(
    null,
  )
  /** 수정 시 서버에 있던 썸네일을 저장 시 제거 */
  const [thumbnailMarkedForRemoval, setThumbnailMarkedForRemoval] =
    useState(false)
  /** 제출 중 이미지 업로드 단계(버튼 문구용) */
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  /** 필드별 에러 맵 — 필드 아래에 inline 표시 */
  const [errors, setErrors] = useState<Record<string, string>>({})
  /** 편집 모드에서 서버 데이터 로딩 중 여부 */
  const [isLoadingEdit, setIsLoadingEdit] = useState(false)
  /** 사용자 입력으로 폼이 변경되었는지 */
  const [isDirty, setIsDirty] = useState(false)
  /** 초기 로드/리셋 중일 때는 dirty 추적 억제 */
  const trackDirtyRef = useRef(false)
  const uidPrefix = useId()
  const fid = useCallback((k: string) => `${uidPrefix}-${k}`, [uidPrefix])

  const markDirty = useCallback(() => {
    if (trackDirtyRef.current) setIsDirty(true)
  }, [])

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const [modernCountries, setModernCountries] = useState<CountryResponseDto[]>(
    [],
  )
  const [historicalCountries, setHistoricalCountries] = useState<
    HistoricalCountryResponseDto[]
  >([])
  const [dynasties, setDynasties] = useState<
    Array<{ id: string; name: string }>
  >([])
  const [religions, setReligions] = useState<
    Array<{ id: string; name: string }>
  >([])
  const [persons, setPersons] = useState<PersonResponseDto[]>([])

  const dynastyOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: '', label: '선택 안 함' },
      ...dynasties.map((d) => ({ value: d.id, label: d.name })),
    ],
    [dynasties],
  )
  const religionOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: '', label: '선택 안 함' },
      ...religions.map((r) => ({ value: r.id, label: r.name })),
    ],
    [religions],
  )

  useEffect(() => {
    Promise.all([
      getAllCountries(),
      getAllHistoricalCountries(),
      dynastyApi.getAll(),
      getAllReligions(),
      getAllPersons(),
    ])
      .then(([modern, historical, dyn, rel, pers]) => {
        setModernCountries(modern)
        setHistoricalCountries(historical)
        setDynasties(Array.isArray(dyn) ? dyn : [])
        setReligions(Array.isArray(rel) ? rel : [])
        setPersons(Array.isArray(pers) ? pers : [])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setCountryId(initialCountryId ?? '')
    setCountryName('')
  }, [initialCountryId])

  useEffect(() => {
    return () => {
      if (thumbnailObjectUrl) URL.revokeObjectURL(thumbnailObjectUrl)
    }
  }, [thumbnailObjectUrl])

  useEffect(() => {
    setActiveTab('basic')
    trackDirtyRef.current = false
    setIsDirty(false)
    setErrors({})

    if (!editPersonId) {
      // 등록 모드 전환 시 폼 초기화
      setName('')
      setSurname('')
      setMiddleName('')
      setNameFormat('korean')
      setOriginalName('')
      setSurnameMeaning('')
      setNameMeaning('')
      setMiddleNameMeaning('')
      setGender('')
      setBiography('')
      setProfileImageUrl('')
      setRegnalName('')
      setTempleName('')
      setPosthumousName('')
      setCountryId(initialCountryId ?? '')
      setCountryName('')
      setBirthCityId('')
      setDeathCityId('')
      setBirthPlace(null)
      setDeathPlace(null)
      setDynastyId('')
      setReligionId('')
      setFatherId('')
      setMotherId('')
      setSpouseId('')
      setSpouseNote('')
      setBirthEra('AD')
      setBirthYear('')
      setBirthMonth('')
      setBirthDay('')
      setIsBirthDateUnknown(false)
      setDeathEra('AD')
      setDeathYear('')
      setDeathMonth('')
      setDeathDay('')
      setIsDeathDateUnknown(false)
      setIsAlive(false)
      setDeathType('')
      setDeathCause('')
      setDeathNote('')
      setPendingThumbnailFile(null)
      setThumbnailObjectUrl(null)
      setThumbnailMarkedForRemoval(false)
      setIsLoadingEdit(false)
      // 다음 틱부터 dirty 추적 — 현재 setState batch가 dirty로 잡히지 않게
      requestAnimationFrame(() => {
        trackDirtyRef.current = true
      })
      return
    }

    let cancelled = false
    setIsLoadingEdit(true)
    setPendingThumbnailFile(null)
    setThumbnailObjectUrl(null)
    setThumbnailMarkedForRemoval(false)
    getPersonDetailById(editPersonId)
      .then((p: any) => {
        if (cancelled || !p) return
        setName(p.name ?? '')
        setSurname(p.surname ?? '')
        setMiddleName(p.middleName ?? '')
        setNameFormat(
          (p.nameDisplayOrder === 'western' ? 'western' : 'korean') as
            | 'korean'
            | 'western',
        )
        setOriginalName(p.originalName ?? '')
        setSurnameMeaning(p.surnameMeaning ?? '')
        setNameMeaning(p.nameMeaning ?? '')
        setMiddleNameMeaning(p.middleNameMeaning ?? '')
        setGender(p.gender ?? '')
        setBiography(p.biography ?? '')
        setProfileImageUrl(p.profileImageUrl ?? '')
        setRegnalName(p.regnalName ?? '')
        setTempleName(p.templeName ?? '')
        setPosthumousName(p.posthumousName ?? '')
        setCountryId(p.countryId ?? '')
        setBirthCityId(p.birthCityId ?? '')
        setDeathCityId(p.deathCityId ?? '')
        // PlaceResult 복원: 도시 > 행정구역 > 직접입력 순 우선순위
        if ((p as any).birthCity?.name) {
          setBirthPlace({
            cityId: p.birthCityId ?? undefined,
            adminDivisionId: (p as any).birthAdminDivisionId ?? undefined,
            displayName: (p as any).birthCity.name,
            shortName: (p as any).birthCity.name,
            region: (p as any).birthAdminDivision?.name ?? undefined,
          })
        } else if ((p as any).birthAdminDivision?.name) {
          setBirthPlace({
            adminDivisionId: (p as any).birthAdminDivisionId ?? undefined,
            displayName: (p as any).birthAdminDivision.name,
            shortName: (p as any).birthAdminDivision.name,
          })
        } else if ((p as any).birthPlaceText) {
          setBirthPlace({
            displayName: (p as any).birthPlaceText,
            shortName: (p as any).birthPlaceText,
            isManual: true,
          })
        }
        if ((p as any).deathCity?.name) {
          setDeathPlace({
            cityId: p.deathCityId ?? undefined,
            adminDivisionId: (p as any).deathAdminDivisionId ?? undefined,
            displayName: (p as any).deathCity.name,
            shortName: (p as any).deathCity.name,
            region: (p as any).deathAdminDivision?.name ?? undefined,
          })
        } else if ((p as any).deathAdminDivision?.name) {
          setDeathPlace({
            adminDivisionId: (p as any).deathAdminDivisionId ?? undefined,
            displayName: (p as any).deathAdminDivision.name,
            shortName: (p as any).deathAdminDivision.name,
          })
        } else if ((p as any).deathPlaceText) {
          setDeathPlace({
            displayName: (p as any).deathPlaceText,
            shortName: (p as any).deathPlaceText,
            isManual: true,
          })
        }
        setDynastyId(p.dynastyId ?? p.dynasty?.id ?? '')
        setReligionId(p.religionId ?? '')
        setFatherId(p.fatherId ?? p.father?.id ?? '')
        setMotherId(p.motherId ?? p.mother?.id ?? '')
        setSpouseId(p.spouseRelations?.[0]?.spouse?.id ?? p.spouseId ?? '')
        setSpouseNote(p.spouseRelations?.[0]?.note ?? '')
        if (p.birthYear != null || p.birthDate) {
          if (p.birthYear != null) {
            setBirthEra((p.birthEra as Era) ?? 'AD')
            setBirthYear(String(p.birthYear))
            setBirthMonth(p.birthMonth != null ? String(p.birthMonth) : '')
            setBirthDay(p.birthDay != null ? String(p.birthDay) : '')
          } else if (p.birthDate) {
            const b = parseDateString(p.birthDate)
            setBirthEra(b.era)
            setBirthYear(String(b.year))
            setBirthMonth(b.month != null ? String(b.month) : '')
            setBirthDay(b.day != null ? String(b.day) : '')
          }
          setIsBirthDateUnknown(false)
        } else setIsBirthDateUnknown(true)
        if (p.deathYear != null || p.deathDate) {
          if (p.deathYear != null) {
            setDeathEra((p.deathEra as Era) ?? 'AD')
            setDeathYear(String(p.deathYear))
            setDeathMonth(p.deathMonth != null ? String(p.deathMonth) : '')
            setDeathDay(p.deathDay != null ? String(p.deathDay) : '')
          } else if (p.deathDate) {
            const d = parseDateString(p.deathDate)
            setDeathEra(d.era)
            setDeathYear(String(d.year))
            setDeathMonth(d.month != null ? String(d.month) : '')
            setDeathDay(d.day != null ? String(d.day) : '')
          }
          setIsDeathDateUnknown(false)
          setIsAlive(false)
        } else {
          const alive = (p as any).isAlive === true
          const deathUnknown = (p as any).isDeathDateUnknown === true
          setIsAlive(alive)
          setIsDeathDateUnknown(!alive && deathUnknown)
        }
        setDeathType((p as any).deathType ?? '')
        setDeathCause((p as any).deathCause ?? '')
        setDeathNote((p as any).deathNote ?? '')
      })
      .catch(() => toast.error('인물 정보를 불러오지 못했습니다.'))
      .finally(() => {
        if (cancelled) return
        setIsLoadingEdit(false)
        // 로드 완료 후부터 dirty 추적 시작
        requestAnimationFrame(() => {
          trackDirtyRef.current = true
        })
      })
    return () => {
      cancelled = true
    }
  }, [editPersonId, initialCountryId])

  useEffect(() => {
    if (!countryId || (!modernCountries.length && !historicalCountries.length))
      return
    const modern = modernCountries.find((c) => c.id === countryId)
    const historical = historicalCountries.find((c) => c.id === countryId)
    if (modern) setCountryName(modern.name)
    else if (historical) setCountryName((historical as any).name ?? '')
  }, [countryId, modernCountries, historicalCountries])

  const handleCountrySelect = (c: { id: string; name: string }) => {
    setCountryId(c.id)
    setCountryName(c.name)
    setShowCountryModal(false)
    clearFieldError('countryId')
    markDirty()
  }

  const parseDateString = (date: string) => {
    const isBC = date.startsWith('-')
    const normalized = isBC ? date.slice(1) : date
    const [yearStr, monthStr, dayStr] = normalized.split('-')
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)
    const day = parseInt(dayStr, 10)
    return { era: (isBC ? 'BC' : 'AD') as Era, year, month, day }
  }

  const buildInitialDate = (
    era: Era,
    year?: string,
    month?: string,
    day?: string,
  ) => {
    if (!year) return undefined
    const y = parseInt(year, 10)
    if (isNaN(y)) return undefined
    const m = month ? parseInt(month, 10) : 1
    const d = day ? parseInt(day, 10) : 1
    const yearStr = Math.abs(y).toString().padStart(4, '0')
    const monthStr = String(m).padStart(2, '0')
    const dayStr = String(d).padStart(2, '0')
    return `${era === 'BC' ? '-' : ''}${yearStr}-${monthStr}-${dayStr}`
  }

  const formatDateDisplay = (era: Era, y: string, m: string, d: string) => {
    if (!y.trim()) return '날짜 선택'
    const year = parseInt(y, 10)
    if (isNaN(year)) return '날짜 선택'
    const prefix = era === 'BC' ? `BC ${year}` : `${year}년`
    const month = m ? parseInt(m, 10) : null
    const day = d ? parseInt(d, 10) : null
    if (month && day) return `${prefix} ${month}월 ${day}일`
    if (month) return `${prefix} ${month}월`
    return prefix
  }

  const handleBirthDateSelect = (date: string) => {
    const { era, year, month, day } = parseDateString(date)
    setBirthEra(era)
    setBirthYear(year.toString())
    setBirthMonth(month.toString())
    setBirthDay(day.toString())
    setShowBirthDateModal(false)
    clearFieldError('birth')
    markDirty()
    if (!isDeathDateUnknown) {
      setTimeout(() => setShowDeathDateModal(true), 200)
    }
  }

  const handleDeathDateSelect = (date: string) => {
    const { era, year, month, day } = parseDateString(date)
    setDeathEra(era)
    setDeathYear(year.toString())
    setDeathMonth(month.toString())
    setDeathDay(day.toString())
    setShowDeathDateModal(false)
    clearFieldError('death')
    markDirty()
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      validateImageFile(file)
      setThumbnailObjectUrl(URL.createObjectURL(file))
      setPendingThumbnailFile(file)
      setThumbnailMarkedForRemoval(false)
      markDirty()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : '이미지를 선택할 수 없습니다.',
      )
    }
  }

  /** 로컬에서만 고른 미업로드 파일이면 취소, 서버/저장 예정 이미지만 있으면 삭제 예약 */
  const handleRemoveThumbnail = () => {
    if (pendingThumbnailFile) {
      setThumbnailObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setPendingThumbnailFile(null)
      setThumbnailMarkedForRemoval(false)
      return
    }
    if (profileImageUrl.trim()) {
      setProfileImageUrl('')
      if (isEditMode) setThumbnailMarkedForRemoval(true)
    }
  }

  const dynastyName = dynastyId
    ? dynasties.find((d) => d.id === dynastyId)?.name
    : ''
  const religionName = religionId
    ? religions.find((r) => r.id === religionId)?.name
    : ''
  const fatherName = fatherId
    ? getPersonDisplayName(persons.find((p) => p.id === fatherId)!, true)
    : ''
  const motherName = motherId
    ? getPersonDisplayName(persons.find((p) => p.id === motherId)!, true)
    : ''
  const spouseName = spouseId
    ? getPersonDisplayName(persons.find((p) => p.id === spouseId)!, true)
    : ''

  /** 유효한 연도: 정수 1~9999 (기원 전/후 공통) */
  const isValidYear = (y: string): boolean => {
    if (!y.trim()) return true
    const n = Number(y)
    return Number.isInteger(n) && n >= 1 && n <= 9999
  }

  // 인물 등록 페이지와 동일 검증: 이름, 성, 성별, 출생 국가 필수 + 사망일 ≥ 출생일 + 연도 범위
  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = '이름을 입력해주세요.'
    if (!surname.trim()) e.surname = '성을 입력해주세요.'
    if (!gender) e.gender = '성별을 선택해주세요.'
    if (!countryId) e.countryId = '소속(출생) 국가를 선택해주세요.'
    if (!isBirthDateUnknown && birthYear.trim() && !isValidYear(birthYear)) {
      e.birth = '출생 연도는 1~9999 범위의 정수여야 합니다.'
    }
    if (
      !isAlive &&
      !isDeathDateUnknown &&
      deathYear.trim() &&
      !isValidYear(deathYear)
    ) {
      e.death = '사망 연도는 1~9999 범위의 정수여야 합니다.'
    }
    if (
      !e.birth &&
      !e.death &&
      !isBirthDateUnknown &&
      !isDeathDateUnknown &&
      !isAlive &&
      birthYear.trim() &&
      deathYear.trim()
    ) {
      const by = parseInt(birthYear, 10)
      const bm = birthMonth ? parseInt(birthMonth, 10) : 1
      const bd = birthDay ? parseInt(birthDay, 10) : 1
      const dy = parseInt(deathYear, 10)
      const dm = deathMonth ? parseInt(deathMonth, 10) : 1
      const dd = deathDay ? parseInt(deathDay, 10) : 1
      const birthSign = birthEra === 'BC' ? -1 : 1
      const deathSign = deathEra === 'BC' ? -1 : 1
      const birthVal = birthSign * (by * 10000 + bm * 100 + bd)
      const deathVal = deathSign * (dy * 10000 + dm * 100 + dd)
      if (deathVal < birthVal) {
        e.death = '사망일은 출생일 이후여야 합니다.'
      }
    }
    setErrors(e)
    if (Object.keys(e).length > 0) {
      // 에러가 있는 첫 탭으로 이동 — 사용자가 놓치지 않게
      const basicFields = [
        'name',
        'surname',
        'gender',
        'birth',
        'death',
      ] as const
      if (basicFields.some((k) => e[k])) setActiveTab('basic')
      else if (e.countryId) setActiveTab('affiliation')
      return false
    }
    return true
  }

  /** 입력 중 해당 필드 에러 해제 — 교정하면 바로 안정감 있게 사라짐 */
  const clearFieldError = useCallback((key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const buildPayload = (
    uploadedProfileUrl?: string,
    options?: { clearProfileImage?: boolean },
  ): CreatePersonInput => {
    let profileImageField: string | null | undefined
    if (uploadedProfileUrl !== undefined) {
      profileImageField = uploadedProfileUrl.trim() || undefined
    } else if (options?.clearProfileImage && isEditMode) {
      profileImageField = null
    } else {
      profileImageField = profileImageUrl.trim() || undefined
    }
    // 값 없음은 일관되게 null — 업데이트 시 "값 비우기" 의미가 유지됨.
    // 연관 id 필드(countryId, dynastyId 등)는 undefined로 — "선택 안 함"을 null이 아닌 미설정으로 취급.
    const input: CreatePersonInput = {
      name: name.trim(),
      surname: surname.trim() || null,
      middleName: middleName.trim() || null,
      nameDisplayOrder: nameFormat,
      originalName: originalName.trim() || null,
      surnameMeaning: surnameMeaning.trim() || null,
      nameMeaning: nameMeaning.trim() || null,
      middleNameMeaning: middleNameMeaning.trim() || null,
      gender: gender || null,
      biography: biography.trim() || null,
      profileImageUrl:
        profileImageField === null
          ? (null as unknown as CreatePersonInput['profileImageUrl'])
          : profileImageField || null,
      regnalName: regnalName.trim() || null,
      templeName: templeName.trim() || null,
      posthumousName: posthumousName.trim() || null,
      countryId: countryId || undefined,
      birthCityId: birthCityId || undefined,
      deathCityId: deathCityId || undefined,
      birthAdminDivisionId: birthPlace?.adminDivisionId || undefined,
      deathAdminDivisionId: deathPlace?.adminDivisionId || undefined,
      birthPlaceText: birthPlace?.isManual ? birthPlace.shortName : null,
      deathPlaceText: deathPlace?.isManual ? deathPlace.shortName : null,
      dynastyId: dynastyId || undefined,
      religionId: religionId || undefined,
      fatherId: fatherId || undefined,
      motherId: motherId || undefined,
      spouseRelations: spouseId
        ? [{ spouseId, note: spouseNote.trim() || null }]
        : undefined,
      isBirthDateUnknown,
      isDeathDateUnknown,
      isAlive,
      deathType: deathType || null,
      deathCause: deathCause.trim() || null,
      deathNote: deathNote.trim() || null,
    }

    if (!isBirthDateUnknown && birthYear.trim()) {
      const y = parseInt(birthYear, 10)
      if (!isNaN(y)) {
        input.birth = {
          era: birthEra,
          year: y,
          month: birthMonth ? parseInt(birthMonth, 10) : undefined,
          day: birthDay ? parseInt(birthDay, 10) : undefined,
        }
      }
    }
    if (!isDeathDateUnknown && deathYear.trim()) {
      const y = parseInt(deathYear, 10)
      if (!isNaN(y)) {
        input.death = {
          era: deathEra,
          year: y,
          month: deathMonth ? parseInt(deathMonth, 10) : undefined,
          day: deathDay ? parseInt(deathDay, 10) : undefined,
        }
      }
    }
    return input
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    onSubmittingChange?.(true)
    let profileImageUploadedThisSubmit = false
    try {
      let uploadedProfileUrl: string | undefined
      if (pendingThumbnailFile) {
        setUploadingThumbnail(true)
        try {
          const res = await uploadImage(pendingThumbnailFile, 'persons')
          uploadedProfileUrl = res.url
          profileImageUploadedThisSubmit = true
          setProfileImageUrl(res.url)
          setThumbnailObjectUrl(null)
          setPendingThumbnailFile(null)
          setThumbnailMarkedForRemoval(false)
        } finally {
          setUploadingThumbnail(false)
        }
      }
      const clearProfileImage =
        isEditMode &&
        thumbnailMarkedForRemoval &&
        uploadedProfileUrl === undefined
      const payload = buildPayload(uploadedProfileUrl, {
        clearProfileImage,
      })
      const createPayload =
        payload.profileImageUrl === null
          ? { ...payload, profileImageUrl: undefined }
          : payload
      if (isEditMode && editPersonId) {
        await updatePerson(editPersonId, payload)
        toast.success('인물 정보가 수정되었습니다.')
        // 성공 시 dirty 해제 — 부모가 닫을 때 경고 뜨지 않도록
        setIsDirty(false)
        onSuccess?.(editPersonId)
        onCancel()
      } else {
        const created = await createPerson(createPayload)
        const personId = (created as any)?.id ?? (created as any)?.data?.id
        toast.success('인물이 등록되었습니다.')
        setIsDirty(false)
        onSuccess?.(personId)
        onCancel()
      }
    } catch (err: any) {
      const base =
        err?.message ??
        (isEditMode ? '수정에 실패했습니다.' : '등록에 실패했습니다.')
      const extra =
        profileImageUploadedThisSubmit
          ? isEditMode
            ? ' 이미지는 업로드되었습니다. 저장을 다시 시도해 주세요.'
            : ' 이미지는 업로드되었습니다. 등록을 다시 시도해 주세요.'
          : ''
      setErrors((prev) => ({ ...prev, _form: base + extra }))
      toast.error(base + extra)
    } finally {
      setIsSubmitting(false)
      onSubmittingChange?.(false)
      setUploadingThumbnail(false)
    }
  }

  const personListForSelect = persons

  const formContent = (
    <>
      {embedInCard && (
        <FormHeader>
          <BackButton type="button" onClick={onCancel}>
            <FiArrowLeft size={18} />
            목록 보기
          </BackButton>
          <SubmitButton
            type="submit"
            form="person-register-form"
            disabled={isSubmitting}
          >
            {uploadingThumbnail
              ? '이미지 업로드 중…'
              : isSubmitting
                ? isEditMode
                  ? '저장 중…'
                  : '등록 중…'
                : isEditMode
                  ? '저장'
                  : '등록'}
          </SubmitButton>
        </FormHeader>
      )}
      <form
        id="person-register-form"
        onSubmit={handleSubmit}
        onChange={markDirty}
        onInput={markDirty}
      >
        <LoadingHost>
          {isLoadingEdit && (
            <LoadingOverlay aria-live="polite">
              인물 정보를 불러오는 중…
            </LoadingOverlay>
          )}
        <FormSectionInner aria-busy={isLoadingEdit}>
          <TabNavigation $hugContent>
            <TabButton
              type="button"
              $active={activeTab === 'basic'}
              onClick={() => setActiveTab('basic')}
            >
              <FiInfo size={16} />
              기본 정보
            </TabButton>
            <TabButton
              type="button"
              $active={activeTab === 'affiliation'}
              onClick={() => setActiveTab('affiliation')}
            >
              <FiGlobe size={16} />
              소속 · 가문
            </TabButton>
            <TabButton
              type="button"
              $active={activeTab === 'family'}
              onClick={() => setActiveTab('family')}
            >
              <FiUsers size={16} />
              가족
            </TabButton>
          </TabNavigation>
          {activeTab === 'basic' && (
            <FormRows>
              <ThumbnailWrap>
                <FieldLabel htmlFor="person-thumbnail-upload">썸네일</FieldLabel>
                <FieldControl>
                  <ThumbnailRow>
                    <ThumbnailPreview
                      htmlFor="person-thumbnail-upload"
                      $hasImage={!!(thumbnailObjectUrl || profileImageUrl)}
                    >
                      {thumbnailObjectUrl || profileImageUrl ? (
                        <img
                          src={
                            thumbnailObjectUrl ||
                            getUploadImageUrl(profileImageUrl) ||
                            profileImageUrl
                          }
                          alt="프로필"
                        />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      )}
                    </ThumbnailPreview>
                    <ThumbnailHint id="person-thumbnail-hint">
                      {pendingThumbnailFile
                        ? '저장 시 서버에 업로드됩니다.'
                        : '등록·저장 시 업로드됩니다.'}
                    </ThumbnailHint>
                    {(thumbnailObjectUrl || profileImageUrl.trim()) && (
                      <ThumbnailRemoveBtn
                        type="button"
                        onClick={() => {
                          handleRemoveThumbnail()
                          markDirty()
                        }}
                        disabled={isSubmitting}
                        aria-label={
                          pendingThumbnailFile
                            ? '선택한 이미지 취소'
                            : '썸네일 제거'
                        }
                      >
                        <FiTrash2 size={14} />
                        {pendingThumbnailFile ? '선택 취소' : '썸네일 제거'}
                      </ThumbnailRemoveBtn>
                    )}
                    <ThumbnailUploadInput
                      id="person-thumbnail-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      disabled={isSubmitting}
                      aria-describedby="person-thumbnail-hint"
                    />
                  </ThumbnailRow>
                </FieldControl>
              </ThumbnailWrap>
              <FieldRow>
                <FieldLabel htmlFor={fid('surname')}>
                  성 · 이름 · 중간이름 <Required>*</Required>
                </FieldLabel>
                <FieldControl>
                  <InlineFields $cols={3}>
                    <FormInput
                      id={fid('surname')}
                      value={surname}
                      onChange={(e) => {
                        setSurname(e.target.value)
                        clearFieldError('surname')
                      }}
                      placeholder="성 (예: 김)"
                      $error={!!errors.surname}
                      aria-invalid={!!errors.surname}
                      aria-describedby={
                        errors.surname ? fid('surname-err') : undefined
                      }
                    />
                    <FormInput
                      id={fid('name')}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        clearFieldError('name')
                      }}
                      placeholder="이름 (예: 홍길동)"
                      $error={!!errors.name}
                      aria-invalid={!!errors.name}
                      aria-describedby={
                        errors.name ? fid('name-err') : undefined
                      }
                    />
                    <FormInput
                      id={fid('middleName')}
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      placeholder="중간이름"
                    />
                  </InlineFields>
                  {(errors.surname || errors.name) && (
                    <FieldError
                      id={errors.surname ? fid('surname-err') : fid('name-err')}
                      role="alert"
                    >
                      {errors.surname || errors.name}
                    </FieldError>
                  )}
                </FieldControl>
              </FieldRow>
              <FieldRow>
                <FieldLabel htmlFor={fid('originalName')}>이름 원어</FieldLabel>
                <FieldControl>
                  <OriginalNameInputWrap>
                    <FormInput
                      id={fid('originalName')}
                      value={originalName}
                      onChange={(e) => setOriginalName(e.target.value)}
                      placeholder="예: Franklin D. Roosevelt"
                    />
                  </OriginalNameInputWrap>
                </FieldControl>
              </FieldRow>
              <CheckboxRowTwo>
                <InlineCheckboxLabel>
                  <input
                    type="checkbox"
                    checked={isBirthDateUnknown}
                    onChange={(e) => setIsBirthDateUnknown(e.target.checked)}
                  />
                  출생일 미상
                </InlineCheckboxLabel>
                <InlineCheckboxLabel>
                  <input
                    type="checkbox"
                    checked={isAlive}
                    onChange={(e) => {
                      setIsAlive(e.target.checked)
                      if (e.target.checked) {
                        setIsDeathDateUnknown(false)
                        setDeathYear('')
                        setDeathMonth('')
                        setDeathDay('')
                        clearFieldError('death')
                      }
                    }}
                  />
                  생존 중
                </InlineCheckboxLabel>
                <InlineCheckboxLabel $disabled={isAlive}>
                  <input
                    type="checkbox"
                    checked={isDeathDateUnknown}
                    onChange={(e) => setIsDeathDateUnknown(e.target.checked)}
                    disabled={isAlive}
                  />
                  사망일 미상
                </InlineCheckboxLabel>
              </CheckboxRowTwo>
              <FieldRow>
                <FieldLabel>출생일 · 사망일</FieldLabel>
                <FieldControl>
                  <DateFieldsRow>
                    <DateFieldBtn
                      type="button"
                      $hasValue={!!birthYear.trim()}
                      onClick={() => setShowBirthDateModal(true)}
                      aria-invalid={!!errors.birth}
                    >
                      <FiCalendar size={18} />
                      <span>
                        {formatDateDisplay(
                          birthEra,
                          birthYear,
                          birthMonth,
                          birthDay,
                        )}
                      </span>
                      <FiChevronDown size={16} />
                    </DateFieldBtn>
                    <DateFieldBtn
                      type="button"
                      $hasValue={!!deathYear.trim()}
                      onClick={() => !isAlive && setShowDeathDateModal(true)}
                      disabled={isAlive}
                      aria-invalid={!!errors.death}
                      style={
                        isAlive
                          ? { opacity: 0.4, cursor: 'not-allowed' }
                          : undefined
                      }
                    >
                      <FiCalendar size={18} />
                      <span>
                        {isAlive
                          ? '생존 중'
                          : formatDateDisplay(
                              deathEra,
                              deathYear,
                              deathMonth,
                              deathDay,
                            )}
                      </span>
                      <FiChevronDown size={16} />
                    </DateFieldBtn>
                  </DateFieldsRow>
                  {(errors.birth || errors.death) && (
                    <FieldError role="alert">
                      {errors.birth || errors.death}
                    </FieldError>
                  )}
                </FieldControl>
              </FieldRow>
              <FieldRow>
                <FieldLabel htmlFor={fid('deathType')}>사망 유형 · 원인</FieldLabel>
                <FieldControl>
                  <InlineFields $cols={2}>
                    <div>
                      <SelectBtn
                        id={fid('deathType')}
                        type="button"
                        $hasValue={!!deathType}
                        onClick={() => !isAlive && setShowDeathTypeModal(true)}
                        disabled={isAlive}
                      >
                        <span>
                          {DEATH_TYPE_OPTIONS.find((o) => o.value === deathType)?.label ?? '유형 선택'}
                        </span>
                        <FiChevronDown size={18} />
                      </SelectBtn>
                      <SelectModal
                        isOpen={showDeathTypeModal}
                        onClose={() => setShowDeathTypeModal(false)}
                        options={DEATH_TYPE_OPTIONS}
                        selectedValue={deathType}
                        onSelect={(v) => {
                          setDeathType(v)
                          setShowDeathTypeModal(false)
                          markDirty()
                        }}
                        title="사망 유형 선택"
                      />
                    </div>
                    <FormInput
                      id={fid('deathCause')}
                      value={deathCause}
                      onChange={(e) => setDeathCause(e.target.value)}
                      placeholder="사망 원인 상세 (예: 폐렴 합병증)"
                      disabled={isAlive}
                    />
                  </InlineFields>
                </FieldControl>
              </FieldRow>
              <FieldRow>
                <FieldLabel htmlFor={fid('deathNote')}>사망 메모</FieldLabel>
                <FieldControl>
                  <Textarea
                    id={fid('deathNote')}
                    value={deathNote}
                    onChange={(e) => setDeathNote(e.target.value)}
                    placeholder="사망 관련 맥락, 논란, 비고 등"
                    rows={3}
                    disabled={isAlive}
                  />
                </FieldControl>
              </FieldRow>
              <FieldRowMulti>
                <FieldLabel htmlFor={fid('surnameMeaning')}>
                  성의 뜻 / 이름의 뜻 / 중간이름의 뜻
                </FieldLabel>
                <FieldControl>
                  <InlineFields $cols={3}>
                    <FormInput
                      id={fid('surnameMeaning')}
                      value={surnameMeaning}
                      onChange={(e) => setSurnameMeaning(e.target.value)}
                      placeholder="성의 뜻"
                    />
                    <FormInput
                      id={fid('nameMeaning')}
                      value={nameMeaning}
                      onChange={(e) => setNameMeaning(e.target.value)}
                      placeholder="이름의 뜻"
                    />
                    <FormInput
                      id={fid('middleNameMeaning')}
                      value={middleNameMeaning}
                      onChange={(e) => setMiddleNameMeaning(e.target.value)}
                      placeholder="중간이름의 뜻"
                    />
                  </InlineFields>
                </FieldControl>
              </FieldRowMulti>
              <FieldRow>
                <FieldLabel htmlFor={fid('gender')}>
                  성별 <Required>*</Required>
                </FieldLabel>
                <FieldControl>
                  <SelectBtn
                    id={fid('gender')}
                    type="button"
                    $hasValue={!!gender}
                    $error={!!errors.gender}
                    aria-invalid={!!errors.gender}
                    aria-describedby={
                      errors.gender ? fid('gender-err') : undefined
                    }
                    onClick={() => setShowGenderModal(true)}
                  >
                    <span>
                      {GENDER_OPTIONS.find((o) => o.value === gender)?.label ??
                        '선택'}
                    </span>
                    <FiChevronDown size={18} />
                  </SelectBtn>
                  <SelectModal
                    isOpen={showGenderModal}
                    onClose={() => setShowGenderModal(false)}
                    options={GENDER_OPTIONS}
                    selectedValue={gender}
                    onSelect={(v) => {
                      setGender(v)
                      setShowGenderModal(false)
                      clearFieldError('gender')
                      markDirty()
                    }}
                    title="성별 선택"
                  />
                  {errors.gender && (
                    <FieldError id={fid('gender-err')} role="alert">
                      {errors.gender}
                    </FieldError>
                  )}
                </FieldControl>
              </FieldRow>
            </FormRows>
          )}

          {activeTab === 'affiliation' && (
            <FormRows>
              <FieldRow>
                <FieldLabel htmlFor={fid('countryId')}>
                  소속(출생) 국가 <Required>*</Required>
                </FieldLabel>
                <FieldControl>
                  <SelectBtn
                    id={fid('countryId')}
                    type="button"
                    $hasValue={!!countryName}
                    $error={!!errors.countryId}
                    aria-invalid={!!errors.countryId}
                    aria-describedby={
                      errors.countryId ? fid('countryId-err') : undefined
                    }
                    onClick={() => setShowCountryModal(true)}
                  >
                    <span>{countryName || '국가 선택'}</span>
                    <FiChevronDown size={18} />
                  </SelectBtn>
                  {errors.countryId && (
                    <FieldError id={fid('countryId-err')} role="alert">
                      {errors.countryId}
                    </FieldError>
                  )}
                </FieldControl>
              </FieldRow>
              <FieldRow>
                <FieldLabel>출생지</FieldLabel>
                <FieldControl>
                  <PlaceAutocompleteWrap>
                    <PlaceAutocomplete
                      value={birthPlace}
                      onChange={(place) => {
                        setBirthPlace(place)
                        setBirthCityId(place?.cityId ?? '')
                        markDirty()
                      }}
                      countryId={countryId || undefined}
                    />
                  </PlaceAutocompleteWrap>
                </FieldControl>
              </FieldRow>
              <FieldRow>
                <FieldLabel>사망지</FieldLabel>
                <FieldControl>
                  <PlaceAutocompleteWrap>
                    <PlaceAutocomplete
                      value={deathPlace}
                      onChange={(place) => {
                        setDeathPlace(place)
                        setDeathCityId(place?.cityId ?? '')
                        markDirty()
                      }}
                      countryId={countryId || undefined}
                    />
                  </PlaceAutocompleteWrap>
                </FieldControl>
              </FieldRow>
              <FieldRowMulti>
                <FieldLabel htmlFor={fid('dynasty')}>가문 · 종교</FieldLabel>
                <FieldControl>
                  <InlineFields $cols={2}>
                    <div>
                      <SelectBtn
                        id={fid('dynasty')}
                        type="button"
                        $hasValue={!!dynastyName}
                        onClick={() => setShowDynastyModal(true)}
                      >
                        <span>{dynastyName || '가문'}</span>
                        <FiChevronDown size={16} />
                      </SelectBtn>
                      <SelectModal
                        isOpen={showDynastyModal}
                        onClose={() => setShowDynastyModal(false)}
                        options={dynastyOptions}
                        selectedValue={dynastyId}
                        onSelect={(v) => {
                          setDynastyId(v)
                          setShowDynastyModal(false)
                          markDirty()
                        }}
                        title="가문 선택"
                      />
                    </div>
                    <div>
                      <SelectBtn
                        id={fid('religion')}
                        type="button"
                        $hasValue={!!religionName}
                        onClick={() => setShowReligionModal(true)}
                      >
                        <span>{religionName || '종교'}</span>
                        <FiChevronDown size={16} />
                      </SelectBtn>
                      <SelectModal
                        isOpen={showReligionModal}
                        onClose={() => setShowReligionModal(false)}
                        options={religionOptions}
                        selectedValue={religionId}
                        onSelect={(v) => {
                          setReligionId(v)
                          setShowReligionModal(false)
                          markDirty()
                        }}
                        title="종교 선택"
                      />
                    </div>
                  </InlineFields>
                </FieldControl>
              </FieldRowMulti>
              <FieldRow data-bio-editor-wrap>
                <FieldLabel>약력</FieldLabel>
                <FieldControl>
                  <RichTextEditor
                    value={biography}
                    onChange={(v) => {
                      setBiography(v)
                      markDirty()
                    }}
                    showTitle={false}
                    placeholder="인물의 일생을 설명하는 글 (선택). 서식·이미지를 넣을 수 있습니다."
                    onImageUpload={async (file) => {
                      const result = await uploadImage(file, 'persons')
                      return result.url
                    }}
                  />
                </FieldControl>
              </FieldRow>
            </FormRows>
          )}

          {activeTab === 'family' && (
            <FormRows>
              <FieldRow>
                <FieldLabel htmlFor={fid('father')}>아버지</FieldLabel>
                <FieldControl>
                  <SelectBtn
                    id={fid('father')}
                    type="button"
                    $hasValue={!!fatherName}
                    onClick={() => setShowFatherModal(true)}
                  >
                    <span>{fatherName || '선택'}</span>
                    <FiChevronDown size={18} />
                  </SelectBtn>
                  {showFatherModal && (
                    <PersonSelectModal
                      persons={personListForSelect}
                      selectedPersonId={fatherId}
                      onSelect={(id) => {
                        setFatherId(id)
                        setShowFatherModal(false)
                        markDirty()
                      }}
                      onClose={() => setShowFatherModal(false)}
                    />
                  )}
                </FieldControl>
              </FieldRow>
              <FieldRow>
                <FieldLabel htmlFor={fid('mother')}>어머니</FieldLabel>
                <FieldControl>
                  <SelectBtn
                    id={fid('mother')}
                    type="button"
                    $hasValue={!!motherName}
                    onClick={() => setShowMotherModal(true)}
                  >
                    <span>{motherName || '선택'}</span>
                    <FiChevronDown size={18} />
                  </SelectBtn>
                  {showMotherModal && (
                    <PersonSelectModal
                      persons={personListForSelect}
                      selectedPersonId={motherId}
                      onSelect={(id) => {
                        setMotherId(id)
                        setShowMotherModal(false)
                        markDirty()
                      }}
                      onClose={() => setShowMotherModal(false)}
                    />
                  )}
                </FieldControl>
              </FieldRow>
              <FieldRow>
                <FieldLabel htmlFor={fid('spouse')}>배우자</FieldLabel>
                <FieldControl>
                  <SelectBtn
                    id={fid('spouse')}
                    type="button"
                    $hasValue={!!spouseName}
                    onClick={() => setShowSpouseModal(true)}
                  >
                    <span>{spouseName || '선택'}</span>
                    <FiChevronDown size={18} />
                  </SelectBtn>
                  {showSpouseModal && (
                    <PersonSelectModal
                      persons={personListForSelect}
                      selectedPersonId={spouseId}
                      onSelect={(id) => {
                        setSpouseId(id)
                        setShowSpouseModal(false)
                        markDirty()
                      }}
                      onClose={() => setShowSpouseModal(false)}
                    />
                  )}
                </FieldControl>
              </FieldRow>
              <FieldRow>
                <FieldLabel htmlFor={fid('spouseNote')}>배우자 설명</FieldLabel>
                <FieldControl>
                  <SpouseNoteTextarea
                    id={fid('spouseNote')}
                    value={spouseNote}
                    onChange={(e) => setSpouseNote(e.target.value)}
                    placeholder="예: 1대 왕비, 재위 기간 중 사망"
                    disabled={!spouseId}
                    rows={3}
                  />
                </FieldControl>
              </FieldRow>
            </FormRows>
          )}

          {errors._form && <ErrorText role="alert">{errors._form}</ErrorText>}
        </FormSectionInner>
        </LoadingHost>
      </form>

      <CountrySelectModal
        isOpen={showCountryModal}
        onClose={() => setShowCountryModal(false)}
        onSelect={handleCountrySelect}
        modernCountries={modernCountries}
        historicalCountries={historicalCountries}
        title="소속 국가 선택"
        selectedCountryId={countryId || undefined}
      />
      {showBirthDateModal && (
        <DatePickerModal
          isOpen={showBirthDateModal}
          onClose={() => setShowBirthDateModal(false)}
          onSelect={handleBirthDateSelect}
          initialDate={buildInitialDate(
            birthEra,
            birthYear,
            birthMonth,
            birthDay,
          )}
          title="출생일 선택"
        />
      )}
      {showDeathDateModal && (
        <DatePickerModal
          isOpen={showDeathDateModal}
          onClose={() => setShowDeathDateModal(false)}
          onSelect={handleDeathDateSelect}
          initialDate={buildInitialDate(
            deathEra,
            deathYear,
            deathMonth,
            deathDay,
          )}
          title="사망일 선택"
        />
      )}
    </>
  )

  return embedInCard ? (
    <FormCardWrapper>{formContent}</FormCardWrapper>
  ) : (
    <PersonFormLayoutWrap>{formContent}</PersonFormLayoutWrap>
  )
}
