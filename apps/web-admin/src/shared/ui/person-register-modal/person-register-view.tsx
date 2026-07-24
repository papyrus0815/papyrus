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
import { marriageRankOrder } from '@/shared/lib/marriage-rank-labels'
import { normalizeNicknameType } from '@/shared/lib/nickname-type-labels'
import {
  hasAnyPartialDateInput,
  isPartialRangeInverted,
  parsePartialDateString,
  partialDateFromResponse,
  partialDateFromStructured,
  partialPartsSortKey,
  partialPartsToDateInfo,
} from '@/shared/lib/partial-date-string'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog'
import { confirm } from '@/shared/ui/confirm-dialog'
import { CountrySelectModal } from '@/shared/ui/country-select-modal/country-select-modal'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { FormInput } from '@/shared/ui/form-input/form-input'
import { SegmentControl } from '@/shared/ui/segment-control/segment-control'
import { type PlaceResult } from '@/shared/ui/place-autocomplete/place-autocomplete'
import {
  FieldControl,
  FieldHint,
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
import {
  FamilySection,
  normalizeSpouseRow,
  type SpouseFormRow,
} from './sections/family-section'
import { LifeSection } from './sections/life-section'
import { NicknameSection, type NicknameRow } from './sections/nickname-section'
import { PlaceFields } from './sections/place-fields'
import { usePersonDraft } from './use-person-draft.hook'

import {
  AdvancedBody,
  AdvancedSection,
  AdvancedToggle,
  AdvancedToggleBody,
  AdvancedToggleDesc,
  AdvancedToggleIcon,
  AdvancedToggleTitle,
  ConflictReloadBtn,
  CoreFieldCell,
  CoreDivider,
  CoreFieldPair,
  CoreSectionLabel,
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
  NameOnlyRequiredNote,
  NotFoundDesc,
  NotFoundIcon,
  NotFoundPanel,
  NotFoundTitle,
  OptionalSeam,
  OriginalNameInputWrap,
  PersonFormLayoutWrap,
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
  const [isBirthDateApproximate, setIsBirthDateApproximate] = useState(false)
  const [isDeathDateApproximate, setIsDeathDateApproximate] = useState(false)
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
  const [birthNote, setBirthNote] = useState<string>('')
  const [deathYear, setDeathYear] = useState('')
  const [deathMonth, setDeathMonth] = useState('')
  const [deathDay, setDeathDay] = useState('')
  // 활동시기(floruit) — 생몰이 둘 다 미상일 때만 노출. 크기값 연도 문자열 + era.
  const [floruitStartYear, setFloruitStartYear] = useState('')
  const [floruitEndYear, setFloruitEndYear] = useState('')
  const [floruitEra, setFloruitEra] = useState<Era>('AD')
  // 소속
  const [countryId, setCountryId] = useState<string>(initialCountryId ?? '')
  // 주 국적이 역사(과거) 국가일 때의 FK — 현대 countryId와 상호배타.
  // 선택/편집로드/reset 등 모든 write 사이트에서 반드시 반대 필드를 비운다(둘 다 set 금지).
  const [historicalCountryId, setHistoricalCountryId] = useState<string>('')
  const [countryName, setCountryName] = useState<string>('')
  /** 주 국적 id — 현대(countryId) 우선, 없으면 역사(historicalCountryId). 읽기 전용 파생. */
  const primaryCountryId = countryId || historicalCountryId
  /** 주 국적이 역사(과거) 국가인지 — historicalCountryId 보유가 source of truth. */
  const countryIsHistorical = !!historicalCountryId
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
  // 사생아·서출 — 가계도 카드 별표(*) 마커
  const [illegitimate, setIllegitimate] = useState(false)
  /**
   * 배우자 관계 목록(반복 행) — 각 행: 배우자 + 혼인 시작/종료일 + 메모.
   * 다중 배우자(정실/후궁·순차 재혼)와 결혼일을 폼에서 직접 편집·추가/삭제한다.
   * (과거: 스칼라 첫 슬롯 + 숨은 보존 배열로 둘째 이후는 편집 불가·날짜 입력 불가였음)
   */
  const [spouseRows, setSpouseRows] = useState<SpouseFormRow[]>([])
  const [nicknameRows, setNicknameRows] = useState<NicknameRow[]>([])
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
  /** 기본 탭의 "이름의 뜻" 접기 영역 */
  const [nameMeaningsOpen, setNameMeaningsOpen] = useState(false)
  /** 생애 탭의 "군주명·묘호·시호" 접기 영역 — 군주가 아닌 인물에겐 영구 무관 */
  const [monarchTitlesOpen, setMonarchTitlesOpen] = useState(false)
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
  /**
   * 409(CC1) 충돌 후 '최신 내용 불러오기' 배너 노출 여부.
   * 충돌 시 토큰을 자동 갱신하지 않으므로, 사용자가 이 액션으로 재하이드레이션하기 전까지
   * 재저장은 계속 409로 막힌다(상대 세션 변경 무성 덮어쓰기 차단).
   */
  const [showConflictReload, setShowConflictReload] = useState(false)
  const dirtyTrackingEnabledRef = useRef(false)
  /** 수정 진입 시 로드한 상세의 updatedAt(CC1 낙관적 동시성 토큰). 저장 시 서버로 보내
      다른 세션이 먼저 저장했으면 409로 감지 → 덮어쓰기 대신 안내. */
  const loadedUpdatedAtRef = useRef<string | null>(null)
  /** 폼 최상단(TopAlert 포함) 스크롤 앵커 — _form-only 검증 실패 시 폴백 스크롤용. */
  const layoutRef = useRef<HTMLDivElement>(null)
  /** 409 '최신 내용 불러오기'로 재하이드레이션이 진행 중임을 표시 — 로드 완료 시 성공 토스트. */
  const reloadAfterConflictPendingRef = useRef(false)
  const uidPrefix = useId()
  const fid = useCallback((k: string) => `${uidPrefix}-${k}`, [uidPrefix])

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
  // create/reset 분기가 읽는 initialCountryId를 ref로 노출 — 편집 로드 effect deps에서 빼
  // initialCountryId 변동만으로 재fetch·재하이드레이션(수정 중 미저장 편집 소실)되는 것을 막는다.
  // create 모드의 실시간 initialCountryId 반영은 아래 별도 effect(setCountryId)가 담당한다.
  const initialCountryIdRef = useRef(initialCountryId)
  initialCountryIdRef.current = initialCountryId
  useEffect(() => {
    onValuesChangeRef.current?.({
      name: !!name?.trim(),
      surname: !!surname?.trim(),
      gender: !!gender,
      countryId: !!primaryCountryId,
    })
  }, [name, surname, gender, primaryCountryId])

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

  /** 가족 인라인 검색 옵션 원천 — 인물 풀 + 수정 모드 편집 캐시 합집합(즉시 표시). */
  const knownPersons = useMemo(
    () => Array.from(personById.values()),
    [personById],
  )

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
      if (spouseRows.some((relation) => relation.spouseId === p.id)) return false
      return true
    })
  }, [recentlyRegistered, editPersonId, fatherId, motherId, spouseRows])

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
        : (countryNameOrderById.get(primaryCountryId) ?? 'korean')
    return getPersonDisplayName(
      {
        name,
        surname,
        middleName,
        country: { defaultNameDisplayOrder: order },
      },
      false,
    )
  }, [name, surname, middleName, primaryCountryId, countryNameOrderById, nameFormat])

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
  /**
   * 인물 풀(getAllPersons) 로드 — 가족(부/모/배우자) 인라인 검색 후보와 "+ 새 인물" 모달에 필요.
   * 가족 섹션이 상시 노출로 바뀌어 "접기 펼침" 시점 로드가 사라졌으므로, 코어 첫 페인트 뒤
   * idle에 한 번 당겨온다(아래 마운트 effect). 후보가 비어 기존 인물을 못 찾고 중복 생성하는 회귀 차단.
   */
  const loadPersons = useCallback(() => {
    if (personsLoadedRef.current) return
    personsLoadedRef.current = true
    getAllPersons()
      .then((pers) => {
        setPersons(Array.isArray(pers) ? pers : [])
      })
      .catch(() => {
        personsLoadedRef.current = false
      })
  }, [])

  // 마운트 후 idle에 인물 풀 프리로드 — essentials 첫 페인트/빠른 등록(15초) 경로를 막지 않도록 지연.
  useEffect(() => {
    const ric = window as typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    if (typeof ric.requestIdleCallback === 'function') {
      const id = ric.requestIdleCallback(loadPersons, { timeout: 1500 })
      return () => ric.cancelIdleCallback?.(id)
    }
    const fallbackTimer = setTimeout(loadPersons, 300)
    return () => clearTimeout(fallbackTimer)
  }, [loadPersons])

  // idle 발화 전 "+ 새 인물" 등 인물 선택 모달을 열면 즉시 로드(레이스 폴백).
  useEffect(() => {
    if (showFatherModal || showMotherModal || showSpouseModal) loadPersons()
  }, [showFatherModal, showMotherModal, showSpouseModal, loadPersons])

  useEffect(() => {
    // 수정 모드에서는 인물 데이터가 권위 — 부모가 흘려보낸 initialCountryId가 덮어쓰지 않게.
    if (editPersonId) return
    setCountryId(initialCountryId ?? '')
    setHistoricalCountryId('') // 부모 컨텍스트(initialCountryId)는 항상 현대국가
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
    makeFormField('isBirthDateApproximate', () => isBirthDateApproximate, setIsBirthDateApproximate, false),
    makeFormField('isDeathDateApproximate', () => isDeathDateApproximate, setIsDeathDateApproximate, false),
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
    makeFormField('birthNote', () => birthNote, setBirthNote, ''),
    makeFormField('deathYear', () => deathYear, setDeathYear, ''),
    makeFormField('deathMonth', () => deathMonth, setDeathMonth, ''),
    makeFormField('deathDay', () => deathDay, setDeathDay, ''),
    makeFormField('floruitStartYear', () => floruitStartYear, setFloruitStartYear, ''),
    makeFormField('floruitEndYear', () => floruitEndYear, setFloruitEndYear, ''),
    makeFormField('floruitEra', () => floruitEra, setFloruitEra, 'AD'),
    makeFormField('countryId', () => countryId, setCountryId, ''),
    makeFormField('historicalCountryId', () => historicalCountryId, setHistoricalCountryId, ''),
    makeFormField(
      'countryAffiliations',
      () => countryAffiliations,
      setCountryAffiliations,
      [],
    ),
    makeFormField('nicknameRows', () => nicknameRows, setNicknameRows, []),
    makeFormField('birthCityId', () => birthCityId, setBirthCityId, ''),
    makeFormField('deathCityId', () => deathCityId, setDeathCityId, ''),
    makeFormField('birthPlace', () => birthPlace, setBirthPlace, null),
    makeFormField('deathPlace', () => deathPlace, setDeathPlace, null),
    makeFormField('dynastyId', () => dynastyId, setDynastyId, ''),
    makeFormField('religionId', () => religionId, setReligionId, ''),
    makeFormField('fatherId', () => fatherId, setFatherId, ''),
    makeFormField('motherId', () => motherId, setMotherId, ''),
    makeFormField('illegitimate', () => illegitimate, setIllegitimate, false),
    makeFormField('spouseRelations', () => spouseRows, setSpouseRows, []),
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
    setShowConflictReload(false)

    if (!editPersonId) {
      setEditLoadStatus('idle')
      // 등록 모드 전환 시 폼 초기화
      setNameMeaningsOpen(false)
      setMonarchTitlesOpen(false)
      // "또 등록" 흐름에서 직전 등록 주 국적(현대/역사 둘 다) 보존(`preserveCountryIdRef`).
      // 일반 reset에서는 initialCountryId(부모가 흘린 현대국가)으로 폴백.
      const preserved = preserveCountryIdRef.current
      const nextCountryId = preserved
        ? preserved.countryId
        : (initialCountryIdRef.current ?? '')
      const nextHistoricalCountryId = preserved ? preserved.historicalCountryId : ''
      preserveCountryIdRef.current = null
      // 폼 필드는 레지스트리에서 일괄 초기화 — 주 국적 두 필드만 보존 값으로 대체.
      formFieldsRef.current.forEach((field) =>
        field.key === 'countryId'
          ? setCountryId(nextCountryId)
          : field.key === 'historicalCountryId'
            ? setHistoricalCountryId(nextHistoricalCountryId)
            : field.reset(),
      )
      // 스냅샷 외 transient 상태는 명시 초기화.
      // countryName은 보존된 주 국적이 있으면 즉시 재계산 — 값이 동일하면
      // 이름 조회 effect가 재실행되지 않아 버튼이 '국가 선택'으로 비어 보임.
      const nextPrimary = nextCountryId || nextHistoricalCountryId
      setCountryName(
        nextPrimary
          ? (modernCountries.find((country) => country.id === nextPrimary)
              ?.name ??
              historicalCountries.find(
                (country) => country.id === nextPrimary,
              )?.name ??
              '')
          : '',
      )
      setPendingThumbnailFile(null)
      setThumbnailObjectUrl(null)
      setThumbnailMarkedForRemoval(false)
      setEditFamilyCache({})
      // spouseRows는 폼 필드 레지스트리(makeFormField 'spouseRelations')가 일괄 리셋함.
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
        loadedUpdatedAtRef.current = p.updatedAt ?? null
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
        setNicknameRows(
          [...((p as any).nicknames ?? [])]
            .sort((a: any, b: any) => (a.priority ?? 0) - (b.priority ?? 0))
            .map((nick: any) => ({
              nickname: nick.nickname ?? '',
              // enum 정식화 이전 자유 문자열 방어 — 토큰으로 정규화
              type: normalizeNicknameType(nick.type),
              // ★ 이유 복원 필수 — 누락하면 무관 필드 저장 시 delete-recreate로 전 별칭 이유가 소실.
              reason: nick.reason ?? '',
            })),
        )
        setGender(p.gender ?? '')
        setProfileImageUrl(p.profileImageUrl ?? '')
        setRegnalName(p.regnalName ?? '')
        setTempleName(p.templeName ?? '')
        setPosthumousName(p.posthumousName ?? '')
        // 주 국적: 응답 historicalCountryId(FK)가 있으면 역사국가, 없으면 현대 countryId.
        // (countryId는 effective라 역사인물이면 역사PK가 담길 수 있으므로 historicalCountryId로 판별)
        if (p.historicalCountryId) {
          setHistoricalCountryId(p.historicalCountryId)
          setCountryId('')
        } else {
          setCountryId(p.countryId ?? '')
          setHistoricalCountryId('')
        }
        // 주 국적(priority 0 CITIZENSHIP)은 countryId/historicalCountryId가 담당 → 그 외 소속만 행으로 로드
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
        } else {
          // 응답에 출생지 정보가 전무하면 명시적으로 비운다 — else 부재 시 페이지 모드
          // 편집→편집 이동에서 이전 인물의 출생지가 잔류해(birthCityId는 ''로 초기화돼 불일치)
          // 저장 시 엉뚱한 출생지가 기록되는 오염을 차단(birthCityId 무조건 초기화와 대칭).
          setBirthPlace(null)
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
        } else {
          // 출생지와 동일 — 응답에 사망지 정보가 없으면 명시적으로 비워 잔류 오염을 막는다.
          setDeathPlace(null)
        }
        setDynastyId(p.dynastyId ?? p.dynasty?.id ?? '')
        setReligionId(p.religionId ?? '')
        setFatherId(p.fatherId ?? p.father?.id ?? '')
        setMotherId(p.motherId ?? p.mother?.id ?? '')
        setIllegitimate(Boolean((p as any).illegitimate))
        // 배우자 관계 전체(결혼 시작/종료일·서열·다중 배우자 포함)를 반복 행으로 로드.
        // 날짜는 era+precision을 반영한 부분 정밀 부호 문자열('1526'·'-0044-03-15')로 복원 —
        // DATETIME의 01-01 채움·BC 크기값 저장을 폼에 노출하지 않는다.
        const spouseRels: SpouseFormRow[] = (p.spouseRelations ?? [])
          .filter((rel: any) => rel?.spouse?.id)
          .map((rel: any) => ({
            spouseId: String(rel.spouse.id),
            // 구조화 연/월/일 우선(BC·고대는 DateTime null), 레거시 행은 ISO+era+precision 폴백
            start: parsePartialDateString(
              partialDateFromStructured(
                rel.marriageStartYear,
                rel.marriageStartMonth,
                rel.marriageStartDay,
                rel.marriageStartEra,
              ) ||
                partialDateFromResponse(
                  rel.marriageStartDate,
                  rel.marriageStartEra,
                  rel.marriageStartPrecision,
                ),
            ),
            end: parsePartialDateString(
              partialDateFromStructured(
                rel.marriageEndYear,
                rel.marriageEndMonth,
                rel.marriageEndDay,
                rel.marriageEndEra,
              ) ||
                partialDateFromResponse(
                  rel.marriageEndDate,
                  rel.marriageEndEra,
                  rel.marriageEndPrecision,
                ),
            ),
            rank: rel.marriageRank ?? '',
            note: rel.note ?? null,
          }))
          // 서버가 서열→부호연도→id로 정렬해 주지만, 방어적으로 같은 키로 재정렬(스냅샷 draft 등
          // 서버 정렬을 안 거친 행 대비). 서열 명시가 이기고, 혼인 시작 미상은 뒤.
          .sort((rowA: SpouseFormRow, rowB: SpouseFormRow) => {
            const rankDiff = marriageRankOrder(rowA.rank) - marriageRankOrder(rowB.rank)
            if (rankDiff !== 0) return rankDiff
            const keyA = partialPartsSortKey(rowA.start)
            const keyB = partialPartsSortKey(rowB.start)
            if (keyA != null && keyB != null) return keyA - keyB
            if (keyA != null) return -1
            if (keyB != null) return 1
            return 0
          })
        setSpouseRows(spouseRels)
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
        setBirthNote((p as any).birthNote ?? '')
        setIsBirthDateApproximate((p as any).isBirthDateApproximate ?? false)
        setIsDeathDateApproximate((p as any).isDeathDateApproximate ?? false)
        // 활동시기(floruit)
        setFloruitStartYear((p as any).floruitStartYear != null ? String((p as any).floruitStartYear) : '')
        setFloruitEndYear((p as any).floruitEndYear != null ? String((p as any).floruitEndYear) : '')
        setFloruitEra(((p as any).floruitEra as Era) ?? 'AD')
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
        // 409 '최신 내용 불러오기'로 촉발된 재하이드레이션이면 성공을 알린다(무反응 방지).
        if (reloadAfterConflictPendingRef.current) {
          reloadAfterConflictPendingRef.current = false
          notify.success('최신 내용을 불러왔습니다.')
        }
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
    // initialCountryId는 ref(initialCountryIdRef)로 읽어 deps에서 제외 — 편집 로드 effect가
    // initialCountryId 변동만으로 재실행돼 수정 중 미저장 입력을 서버값으로 덮어쓰는 것을 방지.
  }, [editPersonId, resetCounter])

  useEffect(() => {
    if (!primaryCountryId || (!modernCountries.length && !historicalCountries.length))
      return
    if (countryId) {
      const modern = modernCountries.find((country) => country.id === countryId)
      if (modern) setCountryName(modern.name)
    } else if (historicalCountryId) {
      const historical = historicalCountries.find(
        (country) => country.id === historicalCountryId,
      )
      if (historical) setCountryName(historical.name ?? '')
    }
  }, [countryId, historicalCountryId, primaryCountryId, modernCountries, historicalCountries])


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
  const preserveCountryIdRef = useRef<{
    countryId: string
    historicalCountryId: string
  } | null>(null)

  /** 등록 성공 다이얼로그 — "다른 인물 등록" 선택 시 폼 리셋, 모달은 유지(직전 주 국적 보존). */
  const handleRegisterAnother = () => {
    setShowRegisterAgainDialog(false)
    setLastCreatedPerson(null)
    preserveCountryIdRef.current =
      countryId || historicalCountryId
        ? { countryId, historicalCountryId }
        : null
    setResetCounter((prev) => prev + 1)
    // 리셋 리렌더 후 성(첫 필드)으로 포커스를 되돌려 바로 다음 인물 입력을 시작하게 한다.
    // (셸 first-focus는 isOpen 변화에만 반응하고 모달은 계속 열려 있어 재-포커스하지 않는다.)
    requestAnimationFrame(() => {
      document.getElementById(fid('surname'))?.focus()
    })
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

  /**
   * 409(CC1) 충돌 후 '최신 내용 불러오기' — resetCounter를 올려 편집 로드 effect를 재실행하면
   * 서버 최신값으로 재하이드레이션되고 loadedUpdatedAtRef(토큰)도 그 경로에서 갱신된다.
   * (재하이드레이션은 사용자의 미저장 편집을 버리지만, 충돌 상황의 정직한 해소다.)
   */
  const handleReloadAfterConflict = async () => {
    // 재하이드레이션은 사용자의 미저장 편집을 통째로 버린다 — dirty면 되돌릴 수 없는 손실
    // 이므로 확인 게이트. (충돌 상황의 정직한 해소지만, 무성 폐기는 막는다.)
    if (isDirty) {
      const ok = await confirm({
        title: '최신 내용 불러오기',
        message:
          '지금 입력한 변경 사항은 사라지고 서버의 최신 내용으로 다시 불러옵니다. 계속할까요?',
        confirmLabel: '불러오기',
      })
      if (!ok) return
    }
    reloadAfterConflictPendingRef.current = true
    setShowConflictReload(false)
    setResetCounter((prev) => prev + 1)
  }

  const handleCountrySelect = (c: {
    id: string
    name: string
    isHistorical: boolean
  }) => {
    const prev = countryId || historicalCountryId
    // 상호배타: 현대/역사 중 한쪽만 세팅하고 반대 필드는 비운다.
    if (c.isHistorical) {
      setHistoricalCountryId(c.id)
      setCountryId('')
    } else {
      setCountryId(c.id)
      setHistoricalCountryId('')
    }
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
      setIsDeathDateApproximate(false) // 생존/미상 전환 시 stale 추정 정리(미상↔추정 배타)
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
      // 사망일 인라인 필드가 출생일 옆에 상시 노출되므로 자동 모달을 띄우지 않는다
      // (달력 경로의 '깜짝 200ms 모달'을 없애 인라인/달력 두 경로의 조작감을 일치).
      return
    }
    // unknown
    if (!isAlive && isDeathDateUnknown) return
    setIsAlive(false)
    setIsDeathDateUnknown(true)
    setIsDeathDateApproximate(false) // 일자 미상↔추정 배타
    setDeathYear('')
    setDeathMonth('')
    setDeathDay('')
    clearFieldError('death')
    markDirty()
  }

  /** 사망지를 출생지와 동일하게 빠르게 채움. */
  const handleCopyBirthToDeathPlace = () => {
    if (!birthPlace) return
    // 기존 사망지가 있으면 되돌리기 토스트로 덮어쓰기를 복구 가능하게(무성 손실 방지).
    const prevDeathPlace = deathPlace
    const prevDeathCityId = deathCityId
    setDeathPlace(birthPlace)
    setDeathCityId(birthPlace.cityId ?? '')
    markDirty()
    if (prevDeathPlace) {
      notify.show(
        (t) => (
          <UndoToastBody>
            <span>사망지를 출생지로 덮어썼습니다</span>
            <UndoToastButton
              type="button"
              onClick={() => {
                setDeathPlace(prevDeathPlace)
                setDeathCityId(prevDeathCityId)
                notify.dismiss(t.id)
              }}
            >
              되돌리기
            </UndoToastButton>
          </UndoToastBody>
        ),
        { duration: 6000, icon: '🔄' },
      )
    } else {
      notify.success('출생지를 사망지로 복사했습니다.')
    }
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
    // 사망일 자동 모달 제거 — 인라인 사망일 필드가 늘 보이므로 깜짝 모달은 불필요·불일치.
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
  /** 배우자 혼인일 피커 열림 여부 — 가족 섹션이 콜백으로 보고(⌘Enter 조기 제출 차단용). */
  const [spouseDateModalOpen, setSpouseDateModalOpen] = useState(false)
  // 날짜·국가·인물·가문·종교 선택 모달 또는 등록완료 다이얼로그가 떠 있으면
  // ⌘Enter가 그 모달의 입력 중 폼을 제출해버리지 않도록 단축키를 막는다.
  const anyModalOpen =
    showCountryModal ||
    showBirthDateModal ||
    showDeathDateModal ||
    showFatherModal ||
    showMotherModal ||
    showSpouseModal ||
    affCountryPickerRow !== null ||
    affDateModalOpen ||
    spouseDateModalOpen ||
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

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {}
    // 성(surname)은 외자·단일명·성 미상 인물을 위해 선택. 이름·성별·국적만 필수.
    if (!name.trim()) e.name = REQUIRED_MESSAGES.name
    if (!gender) e.gender = REQUIRED_MESSAGES.gender
    if (!primaryCountryId) e.countryId = REQUIRED_MESSAGES.countryId
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
    // 소속 행이 상시 노출이라 파생 aria-invalid로 handleSubmit 첫-오류 스크롤이 곧바로 착지한다.
    if (hasAffiliationDateError(countryAffiliations)) {
      e._form = '국가 소속의 기간을 확인해주세요. 종료일이 시작일보다 빠른 행이 있습니다.'
    }
    // 배우자 미선택 행에 혼인일·서열·메모만 입력하면 저장 시 조용히 폐기되므로 제출 차단.
    const normalizedSpouseRows = spouseRows.map((row) => normalizeSpouseRow(row))
    const orphanSpouseMeta = normalizedSpouseRows.some(
      (row) =>
        !row.spouseId &&
        (hasAnyPartialDateInput(row.start) ||
          hasAnyPartialDateInput(row.end) ||
          row.rank ||
          (row.note && row.note.trim())),
    )
    // 혼인 종료일이 시작일보다 빠른 행(음수 기간)도 차단 — 공통 정밀도까지만 보수 비교(BC 안전).
    const badSpouseDate = normalizedSpouseRows.some(
      (row) => row.spouseId && isPartialRangeInverted(row.start, row.end),
    )
    // 같은 배우자를 여러 행에 입력하면 buildSpouseRelations의 dedup(=@@unique([personId,spouseId])
    // 미러)이 둘째 이후 행(다른 혼인일·서열·메모)을 조용히 폐기하므로 제출 전 차단·안내한다.
    const spouseIdsSeen = new Set<string>()
    const duplicateSpouse = normalizedSpouseRows.some((row) => {
      if (!row.spouseId) return false
      if (spouseIdsSeen.has(row.spouseId)) return true
      spouseIdsSeen.add(row.spouseId)
      return false
    })
    if (orphanSpouseMeta || badSpouseDate || duplicateSpouse) {
      const parts: string[] = []
      if (orphanSpouseMeta)
        parts.push('배우자가 선택되지 않은 행에 혼인일·서열·메모가 입력되어 있습니다. 배우자를 선택하거나 행을 비워주세요.')
      if (badSpouseDate) parts.push('배우자 혼인 종료일이 시작일보다 빠른 행이 있습니다.')
      if (duplicateSpouse)
        parts.push('같은 배우자가 여러 행에 있습니다. 한 배우자는 한 행에만 두고 서열·혼인일은 그 행에서 갱신해 주세요.')
      e._form = [e._form, ...parts].filter(Boolean).join(' ')
    }
    setErrors(e)
    return e
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
    // 파츠 행 → 전송 형상. 구형 draft 스냅샷 행도 normalize로 승격.
    // 배우자 미선택(빈) 행은 제외 + 같은 배우자 중복 페어 제거.
    const seen = new Set<string>()
    const rows = spouseRows
      .filter((row) => {
        if (!row.spouseId || seen.has(row.spouseId)) return false
        seen.add(row.spouseId)
        return true
      })
      .map((raw) => {
        const row = normalizeSpouseRow(raw)
        return {
          spouseId: row.spouseId,
          // 폼 파츠 → 구조화 DateInfo 전송(BC·연단위 보존, 정밀도 사다리). 레거시 ISO 채널은 미사용.
          marriageStart: partialPartsToDateInfo(row.start) ?? null,
          marriageEnd: partialPartsToDateInfo(row.end) ?? null,
          marriageRank: row.rank || null,
          note: row.note?.trim() ? row.note.trim() : null,
        }
      })
    // 수정 모드: 항상 배열 전송(빈 배열이면 전체 제거). 신규: 채워진 행만.
    if (!isEditMode) return rows.length ? rows : undefined
    return rows
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
      historicalCountryId: historicalCountryId || undefined,
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
      // 별칭(아명·출생명 등). 수정: 항상 전송(빈 배열이면 전부 제거). 신규: 채워진 행만.
      nicknames:
        isEditMode || nicknameRows.some((row) => row.nickname.trim())
          ? nicknameRows
              .filter((row) => row.nickname.trim())
              .map((row, idx) => ({
                nickname: row.nickname.trim(),
                // 스냅샷 draft에 남은 레거시 자유 문자열도 토큰으로 — 서버 @IsEnum 400 방지
                type: normalizeNicknameType(row.type) || undefined,
                priority: idx,
                reason: row.reason.trim() || undefined,
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
      illegitimate,
      // 신규: 첫 배우자만 / 수정: 보존된 전체 관계를 왕복(첫 관계만 교체, 비우면 첫 관계 제거).
      spouseRelations: buildSpouseRelations(),
      isBirthDateUnknown,
      isDeathDateUnknown,
      // 미상↔추정 배타(클라 1차) — 서버도 정규화하나 페이로드에서 선반영.
      isBirthDateApproximate: isBirthDateUnknown ? false : isBirthDateApproximate,
      isDeathDateApproximate: isAlive || isDeathDateUnknown ? false : isDeathDateApproximate,
      isAlive,
      // 생존중일 때는 사망 상세를 강제로 비움 — UI에서 숨겨도 state에 남아 있을 수 있어 명시 nullify.
      deathType: isAlive ? null : (deathType || null),
      deathCause: isAlive ? null : (deathCause.trim() || null),
      deathNote: isAlive ? null : (deathNote.trim() || null),
      birthNote: birthNote.trim() || null,
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
    // 활동시기(floruit) — 값 유무와 무관하게 왕복(수정 시 해제 = null). 생몰이 있으면 표시엔 무시되나 저장은 보존.
    const floruitStart = parseInt(floruitStartYear, 10)
    const floruitEnd = parseInt(floruitEndYear, 10)
    input.floruitStartYear = floruitStartYear.trim() && !isNaN(floruitStart) ? floruitStart : null
    input.floruitEndYear = floruitEndYear.trim() && !isNaN(floruitEnd) ? floruitEnd : null
    // era는 floruit 연도가 있을 때만 기록 — 모든 인물의 era 컬럼이 'AD'로 오염되지 않게.
    input.floruitEra =
      input.floruitStartYear != null || input.floruitEndYear != null ? floruitEra : null
    return input
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  /**
   * plain Enter 조기 제출 차단 — 다중 섹션 롱폼에서 반복행/선택 입력 중 Enter가 폼 전체를
   * 제출해버리는 사고를 막는다. 명시적 제출은 푸터 버튼·⌘Enter로만. 단,
   * (1) textarea·(2) 필수 이름 입력에서의 Enter는 관습상 허용, (3) 콤보/모달 자체 Enter는
   * 그 컴포넌트가 이미 preventDefault하므로 이 가드가 간섭하지 않는다(중복 preventDefault 무해).
   */
  const handleFormKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (
      event.key !== 'Enter' ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    ) {
      return
    }
    const target = event.target as HTMLElement
    const tag = target.tagName?.toLowerCase()
    if (tag !== 'input') return // textarea·select·button 등은 브라우저 기본 유지
    // 필수 이름 필드에서의 Enter만 관습적 제출 허용(그 외 input은 조기 제출 차단).
    if (target.dataset.jumpTarget === 'name') return
    event.preventDefault()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // 재진입 가드 — 버튼 disabled·⌘Enter 가드와 별개로 핸들러 자체에서도 이중 제출 차단.
    if (isSubmitting || uploadingThumbnail) return
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      // 검증 실패 시 첫 오류 필드로 스크롤·포커스 — 긴 폼에서 놓치지 않도록.
      // (성별 SegmentControl처럼 aria-invalid를 렌더하지 않는 컨트롤은 data-field-error로 매칭)
      const hasFieldAnchor = Object.keys(validationErrors).some(
        (key) => key !== '_form',
      )
      requestAnimationFrame(() => {
        const el = formRef.current?.querySelector<HTMLElement>(
          '[aria-invalid="true"], [data-field-error="true"]',
        )
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.focus?.()
        } else if (validationErrors._form) {
          // 필드 앵커가 없는 _form-only 실패(배우자 orphan·중복·기간역전 등)는
          // 스크롤이 착지할 곳이 없어 제출이 '먹통'처럼 보인다 → 최상단 TopAlert로 폴백 스크롤.
          layoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
      // 필드 오류 없이 _form만 선 경우 토스트로도 원인을 알린다(가시 피드백 보장).
      if (validationErrors._form && !hasFieldAnchor) {
        notify.error(validationErrors._form)
      }
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
          // 주 국적 두 필드 모두 명시 null로 해제 — 현대↔역사 전환 시 반대편 FK가 서버에 잔존(시한폭탄)하는 것 방지.
          countryId: countryId || null,
          historicalCountryId: historicalCountryId || null,
          dynastyId: dynastyId || null,
          religionId: religionId || null,
          fatherId: fatherId || null,
          motherId: motherId || null,
          birthCityId: birthCityId || null,
          deathCityId: deathCityId || null,
          // 행정구역도 명시 null로 — cityId만 null 처리하면 장소를 비워도 기존 adminDivisionId가 서버에 잔존한다.
          birthAdminDivisionId: birthPlace?.adminDivisionId || null,
          deathAdminDivisionId: deathPlace?.adminDivisionId || null,
          // 날짜가 비워졌으면(미상·생존 전환 포함) null = 해제.
          // isAlive·isDeathDateUnknown 플래그 수신 시 서버도 함께 클리어(이중 안전장치).
          birth: payload.birth ?? null,
          death: payload.death ?? null,
          // 낙관적 동시성(CC1) — 로드 시점 대비 서버가 바뀌었으면 409로 덮어쓰기 차단.
          expectedUpdatedAt: loadedUpdatedAtRef.current ?? undefined,
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
      // 낙관적 동시성 충돌(409, CC1) — 다른 세션이 먼저 저장.
      // 여기서 토큰(loadedUpdatedAtRef)을 서버 최신값으로 자동 갱신하면, 사용자가 아무것도
      // 안 고치고 재저장해도 토큰이 일치해 통과 → 상대 세션 변경이 무성 덮어써진다(낙관동시성이
      // 1회성 speed bump로 무력화). 따라서 토큰은 스테일로 유지해(=재저장이 계속 409로 막힘)
      // '최신 내용 불러오기'(handleReloadAfterConflict)로 재하이드레이션한 뒤에만 진행하게 한다.
      if (err?.status === 409) {
        setShowConflictReload(true)
        const conflictMsg =
          '다른 곳에서 이 인물이 먼저 수정되었습니다. 아래 ‘최신 내용 불러오기’로 최신 내용을 확인한 뒤 다시 저장해 주세요.'
        setErrors((prev) => ({ ...prev, _form: conflictMsg }))
        notify.error(conflictMsg)
        return
      }
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


  // 4가지 상태(업로드 중 / 제출 중 / 수정 / 신규) 중 하나의 라벨을 lookup으로 결정.
  // 진입점(모달/페이지) 간 제출 라벨 단일 출처 — 모달 wrapper의 '수정 완료'/'인물 등록'과 일치.
  const submitButtonLabel = uploadingThumbnail
    ? '이미지 업로드 중…'
    : isSubmitting
      ? isEditMode ? '저장 중…' : '등록 중…'
      : isEditMode ? '수정 완료' : '인물 등록'

  // 페이지 wrapper(`PersonRegisterPage`)가 sticky 푸터·뒤로가기 헤더·버튼 라벨을 담당.
  // 이 컴포넌트는 폼 본체만 렌더한다 — 모달은 CountryFormShell이, 페이지는 wrapper가 외곽을 책임.
  React.useEffect(() => {
    onSubmitLabelChange?.(submitButtonLabel)
  }, [submitButtonLabel, onSubmitLabelChange])

  /**
   * 좌측 scroll-spy 인덱스용 섹션 목록 — 본문의 data-form-section 앵커와 id가 일치.
   * 접기 제거로 4개 챕터(기본 정보·생애·가문/종교/국가·가족)가 항상 노출되므로 무조건 emit한다.
   * (이름 상세는 '기본 정보', 출생지/사망지·사망 상세·군주 호칭은 '생애' 챕터로 흡수됨.)
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
        // 성(surname)·이름 상세는 선택 — 완료 배지는 필수(이름·성별·국적)만으로 판정.
        filled: !!name && !!gender && !!primaryCountryId,
      },
      {
        id: 'life',
        // 생몰 날짜(essentials) + 출생지/사망지·사망 상세·군주 호칭(details)을 한 챕터로 흡수.
        label: '생애',
        filled:
          !!birthYear ||
          isBirthDateUnknown ||
          !!deathYear ||
          isDeathDateUnknown ||
          !!birthPlace ||
          !!deathPlace ||
          !!deathCause ||
          !!deathNote ||
          !!regnalName ||
          !!templeName ||
          !!posthumousName,
      },
      {
        id: 'affiliation',
        label: '가문 · 종교 · 소속',
        filled: !!dynastyId || !!religionId || countryAffiliations.length > 0,
      },
      {
        id: 'family',
        label: '가족',
        filled: !!fatherId || !!motherId || spouseRows.length > 0,
      },
    ]
    // id·label·filled가 실제로 바뀐 경우에만 부모로 전달 (불필요한 리렌더 차단).
    const key = sections.map((s) => `${s.id}:${s.filled ? 1 : 0}`).join('|')
    if (key === lastSectionsKeyRef.current) return
    lastSectionsKeyRef.current = key
    onSectionsChangeRef.current?.(sections)
  }, [
    name,
    gender,
    primaryCountryId,
    birthYear,
    isBirthDateUnknown,
    deathYear,
    isDeathDateUnknown,
    birthPlace,
    deathPlace,
    deathCause,
    deathNote,
    regnalName,
    templeName,
    posthumousName,
    dynastyId,
    religionId,
    countryAffiliations,
    fatherId,
    motherId,
    spouseRows,
  ])

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <PersonFormLayoutWrap ref={layoutRef}>
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
          {showConflictReload && (
            <ConflictReloadBtn
              type="button"
              onClick={handleReloadAfterConflict}
              disabled={isSubmitting || isLoadingEdit}
            >
              최신 내용 불러오기
            </ConflictReloadBtn>
          )}
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
        onKeyDown={handleFormKeyDown}
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
             * 4개 챕터(기본 정보 · 생애 · 가문/종교/국가 · 가족)를 늘 펼쳐 두되,
             * 필수(이름·성별·국적)를 앞에 모으고 OptionalSeam으로 '여기까지면 등록 끝'을 표식.
             * 세부(이름 원어/뜻·사망 상세·군주 호칭)는 필드 단위 disclosure로만 접어 첫인상 부담을 관리.
             */}
            <FormRows data-form-section="basic">
                <CoreSectionLabel>이름</CoreSectionLabel>
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
                        alt={namePreview ? `${namePreview} 프로필 사진` : '프로필 사진'}
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
                    {/* 라벨 안에 두어 :focus-within 링이 원형 썸네일에 뜨고, 키보드(Tab→Space)로
                        네이티브 파일 대화상자가 열리게 한다(display:none이면 포커스 불가). */}
                    <ThumbnailUploadInput
                      id="person-thumbnail-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      disabled={isSubmitting}
                      aria-label="프로필 사진 업로드"
                      aria-describedby="person-thumbnail-hint"
                    />
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
                            : '프로필 사진 제거'
                        }
                      >
                        <FiTrash2 size={13} />
                        {pendingThumbnailFile ? '선택 취소' : '프로필 사진 제거'}
                      </ThumbnailHeroRemoveBtn>
                    )}
                  </ThumbnailHeroBody>
                </ThumbnailHero>

                <FieldRow>
                  {/* 필수 표식은 '이름'에만 귀속 — 성·중간이름은 선택(외자·성 미상 인물 대응).
                      htmlFor도 필수 필드(name)를 가리켜 라벨 클릭·SR이 이름으로 착지한다. */}
                  <FieldLabel htmlFor={fid('name')}>
                    성 · 이름<Required>*</Required> · 중간이름{' '}
                    <NameOnlyRequiredNote>(이름만 필수)</NameOnlyRequiredNote>
                  </FieldLabel>
                  <FieldControl>
                    <InlineFields $template="minmax(90px, 0.8fr) minmax(140px, 1.4fr) minmax(110px, 1fr)">
                      <FormInput
                        id={fid('surname')}
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                        placeholder="홍"
                      />
                      <FormInput
                        id={fid('name')}
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value)
                          clearFieldError('name')
                        }}
                        onBlur={() => handleRequiredTextBlur('name', name)}
                        placeholder="길동"
                        data-jump-target="name"
                        aria-required
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
                              (countryNameOrderById.get(primaryCountryId) ??
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

                {/* 이름 원어 — 성·이름 클러스터에 인접(구 '이름 상세' 섹션에서 이관) */}
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

                {/* 이름의 뜻 — 성·이름·중간이름의 한자/뜻 (옵셔널 disclosure) */}
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
                    </AdvancedBody>
                  )}
                </AdvancedSection>

                {/* 별칭(아명·출생명·자·필명 등) — 이름 클러스터에 인접. 개명 인물의 출생명 등. */}
                <NicknameSection
                  rows={nicknameRows}
                  setRows={setNicknameRows}
                  markDirty={markDirty}
                />

                <CoreDivider />

                <CoreSectionLabel>신원</CoreSectionLabel>
                {/* 성별·국적 — 짧은 코어 컨트롤이라 가로 2열로 묶음 */}
                <CoreFieldPair>
                  <CoreFieldCell>
                    <FieldLabel htmlFor={fid('gender')}>
                      성별<Required>*</Required>
                    </FieldLabel>
                    {/* SegmentControl은 aria-invalid를 렌더하지 않음 — 제출 실패 시 첫 오류
                        스크롤 셀렉터가 잡을 수 있게 래퍼에 data-field-error를 단다.
                        푸터 진척칩 '미완으로 이동'(data-jump-target) 착지점이자, tabIndex를 상시
                        -1로 둬 스크롤 후 프로그램 포커스가 안착하게 한다(SegmentControl은 div라 기본 비포커스). */}
                    <div
                      data-jump-target="gender"
                      data-field-error={errors.gender ? 'true' : undefined}
                      tabIndex={-1}
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
                        ariaDescribedBy={
                          errors.gender ? fid('gender-err') : undefined
                        }
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
                      data-jump-target="countryId"
                      type="button"
                      $hasValue={!!countryName}
                      $error={!!errors.countryId}
                      aria-invalid={!!errors.countryId}
                      aria-describedby={
                        errors.countryId ? fid('countryId-err') : undefined
                      }
                      onClick={() => setShowCountryModal(true)}
                    >
                      <span>{countryName || '국가 선택 (현대·역사)'}</span>
                      <FiChevronDown size={18} />
                    </SelectBtn>
                    {errors.countryId && (
                      <FieldError id={fid('countryId-err')} role="alert">
                        <FiAlertCircle size={13} />
                        {errors.countryId}
                      </FieldError>
                    )}
                    <FieldHint>
                      {countryIsHistorical
                        ? '역사 국가(과거)를 선택했어요.'
                        : '과거 국가(예: 잉글랜드 왕국)는 선택 창의 ‘역사 국가’ 탭에서 고를 수 있어요.'}
                    </FieldHint>
                  </CoreFieldCell>
                </CoreFieldPair>
              </FormRows>

              <CoreDivider />

              {/* 생몰 요약 — 출생~사망·생존 여부 (essentials, 늘 노출) */}
              <div data-form-section="life">
              <CoreSectionLabel>생몰</CoreSectionLabel>
              <LifeSection
                mode="essentials"
                fid={fid}
                birthEra={birthEra}
                birthYear={birthYear}
                birthMonth={birthMonth}
                birthDay={birthDay}
                isBirthDateUnknown={isBirthDateUnknown}
                setIsBirthDateUnknown={setIsBirthDateUnknown}
                isBirthDateApproximate={isBirthDateApproximate}
                setIsBirthDateApproximate={setIsBirthDateApproximate}
                isDeathDateApproximate={isDeathDateApproximate}
                setIsDeathDateApproximate={setIsDeathDateApproximate}
                setShowBirthDateModal={setShowBirthDateModal}
                setBirthEra={setBirthEra}
                setBirthYear={setBirthYear}
                setBirthMonth={setBirthMonth}
                setBirthDay={setBirthDay}
                deathEra={deathEra}
                deathYear={deathYear}
                deathMonth={deathMonth}
                deathDay={deathDay}
                isAlive={isAlive}
                isDeathDateUnknown={isDeathDateUnknown}
                setShowDeathDateModal={setShowDeathDateModal}
                setDeathEra={setDeathEra}
                setDeathYear={setDeathYear}
                setDeathMonth={setDeathMonth}
                setDeathDay={setDeathDay}
                setDeathStatus={setDeathStatus}
                floruitStartYear={floruitStartYear}
                floruitEndYear={floruitEndYear}
                floruitEra={floruitEra}
                setFloruitStartYear={setFloruitStartYear}
                setFloruitEndYear={setFloruitEndYear}
                setFloruitEra={setFloruitEra}
                deathType={deathType}
                deathCause={deathCause}
                birthNote={birthNote}
                setBirthNote={setBirthNote}
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

              {/* 생애 상세 — 출생지·사망지 + 사망 유형·원인·메모 + 군주 호칭 (생몰과 한 챕터로 인접 배치) */}
              <CoreDivider />
              <CoreSectionLabel>생애 상세</CoreSectionLabel>
              {/* 출생지·사망지 — 생몰 날짜와 한 흐름에 두어 발견성 회복 */}
              <PlaceFields
                countryId={primaryCountryId}
                birthPlace={birthPlace}
                deathPlace={deathPlace}
                setBirthPlace={setBirthPlace}
                setDeathPlace={setDeathPlace}
                setBirthCityId={setBirthCityId}
                setDeathCityId={setDeathCityId}
                onCopyBirthToDeathPlace={handleCopyBirthToDeathPlace}
                markDirty={markDirty}
              />
              <LifeSection
                mode="details"
                fid={fid}
                birthEra={birthEra}
                birthYear={birthYear}
                birthMonth={birthMonth}
                birthDay={birthDay}
                isBirthDateUnknown={isBirthDateUnknown}
                setIsBirthDateUnknown={setIsBirthDateUnknown}
                isBirthDateApproximate={isBirthDateApproximate}
                setIsBirthDateApproximate={setIsBirthDateApproximate}
                isDeathDateApproximate={isDeathDateApproximate}
                setIsDeathDateApproximate={setIsDeathDateApproximate}
                setShowBirthDateModal={setShowBirthDateModal}
                setBirthEra={setBirthEra}
                setBirthYear={setBirthYear}
                setBirthMonth={setBirthMonth}
                setBirthDay={setBirthDay}
                deathEra={deathEra}
                deathYear={deathYear}
                deathMonth={deathMonth}
                deathDay={deathDay}
                isAlive={isAlive}
                isDeathDateUnknown={isDeathDateUnknown}
                setShowDeathDateModal={setShowDeathDateModal}
                setDeathEra={setDeathEra}
                setDeathYear={setDeathYear}
                setDeathMonth={setDeathMonth}
                setDeathDay={setDeathDay}
                setDeathStatus={setDeathStatus}
                floruitStartYear={floruitStartYear}
                floruitEndYear={floruitEndYear}
                floruitEra={floruitEra}
                setFloruitStartYear={setFloruitStartYear}
                setFloruitEndYear={setFloruitEndYear}
                setFloruitEra={setFloruitEra}
                deathType={deathType}
                deathCause={deathCause}
                birthNote={birthNote}
                setBirthNote={setBirthNote}
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

              {/* 필수/선택 경계 — 접기(MoreToggle)가 겸하던 '여기까지면 등록 끝' 표식을 seam으로 복원 */}
              <OptionalSeam>
                여기까지가 인물 기본 정보예요 · 아래 소속·가족은 선택이라 지금 등록해도 돼요
              </OptionalSeam>

              <>
                {/* 가문 · 종교 · 국가 — 가문·종교 + 다중 국가 소속 */}
                <div data-form-section="affiliation">
                <CoreSectionLabel>가문 · 종교 · 소속</CoreSectionLabel>
                <AffiliationSection
                  dynastyOptions={dynastySelectOptions}
                  religionOptions={religionSelectOptions}
                  dynastyValue={dynastyId}
                  religionValue={religionId}
                  onDynastyChange={setDynastyId}
                  onReligionChange={setReligionId}
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
                <CoreDivider />
                <div data-form-section="family">
                <CoreSectionLabel>가족</CoreSectionLabel>
                <FamilySection
                  fid={fid}
                  fatherId={fatherId}
                  motherId={motherId}
                  illegitimate={illegitimate}
                  spouseRows={spouseRows}
                  setFatherId={setFatherId}
                  setMotherId={setMotherId}
                  setIllegitimate={setIllegitimate}
                  setSpouseRows={setSpouseRows}
                  showFatherModal={showFatherModal}
                  showMotherModal={showMotherModal}
                  showSpouseModal={showSpouseModal}
                  setShowFatherModal={setShowFatherModal}
                  setShowMotherModal={setShowMotherModal}
                  setShowSpouseModal={setShowSpouseModal}
                  knownPersons={knownPersons}
                  persons={persons}
                  setPersons={setPersons}
                  recentCandidates={recentCandidates}
                  editPersonId={editPersonId}
                  countryId={countryId}
                  markDirty={markDirty}
                  onDateModalOpenChange={setSpouseDateModalOpen}
                />
                </div>
              </>
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
          if (primaryCountryId && countryName) {
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
        title="국적 선택"
        selectedCountryId={primaryCountryId || undefined}
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
