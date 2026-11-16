import React, { useEffect, useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiArrowLeft,
  FiArrowRight,
  FiArrowUpRight,
  FiAward,
  FiBookOpen,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiEdit2,
  FiFileText,
  FiFlag,
  FiGlobe,
  FiGrid,
  FiLayers,
  FiLink2,
  FiList,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerChipFill,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSurface,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import {
  formatPeriod as formatPoliticalSystemPeriod,
  GOVERNMENT_FORM_LABEL,
  LEGISLATURE_TYPE_LABEL,
  PARTY_SYSTEM_LABEL,
  STATE_STRUCTURE_LABEL,
} from '@/entities/political-system/model/political-system'
import {
  type AdministrationDepartment,
  administrationDepartmentApi,
} from '@/shared/api/administration-department'
import { listEventsForCabinet } from '@/shared/api/cabinet-events'
import { getCabinetPoliticalParties } from '@/shared/api/election'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import {
  type GovernmentCabinetTenureItem,
  personCareerApi,
} from '@/shared/api/person-career'
import { listPoliticalSystems } from '@/shared/api/political-system'
import { type TreatyDto, treatyApi } from '@/shared/api/treaty'
import { getUploadImageUrl } from '@/shared/api/upload'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import {
  dateRangesOverlapIso,
  filterDepartmentsForCabinet,
  findActivePoliticalSystemForCabinet,
  findDepartmentForMember,
  GOVERNMENT_FORM_META,
  resolveCabinetMinisterCount,
  shouldHideCabinetFromExecutiveTimeline,
} from '@/shared/lib/ministry-department/department-cabinet-matcher'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import {
  formatRichTextForReadView,
  isLikelyRichTextHtml,
  isVisuallyEmptyRichText,
} from '@/shared/lib/rich-text-read-view'
import { pathKeys } from '@/shared/router'
import { useThemeStore } from '@/shared/styles/theme.store'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  type EditableInstitutionTenure,
  InstitutionAppointmentModal,
} from '@/shared/ui/institution-appointment-modal'
import { notify } from '@/shared/ui/toast'
import { CabinetEventAttachModal } from '@/widgets/country/country-detail/ui/cabinet-event-attach-modal'
import { CabinetEventsSection } from '@/widgets/country/country-detail/ui/cabinet-events-section.widget'
import { CabinetFormModal } from '@/widgets/country/country-detail/ui/cabinet-form-modal.widget'
import { CabinetLinkageModal } from '@/widgets/country/country-detail/ui/cabinet-linkage-modal.widget'
import { CabinetPartyLinkModal } from '@/widgets/country/country-detail/ui/cabinet-party-link-modal'
import { CabinetPoliticalPartiesBlock } from '@/widgets/country/country-detail/ui/cabinet-political-parties-block.widget'
import { CabinetPortfolioMatrix } from '@/widgets/country/country-detail/ui/cabinet-portfolio-matrix.widget'
import {
  APPOINTMENT_METHOD_LABEL,
  END_REASON_LABEL,
} from '@/widgets/country/country-detail/ui/cabinets-section.helpers'
import { TreatyLinkModal } from '@/widgets/country/country-detail/ui/treaty-link-modal'
import {
  CountryInlineModal,
  type CountryInlineModalTarget,
} from '@/widgets/country/country-inline-modal/country-inline-modal'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'

import {
  calculateTenureSpanInfo,
  compareIsoDateChronological,
  extractSignedStartYearFromIso,
  formatIsoShortPeriod,
  formatSignedYearLabel,
  GLOBAL_CABINET_CATEGORY_LABELS,
  readGovernmentListSearch,
  resolveCabinetCategory,
  resolveCabinetDistinctSubMeta,
  resolveCabinetDisplayTitle,
  resolveCabinetEffectiveDates,
  resolveCabinetHeadName,
  resolveCabinetPolityInfo,
  resolveCabinetPositionTitle,
  toEditableCabinetRecord,
} from './government-helpers'

type MinisterPortfolioViewMode = 'matrix' | 'cards'

type ExtendedCabinetTenureItem = GovernmentCabinetTenureItem & {
  isActing?: boolean
  sortOrder?: number
  memberNote?: string | null
  party?: {
    id: string
    name: string
    shortName?: string | null
    brandColor?: string | null
  } | null
}

function renderRichOrPlainContent(rawText: string | null | undefined) {
  if (!rawText || isVisuallyEmptyRichText(rawText)) return null
  if (isLikelyRichTextHtml(rawText)) {
    return (
      <RichProseBlock
        dangerouslySetInnerHTML={{
          __html: formatRichTextForReadView(rawText),
        }}
      />
    )
  }
  return <PlainProseBlock>{rawText.trim()}</PlainProseBlock>
}

export function GovernmentCabinetDetailPage() {
  const { cabinetId } = useParams<{ cabinetId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const listSearch = readGovernmentListSearch(location.state)

  const isDark = useThemeStore((state) => state.mode === 'dark')
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [countryModalTarget, setCountryModalTarget] =
    useState<CountryInlineModalTarget | null>(null)
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false)
  const [appointModalOpen, setAppointModalOpen] = useState<boolean>(false)
  const [appointPresetDept, setAppointPresetDept] =
    useState<AdministrationDepartment | null>(null)
  const [editingMinister, setEditingMinister] =
    useState<EditableInstitutionTenure | null>(null)
  const [partyModalOpen, setPartyModalOpen] = useState<boolean>(false)
  const [eventModalOpen, setEventModalOpen] = useState<boolean>(false)
  const [linkageModalOpen, setLinkageModalOpen] = useState<boolean>(false)
  const [treatyModalOpen, setTreatyModalOpen] = useState<boolean>(false)

  const [portfolioViewMode, setPortfolioViewMode] =
    useState<MinisterPortfolioViewMode>('matrix')
  const [suggestExpanded, setSuggestExpanded] = useState<boolean>(false)
  const [selectedSuggestedIds, setSelectedSuggestedIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [addingAchievement, setAddingAchievement] = useState<boolean>(false)
  const [newAchievementTitle, setNewAchievementTitle] = useState<string>('')
  const [newAchievementDesc, setNewAchievementDesc] = useState<string>('')

  const cabinetQuery = useQuery({
    queryKey: ['global-cabinet-detail', cabinetId],
    queryFn: () => personCareerApi.getCabinetById(cabinetId!),
    enabled: Boolean(cabinetId),
    staleTime: 60_000,
  })

  const ministersQuery = useQuery({
    queryKey: ['cabinet-tenures', cabinetId],
    queryFn: () => personCareerApi.getTenuresByCabinetId(cabinetId!),
    enabled: Boolean(cabinetId),
    staleTime: 60_000,
  })

  const suggestedMinistersQuery = useQuery({
    queryKey: ['cabinet-suggested-members', cabinetId],
    queryFn: () => personCareerApi.getSuggestedCabinetMembers(cabinetId!),
    enabled: Boolean(cabinetId),
    staleTime: 30_000,
  })

  useEffect(() => {
    const rows = suggestedMinistersQuery.data ?? []
    setSelectedSuggestedIds(new Set(rows.map((item) => item.tenureId)))
  }, [suggestedMinistersQuery.data])

  const linkageEventId = cabinetQuery.data?.linkageGroup?.eventId ?? null
  const linkedPeersQuery = useQuery({
    queryKey: ['cabinets-by-linkage-event', linkageEventId],
    queryFn: () => personCareerApi.getCabinetsByLinkageEventId(linkageEventId!),
    enabled: Boolean(linkageEventId),
    staleTime: 60_000,
  })

  const treatiesQuery = useQuery({
    queryKey: ['treaties-by-cabinet', cabinetId],
    queryFn: () => treatyApi.getAll({ cabinetId: cabinetId! }),
    enabled: Boolean(cabinetId),
    staleTime: 60_000,
  })

  const partiesQuery = useQuery({
    queryKey: ['cabinet-political-parties', cabinetId],
    queryFn: () => getCabinetPoliticalParties(cabinetId!),
    enabled: Boolean(cabinetId),
    staleTime: 60_000,
  })

  const cabinetEventsQuery = useQuery({
    queryKey: ['cabinet-linked-events', cabinetId],
    queryFn: () => listEventsForCabinet(cabinetId!),
    enabled: Boolean(cabinetId),
    staleTime: 60_000,
  })

  const cabinet = cabinetQuery.data ?? null
  const resolvedPolity = useMemo(
    () => (cabinet ? resolveCabinetPolityInfo(cabinet) : null),
    [cabinet],
  )

  const polityCabinetsQuery = useQuery({
    queryKey: [
      'cabinet-detail-polity-cabinets',
      resolvedPolity?.modernCountryId ?? '',
      resolvedPolity?.historicalCountryId ?? '',
    ],
    queryFn: () =>
      personCareerApi.getCabinets({
        ...(resolvedPolity?.historicalCountryId
          ? { historicalCountryId: resolvedPolity.historicalCountryId }
          : resolvedPolity?.modernCountryId
            ? { countryId: resolvedPolity.modernCountryId }
            : {}),
        take: 1000,
      }),
    enabled: Boolean(
      resolvedPolity?.modernCountryId || resolvedPolity?.historicalCountryId,
    ),
    staleTime: 60_000,
  })

  const polityDepartmentsQuery = useQuery({
    queryKey: [
      'cabinet-detail-polity-depts',
      resolvedPolity?.modernCountryId ?? '',
      resolvedPolity?.historicalCountryId ?? '',
    ],
    queryFn: () =>
      administrationDepartmentApi.getAll({
        ...(resolvedPolity?.historicalCountryId
          ? { historicalCountryId: resolvedPolity.historicalCountryId }
          : resolvedPolity?.modernCountryId
            ? { countryId: resolvedPolity.modernCountryId }
            : {}),
        take: 500,
      }),
    enabled: Boolean(
      resolvedPolity?.modernCountryId || resolvedPolity?.historicalCountryId,
    ),
    staleTime: 60_000,
  })

  const politicalSystemsQuery = useQuery({
    queryKey: [
      'cabinet-detail-political-systems',
      resolvedPolity?.modernCountryId ?? '',
      resolvedPolity?.historicalCountryId ?? '',
    ],
    queryFn: () =>
      listPoliticalSystems({
        countryId: resolvedPolity?.historicalCountryId
          ? undefined
          : (resolvedPolity?.modernCountryId ?? undefined),
        historicalCountryId: resolvedPolity?.historicalCountryId ?? undefined,
        includeConstituents: Boolean(resolvedPolity?.historicalCountryId),
      }),
    enabled: Boolean(
      resolvedPolity?.modernCountryId || resolvedPolity?.historicalCountryId,
    ),
    staleTime: 60_000,
  })

  const countryTenuresQuery = useQuery({
    queryKey: [
      'cabinet-detail-country-tenures',
      resolvedPolity?.modernCountryId ?? '',
      resolvedPolity?.historicalCountryId ?? '',
    ],
    queryFn: () =>
      personCareerApi.getTenuresByCountry({
        countryId: resolvedPolity?.historicalCountryId
          ? undefined
          : (resolvedPolity?.modernCountryId ?? undefined),
        historicalCountryId: resolvedPolity?.historicalCountryId ?? undefined,
      }),
    enabled: Boolean(
      resolvedPolity?.modernCountryId || resolvedPolity?.historicalCountryId,
    ),
    staleTime: 60_000,
  })

  const contemporaryDepartments = useMemo(() => {
    const rawDepts = polityDepartmentsQuery.data ?? []
    if (!cabinet || rawDepts.length === 0) return []
    const effDates = resolveCabinetEffectiveDates(cabinet)
    return filterDepartmentsForCabinet(rawDepts, {
      countryId:
        cabinet.countryId ?? cabinet.headTenure?.countryId ?? undefined,
      historicalCountryId:
        cabinet.historicalCountryId ??
        cabinet.headTenure?.historicalCountryId ??
        undefined,
      startDate: effDates.startDate,
      endDate: effDates.endDate,
      startEra: cabinet.startEra ?? null,
      startYear: cabinet.startYear ?? null,
      endEra: cabinet.endEra ?? null,
      endYear: cabinet.endYear ?? null,
    })
  }, [polityDepartmentsQuery.data, cabinet])

  const activePoliticalSystem = useMemo(() => {
    const systems = politicalSystemsQuery.data ?? []
    if (!cabinet || systems.length === 0) return null
    const effDates = resolveCabinetEffectiveDates(cabinet)
    return findActivePoliticalSystemForCabinet(systems, {
      countryId:
        cabinet.countryId ?? cabinet.headTenure?.countryId ?? undefined,
      historicalCountryId:
        cabinet.historicalCountryId ??
        cabinet.headTenure?.historicalCountryId ??
        undefined,
      startDate: effDates.startDate,
      endDate: effDates.endDate,
    })
  }, [politicalSystemsQuery.data, cabinet])

  const contemporarySovereign = useMemo(() => {
    const allTenures = (countryTenuresQuery.data ?? []) as Array<{
      id: string
      positionType?: string | null
      title?: string | null
      regnalName?: string | null
      startDate?: string | null
      endDate?: string | null
      person?: {
        id: string
        name: string
        surname?: string | null
        middleName?: string | null
        nameDisplayOrder?: 'SURNAME_FIRST' | 'GIVEN_FIRST' | null
        profileImageUrl?: string | null
      } | null
      positionDefinition?: {
        id: string
        title: string
        positionType?: string | null
        isMonarchical?: boolean | null
      } | null
      regnalEras?: Array<{ id: string; name: string }>
    }>
    if (!cabinet || allTenures.length === 0) return null
    const headTenureId = cabinet.headTenure?.id ?? null
    const headPosType =
      cabinet.headTenure?.positionDefinition?.positionType ??
      cabinet.headTenure?.positionType ??
      null
    if (headPosType === 'HEAD_OF_STATE') return null

    const effDates = resolveCabinetEffectiveDates(cabinet)
    if (!effDates.startDate) return null

    const candidates = allTenures.filter((row) => {
      if (row.id === headTenureId) return false
      const effPosType =
        row.positionDefinition?.positionType ?? row.positionType ?? null
      const isMonarchOrHead =
        Boolean(row.positionDefinition?.isMonarchical) ||
        effPosType === 'HEAD_OF_STATE'
      if (!isMonarchOrHead || !row.startDate) return false
      return dateRangesOverlapIso(
        effDates.startDate,
        effDates.endDate,
        row.startDate,
        row.endDate ?? null,
      )
    })
    return candidates[0] ?? null
  }, [countryTenuresQuery.data, cabinet])

  const continuityInfo = useMemo(() => {
    const rawList = (polityCabinetsQuery.data ?? []).filter(
      (cabItem) =>
        cabItem.id === cabinetId ||
        !shouldHideCabinetFromExecutiveTimeline(cabItem.headTenure, cabItem),
    )
    if (!cabinetId || rawList.length === 0) {
      return {
        prevCabinet: null,
        nextCabinet: null,
        ordinalIndex: -1,
        totalCount: 0,
        reshuffleSiblings: [],
      }
    }
    const sortedChronologically = [...rawList].sort((leftCab, rightCab) => {
      const leftStart = resolveCabinetEffectiveDates(leftCab).startDate
      const rightStart = resolveCabinetEffectiveDates(rightCab).startDate
      return compareIsoDateChronological(leftStart, rightStart, 'asc')
    })
    const currentIdx = sortedChronologically.findIndex(
      (cabItem) => cabItem.id === cabinetId,
    )
    const currentHeadTenureId = cabinet?.headTenure?.id ?? null
    const reshuffleSiblings = currentHeadTenureId
      ? sortedChronologically.filter(
          (cabItem) => cabItem.headTenure?.id === currentHeadTenureId,
        )
      : []

    if (currentIdx === -1) {
      return {
        prevCabinet: null,
        nextCabinet: null,
        ordinalIndex: -1,
        totalCount: sortedChronologically.length,
        reshuffleSiblings,
      }
    }
    return {
      prevCabinet:
        currentIdx > 0 ? sortedChronologically[currentIdx - 1] : null,
      nextCabinet:
        currentIdx < sortedChronologically.length - 1
          ? sortedChronologically[currentIdx + 1]
          : null,
      ordinalIndex: currentIdx + 1,
      totalCount: sortedChronologically.length,
      reshuffleSiblings,
    }
  }, [polityCabinetsQuery.data, cabinetId, cabinet?.headTenure?.id])

  const attachSuggestedMutation = useMutation({
    mutationFn: async (targetIds: string[]) => {
      const suggestions = (suggestedMinistersQuery.data ?? []).filter((item) =>
        targetIds.includes(item.tenureId),
      )
      if (!cabinetId || suggestions.length === 0) return
      await personCareerApi.attachCabinetMembers(
        cabinetId,
        suggestions.map((candItem) => ({
          tenureId: candItem.tenureId,
          administrationDepartmentId:
            candItem.administrationDepartment?.id ?? null,
          roleTitle:
            candItem.title ?? candItem.positionDefinition?.title ?? null,
        })),
      )
    },
    onSuccess: (_data, targetIds) => {
      invalidateTenureQueries(queryClient, {
        cabinetId: cabinetId ?? null,
        countryId: resolvedPolity?.modernCountryId ?? null,
        historicalCountryId: resolvedPolity?.historicalCountryId ?? null,
      })
      void queryClient.invalidateQueries({
        queryKey: ['cabinet-tenures', cabinetId],
      })
      void queryClient.invalidateQueries({ queryKey: ['global-cabinets'] })
      void queryClient.invalidateQueries({
        queryKey: ['cabinet-suggested-members', cabinetId],
      })
      setSuggestExpanded(false)
      notify.success(
        `선택한 동시대 부처 인사 ${targetIds.length}명이 각료진에 편입되었습니다.`,
      )
    },
    onError: (mutationError) => {
      notify.error(getApiErrorMessage(mutationError))
    },
  })

  const detachMinisterMutation = useMutation({
    mutationFn: async (tenureId: string) => {
      if (!cabinetId) return
      await personCareerApi.detachCabinetMember(cabinetId, tenureId)
    },
    onSuccess: () => {
      invalidateTenureQueries(queryClient, {
        cabinetId: cabinetId ?? null,
        countryId: resolvedPolity?.modernCountryId ?? null,
        historicalCountryId: resolvedPolity?.historicalCountryId ?? null,
      })
      void queryClient.invalidateQueries({
        queryKey: ['cabinet-tenures', cabinetId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['cabinet-suggested-members', cabinetId],
      })
      void queryClient.invalidateQueries({ queryKey: ['global-cabinets'] })
      notify.success('내각에서 해당 각료 편입을 해제했습니다. (재임 기록은 유지)')
    },
    onError: (err) => notify.error(getApiErrorMessage(err)),
  })

  const createAchievementMutation = useMutation({
    mutationFn: async () => {
      const headTenureId = cabinet?.headTenure?.id
      if (!headTenureId || !newAchievementTitle.trim()) return
      await personCareerApi.createTenureAchievement(headTenureId, {
        title: newAchievementTitle.trim(),
        description: newAchievementDesc.trim() || undefined,
      })
    },
    onSuccess: () => {
      setAddingAchievement(false)
      setNewAchievementTitle('')
      setNewAchievementDesc('')
      void queryClient.invalidateQueries({
        queryKey: ['global-cabinet-detail', cabinetId],
      })
      void queryClient.invalidateQueries({ queryKey: ['global-cabinets'] })
      notify.success('수반 주요 정책·업적을 등록했습니다.')
    },
    onError: (err) => notify.error(getApiErrorMessage(err)),
  })

  const deleteAchievementMutation = useMutation({
    mutationFn: async (achievementId: string) => {
      const headTenureId = cabinet?.headTenure?.id
      if (!headTenureId) return
      await personCareerApi.deleteTenureAchievement(headTenureId, achievementId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['global-cabinet-detail', cabinetId],
      })
      void queryClient.invalidateQueries({ queryKey: ['global-cabinets'] })
      notify.success('업적 기록을 삭제했습니다.')
    },
    onError: (err) => notify.error(getApiErrorMessage(err)),
  })

  const displayTitle = cabinet
    ? resolveCabinetDisplayTitle(cabinet)
    : '내각 상세'
  useDocumentTitle(`${displayTitle} · 전 국가 내각`)

  const nonHeadMinisters = useMemo(() => {
    const rawMinisters = (ministersQuery.data ??
      []) as ExtendedCabinetTenureItem[]
    const headTenureId = cabinet?.headTenure?.id ?? null
    return rawMinisters.filter((tenureItem) => tenureItem.id !== headTenureId)
  }, [ministersQuery.data, cabinet?.headTenure?.id])

  const groupedMinisters = useMemo(() => {
    const allPolityDepts = polityDepartmentsQuery.data ?? []
    const buckets = new Map<
      string,
      {
        key: string
        departmentName: string
        departmentId: string | null
        items: ExtendedCabinetTenureItem[]
      }
    >()
    for (const ministerItem of nonHeadMinisters) {
      const matchedDept = findDepartmentForMember(
        {
          title:
            ministerItem.title ??
            ministerItem.positionDefinition?.title ??
            null,
          administrationDepartmentId:
            ministerItem.administrationDepartmentId ??
            ministerItem.positionDefinition?.administrationDepartmentId ??
            null,
          administrationDepartment:
            ministerItem.administrationDepartment ?? null,
          positionDefinition: ministerItem.positionDefinition ?? null,
        },
        allPolityDepts,
      )
      const deptId =
        matchedDept?.id ??
        ministerItem.administrationDepartmentId ??
        ministerItem.administrationDepartment?.id ??
        null
      const deptName =
        matchedDept?.name ??
        ministerItem.administrationDepartment?.name ??
        '무임소 · 부처 미지정 각료'
      const bucketKey = deptId ?? '__unassigned__'
      const existing = buckets.get(bucketKey)
      if (existing) {
        existing.items.push(ministerItem)
      } else {
        buckets.set(bucketKey, {
          key: bucketKey,
          departmentName: deptName,
          departmentId: deptId,
          items: [ministerItem],
        })
      }
    }
    return [...buckets.values()]
  }, [nonHeadMinisters, polityDepartmentsQuery.data])

  const ministerPartyBreakdown = useMemo(() => {
    if (nonHeadMinisters.length === 0) return []
    const counts = new Map<
      string,
      { id: string; label: string; color: string; count: number }
    >()
    for (const m of nonHeadMinisters) {
      const p = m.party
      const key = p?.id ?? '__independent__'
      const label = p ? p.shortName?.trim() || p.name : '무소속 · 정당 미지정'
      const color = p?.brandColor?.trim() || '#94a3b8'
      const prev = counts.get(key)
      if (prev) {
        prev.count += 1
      } else {
        counts.set(key, { id: key, label, color, count: 1 })
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count)
  }, [nonHeadMinisters])

  if (!cabinetId) return null

  if (cabinetQuery.isLoading) {
    return <DetailShell>내각 정보를 불러오는 중입니다…</DetailShell>
  }

  if (!cabinet || !resolvedPolity) {
    return (
      <DetailShell>
        <TopNavBar>
          <BackBtn
            type="button"
            onClick={() => navigate(`${pathKeys.government.list()}${listSearch}`)}
          >
            <FiArrowLeft size={14} />
            <span>전 국가 내각 목록</span>
          </BackBtn>
        </TopNavBar>
        <EmptyCard>해당 행정부 정보를 찾을 수 없습니다.</EmptyCard>
      </DetailShell>
    )
  }

  const polity = resolvedPolity
  const headName = resolveCabinetHeadName(cabinet)
  const posTitle = resolveCabinetPositionTitle(cabinet)
  const distinctMeta = resolveCabinetDistinctSubMeta(cabinet)
  const categoryKey = resolveCabinetCategory(cabinet)
  const effectiveDates = resolveCabinetEffectiveDates(cabinet)
  const signedStartYear = extractSignedStartYearFromIso(effectiveDates.startDate)
  const periodLabel = formatIsoShortPeriod(
    effectiveDates.startDate,
    effectiveDates.endDate,
    effectiveDates.isOngoing,
  )
  const spanInfo = calculateTenureSpanInfo(
    effectiveDates.startDate,
    effectiveDates.endDate,
    effectiveDates.isOngoing,
    240,
  )
  const headAvatarUrl = cabinet.headTenure?.person?.profileImageUrl
    ? getUploadImageUrl(cabinet.headTenure.person.profileImageUrl)
    : null
  const headPersonId = cabinet.headTenure?.person?.id ?? null
  const achievements = cabinet.headTenure?.achievements ?? []
  const peerCabinets = (linkedPeersQuery.data ?? []).filter(
    (peerCab) => peerCab.id !== cabinet.id,
  )
  const treaties = treatiesQuery.data?.items ?? []
  const partyLinks = partiesQuery.data ?? []
  const cabinetEventLinks = cabinetEventsQuery.data ?? []
  const suggestedList = suggestedMinistersQuery.data ?? []
  const totalMinisterCount = nonHeadMinisters.length

  const appointmentMethodLabel = cabinet.headTenure?.appointmentMethod
    ? (APPOINTMENT_METHOD_LABEL[cabinet.headTenure.appointmentMethod] ??
      cabinet.headTenure.appointmentMethod)
    : null
  const endReasonLabel = cabinet.headTenure?.endReason
    ? (END_REASON_LABEL[cabinet.headTenure.endReason] ??
      cabinet.headTenure.endReason)
    : null

  const rawAppointmentDetail = (
    cabinet.headTenure as { appointmentDetail?: string | null } | null
  )?.appointmentDetail
  const appointmentDetailText =
    rawAppointmentDetail && !isVisuallyEmptyRichText(rawAppointmentDetail)
      ? rawAppointmentDetail
      : null
  const endReasonDetailText =
    cabinet.headTenure?.endReasonDetail &&
    !isVisuallyEmptyRichText(cabinet.headTenure.endReasonDetail)
      ? cabinet.headTenure.endReasonDetail
      : null
  const headNotesText =
    cabinet.headTenure?.notes &&
    !isVisuallyEmptyRichText(cabinet.headTenure.notes)
      ? cabinet.headTenure.notes
      : null

  const prevStartYear = continuityInfo.prevCabinet
    ? extractSignedStartYearFromIso(
        resolveCabinetEffectiveDates(continuityInfo.prevCabinet).startDate,
      )
    : null
  const nextStartYear = continuityInfo.nextCabinet
    ? extractSignedStartYearFromIso(
        resolveCabinetEffectiveDates(continuityInfo.nextCabinet).startDate,
      )
    : null

  const effectivePortfolioView: MinisterPortfolioViewMode =
    portfolioViewMode === 'matrix' && contemporaryDepartments.length > 0
      ? 'matrix'
      : 'cards'

  const handleOpenEditMinister = (ministerTenure: ExtendedCabinetTenureItem) => {
    const ministerName = ministerTenure.person
      ? getPersonDisplayName({
          ...ministerTenure.person,
          name: ministerTenure.person.name ?? '',
        })
      : '인물 미상'
    setAppointPresetDept(null)
    setEditingMinister({
      id: ministerTenure.id,
      personId: ministerTenure.person?.id ?? null,
      personName: ministerName,
      positionDefinitionId: ministerTenure.positionDefinition?.id ?? null,
      administrationDepartmentId:
        ministerTenure.administrationDepartmentId ??
        ministerTenure.administrationDepartment?.id ??
        null,
      cabinetId: cabinet.id,
      title: ministerTenure.title ?? null,
      startDate: ministerTenure.startDate ?? null,
      endDate: ministerTenure.endDate ?? null,
      notes: ministerTenure.notes ?? null,
    })
    setAppointModalOpen(true)
  }

  const handleDetachMinister = async (
    ministerTenure: ExtendedCabinetTenureItem,
  ) => {
    const ministerName = ministerTenure.person
      ? getPersonDisplayName({
          ...ministerTenure.person,
          name: ministerTenure.person.name ?? '',
        })
      : '해당 각료'
    const ok = await confirm({
      title: '내각 각료 편입 해제',
      message: `「${ministerName}」을(를) 이 내각 각료 명단에서 제외할까요? 인물의 재임 기록 자체는 삭제되지 않고 유지됩니다.`,
      confirmLabel: '편입 해제',
      danger: true,
    })
    if (!ok) return
    detachMinisterMutation.mutate(ministerTenure.id)
  }

  const handleDeleteCabinet = async () => {
    const ok = await confirm({
      title: '행정부 · 내각 삭제',
      message: `「${displayTitle}」 내각을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`,
      confirmLabel: '삭제',
      danger: true,
    })
    if (!ok) return
    try {
      await personCareerApi.deleteCabinet(cabinet.id)
      invalidateTenureQueries(queryClient, {
        cabinetId: cabinet.id,
        countryId: polity.modernCountryId,
        historicalCountryId: polity.historicalCountryId,
      })
      void queryClient.invalidateQueries({ queryKey: ['global-cabinets'] })
      notify.success('행정부·내각을 삭제했습니다.')
      navigate(`${pathKeys.government.list()}${listSearch}`)
    } catch (err) {
      notify.error(getApiErrorMessage(err))
    }
  }

  const handleUnlinkTreaty = async (treaty: TreatyDto, signatoryId: string) => {
    const ok = await confirm({
      title: '내각 조약 연결 해제',
      message: `「${treaty.name}」에서 이 행정부 연결을 해제할까요? 조약 본체와 국가 서명 기록은 유지됩니다.`,
      confirmLabel: '연결 해제',
      danger: true,
    })
    if (!ok) return
    try {
      await treatyApi.updateSignatory(signatoryId, { cabinetId: null })
      void queryClient.invalidateQueries({
        queryKey: ['treaties-by-cabinet', cabinetId],
      })
      void queryClient.invalidateQueries({ queryKey: ['global-cabinets'] })
      notify.success('이 내각에서 조약 연결을 해제했습니다.')
    } catch (err) {
      notify.error(getApiErrorMessage(err))
    }
  }

  const hasMissingSecondaryDomains =
    partyLinks.length === 0 ||
    achievements.length === 0 ||
    cabinetEventLinks.length === 0 ||
    treaties.length === 0 ||
    !cabinet.linkageGroup ||
    totalMinisterCount === 0

  return (
    <DetailShell>
      <TopNavBar>
        <BackBtn
          type="button"
          onClick={() => navigate(`${pathKeys.government.list()}${listSearch}`)}
        >
          <FiArrowLeft size={14} />
          <span>전 국가 내각 목록</span>
        </BackBtn>

        <NavActionGroup>
          {signedStartYear != null && (
            <ActionSecondaryBtn
              type="button"
              onClick={() =>
                navigate(pathKeys.government.list({ year: signedStartYear }))
              }
              title="출범 연도 기준 전 세계 동시대 행정부 비교"
            >
              <FiGlobe size={13} />
              <span>{formatSignedYearLabel(signedStartYear)}년 동시대 비교</span>
            </ActionSecondaryBtn>
          )}
          <ActionSecondaryBtn
            type="button"
            onClick={() => setEditModalOpen(true)}
          >
            <FiEdit2 size={13} />
            <span>내각 · 수반 수정</span>
          </ActionSecondaryBtn>
          <ActionPrimaryBtn
            type="button"
            onClick={() => {
              setEditingMinister(null)
              setAppointPresetDept(null)
              setAppointModalOpen(true)
            }}
          >
            <FiPlus size={14} />
            <span>각료 임명</span>
          </ActionPrimaryBtn>
          {polity.countryGovernmentUrl && (
            <CountryOpenLink to={polity.countryGovernmentUrl}>
              <span>{polity.polityName} 정부 탭</span>
              <FiArrowRight size={13} />
            </CountryOpenLink>
          )}
          <DangerIconBtn
            type="button"
            title="행정부·내각 삭제"
            aria-label="행정부·내각 삭제"
            onClick={() => void handleDeleteCabinet()}
          >
            <FiTrash2 size={13.5} />
          </DangerIconBtn>
        </NavActionGroup>
      </TopNavBar>

      <HeroCard>
        <HeroMetaRow>
          <HeroMetaChips>
            <PolityPillBtn
              type="button"
              $historical={polity.isHistorical}
              onClick={() => {
                if (polity.historicalCountryId) {
                  setCountryModalTarget({
                    kind: 'historical',
                    id: polity.historicalCountryId,
                    name: polity.polityName,
                  })
                } else if (polity.modernCountryId) {
                  setCountryModalTarget({
                    kind: 'modern',
                    id: polity.modernCountryId,
                    name: polity.polityName,
                  })
                }
              }}
            >
              {polity.flagEmoji ? <span>{polity.flagEmoji}</span> : null}
              <span>{polity.polityName}</span>
            </PolityPillBtn>
            {activePoliticalSystem?.governmentForm ? (
              <RegimeAccentTag>
                헌정: {GOVERNMENT_FORM_LABEL[activePoliticalSystem.governmentForm]}
              </RegimeAccentTag>
            ) : null}
            <TenureMetaTag>
              {GLOBAL_CABINET_CATEGORY_LABELS[categoryKey]}
            </TenureMetaTag>
            {appointmentMethodLabel && (
              <TenureMetaTag>취임: {appointmentMethodLabel}</TenureMetaTag>
            )}
            {endReasonLabel && (
              <TenureMetaTag>종료: {endReasonLabel}</TenureMetaTag>
            )}
          </HeroMetaChips>
          <PeriodMono>
            <FiCalendar size={12} />
            <span>{periodLabel}</span>
            <HeroDurationChip $ongoing={spanInfo.isOngoing}>
              {spanInfo.durationLabel}
            </HeroDurationChip>
          </PeriodMono>
        </HeroMetaRow>

        <HeroMainRow>
          {headAvatarUrl ? (
            <HeroAvatar src={headAvatarUrl} alt={headName} />
          ) : (
            <HeroAvatarFallback>{headName.slice(0, 1)}</HeroAvatarFallback>
          )}
          <HeroInfoCol>
            <HeroTitle>{displayTitle}</HeroTitle>
            <HeroSubline>
              {headPersonId ? (
                <InlinePersonBtn
                  type="button"
                  onClick={() => setSelectedPersonId(headPersonId)}
                >
                  <FiUser size={12} />
                  <span>{headName}</span>
                </InlinePersonBtn>
              ) : (
                <span>{headName}</span>
              )}
              {distinctMeta.hasExplicitCabinetName && posTitle ? (
                <span>· {posTitle}</span>
              ) : null}
            </HeroSubline>
            {cabinet.description &&
            !isVisuallyEmptyRichText(cabinet.description) ? (
              <HeroDescriptionBox>
                {renderRichOrPlainContent(cabinet.description)}
              </HeroDescriptionBox>
            ) : null}
            {(appointmentDetailText || endReasonDetailText || headNotesText) && (
              <HeroDetailNotesGrid>
                {appointmentDetailText && (
                  <HeroNoteItem>
                    <HeroNoteLabel>취임 경위</HeroNoteLabel>
                    {renderRichOrPlainContent(appointmentDetailText)}
                  </HeroNoteItem>
                )}
                {endReasonDetailText && (
                  <HeroNoteItem>
                    <HeroNoteLabel>퇴임 · 해산 경위</HeroNoteLabel>
                    {renderRichOrPlainContent(endReasonDetailText)}
                  </HeroNoteItem>
                )}
                {headNotesText && (
                  <HeroNoteItem>
                    <HeroNoteLabel>재임 비고</HeroNoteLabel>
                    {renderRichOrPlainContent(headNotesText)}
                  </HeroNoteItem>
                )}
              </HeroDetailNotesGrid>
            )}
          </HeroInfoCol>
        </HeroMainRow>
      </HeroCard>

      {/* ─── Chronological Continuity + Reshuffle Sibling Traversal ─── */}
      <ContinuityFlowStrip aria-label="전임·후임 내각 연속 계보">
        <ContinuitySlot $align="left">
          {continuityInfo.prevCabinet ? (
            <ContinuityNavLink
              to={pathKeys.government.cabinetDetail(
                continuityInfo.prevCabinet.id,
              )}
              state={{ governmentListSearch: listSearch }}
            >
              <FiArrowLeft size={13} />
              <ContinuitySlotTexts>
                <ContinuityRoleLabel>
                  전임 내각
                  {prevStartYear != null
                    ? ` · ${formatSignedYearLabel(prevStartYear)}년`
                    : ''}
                </ContinuityRoleLabel>
                <ContinuityTargetName>
                  {resolveCabinetDisplayTitle(continuityInfo.prevCabinet)}
                </ContinuityTargetName>
              </ContinuitySlotTexts>
            </ContinuityNavLink>
          ) : (
            <ContinuityMutedPlaceholder>
              <ContinuityRoleLabel>전임 내각</ContinuityRoleLabel>
              <span>기록된 이전 내각 없음</span>
            </ContinuityMutedPlaceholder>
          )}
        </ContinuitySlot>

        <ContinuityCenterNode>
          <ContinuityCurrentTop>
            <span>현재 열람</span>
            {continuityInfo.ordinalIndex > 0 ? (
              <ContinuityOrderBadge>
                {polity.polityName} {continuityInfo.ordinalIndex} /{' '}
                {continuityInfo.totalCount}
              </ContinuityOrderBadge>
            ) : null}
          </ContinuityCurrentTop>
          <ContinuityCurrentTitle>{displayTitle}</ContinuityCurrentTitle>
          <ContinuityBarWrap>
            <ContinuityTrack>
              <ContinuityFill
                $pct={spanInfo.barPct}
                $ongoing={spanInfo.isOngoing}
              />
            </ContinuityTrack>
            <ContinuityDurLabel $ongoing={spanInfo.isOngoing}>
              {spanInfo.durationLabel}
            </ContinuityDurLabel>
          </ContinuityBarWrap>
        </ContinuityCenterNode>

        <ContinuitySlot $align="right">
          {continuityInfo.nextCabinet ? (
            <ContinuityNavLink
              to={pathKeys.government.cabinetDetail(
                continuityInfo.nextCabinet.id,
              )}
              state={{ governmentListSearch: listSearch }}
              $align="right"
            >
              <ContinuitySlotTexts $align="right">
                <ContinuityRoleLabel>
                  후임 내각
                  {nextStartYear != null
                    ? ` · ${formatSignedYearLabel(nextStartYear)}년`
                    : ''}
                </ContinuityRoleLabel>
                <ContinuityTargetName>
                  {resolveCabinetDisplayTitle(continuityInfo.nextCabinet)}
                </ContinuityTargetName>
              </ContinuitySlotTexts>
              <FiArrowRight size={13} />
            </ContinuityNavLink>
          ) : (
            <ContinuityMutedPlaceholder $align="right">
              <ContinuityRoleLabel>후임 내각</ContinuityRoleLabel>
              <span>
                {effectiveDates.isOngoing
                  ? '현직 행정부 (재임 중)'
                  : '기록된 후속 내각 없음'}
              </span>
            </ContinuityMutedPlaceholder>
          )}
        </ContinuitySlot>
      </ContinuityFlowStrip>

      {continuityInfo.reshuffleSiblings.length > 1 && (
        <ReshuffleSiblingBar aria-label="동일 수반 산하 개각 계보">
          <ReshuffleBarLabel>동일 수반 개각 계보</ReshuffleBarLabel>
          <ReshufflePillRow>
            {continuityInfo.reshuffleSiblings.map((sibCab, idx) => {
              const isCurrentSib = sibCab.id === cabinet.id
              const sibDates = resolveCabinetEffectiveDates(sibCab)
              return (
                <ReshufflePillLink
                  key={sibCab.id}
                  to={pathKeys.government.cabinetDetail(sibCab.id)}
                  state={{ governmentListSearch: listSearch }}
                  $active={isCurrentSib}
                  aria-current={isCurrentSib ? 'page' : undefined}
                >
                  <strong>제{idx + 1}차</strong>
                  <span>{sibCab.name?.trim() || resolveCabinetDisplayTitle(sibCab)}</span>
                  <small>
                    {formatIsoShortPeriod(
                      sibDates.startDate,
                      sibDates.endDate,
                      sibDates.isOngoing,
                    )}
                  </small>
                </ReshufflePillLink>
              )
            })}
          </ReshufflePillRow>
        </ReshuffleSiblingBar>
      )}

      {/* ─── 2-Column Workspace (Left Main + Right Contextual Rail) ─── */}
      <DetailBodyGrid>
        <DetailMainColumn>
          {suggestedList.length > 0 && (
            <SuggestBannerCard>
              <SuggestBannerTopRow>
                <SuggestBannerText>
                  <FiRefreshCw size={14} />
                  <span>
                    이 내각 존속 기간과 겹치는 기등록 부처 인사{' '}
                    <strong>{suggestedList.length}명</strong>이 아직 편입되지
                    않았습니다.
                  </span>
                </SuggestBannerText>
                <SuggestBannerActions>
                  <ActionSecondaryBtn
                    type="button"
                    onClick={() => setSuggestExpanded((prev) => !prev)}
                  >
                    <span>{suggestExpanded ? '명단 접기' : '명단 확인 · 선택'}</span>
                    <FiChevronDown
                      size={13}
                      style={{
                        transform: suggestExpanded ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.15s ease',
                      }}
                    />
                  </ActionSecondaryBtn>
                  <ActionPrimaryBtn
                    type="button"
                    disabled={
                      attachSuggestedMutation.isPending ||
                      selectedSuggestedIds.size === 0
                    }
                    onClick={() =>
                      attachSuggestedMutation.mutate([...selectedSuggestedIds])
                    }
                  >
                    {attachSuggestedMutation.isPending
                      ? '편입 중…'
                      : `${selectedSuggestedIds.size}명 선택 편입`}
                  </ActionPrimaryBtn>
                </SuggestBannerActions>
              </SuggestBannerTopRow>

              {suggestExpanded && (
                <SuggestCandidateList>
                  <SuggestToolbarRow>
                    <SuggestTextToggleBtn
                      type="button"
                      onClick={() => {
                        if (selectedSuggestedIds.size === suggestedList.length) {
                          setSelectedSuggestedIds(new Set())
                        } else {
                          setSelectedSuggestedIds(
                            new Set(suggestedList.map((row) => row.tenureId)),
                          )
                        }
                      }}
                    >
                      {selectedSuggestedIds.size === suggestedList.length
                        ? '전체 선택 해제'
                        : '전체 선택'}
                    </SuggestTextToggleBtn>
                    <span>체크한 인사만 이 내각 각료로 편입합니다</span>
                  </SuggestToolbarRow>
                  {suggestedList.map((cand) => {
                    const checked = selectedSuggestedIds.has(cand.tenureId)
                    const candName = cand.person
                      ? getPersonDisplayName(cand.person)
                      : '인물 미상'
                    const candRole =
                      cand.title ?? cand.positionDefinition?.title ?? '각료'
                    const candDept = cand.administrationDepartment?.name ?? null
                    return (
                      <SuggestCandidateItem
                        key={cand.tenureId}
                        onClick={() => {
                          setSelectedSuggestedIds((prev) => {
                            const next = new Set(prev)
                            if (next.has(cand.tenureId)) {
                              next.delete(cand.tenureId)
                            } else {
                              next.add(cand.tenureId)
                            }
                            return next
                          })
                        }}
                      >
                        <SuggestCheckBox $checked={checked}>
                          {checked ? <FiCheck size={10} /> : null}
                        </SuggestCheckBox>
                        <SuggestCandidateMain>
                          <strong>{candName}</strong>
                          <span>
                            {[candDept, candRole].filter(Boolean).join(' · ')}
                          </span>
                        </SuggestCandidateMain>
                        <PeriodMono>
                          {formatIsoShortPeriod(
                            cand.startDate ?? null,
                            cand.endDate ?? null,
                            false,
                          )}
                        </PeriodMono>
                      </SuggestCandidateItem>
                    )
                  })}
                </SuggestCandidateList>
              )}
            </SuggestBannerCard>
          )}

          {/* Primary Section: 부처 편제표(공석 포함) + 부처별 카드 뷰 */}
          <SectionBlock>
            <SectionHeader>
              <SectionTitle>
                <FiUsers size={14} />
                <span>부처 편제 및 각료 진용</span>
              </SectionTitle>
              <SectionHeaderRight>
                <SectionCount>
                  각료 {totalMinisterCount}명
                  {contemporaryDepartments.length > 0
                    ? ` · 존속 부처 ${contemporaryDepartments.length}개`
                    : ''}
                </SectionCount>
                {contemporaryDepartments.length > 0 && (
                  <ViewModeToggle role="group" aria-label="각료 보기 방식">
                    <ViewModeBtn
                      type="button"
                      $active={effectivePortfolioView === 'matrix'}
                      onClick={() => setPortfolioViewMode('matrix')}
                      title="공석 부처를 포함한 전체 부처 편제표"
                    >
                      <FiList size={12} />
                      <span>편제표</span>
                    </ViewModeBtn>
                    <ViewModeBtn
                      type="button"
                      $active={effectivePortfolioView === 'cards'}
                      onClick={() => setPortfolioViewMode('cards')}
                      title="임명된 부처별 카드 보기"
                    >
                      <FiGrid size={12} />
                      <span>카드</span>
                    </ViewModeBtn>
                  </ViewModeToggle>
                )}
                <SmallAddBtn
                  type="button"
                  onClick={() => {
                    setEditingMinister(null)
                    setAppointPresetDept(null)
                    setAppointModalOpen(true)
                  }}
                >
                  <FiPlus size={12} />
                  <span>각료 추가</span>
                </SmallAddBtn>
              </SectionHeaderRight>
            </SectionHeader>

            {ministersQuery.isLoading ? (
              <CompactEmptyHint>
                소속 각료를 불러오는 중입니다…
              </CompactEmptyHint>
            ) : effectivePortfolioView === 'matrix' ? (
              <CabinetPortfolioMatrix
                departments={contemporaryDepartments}
                ministers={nonHeadMinisters}
                selectedMinisterId={null}
                isDark={isDark}
                onSelectMinister={(tenureId) => {
                  const target = nonHeadMinisters.find((m) => m.id === tenureId)
                  if (target?.person?.id) {
                    setSelectedPersonId(target.person.id)
                  }
                }}
                onEditMinister={(tenure) =>
                  handleOpenEditMinister(tenure as ExtendedCabinetTenureItem)
                }
                onAppointForDepartment={(dept) => {
                  setEditingMinister(null)
                  setAppointPresetDept(dept)
                  setAppointModalOpen(true)
                }}
                onOpenDepartmentDetail={(deptId) =>
                  navigate(pathKeys.government.departmentDetail(deptId), {
                    state: { governmentListSearch: listSearch },
                  })
                }
                onOpenMinistriesTab={
                  polity.polityId
                    ? () =>
                        navigate(
                          `${pathKeys.countryGovernment(polity.polityId!)}?sub=ministries`,
                        )
                    : undefined
                }
              />
            ) : groupedMinisters.length === 0 ? (
              <CompactEmptyHint>
                <span>등록된 소속 각료가 아직 없습니다.</span>
                <SmallAddBtn
                  type="button"
                  onClick={() => {
                    setEditingMinister(null)
                    setAppointPresetDept(null)
                    setAppointModalOpen(true)
                  }}
                >
                  <FiPlus size={12} />
                  <span>첫 각료 임명하기</span>
                </SmallAddBtn>
              </CompactEmptyHint>
            ) : (
              <MinisterGrid>
                {groupedMinisters.map((deptGroup) => (
                  <DepartmentMinisterCard key={deptGroup.key}>
                    <DeptCardHeader>
                      {deptGroup.departmentId ? (
                        <DeptTitleLink
                          to={pathKeys.government.departmentDetail(
                            deptGroup.departmentId,
                          )}
                          state={{ governmentListSearch: listSearch }}
                        >
                          {deptGroup.departmentName} →
                        </DeptTitleLink>
                      ) : (
                        <DeptTitlePlain>
                          {deptGroup.departmentName}
                        </DeptTitlePlain>
                      )}
                    </DeptCardHeader>

                    <MinisterList>
                      {deptGroup.items.map((ministerTenure) => {
                        const ministerName = ministerTenure.person
                          ? getPersonDisplayName({
                              ...ministerTenure.person,
                              name: ministerTenure.person.name ?? '',
                            })
                          : '인물 미상'
                        const roleLabel =
                          ministerTenure.title ??
                          ministerTenure.positionDefinition?.title ??
                          '각료'
                        const avatar = ministerTenure.person?.profileImageUrl
                          ? getUploadImageUrl(
                              ministerTenure.person.profileImageUrl,
                            )
                          : null
                        const personId = ministerTenure.person?.id ?? null

                        return (
                          <MinisterItemRow key={ministerTenure.id}>
                            <MinisterRow
                              type="button"
                              onClick={() => {
                                if (personId) setSelectedPersonId(personId)
                              }}
                            >
                              {avatar ? (
                                <MiniAvatar src={avatar} alt={ministerName} />
                              ) : (
                                <MiniAvatarFallback>
                                  {ministerName.slice(0, 1)}
                                </MiniAvatarFallback>
                              )}
                              <MinisterTexts>
                                <MinisterNameLine>
                                  <MinisterName>{ministerName}</MinisterName>
                                  {ministerTenure.isActing ? (
                                    <ActingPill>직무대행</ActingPill>
                                  ) : null}
                                </MinisterNameLine>
                                <MinisterRole>
                                  {roleLabel} ·{' '}
                                  {formatIsoShortPeriod(
                                    ministerTenure.startDate,
                                    ministerTenure.endDate,
                                    false,
                                  )}
                                </MinisterRole>
                              </MinisterTexts>
                            </MinisterRow>
                            <MinisterRowActions>
                              <MinisterEditBtn
                                type="button"
                                aria-label={`${ministerName} 임명 수정`}
                                title="직위 · 담당 부처 · 재임 기간 수정"
                                onClick={() =>
                                  handleOpenEditMinister(ministerTenure)
                                }
                              >
                                <FiEdit2 size={12} />
                              </MinisterEditBtn>
                              <MinisterEditBtn
                                type="button"
                                aria-label={`${ministerName} 내각 편입 해제`}
                                title="이 내각에서만 제외 (재임 기록 유지)"
                                onClick={() =>
                                  void handleDetachMinister(ministerTenure)
                                }
                              >
                                <FiX size={13} />
                              </MinisterEditBtn>
                            </MinisterRowActions>
                          </MinisterItemRow>
                        )
                      })}
                    </MinisterList>
                  </DepartmentMinisterCard>
                ))}
              </MinisterGrid>
            )}
          </SectionBlock>

          {/* 집권 · 연정 정당 (인라인 역할 변경 · 수반 정당 원클릭 연결 · 해제 공통 모듈) */}
          <SectionBlock>
            <CabinetPoliticalPartiesBlock
              cabinetId={cabinet.id}
              countryId={polity.modernCountryId ?? undefined}
              historicalCountryId={polity.historicalCountryId ?? undefined}
              headTenureParty={
                (
                  cabinet.headTenure as {
                    party?: {
                      id: string
                      name: string
                      shortName?: string | null
                      brandColor?: string | null
                    } | null
                  } | null
                )?.party ?? null
              }
              isDark={isDark}
            />
          </SectionBlock>

          {/* 다국 연결 행정부 — 피어가 0건이어도 국제 사건 축이 연결되어 있으면 표시 */}
          {cabinet.linkageGroup && (
            <SectionBlock>
              <SectionHeader>
                <SectionTitle>
                  <FiLink2 size={14} />
                  <span>다국 연결 행정부 (동시대 국제 사건 축)</span>
                </SectionTitle>
                <SectionHeaderRight>
                  {cabinet.linkageGroup.event && (
                    <EventLinkChip
                      to={`/events/${cabinet.linkageGroup.event.id}`}
                    >
                      사건: {cabinet.linkageGroup.event.title} →
                    </EventLinkChip>
                  )}
                  <SmallAddBtn
                    type="button"
                    onClick={() => setLinkageModalOpen(true)}
                  >
                    <FiLink2 size={12} />
                    <span>다국 묶음 관리</span>
                  </SmallAddBtn>
                </SectionHeaderRight>
              </SectionHeader>
              {peerCabinets.length === 0 ? (
                <CompactEmptyHint>
                  <span>
                    기준 사건은 지정되어 있으나 연결된 타국 행정부가 아직 없습니다.
                  </span>
                  <SmallAddBtn
                    type="button"
                    onClick={() => setLinkageModalOpen(true)}
                  >
                    <FiPlus size={12} />
                    <span>타국 행정부 추가 연결</span>
                  </SmallAddBtn>
                </CompactEmptyHint>
              ) : (
                <PeerGrid>
                  {peerCabinets.map((peerCab) => {
                    const peerPolity = resolveCabinetPolityInfo(peerCab)
                    const peerDates = resolveCabinetEffectiveDates(peerCab)
                    return (
                      <PeerCard
                        key={peerCab.id}
                        to={pathKeys.government.cabinetDetail(peerCab.id)}
                        state={{ governmentListSearch: listSearch }}
                      >
                        <PolityStaticPill $historical={peerPolity.isHistorical}>
                          {peerPolity.flagEmoji ? (
                            <span>{peerPolity.flagEmoji}</span>
                          ) : null}
                          <span>{peerPolity.polityName}</span>
                        </PolityStaticPill>
                        <PeerTitle>
                          {resolveCabinetDisplayTitle(peerCab)}
                        </PeerTitle>
                        <PeerMeta>
                          {formatIsoShortPeriod(
                            peerDates.startDate,
                            peerDates.endDate,
                            peerDates.isOngoing,
                          )}
                        </PeerMeta>
                      </PeerCard>
                    )
                  })}
                </PeerGrid>
              )}
            </SectionBlock>
          )}

          {/* 수반 재임 주요 정책 · 업적 (등록 및 삭제 지원) */}
          {(achievements.length > 0 || addingAchievement) && (
            <SectionBlock>
              <SectionHeader>
                <SectionTitle>
                  <FiAward size={14} />
                  <span>수반 재임 기록 · 주요 정책/업적</span>
                </SectionTitle>
                <SectionHeaderRight>
                  <SectionCount>{achievements.length}건</SectionCount>
                  {cabinet.headTenure?.id && !addingAchievement && (
                    <SmallAddBtn
                      type="button"
                      onClick={() => setAddingAchievement(true)}
                    >
                      <FiPlus size={12} />
                      <span>업적 추가</span>
                    </SmallAddBtn>
                  )}
                </SectionHeaderRight>
              </SectionHeader>

              {addingAchievement && (
                <InlineAchievementForm>
                  <InlineFormInput
                    type="text"
                    placeholder="정책·업적 제목 (예: 뉴딜 정책 추진, 대동법 시행)"
                    value={newAchievementTitle}
                    onChange={(ev) => setNewAchievementTitle(ev.target.value)}
                  />
                  <InlineFormTextarea
                    rows={3}
                    placeholder="주요 내용·성과 요약 (선택)"
                    value={newAchievementDesc}
                    onChange={(ev) => setNewAchievementDesc(ev.target.value)}
                  />
                  <InlineFormBtnRow>
                    <ActionSecondaryBtn
                      type="button"
                      onClick={() => {
                        setAddingAchievement(false)
                        setNewAchievementTitle('')
                        setNewAchievementDesc('')
                      }}
                    >
                      취소
                    </ActionSecondaryBtn>
                    <ActionPrimaryBtn
                      type="button"
                      disabled={
                        !newAchievementTitle.trim() ||
                        createAchievementMutation.isPending
                      }
                      onClick={() => createAchievementMutation.mutate()}
                    >
                      {createAchievementMutation.isPending ? '저장 중…' : '저장'}
                    </ActionPrimaryBtn>
                  </InlineFormBtnRow>
                </InlineAchievementForm>
              )}

              <AchievementList>
                {achievements.map((achievementItem) => (
                  <AchievementCard key={achievementItem.id}>
                    <AchievementHeader>
                      <AchievementTitle>
                        {achievementItem.title}
                      </AchievementTitle>
                      <SectionHeaderRight>
                        {(achievementItem.startDate ||
                          achievementItem.endDate) && (
                          <PeriodMono>
                            {formatIsoShortPeriod(
                              achievementItem.startDate,
                              achievementItem.endDate,
                              false,
                            )}
                          </PeriodMono>
                        )}
                        <MinisterEditBtn
                          type="button"
                          title="업적 삭제"
                          aria-label={`${achievementItem.title} 삭제`}
                          onClick={async () => {
                            const ok = await confirm({
                              title: '업적 삭제',
                              message: `「${achievementItem.title}」 기록을 삭제할까요?`,
                              confirmLabel: '삭제',
                              danger: true,
                            })
                            if (ok) {
                              deleteAchievementMutation.mutate(
                                achievementItem.id,
                              )
                            }
                          }}
                        >
                          <FiTrash2 size={12} />
                        </MinisterEditBtn>
                      </SectionHeaderRight>
                    </AchievementHeader>
                    {achievementItem.description &&
                    !isVisuallyEmptyRichText(achievementItem.description) ? (
                      <AchievementBodyBox>
                        {renderRichOrPlainContent(achievementItem.description)}
                      </AchievementBodyBox>
                    ) : null}
                  </AchievementCard>
                ))}
              </AchievementList>
            </SectionBlock>
          )}

          {/* 관여 역사 사건 (인라인 역할 변경 · 해제 공통 모듈) */}
          <SectionBlock>
            <SectionHeader>
              <SectionTitle>
                <FiLayers size={14} />
                <span>관여한 역사 사건</span>
              </SectionTitle>
            </SectionHeader>
            <CabinetEventsSection
              cabinetId={cabinet.id}
              countryId={
                polity.historicalCountryId ? null : polity.modernCountryId
              }
              historicalCountryId={polity.historicalCountryId}
            />
          </SectionBlock>

          {treaties.length > 0 && (
            <SectionBlock>
              <SectionHeader>
                <SectionTitle>
                  <FiFileText size={14} />
                  <span>이 내각이 서명·체결한 조약</span>
                </SectionTitle>
                <SectionHeaderRight>
                  <SectionCount>{treaties.length}건</SectionCount>
                  <SmallAddBtn
                    type="button"
                    onClick={() => setTreatyModalOpen(true)}
                  >
                    <FiPlus size={12} />
                    <span>조약 연결</span>
                  </SmallAddBtn>
                </SectionHeaderRight>
              </SectionHeader>
              <PeerGrid>
                {treaties.map((treatyItem) => {
                  const matchedSignatory = treatyItem.signatories?.find(
                    (sig) => sig.cabinetId === cabinet.id,
                  )
                  return (
                    <TreatyCardWrap key={treatyItem.id}>
                      <TreatyCardMainLink
                        to={pathKeys.treaties.detail(treatyItem.id)}
                      >
                        <PeerTitle>{treatyItem.name}</PeerTitle>
                        <PeerMeta>
                          {formatIsoShortPeriod(
                            treatyItem.signDate,
                            null,
                            false,
                          )}
                        </PeerMeta>
                      </TreatyCardMainLink>
                      {matchedSignatory && (
                        <MinisterEditBtn
                          type="button"
                          title="이 내각에서 조약 연결 해제"
                          aria-label={`${treatyItem.name} 연결 해제`}
                          onClick={() =>
                            void handleUnlinkTreaty(
                              treatyItem,
                              matchedSignatory.id,
                            )
                          }
                        >
                          <FiX size={13} />
                        </MinisterEditBtn>
                      )}
                    </TreatyCardWrap>
                  )
                })}
              </PeerGrid>
            </SectionBlock>
          )}

          {/* ─── Bottom Fill-In Action Strip ─── */}
          {hasMissingSecondaryDomains ? (
            <FillInStrip>
              <FillInLabel>더 채울 수 있는 기록</FillInLabel>
              <FillInActions>
                {totalMinisterCount === 0 ? (
                  <FillInBtn
                    type="button"
                    onClick={() => {
                      setEditingMinister(null)
                      setAppointPresetDept(null)
                      setAppointModalOpen(true)
                    }}
                  >
                    <FiPlus size={12} />
                    <span>소속 각료 임명</span>
                  </FillInBtn>
                ) : null}
                {cabinet.headTenure?.id && achievements.length === 0 ? (
                  <FillInBtn
                    type="button"
                    onClick={() => setAddingAchievement(true)}
                  >
                    <FiAward size={12} />
                    <span>수반 정책·업적 추가</span>
                  </FillInBtn>
                ) : null}
                {treaties.length === 0 ? (
                  <FillInBtn
                    type="button"
                    onClick={() => setTreatyModalOpen(true)}
                  >
                    <FiFileText size={12} />
                    <span>서명·체결 조약 연결</span>
                  </FillInBtn>
                ) : null}
                {!cabinet.linkageGroup ? (
                  <FillInBtn
                    type="button"
                    onClick={() => setLinkageModalOpen(true)}
                  >
                    <FiLink2 size={12} />
                    <span>다국 행정부 묶기</span>
                  </FillInBtn>
                ) : null}
                <FillInBtn
                  type="button"
                  onClick={() => setEditModalOpen(true)}
                >
                  <FiEdit2 size={12} />
                  <span>내각 설명 · 기간 · 수반 편집</span>
                </FillInBtn>
              </FillInActions>
            </FillInStrip>
          ) : null}
        </DetailMainColumn>

        {/* ─── Right Sticky Contextual Rail (중복 제거 · 헌정/군주/개각/의석 맥락) ─── */}
        <DetailContextRail aria-label="헌정 맥락 및 내각 구조 요약">
          {/* 1. 동시대 헌정 체제 (PoliticalSystem) */}
          <FactsCard>
            <FactsCardHeader>
              <FiBookOpen size={13} />
              <span>동시대 헌정 체제</span>
            </FactsCardHeader>
            {activePoliticalSystem ? (
              <>
                <ContextSystemHero>
                  <ContextSystemTitle>
                    {activePoliticalSystem.name?.trim() ||
                      (activePoliticalSystem.governmentForm
                        ? GOVERNMENT_FORM_LABEL[
                            activePoliticalSystem.governmentForm
                          ]
                        : '헌정 체제')}
                  </ContextSystemTitle>
                  <ContextSystemPeriod>
                    {formatPoliticalSystemPeriod(activePoliticalSystem)}
                  </ContextSystemPeriod>
                  {activePoliticalSystem.governmentForm &&
                  GOVERNMENT_FORM_META[activePoliticalSystem.governmentForm] ? (
                    <ContextSystemDesc>
                      {
                        GOVERNMENT_FORM_META[
                          activePoliticalSystem.governmentForm
                        ].executiveSummary
                      }
                    </ContextSystemDesc>
                  ) : null}
                </ContextSystemHero>
                <FactsList>
                  {activePoliticalSystem.governmentForm && (
                    <FactRow>
                      <FactKey>정부 형태</FactKey>
                      <FactVal>
                        {
                          GOVERNMENT_FORM_LABEL[
                            activePoliticalSystem.governmentForm
                          ]
                        }
                      </FactVal>
                    </FactRow>
                  )}
                  {activePoliticalSystem.stateStructure && (
                    <FactRow>
                      <FactKey>국가 구조</FactKey>
                      <FactVal>
                        {
                          STATE_STRUCTURE_LABEL[
                            activePoliticalSystem.stateStructure
                          ]
                        }
                      </FactVal>
                    </FactRow>
                  )}
                  {activePoliticalSystem.legislatureType && (
                    <FactRow>
                      <FactKey>의회 구성</FactKey>
                      <FactVal>
                        {
                          LEGISLATURE_TYPE_LABEL[
                            activePoliticalSystem.legislatureType
                          ]
                        }
                      </FactVal>
                    </FactRow>
                  )}
                  {activePoliticalSystem.partySystem && (
                    <FactRow>
                      <FactKey>정당 체제</FactKey>
                      <FactVal>
                        {PARTY_SYSTEM_LABEL[activePoliticalSystem.partySystem]}
                      </FactVal>
                    </FactRow>
                  )}
                </FactsList>
              </>
            ) : (
              <ContextEmptyBox>
                이 내각 존속 시기에 등록된 헌정 체제(PoliticalSystem) 정보가 아직
                없습니다.
              </ContextEmptyBox>
            )}
            {polity.polityId ? (
              <FactsFooterLink
                to={`${pathKeys.countryGovernment(polity.polityId)}?sub=system`}
              >
                <span>{polity.polityName} 정체·헌정 기록 보기</span>
                <FiArrowUpRight size={12} />
              </FactsFooterLink>
            ) : null}
          </FactsCard>

          {/* 2. 동시대 재위 군주 / 국가원수 맥락 (이원집정부·입헌군주·전근대 재상 내각 등) */}
          {contemporarySovereign && (
            <FactsCard>
              <FactsCardHeader>
                <FiAward size={13} />
                <span>
                  {contemporarySovereign.positionDefinition?.isMonarchical
                    ? '당대 재위 군주 · 연호'
                    : '당대 국가원수'}
                </span>
              </FactsCardHeader>
              <SovereignContextBody>
                {contemporarySovereign.person?.profileImageUrl ? (
                  <MiniAvatar
                    src={getUploadImageUrl(
                      contemporarySovereign.person.profileImageUrl,
                    )}
                    alt=""
                  />
                ) : (
                  <MiniAvatarFallback>
                    {(contemporarySovereign.person
                      ? getPersonDisplayName(contemporarySovereign.person)
                      : '원'
                    ).slice(0, 1)}
                  </MiniAvatarFallback>
                )}
                <SovereignTextCol>
                  <SovereignNameBtn
                    type="button"
                    onClick={() => {
                      if (contemporarySovereign.person?.id) {
                        setSelectedPersonId(contemporarySovereign.person.id)
                      }
                    }}
                  >
                    {contemporarySovereign.regnalName?.trim() ||
                      (contemporarySovereign.person
                        ? getPersonDisplayName(contemporarySovereign.person)
                        : '인물 미상')}
                  </SovereignNameBtn>
                  <SovereignMetaText>
                    {contemporarySovereign.title ??
                      contemporarySovereign.positionDefinition?.title ??
                      '국가원수'}{' '}
                    ·{' '}
                    {formatIsoShortPeriod(
                      contemporarySovereign.startDate ?? null,
                      contemporarySovereign.endDate ?? null,
                      false,
                    )}
                  </SovereignMetaText>
                  {contemporarySovereign.regnalEras &&
                  contemporarySovereign.regnalEras.length > 0 ? (
                    <EraBadgeRow>
                      {contemporarySovereign.regnalEras.map((eraItem) => (
                        <EraChip key={eraItem.id}>연호: {eraItem.name}</EraChip>
                      ))}
                    </EraBadgeRow>
                  ) : null}
                </SovereignTextCol>
              </SovereignContextBody>
            </FactsCard>
          )}

          {/* 3. 각료 정당 배분 요약 */}
          {ministerPartyBreakdown.length > 0 && (
            <FactsCard>
              <FactsCardHeader>
                <FiFlag size={13} />
                <span>각료 정당 배분 ({totalMinisterCount}명)</span>
              </FactsCardHeader>
              <PortfolioPartyBody>
                <PartyStackedBar aria-hidden>
                  {ministerPartyBreakdown.map((seg) => (
                    <PartyStackedSegment
                      key={seg.id}
                      $color={seg.color}
                      $flex={seg.count}
                      title={`${seg.label}: ${seg.count}명`}
                    />
                  ))}
                </PartyStackedBar>
                <PartyBreakdownList>
                  {ministerPartyBreakdown.map((seg) => (
                    <PartyBreakdownRow key={seg.id}>
                      <PartyBreakdownLeft>
                        <PartyColorDot $color={seg.color} />
                        <span>{seg.label}</span>
                      </PartyBreakdownLeft>
                      <strong>{seg.count}명</strong>
                    </PartyBreakdownRow>
                  ))}
                </PartyBreakdownList>
              </PortfolioPartyBody>
            </FactsCard>
          )}

          {/* 4. 국가 내각 아카이브 바로가기 */}
          {polity.countryGovernmentUrl && (
            <FactsCard>
              <FactsFooterLink
                to={polity.countryGovernmentUrl}
                style={{ borderTop: 'none' }}
              >
                <span>{polity.polityName} 역대 행정부 전체 보기</span>
                <FiArrowRight size={12} />
              </FactsFooterLink>
            </FactsCard>
          )}
        </DetailContextRail>
      </DetailBodyGrid>

      <CabinetFormModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        editingCabinet={toEditableCabinetRecord(cabinet)}
        onSaved={() => {
          void queryClient.invalidateQueries({
            queryKey: ['global-cabinet-detail', cabinetId],
          })
          void queryClient.invalidateQueries({ queryKey: ['global-cabinets'] })
          void queryClient.invalidateQueries({
            queryKey: ['cabinet-detail-polity-cabinets'],
          })
        }}
      />

      <InstitutionAppointmentModal
        isOpen={appointModalOpen}
        onClose={() => {
          setAppointModalOpen(false)
          setEditingMinister(null)
          setAppointPresetDept(null)
        }}
        contextType="CABINET"
        countryId={polity.modernCountryId}
        historicalCountryId={polity.historicalCountryId}
        countryName={polity.polityName}
        departmentId={appointPresetDept?.id ?? null}
        departmentName={appointPresetDept?.name ?? null}
        departmentKind={appointPresetDept?.kind ?? null}
        cabinetId={cabinet.id}
        cabinetName={displayTitle}
        cabinetStartDate={resolveCabinetEffectiveDates(cabinet).startDate}
        cabinetEndDate={resolveCabinetEffectiveDates(cabinet).endDate}
        availableDepartments={
          contemporaryDepartments.length > 0
            ? contemporaryDepartments
            : (polityDepartmentsQuery.data ?? [])
        }
        editingTenure={editingMinister}
        onSaved={() => {
          setAppointModalOpen(false)
          setEditingMinister(null)
          setAppointPresetDept(null)
          invalidateTenureQueries(queryClient, { cabinetId: cabinet.id })
          void queryClient.invalidateQueries({
            queryKey: ['cabinet-tenures', cabinetId],
          })
          void queryClient.invalidateQueries({
            queryKey: ['cabinet-suggested-members', cabinetId],
          })
          void queryClient.invalidateQueries({ queryKey: ['global-cabinets'] })
        }}
      />

      {partyModalOpen && (
        <CabinetPartyLinkModal
          cabinetId={cabinet.id}
          countryId={polity.modernCountryId ?? undefined}
          historicalCountryId={polity.historicalCountryId ?? undefined}
          linkedPartyIds={partyLinks.map((partyLink) => partyLink.partyId)}
          isDark={isDark}
          onClose={() => setPartyModalOpen(false)}
        />
      )}

      {eventModalOpen && (
        <CabinetEventAttachModal
          cabinetId={cabinet.id}
          countryId={
            polity.historicalCountryId
              ? undefined
              : (polity.modernCountryId ?? undefined)
          }
          historicalCountryId={polity.historicalCountryId ?? undefined}
          excludeEventIds={
            new Set(cabinetEventLinks.map((link) => link.eventId))
          }
          onClose={() => setEventModalOpen(false)}
          onAttached={() => {
            void queryClient.invalidateQueries({
              queryKey: ['cabinet-linked-events', cabinetId],
            })
            void queryClient.invalidateQueries({
              queryKey: ['global-cabinet-detail', cabinetId],
            })
            void queryClient.invalidateQueries({ queryKey: ['global-cabinets'] })
          }}
        />
      )}

      {linkageModalOpen && (
        <CabinetLinkageModal
          cabinetId={cabinet.id}
          countryId={
            polity.historicalCountryId
              ? undefined
              : (polity.modernCountryId ?? undefined)
          }
          historicalCountryId={polity.historicalCountryId ?? undefined}
          countryName={polity.polityName}
          isDark={isDark}
          linkageGroupId={cabinet.linkageGroup?.id ?? null}
          linkageGroup={cabinet.linkageGroup ?? null}
          onClose={() => setLinkageModalOpen(false)}
        />
      )}

      {treatyModalOpen && polity.polityId && (
        <TreatyLinkModal
          cabinetId={cabinet.id}
          country={
            {
              id: polity.polityId,
              name: polity.polityName,
              type: polity.isHistorical ? 'historical' : 'modern',
              flagEmoji: polity.flagEmoji,
            } satisfies UnifiedCountry
          }
          countryId={polity.historicalCountryId ? null : polity.modernCountryId}
          historicalCountryId={polity.historicalCountryId}
          cabinets={polityCabinetsQuery.data ?? [cabinet]}
          currentTreaties={treaties}
          isDark={isDark}
          onClose={() => setTreatyModalOpen(false)}
          onLinked={async () => {
            await queryClient.invalidateQueries({
              queryKey: ['treaties-by-cabinet', cabinetId],
            })
            await queryClient.invalidateQueries({
              queryKey: ['global-cabinet-detail', cabinetId],
            })
            await queryClient.invalidateQueries({ queryKey: ['global-cabinets'] })
            setTreatyModalOpen(false)
          }}
        />
      )}

      <PersonInlineModal
        personId={selectedPersonId}
        onClose={() => setSelectedPersonId(null)}
        onEdit={() => setSelectedPersonId(null)}
      />

      <CountryInlineModal
        target={countryModalTarget}
        onClose={() => setCountryModalTarget(null)}
        onSwitch={(nextTarget) => setCountryModalTarget(nextTarget)}
      />
    </DetailShell>
  )
}

export default GovernmentCabinetDetailPage

/* ─── Styled Components ─────────────────────────────────────────────────── */

const DetailShell = styled.div`
  max-width: 1180px;
  margin: 0 auto;
  padding: 22px 28px 64px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const TopNavBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const NavActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const BackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const ActionPrimaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 13px;
  border-radius: ${RADIUS.SM};
  border: none;
  background: #4f46e5;
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #4338ca;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

const ActionSecondaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const DangerIconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 31px;
  height: 31px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.45);
    background: rgba(239, 68, 68, 0.08);
  }
`

const CountryOpenLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 12.5px;
  font-weight: 700;
  text-decoration: none;
`

const SuggestBannerCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
`

const SuggestBannerTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const SuggestBannerActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const SuggestBannerText = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};

  strong {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    font-weight: 800;
  }
`

const SuggestCandidateList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const SuggestToolbarRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SuggestTextToggleBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
`

const SuggestCandidateItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const SuggestCheckBox = styled.span<{ $checked: boolean }>`
  width: 16px;
  height: 16px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1.5px solid
    ${({ $checked, theme }) =>
      $checked ? '#4f46e5' : ledgerHairlineStrong(theme.mode)};
  background: ${({ $checked }) => ($checked ? '#4f46e5' : 'transparent')};
  color: #ffffff;
`

const SuggestCandidateMain = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};

  span {
    color: ${({ theme }) => theme.colors.text.secondary};
    font-size: 12px;
  }
`

const HeroCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 22px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
`

const HeroMetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
`

const HeroMetaChips = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const RegimeAccentTag = styled.span`
  padding: 3px 8px;
  border-radius: ${RADIUS.SM};
  font-size: 11.5px;
  font-weight: 700;
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const TenureMetaTag = styled.span`
  padding: 3px 8px;
  border-radius: ${RADIUS.SM};
  font-size: 11.5px;
  font-weight: 600;
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeroDurationChip = styled.span<{ $ongoing?: boolean }>`
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  background: ${({ theme, $ongoing }) =>
    $ongoing ? 'rgba(16, 185, 129, 0.14)' : ledgerAccentSubtle(theme.mode)};
  color: ${({ theme, $ongoing }) =>
    $ongoing ? '#10b981' : ledgerAccent(theme.mode)};
`

const PolityPillBtn = styled.button<{ $historical: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ theme, $historical }) =>
      $historical
        ? theme.mode === 'dark'
          ? 'rgba(245, 158, 11, 0.32)'
          : 'rgba(180, 83, 9, 0.24)'
        : ledgerHairlineStrong(theme.mode)};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  background: ${({ theme, $historical }) =>
    $historical
      ? theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.14)'
        : 'rgba(245, 158, 11, 0.1)'
      : ledgerChipFill(theme.mode)};
  color: ${({ theme, $historical }) =>
    $historical
      ? theme.mode === 'dark'
        ? '#fcd34d'
        : '#b45309'
      : theme.colors.text.primary};

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const PolityStaticPill = styled.span<{ $historical: boolean }>`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  border-radius: ${RADIUS.SM};
  font-size: 12px;
  font-weight: 700;
  background: ${({ theme, $historical }) =>
    $historical
      ? theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.14)'
        : 'rgba(245, 158, 11, 0.1)'
      : ledgerChipFill(theme.mode)};
  color: ${({ theme, $historical }) =>
    $historical
      ? theme.mode === 'dark'
        ? '#fcd34d'
        : '#b45309'
      : theme.colors.text.primary};
`

const PeriodMono = styled.span`
  ${DIGIT_DISPLAY}
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeroMainRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
`

const HeroAvatar = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`

const HeroAvatarFallback = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 800;
  flex-shrink: 0;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const HeroInfoCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  flex: 1;
`

const HeroTitle = styled.h1`
  margin: 0;
  font-size: 21px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HeroSubline = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const InlinePersonBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

const HeroDescriptionBox = styled.div`
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeroDetailNotesGrid = styled.div`
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc'};
`

const HeroNoteItem = styled.div`
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeroNoteLabel = styled.span`
  display: inline-block;
  margin-right: 8px;
  font-size: 11px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RichProseBlock = styled.div`
  p {
    margin: 0 0 6px;
  }
  p:last-child {
    margin-bottom: 0;
  }
  ul,
  ol {
    margin: 4px 0;
    padding-left: 18px;
  }
  img {
    max-width: 100%;
    height: auto;
    border-radius: ${RADIUS.SM};
  }
`

const PlainProseBlock = styled.span`
  white-space: pre-wrap;
  word-break: break-word;
`

/* ─── Continuity Flow Strip & Reshuffle Sibling Bar ─── */

const ContinuityFlowStrip = styled.nav`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 1.15fr) minmax(0, 1fr);
  align-items: stretch;
  gap: 10px;
  padding: 10px 14px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc'};

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`

const ContinuitySlot = styled.div<{ $align: 'left' | 'right' }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $align }) =>
    $align === 'right' ? 'flex-end' : 'flex-start'};
  min-width: 0;
`

const ContinuityNavLink = styled(Link)<{ $align?: 'left' | 'right' }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $align }) =>
    $align === 'right' ? 'flex-end' : 'flex-start'};
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  min-width: 0;
  transition:
    background 0.14s ease,
    border-color 0.14s ease;

  &:hover {
    background: ${({ theme }) => ledgerSurface(theme.mode)};
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const ContinuitySlotTexts = styled.div<{ $align?: 'left' | 'right' }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $align }) =>
    $align === 'right' ? 'flex-end' : 'flex-start'};
  gap: 2px;
  min-width: 0;
`

const ContinuityRoleLabel = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ContinuityTargetName = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
`

const ContinuityMutedPlaceholder = styled.div<{ $align?: 'left' | 'right' }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $align }) =>
    $align === 'right' ? 'flex-end' : 'flex-start'};
  gap: 2px;
  padding: 8px 10px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ContinuityCenterNode = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  min-width: 0;
`

const ContinuityCurrentTop = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const ContinuityOrderBadge = styled.span`
  ${DIGIT_DISPLAY}
  padding: 1px 6px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 10px;
  font-weight: 800;
`

const ContinuityCurrentTitle = styled.div`
  font-size: 13px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
`

const ContinuityBarWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  max-width: 180px;
`

const ContinuityTrack = styled.span`
  flex: 1;
  min-width: 48px;
  height: 5px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  overflow: hidden;
`

const ContinuityFill = styled.span<{ $pct: number; $ongoing?: boolean }>`
  display: block;
  height: 100%;
  width: ${({ $pct }) => Math.max(8, Math.min(100, $pct))}%;
  border-radius: 999px;
  background: ${({ theme, $ongoing }) =>
    $ongoing ? '#10b981' : ledgerAccent(theme.mode)};
`

const ContinuityDurLabel = styled.span<{ $ongoing?: boolean }>`
  ${DIGIT_DISPLAY}
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme, $ongoing }) =>
    $ongoing ? '#10b981' : theme.colors.text.secondary};
  white-space: nowrap;
`

const ReshuffleSiblingBar = styled.nav`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
`

const ReshuffleBarLabel = styled.span`
  font-size: 11.5px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.secondary};
  flex-shrink: 0;
`

const ReshufflePillRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const ReshufflePillLink = styled(Link)<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? ledgerAccentBorder(theme.mode)
        : ledgerHairlineStrong(theme.mode)};
  background: ${({ $active, theme }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  font-size: 12px;
  text-decoration: none;

  strong {
    ${DIGIT_DISPLAY}
    font-weight: 800;
  }

  small {
    ${DIGIT_DISPLAY}
    font-size: 11px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

/* ─── 2-Column Body & Sticky Context Rail ─── */

const DetailBodyGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  align-items: start;
  gap: 20px;

  @media (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const DetailMainColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-width: 0;
`

const DetailContextRail = styled.aside`
  position: sticky;
  top: 84px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  @media (max-width: 960px) {
    position: static;
  }
`

const FactsCard = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  overflow: hidden;
`

const FactsCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 11px 14px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  font-size: 12px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ContextSystemHero = styled.div`
  padding: 12px 14px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const ContextSystemTitle = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ContextSystemPeriod = styled.div`
  ${DIGIT_DISPLAY}
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const ContextSystemDesc = styled.div`
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ContextEmptyBox = styled.div`
  padding: 14px;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SovereignContextBody = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px 14px;
`

const SovereignTextCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`

const SovereignNameBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 13.5px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
  }
`

const SovereignMetaText = styled.div`
  ${DIGIT_DISPLAY}
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EraBadgeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 2px;
`

const EraChip = styled.span`
  padding: 1px 6px;
  border-radius: ${RADIUS.XS};
  font-size: 10.5px;
  font-weight: 700;
  background: rgba(245, 158, 11, 0.14);
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#b45309')};
`

const PortfolioPartyBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
`

const PartyStackedBar = styled.div`
  display: flex;
  width: 100%;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  gap: 2px;
`

const PartyStackedSegment = styled.span<{ $color: string; $flex: number }>`
  flex: ${({ $flex }) => $flex};
  background: ${({ $color }) => $color};
  min-width: 6px;
`

const PartyBreakdownList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const PartyBreakdownRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.primary};

  strong {
    ${DIGIT_DISPLAY}
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const PartyBreakdownLeft = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const FactsList = styled.dl`
  margin: 0;
  display: flex;
  flex-direction: column;
`

const FactRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 14px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  &:last-child {
    border-bottom: none;
  }
`

const FactKey = styled.dt`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
`

const FactVal = styled.dd<{ $mono?: boolean }>`
  ${({ $mono }) => ($mono ? DIGIT_DISPLAY : '')}
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: right;
  min-width: 0;
`

const FactsFooterLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;

  &:hover {
    filter: brightness(0.97);
  }
`

const SectionBlock = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
`

const SectionHeaderRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const ViewModeToggle = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
`

const ViewModeBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  border: none;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active ? ledgerSurface(theme.mode) : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
`

const SmallAddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
`

const SectionTitle = styled.h2`
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 14.5px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SectionCount = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EventLinkChip = styled(Link)`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  text-decoration: none;
`

const PeerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 10px;
`

const PeerCard = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  text-decoration: none;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const TreatyCardWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 10px 12px 14px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const TreatyCardMainLink = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
  text-decoration: none;
`

const PartyColorDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const PeerTitle = styled.div`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const PeerMeta = styled.div`
  ${DIGIT_DISPLAY}
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MinisterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 12px;
`

const DepartmentMinisterCard = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  overflow: hidden;
`

const DeptCardHeader = styled.div`
  padding: 9px 14px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
`

const DeptTitleLink = styled(Link)`
  font-size: 12.5px;
  font-weight: 800;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  text-decoration: none;
`

const DeptTitlePlain = styled.span`
  font-size: 12.5px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const MinisterList = styled.div`
  display: flex;
  flex-direction: column;
`

const MinisterItemRow = styled.div`
  display: flex;
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const MinisterRow = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  padding: 10px 8px 10px 14px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
`

const MinisterRowActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding-right: 8px;
`

const MinisterEditBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: ${RADIUS.XS};
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

const MiniAvatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`

const MiniAvatarFallback = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const MinisterTexts = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const MinisterNameLine = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const MinisterName = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ActingPill = styled.span`
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  background: rgba(245, 158, 11, 0.14);
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#b45309')};
`

const MinisterRole = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const InlineAchievementForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
`

const InlineFormInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
`

const InlineFormTextarea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;
  resize: vertical;
`

const InlineFormBtnRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

const AchievementList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const AchievementCard = styled.div`
  padding: 12px 14px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
`

const AchievementHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`

const AchievementTitle = styled.div`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const AchievementBodyBox = styled.div`
  margin-top: 6px;
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CompactEmptyHint = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-radius: ${RADIUS.MD};
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const FillInStrip = styled.section`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px 15px;
  border-radius: ${RADIUS.MD};
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.015)' : '#f8fafc'};
`

const FillInLabel = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const FillInActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const FillInBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const EmptyCard = styled.div`
  padding: 28px 18px;
  text-align: center;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
