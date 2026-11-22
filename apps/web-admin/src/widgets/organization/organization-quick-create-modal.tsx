/**
 * 새 기구·협의체·조직 등록 모달 — **사건 등록 모달(`widgets/event-form/ui/event-register-modal`)과
 * 같은 문법**으로 짠다. 기구 목록·사건 상세 '기구·조직'·사건 등록 폼 세 곳이 같은 인스턴스를 쓴다.
 *
 * 사건 모달에서 가져온 것:
 * - 셸: 공용 `RegisterModal`(Esc·스크롤락·포커스 트랩·aria). 예전엔 createPortal + 손수 만든 오버레이·
 *   Esc 처리라 포커스가 모달 밖으로 새고, 바깥을 한 번 잘못 누르면 쓰던 내용이 경고 없이 날아갔다.
 * - 헤더: 섹션 이동 알약(완료 ✓ · 개수 배지) + 2단/1단 전환 + 작성 중일 때만 '초기화'
 * - 본문: 2단이면 좌(기본 정보) / 우(회원국·소재 · 소속 인물)가 각자 스크롤, 1단이면 위에서 아래로
 * - 섹션 머리: 점(•) + 구분선 + 오른쪽 요약 배지 — 점·배지 색은 고른 기구 유형 색
 * - 행: 왼쪽 라벨 열 · 오른쪽 입력(사건 폼 `FormRow`)
 * - 푸터: 빠진 필수 칸·잘못된 설립 연도로 **이동하는** 버튼 / 준비 완료 + ⌘↵ 저장
 * - 작성 중 닫기 확인
 *
 * 칸·힌트·추천 칩·노출 조건은 예전 그대로다(국제형이면 회원국 칸, 국내형이면 소재 국가 칸).
 * 등록 뒤 무엇을 할지(상세 열기·사건에 잇기)는 부르는 쪽 `onCreated`가 정한다.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiColumns, FiGlobe, FiPlus, FiUser, FiX } from 'react-icons/fi'

import * as S from '@/pages/events/create/event-create.styles'
import { getApiConnection } from '@/shared/api/client'
import { getAllCountries } from '@/shared/api/countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import {
  createOrganization,
  isInternationalOrgType,
  ORGANIZATION_COUNTRY_ROLE_LABEL,
  ORGANIZATION_SCOPE_LABEL,
  ORGANIZATION_TYPE_HUE,
  type OrganizationCountryRole,
  type OrganizationResponseDto,
  type OrganizationScope,
  type OrganizationType,
} from '@/shared/api/organizations'
import { getAllPersons } from '@/shared/api/persons'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { CountryPicker } from '@/shared/ui/country-picker'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  FooterActions,
  FooterHint,
  FooterJumpArrow,
  FooterJumpButton,
  FooterKbd,
  FooterReadyBadge,
  FooterReadyGroup,
  FooterShortcutItem,
  HeaderActionsBar,
  HeaderResetBtn,
  SectionJumpBtn,
  SectionJumpNav,
  useModalSubmitShortcut,
} from '@/shared/ui/register-modal-shell/register-modal-chrome'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalStickyFooter,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import { SegmentControl } from '@/shared/ui/segment-control/segment-control'
import { notify } from '@/shared/ui/toast'

import * as OrgS from './organization-quick-create-modal.styles'

const QUICK_ORG_TYPES: Array<{
  value: OrganizationType
  label: string
  example: string
}> = [
  {
    value: 'MULTILATERAL_FORUM',
    label: '다자 협의체·국가 블록',
    example: '예: 쿼드(Quad), G7, G20, APEC, BRICS, ASEM, 파이브 아이즈, 유럽협조체제',
  },
  {
    value: 'INTERGOVERNMENTAL_ORG',
    label: '국제기구',
    example: '예: 아세안(ASEAN), 유엔(UN), 세계무역기구(WTO), 유럽연합(EU), 국제연맹',
  },
  {
    value: 'MILITARY_ALLIANCE',
    label: '군사동맹',
    example: '예: 북대서양조약기구(NATO), 바르샤바 조약기구, 델로스 동맹',
  },
  {
    value: 'NGO',
    label: '비정부기구·시민결사',
    example: '예: 국제적십자위원회(ICRC), 그린피스, 자코뱅 클럽, 삼민주의청년단',
  },
  {
    value: 'TRADE_UNION',
    label: '노동조합·연맹',
    example: '예: 전국노동조합총연맹, 솔리다르노시치(연대노조)',
  },
  {
    value: 'BUSINESS_ASSOCIATION',
    label: '상공·직능단체',
    example: '예: 한자 동맹 상인조합, 경단련, 상공회의소',
  },
  {
    value: 'EDUCATION',
    label: '학술·교육·연구기관',
    example: '예: 왕립학회, 집현전 학단, 고등사범학교, 싱크탱크',
  },
  {
    value: 'RELIGIOUS_ORG',
    label: '종교단체·교단·기사단',
    example: '예: 예수회, 성전기사단, 튜튼 기사단',
  },
  {
    value: 'PARTY_ORGAN',
    label: '당 기구',
    example: '예: 파시즘 대평의회, 소련 공산당 정치국, 중앙위원회',
  },
  {
    value: 'MASS_ORGANIZATION',
    label: '대중 조직(청년·여성·학생)',
    example: '예: 발릴라, 히틀러 유겐트, 콤소몰',
  },
  {
    value: 'PARAMILITARY',
    label: '준군사조직',
    example: '예: 검은 셔츠단, 돌격대(SA), 자유군단(Freikorps)',
  },
  {
    value: 'MEDIA',
    label: '언론·출판',
    example: '예: 이탈리아 인민(Il Popolo d’Italia), 프라우다, 타임스',
  },
  {
    value: 'POLITICAL_ALLIANCE',
    label: '정치 연합·인터내셔널',
    example: '예: 인민전선, 코민테른, 사회주의 인터내셔널',
  },
  {
    value: 'OTHER',
    label: '기타 민간·비국가 단체',
    example: '예: 의병진, 역사적 민간 결사체',
  },
]

const MEMBER_COUNTRY_ROLES: OrganizationCountryRole[] = [
  'MEMBER',
  'FOUNDER',
  'DIALOGUE_PARTNER',
  'OBSERVER',
  'SECRETARIAT_HOST',
]

const LAYOUT_STORAGE_KEY = 'papyrus:organization-register-layout-v1'

type FormSectionKey = 'basic' | 'countries' | 'members'

const NAME_INPUT_ID = 'org-quick-create-name'
const FOUNDED_INPUT_ID = 'org-quick-create-founded'

export interface OrganizationQuickMemberDraft {
  id: string
  name: string
  roleTitle: string
}

export interface OrganizationQuickCountryDraft {
  key: string
  countryId?: string
  historicalCountryId?: string
  name: string
  flagEmoji?: string | null
  role: OrganizationCountryRole
}

interface Props {
  defaultCountryId?: string
  defaultHistoricalCountryId?: string
  defaultName?: string
  defaultType?: OrganizationType
  /** 사건·진영에 이미 추가된 인물들을 원클릭 추천 칩으로 표시 */
  candidatePersons?: Array<{ id: string; name: string; role?: string }>
  defaultMembers?: Array<{ id: string; name: string; roleTitle?: string }>
  /** 사건에 이미 추가된 참여국들을 회원국 원클릭 추천 칩으로 표시 */
  candidateCountries?: Array<{
    countryId?: string
    historicalCountryId?: string
    name: string
    flagEmoji?: string | null
  }>
  onClose: () => void
  onCreated: (
    organization: OrganizationResponseDto,
    initialMembers?: OrganizationQuickMemberDraft[],
  ) => void
}

function defaultScopeForType(orgType: OrganizationType): OrganizationScope {
  if (orgType === 'INTERGOVERNMENTAL_ORG' || orgType === 'MULTILATERAL_FORUM') {
    return 'INTERNATIONAL'
  }
  if (orgType === 'MILITARY_ALLIANCE') {
    return 'REGIONAL'
  }
  return 'NATIONAL'
}

function readInitialLayoutMode(): 'split' | 'single' {
  try {
    const saved = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (saved === 'split' || saved === 'single') return saved
  } catch {
    // storage disabled
  }
  return 'split'
}

/** '#6366f1' → '99, 102, 241' — 섹션 점·배지의 rgba() 재료 */
function hexToRgbTriplet(hex: string): string {
  const matched = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim())
  if (!matched) return '99, 102, 241'
  return [matched[1], matched[2], matched[3]].map((part) => Number.parseInt(part, 16)).join(', ')
}

export function OrganizationQuickCreateModal({
  defaultCountryId,
  defaultHistoricalCountryId,
  defaultName,
  defaultType = 'NGO',
  candidatePersons = [],
  defaultMembers = [],
  candidateCountries = [],
  onClose,
  onCreated,
}: Props) {
  const queryClient = useQueryClient()
  const safeDefaultType: OrganizationType =
    defaultType === 'COMPANY' ||
    defaultType === 'POLITICAL_PARTY' ||
    defaultType === 'GOVERNMENT_AGENCY'
      ? 'NGO'
      : defaultType
  /* 첫 렌더 값만 쓴다 — 부르는 쪽이 매 렌더 새 배열을 넘겨도 작성 중인 목록을 덮지 않게 */
  const [initialMembers] = useState<OrganizationQuickMemberDraft[]>(() =>
    defaultMembers.map((member) => ({
      id: member.id,
      name: member.name,
      roleTitle: member.roleTitle?.trim() || '위원',
    })),
  )
  const [name, setName] = useState(defaultName ?? '')
  const [shortName, setShortName] = useState('')
  const [localName, setLocalName] = useState('')
  const [type, setType] = useState<OrganizationType>(safeDefaultType)
  const [scope, setScope] = useState<OrganizationScope>(() =>
    defaultScopeForType(safeDefaultType),
  )
  const [countryId, setCountryId] = useState(() =>
    isInternationalOrgType(safeDefaultType) ? '' : (defaultCountryId ?? ''),
  )
  const [historicalCountryId, setHistoricalCountryId] = useState(() =>
    isInternationalOrgType(safeDefaultType) ? '' : (defaultHistoricalCountryId ?? ''),
  )
  const [foundedYear, setFoundedYear] = useState('')
  const [description, setDescription] = useState('')
  const [members, setMembers] = useState<OrganizationQuickMemberDraft[]>(initialMembers)
  const [countryMemberships, setCountryMemberships] = useState<
    OrganizationQuickCountryDraft[]
  >([])
  const [personPickerOpen, setPersonPickerOpen] = useState(false)
  const [countryPickerOpen, setCountryPickerOpen] = useState(false)
  const [layoutMode, setLayoutMode] = useState<'split' | 'single'>(readInitialLayoutMode)
  const [activeSection, setActiveSection] = useState<FormSectionKey>('basic')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Record<FormSectionKey, HTMLElement | null>>({
    basic: null,
    countries: null,
    members: null,
  })

  const handleSelectType = (nextType: OrganizationType) => {
    setType(nextType)
    setScope(defaultScopeForType(nextType))
    if (isInternationalOrgType(nextType)) {
      setCountryId('')
      setHistoricalCountryId('')
    } else if (!countryId && !historicalCountryId) {
      if (defaultCountryId) setCountryId(defaultCountryId)
      if (defaultHistoricalCountryId) setHistoricalCountryId(defaultHistoricalCountryId)
    }
  }

  const countriesQuery = useQuery({
    queryKey: ['countries-all', 'for-org-quick-create'],
    queryFn: () => getAllCountries(),
    staleTime: 5 * 60_000,
  })

  const historicalCountriesQuery = useQuery({
    queryKey: ['historical-countries-all', 'for-org-quick-create'],
    queryFn: () => getAllHistoricalCountries(),
    staleTime: 5 * 60_000,
  })

  const allPersonsQuery = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: () => getAllPersons(),
    enabled: personPickerOpen,
  })

  const trimmedFoundedYear = foundedYear.trim()
  const parsedFoundedIso = (() => {
    if (!trimmedFoundedYear) return null
    const year = Number.parseInt(trimmedFoundedYear, 10)
    if (!Number.isFinite(year) || year < 1000 || year > 9999) return null
    return `${String(year).padStart(4, '0')}-01-01T00:00:00.000Z`
  })()
  /** 적었는데 못 쓰는 연도 — 예전엔 조용히 버려져 '설립 연도 없음'으로 저장됐다 */
  const foundedYearInvalid = trimmedFoundedYear !== '' && parsedFoundedIso === null

  const isDirty =
    name.trim() !== (defaultName ?? '').trim() ||
    shortName.trim() !== '' ||
    localName.trim() !== '' ||
    trimmedFoundedYear !== '' ||
    description.trim() !== '' ||
    countryMemberships.length > 0 ||
    members.length !== initialMembers.length ||
    type !== safeDefaultType

  const createMutation = useMutation({
    mutationFn: () =>
      createOrganization(getApiConnection(), {
        name: name.trim(),
        shortName: shortName.trim() || null,
        localName: localName.trim() || null,
        type,
        scope,
        foundedDate: parsedFoundedIso,
        countryId: countryId || null,
        historicalCountryId: historicalCountryId || null,
        description: description.trim() || null,
        ...(members.length > 0
          ? {
              members: members.map((member) => ({
                personId: member.id,
                roleTitle: member.roleTitle.trim() || '위원',
              })),
            }
          : {}),
        ...(countryMemberships.length > 0
          ? {
              countryMemberships: countryMemberships.map((membership, index) => ({
                countryId: membership.countryId ?? null,
                historicalCountryId: membership.historicalCountryId ?? null,
                role: membership.role,
                sortOrder: index,
              })),
            }
          : {}),
      }),
    onSuccess: (created) => {
      const summaryParts = [
        countryMemberships.length > 0 ? `회원국 ${countryMemberships.length}개국` : null,
        members.length > 0 ? `소속 인물 ${members.length}명` : null,
      ].filter(Boolean)
      notify.success(
        summaryParts.length > 0
          ? `‘${created.name}’ 기구·조직(${summaryParts.join(' · ')})을 등록했습니다.`
          : `‘${created.name}’ 기구·조직을 등록했습니다.`,
      )
      void queryClient.invalidateQueries({ queryKey: ['organizations'] })
      void queryClient.invalidateQueries({
        queryKey: ['register-record-candidates', 'organizations'],
      })
      onCreated(created, members)
    },
    onError: (error) =>
      notify.error(error instanceof Error ? error.message : '기관·조직 생성에 실패했습니다.'),
  })

  const busy = createMutation.isPending
  const missingName = !name.trim()
  const canSubmit = !missingName && !foundedYearInvalid && !busy

  const availableCandidates = candidatePersons.filter(
    (candidate) => !members.some((member) => member.id === candidate.id),
  )

  const availableCountryCandidates = candidateCountries.filter((candidate) => {
    const key = candidate.historicalCountryId
      ? `H:${candidate.historicalCountryId}`
      : `C:${candidate.countryId}`
    return !countryMemberships.some((item) => item.key === key)
  })

  const addMember = (id: string, personName: string, roleHint?: string) => {
    setMembers((previous) =>
      previous.some((member) => member.id === id)
        ? previous
        : [...previous, { id, name: personName, roleTitle: roleHint?.trim() || '위원' }],
    )
  }

  const addCountryDraft = (draft: {
    countryId?: string
    historicalCountryId?: string
    name: string
    flagEmoji?: string | null
    role?: OrganizationCountryRole
  }) => {
    const key = draft.historicalCountryId ? `H:${draft.historicalCountryId}` : `C:${draft.countryId}`
    if (!draft.countryId && !draft.historicalCountryId) return
    setCountryMemberships((previous) =>
      previous.some((item) => item.key === key)
        ? previous
        : [
            ...previous,
            {
              key,
              countryId: draft.countryId,
              historicalCountryId: draft.historicalCountryId,
              name: draft.name,
              flagEmoji: draft.flagEmoji,
              role: draft.role ?? 'MEMBER',
            },
          ],
    )
  }

  const currentTypeMeta = QUICK_ORG_TYPES.find((item) => item.value === type) ?? QUICK_ORG_TYPES[0]
  const isInternational = isInternationalOrgType(type)
  const showCountryMemberships =
    isInternational || countryMemberships.length > 0 || availableCountryCandidates.length > 0

  const seatCountryName = useMemo(() => {
    if (historicalCountryId) {
      return (historicalCountriesQuery.data ?? []).find((country) => country.id === historicalCountryId)?.name ?? null
    }
    if (countryId) {
      return (countriesQuery.data ?? []).find((country) => country.id === countryId)?.name ?? null
    }
    return null
  }, [historicalCountryId, countryId, historicalCountriesQuery.data, countriesQuery.data])

  /* ─── 닫기 · 초기화 ─── */

  const requestClose = useCallback(async () => {
    if (busy) return
    if (isDirty) {
      const ok = await confirm({
        title: '작성 중인 기구·조직이 있습니다',
        message: '저장하지 않고 닫으면 입력한 내용이 사라집니다.',
        confirmLabel: '닫기',
        danger: true,
      })
      if (!ok) return
    }
    onClose()
  }, [busy, isDirty, onClose])

  const resetForm = async () => {
    const ok = await confirm({
      title: '작성 내용을 초기화할까요?',
      message: '입력한 내용을 모두 비우고 처음 상태로 되돌립니다.',
      confirmLabel: '초기화',
      danger: true,
    })
    if (!ok) return
    setName(defaultName ?? '')
    setShortName('')
    setLocalName('')
    setType(safeDefaultType)
    setScope(defaultScopeForType(safeDefaultType))
    setCountryId(isInternationalOrgType(safeDefaultType) ? '' : (defaultCountryId ?? ''))
    setHistoricalCountryId(
      isInternationalOrgType(safeDefaultType) ? '' : (defaultHistoricalCountryId ?? ''),
    )
    setFoundedYear('')
    setDescription('')
    setMembers(initialMembers)
    setCountryMemberships([])
  }

  /* ─── 섹션 이동 ─── */

  const scrollToSection = (key: FormSectionKey) => {
    setActiveSection(key)
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const focusField = (inputId: string) => {
    scrollToSection('basic')
    requestAnimationFrame(() => document.getElementById(inputId)?.focus())
  }

  const toggleLayoutMode = () => {
    setLayoutMode((previous) => {
      const next = previous === 'split' ? 'single' : 'split'
      try {
        window.localStorage.setItem(LAYOUT_STORAGE_KEY, next)
      } catch {
        // storage disabled
      }
      return next
    })
  }

  /* 1단 보기에서 스크롤 위치로 현재 섹션 알약을 켠다 */
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || layoutMode === 'split') return
    const handleScroll = () => {
      const top = container.getBoundingClientRect().top
      let current: FormSectionKey = 'basic'
      for (const key of ['basic', 'countries', 'members'] as const) {
        const element = sectionRefs.current[key]
        if (element && element.getBoundingClientRect().top - top < 120) current = key
      }
      setActiveSection(current)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [layoutMode])

  const submitRef = useRef(() => {})
  submitRef.current = () => {
    if (canSubmit) createMutation.mutate()
  }
  const handleShortcutSubmit = useCallback(() => submitRef.current(), [])
  useModalSubmitShortcut({
    enabled: canSubmit && !personPickerOpen && !countryPickerOpen,
    scrollContainerRef,
    onSubmit: handleShortcutSubmit,
  })

  /* ─── 섹션 배지 ─── */

  const sectionMeta: Array<{ key: FormSectionKey; label: string; badge: string | null }> = [
    { key: 'basic', label: '기본 정보', badge: missingName ? null : '✓' },
    {
      key: 'countries',
      label: isInternational ? '회원국' : '소재 국가',
      badge: isInternational
        ? countryMemberships.length > 0
          ? String(countryMemberships.length)
          : null
        : seatCountryName || countryMemberships.length > 0
          ? '✓'
          : null,
    },
    {
      key: 'members',
      label: '소속 인물',
      badge: members.length > 0 ? String(members.length) : null,
    },
  ]

  const typeHue = ORGANIZATION_TYPE_HUE[type] ?? '#6366f1'
  const typeToneStyle = {
    '--org-type-accent': typeHue,
    '--org-type-rgb': hexToRgbTriplet(typeHue),
  } as React.CSSProperties

  /* ─── 섹션 ─── */

  const basicSectionNode = (
    <OrgS.FormGroupSection
      ref={(element) => {
        sectionRefs.current.basic = element
      }}
      aria-labelledby="org-quick-create-basic-title"
    >
      <OrgS.FormGroupTitle id="org-quick-create-basic-title">
        기본 정보
        <OrgS.FormGroupSummaryBadge>{currentTypeMeta.label}</OrgS.FormGroupSummaryBadge>
      </OrgS.FormGroupTitle>

      <S.FormRow>
        <S.FormLabel as="div">
          유형 <S.Required>*</S.Required>
        </S.FormLabel>
        <S.FormField>
          <SegmentControl
            appearance="chips"
            ariaLabel="기구·조직 유형"
            value={type}
            onChange={handleSelectType}
            options={QUICK_ORG_TYPES.map((item) => ({ value: item.value, label: item.label }))}
          />
          <OrgS.TypeExample>
            {currentTypeMeta.example} · 정당(/political-parties)·행정부처(/government)·기업(/companies)은
            각각 전용 도메인에서 등록합니다.
          </OrgS.TypeExample>
        </S.FormField>
      </S.FormRow>

      <S.FormRow>
        <S.FormLabel htmlFor={NAME_INPUT_ID}>
          기구·조직명 <S.Required>*</S.Required>
        </S.FormLabel>
        <S.FormField>
          <S.Input
            id={NAME_INPUT_ID}
            aria-label="기관·조직명"
            value={name}
            onChange={(changeEvent) => setName(changeEvent.target.value)}
            placeholder={
              isInternational
                ? '예: 쿼드(4자 안보 대화), 동남아시아국가연합, 아시아태평양경제협력체'
                : '예: 공안위원회, 국민공회, 파리 코뮌'
            }
            autoFocus
          />
          <OrgS.SubFieldGrid>
            <OrgS.SubField>
              <OrgS.SubFieldLabel>
                약칭<OrgS.OptionalTag>(선택)</OrgS.OptionalTag>
              </OrgS.SubFieldLabel>
              <S.Input
                value={shortName}
                onChange={(changeEvent) => setShortName(changeEvent.target.value)}
                placeholder={isInternational ? '예: Quad, ASEAN, APEC' : '예: 공안위'}
              />
            </OrgS.SubField>
            <OrgS.SubField>
              <OrgS.SubFieldLabel>
                현지·영문 표기<OrgS.OptionalTag>(선택)</OrgS.OptionalTag>
              </OrgS.SubFieldLabel>
              <S.Input
                value={localName}
                onChange={(changeEvent) => setLocalName(changeEvent.target.value)}
                placeholder={
                  isInternational ? '예: Quadrilateral Security Dialogue' : '예: Comité de salut public'
                }
              />
            </OrgS.SubField>
          </OrgS.SubFieldGrid>
        </S.FormField>
      </S.FormRow>

      <S.FormRow>
        <S.FormLabel as="div">활동 범위 · 설립</S.FormLabel>
        <S.FormField>
          <OrgS.SubFieldGrid>
            <OrgS.SubField>
              <OrgS.SubFieldLabel>활동 범위</OrgS.SubFieldLabel>
              <OrgS.FieldSelect
                value={scope}
                onChange={(changeEvent) => setScope(changeEvent.target.value as OrganizationScope)}
              >
                {(Object.keys(ORGANIZATION_SCOPE_LABEL) as OrganizationScope[]).map((scopeKey) => (
                  <option key={scopeKey} value={scopeKey}>
                    {ORGANIZATION_SCOPE_LABEL[scopeKey]}
                  </option>
                ))}
              </OrgS.FieldSelect>
            </OrgS.SubField>
            <OrgS.SubField htmlFor={FOUNDED_INPUT_ID}>
              <OrgS.SubFieldLabel>
                설립·출범 연도<OrgS.OptionalTag>(선택, AD 1000~)</OrgS.OptionalTag>
              </OrgS.SubFieldLabel>
              <S.Input
                id={FOUNDED_INPUT_ID}
                type="number"
                min={1000}
                max={9999}
                $error={foundedYearInvalid}
                aria-invalid={foundedYearInvalid || undefined}
                value={foundedYear}
                onChange={(changeEvent) => setFoundedYear(changeEvent.target.value)}
                placeholder={isInternational ? '예: 1967, 1989, 2007' : '예: 1793'}
              />
            </OrgS.SubField>
          </OrgS.SubFieldGrid>
        </S.FormField>
      </S.FormRow>

      <S.FormRow>
        <S.FormLabel htmlFor="org-quick-create-description">
          설명<OrgS.OptionalTag>(선택)</OrgS.OptionalTag>
        </S.FormLabel>
        <S.FormField>
          <S.Textarea
            id="org-quick-create-description"
            value={description}
            onChange={(changeEvent) => setDescription(changeEvent.target.value)}
            rows={3}
            placeholder="설립 배경·역할·성격 등 자유 서술"
          />
        </S.FormField>
      </S.FormRow>
    </OrgS.FormGroupSection>
  )

  const countriesSectionNode = (
    <OrgS.FormGroupSection
      ref={(element) => {
        sectionRefs.current.countries = element
      }}
      aria-labelledby="org-quick-create-countries-title"
    >
      <OrgS.FormGroupTitle id="org-quick-create-countries-title">
        {isInternational ? '회원국 · 참여국' : '소재 국가'}
        {isInternational && countryMemberships.length > 0 ? (
          <OrgS.FormGroupSummaryBadge>{countryMemberships.length}개국</OrgS.FormGroupSummaryBadge>
        ) : !isInternational && seatCountryName ? (
          <OrgS.FormGroupSummaryBadge>{seatCountryName}</OrgS.FormGroupSummaryBadge>
        ) : null}
      </OrgS.FormGroupTitle>

      {/* 회원국·파트너국 (국제기구·다자협의체·군사동맹일 때 앞에, 국내 조직도 필요하면 쓴다) */}
      {showCountryMemberships && (
        <S.FormRow>
          <S.FormLabel as="div">회원국·참여국</S.FormLabel>
          <S.FormField>
            <S.Hint>등록해 두면 정상회의·사건 등록 시 회원국을 한 번에 불러올 수 있습니다</S.Hint>
            {availableCountryCandidates.length > 0 && (
              <OrgS.CandidateQuickBox>
                <OrgS.CandidateQuickLabel>현재 사건 참여국에서 빠른 추가:</OrgS.CandidateQuickLabel>
                {availableCountryCandidates.map((candidate) => (
                  <OrgS.CandidateQuickChip
                    key={
                      candidate.historicalCountryId
                        ? `H:${candidate.historicalCountryId}`
                        : `C:${candidate.countryId}`
                    }
                    type="button"
                    onClick={() => addCountryDraft(candidate)}
                  >
                    + {candidate.flagEmoji ? `${candidate.flagEmoji} ` : ''}
                    {candidate.name}
                  </OrgS.CandidateQuickChip>
                ))}
                {availableCountryCandidates.length > 1 && (
                  <OrgS.CandidateQuickChip
                    type="button"
                    $accent
                    onClick={() => {
                      for (const candidate of availableCountryCandidates) addCountryDraft(candidate)
                    }}
                  >
                    + 전체 회원국 담기 ({availableCountryCandidates.length})
                  </OrgS.CandidateQuickChip>
                )}
              </OrgS.CandidateQuickBox>
            )}
            {countryMemberships.length > 0 && (
              <OrgS.PickedList aria-label="회원국·참여국">
                {countryMemberships.map((membership) => (
                  <OrgS.PickedRow key={membership.key}>
                    <OrgS.PickedName>
                      {membership.flagEmoji ? `${membership.flagEmoji} ` : ''}
                      {membership.name}
                    </OrgS.PickedName>
                    <OrgS.PickedRoleSelect
                      aria-label={`${membership.name} 멤버십 역할`}
                      value={membership.role}
                      onChange={(changeEvent) => {
                        const nextRole = changeEvent.target.value as OrganizationCountryRole
                        setCountryMemberships((previous) =>
                          previous.map((item) =>
                            item.key === membership.key ? { ...item, role: nextRole } : item,
                          ),
                        )
                      }}
                    >
                      {MEMBER_COUNTRY_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ORGANIZATION_COUNTRY_ROLE_LABEL[role]}
                        </option>
                      ))}
                    </OrgS.PickedRoleSelect>
                    <OrgS.PickedRemoveBtn
                      type="button"
                      aria-label={`${membership.name} 제거`}
                      onClick={() =>
                        setCountryMemberships((previous) =>
                          previous.filter((item) => item.key !== membership.key),
                        )
                      }
                    >
                      <FiX size={13} />
                    </OrgS.PickedRemoveBtn>
                  </OrgS.PickedRow>
                ))}
              </OrgS.PickedList>
            )}
            <OrgS.AddPillBtn type="button" onClick={() => setCountryPickerOpen(true)}>
              <FiGlobe size={13} aria-hidden /> 회원국·파트너국 검색·추가
            </OrgS.AddPillBtn>
          </S.FormField>
        </S.FormRow>
      )}

      {!isInternational && (
        <S.FormRow>
          <S.FormLabel as="div">소재 국가</S.FormLabel>
          <S.FormField>
            <OrgS.SubFieldGrid>
              <OrgS.SubField>
                <OrgS.SubFieldLabel>
                  역사 국가<OrgS.OptionalTag>(예: 프랑스 제1공화국, 조선)</OrgS.OptionalTag>
                </OrgS.SubFieldLabel>
                <OrgS.FieldSelect
                  value={historicalCountryId}
                  onChange={(changeEvent) => setHistoricalCountryId(changeEvent.target.value)}
                >
                  <option value="">미지정</option>
                  {(historicalCountriesQuery.data ?? []).map((historicalCountry) => (
                    <option key={historicalCountry.id} value={historicalCountry.id}>
                      {historicalCountry.name}
                    </option>
                  ))}
                </OrgS.FieldSelect>
              </OrgS.SubField>
              <OrgS.SubField>
                <OrgS.SubFieldLabel>
                  현대 국가<OrgS.OptionalTag>(선택)</OrgS.OptionalTag>
                </OrgS.SubFieldLabel>
                <OrgS.FieldSelect
                  value={countryId}
                  onChange={(changeEvent) => setCountryId(changeEvent.target.value)}
                >
                  <option value="">미지정</option>
                  {(countriesQuery.data ?? []).map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </OrgS.FieldSelect>
              </OrgS.SubField>
            </OrgS.SubFieldGrid>
          </S.FormField>
        </S.FormRow>
      )}
    </OrgS.FormGroupSection>
  )

  const membersSectionNode = (
    <OrgS.FormGroupSection
      ref={(element) => {
        sectionRefs.current.members = element
      }}
      aria-labelledby="org-quick-create-members-title"
    >
      <OrgS.FormGroupTitle id="org-quick-create-members-title">
        초기 소속 인물 · 위원
        {members.length > 0 ? (
          <OrgS.FormGroupSummaryBadge>{members.length}명</OrgS.FormGroupSummaryBadge>
        ) : null}
      </OrgS.FormGroupTitle>

      <S.FormRow>
        <S.FormLabel as="div">
          소속 인물<OrgS.OptionalTag>(선택)</OrgS.OptionalTag>
        </S.FormLabel>
        <S.FormField>
          <S.Hint>등록해 두면 사건에서 소속 인물로 바로 불러올 수 있습니다</S.Hint>
          {availableCandidates.length > 0 && (
            <OrgS.CandidateQuickBox>
              <OrgS.CandidateQuickLabel>현재 사건 인물에서 빠른 추가:</OrgS.CandidateQuickLabel>
              {availableCandidates.map((candidate) => (
                <OrgS.CandidateQuickChip
                  key={candidate.id}
                  type="button"
                  onClick={() => addMember(candidate.id, candidate.name, candidate.role)}
                >
                  + {candidate.name}
                </OrgS.CandidateQuickChip>
              ))}
              {availableCandidates.length > 1 && (
                <OrgS.CandidateQuickChip
                  type="button"
                  $accent
                  onClick={() => {
                    for (const candidate of availableCandidates) {
                      addMember(candidate.id, candidate.name, candidate.role)
                    }
                  }}
                >
                  + 전체 담기 ({availableCandidates.length})
                </OrgS.CandidateQuickChip>
              )}
            </OrgS.CandidateQuickBox>
          )}
          {members.length > 0 && (
            <OrgS.PickedList aria-label="초기 소속 인물">
              {members.map((member) => (
                <OrgS.PickedRow key={member.id}>
                  <OrgS.PickedName>
                    <FiUser size={12} aria-hidden />
                    {member.name}
                  </OrgS.PickedName>
                  <OrgS.PickedRoleInput
                    aria-label={`${member.name} 조직 내 역할`}
                    value={member.roleTitle}
                    onChange={(changeEvent) => {
                      const nextRole = changeEvent.target.value
                      setMembers((previous) =>
                        previous.map((item) =>
                          item.id === member.id ? { ...item, roleTitle: nextRole } : item,
                        ),
                      )
                    }}
                    placeholder="역할 (예: 사무총장, 의장, 위원)"
                  />
                  <OrgS.PickedRemoveBtn
                    type="button"
                    aria-label={`${member.name} 제거`}
                    onClick={() =>
                      setMembers((previous) => previous.filter((item) => item.id !== member.id))
                    }
                  >
                    <FiX size={13} />
                  </OrgS.PickedRemoveBtn>
                </OrgS.PickedRow>
              ))}
            </OrgS.PickedList>
          )}
          <OrgS.AddPillBtn type="button" onClick={() => setPersonPickerOpen(true)}>
            <FiPlus size={13} aria-hidden /> 소속 인물 검색·추가
          </OrgS.AddPillBtn>
        </S.FormField>
      </S.FormRow>
    </OrgS.FormGroupSection>
  )

  const nestedPickerOpen = personPickerOpen || countryPickerOpen

  return (
    <>
      <RegisterModal
        isOpen
        onClose={() => {
          void requestClose()
        }}
        title="새 기구·협의체·조직 등록"
        headerActions={
          <HeaderActionsBar>
            <SectionJumpNav aria-label="폼 섹션 이동">
              {sectionMeta.map((sectionItem) => {
                const isActiveSection = activeSection === sectionItem.key
                return (
                  <SectionJumpBtn
                    key={sectionItem.key}
                    type="button"
                    $active={isActiveSection}
                    aria-current={isActiveSection ? 'location' : undefined}
                    onClick={() => scrollToSection(sectionItem.key)}
                  >
                    <span>{sectionItem.label}</span>
                    {sectionItem.badge ? (
                      <OrgS.SectionJumpBadge $done={sectionItem.badge === '✓'} aria-hidden="true">
                        {sectionItem.badge}
                      </OrgS.SectionJumpBadge>
                    ) : null}
                  </SectionJumpBtn>
                )
              })}
            </SectionJumpNav>
            <OrgS.LayoutModeToggleBtn
              type="button"
              $active={layoutMode === 'split'}
              aria-pressed={layoutMode === 'split'}
              aria-label={layoutMode === 'split' ? '1단 세로 보기로 전환' : '2단 좌우 분할 보기로 전환'}
              onClick={toggleLayoutMode}
            >
              <FiColumns size={13} aria-hidden="true" />
              <span>{layoutMode === 'split' ? '2단 분할' : '1단 보기'}</span>
            </OrgS.LayoutModeToggleBtn>
            {isDirty && !busy ? (
              <HeaderResetBtn
                type="button"
                title="입력한 내용을 모두 비우고 처음 상태로 되돌립니다"
                onClick={() => {
                  void resetForm()
                }}
              >
                초기화
              </HeaderResetBtn>
            ) : null}
          </HeaderActionsBar>
        }
        maxWidth={layoutMode === 'split' ? 'min(1240px, 96vw)' : 'min(880px, 96vw)'}
        minHeight="min(640px, 90vh)"
        height={layoutMode === 'split' ? '90vh' : undefined}
        fullBleedOnMobile
        /* 위에 국가·인물 고르기 창이 떠 있으면 그 창이 Esc를 먹는다. 저장 중엔 닫히지 않는다 */
        closeOnEsc={!nestedPickerOpen && !busy}
        closeOnOverlayClick={!busy}
      >
        <OrgS.OrgModalFormScroll
          ref={scrollContainerRef}
          $layoutMode={layoutMode}
          style={typeToneStyle}
        >
          {busy ? (
            <OrgS.BusyBar role="status" aria-live="polite">
              기구·조직을 등록하는 중...
            </OrgS.BusyBar>
          ) : null}
          <S.FormSection>
            {layoutMode === 'split' ? (
              <OrgS.SplitColumnsGrid>
                <OrgS.SplitColumnLeft>{basicSectionNode}</OrgS.SplitColumnLeft>
                <OrgS.SplitColumnRight>
                  {countriesSectionNode}
                  {membersSectionNode}
                </OrgS.SplitColumnRight>
              </OrgS.SplitColumnsGrid>
            ) : (
              <>
                {basicSectionNode}
                {countriesSectionNode}
                {membersSectionNode}
              </>
            )}
          </S.FormSection>
        </OrgS.OrgModalFormScroll>

        <PersonRegisterModalStickyFooter>
          <FooterHint $warning={missingName || foundedYearInvalid}>
            {missingName ? (
              <FooterJumpButton
                type="button"
                onClick={() => focusField(NAME_INPUT_ID)}
                title="클릭하면 해당 필수 입력 칸으로 이동합니다"
              >
                <span>필수 입력: 기구·조직명</span>
                <FooterJumpArrow aria-hidden="true">→</FooterJumpArrow>
              </FooterJumpButton>
            ) : foundedYearInvalid ? (
              <FooterJumpButton
                type="button"
                onClick={() => focusField(FOUNDED_INPUT_ID)}
                title="클릭하면 설립·출범 연도 칸으로 이동합니다"
              >
                <span>설립·출범 연도는 1000~9999 사이로 적거나 비워 두세요</span>
                <FooterJumpArrow aria-hidden="true">→</FooterJumpArrow>
              </FooterJumpButton>
            ) : (
              <FooterReadyGroup>
                <FooterReadyBadge>등록 준비 완료</FooterReadyBadge>
                <FooterShortcutItem>
                  <FooterKbd>⌘↵</FooterKbd>
                  <span>저장</span>
                </FooterShortcutItem>
              </FooterReadyGroup>
            )}
          </FooterHint>
          <FooterActions>
            <PersonRegisterModalCancelBtn
              type="button"
              disabled={busy}
              onClick={() => {
                void requestClose()
              }}
            >
              취소
            </PersonRegisterModalCancelBtn>
            <OrgS.ModalPrimarySubmitBtn
              type="button"
              disabled={!canSubmit}
              title={missingName ? '필수 입력: 기구·조직명' : '단축키: ⌘/Ctrl + Enter'}
              onClick={() => createMutation.mutate()}
            >
              {busy ? '등록 중...' : '기구·조직 만들기'}
            </OrgS.ModalPrimarySubmitBtn>
          </FooterActions>
        </PersonRegisterModalStickyFooter>
      </RegisterModal>

      {personPickerOpen && (
        <PersonSelectModal
          persons={allPersonsQuery.data ?? []}
          selectedPersonId=""
          title="소속 인물·위원 추가"
          excludeIds={members.map((member) => member.id)}
          onSelect={(personId, personName) => {
            addMember(personId, personName)
            setPersonPickerOpen(false)
          }}
          onClose={() => setPersonPickerOpen(false)}
        />
      )}
      <CountryPicker
        isOpen={countryPickerOpen}
        onClose={() => setCountryPickerOpen(false)}
        mode="single"
        title="회원국·파트너국 추가"
        modernCountries={countriesQuery.data ?? []}
        historicalCountries={historicalCountriesQuery.data ?? []}
        selectedIds={countryMemberships
          .map((membership) => membership.countryId ?? membership.historicalCountryId ?? '')
          .filter(Boolean)}
        onSelect={(picked) => {
          const matchedFlag = picked.isHistorical
            ? null
            : ((countriesQuery.data ?? []).find((country) => country.id === picked.id)?.flagEmoji ??
              null)
          addCountryDraft({
            countryId: picked.isHistorical ? undefined : picked.id,
            historicalCountryId: picked.isHistorical ? picked.id : undefined,
            name: picked.name,
            flagEmoji: matchedFlag,
          })
          setCountryPickerOpen(false)
        }}
      />
    </>
  )
}
