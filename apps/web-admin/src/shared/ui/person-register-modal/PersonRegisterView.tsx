/**
 * 인물 등록 뷰 (화면 전환용)
 * - 역대 수반 기본정보/업적 폼과 동일한 공용 레이아웃 사용 (@/shared/ui/register-form-layout)
 * - 인물 등록 페이지와 동일한 폼 기능 (필드·검증·payload)
 */
import React, { useEffect, useState } from 'react'
import { FiArrowLeft, FiCalendar, FiChevronDown, FiGlobe, FiInfo, FiUsers } from 'react-icons/fi'
import styled from 'styled-components'
import { toast } from 'react-hot-toast'

import { personApi, type CreatePersonInput, type Era } from '@/shared/api/person'
import { getUploadImageUrl, uploadImage, validateImageFile } from '@/shared/api/upload'
import { getAllPersons, type PersonResponseDto } from '@/shared/api/persons'
import { cityApi } from '@/shared/api/city'
import { getAllCountries } from '@/shared/api/countries'
import { dynastyApi } from '@/shared/api/dynasty'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import { getAllJobs } from '@/shared/api/jobs'
import { getAllReligions } from '@/shared/api/religions'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { CountrySelectModal } from '@/shared/ui/country-select-modal'
import { DatePickerModal } from '@/shared/ui/date-picker'
import { PersonSelectModal } from '@/shared/ui/person-select-modal'
import {
  BackButton,
  DateFieldBtn,
  DateFieldsRow,
  FieldControl,
  FieldLabel,
  FieldRow,
  FormCardWrapper,
  FormHeader,
  FormHeaderTitle,
  FormRows,
  FormSectionInner,
  Input,
  Required,
  SubmitButton,
  TabButton,
  TabNavigation,
} from '@/shared/ui/register-form-layout'
import { SelectModal, type SelectOption } from '@/shared/ui/select-modal'

const BORDER_COLOR = '#e5e7eb'
const FOCUS_COLOR = '#4f46e5'
const TEXT_PRIMARY = '#0f172a'

const ThumbnailWrap = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 14px 0;
  border-bottom: 1px solid #f3f4f6;
`

const ThumbnailPreview = styled.label<{ $hasImage?: boolean }>`
  width: 88px;
  height: 88px;
  border-radius: 50%;
  overflow: hidden;
  background: ${(p) => (p.$hasImage ? 'transparent' : 'rgba(226, 232, 240, 0.6)')};
  border: 2px dashed ${(p) => (p.$hasImage ? 'transparent' : 'rgba(99, 102, 241, 0.35)')};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  &:hover {
    border-color: rgba(99, 102, 241, 0.6);
    background: ${(p) => (p.$hasImage ? 'transparent' : 'rgba(226, 232, 240, 0.9)')};
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  svg {
    color: #94a3b8;
    width: 32px;
    height: 32px;
  }
`

const ThumbnailUploadInput = styled.input`
  display: none;
`

const FieldRowMulti = styled.div`
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 24px;
  align-items: start;
  padding: 20px 0;
  border-bottom: 1px solid #f3f4f6;
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
  input, select, button {
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

const SelectBtn = styled.button<{ $hasValue?: boolean }>`
  width: 100%;
  max-width: 380px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  font-size: 14px;
  color: ${(p) => (p.$hasValue ? '#111827' : '#9ca3af')};
  background: #fff;
  border: 1px solid ${BORDER_COLOR};
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  outline: none;
  &:hover {
    border-color: #d1d5db;
  }
  &:focus-visible {
    border-color: ${FOCUS_COLOR};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
  span {
    flex: 1;
  }
`

const TextArea = styled.textarea`
  width: 100%;
  max-width: 380px;
  min-height: 80px;
  padding: 12px 16px;
  font-size: 14px;
  border: 1px solid ${BORDER_COLOR};
  border-radius: 12px;
  box-sizing: border-box;
  resize: vertical;
  &:focus {
    outline: none;
    border-color: ${FOCUS_COLOR};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
`

const NativeSelect = styled.select`
  width: 100%;
  max-width: 380px;
  padding: 12px 16px;
  font-size: 14px;
  border: 1px solid ${BORDER_COLOR};
  border-radius: 12px;
  background: #fff;
  color: #111827;
  &:focus {
    outline: none;
    border-color: ${FOCUS_COLOR};
  }
`

const CheckboxRowTwo = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 14px 0;
  border-bottom: 1px solid #f3f4f6;
  flex-wrap: wrap;
  input {
    width: 18px;
    height: 18px;
    accent-color: #6366f1;
    cursor: pointer;
  }
  label {
    font-size: 14px;
    color: ${TEXT_PRIMARY};
    cursor: pointer;
  }
`

const ErrorText = styled.span`
  font-size: 12px;
  color: #dc2626;
  margin-top: 8px;
  display: block;
`

const GENDER_OPTIONS: SelectOption<string>[] = [
  { value: '', label: '선택' },
  { value: 'MALE', label: '남성' },
  { value: 'FEMALE', label: '여성' },
]
export interface PersonRegisterViewProps {
  initialCountryId?: string | null
  onCancel: () => void
  onSuccess?: (personId: string) => void
  /** false면 FormCardWrapper 없이 헤더+폼만 렌더 (외부에서 수반 등록 폼처럼 카드로 감쌀 때 사용) */
  embedInCard?: boolean
  /** 있으면 수정 모드: 해당 인물 로드 후 폼에 채우고 저장 시 update 호출 */
  editPersonId?: string | null
}

export function PersonRegisterView({
  initialCountryId,
  onCancel,
  onSuccess,
  embedInCard = true,
  editPersonId,
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
  const [deathEra, setDeathEra] = useState<Era>('AD')
  const [deathYear, setDeathYear] = useState('')
  const [deathMonth, setDeathMonth] = useState('')
  const [deathDay, setDeathDay] = useState('')
  // 소속
  const [countryId, setCountryId] = useState<string>(initialCountryId ?? '')
  const [countryName, setCountryName] = useState<string>('')
  const [birthCityId, setBirthCityId] = useState('')
  const [deathCityId, setDeathCityId] = useState('')
  const [dynastyId, setDynastyId] = useState('')
  const [religionId, setReligionId] = useState('')
  const [jobId, setJobId] = useState('')
  // 가족
  const [fatherId, setFatherId] = useState('')
  const [motherId, setMotherId] = useState('')
  const [spouseId, setSpouseId] = useState('')
  // 기타
  const [biography, setBiography] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [regnalName, setRegnalName] = useState('')
  const [templeName, setTempleName] = useState('')
  const [posthumousName, setPosthumousName] = useState('')

  const [showCountryModal, setShowCountryModal] = useState(false)
  const [showGenderModal, setShowGenderModal] = useState(false)
  const [showBirthDateModal, setShowBirthDateModal] = useState(false)
  const [showDeathDateModal, setShowDeathDateModal] = useState(false)
  const [showDynastyModal, setShowDynastyModal] = useState(false)
  const [showReligionModal, setShowReligionModal] = useState(false)
  const [showJobModal, setShowJobModal] = useState(false)
  const [showFatherModal, setShowFatherModal] = useState(false)
  const [showMotherModal, setShowMotherModal] = useState(false)
  const [showSpouseModal, setShowSpouseModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'affiliation' | 'family'>('basic')
  const [thumbnailUploading, setThumbnailUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [modernCountries, setModernCountries] = useState<CountryResponseDto[]>([])
  const [historicalCountries, setHistoricalCountries] = useState<
    HistoricalCountryResponseDto[]
  >([])
  const [dynasties, setDynasties] = useState<Array<{ id: string; name: string }>>([])
  const [religions, setReligions] = useState<Array<{ id: string; name: string }>>([])
  const [jobs, setJobs] = useState<Array<{ id: string; name?: string; title?: string }>>([])
  const [persons, setPersons] = useState<PersonResponseDto[]>([])
  const [cities, setCities] = useState<Array<{ id: string; name: string; countryId: string }>>([])

  useEffect(() => {
    Promise.all([
      getAllCountries(),
      getAllHistoricalCountries(),
      dynastyApi.getAll(),
      getAllReligions(),
      getAllJobs(),
      getAllPersons(),
    ])
      .then(([modern, historical, dyn, rel, jb, pers]) => {
        setModernCountries(modern)
        setHistoricalCountries(historical)
        setDynasties(Array.isArray(dyn) ? dyn : [])
        setReligions(Array.isArray(rel) ? rel : [])
        setJobs(Array.isArray(jb) ? jb : [])
        setPersons(Array.isArray(pers) ? pers : [])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setCountryId(initialCountryId ?? '')
    setCountryName('')
  }, [initialCountryId])

  useEffect(() => {
    if (!editPersonId) return
    let cancelled = false
    personApi
      .getById(editPersonId)
      .then((p: any) => {
        if (cancelled || !p) return
        setName(p.name ?? '')
        setSurname(p.surname ?? '')
        setMiddleName(p.middleName ?? '')
        setNameFormat((p.nameDisplayOrder === 'western' ? 'western' : 'korean') as 'korean' | 'western')
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
        setDynastyId(p.dynastyId ?? '')
        setReligionId(p.religionId ?? '')
        setJobId(p.jobId ?? '')
        setFatherId(p.fatherId ?? '')
        setMotherId(p.motherId ?? '')
        setSpouseId(p.spouseId ?? '')
        if (p.birthDate) {
          const b = parseDateString(p.birthDate)
          setBirthEra(b.era)
          setBirthYear(String(b.year))
          setBirthMonth(b.month != null ? String(b.month) : '')
          setBirthDay(b.day != null ? String(b.day) : '')
          setIsBirthDateUnknown(false)
        } else setIsBirthDateUnknown(true)
        if (p.deathDate) {
          const d = parseDateString(p.deathDate)
          setDeathEra(d.era)
          setDeathYear(String(d.year))
          setDeathMonth(d.month != null ? String(d.month) : '')
          setDeathDay(d.day != null ? String(d.day) : '')
          setIsDeathDateUnknown(false)
        } else setIsDeathDateUnknown(true)
      })
      .catch(() => toast.error('인물 정보를 불러오지 못했습니다.'))
    return () => { cancelled = true }
  }, [editPersonId])

  useEffect(() => {
    if (!countryId || (!modernCountries.length && !historicalCountries.length)) return
    const modern = modernCountries.find((c) => c.id === countryId)
    const historical = historicalCountries.find((c) => c.id === countryId)
    if (modern) setCountryName(modern.name)
    else if (historical) setCountryName((historical as any).name ?? '')
  }, [countryId, modernCountries, historicalCountries])

  useEffect(() => {
    if (!countryId) {
      setCities([])
      return
    }
    cityApi.getByCountryId(countryId).then(setCities).catch(() => setCities([]))
  }, [countryId])

  const handleCountrySelect = (c: { id: string; name: string }) => {
    setCountryId(c.id)
    setCountryName(c.name)
    setShowCountryModal(false)
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
  }

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      validateImageFile(file)
      setThumbnailUploading(true)
      const res = await uploadImage(file, 'persons')
      setProfileImageUrl(res.url)
      toast.success('썸네일이 등록되었습니다.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.')
    } finally {
      setThumbnailUploading(false)
    }
  }

  const getJobLabel = (job: { id: string; name?: string; title?: string }) =>
    job?.title ?? job?.name ?? job.id
  const dynastyName = dynastyId ? dynasties.find((d) => d.id === dynastyId)?.name : ''
  const religionName = religionId ? religions.find((r) => r.id === religionId)?.name : ''
  const jobName = jobId ? getJobLabel(jobs.find((j) => j.id === jobId)!) : ''
  const fatherName = fatherId
    ? getPersonDisplayName(persons.find((p) => p.id === fatherId)!, true)
    : ''
  const motherName = motherId
    ? getPersonDisplayName(persons.find((p) => p.id === motherId)!, true)
    : ''
  const spouseName = spouseId
    ? getPersonDisplayName(persons.find((p) => p.id === spouseId)!, true)
    : ''
  const birthCityName = birthCityId ? cities.find((c) => c.id === birthCityId)?.name : ''
  const deathCityName = deathCityId ? cities.find((c) => c.id === deathCityId)?.name : ''

  // 인물 등록 페이지와 동일 검증: 이름, 성, 성별, 출생 국가 필수 + 사망일 ≥ 출생일
  const validate = (): boolean => {
    if (!name.trim()) {
      setError('이름을 입력해주세요.')
      return false
    }
    if (!surname.trim()) {
      setError('성을 입력해주세요.')
      return false
    }
    if (!gender) {
      setError('성별을 선택해주세요.')
      return false
    }
    if (!countryId) {
      setError('소속(출생) 국가를 선택해주세요.')
      return false
    }
    if (
      !isBirthDateUnknown &&
      !isDeathDateUnknown &&
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
        setError('사망일은 출생일 이후여야 합니다.')
        return false
      }
    }
    setError(null)
    return true
  }

  const buildPayload = (): CreatePersonInput => {
    const input: CreatePersonInput = {
      name: name.trim(),
      surname: surname.trim() || undefined,
      middleName: middleName.trim() || undefined,
      nameDisplayOrder: nameFormat,
      originalName: originalName.trim() || null,
      surnameMeaning: surnameMeaning.trim() || null,
      nameMeaning: nameMeaning.trim() || null,
      middleNameMeaning: middleNameMeaning.trim() || null,
      gender: gender || null,
      biography: biography.trim() || undefined,
      profileImageUrl: profileImageUrl.trim() || undefined,
      regnalName: regnalName.trim() || undefined,
      templeName: templeName.trim() || undefined,
      posthumousName: posthumousName.trim() || undefined,
      countryId: countryId || undefined,
      birthCityId: birthCityId || undefined,
      deathCityId: deathCityId || undefined,
      dynastyId: dynastyId || undefined,
      religionId: religionId || undefined,
      jobId: jobId || undefined,
      fatherId: fatherId || undefined,
      motherId: motherId || undefined,
      spouseRelations:
        spouseId ? [{ spouseId, marriageStartDate: undefined, marriageEndDate: undefined, note: undefined }] : undefined,
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
    try {
      if (isEditMode && editPersonId) {
        await personApi.update(editPersonId, buildPayload())
        toast.success('인물 정보가 수정되었습니다.')
        onSuccess?.(editPersonId)
        onCancel()
      } else {
        const created = await personApi.create(buildPayload())
        const personId = (created as any)?.id ?? (created as any)?.data?.id
        toast.success('인물이 등록되었습니다.')
        onSuccess?.(personId)
        onCancel()
      }
    } catch (err: any) {
      setError(err?.message ?? (isEditMode ? '수정에 실패했습니다.' : '등록에 실패했습니다.'))
      toast.error(err?.message ?? (isEditMode ? '수정에 실패했습니다.' : '등록에 실패했습니다.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const personListForSelect = persons

  const formContent = (
    <>
      <FormHeader>
        <BackButton type="button" onClick={onCancel}>
          <FiArrowLeft size={18} />
          목록 보기
        </BackButton>
        <FormHeaderTitle>{isEditMode ? '인물 수정' : '인물 등록'}</FormHeaderTitle>
        <SubmitButton
          type="submit"
          form="person-register-form"
          disabled={isSubmitting}
        >
          {isSubmitting ? (isEditMode ? '저장 중…' : '등록 중…') : isEditMode ? '저장' : '등록'}
        </SubmitButton>
      </FormHeader>
      <form id="person-register-form" onSubmit={handleSubmit}>
        <FormSectionInner>
          <TabNavigation>
            <TabButton type="button" $active={activeTab === 'basic'} onClick={() => setActiveTab('basic')}>
              <FiInfo size={16} />
              기본 정보
            </TabButton>
            <TabButton type="button" $active={activeTab === 'affiliation'} onClick={() => setActiveTab('affiliation')}>
              <FiGlobe size={16} />
              소속 · 가문
            </TabButton>
            <TabButton type="button" $active={activeTab === 'family'} onClick={() => setActiveTab('family')}>
              <FiUsers size={16} />
              가족
            </TabButton>
          </TabNavigation>
          {activeTab === 'basic' && (
            <FormRows>
              <ThumbnailWrap>
                <FieldLabel style={{ paddingTop: 8 }}>썸네일</FieldLabel>
                <FieldControl>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ThumbnailPreview htmlFor="person-thumbnail-upload" $hasImage={!!profileImageUrl}>
                      {profileImageUrl ? (
                        <img src={getUploadImageUrl(profileImageUrl) || profileImageUrl} alt="프로필" />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      )}
                    </ThumbnailPreview>
                    {thumbnailUploading && <span style={{ fontSize: 13, color: '#64748b' }}>업로드 중…</span>}
                    <ThumbnailUploadInput
                      id="person-thumbnail-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      disabled={thumbnailUploading}
                    />
                  </div>
                </FieldControl>
              </ThumbnailWrap>
              <FieldRow>
                <FieldLabel>성 · 이름 · 중간이름 <Required>*</Required></FieldLabel>
                <FieldControl>
                  <InlineFields $cols={3}>
                    <Input value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="성 (예: 김)" />
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 (예: 홍길동)" />
                    <Input value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="중간이름" />
                  </InlineFields>
                </FieldControl>
              </FieldRow>
              <FieldRow>
                <FieldLabel>이름 원어</FieldLabel>
                <FieldControl>
                  <Input value={originalName} onChange={(e) => setOriginalName(e.target.value)} placeholder="예: Franklin D. Roosevelt" />
                </FieldControl>
              </FieldRow>
              <CheckboxRowTwo>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={isBirthDateUnknown} onChange={(e) => setIsBirthDateUnknown(e.target.checked)} />
                  출생일 미상
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={isDeathDateUnknown} onChange={(e) => setIsDeathDateUnknown(e.target.checked)} />
                  사망일 미상
                </label>
              </CheckboxRowTwo>
              <FieldRow>
                <FieldLabel>출생일 · 사망일</FieldLabel>
                <FieldControl>
                  <DateFieldsRow>
                    <DateFieldBtn type="button" $hasValue={!!birthYear.trim()} onClick={() => setShowBirthDateModal(true)}>
                      <FiCalendar size={18} />
                      <span>{formatDateDisplay(birthEra, birthYear, birthMonth, birthDay)}</span>
                      <FiChevronDown size={16} />
                    </DateFieldBtn>
                    <DateFieldBtn type="button" $hasValue={!!deathYear.trim()} onClick={() => setShowDeathDateModal(true)}>
                      <FiCalendar size={18} />
                      <span>{formatDateDisplay(deathEra, deathYear, deathMonth, deathDay)}</span>
                      <FiChevronDown size={16} />
                    </DateFieldBtn>
                  </DateFieldsRow>
                </FieldControl>
              </FieldRow>
              <FieldRowMulti>
                <FieldLabel>성의 뜻 / 이름의 뜻 / 중간이름의 뜻</FieldLabel>
                <FieldControl>
                  <InlineFields $cols={3}>
                    <Input value={surnameMeaning} onChange={(e) => setSurnameMeaning(e.target.value)} placeholder="성의 뜻" />
                    <Input value={nameMeaning} onChange={(e) => setNameMeaning(e.target.value)} placeholder="이름의 뜻" />
                    <Input value={middleNameMeaning} onChange={(e) => setMiddleNameMeaning(e.target.value)} placeholder="중간이름의 뜻" />
                  </InlineFields>
                </FieldControl>
              </FieldRowMulti>
              <FieldRow>
                <FieldLabel>성별 <Required>*</Required></FieldLabel>
                <FieldControl>
                  <SelectBtn type="button" $hasValue={!!gender} onClick={() => setShowGenderModal(true)}>
                    <span>{GENDER_OPTIONS.find((o) => o.value === gender)?.label ?? '선택'}</span>
                    <FiChevronDown size={18} />
                  </SelectBtn>
                  <SelectModal isOpen={showGenderModal} onClose={() => setShowGenderModal(false)} options={GENDER_OPTIONS} selectedValue={gender} onSelect={(v) => { setGender(v); setShowGenderModal(false) }} title="성별 선택" />
                </FieldControl>
              </FieldRow>
            </FormRows>
          )}

          {activeTab === 'affiliation' && (
            <FormRows>
              <FieldRow>
                <FieldLabel>소속(출생) 국가 <Required>*</Required></FieldLabel>
                <FieldControl>
                  <SelectBtn type="button" $hasValue={!!countryName} onClick={() => setShowCountryModal(true)}>
                    <span>{countryName || '국가 선택'}</span>
                    <FiChevronDown size={18} />
                  </SelectBtn>
                  <CountrySelectModal isOpen={showCountryModal} onClose={() => setShowCountryModal(false)} onSelect={handleCountrySelect} modernCountries={modernCountries} historicalCountries={historicalCountries} title="소속 국가 선택" selectedCountryId={countryId || undefined} />
                </FieldControl>
              </FieldRow>
              {countryId && cities.length > 0 && (
                <FieldRow>
                  <FieldLabel>출생지 · 사망지 (도시)</FieldLabel>
                  <FieldControl>
                    <InlineFields2>
                      <NativeSelect value={birthCityId} onChange={(e) => setBirthCityId(e.target.value)}>
                        <option value="">출생지 선택</option>
                        {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </NativeSelect>
                      <NativeSelect value={deathCityId} onChange={(e) => setDeathCityId(e.target.value)}>
                        <option value="">사망지 선택</option>
                        {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </NativeSelect>
                    </InlineFields2>
                  </FieldControl>
                </FieldRow>
              )}
              <FieldRowMulti>
                <FieldLabel>가문 · 종교 · 직업</FieldLabel>
                <FieldControl>
                  <InlineFields $cols={3}>
                    <div>
                      <SelectBtn type="button" $hasValue={!!dynastyName} onClick={() => setShowDynastyModal(true)}><span>{dynastyName || '가문'}</span><FiChevronDown size={16} /></SelectBtn>
                      <SelectModal isOpen={showDynastyModal} onClose={() => setShowDynastyModal(false)} options={[{ value: '', label: '선택 안 함' }, ...dynasties.map((d) => ({ value: d.id, label: d.name }))]} selectedValue={dynastyId} onSelect={(v) => { setDynastyId(v); setShowDynastyModal(false) }} title="가문 선택" />
                    </div>
                    <div>
                      <SelectBtn type="button" $hasValue={!!religionName} onClick={() => setShowReligionModal(true)}><span>{religionName || '종교'}</span><FiChevronDown size={16} /></SelectBtn>
                      <SelectModal isOpen={showReligionModal} onClose={() => setShowReligionModal(false)} options={[{ value: '', label: '선택 안 함' }, ...religions.map((r) => ({ value: r.id, label: r.name }))]} selectedValue={religionId} onSelect={(v) => { setReligionId(v); setShowReligionModal(false) }} title="종교 선택" />
                    </div>
                    <div>
                      <SelectBtn type="button" $hasValue={!!jobName} onClick={() => setShowJobModal(true)}><span>{jobName || '직업'}</span><FiChevronDown size={16} /></SelectBtn>
                      <SelectModal isOpen={showJobModal} onClose={() => setShowJobModal(false)} options={[{ value: '', label: '선택 안 함' }, ...jobs.map((j) => ({ value: j.id, label: getJobLabel(j) }))]} selectedValue={jobId} onSelect={(v) => { setJobId(v); setShowJobModal(false) }} title="직업 선택" />
                    </div>
                  </InlineFields>
                </FieldControl>
              </FieldRowMulti>
            </FormRows>
          )}

          {activeTab === 'family' && (
            <FormRows>
              <FieldRow>
                <FieldLabel>아버지</FieldLabel>
                <FieldControl>
                  <SelectBtn type="button" $hasValue={!!fatherName} onClick={() => setShowFatherModal(true)}><span>{fatherName || '선택'}</span><FiChevronDown size={18} /></SelectBtn>
                  {showFatherModal && <PersonSelectModal persons={personListForSelect} selectedPersonId={fatherId} onSelect={(id) => { setFatherId(id); setShowFatherModal(false) }} onClose={() => setShowFatherModal(false)} />}
                </FieldControl>
              </FieldRow>
              <FieldRow>
                <FieldLabel>어머니</FieldLabel>
                <FieldControl>
                  <SelectBtn type="button" $hasValue={!!motherName} onClick={() => setShowMotherModal(true)}><span>{motherName || '선택'}</span><FiChevronDown size={18} /></SelectBtn>
                  {showMotherModal && <PersonSelectModal persons={personListForSelect} selectedPersonId={motherId} onSelect={(id) => { setMotherId(id); setShowMotherModal(false) }} onClose={() => setShowMotherModal(false)} />}
                </FieldControl>
              </FieldRow>
              <FieldRow>
                <FieldLabel>배우자</FieldLabel>
                <FieldControl>
                  <SelectBtn type="button" $hasValue={!!spouseName} onClick={() => setShowSpouseModal(true)}><span>{spouseName || '선택'}</span><FiChevronDown size={18} /></SelectBtn>
                  {showSpouseModal && <PersonSelectModal persons={personListForSelect} selectedPersonId={spouseId} onSelect={(id) => { setSpouseId(id); setShowSpouseModal(false) }} onClose={() => setShowSpouseModal(false)} />}
                </FieldControl>
              </FieldRow>
            </FormRows>
          )}

              {error && <ErrorText>{error}</ErrorText>}
            </FormSectionInner>
      </form>

      {showBirthDateModal && (
        <DatePickerModal
          isOpen={showBirthDateModal}
          onClose={() => setShowBirthDateModal(false)}
          onSelect={handleBirthDateSelect}
          initialDate={buildInitialDate(birthEra, birthYear, birthMonth, birthDay)}
          title="출생일 선택"
        />
      )}
      {showDeathDateModal && (
        <DatePickerModal
          isOpen={showDeathDateModal}
          onClose={() => setShowDeathDateModal(false)}
          onSelect={handleDeathDateSelect}
          initialDate={buildInitialDate(deathEra, deathYear, deathMonth, deathDay)}
          title="사망일 선택"
        />
      )}
    </>
  )

  return embedInCard ? <FormCardWrapper>{formContent}</FormCardWrapper> : formContent
}
