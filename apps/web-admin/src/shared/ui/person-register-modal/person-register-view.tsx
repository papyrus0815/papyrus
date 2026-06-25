/**
 * 인물 등록·수정 뷰.
 * - 역대 수반 폼과 같은 공용 레이아웃을 쓰되 인물 폼 전용 인터랙션을 가진다:
 *   인라인 세그먼트(성별·사망유형), 박스로 묶인 출생/사망, 고급 정보 접기,
 *   탭 카운트 배지·완료 인디케이터, 이름 미리보기·향년, 가족 카드,
 *   썸네일 drag&drop·paste, sticky 저장 푸터, localStorage draft.
 */
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCamera,
  FiChevronDown,
  FiChevronRight,
  FiRotateCcw,
  FiTrash2,
} from 'react-icons/fi'

import { getAllCountries } from '@/shared/api/countries'
import type { CountryResponseDto } from '@/shared/api/countries'
import { dynastyApi } from '@/shared/api/dynasty'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import {
  type CreatePersonDto as CreatePersonInput,
  type UpdatePersonDto as UpdatePersonInput,
  type SpouseRelationInput,
  type Era,
  createPerson,
  updatePerson,
} from '@/shared/api/persons'
import { type PersonResponseDto, getAllPersons } from '@/shared/api/persons'
import { onContentRegistered } from '@/entities/gamification'
import { getPersonDetailById } from '@/shared/api/persons-detail'
import { getAllReligions } from '@/shared/api/religions'
import {
  getUploadImageUrl,
  uploadImage,
  validateImageFile,
} from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog'
import { CountrySelectModal } from '@/shared/ui/country-select-modal/country-select-modal'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { FormInput } from '@/shared/ui/form-input/form-input'
import { SegmentControl } from '@/shared/ui/segment-control/segment-control'
import { SelectModal } from '@/shared/ui/select-modal/select-modal'
import { type PlaceResult } from '@/shared/ui/place-autocomplete/place-autocomplete'
import {
  FieldControl,
  FieldLabel,
  FieldRow,
  FormRows,
  FormSectionInner,
  NameOrderControl,
  NameOrderLabel,
  Required,
  SubmitButton,
} from '@/shared/ui/register-form-layout/register-form-layout.styles'
import { notify } from '@/shared/ui/toast'

import {
  GENDER_OPTIONS,
  REQUIRED_MESSAGES,
  type PersonDraftSnapshot,
  buildInitialDate,
  calcLifespan,
  formatRelativeTime,
  parseDateString,
} from './person-register-view.helpers'
import { SelectBtn } from './_form-primitives'
import { AffiliationSection } from './sections/affiliation-section'
import {
  CountryAffiliationsSection,
  hasAffiliationDateError,
  makeAffiliationRow,
  type CountryAffiliationRow,
} from './sections/country-affiliations-section'
import { FamilySection } from './sections/family-section'
import { LifeSection } from './sections/life-section'
import { usePersonDraft } from './use-person-draft.hook'

import {
  AdvancedBody,
  AdvancedSection,
  AdvancedToggle,
  AdvancedToggleBody,
  AdvancedToggleDesc,
  AdvancedToggleIcon,
  AdvancedToggleTitle,
  CoreFieldCell,
  CoreFieldPair,
  DraftBanner,
  DraftBannerActions,
  DraftBannerIcon,
  DraftBannerText,
  DraftDiscardBtn,
  DraftRestoreBtn,
  FieldError,
  HeroMetaChip,
  InlineFields,
  LoadingHost,
  LoadingOverlay,
  MoreToggle,
  NotFoundDesc,
  NotFoundIcon,
  NotFoundPanel,
  NotFoundTitle,
  OriginalNameInputWrap,
  PersonFormLayoutWrap,
  SectionHeader,
  SectionHeaderDesc,
  SectionHeaderTitle,
  ThumbnailCircle,
  ThumbnailHero,
  ThumbnailHeroBody,
  ThumbnailHeroHint,
  ThumbnailHeroMeta,
  ThumbnailHeroName,
  ThumbnailHeroRemoveBtn,
  ThumbnailUploadInput,
  TopAlert,
  UndoToastBody,
  UndoToastButton,
} from './person-register-view.styles'

// 옵션·헬퍼·Draft 타입은 person-register-view.helpers.ts에서 import.

// ─── Component ────────────────────────────────────────────────────────────────

export interface PersonRegisterViewProps {
  initialCountryId?: string | null
  onCancel: () => void
  onSuccess?: (personId: string) => void
  /**
   * create 성공 직후 호출 — 캐시 무효화 등 부수효과 전용.
   * 여기서 모달을 닫거나 페이지를 이동하면 "다른 인물 이어서 등록" 다이얼로그가
   * 그려지기 전에 폼이 언마운트되므로 절대 닫기/이동을 하면 안 된다.
   * 닫기/이동은 다이얼로그 응답 후 onSuccess(닫기 선택) 또는 onCancel로 실행된다.
   */
  onCreated?: (personId: string) => void
  /** 있으면 수정 모드: 해당 인물 로드 후 폼에 채우고 저장 시 update 호출 */
  editPersonId?: string | null
  /** 제출 중 상태 변경 시 부모에게 알림 (외부 하단 버튼 disabled용) */
  onSubmittingChange?: (v: boolean) => void
  /** 폼에 미저장 변경이 있는지 부모에게 알림 (닫기 시 경고용) */
  onDirtyChange?: (dirty: boolean) => void
  /** 필수 필드 채움 변화 — 모달 헤더 인디케이터/사이드 인덱스용 */
  onValuesChange?: (values: {
    name: boolean
    surname: boolean
    gender: boolean
    countryId: boolean
  }) => void
  /** 제출 버튼 라벨이 변할 때 부모에게 알림 (페이지 모드 sticky 푸터 버튼용) */
  onSubmitLabelChange?: (label: string) => void
  /**
   * 현재 렌더 중인 폼 섹션 목록 — 모달 셸의 좌측 scroll-spy 인덱스용.
   * "더 입력"이 접히면 상세 섹션은 빠지고, 펼치면 추가된다(없는 앵커 클릭 방지).
   */
  onSectionsChange?: (
    sections: { id: string; label: string; filled?: boolean }[],
  ) => void
}

/**
 * 폼 필드 단일 레지스트리용 디스크립터.
 * snapshot(저장)·reset(초기화)·restore(임시저장 복원)가 모두 이 목록에서 파생되어,
 * 필드를 추가/삭제할 때 세 곳을 따로 고치다 빠뜨리는 drift를 구조적으로 차단한다.
 */
type FormFieldDesc = {
  key: keyof PersonDraftSnapshot
  /** 현재 값 읽기 (snapshot 직렬화용) */
  get: () => unknown
  /** 기본값으로 초기화 (reset) */
  reset: () => void
  /** 직렬화된 raw 값으로 복원 — 누락 시 기본값 (restore) */
  restore: (raw: unknown) => void
}

/** 타입세이프 필드 디스크립터 팩토리 — 키별 값 타입을 setter와 묶어 캡처. */
function makeFormField<K extends keyof PersonDraftSnapshot>(
  key: K,
  get: () => PersonDraftSnapshot[K],
  set: (v: PersonDraftSnapshot[K]) => void,
  def: PersonDraftSnapshot[K],
): FormFieldDesc {
  return {
    key,
    get,
    reset: () => set(def),
    restore: (raw) => set((raw as PersonDraftSnapshot[K] | undefined) ?? def),
  }
}

export function PersonRegisterView({
  initialCountryId,
  onCancel,
  onSuccess,
  onCreated,
  editPersonId,
  onSubmittingChange,
  onDirtyChange,
  onValuesChange,
  onSubmitLabelChange,
  onSectionsChange,
}: PersonRegisterViewProps) {
  const isEditMode = Boolean(editPersonId)
  // 기본 정보
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [middleName, setMiddleName] = useState('')
  // 'auto' = 소속 국가 기본 순서 따름(저장 시 null). korean/western은 개인 오버라이드.
  const [nameFormat, setNameFormat] = useState<'auto' | 'korean' | 'western'>(
    'auto',
  )
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
  // 추가 국가 소속(다중) — 주 국적 외 출생지·복무·망명 등
  const [countryAffiliations, setCountryAffiliations] = useState<
    CountryAffiliationRow[]
  >([])
  // 소속 행별 국가 선택 모달 대상 (행 key, null이면 닫힘)
  const [affCountryPickerRow, setAffCountryPickerRow] = useState<string | null>(
    null,
  )
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
  /**
   * 수정 모드에서 서버에 저장돼 있던 배우자 관계 전체(payload 형태).
   * 폼은 첫 관계의 배우자·메모만 편집하므로, 결혼 시작/종료일과 둘째 이후 배우자를
   * 여기 보존했다가 저장 시 그대로 왕복시킨다 — 서버는 배열 수신 시 통째 교체(delete-and-recreate)라
   * 보존하지 않으면 결혼일·다중 배우자가 무경고 유실됨.
   */
  const [editSpouseRelations, setEditSpouseRelations] = useState<
    SpouseRelationInput[]
  >([])
  // 기타
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [regnalName, setRegnalName] = useState('')
  const [templeName, setTempleName] = useState('')
  const [posthumousName, setPosthumousName] = useState('')

  const [showCountryModal, setShowCountryModal] = useState(false)
  const [showBirthDateModal, setShowBirthDateModal] = useState(false)
  const [showDeathDateModal, setShowDeathDateModal] = useState(false)
  const [showFatherModal, setShowFatherModal] = useState(false)
  const [showMotherModal, setShowMotherModal] = useState(false)
  const [showSpouseModal, setShowSpouseModal] = useState(false)
  const [showDynastyModal, setShowDynastyModal] = useState(false)
  const [showReligionModal, setShowReligionModal] = useState(false)
  /** 기본 탭의 "이름의 뜻" 접기 영역 */
  const [nameMeaningsOpen, setNameMeaningsOpen] = useState(false)
  /** 생애 탭의 "군주명·묘호·시호" 접기 영역 — 군주가 아닌 인물에겐 영구 무관 */
  const [monarchTitlesOpen, setMonarchTitlesOpen] = useState(false)
  /**
   * 필수-먼저 레이아웃: 코어(이름·성별·국적·생몰)만 기본 노출,
   * 상세(이름원어/뜻·사망상세·군주·소속·가족)는 이 토글로 펼친다.
   * 편집 모드에서 상세값이 있으면 진입 시 1회 자동 펼침(아래 effect).
   */
  const [moreOpen, setMoreOpen] = useState(false)
  const autoExpandedDetailsRef = useRef(false)
  /**
   * 등록 성공 직후 노출하는 다이얼로그 — "다른 인물 이어서 등록할까요?".
   * 사용자가 "다른 인물 등록"을 누르면 폼만 리셋하고 모달은 유지, "닫기"는 onCancel 호출.
   * 이전의 "또 등록" 체크박스를 대체 — 사용자가 사용 직전에 분기를 결정해 직관적.
   */
  const [showRegisterAgainDialog, setShowRegisterAgainDialog] = useState(false)
  /** 다이얼로그에 표시할 직전 등록 인물 — 표시 + recentlyRegistered 누적용. */
  const [lastCreatedPerson, setLastCreatedPerson] =
    useState<PersonResponseDto | null>(null)
  /**
   * 연속 등록(또 등록) 모드에서 직전 회차에 등록한 인물 — 최대 5명, 최신이 앞.
   * 가족 탭에서 부/모/배우자 슬롯 위에 후보 칩으로 노출. 가계 일괄 등록을 가속.
   */
  const [recentlyRegistered, setRecentlyRegistered] = useState<
    PersonResponseDto[]
  >([])
  /**
   * 수정 모드 인물 로드 상태.
   * - idle: 신규 모드 또는 편집 진입 전
   * - loading: detail API 호출 중
   * - loaded: 폼 채움 완료
   * - error: 로드 실패 → 폼 숨김 + NotFoundPanel
   */
  type EditLoadStatus = 'idle' | 'loading' | 'loaded' | 'error'
  const [editLoadStatus, setEditLoadStatus] = useState<EditLoadStatus>('idle')
  const isLoadingEdit = editLoadStatus === 'loading'
  const loadFailed = editLoadStatus === 'error'
  /** 신규 등록 모드에서 폼 강제 reset 트리거. registerAnother 흐름에서 사용. */
  const [resetCounter, setResetCounter] = useState(0)
  /** 썸네일 파일은 등록·저장 시에만 업로드. 미리보기용 blob URL */
  const [pendingThumbnailFile, setPendingThumbnailFile] = useState<File | null>(
    null,
  )
  const [thumbnailObjectUrl, setThumbnailObjectUrl] = useState<string | null>(
    null,
  )
  const [thumbnailDragOver, setThumbnailDragOver] = useState(false)
  /** 수정 시 서버에 있던 썸네일을 저장 시 제거 */
  const [thumbnailMarkedForRemoval, setThumbnailMarkedForRemoval] =
    useState(false)
  /** 제출 중 이미지 업로드 단계(버튼 문구용) */
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isDirty, setIsDirty] = useState(false)
  const dirtyTrackingEnabledRef = useRef(false)
  const uidPrefix = useId()
  const fid = useCallback((k: string) => `${uidPrefix}-${k}`, [uidPrefix])

  /**
   * 편집 모드 등으로 상세 필드에 값이 차면 "더 입력" 영역을 1회 자동 펼침.
   * (값이 있는데 접혀 있어 "비어 보이는" 오해를 막음 — 사용자가 닫으면 다시 안 열림)
   */
  /** 상세 필드(이름원어/뜻·사망상세·군주·소속·가족) 중 하나라도 값이 있는지. */
  const hasDetailValues = useMemo(
    () =>
      !!originalName ||
      !!surnameMeaning ||
      !!nameMeaning ||
      !!middleNameMeaning ||
      !!deathType ||
      !!deathCause ||
      !!deathNote ||
      !!regnalName ||
      !!templeName ||
      !!posthumousName ||
      !!birthPlace ||
      !!deathPlace ||
      !!dynastyId ||
      !!religionId ||
      !!fatherId ||
      !!motherId ||
      !!spouseId ||
      !!spouseNote,
    [
      originalName,
      surnameMeaning,
      nameMeaning,
      middleNameMeaning,
      deathType,
      deathCause,
      deathNote,
      regnalName,
      templeName,
      posthumousName,
      birthPlace,
      deathPlace,
      dynastyId,
      religionId,
      fatherId,
      motherId,
      spouseId,
      spouseNote,
    ],
  )

  useEffect(() => {
    if (autoExpandedDetailsRef.current) return
    if (hasDetailValues) {
      setMoreOpen(true)
      autoExpandedDetailsRef.current = true
    }
  }, [hasDetailValues])

  /** draft 복원 배너 — 진입 시 1회만 평가, 사용자 응답 후 사라짐. */
  const [pendingDraftSavedAt, setPendingDraftSavedAt] = useState<number | null>(
    null,
  )
  const draftScopeId = editPersonId ?? 'new'

  const markDirty = useCallback(() => {
    if (dirtyTrackingEnabledRef.current) setIsDirty(true)
  }, [])

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  // 모달 헤더 인디케이터/사이드 인덱스용 — 필수 필드 변화 알림.
  // 콜백을 ref에 보관해 deps에서 빼면 lint 비활성화 없이도 안정적.
  const onValuesChangeRef = useRef(onValuesChange)
  onValuesChangeRef.current = onValuesChange
  useEffect(() => {
    onValuesChangeRef.current?.({
      name: !!name?.trim(),
      surname: !!surname?.trim(),
      gender: !!gender,
      countryId: !!countryId,
    })
  }, [name, surname, gender, countryId])

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
  /**
   * 수정 모드에서 detail 응답에 임베드된 가족 인물 캐시.
   * 인물 풀(persons)이 lazy 로드되기 전이라도 가족 카드를 정확히 그리기 위해.
   */
  const [editFamilyCache, setEditFamilyCache] = useState<{
    father?: PersonResponseDto
    mother?: PersonResponseDto
    spouse?: PersonResponseDto
  }>({})

  /** id → 인물 — 가족 카드 렌더용. persons 풀 + 수정 모드 캐시 합집합. */
  const personById = useMemo(() => {
    const m = new Map<string, PersonResponseDto>()
    persons.forEach((p) => m.set(p.id, p))
    if (editFamilyCache.father)
      m.set(editFamilyCache.father.id, editFamilyCache.father)
    if (editFamilyCache.mother)
      m.set(editFamilyCache.mother.id, editFamilyCache.mother)
    if (editFamilyCache.spouse)
      m.set(editFamilyCache.spouse.id, editFamilyCache.spouse)
    return m
  }, [persons, editFamilyCache])

  /**
   * 가족 슬롯별 "최근 등록한 인물" 후보 — 현재 인물 + 이미 다른 슬롯에 들어간 인물을 제외.
   * 같은 인물을 두 슬롯에 동시 지정할 수 없으므로 모든 슬롯에서 동일 풀을 사용.
   */
  const recentCandidates = useMemo(() => {
    if (recentlyRegistered.length === 0) return []
    return recentlyRegistered.filter((p) => {
      if (p.id === editPersonId) return false
      if (p.id === fatherId) return false
      if (p.id === motherId) return false
      if (p.id === spouseId) return false
      return true
    })
  }, [recentlyRegistered, editPersonId, fatherId, motherId, spouseId])

  /** countryId → defaultNameDisplayOrder. 이름 미리보기 순서 결정용. */
  const countryNameOrderById = useMemo(() => {
    const m = new Map<string, 'korean' | 'western'>()
    modernCountries.forEach((c) => {
      const order = (c as { defaultNameDisplayOrder?: string | null })
        .defaultNameDisplayOrder
      m.set(c.id, order === 'western' ? 'western' : 'korean')
    })
    historicalCountries.forEach((c) => {
      // HistoricalCountry에는 자체 표시순서 필드가 없음 — 서버 해석(resolveCountryBlockForName)과
      // 동일하게 연결된 현대 국가(modernConnections[0] = parentModernCountryIds[0])의 기본값을 따른다.
      const parentId = c.parentModernCountryIds?.[0]
      const parentOrder = parentId ? m.get(parentId) : undefined
      m.set(c.id, parentOrder ?? 'korean')
    })
    return m
  }, [modernCountries, historicalCountries])

  /** 폼이 표시할 이름 미리보기 — 국가의 표시 순서 기준. */
  const namePreview = useMemo(() => {
    if (!name.trim() && !surname.trim() && !middleName.trim()) return ''
    // 개인 오버라이드가 있으면 우선, 'auto'면 국가 기본(없으면 동양식).
    const order =
      nameFormat !== 'auto'
        ? nameFormat
        : (countryNameOrderById.get(countryId) ?? 'korean')
    return getPersonDisplayName(
      {
        name,
        surname,
        middleName,
        country: { defaultNameDisplayOrder: order },
      },
      false,
    )
  }, [name, surname, middleName, countryId, countryNameOrderById, nameFormat])

  /** 향년 계산 — 둘 다 정상값일 때만. */
  const lifespanText = useMemo(() => {
    if (
      isBirthDateUnknown ||
      isAlive ||
      isDeathDateUnknown ||
      !birthYear.trim() ||
      !deathYear.trim()
    ) {
      return null
    }
    const by = parseInt(birthYear, 10)
    const dy = parseInt(deathYear, 10)
    if (isNaN(by) || isNaN(dy)) return null
    const age = calcLifespan(
      {
        era: birthEra,
        year: by,
        month: birthMonth ? parseInt(birthMonth, 10) : undefined,
        day: birthDay ? parseInt(birthDay, 10) : undefined,
      },
      {
        era: deathEra,
        year: dy,
        month: deathMonth ? parseInt(deathMonth, 10) : undefined,
        day: deathDay ? parseInt(deathDay, 10) : undefined,
      },
    )
    if (age == null) return null
    return `향년 ${age}세`
  }, [
    isBirthDateUnknown,
    isAlive,
    isDeathDateUnknown,
    birthEra,
    birthYear,
    birthMonth,
    birthDay,
    deathEra,
    deathYear,
    deathMonth,
    deathDay,
  ])

  /** SelectModal 형식 — '선택 안 함' 옵션을 맨 위에 prepend. */
  const dynastySelectOptions = useMemo(
    () => [
      { value: '', label: '선택 안 함' },
      ...dynasties.map((d) => ({ value: d.id, label: d.name })),
    ],
    [dynasties],
  )
  const religionSelectOptions = useMemo(
    () => [
      { value: '', label: '선택 안 함' },
      ...religions.map((r) => ({ value: r.id, label: r.name })),
    ],
    [religions],
  )
  const dynastyLabel = useMemo(
    () => (dynastyId ? (dynasties.find((d) => d.id === dynastyId)?.name ?? '') : ''),
    [dynastyId, dynasties],
  )
  const religionLabel = useMemo(
    () => (religionId ? (religions.find((r) => r.id === religionId)?.name ?? '') : ''),
    [religionId, religions],
  )

  // ─── 데이터 로드 ────────────────────────────────────────────────────────────
  // 인물 풀(getAllPersons)은 가족 탭/선택 모달에서만 필요해 lazy 로드.
  // 인물 수가 늘어났을 때 모달 진입 비용을 낮춤.
  useEffect(() => {
    Promise.all([
      getAllCountries(),
      getAllHistoricalCountries(),
      dynastyApi.getAll(),
      getAllReligions(),
    ])
      .then(([modern, historical, dyn, rel]) => {
        setModernCountries(modern)
        setHistoricalCountries(historical)
        setDynasties(Array.isArray(dyn) ? dyn : [])
        setReligions(Array.isArray(rel) ? rel : [])
      })
      .catch(() => {})
  }, [])

  /** 인물 풀이 한 번이라도 로드되었는지 — 같은 모달 인스턴스 내 중복 호출 방지. */
  const personsLoadedRef = useRef(false)
  /** PersonSelectModal(부·모·배우자)이 열려 있으면 인물 풀 로드. */
  const needsPersons =
    showFatherModal || showMotherModal || showSpouseModal
  useEffect(() => {
    if (!needsPersons || personsLoadedRef.current) return
    personsLoadedRef.current = true
    getAllPersons()
      .then((pers) => {
        setPersons(Array.isArray(pers) ? pers : [])
      })
      .catch(() => {
        personsLoadedRef.current = false
      })
  }, [needsPersons])

  useEffect(() => {
    // 수정 모드에서는 인물 데이터가 권위 — 부모가 흘려보낸 initialCountryId가 덮어쓰지 않게.
    if (editPersonId) return
    setCountryId(initialCountryId ?? '')
    setCountryName('')
  }, [initialCountryId, editPersonId])

  useEffect(() => {
    return () => {
      if (thumbnailObjectUrl) URL.revokeObjectURL(thumbnailObjectUrl)
    }
  }, [thumbnailObjectUrl])

  /**
   * 폼 필드 단일 레지스트리 — snapshot/reset/restore가 모두 여기서 파생.
   * (countryId의 reset만 "또 등록" 국가 보존 로직이 있어 reset effect에서 별도 처리)
   */
  const formFields: FormFieldDesc[] = [
    makeFormField('name', () => name, setName, ''),
    makeFormField('surname', () => surname, setSurname, ''),
    makeFormField('middleName', () => middleName, setMiddleName, ''),
    makeFormField('nameFormat', () => nameFormat, setNameFormat, 'auto'),
    makeFormField('originalName', () => originalName, setOriginalName, ''),
    makeFormField('surnameMeaning', () => surnameMeaning, setSurnameMeaning, ''),
    makeFormField('nameMeaning', () => nameMeaning, setNameMeaning, ''),
    makeFormField(
      'middleNameMeaning',
      () => middleNameMeaning,
      setMiddleNameMeaning,
      '',
    ),
    makeFormField('gender', () => gender, setGender, ''),
    makeFormField(
      'isBirthDateUnknown',
      () => isBirthDateUnknown,
      setIsBirthDateUnknown,
      false,
    ),
    makeFormField('birthEra', () => birthEra, setBirthEra, 'AD'),
    makeFormField('birthYear', () => birthYear, setBirthYear, ''),
    makeFormField('birthMonth', () => birthMonth, setBirthMonth, ''),
    makeFormField('birthDay', () => birthDay, setBirthDay, ''),
    makeFormField(
      'isDeathDateUnknown',
      () => isDeathDateUnknown,
      setIsDeathDateUnknown,
      false,
    ),
    makeFormField('isAlive', () => isAlive, setIsAlive, false),
    makeFormField('deathEra', () => deathEra, setDeathEra, 'AD'),
    makeFormField('deathType', () => deathType, setDeathType, ''),
    makeFormField('deathCause', () => deathCause, setDeathCause, ''),
    makeFormField('deathNote', () => deathNote, setDeathNote, ''),
    makeFormField('deathYear', () => deathYear, setDeathYear, ''),
    makeFormField('deathMonth', () => deathMonth, setDeathMonth, ''),
    makeFormField('deathDay', () => deathDay, setDeathDay, ''),
    makeFormField('countryId', () => countryId, setCountryId, ''),
    makeFormField(
      'countryAffiliations',
      () => countryAffiliations,
      setCountryAffiliations,
      [],
    ),
    makeFormField('birthCityId', () => birthCityId, setBirthCityId, ''),
    makeFormField('deathCityId', () => deathCityId, setDeathCityId, ''),
    makeFormField('birthPlace', () => birthPlace, setBirthPlace, null),
    makeFormField('deathPlace', () => deathPlace, setDeathPlace, null),
    makeFormField('dynastyId', () => dynastyId, setDynastyId, ''),
    makeFormField('religionId', () => religionId, setReligionId, ''),
    makeFormField('fatherId', () => fatherId, setFatherId, ''),
    makeFormField('motherId', () => motherId, setMotherId, ''),
    makeFormField('spouseId', () => spouseId, setSpouseId, ''),
    makeFormField('spouseNote', () => spouseNote, setSpouseNote, ''),
    makeFormField('profileImageUrl', () => profileImageUrl, setProfileImageUrl, ''),
    makeFormField('regnalName', () => regnalName, setRegnalName, ''),
    makeFormField('templeName', () => templeName, setTempleName, ''),
    makeFormField('posthumousName', () => posthumousName, setPosthumousName, ''),
  ]
  /** snapshot이 deps 없이도 최신 값을 읽도록 ref로 노출 (필드 추가 시 deps 누락 무관). */
  const formFieldsRef = useRef(formFields)
  formFieldsRef.current = formFields

  // ─── 신규/수정 진입 시 폼 초기화 또는 서버 로드 ───────────────────────────
  useEffect(() => {
    dirtyTrackingEnabledRef.current = false
    setIsDirty(false)
    setErrors({})

    if (!editPersonId) {
      setEditLoadStatus('idle')
      // 등록 모드 전환 시 폼 초기화
      setNameMeaningsOpen(false)
      setMonarchTitlesOpen(false)
      setMoreOpen(false)
      autoExpandedDetailsRef.current = false
      // "또 등록" 흐름에서 직전 등록 국가 보존(`preserveCountryIdRef`).
      // 일반 reset에서는 initialCountryId(부모가 흘린 값)으로 폴백.
      const nextCountryId = preserveCountryIdRef.current ?? initialCountryId ?? ''
      preserveCountryIdRef.current = null
      // 폼 필드는 레지스트리에서 일괄 초기화 — countryId만 보존 국가로 대체.
      formFieldsRef.current.forEach((field) =>
        field.key === 'countryId' ? setCountryId(nextCountryId) : field.reset(),
      )
      // 스냅샷 외 transient 상태는 명시 초기화.
      // countryName은 보존된 countryId가 있으면 즉시 재계산 — countryId 값이 동일하면
      // 이름 조회 effect(deps: countryId)가 재실행되지 않아 버튼이 '국가 선택'으로 비어 보임.
      setCountryName(
        nextCountryId
          ? (modernCountries.find((country) => country.id === nextCountryId)
              ?.name ??
              historicalCountries.find(
                (country) => country.id === nextCountryId,
              )?.name ??
              '')
          : '',
      )
      setPendingThumbnailFile(null)
      setThumbnailObjectUrl(null)
      setThumbnailMarkedForRemoval(false)
      setEditFamilyCache({})
      setEditSpouseRelations([])
      requestAnimationFrame(() => {
        dirtyTrackingEnabledRef.current = true
      })
      return
    }

    let cancelled = false
    setEditLoadStatus('loading')
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
          p.nameDisplayOrder === 'western'
            ? 'western'
            : p.nameDisplayOrder === 'korean'
              ? 'korean'
              : 'auto',
        )
        setOriginalName(p.originalName ?? '')
        setSurnameMeaning(p.surnameMeaning ?? '')
        setNameMeaning(p.nameMeaning ?? '')
        setMiddleNameMeaning(p.middleNameMeaning ?? '')
        setGender(p.gender ?? '')
        setProfileImageUrl(p.profileImageUrl ?? '')
        setRegnalName(p.regnalName ?? '')
        setTempleName(p.templeName ?? '')
        setPosthumousName(p.posthumousName ?? '')
        setCountryId(p.countryId ?? '')
        // 주 국적(priority 0 CITIZENSHIP)은 countryId가 담당 → 그 외 소속만 행으로 로드
        setCountryAffiliations(
          ((p as any).countryAffiliations ?? [])
            .filter(
              (a: any) =>
                !(
                  a.affiliationType === 'CITIZENSHIP' &&
                  (a.priority ?? 1) === 0
                ),
            )
            .map((a: any) =>
              makeAffiliationRow({
                affiliationType: a.affiliationType ?? 'CITIZENSHIP',
                countryId: a.countryId ?? undefined,
                historicalCountryId: a.historicalCountryId ?? undefined,
                countryLabel:
                  a.historicalCountry?.name ?? a.country?.name ?? '',
                startDate: a.startDate
                  ? String(a.startDate).slice(0, 10)
                  : undefined,
                endDate: a.endDate ? String(a.endDate).slice(0, 10) : undefined,
                note: a.note ?? undefined,
                // 정렬 메타 — 폼에 편집 UI는 없지만 보존해 왕복(미보존 시 서버가 전부 1로 재기록).
                priority: a.priority ?? undefined,
              }),
            ),
        )
        setBirthCityId(p.birthCityId ?? '')
        setDeathCityId(p.deathCityId ?? '')
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
        // 배우자 관계 전체(결혼 시작/종료일·둘째 이후 배우자 포함)를 payload 형태로 보존 —
        // 저장 시 그대로 왕복시켜 통째 교체(deleteMany→createMany)에 의한 유실을 막는다.
        const spouseRels: SpouseRelationInput[] = (p.spouseRelations ?? [])
          .filter((rel: any) => rel?.spouse?.id)
          .map((rel: any) => ({
            spouseId: String(rel.spouse.id),
            marriageStartDate: rel.marriageStartDate ?? undefined,
            marriageEndDate: rel.marriageEndDate ?? undefined,
            note: rel.note ?? null,
          }))
        setEditSpouseRelations(spouseRels)
        setSpouseId(spouseRels[0]?.spouseId ?? p.spouseId ?? '')
        setSpouseNote(spouseRels[0]?.note ?? '')
        // detail 응답의 임베디드 인물을 가족 캐시에 보관 — 인물 풀 lazy 로드 전에도 카드 정확.
        setEditFamilyCache({
          father: p.father ?? undefined,
          mother: p.mother ?? undefined,
          spouse: p.spouseRelations?.[0]?.spouse ?? undefined,
        })
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
        // 이름의 뜻이 있으면 기본 탭의 collapse 자동 펼침.
        const hasNameMeanings =
          (p.surnameMeaning && String(p.surnameMeaning).trim()) ||
          (p.nameMeaning && String(p.nameMeaning).trim()) ||
          (p.middleNameMeaning && String(p.middleNameMeaning).trim())
        setNameMeaningsOpen(Boolean(hasNameMeanings))
        // 군주 호칭이 있으면 생애 탭의 collapse 자동 펼침.
        const hasMonarchTitles =
          (p.regnalName && String(p.regnalName).trim()) ||
          (p.templeName && String(p.templeName).trim()) ||
          (p.posthumousName && String(p.posthumousName).trim())
        setMonarchTitlesOpen(Boolean(hasMonarchTitles))
        setEditLoadStatus('loaded')
      })
      .catch(() => {
        if (cancelled) return
        setEditLoadStatus('error')
        notify.error('인물 정보를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (cancelled) return
        requestAnimationFrame(() => {
          dirtyTrackingEnabledRef.current = true
        })
      })
    return () => {
      cancelled = true
    }
  }, [editPersonId, initialCountryId, resetCounter])

  useEffect(() => {
    if (!countryId || (!modernCountries.length && !historicalCountries.length))
      return
    const modern = modernCountries.find((c) => c.id === countryId)
    const historical = historicalCountries.find((c) => c.id === countryId)
    if (modern) setCountryName(modern.name)
    else if (historical) setCountryName(historical.name ?? '')
  }, [countryId, modernCountries, historicalCountries])

  // ─── Draft (localStorage) ──────────────────────────────────────────────────
  // 레지스트리에서 직렬화 — 필드별 deps 나열 없이 항상 최신 값을 읽는다(formFieldsRef).
  const buildDraftSnapshot = useCallback((): PersonDraftSnapshot => {
    const snap: Record<string, unknown> = {}
    for (const field of formFieldsRef.current) snap[field.key] = field.get()
    return snap as PersonDraftSnapshot
  }, [])

  const draft = usePersonDraft<PersonDraftSnapshot>({
    scopeId: draftScopeId,
    getSnapshot: buildDraftSnapshot,
    // 임시저장은 신규 등록 전용 — 수정 모드에서 옛 draft가 되살아나 서버 데이터를
    // 덮어쓰는 위험 차단(셸 draftEnabled={!isEdit} 정책과 일치).
    enabled: !isEditMode && isDirty && !isSubmitting,
  })

  // dirty 변경 시 throttled save 트리거
  useEffect(() => {
    if (isDirty) draft.scheduleSave()
  }, [isDirty, draft])

  // 진입 시(또는 수정 데이터 로딩 후) 저장된 draft 발견되면 배너 표시
  const draftPeekedRef = useRef<string | null>(null)
  useEffect(() => {
    // 수정 모드는 draft 비활성 — 옛 임시본 배너/복원으로 서버 데이터를 덮지 않게 skip.
    if (isEditMode) return
    if (isLoadingEdit) return
    if (draftPeekedRef.current === draftScopeId) return
    draftPeekedRef.current = draftScopeId
    const env = draft.peekDraft()
    if (env && env.savedAt) {
      setPendingDraftSavedAt(env.savedAt)
    }
  }, [draftScopeId, isLoadingEdit, draft, isEditMode])

  const restoreDraft = () => {
    const env = draft.peekDraft()
    if (!env) {
      setPendingDraftSavedAt(null)
      return
    }
    const d = env.data
    // dirty 추적 일시 정지 — 한 번에 setState 채우는 동안.
    dirtyTrackingEnabledRef.current = false
    // 폼 필드는 레지스트리에서 일괄 복원 (누락 키는 각 필드 기본값).
    formFieldsRef.current.forEach((field) =>
      field.restore((d as Record<string, unknown>)[field.key]),
    )
    setPendingDraftSavedAt(null)
    requestAnimationFrame(() => {
      dirtyTrackingEnabledRef.current = true
      // 복원 직후엔 dirty=false. 사용자가 복원 후 추가 입력 없이 닫으면
      // 다시 confirm을 띄울 필요 없음.
      setIsDirty(false)
    })
    notify.success('임시 저장된 내용을 복원했습니다.')
  }

  const dismissDraft = () => {
    draft.discardDraft()
    setPendingDraftSavedAt(null)
  }

  // ─── 핸들러 ────────────────────────────────────────────────────────────────
  /**
   * "또 등록" 흐름에서 다음 라운드에 보존할 국가 ID — reset effect가 이 값을 읽어
   * `initialCountryId` 대신 사용. 사용자가 모달 처음 열 때 initialCountryId가
   * 비어있어도 직전 등록 국가가 자동으로 유지된다.
   */
  const preserveCountryIdRef = useRef<string | null>(null)

  /** 등록 성공 다이얼로그 — "다른 인물 등록" 선택 시 폼 리셋, 모달은 유지(직전 국가 보존). */
  const handleRegisterAnother = () => {
    setShowRegisterAgainDialog(false)
    setLastCreatedPerson(null)
    preserveCountryIdRef.current = countryId || null
    setResetCounter((n) => n + 1)
  }

  /**
   * 등록 성공 다이얼로그 — "닫기" 선택 시 비로소 닫기/이동 실행.
   * onSuccess가 있으면 위임(모달=닫기, 페이지=등록 인물 상세 이동), 없으면 onCancel.
   * create 직후에는 onCreated(캐시 무효화 전용)만 호출되므로 다이얼로그가 살아 있다.
   */
  const handleClosePostSuccess = () => {
    setShowRegisterAgainDialog(false)
    const createdId = lastCreatedPerson?.id
    setLastCreatedPerson(null)
    if (createdId && onSuccess) onSuccess(createdId)
    else onCancel()
  }

  const handleCountrySelect = (c: { id: string; name: string }) => {
    const prev = countryId
    setCountryId(c.id)
    setCountryName(c.name)
    setShowCountryModal(false)
    clearFieldError('countryId')
    markDirty()
    // 출생지/사망지는 이전 국가의 도시·행정구역 ID에 묶여 있어 국가가 바뀌면 데이터 정합이 깨짐.
    // 자동으로 비우고 "되돌리기" 액션을 제공해 실수 회복을 빠르게.
    if (prev && prev !== c.id && (birthPlace || deathPlace)) {
      const snapshot = {
        birthPlace,
        deathPlace,
        birthCityId,
        deathCityId,
      }
      setBirthPlace(null)
      setBirthCityId('')
      setDeathPlace(null)
      setDeathCityId('')
      notify.show(
        (t) => (
          <UndoToastBody>
            <span>출생지·사망지를 비웠습니다</span>
            <UndoToastButton
              type="button"
              onClick={() => {
                setBirthPlace(snapshot.birthPlace)
                setBirthCityId(snapshot.birthCityId)
                setDeathPlace(snapshot.deathPlace)
                setDeathCityId(snapshot.deathCityId)
                notify.dismiss(t.id)
              }}
            >
              되돌리기
            </UndoToastButton>
          </UndoToastBody>
        ),
        { duration: 6000, icon: '🔄' },
      )
    }
  }

  /**
   * 사망 상태 3-way 전환 — alive / deceased / unknown.
   * - alive: 사망일 비움. 사망 상세(유형·원인·메모) 값은 보존(취소 복구용); payload에서 nullify.
   * - deceased: 사망일 미상=false. 신규 등록 + 출생일 있음 + 사망일 비어 있으면 사망일 모달 자동.
   * - unknown: 사망일 미상=true, 입력된 사망일 비움.
   */
  const setDeathStatus = (status: 'alive' | 'deceased' | 'unknown') => {
    if (status === 'alive') {
      if (isAlive) return
      setIsAlive(true)
      setIsDeathDateUnknown(false)
      setDeathYear('')
      setDeathMonth('')
      setDeathDay('')
      clearFieldError('death')
      markDirty()
      return
    }
    if (status === 'deceased') {
      if (!isAlive && !isDeathDateUnknown) return
      setIsAlive(false)
      setIsDeathDateUnknown(false)
      markDirty()
      // 사망 전환 + 사망일 미입력이면 피커 자동 노출(신규 등록 한정 — 편집 중엔 깜짝 모달 방지).
      // 자동 오픈 로직은 여기 한 곳에만 둔다(life-section onClick 중복 제거).
      if (!isEditMode && !deathYear.trim()) {
        setTimeout(() => setShowDeathDateModal(true), 200)
      }
      return
    }
    // unknown
    if (!isAlive && isDeathDateUnknown) return
    setIsAlive(false)
    setIsDeathDateUnknown(true)
    setDeathYear('')
    setDeathMonth('')
    setDeathDay('')
    clearFieldError('death')
    markDirty()
  }

  /** 사망지를 출생지와 동일하게 빠르게 채움. */
  const handleCopyBirthToDeathPlace = () => {
    if (!birthPlace) return
    setDeathPlace(birthPlace)
    setDeathCityId(birthPlace.cityId ?? '')
    markDirty()
    notify.success('출생지를 사망지로 복사했습니다.')
  }

  const handleBirthDateSelect = (date: string) => {
    const { era, year, month, day } = parseDateString(date)
    const yStr = year.toString()
    const mStr = month.toString()
    const dStr = day.toString()
    setBirthEra(era)
    setBirthYear(yStr)
    setBirthMonth(mStr)
    setBirthDay(dStr)
    setShowBirthDateModal(false)
    markDirty()
    // 인라인 검증 — 새 출생일 + 기존 사망일 조합으로 즉시 피드백.
    const errs = computeBirthDeathErrors(
      { era, year: yStr, month: mStr, day: dStr, unknown: isBirthDateUnknown },
      {
        era: deathEra,
        year: deathYear,
        month: deathMonth,
        day: deathDay,
        unknown: isDeathDateUnknown,
        alive: isAlive,
      },
    )
    setOrClearError('birth', errs.birth)
    setOrClearError('death', errs.death)
    // 신규 등록 시에만 사망일 모달을 자동으로 띄움.
    if (!isDeathDateUnknown && !isAlive && !isEditMode && !deathYear.trim()) {
      setTimeout(() => setShowDeathDateModal(true), 200)
    }
  }

  const handleDeathDateSelect = (date: string) => {
    const { era, year, month, day } = parseDateString(date)
    const yStr = year.toString()
    const mStr = month.toString()
    const dStr = day.toString()
    setDeathEra(era)
    setDeathYear(yStr)
    setDeathMonth(mStr)
    setDeathDay(dStr)
    setShowDeathDateModal(false)
    markDirty()
    const errs = computeBirthDeathErrors(
      {
        era: birthEra,
        year: birthYear,
        month: birthMonth,
        day: birthDay,
        unknown: isBirthDateUnknown,
      },
      { era, year: yStr, month: mStr, day: dStr, unknown: isDeathDateUnknown, alive: isAlive },
    )
    setOrClearError('birth', errs.birth)
    setOrClearError('death', errs.death)
  }

  const acceptThumbnailFile = (file: File) => {
    try {
      validateImageFile(file)
      setThumbnailObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(file)
      })
      setPendingThumbnailFile(file)
      setThumbnailMarkedForRemoval(false)
      markDirty()
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : '이미지를 선택할 수 없습니다.',
      )
    }
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    acceptThumbnailFile(file)
  }

  const handleThumbnailDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setThumbnailDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) acceptThumbnailFile(file)
  }

  // 폼 영역에서 paste 시 이미지 자동 붙여넣기.
  // form element 단위로 listen — document 글로벌 listener는 다른 모달이 동시에 열려 있을 때 충돌.
  useEffect(() => {
    const formEl = formRef.current
    if (!formEl) return
    const onPaste = (e: ClipboardEvent) => {
      // 텍스트 입력 영역(input/textarea/contenteditable) 내부 paste는 무시 — 사용자 텍스트 입력 우선.
      const target = e.target as HTMLElement | null
      if (!target) return
      const tag = target.tagName?.toLowerCase()
      if (
        tag === 'input' ||
        tag === 'textarea' ||
        target.isContentEditable
      ) {
        return
      }
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        if (it.kind === 'file' && it.type.startsWith('image/')) {
          const file = it.getAsFile()
          if (file) {
            acceptThumbnailFile(file)
            e.preventDefault()
            break
          }
        }
      }
    }
    formEl.addEventListener('paste', onPaste)
    return () => formEl.removeEventListener('paste', onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ⌘Enter / Ctrl+Enter — 폼 어디에서나 빠른 제출. 긴 폼이라 푸터까지 마우스 이동 부담 ↓.
  const formRef = useRef<HTMLFormElement | null>(null)
  /** 소속(affiliation) 행의 시작/종료일 피커 열림 여부 — 자식 섹션이 콜백으로 보고. */
  const [affDateModalOpen, setAffDateModalOpen] = useState(false)
  // 날짜·국가·인물·가문·종교 선택 모달 또는 등록완료 다이얼로그가 떠 있으면
  // ⌘Enter가 그 모달의 입력 중 폼을 제출해버리지 않도록 단축키를 막는다.
  const anyModalOpen =
    showCountryModal ||
    showBirthDateModal ||
    showDeathDateModal ||
    showFatherModal ||
    showMotherModal ||
    showSpouseModal ||
    showDynastyModal ||
    showReligionModal ||
    affCountryPickerRow !== null ||
    affDateModalOpen ||
    showRegisterAgainDialog
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        const f = formRef.current
        if (!f) return
        // submitting/loading 중 또는 하위 모달이 열려 있으면 무시
        if (
          isSubmitting ||
          uploadingThumbnail ||
          isLoadingEdit ||
          loadFailed ||
          anyModalOpen
        ) {
          return
        }
        e.preventDefault()
        f.requestSubmit()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isSubmitting, uploadingThumbnail, isLoadingEdit, loadFailed, anyModalOpen])

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

  // ─── 검증 ──────────────────────────────────────────────────────────────────
  const isValidYear = (y: string): boolean => {
    if (!y.trim()) return true
    const n = Number(y)
    return Number.isInteger(n) && n >= 1 && n <= 9999
  }

  /**
   * 출생/사망 검증 — 범위, 미래 차단, 사망>=출생 비교를 한 곳에 모음.
   * validate() submit 경로와 인라인(date select 직후) 경로가 공유.
   * 인자로 값을 받기 때문에 state setter 직후의 stale state 문제 없음.
   */
  const computeBirthDeathErrors = (
    birth: {
      era: Era
      year: string
      month: string
      day: string
      unknown: boolean
    },
    death: {
      era: Era
      year: string
      month: string
      day: string
      unknown: boolean
      alive: boolean
    },
  ): { birth?: string; death?: string } => {
    const errs: { birth?: string; death?: string } = {}
    const today = new Date()
    const todayVal =
      today.getFullYear() * 10000 +
      (today.getMonth() + 1) * 100 +
      today.getDate()

    // 출생 — 범위 + 미래 차단
    if (!birth.unknown && birth.year.trim()) {
      if (!isValidYear(birth.year)) {
        errs.birth = '출생 연도는 1~9999 범위의 정수여야 합니다.'
      } else if (birth.era === 'AD') {
        const by = parseInt(birth.year, 10)
        const bm = birth.month ? parseInt(birth.month, 10) : 1
        const bd = birth.day ? parseInt(birth.day, 10) : 1
        if (by * 10000 + bm * 100 + bd > todayVal) {
          errs.birth = '출생일은 오늘 이후일 수 없습니다.'
        }
      }
    }

    // 사망 — 범위 + 미래 차단 + 출생일과 비교
    if (!death.alive && !death.unknown && death.year.trim()) {
      if (!isValidYear(death.year)) {
        errs.death = '사망 연도는 1~9999 범위의 정수여야 합니다.'
      } else if (death.era === 'AD') {
        const dy = parseInt(death.year, 10)
        const dm = death.month ? parseInt(death.month, 10) : 1
        const dd = death.day ? parseInt(death.day, 10) : 1
        if (dy * 10000 + dm * 100 + dd > todayVal) {
          errs.death = '사망일은 오늘 이후일 수 없습니다.'
        }
      }
      // 비교 검증 — 둘 다 정상값일 때만
      if (
        !errs.birth &&
        !errs.death &&
        !birth.unknown &&
        birth.year.trim() &&
        isValidYear(birth.year)
      ) {
        const by = parseInt(birth.year, 10)
        const bm = birth.month ? parseInt(birth.month, 10) : 1
        const bd = birth.day ? parseInt(birth.day, 10) : 1
        const dy = parseInt(death.year, 10)
        const dm = death.month ? parseInt(death.month, 10) : 1
        const dd = death.day ? parseInt(death.day, 10) : 1
        // 부호는 연도에만 적용(iso-date.ts dateSortKey와 동일: 부호연도×10000 + 월×100 + 일).
        // 합성 키 전체에 -1을 곱하면 같은 BC 연도 안에서 월·일 순서가 뒤집힌다.
        const birthVal = (birth.era === 'BC' ? -by : by) * 10000 + bm * 100 + bd
        const deathVal = (death.era === 'BC' ? -dy : dy) * 10000 + dm * 100 + dd
        if (deathVal < birthVal) {
          errs.death = '사망일은 출생일 이후여야 합니다.'
        }
      }
    }
    return errs
  }

  /** 단일 키 인라인 갱신 — true면 셋, false면 클리어. */
  const setOrClearError = (key: string, msg: string | undefined) => {
    setErrors((prev) => {
      const next = { ...prev }
      if (msg) next[key] = msg
      else delete next[key]
      return next
    })
  }

  /** 필수 텍스트 필드 onBlur — 빈 값이면 에러 노출. 입력 시작 시 onChange의 clearFieldError가 클리어. */
  const handleRequiredTextBlur = (key: 'name', value: string) => {
    if (!value.trim()) {
      setOrClearError(key, REQUIRED_MESSAGES[key])
    }
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    // 성(surname)은 외자·단일명·성 미상 인물을 위해 선택. 이름·성별·국적만 필수.
    if (!name.trim()) e.name = REQUIRED_MESSAGES.name
    if (!gender) e.gender = REQUIRED_MESSAGES.gender
    if (!countryId) e.countryId = REQUIRED_MESSAGES.countryId
    const dateErrs = computeBirthDeathErrors(
      {
        era: birthEra,
        year: birthYear,
        month: birthMonth,
        day: birthDay,
        unknown: isBirthDateUnknown,
      },
      {
        era: deathEra,
        year: deathYear,
        month: deathMonth,
        day: deathDay,
        unknown: isDeathDateUnknown,
        alive: isAlive,
      },
    )
    if (dateErrs.birth) e.birth = dateErrs.birth
    if (dateErrs.death) e.death = dateErrs.death
    // 국가 소속 행의 기간 역전(종료<시작)은 서버로 잘못 전송되므로 제출 차단.
    // 해당 행은 "더 입력 → 소속·가문" 안에 있으니 접혀 있으면 펼쳐 인라인 오류를 보이게 한다.
    if (hasAffiliationDateError(countryAffiliations)) {
      e._form = '국가 소속의 기간을 확인해주세요. 종료일이 시작일보다 빠른 행이 있습니다.'
      setMoreOpen(true)
    }
    setErrors(e)
    if (Object.keys(e).length > 0) return false
    return true
  }

  const clearFieldError = useCallback((key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  // ─── Payload ───────────────────────────────────────────────────────────────
  /**
   * 배우자 관계 payload.
   * - 신규: 첫 배우자 입력이 있으면 단건, 없으면 미전송(undefined).
   * - 수정: 서버가 배열 수신 시 통째 교체(deleteMany→createMany)하므로 hydration에 보존한
   *   전체 관계(결혼 시작/종료일·둘째 이후 배우자)를 그대로 왕복시키고,
   *   폼이 편집하는 첫 관계만 교체한다. 이미 관계가 있던 인물을 고르면 결혼일은 유지.
   */
  const buildSpouseRelations = (): SpouseRelationInput[] | undefined => {
    const note = spouseNote.trim() || null
    if (!isEditMode) {
      return spouseId ? [{ spouseId, note }] : undefined
    }
    // 첫 슬롯을 비웠으면 첫 관계만 제거, 나머지(둘째 이후)는 무손실 유지.
    if (!spouseId) return editSpouseRelations.slice(1)
    // 보존 관계 중 같은 인물이 있으면 그 결혼일을 승계 (첫 관계 교체·순서 변경 모두 커버).
    const preserved = editSpouseRelations.find(
      (relation) => relation.spouseId === spouseId,
    )
    return [
      {
        spouseId,
        marriageStartDate: preserved?.marriageStartDate,
        marriageEndDate: preserved?.marriageEndDate,
        note,
      },
      // 중복 행 방지 — 첫 슬롯에 들어간 인물은 나머지 목록에서 제외.
      ...editSpouseRelations
        .slice(1)
        .filter((relation) => relation.spouseId !== spouseId),
    ]
  }

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
    const input: CreatePersonInput = {
      name: name.trim(),
      surname: surname.trim() || null,
      middleName: middleName.trim() || null,
      // 'auto'면 null로 저장 → 소속 국가 기본 순서를 따른다.
      nameDisplayOrder: nameFormat === 'auto' ? null : nameFormat,
      originalName: originalName.trim() || null,
      surnameMeaning: surnameMeaning.trim() || null,
      nameMeaning: nameMeaning.trim() || null,
      middleNameMeaning: middleNameMeaning.trim() || null,
      gender: gender || null,
      profileImageUrl:
        profileImageField === null
          ? (null as unknown as CreatePersonInput['profileImageUrl'])
          : profileImageField || null,
      regnalName: regnalName.trim() || null,
      templeName: templeName.trim() || null,
      posthumousName: posthumousName.trim() || null,
      countryId: countryId || undefined,
      // 수정 모드: 항상 배열 전송(빈 배열이면 추가 소속 제거). 신규: 채워진 행만.
      countryAffiliations:
        isEditMode || countryAffiliations.length
          ? countryAffiliations
              .filter((r) => r.countryId || r.historicalCountryId)
              .map((r) => ({
                affiliationType: r.affiliationType,
                countryId: r.countryId,
                historicalCountryId: r.historicalCountryId,
                startDate: r.startDate,
                endDate: r.endDate,
                // 정렬 메타 왕복 — 미전송 시 서버가 전부 1로 재기록(평탄화)함.
                priority: r.priority,
                note: r.note,
              }))
          : undefined,
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
      // 신규: 첫 배우자만 / 수정: 보존된 전체 관계를 왕복(첫 관계만 교체, 비우면 첫 관계 제거).
      spouseRelations: buildSpouseRelations(),
      isBirthDateUnknown,
      isDeathDateUnknown,
      isAlive,
      // 생존중일 때는 사망 상세를 강제로 비움 — UI에서 숨겨도 state에 남아 있을 수 있어 명시 nullify.
      deathType: isAlive ? null : (deathType || null),
      deathCause: isAlive ? null : (deathCause.trim() || null),
      deathNote: isAlive ? null : (deathNote.trim() || null),
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

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // 재진입 가드 — 버튼 disabled·⌘Enter 가드와 별개로 핸들러 자체에서도 이중 제출 차단.
    if (isSubmitting || uploadingThumbnail) return
    if (!validate()) {
      // 검증 실패 시 첫 오류 필드로 스크롤·포커스 — 긴 폼에서 놓치지 않도록.
      // (성별 SegmentControl처럼 aria-invalid를 렌더하지 않는 컨트롤은 data-field-error로 매칭)
      requestAnimationFrame(() => {
        const el = formRef.current?.querySelector<HTMLElement>(
          '[aria-invalid="true"], [data-field-error="true"]',
        )
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.focus?.()
        }
      })
      return
    }
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
        // 수정 모드: 비운 FK·생몰일은 명시적 null로 전송해 서버에서 해제.
        // (PATCH 계약: undefined = 변경 없음 — 키를 생략하면 기존 값이 남아 재진입 시 부활)
        const updatePayload: UpdatePersonInput = {
          ...payload,
          dynastyId: dynastyId || null,
          religionId: religionId || null,
          fatherId: fatherId || null,
          motherId: motherId || null,
          birthCityId: birthCityId || null,
          deathCityId: deathCityId || null,
          // 날짜가 비워졌으면(미상·생존 전환 포함) null = 해제.
          // isAlive·isDeathDateUnknown 플래그 수신 시 서버도 함께 클리어(이중 안전장치).
          birth: payload.birth ?? null,
          death: payload.death ?? null,
        }
        await updatePerson(editPersonId, updatePayload)
        notify.success('인물 정보가 수정되었습니다.')
        setIsDirty(false)
        draft.discardDraft()
        // onSuccess가 닫기/이동을 책임진다(모달=onClose, 페이지=상세로 이동).
        // 둘 다 호출하면 페이지 모드에서 상세 이동 직후 navigate(-1)로 되돌아가는 이중 내비게이션이 생김.
        if (onSuccess) onSuccess(editPersonId)
        else onCancel()
      } else {
        const created = await createPerson(createPayload)
        notify.success('인물이 등록되었습니다.')
        // 게이미피케이션 즉시 갱신 + 완성도 보너스 피드백 (사진·약력·출생연도)
        onContentRegistered(
          (created.profileImageUrl ? 1 : 0) +
            (created.biography ? 1 : 0) +
            (created.birthYear != null ? 1 : 0),
        )
        setIsDirty(false)
        draft.discardDraft()
        // 캐시 무효화 전용 콜백 — onSuccess를 여기서 부르면 호출부가 모달을 닫거나 페이지를
        // 이동시켜 아래 다이얼로그가 그려지기 전에 폼이 언마운트된다. 닫기/이동은
        // 다이얼로그 응답 후(handleClosePostSuccess)에 실행.
        onCreated?.(created.id)
        // 등록 성공 → 사용자에게 후속 액션 다이얼로그로 분기 (이전 "또 등록" 체크박스 대체).
        // 등록한 인물을 로컬 풀과 직전 등록 칩에 미리 누적 — "다른 인물 등록" 선택 시 즉시 활용.
        setRecentlyRegistered((prev) => {
          const without = prev.filter((p) => p.id !== created.id)
          return [created, ...without].slice(0, 5)
        })
        setPersons((prev) => {
          if (prev.some((p) => p.id === created.id)) return prev
          return [...prev, created]
        })
        setLastCreatedPerson(created)
        setShowRegisterAgainDialog(true)
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
      notify.error(base + extra)
    } finally {
      setIsSubmitting(false)
      onSubmittingChange?.(false)
      setUploadingThumbnail(false)
    }
  }

  const fatherPerson = fatherId ? personById.get(fatherId) : undefined
  const motherPerson = motherId ? personById.get(motherId) : undefined
  const spousePerson = spouseId ? personById.get(spouseId) : undefined

  // 4가지 상태(업로드 중 / 제출 중 / 수정 / 신규) 중 하나의 라벨을 lookup으로 결정.
  const submitButtonLabel = uploadingThumbnail
    ? '이미지 업로드 중…'
    : isSubmitting
      ? isEditMode ? '저장 중…' : '등록 중…'
      : isEditMode ? '저장' : '등록'

  // 페이지 wrapper(`PersonRegisterPage`)가 sticky 푸터·뒤로가기 헤더·버튼 라벨을 담당.
  // 이 컴포넌트는 폼 본체만 렌더한다 — 모달은 CountryFormShell이, 페이지는 wrapper가 외곽을 책임.
  React.useEffect(() => {
    onSubmitLabelChange?.(submitButtonLabel)
  }, [submitButtonLabel, onSubmitLabelChange])

  /**
   * 좌측 scroll-spy 인덱스용 섹션 목록 — 본문의 data-form-section 앵커와 id가 일치.
   * "더 입력"이 접히면 상세 섹션 앵커가 DOM에 없으므로 목록에서도 빼, 클릭해도 안 움직이는
   * 죽은 항목이 생기지 않게 한다(수정 모드는 상세가 있으면 자동 펼침이라 대부분 노출).
   */
  const onSectionsChangeRef = useRef(onSectionsChange)
  onSectionsChangeRef.current = onSectionsChange
  /** 직전 emit한 섹션 시그니처 — 타이핑마다 동일 내용을 재전송해 부모를 리렌더하지 않도록. */
  const lastSectionsKeyRef = useRef('')
  useEffect(() => {
    const sections: { id: string; label: string; filled?: boolean }[] = [
      {
        id: 'basic',
        label: '기본 정보',
        // 성(surname)은 선택이라 완료 판정에서 제외 — 이름·성별·국적만.
        filled: !!name && !!gender && !!countryId,
      },
      {
        id: 'life',
        // 실제 의미 있는 입력(출생/사망 날짜 또는 미상)일 때만 채움 — 이전엔 isAlive
        // 기본 false 때문에 `!isAlive`가 항상 true라 입력 0인데도 '생몰 완료'로 떴다.
        label: '생몰',
        filled:
          !!birthYear ||
          isBirthDateUnknown ||
          !!deathYear ||
          isDeathDateUnknown,
      },
    ]
    if (moreOpen) {
      sections.push(
        {
          id: 'names',
          label: '이름 상세',
          filled:
            !!originalName ||
            !!surnameMeaning ||
            !!nameMeaning ||
            !!middleNameMeaning,
        },
        {
          id: 'death-detail',
          // 사망 유형은 생몰(코어)로 이동 — 여기 완료 판정은 원인·메모·군주 호칭만.
          label: '생애 상세',
          filled:
            !!deathCause ||
            !!deathNote ||
            !!regnalName ||
            !!templeName ||
            !!posthumousName,
        },
        {
          id: 'affiliation',
          label: '소속 · 가문',
          filled:
            !!birthPlace ||
            !!deathPlace ||
            !!dynastyId ||
            !!religionId ||
            countryAffiliations.length > 0,
        },
        {
          id: 'family',
          label: '가족',
          filled: !!fatherId || !!motherId || !!spouseId,
        },
      )
    }
    // id·label·filled가 실제로 바뀐 경우에만 부모로 전달 (불필요한 리렌더 차단).
    const key = sections.map((s) => `${s.id}:${s.filled ? 1 : 0}`).join('|')
    if (key === lastSectionsKeyRef.current) return
    lastSectionsKeyRef.current = key
    onSectionsChangeRef.current?.(sections)
  }, [
    moreOpen,
    surname,
    name,
    gender,
    countryId,
    birthYear,
    isBirthDateUnknown,
    isAlive,
    deathYear,
    isDeathDateUnknown,
    originalName,
    surnameMeaning,
    nameMeaning,
    middleNameMeaning,
    deathType,
    deathCause,
    deathNote,
    regnalName,
    templeName,
    posthumousName,
    birthPlace,
    deathPlace,
    dynastyId,
    religionId,
    countryAffiliations,
    fatherId,
    motherId,
    spouseId,
  ])

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <PersonFormLayoutWrap>
      {pendingDraftSavedAt && (
        <DraftBanner role="status">
          <DraftBannerIcon aria-hidden="true">
            <FiRotateCcw size={14} strokeWidth={2.2} />
          </DraftBannerIcon>
          <DraftBannerText>
            <strong>임시 저장된 내용</strong>
            <span>· {formatRelativeTime(pendingDraftSavedAt)}</span>
          </DraftBannerText>
          <DraftBannerActions>
            <DraftDiscardBtn type="button" onClick={dismissDraft}>
              버리기
            </DraftDiscardBtn>
            <DraftRestoreBtn type="button" onClick={restoreDraft}>
              복원
            </DraftRestoreBtn>
          </DraftBannerActions>
        </DraftBanner>
      )}
      {errors._form && (
        <TopAlert role="alert" $tone="error">
          <FiAlertCircle size={16} />
          <span>{errors._form}</span>
        </TopAlert>
      )}
      {loadFailed && (
        <NotFoundPanel role="alert">
          <NotFoundIcon>
            <FiAlertTriangle size={28} />
          </NotFoundIcon>
          <NotFoundTitle>인물을 불러오지 못했습니다</NotFoundTitle>
          <NotFoundDesc>
            요청한 인물이 삭제되었거나 권한이 없을 수 있습니다. 잠시 후
            다시 시도하거나 목록으로 돌아가 주세요.
          </NotFoundDesc>
          <SubmitButton type="button" onClick={onCancel}>
            목록으로
          </SubmitButton>
        </NotFoundPanel>
      )}
      <form
        ref={formRef}
        id="person-register-form"
        onSubmit={handleSubmit}
        onChange={markDirty}
        onInput={markDirty}
        hidden={loadFailed}
      >
        <LoadingHost>
          {isLoadingEdit && (
            <LoadingOverlay aria-live="polite">
              인물 정보를 불러오는 중…
            </LoadingOverlay>
          )}
          <FormSectionInner aria-busy={isLoadingEdit}>
            {/*
             * 필수-먼저 레이아웃: 코어(사진·이름·성별·국적·생몰)만 늘 노출해
             * "한 명 빠르게 추가"를 15초 작업으로 만든다. 나머지 상세는 MoreToggle로 펼침.
             */}
            <FormRows data-form-section="basic">
                {/* 인물 hero — 좌: 원형 썸네일(드롭존), 우: 이름 미리보기·국가/향년 칩 */}
                <ThumbnailHero>
                  <ThumbnailCircle
                    htmlFor="person-thumbnail-upload"
                    $hasImage={!!(thumbnailObjectUrl || profileImageUrl)}
                    $dragOver={thumbnailDragOver}
                    onDragEnter={(e) => {
                      e.preventDefault()
                      setThumbnailDragOver(true)
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setThumbnailDragOver(true)
                    }}
                    onDragLeave={() => setThumbnailDragOver(false)}
                    onDrop={handleThumbnailDrop}
                    aria-label="프로필 사진 업로드"
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
                      <svg
                        className="placeholder"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    )}
                    <span className="overlay" aria-hidden="true">
                      <FiCamera size={20} />
                    </span>
                  </ThumbnailCircle>
                  <ThumbnailHeroBody>
                    <ThumbnailHeroName $empty={!namePreview}>
                      {namePreview || '이름을 입력해 시작하세요'}
                    </ThumbnailHeroName>
                    {(countryName || lifespanText) && (
                      <ThumbnailHeroMeta>
                        {countryName && (
                          <HeroMetaChip>{countryName}</HeroMetaChip>
                        )}
                        {lifespanText && (
                          <HeroMetaChip>{lifespanText}</HeroMetaChip>
                        )}
                      </ThumbnailHeroMeta>
                    )}
                    <ThumbnailHeroHint id="person-thumbnail-hint">
                      {thumbnailDragOver
                        ? '여기에 놓아 업로드'
                        : '클릭·드래그·붙여넣기(⌘V)로 사진 업로드'}
                      {pendingThumbnailFile && !thumbnailDragOver
                        ? ' · 저장 시 업로드'
                        : ''}
                    </ThumbnailHeroHint>
                    {(thumbnailObjectUrl || profileImageUrl.trim()) && (
                      <ThumbnailHeroRemoveBtn
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
                        <FiTrash2 size={13} />
                        {pendingThumbnailFile ? '선택 취소' : '썸네일 제거'}
                      </ThumbnailHeroRemoveBtn>
                    )}
                  </ThumbnailHeroBody>
                  <ThumbnailUploadInput
                    id="person-thumbnail-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    disabled={isSubmitting}
                    aria-describedby="person-thumbnail-hint"
                  />
                </ThumbnailHero>

                <FieldRow>
                  <FieldLabel htmlFor={fid('surname')}>
                    성 · 이름 · 중간이름<Required>*</Required>
                  </FieldLabel>
                  <FieldControl>
                    <InlineFields $template="minmax(90px, 0.8fr) minmax(140px, 1.4fr) minmax(110px, 1fr)">
                      <FormInput
                        id={fid('surname')}
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                        placeholder="김"
                      />
                      <FormInput
                        id={fid('name')}
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value)
                          clearFieldError('name')
                        }}
                        onBlur={() => handleRequiredTextBlur('name', name)}
                        placeholder="홍길동"
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
                    {/* namePreview는 상단 hero에 표시. 성·중간이름은 선택, 이름만 필수. */}
                    {errors.name && (
                      <FieldError id={fid('name-err')} role="alert">
                        <FiAlertCircle size={13} />
                        {errors.name}
                      </FieldError>
                    )}
                    {/* 표시 순서 — 기본은 국가 설정 따름, 필요 시 개인 단위로 오버라이드 */}
                    <NameOrderControl>
                      <NameOrderLabel htmlFor={fid('nameFormat')}>
                        표시 순서
                      </NameOrderLabel>
                      <SegmentControl
                        value={nameFormat}
                        onChange={(v) => {
                          setNameFormat(v as 'auto' | 'korean' | 'western')
                          markDirty()
                        }}
                        options={[
                          {
                            value: 'auto',
                            label: `국가 기본 (${
                              (countryNameOrderById.get(countryId) ??
                                'korean') === 'western'
                                ? '이름·성'
                                : '성·이름'
                            })`,
                          },
                          { value: 'korean', label: '성·이름' },
                          { value: 'western', label: '이름·성' },
                        ]}
                        ariaLabel="이름 표시 순서"
                      />
                    </NameOrderControl>
                  </FieldControl>
                </FieldRow>

                {/* 성별·국적 — 짧은 코어 컨트롤이라 가로 2열로 묶음 */}
                <CoreFieldPair>
                  <CoreFieldCell>
                    <FieldLabel htmlFor={fid('gender')}>
                      성별<Required>*</Required>
                    </FieldLabel>
                    {/* SegmentControl은 aria-invalid를 렌더하지 않음 — 제출 실패 시 첫 오류
                        스크롤 셀렉터가 잡을 수 있게 래퍼에 data-field-error를 단다. */}
                    <div
                      data-field-error={errors.gender ? 'true' : undefined}
                      tabIndex={errors.gender ? -1 : undefined}
                    >
                      <SegmentControl
                        value={gender || undefined}
                        onChange={(v) => {
                          setGender(v)
                          clearFieldError('gender')
                          markDirty()
                        }}
                        options={GENDER_OPTIONS.map((opt) => ({
                          value: opt.value,
                          label: opt.label,
                        }))}
                        error={!!errors.gender}
                        ariaLabel="성별"
                      />
                    </div>
                    {errors.gender && (
                      <FieldError id={fid('gender-err')} role="alert">
                        <FiAlertCircle size={13} />
                        {errors.gender}
                      </FieldError>
                    )}
                  </CoreFieldCell>

                  {/* 국적(필수) — 소속 섹션에서 코어로 이관 */}
                  <CoreFieldCell>
                    <FieldLabel htmlFor={fid('countryId')}>
                      국적<Required>*</Required>
                    </FieldLabel>
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
                        <FiAlertCircle size={13} />
                        {errors.countryId}
                      </FieldError>
                    )}
                  </CoreFieldCell>
                </CoreFieldPair>
              </FormRows>

              {/* 생몰 요약 — 출생~사망·생존 여부 (essentials, 늘 노출) */}
              <div data-form-section="life">
              <LifeSection
                mode="essentials"
                fid={fid}
                birthEra={birthEra}
                birthYear={birthYear}
                birthMonth={birthMonth}
                birthDay={birthDay}
                isBirthDateUnknown={isBirthDateUnknown}
                setIsBirthDateUnknown={setIsBirthDateUnknown}
                setShowBirthDateModal={setShowBirthDateModal}
                deathEra={deathEra}
                deathYear={deathYear}
                deathMonth={deathMonth}
                deathDay={deathDay}
                isAlive={isAlive}
                isDeathDateUnknown={isDeathDateUnknown}
                setShowDeathDateModal={setShowDeathDateModal}
                setDeathStatus={setDeathStatus}
                deathType={deathType}
                deathCause={deathCause}
                deathNote={deathNote}
                setDeathType={setDeathType}
                setDeathCause={setDeathCause}
                setDeathNote={setDeathNote}
                monarchTitlesOpen={monarchTitlesOpen}
                setMonarchTitlesOpen={setMonarchTitlesOpen}
                regnalName={regnalName}
                templeName={templeName}
                posthumousName={posthumousName}
                setRegnalName={setRegnalName}
                setTempleName={setTempleName}
                setPosthumousName={setPosthumousName}
                lifespanText={lifespanText}
                errors={errors}
                markDirty={markDirty}
              />
              </div>

              {/* ===== 선택 상세 토글 ===== */}
              <MoreToggle
                type="button"
                $open={moreOpen}
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
              >
                <AdvancedToggleIcon $open={moreOpen}>
                  <FiChevronRight size={14} />
                </AdvancedToggleIcon>
                <AdvancedToggleBody>
                  <AdvancedToggleTitle>
                    {moreOpen ? '상세 정보 접기' : '더 입력 (선택)'}
                  </AdvancedToggleTitle>
                  <AdvancedToggleDesc>
                    이름 원어·뜻 · 사망 상세 · 군주 호칭 · 소속/가문 · 가족
                  </AdvancedToggleDesc>
                </AdvancedToggleBody>
              </MoreToggle>

              {moreOpen && (
                <>
                <div data-form-section="names" style={{ marginTop: 28 }}>
                <SectionHeader>
                  <SectionHeaderTitle>이름 상세</SectionHeaderTitle>
                  <SectionHeaderDesc>
                    이름 원어 · 성·이름·중간이름의 뜻
                  </SectionHeaderDesc>
                </SectionHeader>
                <FormRows>
                {/* 이름 원어 */}
                <FieldRow>
                  <FieldLabel htmlFor={fid('originalName')}>이름 원어</FieldLabel>
                  <FieldControl>
                    <OriginalNameInputWrap>
                      <FormInput
                        id={fid('originalName')}
                        value={originalName}
                        onChange={(e) => setOriginalName(e.target.value)}
                        placeholder="Franklin D. Roosevelt"
                      />
                    </OriginalNameInputWrap>
                  </FieldControl>
                </FieldRow>

                {/* 이름의 뜻 — 옵셔널 정보 disclosure 카드 */}
                <AdvancedSection>
                  <AdvancedToggle
                    type="button"
                    $open={nameMeaningsOpen}
                    onClick={() => setNameMeaningsOpen((v) => !v)}
                    aria-expanded={nameMeaningsOpen}
                  >
                    <AdvancedToggleIcon $open={nameMeaningsOpen}>
                      <FiChevronRight size={14} />
                    </AdvancedToggleIcon>
                    <AdvancedToggleBody>
                      <AdvancedToggleTitle>이름의 뜻</AdvancedToggleTitle>
                      <AdvancedToggleDesc>
                        성·이름·중간이름의 한자/뜻 (선택)
                      </AdvancedToggleDesc>
                    </AdvancedToggleBody>
                  </AdvancedToggle>
                  {nameMeaningsOpen && (
                    <AdvancedBody>
                      <FieldLabel htmlFor={fid('surnameMeaning')}>
                        성·이름·중간이름의 뜻
                      </FieldLabel>
                      <FieldControl>
                        <InlineFields $cols={3}>
                          <FormInput
                            id={fid('surnameMeaning')}
                            value={surnameMeaning}
                            onChange={(e) =>
                              setSurnameMeaning(e.target.value)
                            }
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
                            onChange={(e) =>
                              setMiddleNameMeaning(e.target.value)
                            }
                            placeholder="중간이름의 뜻"
                          />
                        </InlineFields>
                      </FieldControl>
                    </AdvancedBody>
                  )}
                </AdvancedSection>
                </FormRows>
                </div>

                {/* 생애 상세 — 사망 유형·원인·메모 + 군주 호칭 (details) */}
                <div data-form-section="death-detail" style={{ marginTop: 28 }}>
                <SectionHeader>
                  <SectionHeaderTitle>생애 상세</SectionHeaderTitle>
                  <SectionHeaderDesc>
                    사망 원인·메모 · 군주 호칭
                  </SectionHeaderDesc>
                </SectionHeader>
                <LifeSection
                  mode="details"
                  fid={fid}
                  birthEra={birthEra}
                  birthYear={birthYear}
                  birthMonth={birthMonth}
                  birthDay={birthDay}
                  isBirthDateUnknown={isBirthDateUnknown}
                  setIsBirthDateUnknown={setIsBirthDateUnknown}
                  setShowBirthDateModal={setShowBirthDateModal}
                  deathEra={deathEra}
                  deathYear={deathYear}
                  deathMonth={deathMonth}
                  deathDay={deathDay}
                  isAlive={isAlive}
                  isDeathDateUnknown={isDeathDateUnknown}
                  setShowDeathDateModal={setShowDeathDateModal}
                  setDeathStatus={setDeathStatus}
                  deathType={deathType}
                  deathCause={deathCause}
                  deathNote={deathNote}
                  setDeathType={setDeathType}
                  setDeathCause={setDeathCause}
                  setDeathNote={setDeathNote}
                  monarchTitlesOpen={monarchTitlesOpen}
                  setMonarchTitlesOpen={setMonarchTitlesOpen}
                  regnalName={regnalName}
                  templeName={templeName}
                  posthumousName={posthumousName}
                  setRegnalName={setRegnalName}
                  setTempleName={setTempleName}
                  setPosthumousName={setPosthumousName}
                  lifespanText={lifespanText}
                  errors={errors}
                  markDirty={markDirty}
                />

                </div>

                {/* 소속 · 가문 — 출생/사망지·가문·종교 (국적은 코어) */}
                <div data-form-section="affiliation" style={{ marginTop: 28 }}>
                <SectionHeader>
                  <SectionHeaderTitle>소속 · 가문</SectionHeaderTitle>
                  <SectionHeaderDesc>
                    출생·사망지 · 가문 · 종교 · 국가 소속
                  </SectionHeaderDesc>
                </SectionHeader>
                <AffiliationSection
                  fid={fid}
                  countryId={countryId}
                  birthPlace={birthPlace}
                  deathPlace={deathPlace}
                  setBirthPlace={setBirthPlace}
                  setDeathPlace={setDeathPlace}
                  setBirthCityId={setBirthCityId}
                  setDeathCityId={setDeathCityId}
                  onCopyBirthToDeathPlace={handleCopyBirthToDeathPlace}
                  dynastyLabel={dynastyLabel}
                  religionLabel={religionLabel}
                  setShowDynastyModal={setShowDynastyModal}
                  setShowReligionModal={setShowReligionModal}
                  markDirty={markDirty}
                />

                {/* 국가 소속(다중) — 주 국적 외 출생지·복무·망명 등 */}
                <CountryAffiliationsSection
                  fid={fid}
                  rows={countryAffiliations}
                  setRows={setCountryAffiliations}
                  onPickCountry={(rowKey) => setAffCountryPickerRow(rowKey)}
                  onDateModalOpenChange={setAffDateModalOpen}
                  markDirty={markDirty}
                />

                </div>

                {/* 가족 — 부·모·배우자 */}
                <div data-form-section="family" style={{ marginTop: 28 }}>
                <SectionHeader>
                  <SectionHeaderTitle>가족</SectionHeaderTitle>
                  <SectionHeaderDesc>부 · 모 · 배우자</SectionHeaderDesc>
                </SectionHeader>
                <FamilySection
                  fid={fid}
                  fatherId={fatherId}
                  motherId={motherId}
                  spouseId={spouseId}
                  spouseNote={spouseNote}
                  setFatherId={setFatherId}
                  setMotherId={setMotherId}
                  setSpouseId={setSpouseId}
                  setSpouseNote={setSpouseNote}
                  fatherPerson={fatherPerson}
                  motherPerson={motherPerson}
                  spousePerson={spousePerson}
                  showFatherModal={showFatherModal}
                  showMotherModal={showMotherModal}
                  showSpouseModal={showSpouseModal}
                  setShowFatherModal={setShowFatherModal}
                  setShowMotherModal={setShowMotherModal}
                  setShowSpouseModal={setShowSpouseModal}
                  persons={persons}
                  setPersons={setPersons}
                  recentCandidates={recentCandidates}
                  editPersonId={editPersonId}
                  countryId={countryId}
                  markDirty={markDirty}
                />
                </div>
                </>
              )}
          </FormSectionInner>
        </LoadingHost>
      </form>

      {/*
       * 등록 성공 후 분기 — "다른 인물 이어서 등록" vs "닫기".
       * 메시지는 현재 countryId 채움 여부에 따라 정확히 분기 — preserveCountryIdRef가
       * 다음 라운드에 country를 유지하지만 초기 등록부터 country가 비었으면 그대로 비어 시작.
       */}
      <ConfirmDialog
        isOpen={showRegisterAgainDialog}
        title="인물 등록 완료"
        message={(() => {
          const nameLabel = lastCreatedPerson
            ? `${getPersonDisplayName(lastCreatedPerson)}을(를) 등록했습니다. `
            : ''
          if (countryId && countryName) {
            return `${nameLabel}${countryName}에 다른 인물도 이어서 등록할까요?`
          }
          return `${nameLabel}다른 인물도 이어서 등록할까요?`
        })()}
        confirmLabel="다른 인물 등록"
        cancelLabel="닫기"
        onConfirm={handleRegisterAnother}
        onCancel={handleClosePostSuccess}
      />

      <CountrySelectModal
        isOpen={showCountryModal}
        onClose={() => setShowCountryModal(false)}
        onSelect={handleCountrySelect}
        modernCountries={modernCountries}
        historicalCountries={historicalCountries}
        title="소속 국가 선택"
        selectedCountryId={countryId || undefined}
      />
      <CountrySelectModal
        isOpen={affCountryPickerRow !== null}
        onClose={() => setAffCountryPickerRow(null)}
        onSelect={(c) => {
          if (affCountryPickerRow) {
            setCountryAffiliations((prev) =>
              prev.map((r) =>
                r.key === affCountryPickerRow
                  ? {
                      ...r,
                      countryId: c.isHistorical ? undefined : c.id,
                      historicalCountryId: c.isHistorical ? c.id : undefined,
                      countryLabel: c.name,
                    }
                  : r,
              ),
            )
            markDirty()
          }
          setAffCountryPickerRow(null)
        }}
        modernCountries={modernCountries}
        historicalCountries={historicalCountries}
        title="소속 국가 선택"
      />
      <SelectModal<string>
        isOpen={showDynastyModal}
        onClose={() => setShowDynastyModal(false)}
        title="가문 선택"
        options={dynastySelectOptions}
        selectedValue={dynastyId}
        onSelect={(value) => {
          setDynastyId(value)
          setShowDynastyModal(false)
          markDirty()
        }}
        searchPlaceholder="가문 이름으로 검색…"
      />
      <SelectModal<string>
        isOpen={showReligionModal}
        onClose={() => setShowReligionModal(false)}
        title="종교 선택"
        options={religionSelectOptions}
        selectedValue={religionId}
        onSelect={(value) => {
          setReligionId(value)
          setShowReligionModal(false)
          markDirty()
        }}
        searchPlaceholder="종교 이름으로 검색…"
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
    </PersonFormLayoutWrap>
  )
}
