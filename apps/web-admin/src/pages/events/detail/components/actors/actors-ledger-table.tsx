import { FiEdit2 } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { EVENT_COUNTRY_ROLE_OPTIONS } from '@/entities/event/model'
import { formatObservationValue } from '@/entities/evidence/lib/format-observation'
import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { type Observation } from '@/shared/api/evidence'
import { getUploadImageUrl } from '@/shared/api/upload'
import { renderEmphasis } from '@/shared/lib/emphasis-markup'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { PopoverMenu, type PopoverMenuEntry } from '@/shared/ui/popover-menu'
import { shouldInterceptEntityClick } from '@/widgets/country/country-inline-modal'

import {
  type CountryRowData,
  countryRowKey,
  countrySideMapOf,
  effectivePersonSide,
  type EventPersonEntry,
  membershipPeriodLabel,
  PARTICIPATION_LABEL,
  participationValueOf,
  personNameOf,
} from './actors.lib'
import { type CountryPatch } from './use-actor-mutations'

const COUNTRY_ROLE_LABEL = Object.fromEntries(
  EVENT_COUNTRY_ROLE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<string, string>

export interface ActorsLedgerTableProps {
  countryRows: CountryRowData[]
  persons: EventPersonEntry[]
  figuresByParticipant: Map<string, Observation[]>
  sideById: Map<string, { name: string; color: string }>
  sideOptions: Array<{ value: string; label: string; color?: string }>
  participationOptions: Array<{ value: string; label: string }>
  readOnly?: boolean
  onCountryClick: (countryId: string) => void
  onPersonClick: (personId: string) => void
  onOpenEditCountry: (rowKey: string) => void
  onOpenEditPerson: (personId: string) => void
  onUpdateCountry: (rowKey: string, patch: CountryPatch) => void
  onRemoveCountry: (rowKey: string) => void
  onUpdatePerson: (
    personId: string,
    patch: { role?: string; note?: string; sideId?: string | null },
  ) => void
  onParticipation: (personId: string, value: string) => void
  onRemovePerson: (personId: string) => void
}

export function ActorsLedgerTable({
  countryRows,
  persons,
  figuresByParticipant,
  sideById,
  sideOptions,
  participationOptions,
  readOnly = false,
  onCountryClick,
  onPersonClick,
  onOpenEditCountry,
  onOpenEditPerson,
  onUpdateCountry,
  onRemoveCountry,
  onUpdatePerson,
  onParticipation,
  onRemovePerson,
}: ActorsLedgerTableProps) {
  const hasSides = sideOptions.length > 1
  /* 참여국 줄의 진영 — 인물의 실효 진영(소속국 따름)을 낸다 */
  const countrySideByKey = countrySideMapOf(
    countryRows.filter((row) => !row.isHistorical),
    countryRows.filter((row) => row.isHistorical),
  )

  const confirmRemoveCountry = async (row: CountryRowData, figures: Observation[]) => {
    const rowKey = countryRowKey(row)
    if (figures.length > 0) {
      const ok = await confirm({
        title: `'${row.name}'을(를) 참여국에서 제외할까요?`,
        message: `이 나라에 기록된 수치 ${figures.length}건도 함께 삭제됩니다.`,
        confirmLabel: '제외하기',
        danger: true,
      })
      if (!ok) return
    }
    onRemoveCountry(rowKey)
  }

  return (
    <TableWrap>
      <TableScroll>
        <Table aria-label="참여 국가 및 인물 원장 표">
          <thead>
            <tr>
              <Th style={{ width: '68px' }}>구분</Th>
              <Th style={{ minWidth: '170px' }}>명칭 · 당시 직위</Th>
              {hasSides && <Th style={{ width: '132px' }}>진영</Th>}
              <Th style={{ width: '140px' }}>역할 · 시점</Th>
              <Th>수치 · 주요 행적</Th>
              {!readOnly && <Th style={{ width: '56px', textAlign: 'right' }}>관리</Th>}
            </tr>
          </thead>
          <tbody>
            {countryRows.map((row) => {
              const rowKey = countryRowKey(row)
              const currentRole = row.role || 'PARTICIPANT'
              const roleText = COUNTRY_ROLE_LABEL[currentRole] ?? currentRole
              const side = row.sideId ? (sideById.get(row.sideId) ?? null) : null
              const period = membershipPeriodLabel(row)
              const participation =
                row.participation && row.participation !== 'FULL'
                  ? PARTICIPATION_LABEL[row.participation]
                  : null
              const figures = row.participantId
                ? (figuresByParticipant.get(row.participantId) ?? [])
                : []
              const prose = row.roleDescription?.trim() || row.note?.trim() || ''

              const menuItems: PopoverMenuEntry[] = [
                {
                  id: 'edit',
                  label: '편집 (역할 · 한 일 · 시점)',
                  icon: <FiEdit2 size={13} />,
                  onSelect: () => onOpenEditCountry(rowKey),
                },
                { type: 'divider', id: 'div-role' },
                { type: 'section', id: 'sec-role', label: '역할 변경' },
                ...EVENT_COUNTRY_ROLE_OPTIONS.filter(
                  (opt) => !opt.deprecated || opt.value === row.role,
                ).map((opt) => ({
                  id: `role-${opt.value}`,
                  label: opt.label,
                  checked: opt.value === currentRole,
                  onSelect: () => {
                    if (opt.value !== currentRole) {
                      onUpdateCountry(rowKey, { role: opt.value })
                    }
                  },
                })),
                ...(sideOptions.length > 1
                  ? ([
                      { type: 'divider', id: 'div-side' },
                      { type: 'section', id: 'sec-side', label: '진영 배정' },
                      ...sideOptions.map((opt) => ({
                        id: `side-${opt.value}`,
                        label: opt.value === 'none' ? '진영 미배정' : opt.label,
                        checked: opt.value === (row.sideId ?? 'none'),
                        onSelect: () =>
                          onUpdateCountry(rowKey, {
                            sideId: opt.value === 'none' ? null : opt.value,
                          }),
                      })),
                    ] as PopoverMenuEntry[])
                  : []),
                { type: 'divider', id: 'div-rm' },
                {
                  id: 'remove',
                  label: '참여국에서 제외',
                  danger: true,
                  onSelect: () => void confirmRemoveCountry(row, figures),
                },
              ]

              return (
                <Tr key={`country:${rowKey}`}>
                  <Td>
                    <KindBadge $kind="country">
                      {row.isHistorical ? '역사국' : '현대국'}
                    </KindBadge>
                  </Td>
                  <Td>
                    <EntityCell>
                      <ThumbBox $hasImg={false}>
                        <span>{row.flagEmoji || row.name.charAt(0)}</span>
                      </ThumbBox>
                      <CountryCellLink
                        to={pathKeys.countryDetail(row.id)}
                        onClick={(clickEvent) => {
                          if (!shouldInterceptEntityClick(clickEvent)) return
                          clickEvent.preventDefault()
                          onCountryClick(row.id)
                        }}
                      >
                        {row.name}
                      </CountryCellLink>
                    </EntityCell>
                  </Td>
                  {hasSides && (
                    <Td>
                      {side ? (
                        <SideCellTag>
                          <SideDot $color={side.color} />
                          <span>{side.name}</span>
                        </SideCellTag>
                      ) : (
                        <DashCell>—</DashCell>
                      )}
                    </Td>
                  )}
                  <Td>
                    <RoleMetaStack>
                      <RoleCellTag $strong={currentRole !== 'PARTICIPANT'}>
                        {roleText}
                      </RoleCellTag>
                      {(participation || period) && (
                        <SubMetaLine>
                          {[participation, period].filter(Boolean).join(' · ')}
                        </SubMetaLine>
                      )}
                    </RoleMetaStack>
                  </Td>
                  <Td onDoubleClick={() => !readOnly && onOpenEditCountry(rowKey)}>
                    <ActionSummaryCell>
                      {figures.slice(0, 2).map((obs) => (
                        <MiniFigureBadge key={obs.id}>
                          {obs.metric.name} <strong>{formatObservationValue(obs)}</strong>
                        </MiniFigureBadge>
                      ))}
                      {prose ? (
                        <ProseOneLine>{renderEmphasis(prose)}</ProseOneLine>
                      ) : figures.length === 0 ? (
                        <DashCell>—</DashCell>
                      ) : null}
                    </ActionSummaryCell>
                  </Td>
                  {!readOnly && (
                    <Td style={{ textAlign: 'right' }}>
                      <PopoverMenu
                        size="sm"
                        items={menuItems}
                        ariaLabel={`${row.name} 작업 메뉴`}
                      />
                    </Td>
                  )}
                </Tr>
              )
            })}

            {persons.map((entry) => {
              const fullName = personNameOf(entry)
              const avatarUrl = entry.person?.profileImageUrl ?? null
              /* 실효 진영 — 따로 정한 진영이 없으면 소속국 진영(참여·진영 탭과 같은 규칙) */
              const effective = effectivePersonSide(entry, countrySideByKey)
              const side = effective.sideId ? (sideById.get(effective.sideId) ?? null) : null
              const countrySideName = effective.countrySideId
                ? (sideById.get(effective.countrySideId)?.name ?? null)
                : null
              const offices = entry.officesAtEvent ?? []
              const currentPart = participationValueOf(entry) || 'none'
              const countryLabel = entry.participationCountryName ?? null
              const prose = [entry.role?.trim(), entry.note?.trim()]
                .filter(Boolean)
                .join(' — ')

              const menuItems: PopoverMenuEntry[] = [
                {
                  id: 'edit',
                  label: '편집 (역할 · 행적 · 소속국)',
                  icon: <FiEdit2 size={13} />,
                  onSelect: () => onOpenEditPerson(entry.personId),
                },
                ...(participationOptions.length > 1
                  ? ([
                      { type: 'divider', id: 'div-country' },
                      { type: 'section', id: 'sec-country', label: '소속 국가 지정' },
                      ...participationOptions.map((opt) => ({
                        id: `country-${opt.value}`,
                        label: opt.value === 'none' ? '소속 국가 없음' : opt.label,
                        checked: opt.value === currentPart,
                        onSelect: () => {
                          if (opt.value !== currentPart) {
                            onParticipation(entry.personId, opt.value)
                          }
                        },
                      })),
                    ] as PopoverMenuEntry[])
                  : []),
                ...(sideOptions.length > 1
                  ? ([
                      { type: 'divider', id: 'div-side' },
                      { type: 'section', id: 'sec-side', label: '진영 배정' },
                      ...sideOptions.map((opt) => ({
                        id: `side-${opt.value}`,
                        label:
                          opt.value === 'none'
                            ? countrySideName
                              ? `소속국 따름 (${countrySideName})`
                              : '진영 미배정'
                            : opt.label,
                        checked: opt.value === (entry.sideId ?? 'none'),
                        onSelect: () =>
                          onUpdatePerson(entry.personId, {
                            sideId: opt.value === 'none' ? null : opt.value,
                          }),
                      })),
                    ] as PopoverMenuEntry[])
                  : []),
                { type: 'divider', id: 'div-rm' },
                {
                  id: 'remove',
                  label: '참여 인물에서 제외',
                  danger: true,
                  onSelect: () => onRemovePerson(entry.personId),
                },
              ]

              return (
                <Tr key={`person:${entry.personId}`}>
                  <Td>
                    <KindBadge $kind="person">인물</KindBadge>
                  </Td>
                  <Td>
                    <EntityCell>
                      <ThumbBox $hasImg={Boolean(avatarUrl)}>
                        {avatarUrl ? (
                          <img
                            src={getUploadImageUrl(avatarUrl) || avatarUrl}
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          <span>{fullName.charAt(0)}</span>
                        )}
                      </ThumbBox>
                      <PersonTextStack>
                        <PersonCellBtn
                          type="button"
                          onClick={() => onPersonClick(entry.personId)}
                        >
                          {fullName}
                        </PersonCellBtn>
                        {(countryLabel || offices.length > 0) && (
                          <SubMetaLine>
                            {[countryLabel, offices[0] && `당시 ${offices[0]}`]
                              .filter(Boolean)
                              .join(' · ')}
                          </SubMetaLine>
                        )}
                      </PersonTextStack>
                    </EntityCell>
                  </Td>
                  {hasSides && (
                    <Td>
                      {side ? (
                        <SideCellTag
                          title={effective.source === 'country' ? '소속국 진영을 따릅니다' : undefined}
                        >
                          <SideDot $color={side.color} />
                          <span>{side.name}</span>
                        </SideCellTag>
                      ) : (
                        <DashCell>—</DashCell>
                      )}
                    </Td>
                  )}
                  <Td onDoubleClick={() => !readOnly && onOpenEditPerson(entry.personId)}>
                    {entry.role?.trim() ? (
                      <RoleCellTag $strong>{entry.role.trim()}</RoleCellTag>
                    ) : (
                      <DashCell>역할 미기록</DashCell>
                    )}
                  </Td>
                  <Td onDoubleClick={() => !readOnly && onOpenEditPerson(entry.personId)}>
                    {entry.note?.trim() ? (
                      <ProseOneLine>{renderEmphasis(entry.note.trim())}</ProseOneLine>
                    ) : prose ? (
                      <ProseOneLine>{prose}</ProseOneLine>
                    ) : (
                      <DashCell>—</DashCell>
                    )}
                  </Td>
                  {!readOnly && (
                    <Td style={{ textAlign: 'right' }}>
                      <PopoverMenu
                        size="sm"
                        items={menuItems}
                        ariaLabel={`${fullName} 작업 메뉴`}
                      />
                    </Td>
                  )}
                </Tr>
              )
            })}
          </tbody>
        </Table>
      </TableScroll>
    </TableWrap>
  )
}

const TableWrap = styled.div`
  border-top: 1.5px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const TableScroll = styled.div`
  width: 100%;
  overflow-x: auto;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
`

const Th = styled.th`
  padding: 9px 12px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-size: 11px;
  font-weight: 750;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: left;
  white-space: nowrap;
`

const Tr = styled.tr`
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const Td = styled.td`
  padding: 9px 12px;
  vertical-align: middle;
`

const KindBadge = styled.span<{ $kind: 'country' | 'person' }>`
  display: inline-flex;
  align-items: center;
  padding: 1.5px 7px;
  border-radius: ${RADIUS.PILL};
  font-size: 10.5px;
  font-weight: 700;
  white-space: nowrap;
  background: ${({ theme, $kind }) =>
    $kind === 'country'
      ? ledgerAccentSubtle(theme.mode)
      : ledgerSubtleFill(theme.mode)};
  color: ${({ theme, $kind }) =>
    $kind === 'country'
      ? ledgerAccent(theme.mode)
      : theme.colors.text.secondary};
`

const EntityCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`

const ThumbBox = styled.span<{ $hasImg: boolean }>`
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme, $hasImg }) =>
    $hasImg ? 'transparent' : ledgerSubtleFill(theme.mode)};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const CountryCellLink = styled(Link)`
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 700;
  font-size: 13.5px;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const PersonTextStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
`

const PersonCellBtn = styled.button`
  padding: 0;
  border: none;
  background: none;
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 13.5px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const SubMetaLine = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SideCellTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
`

const SideDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const RoleMetaStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const RoleCellTag = styled.span<{ $strong?: boolean }>`
  font-size: 12px;
  font-weight: ${({ $strong }) => ($strong ? 700 : 500)};
  color: ${({ theme, $strong }) =>
    $strong ? theme.colors.text.primary : theme.colors.text.secondary};
`

const ActionSummaryCell = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

const MiniFigureBadge = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding: 1.5px 7px;
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};

  strong {
    font-weight: 750;
    color: ${({ theme }) => theme.colors.text.primary};
    ${DIGIT_DISPLAY}
  }
`

const ProseOneLine = styled.div`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const DashCell = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
