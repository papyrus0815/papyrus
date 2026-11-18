import React, { useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  FiAnchor,
  FiArrowRight,
  FiArrowUpRight,
  FiCalendar,
  FiCompass,
  FiEdit2,
  FiExternalLink,
  FiGitCommit,
  FiGlobe,
  FiShield,
  FiUser,
  FiUsers,
} from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { SIDE_UNIT_ROLE_LABEL } from '@/pages/events/detail/components/side-orbat.lib'
import { SIDE_OUTCOME_LABEL } from '@/pages/events/detail/components/side-outcome'
import {
  militaryUnitApi,
  type MilitaryUnitDatePartsDto,
  type MilitaryUnitLineageDto,
  type MilitaryUnitTenureItem,
} from '@/shared/api/military-unit'
import { getUploadImageUrl } from '@/shared/api/upload'
import { militaryUnitTypeLabelKo } from '@/shared/lib/military-unit-type-label'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { HeadquartersMapPreview } from '@/shared/ui/headquarters-location-field'
import { SidePanel } from '@/shared/ui/side-panel'
import {
  LedgerCompactAction,
  LedgerToolbarButton,
} from '@/widgets/country/country-detail/ui/country-ledger-primitives'
import { shouldInterceptEntityClick } from '@/widgets/country/country-inline-modal/country-inline-modal'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'

const BRANCH_LABELS: Record<string, string> = {
  ARMY: '육군',
  NAVY: '해군',
  AIR_FORCE: '공군',
  MARINE_CORPS: '해병대',
  COAST_GUARD: '해안경비대',
  SPACE_FORCE: '우주군',
  JOINT: '합동',
  OTHER: '기타',
}

const TRANSITION_KIND_KO: Record<string, string> = {
  REORGANIZE: '개편',
  RENAME: '개칭',
  MERGE: '통합',
  SPLIT: '분할',
  ABSORBED: '흡수',
}

interface DrawerUnitDetail {
  id: string
  name: string
  nameLocal?: string | null
  nameEn?: string | null
  abbreviation?: string | null
  unitType?: string | null
  branch?: string | null
  isActive?: boolean | null
  nickname?: string | null
  motto?: string | null
  garrison?: string | null
  strength?: string | null
  primaryMission?: string | null
  jurisdiction?: string | null
  notableBattles?: string | null
  honors?: string | null
  insigniaUrl?: string | null
  description?: string | null
  established?: MilitaryUnitDatePartsDto | null
  disbanded?: MilitaryUnitDatePartsDto | null
  establishedDate?: string | null
  disbandedDate?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  country?: { id: string; name: string } | null
  historicalCountry?: { id: string; name: string } | null
  administrationDepartment?: {
    id: string
    name: string
    abbreviation?: string | null
  } | null
  parentUnit?: {
    id: string
    name: string
    unitType?: string | null
  } | null
  subUnits?: Array<{
    id: string
    name: string
    abbreviation?: string | null
    unitType?: string | null
    branch?: string | null
  }>
  predecessors?: MilitaryUnitLineageDto[]
  successors?: MilitaryUnitLineageDto[]
  tenures?: MilitaryUnitTenureItem[]
  commanders?: Array<{
    id: string
    tenureId?: string | null
    personId: string
    rank?: string | null
    role?: string | null
    person?: { id: string; name: string; surname?: string | null } | null
  }>
  assignedNavalVessels?: Array<{
    id: string
    name: string
    vesselType?: string | null
  }>
  sideDeployedUnits?: Array<{
    id: string
    role?: string | null
    note?: string | null
    side?: {
      id: string
      name: string
      outcome?: string | null
      event?: {
        id: string
        title: string
        kind?: string | null
        startEra?: string | null
        startYear?: number | null
        startDate?: string | null
        parentEventId?: string | null
      } | null
    } | null
  }>
}

function formatPartsOrIso(
  parts: MilitaryUnitDatePartsDto | null | undefined,
  iso: string | null | undefined,
): string {
  if (parts?.year && parts.year > 0) {
    const prefix = parts.era === 'BC' ? 'BC ' : ''
    const m =
      parts.month != null ? `.${String(parts.month).padStart(2, '0')}` : ''
    return `${prefix}${parts.year}${m}`
  }
  if (iso) return iso.slice(0, 10)
  return ''
}

export interface MilitaryUnitDetailDrawerProps {
  unitId: string | null
  listSearch?: string
  onClose: () => void
  onSelectUnit: (nextUnitId: string) => void
  onEditUnit: (unitId: string) => void
}

export function MilitaryUnitDetailDrawer({
  unitId,
  listSearch = '',
  onClose,
  onSelectUnit,
  onEditUnit,
}: MilitaryUnitDetailDrawerProps) {
  const navigate = useNavigate()
  const [inspectPersonId, setInspectPersonId] = useState<string | null>(null)

  const detailQuery = useQuery({
    queryKey: ['military-unit', 'detail', unitId],
    queryFn: () =>
      militaryUnitApi.getById(unitId!) as unknown as Promise<DrawerUnitDetail>,
    enabled: Boolean(unitId),
    staleTime: 30_000,
  })

  const unit = detailQuery.data ?? null
  const countryName =
    unit?.historicalCountry?.name ?? unit?.country?.name ?? null
  const countryIdForLink =
    unit?.historicalCountry?.id ?? unit?.country?.id ?? null

  const estStr = unit
    ? formatPartsOrIso(unit.established, unit.establishedDate)
    : ''
  const disStr = unit
    ? formatPartsOrIso(unit.disbanded, unit.disbandedDate)
    : ''
  const isDisbanded = unit?.isActive === false || Boolean(disStr)
  const periodLabel =
    estStr || disStr
      ? `${estStr || '?'} ~ ${disStr || (unit?.isActive === false ? '해체' : '현재')}`
      : unit?.isActive === false
        ? '해체'
        : '연도 미등록'

  return (
    <>
      <SidePanel
        isOpen={Boolean(unitId)}
        onClose={onClose}
        width="min(640px, 96vw)"
        title={unit ? unit.name : '사령부 · 부대 요약'}
        subtitle={
          unit
            ? [
                unit.unitType ? militaryUnitTypeLabelKo(unit.unitType) : null,
                unit.branch
                  ? (BRANCH_LABELS[unit.branch] ?? unit.branch)
                  : null,
                countryName,
              ]
                .filter(Boolean)
                .join(' · ')
            : undefined
        }
        headerActions={
          unit ? (
            <DrawerHeaderActions>
              <LedgerCompactAction
                type="button"
                onClick={() => onEditUnit(unit.id)}
              >
                <FiEdit2 size={12} /> 수정
              </LedgerCompactAction>
              <LedgerToolbarButton
                type="button"
                $active
                onClick={() =>
                  navigate(pathKeys.militaryUnitDetail(unit.id), {
                    state: { listSearch },
                  })
                }
              >
                <FiExternalLink size={13} /> 단독 상세 열기
              </LedgerToolbarButton>
            </DrawerHeaderActions>
          ) : undefined
        }
      >
        {detailQuery.isLoading || !unit ? (
          <LoadingBox>사령부·부대 상세 정보를 불러오는 중입니다…</LoadingBox>
        ) : (
          <DrawerBody>
            <HeroRow>
              {unit.insigniaUrl ? (
                <InsigniaImg
                  src={getUploadImageUrl(unit.insigniaUrl)}
                  alt=""
                  onError={(evt) => {
                    evt.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <InsigniaFallback>
                  <FiShield size={20} />
                </InsigniaFallback>
              )}
              <HeroTexts>
                <BadgeRow>
                  <AccentBadge>
                    {unit.unitType
                      ? militaryUnitTypeLabelKo(unit.unitType)
                      : '편제'}
                  </AccentBadge>
                  {unit.branch ? (
                    <NeutralBadge>
                      {BRANCH_LABELS[unit.branch] ?? unit.branch}
                    </NeutralBadge>
                  ) : null}
                  <StatusPill $disbanded={isDisbanded}>
                    {isDisbanded ? '해체·종결' : '존속·현역'}
                  </StatusPill>
                </BadgeRow>
                <TitleText>
                  {unit.name}
                  {unit.abbreviation ? ` (${unit.abbreviation})` : ''}
                  {unit.nickname ? ` “${unit.nickname}”` : ''}
                </TitleText>
                {unit.nameLocal || unit.nameEn ? (
                  <SubLine>
                    {[unit.nameLocal, unit.nameEn].filter(Boolean).join(' · ')}
                  </SubLine>
                ) : null}
                {unit.motto ? <SubLine>표어: {unit.motto}</SubLine> : null}
              </HeroTexts>
            </HeroRow>

            <MetaStrip>
              <MetaCell>
                <MetaLabel>
                  <FiCalendar size={11} /> 존속 기간
                </MetaLabel>
                <MetaVal>{periodLabel}</MetaVal>
              </MetaCell>
              <MetaCell>
                <MetaLabel>
                  <FiGlobe size={11} /> 소속 국가
                </MetaLabel>
                <MetaVal>
                  {countryName && countryIdForLink ? (
                    <InlineJumpLink
                      to={pathKeys.countryMilitary(countryIdForLink, unit.id)}
                    >
                      {countryName} <FiArrowUpRight size={11} />
                    </InlineJumpLink>
                  ) : (
                    '미지정'
                  )}
                </MetaVal>
              </MetaCell>
              {unit.strength ? (
                <MetaCell>
                  <MetaLabel>
                    <FiUsers size={11} /> 편제 규모
                  </MetaLabel>
                  <MetaVal>{unit.strength}</MetaVal>
                </MetaCell>
              ) : null}
              {unit.administrationDepartment ? (
                <MetaCell>
                  <MetaLabel>
                    <FiShield size={11} /> 소관 부처
                  </MetaLabel>
                  <MetaVal>
                    <InlineJumpLink
                      to={pathKeys.government.departmentDetail(
                        unit.administrationDepartment.id,
                      )}
                    >
                      {unit.administrationDepartment.name}
                    </InlineJumpLink>
                  </MetaVal>
                </MetaCell>
              ) : null}
            </MetaStrip>

            {unit.garrison?.trim() ? (
              <HeadquartersMapPreview
                headquarters={unit.garrison}
                countryName={countryName}
                departmentName={unit.name}
                showHeadline
              />
            ) : null}

            {unit.primaryMission ||
            unit.jurisdiction ||
            unit.notableBattles ||
            unit.honors ? (
              <ContextGrid>
                {unit.primaryMission ? (
                  <ContextCard>
                    <ContextLabel>주요 임무 · 역할</ContextLabel>
                    <ContextText>{unit.primaryMission}</ContextText>
                  </ContextCard>
                ) : null}
                {unit.jurisdiction ? (
                  <ContextCard>
                    <ContextLabel>관할 · 작전구역</ContextLabel>
                    <ContextText>{unit.jurisdiction}</ContextText>
                  </ContextCard>
                ) : null}
                {unit.notableBattles ? (
                  <ContextCard>
                    <ContextLabel>주요 전투 · 작전</ContextLabel>
                    <ContextText>{unit.notableBattles}</ContextText>
                  </ContextCard>
                ) : null}
                {unit.honors ? (
                  <ContextCard>
                    <ContextLabel>부대 표창 · 수훈</ContextLabel>
                    <ContextText>{unit.honors}</ContextText>
                  </ContextCard>
                ) : null}
              </ContextGrid>
            ) : null}

            {unit.description ? <ProseBox>{unit.description}</ProseBox> : null}

            {/* 지휘 계통 및 예하 편제 */}
            <DrawerSection>
              <SectionTitle>지휘 계통 · 예하 편제</SectionTitle>
              <ChainLine>
                {unit.parentUnit ? (
                  <UnitChipBtn
                    type="button"
                    onClick={() => onSelectUnit(unit.parentUnit!.id)}
                  >
                    {unit.parentUnit.unitType
                      ? `${militaryUnitTypeLabelKo(unit.parentUnit.unitType)} · `
                      : ''}
                    {unit.parentUnit.name}
                  </UnitChipBtn>
                ) : (
                  <MutedText>최상위 편제</MutedText>
                )}
                <FiArrowRight size={12} />
                <AccentBadge>{unit.name}</AccentBadge>
              </ChainLine>

              {(unit.subUnits ?? []).length > 0 ? (
                <ChipWrap>
                  {(unit.subUnits ?? []).map((sub) => (
                    <UnitChipBtn
                      key={sub.id}
                      type="button"
                      onClick={() => onSelectUnit(sub.id)}
                    >
                      {sub.unitType
                        ? `${militaryUnitTypeLabelKo(sub.unitType)} · `
                        : ''}
                      {sub.name}
                    </UnitChipBtn>
                  ))}
                </ChipWrap>
              ) : null}

              {(unit.predecessors ?? []).length > 0 ||
              (unit.successors ?? []).length > 0 ? (
                <ChipWrap style={{ marginTop: 4 }}>
                  {(unit.predecessors ?? []).map((pred) => (
                    <LineageTag key={pred.transitionId}>
                      <FiGitCommit size={11} />← 전신(
                      {TRANSITION_KIND_KO[pred.kind] ?? pred.kind}):{' '}
                      {pred.unit ? (
                        <InlineBtn
                          type="button"
                          onClick={() => onSelectUnit(pred.unit!.id)}
                        >
                          {pred.unit.name}
                        </InlineBtn>
                      ) : (
                        pred.department?.name
                      )}
                    </LineageTag>
                  ))}
                  {(unit.successors ?? []).map((succ) => (
                    <LineageTag key={succ.transitionId}>
                      <FiGitCommit size={11} />→ 후신(
                      {TRANSITION_KIND_KO[succ.kind] ?? succ.kind}):{' '}
                      {succ.unit ? (
                        <InlineBtn
                          type="button"
                          onClick={() => onSelectUnit(succ.unit!.id)}
                        >
                          {succ.unit.name}
                        </InlineBtn>
                      ) : null}
                    </LineageTag>
                  ))}
                </ChipWrap>
              ) : null}
            </DrawerSection>

            {(unit.assignedNavalVessels ?? []).length > 0 ? (
              <DrawerSection>
                <SectionTitle>
                  <FiAnchor size={12} /> 배속 함정 (
                  {(unit.assignedNavalVessels ?? []).length}척)
                </SectionTitle>
                <ChipWrap>
                  {(unit.assignedNavalVessels ?? []).map((v) => (
                    <NeutralBadge key={v.id}>
                      {v.vesselType ? `${v.vesselType} · ` : ''}
                      {v.name}
                    </NeutralBadge>
                  ))}
                </ChipWrap>
              </DrawerSection>
            ) : null}

            {/* 역대 지휘관 */}
            <DrawerSection>
              <SectionTitle>
                역대 지휘관 · 참모 ({(unit.tenures ?? []).length}건)
              </SectionTitle>
              {(unit.tenures ?? []).length === 0 ? (
                <MutedText>등록된 지휘관 재임 기록이 없습니다.</MutedText>
              ) : (
                <ListStack>
                  {(unit.tenures ?? []).slice(0, 10).map((t) => {
                    const pid = t.person?.id ?? t.personId
                    const pName = t.person
                      ? getPersonDisplayName({
                          name: t.person.name ?? '',
                          surname: t.person.surname ?? undefined,
                          middleName: t.person.middleName ?? undefined,
                          country: t.person.country ?? undefined,
                        }) || t.person.name
                      : '인물 미상'
                    const roleText = [
                      t.rankTitle,
                      t.title ?? t.positionDefinition?.title,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                    return (
                      <ListRow key={t.id}>
                        <InlineBtn
                          type="button"
                          onClick={(evt) => {
                            if (!pid) return
                            if (!shouldInterceptEntityClick(evt)) {
                              navigate(pathKeys.personsTimelineDetail(pid))
                              return
                            }
                            setInspectPersonId(pid)
                          }}
                        >
                          <FiUser size={11.5} /> {pName}
                        </InlineBtn>
                        <MutedText>{roleText || '지휘관'}</MutedText>
                      </ListRow>
                    )
                  })}
                </ListStack>
              )}
            </DrawerSection>

            {/* 참전 전투 */}
            <DrawerSection>
              <SectionTitle>
                참전 전투 · 작전 (
                {(unit.sideDeployedUnits ?? []).filter((d) => d.side?.event)
                  .length}
                건)
              </SectionTitle>
              {(unit.sideDeployedUnits ?? []).filter((d) => d.side?.event)
                .length === 0 ? (
                <MutedText>참전(전투서열 투입) 기록이 없습니다.</MutedText>
              ) : (
                <ListStack>
                  {(unit.sideDeployedUnits ?? [])
                    .filter((d) => d.side?.event)
                    .map((dep) => {
                      const ev = dep.side!.event!
                      const outcomeKo =
                        dep.side?.outcome &&
                        dep.side.outcome in SIDE_OUTCOME_LABEL
                          ? SIDE_OUTCOME_LABEL[
                              dep.side
                                .outcome as keyof typeof SIDE_OUTCOME_LABEL
                            ]
                          : null
                      const roleKo =
                        dep.role && dep.role in SIDE_UNIT_ROLE_LABEL
                          ? SIDE_UNIT_ROLE_LABEL[
                              dep.role as keyof typeof SIDE_UNIT_ROLE_LABEL
                            ]
                          : null
                      const targetHref =
                        ev.kind === 'COLLECTION'
                          ? `${pathKeys.events.detail(ev.id)}?tab=survey&unit=${encodeURIComponent(unit.id)}`
                          : `${pathKeys.events.detail(ev.id)}?tab=modules&unit=${encodeURIComponent(unit.id)}#module-sides`
                      return (
                        <ListRow key={dep.id}>
                          <div>
                            <InlineJumpLink to={pathKeys.events.detail(ev.id)}>
                              {ev.title}
                            </InlineJumpLink>
                            <MutedText style={{ marginLeft: 6 }}>
                              {[dep.side?.name, outcomeKo, roleKo]
                                .filter(Boolean)
                                .join(' · ')}
                            </MutedText>
                          </div>
                          <MiniSurveyLink to={targetHref}>
                            <FiCompass size={11} />
                            {ev.kind === 'COLLECTION' ? '조망' : '전투서열'}
                          </MiniSurveyLink>
                        </ListRow>
                      )
                    })}
                </ListStack>
              )}
            </DrawerSection>
          </DrawerBody>
        )}
      </SidePanel>

      <PersonInlineModal
        personId={inspectPersonId}
        onClose={() => setInspectPersonId(null)}
        onOpenDetail={(pid) => {
          setInspectPersonId(null)
          navigate(pathKeys.personsTimelineDetail(pid))
        }}
      />
    </>
  )
}

const DrawerHeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const LoadingBox = styled.div`
  padding: 48px 20px;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const DrawerBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 0 24px;
`

const HeroRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
`

const InsigniaImg = styled.img`
  width: 50px;
  height: 50px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const InsigniaFallback = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 10px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const HeroTexts = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`

const AccentBadge = styled.span`
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const NeutralBadge = styled.span`
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const StatusPill = styled.span<{ $disbanded: boolean }>`
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme, $disbanded }) =>
    $disbanded
      ? ledgerSubtleFill(theme.mode)
      : theme.mode === 'dark'
        ? 'rgba(16, 185, 129, 0.14)'
        : 'rgba(16, 185, 129, 0.1)'};
  color: ${({ theme, $disbanded }) =>
    $disbanded
      ? theme.colors.text.tertiary
      : theme.mode === 'dark'
        ? '#6ee7b7'
        : '#047857'};
`

const TitleText = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SubLine = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MetaStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.MD};
  overflow: hidden;
`

const MetaCell = styled.div`
  padding: 10px 12px;
  border-right: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const MetaLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MetaVal = styled.div`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}
`

const ContextGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
`

const ContextCard = styled.div`
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
`

const ContextLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 4px;
`

const ContextText = styled.div`
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: pre-wrap;
`

const ProseBox = styled.div`
  padding: 12px 14px;
  border-radius: 8px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
`

const DrawerSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const SectionTitle = styled.h4`
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}
`

const ChainLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ChipWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const UnitChipBtn = styled.button`
  padding: 4px 9px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const LineageTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ListStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const ListRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 12.5px;
`

const InlineBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-family: inherit;
  font-size: inherit;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const InlineJumpLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-weight: 600;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const MiniSurveyLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
`

const MutedText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
