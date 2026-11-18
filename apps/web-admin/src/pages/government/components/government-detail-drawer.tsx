import React, { useMemo } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiAlertCircle,
  FiArrowUpRight,
  FiCalendar,
  FiChevronDown,
  FiChevronUp,
  FiColumns,
  FiEdit2,
  FiExternalLink,
  FiFileText,
  FiFlag,
  FiGitCommit,
  FiLayers,
  FiLink2,
  FiPlus,
  FiRefreshCw,
  FiShare2,
  FiShield,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

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
  administrationDepartmentApi,
  type AdministrationDepartment,
  DEPARTMENT_KIND_LABEL,
  EVENT_DEPARTMENT_ROLE_LABEL,
  type EventDepartmentRoleValue,
} from '@/shared/api/administration-department'
import {
  CABINET_EVENT_ROLE_LABELS,
  type CabinetEventRole,
  listEventsForCabinet,
} from '@/shared/api/cabinet-events'
import { getCabinetPoliticalParties } from '@/shared/api/election'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import {
  type CabinetListItemDto,
  type GovernmentCabinetTenureItem,
  personCareerApi,
} from '@/shared/api/person-career'
import { treatyApi } from '@/shared/api/treaty'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import {
  DEPARTMENT_LIFECYCLE_LABEL,
  parseDepartmentDescription,
  resolveDepartmentLifecycleStatus,
} from '@/shared/lib/ministry-department/ministry-department-utils'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { HeadquartersMapPreview } from '@/shared/ui/headquarters-location-field'
import { notify } from '@/shared/ui/toast'
import {
  APPOINTMENT_METHOD_LABEL,
  END_REASON_LABEL,
  labelCabinetPartyRole,
} from '@/widgets/country/country-detail/ui/cabinets-section.helpers'
import type { CountryInlineModalTarget } from '@/widgets/country/country-inline-modal/country-inline-modal'

import {
  formatIsoShortPeriod,
  type GovernmentCatalogTab,
  resolveCabinetDisplayTitle,
  resolveCabinetEffectiveDates,
  resolveCabinetHeadName,
  resolveCabinetPolityInfo,
  resolveCabinetPositionTitle,
  resolveDepartmentPolityInfo,
} from '../government-helpers'

function stripHtmlText(rawHtml: string | null | undefined): string {
  if (!rawHtml) return ''
  return rawHtml
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface GovernmentDetailDrawerProps {
  activeTab: GovernmentCatalogTab
  selectedCabinetId: string | null
  selectedDepartmentId: string | null
  listSearch: string
  hasPrev: boolean
  hasNext: boolean
  isOutOfScope?: boolean
  onResetFilters?: () => void
  onStepPrev: () => void
  onStepNext: () => void
  onClose: () => void
  onOpenPersonModal: (personId: string) => void
  onOpenCountryModal: (target: CountryInlineModalTarget) => void
  onEditCabinet: (cabinet: CabinetListItemDto) => void
  onAppointCabinetMinister: (cabinet: CabinetListItemDto) => void
  onEditDepartment: (department: AdministrationDepartment) => void
  onAppointDepartmentMember: (department: AdministrationDepartment) => void
  onSelectCabinetInCatalog: (cabinetId: string) => void
  onSelectDepartmentInCatalog: (departmentId: string) => void
}

export const GovernmentDetailDrawer: React.FC<GovernmentDetailDrawerProps> = ({
  activeTab,
  selectedCabinetId,
  selectedDepartmentId,
  listSearch,
  hasPrev,
  hasNext,
  isOutOfScope = false,
  onResetFilters,
  onStepPrev,
  onStepNext,
  onClose,
  onOpenPersonModal,
  onOpenCountryModal,
  onEditCabinet,
  onAppointCabinetMinister,
  onEditDepartment,
  onAppointDepartmentMember,
  onSelectCabinetInCatalog,
  onSelectDepartmentInCatalog,
}) => {
  const queryClient = useQueryClient()
  const isCabinetMode = activeTab === 'cabinets'

  // ─── Cabinet Drawer Queries ──────────────────────────────────────────
  const cabinetQuery = useQuery({
    queryKey: ['global-cabinet-detail', selectedCabinetId],
    queryFn: () => personCareerApi.getCabinetById(selectedCabinetId!),
    enabled: isCabinetMode && Boolean(selectedCabinetId),
    staleTime: 45_000,
  })

  const ministersQuery = useQuery({
    queryKey: ['cabinet-tenures', selectedCabinetId],
    queryFn: () => personCareerApi.getTenuresByCabinetId(selectedCabinetId!),
    enabled: isCabinetMode && Boolean(selectedCabinetId),
    staleTime: 45_000,
  })

  const suggestedMinistersQuery = useQuery({
    queryKey: ['cabinet-suggested-members', selectedCabinetId],
    queryFn: () =>
      personCareerApi.getSuggestedCabinetMembers(selectedCabinetId!),
    enabled: isCabinetMode && Boolean(selectedCabinetId),
    staleTime: 30_000,
  })

  const partiesQuery = useQuery({
    queryKey: ['cabinet-political-parties', selectedCabinetId],
    queryFn: () => getCabinetPoliticalParties(selectedCabinetId!),
    enabled: isCabinetMode && Boolean(selectedCabinetId),
    staleTime: 60_000,
  })

  const cabinetEventsQuery = useQuery({
    queryKey: ['cabinet-linked-events', selectedCabinetId],
    queryFn: () => listEventsForCabinet(selectedCabinetId!),
    enabled: isCabinetMode && Boolean(selectedCabinetId),
    staleTime: 60_000,
  })

  const treatiesQuery = useQuery({
    queryKey: ['treaties-by-cabinet', selectedCabinetId],
    queryFn: () => treatyApi.getAll({ cabinetId: selectedCabinetId! }),
    enabled: isCabinetMode && Boolean(selectedCabinetId),
    staleTime: 60_000,
  })

  // ─── Department Drawer Queries ───────────────────────────────────────
  const deptQuery = useQuery({
    queryKey: ['global-department-detail', selectedDepartmentId],
    queryFn: () => administrationDepartmentApi.getById(selectedDepartmentId!),
    enabled: !isCabinetMode && Boolean(selectedDepartmentId),
    staleTime: 45_000,
  })

  const deptTenuresQuery = useQuery({
    queryKey: ['administration-department-tenures', selectedDepartmentId],
    queryFn: () =>
      administrationDepartmentApi.getTenuresByDepartmentId(
        selectedDepartmentId!,
      ),
    enabled: !isCabinetMode && Boolean(selectedDepartmentId),
    staleTime: 45_000,
  })

  const deptEventsQuery = useQuery({
    queryKey: ['administration-department-events', selectedDepartmentId],
    queryFn: () =>
      administrationDepartmentApi.getDepartmentEvents(selectedDepartmentId!),
    enabled: !isCabinetMode && Boolean(selectedDepartmentId),
    staleTime: 60_000,
  })

  const attachSuggestedMutation = useMutation({
    mutationFn: async () => {
      const suggestions = suggestedMinistersQuery.data ?? []
      if (!selectedCabinetId || suggestions.length === 0) return
      await personCareerApi.attachCabinetMembers(
        selectedCabinetId,
        suggestions.map((candItem) => ({
          tenureId: candItem.tenureId,
          administrationDepartmentId:
            candItem.administrationDepartment?.id ?? null,
          roleTitle:
            candItem.title ?? candItem.positionDefinition?.title ?? null,
        })),
      )
    },
    onSuccess: () => {
      const cab = cabinetQuery.data
      invalidateTenureQueries(queryClient, {
        cabinetId: selectedCabinetId,
        countryId: cab?.countryId ?? cab?.headTenure?.countryId ?? null,
        historicalCountryId:
          cab?.historicalCountryId ??
          cab?.headTenure?.historicalCountryId ??
          null,
      })
      void queryClient.invalidateQueries({ queryKey: ['global-cabinets'] })
      void queryClient.invalidateQueries({
        queryKey: ['cabinet-suggested-members', selectedCabinetId],
      })
      notify.success('동시대 기등록 부처 인사가 각료진에 일괄 편입되었습니다.')
    },
    onError: (mutationError) => {
      notify.error(getApiErrorMessage(mutationError))
    },
  })

  const detachMemberMutation = useMutation({
    mutationFn: async (tenureId: string) => {
      if (!selectedCabinetId) return
      await personCareerApi.detachCabinetMember(selectedCabinetId, tenureId)
    },
    onSuccess: () => {
      const cab = cabinetQuery.data
      invalidateTenureQueries(queryClient, {
        cabinetId: selectedCabinetId,
        countryId: cab?.countryId ?? cab?.headTenure?.countryId ?? null,
        historicalCountryId:
          cab?.historicalCountryId ??
          cab?.headTenure?.historicalCountryId ??
          null,
      })
      void queryClient.invalidateQueries({ queryKey: ['global-cabinets'] })
      void queryClient.invalidateQueries({
        queryKey: ['cabinet-suggested-members', selectedCabinetId],
      })
      notify.success('내각 편입이 해제되었습니다. 인물 재임 기록은 유지됩니다.')
    },
    onError: (mutationError) => {
      notify.error(getApiErrorMessage(mutationError))
    },
  })

  const groupedMinisters = useMemo(() => {
    const rawMinisters = (ministersQuery.data ?? []) as GovernmentCabinetTenureItem[]
    const headTenureId = cabinetQuery.data?.headTenure?.id ?? null
    const nonHead = rawMinisters.filter(
      (tenureRow) => tenureRow.id !== headTenureId,
    )
    const buckets = new Map<
      string,
      {
        key: string
        departmentName: string
        departmentId: string | null
        items: GovernmentCabinetTenureItem[]
      }
    >()
    for (const ministerRow of nonHead) {
      const deptId =
        ministerRow.administrationDepartmentId ??
        ministerRow.administrationDepartment?.id ??
        null
      const deptName =
        ministerRow.administrationDepartment?.name ?? '무임소 · 부처 미지정'
      const bucketKey = deptId ?? '__unassigned__'
      const existing = buckets.get(bucketKey)
      if (existing) {
        existing.items.push(ministerRow)
      } else {
        buckets.set(bucketKey, {
          key: bucketKey,
          departmentName: deptName,
          departmentId: deptId,
          items: [ministerRow],
        })
      }
    }
    return [...buckets.values()]
  }, [ministersQuery.data, cabinetQuery.data?.headTenure?.id])

  if (isCabinetMode && !selectedCabinetId) return null
  if (!isCabinetMode && !selectedDepartmentId) return null

  const handleShare = async () => {
    const detailPath =
      isCabinetMode && selectedCabinetId
        ? pathKeys.government.cabinetDetail(selectedCabinetId)
        : !isCabinetMode && selectedDepartmentId
          ? pathKeys.government.departmentDetail(selectedDepartmentId)
          : null
    if (!detailPath) return
    const url = `${window.location.origin}${detailPath}`
    const title = isCabinetMode
      ? cabinetQuery.data
        ? resolveCabinetDisplayTitle(cabinetQuery.data)
        : '내각 상세'
      : (deptQuery.data?.name ?? '국가 기관 상세')

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url })
        return
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      notify.success('상세 지면 링크가 복사되었습니다')
    } catch {
      notify.error('링크 복사에 실패했습니다')
    }
  }

  return (
    <DrawerShell aria-label="선택 항목 상세 패널">
      <DrawerToolbar>
        <StepGroup>
          <IconBtn
            type="button"
            disabled={!hasPrev}
            onClick={onStepPrev}
            title="이전 항목 (↑)"
            aria-label="이전 항목"
          >
            <FiChevronUp size={15} />
          </IconBtn>
          <IconBtn
            type="button"
            disabled={!hasNext}
            onClick={onStepNext}
            title="다음 항목 (↓)"
            aria-label="다음 항목"
          >
            <FiChevronDown size={15} />
          </IconBtn>
          <ShortcutHint>↑↓ 이동 · Esc 닫기</ShortcutHint>
        </StepGroup>

        <ActionGroup>
          <IconBtn
            type="button"
            onClick={() => void handleShare()}
            title="상세 지면 링크 공유/복사"
            aria-label="상세 지면 링크 공유"
          >
            <FiShare2 size={13.5} />
          </IconBtn>
          {isCabinetMode && selectedCabinetId ? (
            <OpenPageLink
              to={pathKeys.government.cabinetDetail(selectedCabinetId)}
              state={{ governmentListSearch: listSearch }}
            >
              <span>상세 지면</span>
              <FiArrowUpRight size={13} />
            </OpenPageLink>
          ) : null}
          {!isCabinetMode && selectedDepartmentId ? (
            <OpenPageLink
              to={pathKeys.government.departmentDetail(selectedDepartmentId)}
              state={{ governmentListSearch: listSearch }}
            >
              <span>상세 지면</span>
              <FiArrowUpRight size={13} />
            </OpenPageLink>
          ) : null}
          <IconBtn
            type="button"
            onClick={onClose}
            title="패널 닫기 (Esc)"
            aria-label="패널 닫기"
          >
            <FiX size={16} />
          </IconBtn>
        </ActionGroup>
      </DrawerToolbar>

      {isOutOfScope ? (
        <OutOfScopeBanner role="status">
          <OutOfScopeText>
            <FiAlertCircle size={13} aria-hidden="true" />
            <span>현재 목록 필터 조건 밖의 항목입니다</span>
          </OutOfScopeText>
          {onResetFilters ? (
            <OutOfScopeResetBtn type="button" onClick={onResetFilters}>
              필터 초기화
            </OutOfScopeResetBtn>
          ) : null}
        </OutOfScopeBanner>
      ) : null}

      <DrawerScroll>
        {isCabinetMode ? (
          cabinetQuery.isLoading ? (
            <DrawerLoading>내각 상세 정보를 불러오는 중…</DrawerLoading>
          ) : !cabinetQuery.data ? (
            <DrawerLoading>내각 정보를 찾을 수 없습니다.</DrawerLoading>
          ) : (
            (() => {
              const cabinet = cabinetQuery.data
              const polity = resolveCabinetPolityInfo(cabinet)
              const effectiveDates = resolveCabinetEffectiveDates(cabinet)
              const periodLabel = formatIsoShortPeriod(
                effectiveDates.startDate,
                effectiveDates.endDate,
                effectiveDates.isOngoing,
              )
              const displayTitle = resolveCabinetDisplayTitle(cabinet)
              const headName = resolveCabinetHeadName(cabinet)
              const posTitle = resolveCabinetPositionTitle(cabinet)
              const headPersonId = cabinet.headTenure?.person?.id ?? null
              const headAvatarUrl = cabinet.headTenure?.person?.profileImageUrl
                ? getUploadImageUrl(cabinet.headTenure.person.profileImageUrl)
                : null
              const appointmentMethodLabel = cabinet.headTenure
                ?.appointmentMethod
                ? (APPOINTMENT_METHOD_LABEL[
                    cabinet.headTenure.appointmentMethod
                  ] ?? cabinet.headTenure.appointmentMethod)
                : null
              const endReasonLabel = cabinet.headTenure?.endReason
                ? (END_REASON_LABEL[cabinet.headTenure.endReason] ??
                  cabinet.headTenure.endReason)
                : null
              const partyLinks = partiesQuery.data ?? []
              const suggestedList = suggestedMinistersQuery.data ?? []
              const cabinetEvents = cabinetEventsQuery.data ?? []
              const treaties = treatiesQuery.data?.items ?? []
              const achievements = cabinet.headTenure?.achievements ?? []
              const ministerTotal = groupedMinisters.reduce(
                (accCount, groupItem) => accCount + groupItem.items.length,
                0,
              )

              return (
                <>
                  <HeroBlock>
                    <MetaTopRow>
                      <PolityButton
                        type="button"
                        $historical={polity.isHistorical}
                        onClick={() => {
                          if (polity.historicalCountryId) {
                            onOpenCountryModal({
                              kind: 'historical',
                              id: polity.historicalCountryId,
                              name: polity.polityName,
                            })
                          } else if (polity.modernCountryId) {
                            onOpenCountryModal({
                              kind: 'modern',
                              id: polity.modernCountryId,
                              name: polity.polityName,
                            })
                          }
                        }}
                      >
                        {polity.flagEmoji ? (
                          <span>{polity.flagEmoji}</span>
                        ) : null}
                        <span>{polity.polityName}</span>
                      </PolityButton>
                      <PeriodTag>
                        <FiCalendar size={11} />
                        <span>{periodLabel}</span>
                      </PeriodTag>
                    </MetaTopRow>

                    <HeroPersonRow>
                      {headAvatarUrl ? (
                        <AvatarImg src={headAvatarUrl} alt={headName} />
                      ) : (
                        <AvatarFallback>{headName.slice(0, 1)}</AvatarFallback>
                      )}
                      <HeroTitles>
                        <DrawerTitle>{displayTitle}</DrawerTitle>
                        <SubPersonLine>
                          {headPersonId ? (
                            <InlineLinkBtn
                              type="button"
                              onClick={() => onOpenPersonModal(headPersonId)}
                            >
                              <FiUser size={11} />
                              <span>{headName}</span>
                            </InlineLinkBtn>
                          ) : (
                            <span>{headName}</span>
                          )}
                          {posTitle ? <span>· {posTitle}</span> : null}
                        </SubPersonLine>
                      </HeroTitles>
                    </HeroPersonRow>

                    {(appointmentMethodLabel || endReasonLabel) && (
                      <TagWrapRow>
                        {appointmentMethodLabel ? (
                          <SubtleMetaTag>
                            취임: {appointmentMethodLabel}
                          </SubtleMetaTag>
                        ) : null}
                        {endReasonLabel ? (
                          <SubtleMetaTag>종료: {endReasonLabel}</SubtleMetaTag>
                        ) : null}
                      </TagWrapRow>
                    )}

                    {cabinet.description ? (
                      <ProseText>{stripHtmlText(cabinet.description)}</ProseText>
                    ) : null}

                    <QuickActionRow>
                      <PrimaryActionBtn
                        type="button"
                        onClick={() => onAppointCabinetMinister(cabinet)}
                      >
                        <FiPlus size={13} />
                        <span>각료 임명</span>
                      </PrimaryActionBtn>
                      <SecondaryActionBtn
                        type="button"
                        onClick={() => onEditCabinet(cabinet)}
                      >
                        <FiEdit2 size={12} />
                        <span>내각·수반 수정</span>
                      </SecondaryActionBtn>
                      {polity.countryGovernmentUrl ? (
                        <CountryTabLink to={polity.countryGovernmentUrl}>
                          <span>국가 행정 탭</span>
                          <FiExternalLink size={11} />
                        </CountryTabLink>
                      ) : null}
                    </QuickActionRow>
                  </HeroBlock>

                  {suggestedList.length > 0 ? (
                    <SuggestBanner>
                      <div>
                        <FiRefreshCw size={13} />
                        <span>
                          동시대 부처 재임 인사{' '}
                          <strong>{suggestedList.length}명</strong> 발견
                        </span>
                      </div>
                      <SuggestAttachBtn
                        type="button"
                        disabled={attachSuggestedMutation.isPending}
                        onClick={() => attachSuggestedMutation.mutate()}
                      >
                        {attachSuggestedMutation.isPending
                          ? '편입 중…'
                          : '일괄 편입'}
                      </SuggestAttachBtn>
                    </SuggestBanner>
                  ) : null}

                  {partyLinks.length > 0 ? (
                    <DrawerSection>
                      <DrawerSectionHeader>
                        <DrawerSectionTitle>
                          <FiFlag size={13} />
                          <span>집권 · 연정 정당</span>
                        </DrawerSectionTitle>
                        <SectionCount>{partyLinks.length}</SectionCount>
                      </DrawerSectionHeader>
                      <TagWrapRow>
                        {partyLinks.map((partyLinkItem) => (
                          <PartyPill key={partyLinkItem.id}>
                            <strong>
                              {labelCabinetPartyRole(partyLinkItem.role)}
                            </strong>
                            <span>
                              {partyLinkItem.party?.shortName ||
                                partyLinkItem.party?.name ||
                                '정당'}
                            </span>
                          </PartyPill>
                        ))}
                      </TagWrapRow>
                    </DrawerSection>
                  ) : null}

                  <DrawerSection>
                    <DrawerSectionHeader>
                      <DrawerSectionTitle>
                        <FiUsers size={13} />
                        <span>소속 각료 진용</span>
                      </DrawerSectionTitle>
                      <SectionCount>{ministerTotal}명</SectionCount>
                    </DrawerSectionHeader>

                    {ministersQuery.isLoading ? (
                      <EmptyHint>각료 목록을 불러오는 중…</EmptyHint>
                    ) : groupedMinisters.length === 0 ? (
                      <EmptyHint>
                        등록된 각료가 없습니다. 상단 [각료 임명]으로 바로 추가할 수
                        있습니다.
                      </EmptyHint>
                    ) : (
                      <CompactGroupList>
                        {groupedMinisters.map((groupItem) => (
                          <CompactGroupCard key={groupItem.key}>
                            <CompactGroupHead>
                              {groupItem.departmentId ? (
                                <DeptJumpBtn
                                  type="button"
                                  onClick={() =>
                                    onSelectDepartmentInCatalog(
                                      groupItem.departmentId!,
                                    )
                                  }
                                >
                                  {groupItem.departmentName} →
                                </DeptJumpBtn>
                              ) : (
                                <span>{groupItem.departmentName}</span>
                              )}
                            </CompactGroupHead>
                            {groupItem.items.map((ministerRow) => {
                              const ministerName = ministerRow.person
                                ? getPersonDisplayName({
                                    ...ministerRow.person,
                                    name: ministerRow.person.name ?? '',
                                  })
                                : '인물 미상'
                              const roleText =
                                ministerRow.title ??
                                ministerRow.positionDefinition?.title ??
                                '각료'
                              const ministerPersonId =
                                ministerRow.person?.id ?? null
                              return (
                                <TenureCompactItem key={ministerRow.id}>
                                  <CompactPersonRow
                                    type="button"
                                    onClick={() => {
                                      if (ministerPersonId) {
                                        onOpenPersonModal(ministerPersonId)
                                      }
                                    }}
                                  >
                                    <strong>
                                      {ministerName}
                                      {ministerRow.isActing ? (
                                        <ActingBadge>직무대행</ActingBadge>
                                      ) : null}
                                    </strong>
                                    <span>
                                      {roleText} ·{' '}
                                      {formatIsoShortPeriod(
                                        ministerRow.startDate,
                                        ministerRow.endDate,
                                        false,
                                      )}
                                    </span>
                                  </CompactPersonRow>
                                  <DetachMiniBtn
                                    type="button"
                                    disabled={detachMemberMutation.isPending}
                                    title="내각 편입 해제 (인물 재임 이력은 유지)"
                                    aria-label={`${ministerName} 내각 편입 해제`}
                                    onClick={async (clickEvent) => {
                                      clickEvent.stopPropagation()
                                      const ok = await confirm({
                                        title: '각료 편입 해제',
                                        message: `${ministerName} 인사를 이 내각에서 편입 해제할까요? 인물의 부처 재임 이력은 삭제되지 않고 그대로 남습니다.`,
                                        confirmLabel: '편입 해제',
                                        cancelLabel: '취소',
                                        danger: true,
                                      })
                                      if (!ok) return
                                      detachMemberMutation.mutate(
                                        ministerRow.id,
                                      )
                                    }}
                                  >
                                    <FiX size={13} />
                                  </DetachMiniBtn>
                                </TenureCompactItem>
                              )
                            })}
                          </CompactGroupCard>
                        ))}
                      </CompactGroupList>
                    )}
                  </DrawerSection>

                  {cabinet.linkageGroup?.event ||
                  cabinet.linkageGroup?.label ? (
                    <DrawerSection>
                      <DrawerSectionHeader>
                        <DrawerSectionTitle>
                          <FiLink2 size={13} />
                          <span>국제 사건 동시대 연계</span>
                        </DrawerSectionTitle>
                      </DrawerSectionHeader>
                      {cabinet.linkageGroup.event ? (
                        <EventCardLink
                          to={`/events/${cabinet.linkageGroup.event.id}`}
                        >
                          <span>
                            {cabinet.linkageGroup.label ||
                              cabinet.linkageGroup.event.title}
                          </span>
                          <FiArrowUpRight size={13} />
                        </EventCardLink>
                      ) : (
                        <StaticCard>
                          <strong>{cabinet.linkageGroup.label}</strong>
                        </StaticCard>
                      )}
                    </DrawerSection>
                  ) : null}

                  {cabinetEvents.length > 0 ? (
                    <DrawerSection>
                      <DrawerSectionHeader>
                        <DrawerSectionTitle>
                          <FiLayers size={13} />
                          <span>관여 역사 사건</span>
                        </DrawerSectionTitle>
                        <SectionCount>{cabinetEvents.length}</SectionCount>
                      </DrawerSectionHeader>
                      <LinkStack>
                        {cabinetEvents.map((eventItem) => {
                          const eventObj = eventItem.event as
                            | { id?: string; title?: string }
                            | undefined
                          const eventId = eventObj?.id ?? eventItem.eventId
                          const roleLabel = eventItem.role
                            ? (CABINET_EVENT_ROLE_LABELS[
                                eventItem.role as CabinetEventRole
                              ] ?? eventItem.role)
                            : '관련'
                          return (
                            <EventCardLink
                              key={eventItem.id}
                              to={`/events/${eventId}`}
                            >
                              <div>
                                <SmallBadge>{roleLabel}</SmallBadge>
                                <span>
                                  {eventObj?.title ?? '사건 상세 보기'}
                                </span>
                              </div>
                              <FiArrowUpRight size={13} />
                            </EventCardLink>
                          )
                        })}
                      </LinkStack>
                    </DrawerSection>
                  ) : null}

                  {treaties.length > 0 ? (
                    <DrawerSection>
                      <DrawerSectionHeader>
                        <DrawerSectionTitle>
                          <FiFileText size={13} />
                          <span>체결 조약</span>
                        </DrawerSectionTitle>
                        <SectionCount>{treaties.length}</SectionCount>
                      </DrawerSectionHeader>
                      <LinkStack>
                        {treaties.map((treatyItem) => (
                          <EventCardLink
                            key={treatyItem.id}
                            to={pathKeys.treaties.detail(treatyItem.id)}
                          >
                            <span>{treatyItem.name}</span>
                            <FiArrowUpRight size={13} />
                          </EventCardLink>
                        ))}
                      </LinkStack>
                    </DrawerSection>
                  ) : null}

                  {achievements.length > 0 ? (
                    <DrawerSection>
                      <DrawerSectionHeader>
                        <DrawerSectionTitle>
                          <span>주요 정책 · 업적</span>
                        </DrawerSectionTitle>
                        <SectionCount>{achievements.length}</SectionCount>
                      </DrawerSectionHeader>
                      <LinkStack>
                        {achievements.slice(0, 6).map((achItem) => (
                          <StaticCard key={achItem.id}>
                            <strong>{achItem.title}</strong>
                            {achItem.description ? (
                              <p>{stripHtmlText(achItem.description)}</p>
                            ) : null}
                          </StaticCard>
                        ))}
                      </LinkStack>
                    </DrawerSection>
                  ) : null}
                </>
              )
            })()
          )
        ) : deptQuery.isLoading ? (
          <DrawerLoading>기관 상세 정보를 불러오는 중…</DrawerLoading>
        ) : !deptQuery.data ? (
          <DrawerLoading>기관 정보를 찾을 수 없습니다.</DrawerLoading>
        ) : (
          (() => {
            const dept = deptQuery.data
            const polity = resolveDepartmentPolityInfo(dept)
            const lifecycleStatus = resolveDepartmentLifecycleStatus(dept)
            const isOngoingDept = lifecycleStatus === 'ACTIVE'
            const periodLabel = formatIsoShortPeriod(
              dept.establishedDate,
              dept.abolishedDate,
              isOngoingDept,
            )
            const parsedDesc = parseDepartmentDescription(dept.description)
            const effectiveHq =
              dept.headquarters?.trim() ||
              parsedDesc.defense?.headquarters?.trim() ||
              null
            const effectiveMission =
              dept.primaryMission?.trim() ||
              parsedDesc.defense?.missionScope?.trim() ||
              null
            const cleanOverview = parsedDesc.cleanDescription?.trim() || null
            const logoUrl = dept.thumbnailUrl
              ? getUploadImageUrl(dept.thumbnailUrl)
              : null
            const tenures = deptTenuresQuery.data ?? []
            const deptEvents = deptEventsQuery.data ?? []
            const hasLineage =
              Boolean(dept.parent) ||
              dept.children.length > 0 ||
              dept.predecessors.length > 0 ||
              dept.successors.length > 0 ||
              (dept.militaryUnitSuccessors?.length ?? 0) > 0 ||
              dept.militaryUnits.length > 0

            return (
              <>
                <HeroBlock>
                  <MetaTopRow>
                    <TagWrapRow>
                      <PolityButton
                        type="button"
                        $historical={polity.isHistorical}
                        onClick={() => {
                          if (polity.historicalCountryId) {
                            onOpenCountryModal({
                              kind: 'historical',
                              id: polity.historicalCountryId,
                              name: polity.polityName,
                            })
                          } else if (polity.modernCountryId) {
                            onOpenCountryModal({
                              kind: 'modern',
                              id: polity.modernCountryId,
                              name: polity.polityName,
                            })
                          }
                        }}
                      >
                        {polity.flagEmoji ? (
                          <span>{polity.flagEmoji}</span>
                        ) : null}
                        <span>{polity.polityName}</span>
                      </PolityButton>
                      {dept.category ? (
                        <SmallBadge>{dept.category.name}</SmallBadge>
                      ) : null}
                      <SubtleMetaTag>
                        {DEPARTMENT_KIND_LABEL[dept.kind] ?? dept.kind}
                      </SubtleMetaTag>
                      {!isOngoingDept ? (
                        <SubtleMetaTag>
                          {DEPARTMENT_LIFECYCLE_LABEL[lifecycleStatus]}
                        </SubtleMetaTag>
                      ) : null}
                    </TagWrapRow>
                    <PeriodTag>
                      <FiCalendar size={11} />
                      <span>{periodLabel}</span>
                    </PeriodTag>
                  </MetaTopRow>

                  <HeroPersonRow>
                    {logoUrl ? (
                      <DeptLogoImg src={logoUrl} alt={dept.name} />
                    ) : (
                      <AvatarFallback>
                        <FiColumns size={16} />
                      </AvatarFallback>
                    )}
                    <HeroTitles>
                      <DrawerTitle>{dept.name}</DrawerTitle>
                      {(dept.abbreviation || dept.nameLocal || dept.nameEn) && (
                        <SubPersonLine>
                          {[
                            dept.abbreviation ? `[${dept.abbreviation}]` : null,
                            dept.nameLocal,
                            dept.nameEn,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </SubPersonLine>
                      )}
                    </HeroTitles>
                  </HeroPersonRow>

                  {effectiveHq ||
                  (dept.headquartersLatitude != null &&
                    dept.headquartersLongitude != null) ? (
                    <HeadquartersMapPreview
                      showHeadline
                      headquarters={effectiveHq}
                      latitude={dept.headquartersLatitude}
                      longitude={dept.headquartersLongitude}
                      countryName={polity.polityName}
                      departmentName={dept.name}
                      mapHeight={196}
                    />
                  ) : null}

                  {effectiveMission ? (
                    <ProseText>{effectiveMission}</ProseText>
                  ) : null}
                  {cleanOverview && cleanOverview !== effectiveMission ? (
                    <ProseText>{cleanOverview}</ProseText>
                  ) : null}

                  <QuickActionRow>
                    <PrimaryActionBtn
                      type="button"
                      onClick={() => onAppointDepartmentMember(dept)}
                    >
                      <FiPlus size={13} />
                      <span>수장·인사 임명</span>
                    </PrimaryActionBtn>
                    <SecondaryActionBtn
                      type="button"
                      onClick={() => onEditDepartment(dept)}
                    >
                      <FiEdit2 size={12} />
                      <span>기관 수정</span>
                    </SecondaryActionBtn>
                    {polity.countryGovernmentUrl ? (
                      <CountryTabLink to={polity.countryGovernmentUrl}>
                        <span>국가 행정 탭</span>
                        <FiExternalLink size={11} />
                      </CountryTabLink>
                    ) : null}
                  </QuickActionRow>
                </HeroBlock>

                {hasLineage ? (
                  <DrawerSection>
                    <DrawerSectionHeader>
                      <DrawerSectionTitle>
                        <FiGitCommit size={13} />
                        <span>
                          편제 · 전후 계보
                          {dept.militaryUnits.length > 0
                            ? ' · 산하 군부대'
                            : ''}
                        </span>
                      </DrawerSectionTitle>
                    </DrawerSectionHeader>
                    <TagWrapRow>
                      {dept.parent ? (
                        <LineageJumpChip
                          type="button"
                          onClick={() =>
                            onSelectDepartmentInCatalog(dept.parent!.id)
                          }
                        >
                          상위: {dept.parent.name}
                        </LineageJumpChip>
                      ) : null}
                      {dept.children.map((childDept) => (
                        <LineageJumpChip
                          key={childDept.id}
                          type="button"
                          onClick={() =>
                            onSelectDepartmentInCatalog(childDept.id)
                          }
                        >
                          산하: {childDept.name}
                        </LineageJumpChip>
                      ))}
                      {dept.predecessors.map((predItem) => (
                        <LineageJumpChip
                          key={predItem.transitionId}
                          type="button"
                          onClick={() =>
                            onSelectDepartmentInCatalog(predItem.department.id)
                          }
                        >
                          ← 전신: {predItem.department.name}
                        </LineageJumpChip>
                      ))}
                      {dept.successors.map((succItem) => (
                        <LineageJumpChip
                          key={succItem.transitionId}
                          type="button"
                          onClick={() =>
                            onSelectDepartmentInCatalog(succItem.department.id)
                          }
                        >
                          후신: {succItem.department.name} →
                        </LineageJumpChip>
                      ))}
                      {(dept.militaryUnitSuccessors ?? []).map((milSucc) => (
                        <EventCardLink
                          key={milSucc.transitionId}
                          to={pathKeys.militaryUnitDetail(
                            milSucc.militaryUnit.id,
                          )}
                        >
                          <div>
                            <FiShield size={11} />
                            <span>군조직 이관: {milSucc.militaryUnit.name}</span>
                          </div>
                          <FiArrowUpRight size={12} />
                        </EventCardLink>
                      ))}
                      {dept.militaryUnits.map((unitItem) => (
                        <EventCardLink
                          key={unitItem.id}
                          to={pathKeys.militaryUnitDetail(unitItem.id)}
                        >
                          <div>
                            <FiShield size={11} />
                            <span>{unitItem.name}</span>
                          </div>
                          <FiArrowUpRight size={12} />
                        </EventCardLink>
                      ))}
                    </TagWrapRow>
                  </DrawerSection>
                ) : null}

                <DrawerSection>
                  <DrawerSectionHeader>
                    <DrawerSectionTitle>
                      <FiUsers size={13} />
                      <span>역대 장관 · 기관장</span>
                    </DrawerSectionTitle>
                    <SectionCount>{tenures.length}명</SectionCount>
                  </DrawerSectionHeader>

                  {deptTenuresQuery.isLoading ? (
                    <EmptyHint>재임 기록을 불러오는 중…</EmptyHint>
                  ) : tenures.length === 0 ? (
                    <EmptyHint>
                      등록된 장관·수장 재임 기록이 없습니다. 상단 [수장·인사 임명]으로
                      추가해보세요.
                    </EmptyHint>
                  ) : (
                    <CompactGroupCard>
                      {tenures.map((tenureRow) => {
                        const personName = tenureRow.person
                          ? getPersonDisplayName(tenureRow.person)
                          : '인물 미상'
                        const roleText =
                          tenureRow.title ??
                          tenureRow.positionDefinition?.title ??
                          '장관·기관장'
                        const linkedCabId =
                          tenureRow.cabinetId ??
                          tenureRow.cabinets?.[0]?.id ??
                          null
                        return (
                          <TenureCompactItem key={tenureRow.id}>
                            <CompactPersonRow
                              type="button"
                              onClick={() => {
                                if (tenureRow.person?.id) {
                                  onOpenPersonModal(tenureRow.person.id)
                                }
                              }}
                            >
                              <strong>{personName}</strong>
                              <span>
                                {roleText} ·{' '}
                                {formatIsoShortPeriod(
                                  tenureRow.startDate,
                                  tenureRow.endDate,
                                  false,
                                )}
                              </span>
                            </CompactPersonRow>
                            {linkedCabId ? (
                              <MiniCabJumpBtn
                                type="button"
                                onClick={() =>
                                  onSelectCabinetInCatalog(linkedCabId)
                                }
                              >
                                내각 보기 →
                              </MiniCabJumpBtn>
                            ) : null}
                          </TenureCompactItem>
                        )
                      })}
                    </CompactGroupCard>
                  )}
                </DrawerSection>

                {deptEvents.length > 0 ? (
                  <DrawerSection>
                    <DrawerSectionHeader>
                      <DrawerSectionTitle>
                        <FiLayers size={13} />
                        <span>관여 역사 사건</span>
                      </DrawerSectionTitle>
                      <SectionCount>{deptEvents.length}</SectionCount>
                    </DrawerSectionHeader>
                    <LinkStack>
                      {deptEvents.map((evRow) => (
                        <EventCardLink
                          key={evRow.relationId}
                          to={`/events/${evRow.event.id}`}
                        >
                          <div>
                            <SmallBadge>
                              {EVENT_DEPARTMENT_ROLE_LABEL[
                                evRow.role as EventDepartmentRoleValue
                              ] ?? evRow.role}
                            </SmallBadge>
                            <span>{evRow.event.title}</span>
                          </div>
                          <FiArrowUpRight size={13} />
                        </EventCardLink>
                      ))}
                    </LinkStack>
                  </DrawerSection>
                ) : null}
              </>
            )
          })()
        )}
      </DrawerScroll>
    </DrawerShell>
  )
}

const DrawerShell = styled.aside`
  position: sticky;
  top: 0;
  height: calc(100vh - var(--app-header-height, 64px) - 86px);
  min-height: 480px;
  display: flex;
  flex-direction: column;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  overflow: hidden;

  @media (max-width: 1024px) {
    position: fixed;
    top: var(--app-header-height, 64px);
    right: 0;
    bottom: 0;
    width: min(440px, 100vw);
    height: auto;
    border-radius: 0;
    z-index: 60;
    box-shadow: -12px 0 32px rgba(0, 0, 0, 0.24);
  }

  @media (max-width: 640px) {
    width: 100dvw;
    border-left: none;
  }
`

const OutOfScopeBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.28)'
        : 'rgba(217, 119, 6, 0.24)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(245, 158, 11, 0.12)'
      : 'rgba(254, 243, 199, 0.65)'};
  flex-shrink: 0;
`

const OutOfScopeText = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#92400e')};
`

const OutOfScopeResetBtn = styled.button`
  padding: 3px 8px;
  border-radius: ${RADIUS.XS};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.35)'
        : 'rgba(180, 83, 9, 0.3)'};
  background: transparent;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fde68a' : '#78350f')};
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.18)'
        : 'rgba(245, 158, 11, 0.14)'};
  }
`

const DrawerToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  flex-shrink: 0;
`

const StepGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const ShortcutHint = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-left: 4px;
`

const ActionGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const IconBtn = styled.button`
  width: 28px;
  height: 28px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
`

const OpenPageLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 11.5px;
  font-weight: 700;
  text-decoration: none;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const DrawerScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const DrawerLoading = styled.div`
  padding: 36px 16px;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeroBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 14px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const MetaTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
`

const PolityButton = styled.button<{ $historical: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: ${RADIUS.SM};
  border: none;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  background: ${({ theme, $historical }) =>
    $historical
      ? theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.16)'
        : 'rgba(245, 158, 11, 0.11)'
      : ledgerChipFill(theme.mode)};
  color: ${({ theme, $historical }) =>
    $historical
      ? theme.mode === 'dark'
        ? '#fcd34d'
        : '#b45309'
      : theme.colors.text.primary};

  &:hover {
    opacity: 0.86;
  }
`

const PeriodTag = styled.span`
  ${DIGIT_DISPLAY}
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeroPersonRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const AvatarImg = styled.img`
  width: 46px;
  height: 46px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`

const DeptLogoImg = styled.img`
  width: 44px;
  height: 44px;
  border-radius: ${RADIUS.SM};
  object-fit: contain;
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  flex-shrink: 0;
`

const AvatarFallback = styled.div`
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 800;
  flex-shrink: 0;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const HeroTitles = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`

const DrawerTitle = styled.h2`
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  line-height: 1.3;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SubPersonLine = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const InlineLinkBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 6px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
`

const TagWrapRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const SubtleMetaTag = styled.span`
  padding: 2px 7px;
  border-radius: ${RADIUS.XS};
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SmallBadge = styled.span`
  padding: 2px 7px;
  border-radius: ${RADIUS.XS};
  font-size: 11px;
  font-weight: 700;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const ProseText = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const QuickActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  margin-top: 2px;
`

const PrimaryActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 11px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
`

const SecondaryActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const CountryTabLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const SuggestBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 11px;
  border-radius: ${RADIUS.SM};
  border: 1px solid rgba(16, 185, 129, 0.35);
  background: rgba(16, 185, 129, 0.09);
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.primary};

  > div {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`

const SuggestAttachBtn = styled.button`
  padding: 4px 10px;
  border-radius: ${RADIUS.XS};
  border: none;
  background: #059669;
  color: #ffffff;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
`

const DrawerSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const DrawerSectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const DrawerSectionTitle = styled.h3`
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SectionCount = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PartyPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.primary};

  strong {
    font-size: 11px;
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const EmptyHint = styled.div`
  padding: 14px 12px;
  border-radius: ${RADIUS.SM};
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CompactGroupList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const CompactGroupCard = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  overflow: hidden;
`

const CompactGroupHead = styled.div`
  padding: 6px 10px;
  font-size: 11.5px;
  font-weight: 800;
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const DeptJumpBtn = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  font-size: 11.5px;
  font-weight: 800;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const CompactPersonRow = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  text-align: left;
  cursor: pointer;

  strong {
    font-size: 12.5px;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  span {
    ${DIGIT_DISPLAY}
    font-size: 11.5px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const TenureCompactItem = styled.div`
  display: flex;
  align-items: center;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  &:first-child {
    border-top: none;
  }

  > button:first-child {
    border-top: none;
    flex: 1;
  }
`

const MiniCabJumpBtn = styled.button`
  padding: 4px 8px;
  margin-right: 6px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  white-space: nowrap;
  cursor: pointer;
`

const ActingBadge = styled.span`
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px solid rgba(217, 119, 6, 0.38);
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
  font-size: 10px;
  font-weight: 700;
  vertical-align: middle;
`

const DetachMiniBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 6px;
  border-radius: ${RADIUS.XS};
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    border-color: rgba(239, 68, 68, 0.35);
    background: rgba(239, 68, 68, 0.08);
    color: #dc2626;
  }

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`

const LineageJumpChip = styled.button`
  padding: 4px 9px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const LinkStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const EventCardLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  text-decoration: none;
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};

  > div {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const StaticCard = styled.div`
  padding: 8px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  display: flex;
  flex-direction: column;
  gap: 4px;

  strong {
    font-size: 12.5px;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  p {
    margin: 0;
    font-size: 11.5px;
    line-height: 1.5;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`
