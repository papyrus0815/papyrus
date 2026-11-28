/**
 * 국가 상세 › 군사 › 선전포고 · 개전 원장 (?sub=declarations).
 *
 * 국가 주권 행위로서의 선전포고·최후통첩 개전·동맹 참전·무선전 기습 개전을
 * 방향(선포 ──▶ / ◀── 피선포)·헌정 절차(수반·내각·의회 표결)·상위 전쟁·종전 조약·보조 사건과 함께 관리한다.
 */
import { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiArrowRight,
  FiArrowUpRight,
  FiBookOpen,
  FiEdit2,
  FiFileText,
  FiPlus,
  FiSearch,
  FiShield,
  FiTrash2,
  FiX,
} from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { usePoliticalSystems } from '@/entities/political-system/api'
import {
  comparePoliticalSystems,
  WAR_POWER_AUTHORITY_LABEL,
} from '@/entities/political-system/model/political-system'
import {
  formatWarDeclarationDate,
  formatWarDeclarationEndDate,
  formatWarDeclarationSeveranceDate,
  WAR_DECLARATION_KIND_LABELS,
  WAR_DECLARATION_KIND_ORDER,
  type WarDeclarationDirectionFilter,
  type WarDeclarationDto,
  type WarDeclarationKind,
  WAR_TERMINATION_KIND_LABELS,
  warDeclarationApi,
  warDeclarationKeys,
} from '@/shared/api/war-declaration'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { EmptyStateSpotlight } from '@/shared/ui/empty-state/empty-state'
import { LedgerTableSkeleton } from '@/shared/ui/ledger-skeleton'
import { PrimaryActionButton } from '@/shared/ui/primary-action-button'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/shared/ui/searchable-select'
import { notify } from '@/shared/ui/toast'
import {
  UnderlineTabBadge,
  UnderlineTabButton,
  UnderlineTabNav,
} from '@/shared/ui/underline-tabs'
import { EventInlineModal } from '@/widgets/event/event-inline-modal/event-inline-modal'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
  LedgerSearchBox,
  LedgerSearchInput,
} from './country-ledger-primitives'
import {
  type PartyPreset,
  WarDeclarationFormModal,
} from './war-declaration-form-modal'

export interface CountryWarDeclarationsPanelProps {
  country: UnifiedCountry
  linkedHistoricalCountryIds?: string[]
}

function toCenturyIndex(
  era: string | null | undefined,
  year: number | null | undefined,
): number | null {
  if (!year || year <= 0) return null
  return era === 'BC' ? -Math.ceil(year / 100) : Math.ceil(year / 100)
}

function formatCenturyHeading(centuryIdx: number): string {
  return centuryIdx < 0
    ? `기원전 ${Math.abs(centuryIdx)}세기`
    : `${centuryIdx}세기`
}

export function CountryWarDeclarationsPanel({
  country,
  linkedHistoricalCountryIds = [],
}: CountryWarDeclarationsPanelProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isHistorical = country.type === 'historical'

  const [directionFilter, setDirectionFilter] =
    useState<WarDeclarationDirectionFilter>('ALL')
  const [kindFilter, setKindFilter] = useState<string>('ALL')
  const [polityFilter, setPolityFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WarDeclarationDto | null>(null)
  const [formDefaultDirection, setFormDefaultDirection] = useState<
    'ISSUED' | 'RECEIVED'
  >('ISSUED')
  const [previewEventId, setPreviewEventId] = useState<string | null>(null)

  const selfHistoricalIdSet = useMemo(() => {
    const set = new Set<string>(linkedHistoricalCountryIds)
    if (isHistorical && country.id) set.add(country.id)
    return set
  }, [isHistorical, country.id, linkedHistoricalCountryIds])

  const declarationsQuery = useQuery({
    queryKey: warDeclarationKeys.countryScope(
      isHistorical ? 'hist' : 'mod',
      country.id,
      isHistorical,
    ),
    queryFn: () =>
      warDeclarationApi.list(
        isHistorical
          ? { historicalCountryId: country.id, includeConstituents: true }
          : { countryId: country.id },
      ),
    staleTime: 60_000,
  })

  const politicalSystemsQuery = usePoliticalSystems(
    isHistorical
      ? { historicalCountryId: country.id, includeConstituents: true }
      : { countryId: country.id },
  )

  const latestConfiguredRegime = useMemo(() => {
    const sorted = [...(politicalSystemsQuery.data ?? [])].sort(
      comparePoliticalSystems,
    )
    const withWarPower = sorted.filter(
      (s) => s.warPowerAuthority || s.commanderInChiefPosition || s.warPowerNotes,
    )
    if (withWarPower.length === 0) return null
    return (
      withWarPower.find((s) => s.isCurrent) ??
      withWarPower[withWarPower.length - 1]
    )
  }, [politicalSystemsQuery.data])

  const isSelfParty = (
    modId: string | null,
    histId: string | null,
  ): boolean => {
    if (!isHistorical && modId && modId === country.id) return true
    if (histId && selfHistoricalIdSet.has(histId)) return true
    return false
  }

  const allRows = declarationsQuery.data ?? []

  const enrichedRows = useMemo(() => {
    return allRows.map((row) => {
      const issuedBySelf = isSelfParty(
        row.declaringCountryId,
        row.declaringHistoricalCountryId,
      )
      const receivedBySelf = isSelfParty(
        row.targetCountryId,
        row.targetHistoricalCountryId,
      )
      const selfPolity = issuedBySelf
        ? (row.declaringHistoricalCountry ?? row.declaringCountry)
        : (row.targetHistoricalCountry ?? row.targetCountry)
      const counterpart = issuedBySelf
        ? (row.targetHistoricalCountry ?? row.targetCountry)
        : (row.declaringHistoricalCountry ?? row.declaringCountry)
      const counterpartIsHistorical = issuedBySelf
        ? Boolean(row.targetHistoricalCountryId)
        : Boolean(row.declaringHistoricalCountryId)

      return {
        row,
        issuedBySelf,
        receivedBySelf,
        selfPolity,
        counterpart,
        counterpartIsHistorical,
      }
    })
  }, [allRows, selfHistoricalIdSet, isHistorical, country.id])

  const directionCounts = useMemo(() => {
    let issued = 0
    let received = 0
    for (const item of enrichedRows) {
      if (item.issuedBySelf) issued += 1
      if (item.receivedBySelf) received += 1
    }
    return {
      ALL: enrichedRows.length,
      ISSUED: issued,
      RECEIVED: received,
    }
  }, [enrichedRows])

  const polityOptions = useMemo<SearchableSelectOption[]>(() => {
    const map = new Map<string, string>()
    for (const item of enrichedRows) {
      if (item.selfPolity?.id && item.selfPolity.name) {
        map.set(item.selfPolity.id, item.selfPolity.name)
      }
    }
    return [
      { value: 'ALL', label: '전체 시대·정치체' },
      ...Array.from(map.entries()).map(([id, name]) => ({
        value: id,
        label: name,
      })),
    ]
  }, [enrichedRows])

  const kindOptions = useMemo<SearchableSelectOption[]>(() => {
    return [
      { value: 'ALL', label: '전체 개전 유형' },
      ...WAR_DECLARATION_KIND_ORDER.map((k) => ({
        value: k,
        label: WAR_DECLARATION_KIND_LABELS[k],
      })),
    ]
  }, [])

  const visibleRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return enrichedRows.filter((item) => {
      if (directionFilter === 'ISSUED' && !item.issuedBySelf) return false
      if (directionFilter === 'RECEIVED' && !item.receivedBySelf) return false
      if (kindFilter !== 'ALL' && item.row.kind !== kindFilter) return false
      if (polityFilter !== 'ALL' && item.selfPolity?.id !== polityFilter) {
        return false
      }
      if (q) {
        const hay = [
          item.row.displayTitle,
          item.row.casusBelli ?? '',
          item.row.summary ?? '',
          item.selfPolity?.name ?? '',
          item.counterpart?.name ?? '',
          item.row.warEvent?.title ?? '',
          item.row.narrativeEvent?.title ?? '',
          item.row.peaceTreaty?.name ?? '',
          item.row.approvedChamber?.name ?? '',
        ]
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [
    enrichedRows,
    directionFilter,
    kindFilter,
    polityFilter,
    searchQuery,
  ])

  const groupedByCentury = useMemo(() => {
    const groups: Array<{
      key: string
      heading: string
      items: typeof visibleRows
    }> = []
    let currentKey: string | null = null
    for (const item of visibleRows) {
      const cIdx = toCenturyIndex(item.row.declaredEra, item.row.declaredYear)
      const key = cIdx != null ? String(cIdx) : 'unknown'
      const heading = cIdx != null ? formatCenturyHeading(cIdx) : '시기 미상'
      if (key !== currentKey) {
        groups.push({ key, heading, items: [item] })
        currentKey = key
      } else {
        groups[groups.length - 1].items.push(item)
      }
    }
    return groups
  }, [visibleRows])

  const selfPreset: PartyPreset = useMemo(
    () => ({
      id: country.id,
      name: country.name,
      flagEmoji: !isHistorical ? country.flagEmoji : null,
      isHistorical,
    }),
    [country.id, country.name, country.flagEmoji, isHistorical],
  )

  const openCreate = (dir: 'ISSUED' | 'RECEIVED' = 'ISSUED') => {
    setEditingItem(null)
    setFormDefaultDirection(dir)
    setFormOpen(true)
  }

  const handleDelete = async (row: WarDeclarationDto) => {
    const ok = await confirm({
      title: '선전포고·개전 기록 삭제',
      message: `「${row.displayTitle}」 정본 기록을 삭제할까요? 연결된 보조 사건이나 상위 전쟁 자체는 삭제되지 않습니다.`,
      confirmLabel: '삭제',
      danger: true,
    })
    if (!ok) return
    try {
      await warDeclarationApi.remove(row.id)
      await queryClient.invalidateQueries({ queryKey: warDeclarationKeys.all })
      notify.success('선전포고·개전 기록을 삭제했습니다.')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    }
  }

  return (
    <Wrapper aria-label="국가 선전포고 및 개전 원장">
      {/* 헌정 체제상 개전·선전포고권 요약 바 */}
      <ConstitutionalStrip>
        <div className="info">
          <FiShield size={14} aria-hidden />
          <span className="kicker">헌법상 개전·선전포고권</span>
          {latestConfiguredRegime ? (
            <span className="rule">
              <strong>
                {latestConfiguredRegime.warPowerAuthority
                  ? WAR_POWER_AUTHORITY_LABEL[
                      latestConfiguredRegime.warPowerAuthority
                    ]
                  : '통수권 규정'}
              </strong>
              {latestConfiguredRegime.warConsentChamber
                ? ` · ${latestConfiguredRegime.warConsentChamber.name} 동의`
                : ''}
              {latestConfiguredRegime.commanderInChiefPosition
                ? ` · 통수권자: ${latestConfiguredRegime.commanderInChiefPosition.title}`
                : ''}
              {latestConfiguredRegime.name
                ? ` (${latestConfiguredRegime.name})`
                : ''}
            </span>
          ) : (
            <span className="empty">
              아직 정체·헌정에 개전·선전포고권 규칙이 설정되지 않았습니다.
            </span>
          )}
        </div>
        <StripLinkBtn
          type="button"
          onClick={() =>
            navigate(`${pathKeys.countryGovernment(country.id)}?sub=political-system`)
          }
        >
          정체·헌정에서 설정
          <FiArrowRight size={12} aria-hidden />
        </StripLinkBtn>
      </ConstitutionalStrip>

      {declarationsQuery.isLoading ? (
        <LedgerTableSkeleton
          rows={5}
          columns={4}
          showToolbar={false}
          label="선전포고·개전 원장을 불러오는 중"
        />
      ) : allRows.length === 0 ? (
        <EmptyStateSpotlight
          flat
          icon={<FiShield size={22} />}
          title="등록된 선전포고 · 개전 원장이 없습니다"
          description="이 국가(및 연결된 과거 정치체)가 전쟁을 선포했거나 선포받은 주권 행위를 국가 원장에 직접 등록하세요. 외교 비화·연설 등 서사가 필요한 경우에만 보조 사건을 선택적으로 연결할 수 있습니다."
          primaryAction={{
            label: '첫 선전포고 · 개전 기록 등록',
            onClick: () => openCreate('ISSUED'),
          }}
        />
      ) : (
        <>
          <TopTabRow>
            <UnderlineTabNav as="nav" aria-label="선전포고 방향 필터">
              <UnderlineTabButton
                type="button"
                $active={directionFilter === 'ALL'}
                onClick={() => setDirectionFilter('ALL')}
              >
                <span>전체</span>
                <UnderlineTabBadge $active={directionFilter === 'ALL'}>
                  {directionCounts.ALL}
                </UnderlineTabBadge>
              </UnderlineTabButton>
              <UnderlineTabButton
                type="button"
                $active={directionFilter === 'ISSUED'}
                onClick={() => setDirectionFilter('ISSUED')}
              >
                <span>선포 · 개전 주도</span>
                <UnderlineTabBadge $active={directionFilter === 'ISSUED'}>
                  {directionCounts.ISSUED}
                </UnderlineTabBadge>
              </UnderlineTabButton>
              <UnderlineTabButton
                type="button"
                $active={directionFilter === 'RECEIVED'}
                onClick={() => setDirectionFilter('RECEIVED')}
              >
                <span>피선포 · 상대국 선포</span>
                <UnderlineTabBadge $active={directionFilter === 'RECEIVED'}>
                  {directionCounts.RECEIVED}
                </UnderlineTabBadge>
              </UnderlineTabButton>
            </UnderlineTabNav>

            <PrimaryActionButton
              type="button"
              onClick={() =>
                openCreate(
                  directionFilter === 'RECEIVED' ? 'RECEIVED' : 'ISSUED',
                )
              }
            >
              <FiPlus size={14} />
              선전포고 · 개전 등록
            </PrimaryActionButton>
          </TopTabRow>

          <ToolbarRow>
            <LedgerSearchBox style={{ flex: '1 1 220px', maxWidth: 340 }}>
              <FiSearch size={14} />
              <LedgerSearchInput
                value={searchQuery}
                onChange={(ev) => setSearchQuery(ev.target.value)}
                placeholder="상대국 · 개전 명분 · 상위 전쟁 · 조약 검색..."
                aria-label="선전포고 원장 검색"
              />
              {searchQuery ? (
                <ClearBtn
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="검색어 지우기"
                >
                  <FiX size={13} />
                </ClearBtn>
              ) : null}
            </LedgerSearchBox>

            <div style={{ minWidth: 168 }}>
              <SearchableSelect
                options={kindOptions}
                value={kindFilter}
                onChange={(next) => setKindFilter(next || 'ALL')}
                ariaLabel="개전 유형 필터"
              />
            </div>

            {polityOptions.length > 2 ? (
              <div style={{ minWidth: 180 }}>
                <SearchableSelect
                  options={polityOptions}
                  value={polityFilter}
                  onChange={(next) => setPolityFilter(next || 'ALL')}
                  ariaLabel="시대·정치체 필터"
                />
              </div>
            ) : null}
          </ToolbarRow>

          {visibleRows.length === 0 ? (
            <FilteredEmpty>
              선택한 조건에 일치하는 선전포고·개전 기록이 없습니다.
            </FilteredEmpty>
          ) : (
            <LedgerSurface>
              <LedgerHeader>
                <span>시점</span>
                <span>방향 · 유형</span>
                <span>당사국 구도 · 개전 명분</span>
                <span>헌정 절차 · 상위 전쟁 · 종결</span>
                <span aria-hidden />
              </LedgerHeader>

              {groupedByCentury.map((group) => (
                <CenturySection key={group.key}>
                  <CenturyHeading>{group.heading}</CenturyHeading>
                  {group.items.map((item) => {
                    const { row, issuedBySelf } = item
                    const declaring =
                      row.declaringHistoricalCountry ?? row.declaringCountry
                    const target =
                      row.targetHistoricalCountry ?? row.targetCountry
                    const endLabel = formatWarDeclarationEndDate(row)
                    const sevLabel = formatWarDeclarationSeveranceDate(row)
                    const decisionPerson = row.decidedByPerson
                      ? getPersonDisplayName({
                          ...row.decidedByPerson,
                          name: row.decidedByPerson.name ?? '',
                        })
                      : null
                    const decisionRole =
                      row.decidedByTenure?.title ??
                      row.decidedByTenure?.positionDefinition?.title ??
                      null

                    return (
                      <LedgerRow key={row.id}>
                        <DateCol>
                          <span className="main">
                            {formatWarDeclarationDate(row)}
                          </span>
                          {sevLabel ? (
                            <span className="sub">단교 {sevLabel}</span>
                          ) : null}
                          {endLabel ? (
                            <span className="sub">~ {endLabel}</span>
                          ) : null}
                        </DateCol>

                        <KindCol>
                          <DirectionBadge $issued={issuedBySelf}>
                            {issuedBySelf ? '선포 ──▶' : '◀── 피선포'}
                          </DirectionBadge>
                          <KindLabel>
                            {WAR_DECLARATION_KIND_LABELS[row.kind] ?? row.kind}
                          </KindLabel>
                        </KindCol>

                        <MainCol>
                          <PartyLine>
                            {declaring ? (
                              <CountryLink
                                to={pathKeys.countryDetail(declaring.id)}
                                $highlight={issuedBySelf}
                              >
                                {row.declaringCountry?.flagEmoji
                                  ? `${row.declaringCountry.flagEmoji} `
                                  : ''}
                                {declaring.name}
                              </CountryLink>
                            ) : (
                              <span>미상</span>
                            )}
                            <ArrowSep aria-hidden>──▶</ArrowSep>
                            {target ? (
                              <CountryLink
                                to={pathKeys.countryDetail(target.id)}
                                $highlight={!issuedBySelf}
                              >
                                {row.targetCountry?.flagEmoji
                                  ? `${row.targetCountry.flagEmoji} `
                                  : ''}
                                {target.name}
                              </CountryLink>
                            ) : (
                              <span>미상</span>
                            )}
                          </PartyLine>

                          {row.casusBelli ? (
                            <CasusBelliText>{row.casusBelli}</CasusBelliText>
                          ) : row.summary ? (
                            <CasusBelliText>{row.summary}</CasusBelliText>
                          ) : null}
                        </MainCol>

                        <ContextCol>
                          {(decisionPerson ||
                            row.cabinet ||
                            row.approvedChamber ||
                            row.yeas != null) && (
                            <MetaChipRow>
                              {decisionPerson ? (
                                <MetaTag>
                                  {decisionPerson}
                                  {decisionRole ? ` (${decisionRole})` : ''}
                                </MetaTag>
                              ) : null}
                              {row.cabinet?.name ? (
                                <MetaTag>{row.cabinet.name}</MetaTag>
                              ) : null}
                              {row.approvedChamber ? (
                                <MetaTag>
                                  {row.approvedChamber.name}
                                  {row.yeas != null && row.nays != null
                                    ? ` ${row.yeas}:${row.nays}`
                                    : ' 의결'}
                                </MetaTag>
                              ) : null}
                            </MetaChipRow>
                          )}

                          <LinksRow>
                            {row.warEvent ? (
                              <ContextLinkChip
                                type="button"
                                onClick={() =>
                                  setPreviewEventId(row.warEvent!.id)
                                }
                                title="상위 전쟁 미리보기"
                              >
                                <FiShield size={11.5} />
                                <span>{row.warEvent.title}</span>
                              </ContextLinkChip>
                            ) : null}

                            {row.ultimatumEvent ? (
                              <ContextLinkChip
                                type="button"
                                onClick={() =>
                                  setPreviewEventId(row.ultimatumEvent!.id)
                                }
                                title="선행 최후통첩 사건 미리보기"
                              >
                                <FiFileText size={11.5} />
                                <span>최후통첩: {row.ultimatumEvent.title}</span>
                              </ContextLinkChip>
                            ) : null}

                            {row.narrativeEvent ? (
                              <ContextLinkChip
                                type="button"
                                $accent
                                onClick={() =>
                                  setPreviewEventId(row.narrativeEvent!.id)
                                }
                                title="보조 서술 사건 열기"
                              >
                                <FiBookOpen size={11.5} />
                                <span>보조 사건: {row.narrativeEvent.title}</span>
                                <FiArrowUpRight size={11} />
                              </ContextLinkChip>
                            ) : null}

                            {row.peaceTreaty ? (
                              <ContextLinkChip
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `${pathKeys.countryTreaty(country.id)}?treatyId=${encodeURIComponent(row.peaceTreaty!.id)}`,
                                  )
                                }
                                title="종결 강화조약 보기"
                              >
                                <FiFileText size={11.5} />
                                <span>{row.peaceTreaty.name}</span>
                              </ContextLinkChip>
                            ) : row.terminationKind ? (
                              <MetaTag>
                                {WAR_TERMINATION_KIND_LABELS[
                                  row.terminationKind
                                ] ?? row.terminationKind}
                              </MetaTag>
                            ) : null}
                          </LinksRow>
                        </ContextCol>

                        <ActionsCol>
                          <RowIconBtn
                            type="button"
                            onClick={() => {
                              setEditingItem(row)
                              setFormOpen(true)
                            }}
                            aria-label={`${row.displayTitle} 수정`}
                            title="수정"
                          >
                            <FiEdit2 size={13.5} />
                          </RowIconBtn>
                          <RowIconBtn
                            type="button"
                            $danger
                            onClick={() => void handleDelete(row)}
                            aria-label={`${row.displayTitle} 삭제`}
                            title="삭제"
                          >
                            <FiTrash2 size={13.5} />
                          </RowIconBtn>
                        </ActionsCol>
                      </LedgerRow>
                    )
                  })}
                </CenturySection>
              ))}
            </LedgerSurface>
          )}
        </>
      )}

      <WarDeclarationFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingItem(null)
        }}
        editing={editingItem}
        defaultDeclaring={
          !editingItem && formDefaultDirection === 'ISSUED' ? selfPreset : null
        }
        defaultTarget={
          !editingItem && formDefaultDirection === 'RECEIVED'
            ? selfPreset
            : null
        }
      />

      <EventInlineModal
        eventId={previewEventId}
        onClose={() => setPreviewEventId(null)}
        onNavigate={(targetEventId) => {
          setPreviewEventId(null)
          navigate(pathKeys.events.detail(targetEventId))
        }}
      />
    </Wrapper>
  )
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
`

const ConstitutionalStrip = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-size: 12.5px;

  .info {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  .kicker {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  .rule strong {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    font-weight: 600;
  }

  .empty {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const StripLinkBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const TopTabRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  padding-bottom: 2px;
`

const ToolbarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

const ClearBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  padding: 2px;
`

const FilteredEmpty = styled.div`
  padding: 36px 16px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 13px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: 10px;
`

const LedgerSurface = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: 12px;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  overflow: hidden;
`

const LedgerHeader = styled.div`
  display: grid;
  grid-template-columns: 112px 132px minmax(220px, 1.3fr) minmax(220px, 1.2fr) 68px;
  gap: 12px;
  padding: 9px 16px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};

  @media (max-width: 960px) {
    display: none;
  }
`

const CenturySection = styled.div`
  display: flex;
  flex-direction: column;
`

const CenturyHeading = styled.div`
  padding: 10px 16px 6px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const LedgerRow = styled.div`
  display: grid;
  grid-template-columns: 112px 132px minmax(220px, 1.3fr) minmax(220px, 1.2fr) 68px;
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  transition: background 120ms ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
`

const DateCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  ${DIGIT_DISPLAY}

  .main {
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  .sub {
    font-size: 11.5px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const KindCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
`

const DirectionBadge = styled.span<{ $issued: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
  background: ${({ $issued }) =>
    $issued ? 'rgba(220, 38, 38, 0.1)' : 'rgba(37, 99, 235, 0.1)'};
  color: ${({ $issued }) => ($issued ? '#dc2626' : '#2563eb')};
`

const KindLabel = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MainCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const PartyLine = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 13.5px;
`

const CountryLink = styled(Link)<{ $highlight?: boolean }>`
  color: ${({ theme, $highlight }) =>
    $highlight ? theme.colors.text.primary : theme.colors.text.secondary};
  font-weight: ${({ $highlight }) => ($highlight ? 700 : 500)};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
  }
`

const ArrowSep = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CasusBelliText = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.45;
`

const ContextCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
`

const MetaChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`

const MetaTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LinksRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`

const ContextLinkChip = styled.button<{ $accent?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: 5px;
  border: 1px solid
    ${({ theme, $accent }) =>
      $accent ? ledgerAccent(theme.mode) : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $accent }) =>
    $accent ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $accent }) =>
    $accent ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const ActionsCol = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
`

const RowIconBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    color: ${({ theme, $danger }) =>
      $danger ? '#dc2626' : theme.colors.text.primary};
  }
`
