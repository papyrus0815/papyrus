/**
 * 선전포고 · 개전 정본 연동 섹션 (사건 상세).
 *
 * 선전포고(WarDeclaration)의 주권·헌정 정본은 **국가 상세 › 군사 › 선전포고 · 개전 원장**이 소유하며,
 * 사건(Event)은 그 전후 외교 경위·연설·각서 전달 비화를 담는 **보조 서술 문서** 역할을 맡는다
 * (조약 Treaty ↔ 사건, 선거 Election ↔ 사건과 동일한 정본 분리 원칙).
 *
 * - 정본(`event.warDeclarations`)이 연결되어 있으면: 국가 정본 원장 카드(당사국·개전 유형·개전 명분·
 *   결정 수반·내각·의회 표결·상위 전쟁·종전 강화조약)를 표시하고 인라인 정본 수정 및 국가 원장 이동을 제공한다.
 * - 아직 정본이 연결되지 않은 선전포고 사건이면: 이 사건의 날짜·당사국을 기본값으로 채워
 *   원클릭으로 국가 선전포고 정본을 생성·연결할 수 있게 안내하며, 보조 참여국 빠른 배정도 함께 지원한다.
 */
import { type DragEvent, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import {
  FiArrowRight,
  FiArrowUpRight,
  FiEdit2,
  FiFileText,
  FiPlus,
  FiShield,
} from 'react-icons/fi'
import { MdDragIndicator } from 'react-icons/md'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerHairline,
  ledgerHairlineStrong,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { eventKeys } from '@/shared/api/event-query-keys'
import { type UpdateEventDto } from '@/shared/api/events'
import {
  formatWarDeclarationDate,
  formatWarDeclarationEndDate,
  formatWarDeclarationSeveranceDate,
  WAR_DECLARATION_KIND_LABELS,
  type WarDeclarationDto,
  type WarDeclarationKind,
  WAR_TERMINATION_KIND_LABELS,
  type WarTerminationKind,
  warDeclarationApi,
} from '@/shared/api/war-declaration'
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { pathKeys } from '@/shared/router'
import { notify } from '@/shared/ui/toast'
import {
  type PartyPreset,
  WarDeclarationFormModal,
} from '@/widgets/country/country-detail/ui/war-declaration-form-modal'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'
import { SectionHintText } from './actors/actors.styles'

export type WarDeclarationRole = 'INITIATOR' | 'TARGET'

export interface WarDeclarationEntry {
  id: string
  name: string
  flagEmoji?: string | null
  role: WarDeclarationRole
  roleDescription: string | null
  note: string | null
  historical: boolean
}

interface DetailWarDeclarationProps {
  event: EventDetail
  /** 선전포고 세부 유형인가 — 역할이 아직 비어 있어도 안내와 배정 보드를 세운다 */
  expectWarDeclaration: boolean
  onCountryClick: (countryId: string) => void
  onPatch?: (patch: UpdateEventDto) => void
  onJumpToActors?: () => void
}

const ROLE_LABEL: Record<WarDeclarationRole, string> = {
  INITIATOR: '선포국',
  TARGET: '대상국',
}

export function warDeclarationEntries(event: EventDetail): WarDeclarationEntry[] {
  const pickRole = (role: unknown): WarDeclarationRole | null =>
    role === 'INITIATOR' || role === 'TARGET' ? role : null
  const entries: WarDeclarationEntry[] = []
  for (const country of event.relatedHistoricalCountries ?? []) {
    const role = pickRole(country.role)
    if (role) {
      entries.push({
        id: country.id,
        name: country.name,
        role,
        roleDescription: country.roleDescription ?? null,
        note: country.note ?? null,
        historical: true,
      })
    }
  }
  for (const country of event.relatedCountries ?? []) {
    const role = pickRole(country.role)
    if (role) {
      entries.push({
        id: country.id,
        name: country.name,
        flagEmoji: country.flagEmoji ?? null,
        role,
        roleDescription: country.roleDescription ?? null,
        note: country.note ?? null,
        historical: false,
      })
    }
  }
  return entries.sort((left, right) =>
    left.role === right.role ? 0 : left.role === 'INITIATOR' ? -1 : 1,
  )
}

function formatDeclarationDateLabel(
  startDate: string | null | undefined,
  precision: string | null | undefined,
): string {
  const parts = parseIsoDateParts(startDate ?? null)
  if (!parts) return '선전포고'
  const yearLabel =
    parts.year < 0 ? `기원전 ${Math.abs(parts.year)}년` : `${parts.year}년`
  if (precision === 'year') return yearLabel
  if (precision === 'month') return `${yearLabel} ${parts.month}월`
  return `${yearLabel} ${parts.month}월 ${parts.day}일`
}

export function DetailWarDeclaration({
  event,
  expectWarDeclaration,
  onCountryClick,
  onPatch,
  onJumpToActors,
}: DetailWarDeclarationProps) {
  const queryClient = useQueryClient()
  const canonicalRows = event.warDeclarations ?? []
  const inWarRows = event.warDeclarationsInWar ?? []
  const fromUltimatumRows = event.warDeclarationsFromUltimatum ?? []
  const isWarParentContext =
    event.type === 'WAR' ||
    (!expectWarDeclaration &&
      canonicalRows.length === 0 &&
      inWarRows.length > 0)
  const isUltimatumContext =
    !expectWarDeclaration &&
    !isWarParentContext &&
    canonicalRows.length === 0 &&
    fromUltimatumRows.length > 0
  const entries = warDeclarationEntries(event)
  const initiatorEntries = entries.filter((entry) => entry.role === 'INITIATOR')
  const targetEntries = entries.filter((entry) => entry.role === 'TARGET')
  const otherParticipants = [
    ...(event.relatedHistoricalCountries ?? [])
      .filter(
        (country) => country.role !== 'INITIATOR' && country.role !== 'TARGET',
      )
      .map((country) => ({ id: country.id, name: country.name, historical: true })),
    ...(event.relatedCountries ?? [])
      .filter(
        (country) => country.role !== 'INITIATOR' && country.role !== 'TARGET',
      )
      .map((country) => ({
        id: country.id,
        name: country.name,
        historical: false,
      })),
  ]

  const [dragCountry, setDragCountry] = useState<{
    id: string
    historical: boolean
  } | null>(null)
  const [dragOverRole, setDragOverRole] = useState<WarDeclarationRole | null>(
    null,
  )
  const [showAllParticipants, setShowAllParticipants] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingDto, setEditingDto] = useState<WarDeclarationDto | null>(null)
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null)

  const QUICK_ASSIGN_CAP = 4
  const visibleParticipants = showAllParticipants
    ? otherParticipants
    : otherParticipants.slice(0, QUICK_ASSIGN_CAP)
  const hiddenParticipantCount =
    otherParticipants.length - visibleParticipants.length

  const assignDeclarationRole = (
    target: { id: string; historical: boolean },
    nextRole: WarDeclarationRole | 'PARTICIPANT',
  ) => {
    if (!onPatch) return
    onPatch({
      relatedCountriesPatch: [
        {
          ...(target.historical
            ? { historicalCountryId: target.id }
            : { countryId: target.id }),
          role: nextRole,
        },
      ],
    })
  }

  const encodeDragPayload = (item: { id: string; historical: boolean }) =>
    `${item.historical ? 'h' : 'c'}:${item.id}`
  const decodeDragPayload = (
    raw: string,
  ): { id: string; historical: boolean } | null => {
    if (raw.startsWith('h:')) return { id: raw.slice(2), historical: true }
    if (raw.startsWith('c:')) return { id: raw.slice(2), historical: false }
    return null
  }

  const handleDropToRole = (
    dragEvent: DragEvent<HTMLElement>,
    targetRole: WarDeclarationRole,
  ) => {
    dragEvent.preventDefault()
    const payload =
      dragCountry ??
      decodeDragPayload(dragEvent.dataTransfer.getData('text/plain'))
    setDragCountry(null)
    setDragOverRole(null)
    if (!payload) return
    assignDeclarationRole(payload, targetRole)
  }

  const openCreateCanonical = () => {
    setEditingDto(null)
    setModalOpen(true)
  }

  const openEditCanonical = async (id: string) => {
    setLoadingEditId(id)
    try {
      const full = await warDeclarationApi.getById(id)
      setEditingDto(full)
      setModalOpen(true)
    } catch {
      notify.error('선전포고 정본 정보를 불러오지 못했습니다.')
    } finally {
      setLoadingEditId(null)
    }
  }

  if (
    !expectWarDeclaration &&
    !isWarParentContext &&
    !isUltimatumContext &&
    canonicalRows.length === 0
  ) {
    return null
  }

  const dateLabel = formatDeclarationDateLabel(
    event.startDate,
    event.startDatePrecision,
  )
  const entriesWithContext = entries.filter((entry) =>
    Boolean(entry.roleDescription?.trim() || entry.note?.trim()),
  )

  const startParts = parseIsoDateParts(event.startDate ?? null)
  const defaultDeclaringPreset: PartyPreset | null = initiatorEntries[0]
    ? {
        id: initiatorEntries[0].id,
        name: initiatorEntries[0].name,
        flagEmoji: initiatorEntries[0].flagEmoji ?? null,
        isHistorical: initiatorEntries[0].historical,
      }
    : null
  const defaultTargetPreset: PartyPreset | null = targetEntries[0]
    ? {
        id: targetEntries[0].id,
        name: targetEntries[0].name,
        flagEmoji: targetEntries[0].flagEmoji ?? null,
        isHistorical: targetEntries[0].historical,
      }
    : null

  if (isWarParentContext) {
    return (
      <S.Section id="war-declaration">
        <S.SectionHeaderGroup>
          <HeaderRow>
            <S.SectionHeader>
              <S.SectionTitle>개전 · 참전 원장</S.SectionTitle>
              {inWarRows.length > 0 ? (
                <S.SectionSubtitle>
                  국가 정본 {inWarRows.length}건 귀속됨
                </S.SectionSubtitle>
              ) : null}
            </S.SectionHeader>
            <CanonicalActions>
              <ParentWarOverviewLink
                to={`${pathKeys.events.detail(event.id)}/overview`}
              >
                전쟁 종합 조망 →
              </ParentWarOverviewLink>
              {onPatch ? (
                <RegisterCanonicalBtn type="button" onClick={openCreateCanonical}>
                  <FiPlus size={13} />
                  참전·선전포고 정본 추가
                </RegisterCanonicalBtn>
              ) : null}
            </CanonicalActions>
          </HeaderRow>
          <SectionHintText>
            이 전쟁에 귀속된 각국의 선전포고·최후통첩 만료 개전·동맹 참전·무선전 개전 정본 목록입니다.
          </SectionHintText>
        </S.SectionHeaderGroup>

        {inWarRows.length > 0 ? (
          <CanonicalCardList aria-label="이 전쟁의 개전 및 선전포고 정본 목록">
            {inWarRows.map((wd) => {
              const declId =
                wd.declaringHistoricalCountryId ?? wd.declaringCountryId
              const tgtId = wd.targetHistoricalCountryId ?? wd.targetCountryId
              const kindLabel =
                WAR_DECLARATION_KIND_LABELS[wd.kind as WarDeclarationKind] ??
                wd.kind
              const terminationLabel = wd.terminationKind
                ? (WAR_TERMINATION_KIND_LABELS[
                    wd.terminationKind as WarTerminationKind
                  ] ?? wd.terminationKind)
                : null
              const endLabel = formatWarDeclarationEndDate(wd)

              return (
                <CanonicalCard key={wd.id}>
                  <CanonicalTopRow>
                    <CanonicalMetaGroup>
                      <KindBadge>{kindLabel}</KindBadge>
                      <CanonicalDateText>
                        {formatWarDeclarationDate(wd)}
                        {endLabel ? ` ~ ${endLabel}` : ''}
                      </CanonicalDateText>
                    </CanonicalMetaGroup>
                    <CanonicalActions>
                      {declId ? (
                        <LedgerJumpLink
                          to={`${pathKeys.countryMilitary(declId)}?sub=declarations`}
                        >
                          <FiShield size={12} />
                          <span>{wd.declaringCountryName} 원장</span>
                          <FiArrowUpRight size={11} />
                        </LedgerJumpLink>
                      ) : null}
                      {onPatch ? (
                        <CanonicalEditBtn
                          type="button"
                          disabled={loadingEditId === wd.id}
                          onClick={() => void openEditCanonical(wd.id)}
                        >
                          <FiEdit2 size={12} />
                          <span>
                            {loadingEditId === wd.id ? '불러오는 중' : '정본 수정'}
                          </span>
                        </CanonicalEditBtn>
                      ) : null}
                    </CanonicalActions>
                  </CanonicalTopRow>

                  <CanonicalPartiesRow>
                    <CanonicalPartyBtn
                      type="button"
                      $initiator
                      onClick={() => declId && onCountryClick(declId)}
                    >
                      {wd.declaringFlagEmoji ? `${wd.declaringFlagEmoji} ` : ''}
                      {wd.declaringCountryName}
                    </CanonicalPartyBtn>
                    <CanonicalArrow aria-label="개전 대상">──▶</CanonicalArrow>
                    <CanonicalPartyBtn
                      type="button"
                      $initiator={false}
                      onClick={() => tgtId && onCountryClick(tgtId)}
                    >
                      {wd.targetFlagEmoji ? `${wd.targetFlagEmoji} ` : ''}
                      {wd.targetCountryName}
                    </CanonicalPartyBtn>
                  </CanonicalPartiesRow>

                  {wd.casusBelli ? (
                    <CanonicalCasus>
                      <strong>개전 명분:</strong> {wd.casusBelli}
                    </CanonicalCasus>
                  ) : null}

                  {(wd.decidedByPerson ||
                    wd.approvedChamber ||
                    wd.ultimatumEvent ||
                    wd.narrativeEventId ||
                    wd.peaceTreaty ||
                    terminationLabel) && (
                    <CanonicalFactsBar>
                      {wd.decidedByPerson ? (
                        <FactPill>
                          결정·선포:{' '}
                          <strong>{wd.decidedByPerson.displayName}</strong>
                          {wd.decidedByTenureTitle
                            ? ` (${wd.decidedByTenureTitle})`
                            : ''}
                        </FactPill>
                      ) : null}
                      {wd.approvedChamber ? (
                        <FactPill>
                          의회 의결: <strong>{wd.approvedChamber.name}</strong>
                          {wd.yeas != null && wd.nays != null
                            ? ` (${wd.yeas}:${wd.nays})`
                            : ''}
                        </FactPill>
                      ) : null}
                      {wd.ultimatumEvent ? (
                        <FactLink
                          to={pathKeys.events.detail(wd.ultimatumEvent.id)}
                        >
                          선행 최후통첩: {wd.ultimatumEvent.title} →
                        </FactLink>
                      ) : null}
                      {wd.narrativeEventId && wd.narrativeEventTitle ? (
                        <FactLink
                          to={pathKeys.events.detail(wd.narrativeEventId)}
                        >
                          보조 사건: {wd.narrativeEventTitle} →
                        </FactLink>
                      ) : null}
                      {wd.peaceTreaty && declId ? (
                        <FactLink
                          to={`${pathKeys.countryTreaty(declId)}?treatyId=${encodeURIComponent(wd.peaceTreaty.id)}`}
                        >
                          <FiFileText size={11.5} />
                          종결 조약: {wd.peaceTreaty.name}
                        </FactLink>
                      ) : terminationLabel ? (
                        <FactPill>종결: {terminationLabel}</FactPill>
                      ) : null}
                    </CanonicalFactsBar>
                  )}
                </CanonicalCard>
              )
            })}
          </CanonicalCardList>
        ) : (
          <S.EmptyGuide>
            <S.EmptyGuideBody>
              <S.EmptyGuideTitle>
                아직 이 전쟁에 등록된 개전·선전포고 정본이 없습니다
              </S.EmptyGuideTitle>
              <S.EmptyGuideDesc>
                참전국 간 선전포고·최후통첩 개전·동맹 참전·무선전 기습 개전을 등록하면 국가 군사 원장과 전쟁 참전 조망에 자동 동기화됩니다.
              </S.EmptyGuideDesc>
            </S.EmptyGuideBody>
            {onPatch ? (
              <S.EmptyGuideActions>
                <S.EmptyPrimaryAction type="button" onClick={openCreateCanonical}>
                  첫 참전·선전포고 정본 등록
                  <FiArrowRight aria-hidden />
                </S.EmptyPrimaryAction>
              </S.EmptyGuideActions>
            ) : null}
          </S.EmptyGuide>
        )}

        <WarDeclarationFormModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setEditingDto(null)
          }}
          editing={editingDto}
          defaultDeclaring={!editingDto ? defaultDeclaringPreset : null}
          defaultTarget={!editingDto ? defaultTargetPreset : null}
          defaultWarEvent={
            !editingDto ? { id: event.id, title: event.title } : null
          }
          defaultNarrativeEvent={null}
          onSaved={() => {
            void queryClient.invalidateQueries({
              queryKey: eventKeys.detail(event.id),
            })
          }}
        />
      </S.Section>
    )
  }

  if (isUltimatumContext) {
    return (
      <S.Section id="war-declaration">
        <S.SectionHeaderGroup>
          <HeaderRow>
            <S.SectionHeader>
              <S.SectionTitle>이 최후통첩으로 이어진 개전 · 선전포고</S.SectionTitle>
              <S.SectionSubtitle>
                후속 개전 정본 {fromUltimatumRows.length}건
              </S.SectionSubtitle>
            </S.SectionHeader>
          </HeaderRow>
        </S.SectionHeaderGroup>
        <CanonicalCardList aria-label="최후통첩 후속 개전 정본 목록">
          {fromUltimatumRows.map((wd) => {
            const declId =
              wd.declaringHistoricalCountryId ?? wd.declaringCountryId
            const tgtId = wd.targetHistoricalCountryId ?? wd.targetCountryId
            const kindLabel =
              WAR_DECLARATION_KIND_LABELS[wd.kind as WarDeclarationKind] ??
              wd.kind
            return (
              <CanonicalCard key={wd.id}>
                <CanonicalTopRow>
                  <CanonicalMetaGroup>
                    <KindBadge>{kindLabel}</KindBadge>
                    <CanonicalDateText>
                      {formatWarDeclarationDate(wd)}
                    </CanonicalDateText>
                  </CanonicalMetaGroup>
                  <CanonicalActions>
                    {declId ? (
                      <LedgerJumpLink
                        to={`${pathKeys.countryMilitary(declId)}?sub=declarations`}
                      >
                        <FiShield size={12} />
                        <span>{wd.declaringCountryName} 원장</span>
                        <FiArrowUpRight size={11} />
                      </LedgerJumpLink>
                    ) : null}
                  </CanonicalActions>
                </CanonicalTopRow>
                <CanonicalPartiesRow>
                  <CanonicalPartyBtn
                    type="button"
                    $initiator
                    onClick={() => declId && onCountryClick(declId)}
                  >
                    {wd.declaringFlagEmoji ? `${wd.declaringFlagEmoji} ` : ''}
                    {wd.declaringCountryName}
                  </CanonicalPartyBtn>
                  <CanonicalArrow aria-label="개전 대상">──▶</CanonicalArrow>
                  <CanonicalPartyBtn
                    type="button"
                    $initiator={false}
                    onClick={() => tgtId && onCountryClick(tgtId)}
                  >
                    {wd.targetFlagEmoji ? `${wd.targetFlagEmoji} ` : ''}
                    {wd.targetCountryName}
                  </CanonicalPartyBtn>
                </CanonicalPartiesRow>
                {wd.casusBelli ? (
                  <CanonicalCasus>
                    <strong>개전 명분:</strong> {wd.casusBelli}
                  </CanonicalCasus>
                ) : null}
                {(wd.warEvent || wd.narrativeEventId) && (
                  <CanonicalFactsBar>
                    {wd.warEvent ? (
                      <FactLink to={pathKeys.events.detail(wd.warEvent.id)}>
                        상위 전쟁: {wd.warEvent.title} →
                      </FactLink>
                    ) : null}
                    {wd.narrativeEventId && wd.narrativeEventTitle ? (
                      <FactLink
                        to={pathKeys.events.detail(wd.narrativeEventId)}
                      >
                        개전 사건: {wd.narrativeEventTitle} →
                      </FactLink>
                    ) : null}
                  </CanonicalFactsBar>
                )}
              </CanonicalCard>
            )
          })}
        </CanonicalCardList>
      </S.Section>
    )
  }

  return (
    <S.Section id="war-declaration">
      <S.SectionHeaderGroup>
        <HeaderRow>
          <S.SectionHeader>
            <S.SectionTitle>선전포고 · 개전 정본</S.SectionTitle>
            {canonicalRows.length > 0 ? (
              <S.SectionSubtitle>국가 정본 {canonicalRows.length}건 연결됨</S.SectionSubtitle>
            ) : entries.length > 0 ? (
              <S.SectionSubtitle>
                선포 {initiatorEntries.length}곳 → 대상 {targetEntries.length}곳
              </S.SectionSubtitle>
            ) : null}
          </S.SectionHeader>
          {onPatch && (
            <RegisterCanonicalBtn type="button" onClick={openCreateCanonical}>
              <FiPlus size={13} />
              {canonicalRows.length > 0
                ? '당사국 정본 추가'
                : '국가 선전포고 정본 등록·연결'}
            </RegisterCanonicalBtn>
          )}
        </HeaderRow>
        <SectionHintText>
          선전포고·개전의 법적 정본(당사국·수반·의회 표결·종전 조약)은 국가 군사 원장에서 관리하며, 이 사건 문서는 전후 외교 경위와 서술을 보조합니다.
        </SectionHintText>
      </S.SectionHeaderGroup>

      {event.parentEvent && (
        <ParentWarBanner>
          <ParentWarLabel>상위 사건</ParentWarLabel>
          <ParentWarTitleLink to={pathKeys.events.detail(event.parentEvent.id)}>
            {event.parentEvent.title}
          </ParentWarTitleLink>
          <ParentWarOverviewLink
            to={`${pathKeys.events.detail(event.parentEvent.id)}?tab=survey&sv=participants`}
          >
            전쟁 참전 흐름 조망 →
          </ParentWarOverviewLink>
        </ParentWarBanner>
      )}

      {canonicalRows.length > 0 ? (
        <CanonicalCardList aria-label="연결된 국가 선전포고 정본 목록">
          {canonicalRows.map((wd) => {
            const declId = wd.declaringHistoricalCountryId ?? wd.declaringCountryId
            const tgtId = wd.targetHistoricalCountryId ?? wd.targetCountryId
            const kindLabel =
              WAR_DECLARATION_KIND_LABELS[wd.kind as WarDeclarationKind] ??
              wd.kind
            const terminationLabel = wd.terminationKind
              ? (WAR_TERMINATION_KIND_LABELS[
                  wd.terminationKind as WarTerminationKind
                ] ?? wd.terminationKind)
              : null
            const sevLabel = formatWarDeclarationSeveranceDate(wd)

            return (
              <CanonicalCard key={wd.id}>
                <CanonicalTopRow>
                  <CanonicalMetaGroup>
                    <KindBadge>{kindLabel}</KindBadge>
                    <CanonicalDateText>
                      {formatWarDeclarationDate(wd)}
                      {sevLabel ? ` (선행 단교 ${sevLabel})` : ''}
                    </CanonicalDateText>
                  </CanonicalMetaGroup>

                  <CanonicalActions>
                    {declId ? (
                      <LedgerJumpLink
                        to={`${pathKeys.countryMilitary(declId)}?sub=declarations`}
                        title={`${wd.declaringCountryName} 선전포고·개전 원장으로 이동`}
                      >
                        <FiShield size={12} />
                        <span>{wd.declaringCountryName} 개전 원장</span>
                        <FiArrowUpRight size={11} />
                      </LedgerJumpLink>
                    ) : null}
                    {onPatch ? (
                      <CanonicalEditBtn
                        type="button"
                        disabled={loadingEditId === wd.id}
                        onClick={() => void openEditCanonical(wd.id)}
                      >
                        <FiEdit2 size={12} />
                        <span>
                          {loadingEditId === wd.id ? '불러오는 중' : '정본 수정'}
                        </span>
                      </CanonicalEditBtn>
                    ) : null}
                  </CanonicalActions>
                </CanonicalTopRow>

                <CanonicalPartiesRow>
                  <CanonicalPartyBtn
                    type="button"
                    $initiator
                    onClick={() => declId && onCountryClick(declId)}
                  >
                    {wd.declaringFlagEmoji ? `${wd.declaringFlagEmoji} ` : ''}
                    {wd.declaringCountryName}
                  </CanonicalPartyBtn>
                  <CanonicalArrow aria-label="선전포고 대상">──▶</CanonicalArrow>
                  <CanonicalPartyBtn
                    type="button"
                    $initiator={false}
                    onClick={() => tgtId && onCountryClick(tgtId)}
                  >
                    {wd.targetFlagEmoji ? `${wd.targetFlagEmoji} ` : ''}
                    {wd.targetCountryName}
                  </CanonicalPartyBtn>
                </CanonicalPartiesRow>

                {wd.casusBelli ? (
                  <CanonicalCasus>
                    <strong>개전 명분:</strong> {wd.casusBelli}
                  </CanonicalCasus>
                ) : null}
                {wd.summary ? (
                  <CanonicalSummary>{wd.summary}</CanonicalSummary>
                ) : null}

                {(wd.decidedByPerson ||
                  wd.cabinet ||
                  wd.approvedChamber ||
                  wd.warEvent ||
                  wd.ultimatumEvent ||
                  wd.peaceTreaty ||
                  terminationLabel) && (
                  <CanonicalFactsBar>
                    {wd.decidedByPerson ? (
                      <FactPill>
                        결정·선포: <strong>{wd.decidedByPerson.displayName}</strong>
                        {wd.decidedByTenureTitle
                          ? ` (${wd.decidedByTenureTitle})`
                          : ''}
                      </FactPill>
                    ) : null}
                    {wd.cabinet?.name ? (
                      <FactPill>내각: {wd.cabinet.name}</FactPill>
                    ) : null}
                    {wd.approvedChamber ? (
                      <FactPill>
                        의회 의결: <strong>{wd.approvedChamber.name}</strong>
                        {wd.yeas != null && wd.nays != null
                          ? ` (${wd.yeas}:${wd.nays}${wd.abstentions != null ? `, 기권 ${wd.abstentions}` : ''})`
                          : ''}
                      </FactPill>
                    ) : null}
                    {wd.ultimatumEvent ? (
                      <FactLink
                        to={pathKeys.events.detail(wd.ultimatumEvent.id)}
                      >
                        선행 최후통첩: {wd.ultimatumEvent.title} →
                      </FactLink>
                    ) : null}
                    {wd.warEvent && wd.warEvent.id !== event.parentEvent?.id ? (
                      <FactLink to={pathKeys.events.detail(wd.warEvent.id)}>
                        상위 전쟁: {wd.warEvent.title} →
                      </FactLink>
                    ) : null}
                    {wd.peaceTreaty && declId ? (
                      <FactLink
                        to={`${pathKeys.countryTreaty(declId)}?treatyId=${encodeURIComponent(wd.peaceTreaty.id)}`}
                      >
                        <FiFileText size={11.5} />
                        종결 조약: {wd.peaceTreaty.name}
                      </FactLink>
                    ) : terminationLabel ? (
                      <FactPill>종결: {terminationLabel}</FactPill>
                    ) : null}
                  </CanonicalFactsBar>
                )}
              </CanonicalCard>
            )
          })}
        </CanonicalCardList>
      ) : entries.length > 0 || otherParticipants.length > 0 ? (
        <DeclarationBoard role="region" aria-label="선전포고 당사국 흐름 인포그래픽">
          <DeclarationGrid>
            <DeclarationLane
              $dragOver={dragOverRole === 'INITIATOR'}
              data-declaration-lane="INITIATOR"
              onDragOver={(dragEvent) => {
                if (!onPatch) return
                dragEvent.preventDefault()
                if (dragOverRole !== 'INITIATOR') setDragOverRole('INITIATOR')
              }}
              onDragLeave={(dragEvent) => {
                if (
                  !dragEvent.currentTarget.contains(
                    dragEvent.relatedTarget as globalThis.Node | null,
                  )
                ) {
                  setDragOverRole((current) =>
                    current === 'INITIATOR' ? null : current,
                  )
                }
              }}
              onDrop={(dragEvent) => handleDropToRole(dragEvent, 'INITIATOR')}
            >
              <DeclarationLaneHead $initiator>
                <span>선포국 · 개전 주도</span>
                {initiatorEntries.length > 0 && (
                  <span>{initiatorEntries.length}곳</span>
                )}
              </DeclarationLaneHead>
              {initiatorEntries.length > 0 ? (
                <DeclarationPillList>
                  {initiatorEntries.map((entry) => (
                    <DeclarationPill
                      key={entry.id}
                      $initiator
                      draggable={Boolean(onPatch)}
                      onDragStart={(dragEvent) => {
                        const item = {
                          id: entry.id,
                          historical: entry.historical,
                        }
                        setDragCountry(item)
                        dragEvent.dataTransfer.effectAllowed = 'move'
                        dragEvent.dataTransfer.setData(
                          'text/plain',
                          encodeDragPayload(item),
                        )
                      }}
                      onDragEnd={() => {
                        setDragCountry(null)
                        setDragOverRole(null)
                      }}
                    >
                      <DeclarationPillName
                        type="button"
                        onClick={() => onCountryClick(entry.id)}
                      >
                        {entry.flagEmoji ? `${entry.flagEmoji} ` : ''}
                        {entry.name}
                      </DeclarationPillName>
                      {onPatch && (
                        <>
                          <DeclarationPillFlip
                            type="button"
                            onClick={() =>
                              assignDeclarationRole(entry, 'TARGET')
                            }
                            title="대상국으로 역할 전환"
                            aria-label={`${entry.name} 대상국으로 역할 전환`}
                          >
                            ⇄
                          </DeclarationPillFlip>
                          <DeclarationPillClear
                            type="button"
                            onClick={() =>
                              assignDeclarationRole(entry, 'PARTICIPANT')
                            }
                            title="선포국 역할 해제"
                            aria-label={`${entry.name} 선포국 역할 해제`}
                          >
                            ×
                          </DeclarationPillClear>
                        </>
                      )}
                    </DeclarationPill>
                  ))}
                </DeclarationPillList>
              ) : (
                <DeclarationEmpty>
                  {onPatch
                    ? '아래 참여국에서 ‘+ 선포국’을 누르거나 끌어 놓으세요'
                    : '선포국 미지정'}
                </DeclarationEmpty>
              )}
            </DeclarationLane>

            <DeclarationArrow aria-hidden>
              <FiArrowRight size={16} />
            </DeclarationArrow>

            <DeclarationCenterNode>
              <DeclarationCenterKicker>{dateLabel}</DeclarationCenterKicker>
              <DeclarationCenterTitle>{event.title}</DeclarationCenterTitle>
            </DeclarationCenterNode>

            <DeclarationArrow aria-hidden>
              <FiArrowRight size={16} />
            </DeclarationArrow>

            <DeclarationLane
              $dragOver={dragOverRole === 'TARGET'}
              data-declaration-lane="TARGET"
              onDragOver={(dragEvent) => {
                if (!onPatch) return
                dragEvent.preventDefault()
                if (dragOverRole !== 'TARGET') setDragOverRole('TARGET')
              }}
              onDragLeave={(dragEvent) => {
                if (
                  !dragEvent.currentTarget.contains(
                    dragEvent.relatedTarget as globalThis.Node | null,
                  )
                ) {
                  setDragOverRole((current) =>
                    current === 'TARGET' ? null : current,
                  )
                }
              }}
              onDrop={(dragEvent) => handleDropToRole(dragEvent, 'TARGET')}
            >
              <DeclarationLaneHead $initiator={false}>
                <span>대상국 · 피선포</span>
                {targetEntries.length > 0 && (
                  <span>{targetEntries.length}곳</span>
                )}
              </DeclarationLaneHead>
              {targetEntries.length > 0 ? (
                <DeclarationPillList>
                  {targetEntries.map((entry) => (
                    <DeclarationPill
                      key={entry.id}
                      $initiator={false}
                      draggable={Boolean(onPatch)}
                      onDragStart={(dragEvent) => {
                        const item = {
                          id: entry.id,
                          historical: entry.historical,
                        }
                        setDragCountry(item)
                        dragEvent.dataTransfer.effectAllowed = 'move'
                        dragEvent.dataTransfer.setData(
                          'text/plain',
                          encodeDragPayload(item),
                        )
                      }}
                      onDragEnd={() => {
                        setDragCountry(null)
                        setDragOverRole(null)
                      }}
                    >
                      <DeclarationPillName
                        type="button"
                        onClick={() => onCountryClick(entry.id)}
                      >
                        {entry.flagEmoji ? `${entry.flagEmoji} ` : ''}
                        {entry.name}
                      </DeclarationPillName>
                      {onPatch && (
                        <>
                          <DeclarationPillFlip
                            type="button"
                            onClick={() =>
                              assignDeclarationRole(entry, 'INITIATOR')
                            }
                            title="선포국으로 역할 전환"
                            aria-label={`${entry.name} 선포국으로 역할 전환`}
                          >
                            ⇄
                          </DeclarationPillFlip>
                          <DeclarationPillClear
                            type="button"
                            onClick={() =>
                              assignDeclarationRole(entry, 'PARTICIPANT')
                            }
                            title="대상국 역할 해제"
                            aria-label={`${entry.name} 대상국 역할 해제`}
                          >
                            ×
                          </DeclarationPillClear>
                        </>
                      )}
                    </DeclarationPill>
                  ))}
                </DeclarationPillList>
              ) : (
                <DeclarationEmpty>
                  {onPatch
                    ? '아래 참여국에서 ‘+ 대상국’을 누르거나 끌어 놓으세요'
                    : '대상국 미지정'}
                </DeclarationEmpty>
              )}
            </DeclarationLane>
          </DeclarationGrid>

          {onPatch && otherParticipants.length > 0 && (
            <QuickAssignBar aria-label="참여국 선포국·대상국 빠른 지정">
              <QuickAssignLabel>참여국 빠른 배정</QuickAssignLabel>
              {visibleParticipants.map((participant) => (
                <QuickAssignChip
                  key={`${participant.historical ? 'h' : 'c'}:${participant.id}`}
                  draggable
                  onDragStart={(dragEvent) => {
                    setDragCountry(participant)
                    dragEvent.dataTransfer.effectAllowed = 'move'
                    dragEvent.dataTransfer.setData(
                      'text/plain',
                      encodeDragPayload(participant),
                    )
                  }}
                  onDragEnd={() => {
                    setDragCountry(null)
                    setDragOverRole(null)
                  }}
                >
                  <DragName>
                    <MdDragIndicator aria-hidden />
                    {participant.name}
                  </DragName>
                  <QuickAssignBtn
                    type="button"
                    $initiator
                    onClick={() =>
                      assignDeclarationRole(participant, 'INITIATOR')
                    }
                  >
                    + 선포국
                  </QuickAssignBtn>
                  <QuickAssignBtn
                    type="button"
                    $initiator={false}
                    onClick={() => assignDeclarationRole(participant, 'TARGET')}
                  >
                    + 대상국
                  </QuickAssignBtn>
                </QuickAssignChip>
              ))}
              {otherParticipants.length > QUICK_ASSIGN_CAP && (
                <QuickAssignMoreBtn
                  type="button"
                  onClick={() =>
                    setShowAllParticipants((previous) => !previous)
                  }
                >
                  {showAllParticipants
                    ? '접기'
                    : `+${hiddenParticipantCount}개국 더 보기`}
                </QuickAssignMoreBtn>
              )}
            </QuickAssignBar>
          )}
        </DeclarationBoard>
      ) : (
        <S.EmptyGuide>
          <S.EmptyGuideBody>
            <S.EmptyGuideTitle>
              아직 연결된 국가 선전포고·개전 정본이 없습니다
            </S.EmptyGuideTitle>
            <S.EmptyGuideDesc>
              국가 정본으로 등록하면 선포국·대상국 원장과 전쟁 조망에 자동 반영되며, 의회 표결·결정 수반·종전 조약까지 함께 관리할 수 있습니다.
            </S.EmptyGuideDesc>
          </S.EmptyGuideBody>
          {onPatch && (
            <S.EmptyGuideActions>
              <S.EmptyPrimaryAction type="button" onClick={openCreateCanonical}>
                국가 선전포고 정본 등록·연결
                <FiArrowRight aria-hidden />
              </S.EmptyPrimaryAction>
              {onJumpToActors ? (
                <SecondaryJumpBtn type="button" onClick={onJumpToActors}>
                  참여 탭 열기
                </SecondaryJumpBtn>
              ) : null}
            </S.EmptyGuideActions>
          )}
        </S.EmptyGuide>
      )}

      {canonicalRows.length === 0 && entriesWithContext.length > 0 && (
        <Rows>
          {entriesWithContext.map((entry) => (
            <Row key={`${entry.role}:${entry.id}`}>
              <Head>
                <RoleTag $initiator={entry.role === 'INITIATOR'}>
                  {ROLE_LABEL[entry.role]}
                </RoleTag>
                <CountryButton
                  type="button"
                  onClick={() => onCountryClick(entry.id)}
                >
                  {entry.name}
                </CountryButton>
              </Head>
              {entry.roleDescription && (
                <ContextText>{entry.roleDescription}</ContextText>
              )}
              {entry.note && <NoteText>{entry.note}</NoteText>}
            </Row>
          ))}
        </Rows>
      )}

      <WarDeclarationFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingDto(null)
        }}
        editing={editingDto}
        defaultDeclaring={!editingDto ? defaultDeclaringPreset : null}
        defaultTarget={!editingDto ? defaultTargetPreset : null}
        defaultWarEvent={
          !editingDto && event.parentEvent
            ? { id: event.parentEvent.id, title: event.parentEvent.title }
            : null
        }
        defaultNarrativeEvent={{
          id: event.id,
          title: event.title,
          startEra: startParts && startParts.year < 0 ? 'BC' : 'AD',
          startYear: startParts ? Math.abs(startParts.year) : null,
          startMonth:
            startParts && event.startDatePrecision !== 'year'
              ? startParts.month
              : null,
          startDay:
            startParts &&
            event.startDatePrecision !== 'year' &&
            event.startDatePrecision !== 'month'
              ? startParts.day
              : null,
        }}
        onSaved={() => {
          void queryClient.invalidateQueries({
            queryKey: eventKeys.detail(event.id),
          })
        }}
      />
    </S.Section>
  )
}

/* ───────────────────────── styles ───────────────────────── */

const buttonReset = `
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
`

const RegisterCanonicalBtn = styled.button`
  ${buttonReset}
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};

  &:hover {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const SecondaryJumpBtn = styled.button`
  ${buttonReset}
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  color: ${metaText};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const CanonicalCardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const CanonicalCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-left: 3px solid ${({ theme }) => ledgerAccent(theme.mode)};
`

const CanonicalTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
`

const CanonicalMetaGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

const KindBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: ${RADIUS.PILL};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 11.5px;
  font-weight: 700;
`

const CanonicalDateText = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`

const CanonicalActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const LedgerJumpLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 600;
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const CanonicalEditBtn = styled.button`
  ${buttonReset}
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 600;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

const CanonicalPartiesRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`

const CanonicalPartyBtn = styled.button<{ $initiator: boolean }>`
  ${buttonReset}
  padding: 4px 11px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid
    ${({ theme, $initiator }) =>
      $initiator ? ledgerAccent(theme.mode) : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $initiator }) =>
    $initiator ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const CanonicalArrow = styled.span`
  font-size: 12px;
  color: ${metaText};
`

const CanonicalCasus = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.primary};

  strong {
    font-weight: 600;
    color: ${metaText};
  }
`

const CanonicalSummary = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CanonicalFactsBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const FactPill = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};

  strong {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const FactLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const ParentWarBanner = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  margin-bottom: 4px;
  padding: 6px 0 10px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  font-size: 12.5px;
`

const ParentWarLabel = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${metaText};
`

const ParentWarTitleLink = styled(Link)`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const ParentWarOverviewLink = styled(Link)`
  margin-left: auto;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const DeclarationBoard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 6px;
  padding: 4px 0 18px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
`

const DeclarationGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(140px, 0.85fr) auto minmax(0, 1fr);
  align-items: stretch;
  gap: 18px;

  @media (max-width: 680px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
`

const DeclarationLane = styled.div<{ $dragOver?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 20px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: 8px;
  border-left: 2.5px solid
    ${({ theme, $dragOver }) =>
      $dragOver ? ledgerAccent(theme.mode) : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $dragOver }) =>
    $dragOver ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  transition: border-color 0.14s, background 0.14s;
`

const DeclarationLaneHead = styled.div<{ $initiator: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme, $initiator }) =>
    $initiator ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
`

const DeclarationPillList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const DeclarationPill = styled.span<{ $initiator: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid
    ${({ theme, $initiator }) =>
      $initiator ? ledgerAccent(theme.mode) : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $initiator }) =>
    $initiator ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: grab;
`

const DeclarationPillName = styled.button`
  ${buttonReset}
  font-weight: 600;
  color: inherit;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const DeclarationPillFlip = styled.button`
  ${buttonReset}
  font-size: 11.5px;
  line-height: 1;
  color: ${metaText};
  opacity: 0.75;

  &:hover {
    opacity: 1;
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const DeclarationPillClear = styled.button`
  ${buttonReset}
  font-size: 13px;
  line-height: 1;
  color: ${metaText};
  opacity: 0.75;

  &:hover {
    opacity: 1;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const DeclarationEmpty = styled.span`
  font-size: 12px;
  color: ${metaText};
`

const DeclarationArrow = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  color: ${metaText};
  opacity: 0.7;

  @media (max-width: 680px) {
    display: none;
  }
`

const DeclarationCenterNode = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 4px 12px;
  border-left: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-right: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  text-align: center;

  @media (max-width: 680px) {
    border-left: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    border-right: 0;
    align-items: flex-start;
    text-align: left;
  }
`

const DeclarationCenterKicker = styled.span`
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const DeclarationCenterTitle = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.3;
`

const QuickAssignBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const QuickAssignLabel = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${metaText};
`

const DragName = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;

  svg {
    flex: none;
    color: ${metaText};
  }
`

const QuickAssignChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: grab;
`

const QuickAssignBtn = styled.button<{ $initiator: boolean }>`
  ${buttonReset}
  padding: 1px 6px;
  border-radius: ${RADIUS.XS};
  background: ${({ theme, $initiator }) =>
    $initiator
      ? ledgerAccentSubtle(theme.mode)
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(15,23,42,0.06)'};
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme, $initiator }) =>
    $initiator ? ledgerAccent(theme.mode) : theme.colors.text.secondary};

  &:hover {
    opacity: 0.85;
  }
`

const QuickAssignMoreBtn = styled.button`
  ${buttonReset}
  padding: 2px 9px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 11.5px;
  font-weight: 600;
  color: ${metaText};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const Rows = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`

const Row = styled.li`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:first-child {
    padding-top: 2px;
  }

  &:last-child {
    border-bottom: none;
  }
`

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
`

const RoleTag = styled.span<{ $initiator: boolean }>`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme, $initiator }) =>
    $initiator ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
`

const CountryButton = styled.button`
  ${buttonReset}
  font-size: 14.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const ContextText = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const NoteText = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: ${metaText};
`
