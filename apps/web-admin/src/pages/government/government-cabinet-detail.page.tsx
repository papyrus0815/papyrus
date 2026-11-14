import React, { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiArrowLeft,
  FiArrowRight,
  FiAward,
  FiCalendar,
  FiEdit2,
  FiFileText,
  FiFlag,
  FiLayers,
  FiLink2,
  FiPlus,
  FiRefreshCw,
  FiUser,
  FiUsers,
} from 'react-icons/fi'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
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
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import {
  CABINET_EVENT_ROLE_LABELS,
  type CabinetEventRole,
  listEventsForCabinet,
} from '@/shared/api/cabinet-events'
import { getCabinetPoliticalParties } from '@/shared/api/election'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import {
  type GovernmentCabinetTenureItem,
  personCareerApi,
} from '@/shared/api/person-career'
import { treatyApi } from '@/shared/api/treaty'
import { getUploadImageUrl } from '@/shared/api/upload'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { InstitutionAppointmentModal } from '@/shared/ui/institution-appointment-modal'
import { notify } from '@/shared/ui/toast'
import { CabinetFormModal } from '@/widgets/country/country-detail/ui/cabinet-form-modal.widget'
import {
  APPOINTMENT_METHOD_LABEL,
  END_REASON_LABEL,
  labelCabinetPartyRole,
} from '@/widgets/country/country-detail/ui/cabinets-section.helpers'
import {
  CountryInlineModal,
  type CountryInlineModalTarget,
} from '@/widgets/country/country-inline-modal/country-inline-modal'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'

import {
  formatIsoShortPeriod,
  readGovernmentListSearch,
  resolveCabinetDisplayTitle,
  resolveCabinetEffectiveDates,
  resolveCabinetHeadName,
  resolveCabinetPolityInfo,
  resolveCabinetPositionTitle,
  toEditableCabinetRecord,
} from './government-helpers'

function stripHtmlPreview(rawHtml: string | null | undefined): string {
  if (!rawHtml) return ''
  return rawHtml
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function GovernmentCabinetDetailPage() {
  const { cabinetId } = useParams<{ cabinetId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const listSearch = readGovernmentListSearch(location.state)

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [countryModalTarget, setCountryModalTarget] =
    useState<CountryInlineModalTarget | null>(null)
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false)
  const [appointModalOpen, setAppointModalOpen] = useState<boolean>(false)

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
      appointModalOpen &&
        (resolvedPolity?.modernCountryId ||
          resolvedPolity?.historicalCountryId),
    ),
    staleTime: 60_000,
  })

  const attachSuggestedMutation = useMutation({
    mutationFn: async () => {
      const suggestions = suggestedMinistersQuery.data ?? []
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
    onSuccess: () => {
      invalidateTenureQueries(queryClient, {
        cabinetId: cabinetId ?? null,
        countryId: resolvedPolity?.modernCountryId ?? null,
        historicalCountryId: resolvedPolity?.historicalCountryId ?? null,
      })
      void queryClient.invalidateQueries({ queryKey: ['global-cabinets'] })
      void queryClient.invalidateQueries({
        queryKey: ['cabinet-suggested-members', cabinetId],
      })
      notify.success('동시대 기등록 부처 인사가 각료진에 일괄 편입되었습니다.')
    },
    onError: (mutationError) => {
      notify.error(getApiErrorMessage(mutationError))
    },
  })

  const displayTitle = cabinet
    ? resolveCabinetDisplayTitle(cabinet)
    : '내각 상세'
  useDocumentTitle(`${displayTitle} · 전 국가 내각`)

  const groupedMinisters = useMemo(() => {
    const rawMinisters = (ministersQuery.data ??
      []) as GovernmentCabinetTenureItem[]
    const headTenureId = cabinet?.headTenure?.id ?? null
    const nonHeadMinisters = rawMinisters.filter(
      (tenureItem) => tenureItem.id !== headTenureId,
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
    for (const ministerItem of nonHeadMinisters) {
      const deptId =
        ministerItem.administrationDepartmentId ??
        ministerItem.administrationDepartment?.id ??
        null
      const deptName =
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
  }, [ministersQuery.data, cabinet?.headTenure?.id])

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
  const effectiveDates = resolveCabinetEffectiveDates(cabinet)
  const periodLabel = formatIsoShortPeriod(
    effectiveDates.startDate,
    effectiveDates.endDate,
    effectiveDates.isOngoing,
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
  const appointmentMethodLabel = cabinet.headTenure?.appointmentMethod
    ? (APPOINTMENT_METHOD_LABEL[cabinet.headTenure.appointmentMethod] ??
      cabinet.headTenure.appointmentMethod)
    : null
  const endReasonLabel = cabinet.headTenure?.endReason
    ? (END_REASON_LABEL[cabinet.headTenure.endReason] ??
      cabinet.headTenure.endReason)
    : null
  const headTenureDetailNote =
    cabinet.headTenure?.endReasonDetail?.trim() ||
    cabinet.headTenure?.notes?.trim() ||
    null

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
          <ActionSecondaryBtn
            type="button"
            onClick={() => setEditModalOpen(true)}
          >
            <FiEdit2 size={13} />
            <span>내각 · 수반 수정</span>
          </ActionSecondaryBtn>
          <ActionPrimaryBtn
            type="button"
            onClick={() => setAppointModalOpen(true)}
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
              {posTitle && <span>· {posTitle}</span>}
            </HeroSubline>
            {cabinet.description && (
              <HeroDescription>
                {stripHtmlPreview(cabinet.description)}
              </HeroDescription>
            )}
            {headTenureDetailNote && (
              <HeroTenureNote>{headTenureDetailNote}</HeroTenureNote>
            )}
          </HeroInfoCol>
        </HeroMainRow>
      </HeroCard>

      {suggestedList.length > 0 && (
        <SuggestBannerCard>
          <SuggestBannerText>
            <FiRefreshCw size={14} />
            <span>
              이 내각 존속 기간과 겹치는 기등록 부처 재임 인사{' '}
              <strong>{suggestedList.length}명</strong>이 아직 편입되지
              않았습니다.
            </span>
          </SuggestBannerText>
          <ActionPrimaryBtn
            type="button"
            disabled={attachSuggestedMutation.isPending}
            onClick={() => attachSuggestedMutation.mutate()}
          >
            {attachSuggestedMutation.isPending
              ? '편입 중…'
              : `${suggestedList.length}명 일괄 편입`}
          </ActionPrimaryBtn>
        </SuggestBannerCard>
      )}

      {partyLinks.length > 0 && (
        <SectionBlock>
          <SectionHeader>
            <SectionTitle>
              <FiFlag size={14} />
              <span>집권 · 연정 정당 구성</span>
            </SectionTitle>
            <SectionCount>{partyLinks.length}개 정당</SectionCount>
          </SectionHeader>
          <PeerGrid>
            {partyLinks.map((partyLinkItem) => {
              const partyDisplayName =
                partyLinkItem.party?.shortName?.trim() ||
                partyLinkItem.party?.name ||
                '정당 미상'
              const partyRoleText = labelCabinetPartyRole(partyLinkItem.role)
              const electionName =
                partyLinkItem.electionPartyResult?.election?.name ?? null
              const targetPartyUrl =
                polity.polityId && partyLinkItem.partyId
                  ? pathKeys.countryElectionPartyDetail(
                      polity.polityId,
                      partyLinkItem.partyId,
                    )
                  : null
              return targetPartyUrl ? (
                <PeerCard key={partyLinkItem.id} to={targetPartyUrl}>
                  <PartyRoleBadge>{partyRoleText}</PartyRoleBadge>
                  <PeerTitle>{partyDisplayName}</PeerTitle>
                  {(electionName || partyLinkItem.notes) && (
                    <PeerMeta>
                      {[electionName, partyLinkItem.notes]
                        .filter(Boolean)
                        .join(' · ')}
                    </PeerMeta>
                  )}
                </PeerCard>
              ) : (
                <StaticInfoCard key={partyLinkItem.id}>
                  <PartyRoleBadge>{partyRoleText}</PartyRoleBadge>
                  <PeerTitle>{partyDisplayName}</PeerTitle>
                  {(electionName || partyLinkItem.notes) && (
                    <PeerMeta>
                      {[electionName, partyLinkItem.notes]
                        .filter(Boolean)
                        .join(' · ')}
                    </PeerMeta>
                  )}
                </StaticInfoCard>
              )
            })}
          </PeerGrid>
        </SectionBlock>
      )}

      {cabinet.linkageGroup && (
        <SectionBlock>
          <SectionHeader>
            <SectionTitle>
              <FiLink2 size={14} />
              <span>다국 연결 행정부 (동시대 국제 사건 축)</span>
            </SectionTitle>
            {cabinet.linkageGroup.event && (
              <EventLinkChip to={`/events/${cabinet.linkageGroup.event.id}`}>
                사건: {cabinet.linkageGroup.event.title} →
              </EventLinkChip>
            )}
          </SectionHeader>
          {peerCabinets.length > 0 ? (
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
                    <PeerTitle>{resolveCabinetDisplayTitle(peerCab)}</PeerTitle>
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
          ) : (
            <EmptyCard>
              연결된 타국 행정부 내역을 불러오는 중이거나 단독 묶음입니다.
            </EmptyCard>
          )}
        </SectionBlock>
      )}

      <SectionBlock>
        <SectionHeader>
          <SectionTitle>
            <FiUsers size={14} />
            <span>부처별 각료 진용</span>
          </SectionTitle>
          <SectionHeaderRight>
            <SectionCount>
              {groupedMinisters.reduce(
                (accCount, group) => accCount + group.items.length,
                0,
              )}
              명
            </SectionCount>
            <SmallAddBtn
              type="button"
              onClick={() => setAppointModalOpen(true)}
            >
              <FiPlus size={12} />
              <span>각료 추가</span>
            </SmallAddBtn>
          </SectionHeaderRight>
        </SectionHeader>

        {ministersQuery.isLoading ? (
          <EmptyCard>소속 각료를 불러오는 중입니다…</EmptyCard>
        ) : groupedMinisters.length === 0 ? (
          <EmptyCard>
            등록된 소속 각료가 없습니다. 상단 [각료 임명] 버튼으로 바로 추가할 수
            있습니다.
          </EmptyCard>
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
                    <DeptTitlePlain>{deptGroup.departmentName}</DeptTitlePlain>
                  )}
                </DeptCardHeader>

                <MinisterList>
                  {deptGroup.items.map((ministerTenure) => {
                    const ministerName = ministerTenure.person
                      ? getPersonDisplayName(ministerTenure.person)
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
                      <MinisterRow
                        key={ministerTenure.id}
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
                          <MinisterName>{ministerName}</MinisterName>
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
                    )
                  })}
                </MinisterList>
              </DepartmentMinisterCard>
            ))}
          </MinisterGrid>
        )}
      </SectionBlock>

      {achievements.length > 0 && (
        <SectionBlock>
          <SectionHeader>
            <SectionTitle>
              <FiAward size={14} />
              <span>수반 재임 기록 · 주요 정책/업적</span>
            </SectionTitle>
            <SectionCount>{achievements.length}건</SectionCount>
          </SectionHeader>
          <AchievementList>
            {achievements.map((achievementItem) => (
              <AchievementCard key={achievementItem.id}>
                <AchievementHeader>
                  <AchievementTitle>{achievementItem.title}</AchievementTitle>
                  {(achievementItem.startDate || achievementItem.endDate) && (
                    <PeriodMono>
                      {formatIsoShortPeriod(
                        achievementItem.startDate,
                        achievementItem.endDate,
                        false,
                      )}
                    </PeriodMono>
                  )}
                </AchievementHeader>
                {achievementItem.description && (
                  <AchievementBody>
                    {stripHtmlPreview(achievementItem.description)}
                  </AchievementBody>
                )}
              </AchievementCard>
            ))}
          </AchievementList>
        </SectionBlock>
      )}

      {treaties.length > 0 && (
        <SectionBlock>
          <SectionHeader>
            <SectionTitle>
              <FiFileText size={14} />
              <span>이 내각이 서명·체결한 조약</span>
            </SectionTitle>
            <SectionCount>{treaties.length}건</SectionCount>
          </SectionHeader>
          <PeerGrid>
            {treaties.map((treatyItem) => (
              <PeerCard
                key={treatyItem.id}
                to={pathKeys.treaties.detail(treatyItem.id)}
              >
                <PeerTitle>{treatyItem.name}</PeerTitle>
                <PeerMeta>
                  {formatIsoShortPeriod(treatyItem.signDate, null, false)}
                </PeerMeta>
              </PeerCard>
            ))}
          </PeerGrid>
        </SectionBlock>
      )}

      {cabinetEventLinks.length > 0 && (
        <SectionBlock>
          <SectionHeader>
            <SectionTitle>
              <FiLayers size={14} />
              <span>관여한 역사 사건</span>
            </SectionTitle>
            <SectionCount>{cabinetEventLinks.length}건</SectionCount>
          </SectionHeader>
          <PeerGrid>
            {cabinetEventLinks.map((eventLinkItem) => {
              const linkedEventObj = eventLinkItem.event as
                | {
                    id?: string
                    title?: string
                    startDate?: string | null
                    endDate?: string | null
                  }
                | undefined
              const targetEventId = linkedEventObj?.id ?? eventLinkItem.eventId
              const eventTitle = linkedEventObj?.title ?? '사건 상세 보기'
              const roleBadgeText = eventLinkItem.role
                ? (CABINET_EVENT_ROLE_LABELS[
                    eventLinkItem.role as CabinetEventRole
                  ] ?? eventLinkItem.role)
                : '관련 사건'
              return (
                <PeerCard key={eventLinkItem.id} to={`/events/${targetEventId}`}>
                  <PartyRoleBadge>{roleBadgeText}</PartyRoleBadge>
                  <PeerTitle>{eventTitle}</PeerTitle>
                  {(linkedEventObj?.startDate || eventLinkItem.note) && (
                    <PeerMeta>
                      {[
                        linkedEventObj?.startDate
                          ? formatIsoShortPeriod(
                              linkedEventObj.startDate,
                              linkedEventObj.endDate ?? null,
                              false,
                            )
                          : null,
                        eventLinkItem.note,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </PeerMeta>
                  )}
                </PeerCard>
              )
            })}
          </PeerGrid>
        </SectionBlock>
      )}

      <CabinetFormModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        editingCabinet={toEditableCabinetRecord(cabinet)}
        onSaved={() => {
          void queryClient.invalidateQueries({
            queryKey: ['global-cabinet-detail', cabinetId],
          })
          void queryClient.invalidateQueries({ queryKey: ['global-cabinets'] })
        }}
      />

      <InstitutionAppointmentModal
        isOpen={appointModalOpen}
        onClose={() => setAppointModalOpen(false)}
        contextType="CABINET"
        countryId={polity.modernCountryId}
        historicalCountryId={polity.historicalCountryId}
        countryName={polity.polityName}
        cabinetId={cabinet.id}
        cabinetName={displayTitle}
        availableDepartments={polityDepartmentsQuery.data ?? []}
        onSaved={() => {
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
  max-width: 1040px;
  margin: 0 auto;
  padding: 24px 28px 64px;
  display: flex;
  flex-direction: column;
  gap: 20px;
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
    opacity: 0.6;
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
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
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

const TenureMetaTag = styled.span`
  padding: 3px 8px;
  border-radius: ${RADIUS.SM};
  font-size: 11.5px;
  font-weight: 600;
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
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
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeroMainRow = styled.div`
  display: flex;
  align-items: center;
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
  gap: 4px;
  min-width: 0;
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
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
`

const HeroDescription = styled.p`
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeroTenureNote = styled.div`
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.tertiary};
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
`

const SectionHeaderRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
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

const StaticInfoCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
`

const PartyRoleBadge = styled.span`
  align-self: flex-start;
  padding: 2px 7px;
  border-radius: ${RADIUS.XS};
  font-size: 11px;
  font-weight: 700;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
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
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
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

const MinisterRow = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  text-align: left;
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
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

const MinisterName = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const MinisterRole = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
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

const AchievementBody = styled.p`
  margin: 6px 0 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
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
