import { type DragEvent, type ReactNode, useMemo } from 'react'

import {
  FiAlertTriangle,
  FiArrowDown,
  FiArrowUp,
  FiChevronDown,
  FiEdit2,
  FiUserPlus,
} from 'react-icons/fi'
import { MdDragIndicator } from 'react-icons/md'

import { EVENT_COUNTRY_ROLE_OPTIONS } from '@/entities/event/model'
import {
  formatObservationExact,
  formatObservationValue,
} from '@/entities/evidence/lib/format-observation'
import { type Observation } from '@/shared/api/evidence'
import { renderEmphasis } from '@/shared/lib/emphasis-markup'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { PopoverMenu, type PopoverMenuEntry } from '@/shared/ui/popover-menu'
import { shouldInterceptEntityClick } from '@/widgets/country/country-inline-modal'

import {
  type CountryRowData,
  countryRowKey,
  membershipPeriodLabel,
  PARTICIPATION_LABEL,
} from './actors.lib'
import {
  CountryBody,
  CountryCard,
  CountryFacts,
  CountryFlag,
  CountryForceFill,
  CountryForceHead,
  CountryForceInline,
  CountryForceTrack,
  CountryLink,
  CountryNameLine,
  CountryNoteLine,
  CountryRoleLine,
  CountryRoleTag,
  CountryRow,
  DelegationSection,
  DragGrip,
  FactTag,
  FigureChip,
  FigureChips,
  GhostRowBtn,
  HistoricalCountryName,
  MismatchNote,
  QuickSideAssignBtn,
  ReplaceCountryBtn,
  roleVisualToneOf,
  RowControls,
  RowTopBar,
  SemanticRolePill,
} from './actors.styles'
import { ClampedProse } from './clamped-prose'
import { type CountryPatch } from './use-actor-mutations'

const ROLE_LABEL = Object.fromEntries(
  EVENT_COUNTRY_ROLE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<string, string>

export function ActorCountryRow({
  row,
  figures = [],
  leadObservation = null,
  leadSharePct = null,
  side = null,
  sideColor = null,
  sideOptions = [],
  groupSideId,
  replacement = null,
  readOnly = false,
  onOpenEdit,
  manageMode,
  isFirst,
  isLast,
  onCountryClick,
  onAddDelegate,
  onUpdate,
  onReplace,
  onMove,
  onRemove,
  draggable = true,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  children,
}: {
  row: CountryRowData
  figures?: Observation[]
  leadObservation?: Observation | null
  leadSharePct?: number | null
  side?: { name: string; color: string } | null
  sideColor?: string | null
  sideOptions?: Array<{ value: string; label: string; color?: string }>
  groupSideId?: string | null
  replacement?: { id: string; name: string; isHistorical: boolean } | null
  readOnly?: boolean
  onOpenEdit: () => void
  manageMode: boolean
  isFirst: boolean
  isLast: boolean
  onCountryClick: (countryId: string) => void
  onAddDelegate?: () => void
  onUpdate: (rowKey: string, patch: CountryPatch) => void
  onReplace?: (oldRowKey: string, next: { id: string; name: string; isHistorical: boolean }) => void
  onMove: (rowKey: string, direction: -1 | 1) => void
  onRemove: (rowKey: string) => void
  draggable?: boolean
  isDragOver?: boolean
  onDragStart?: (dragEvent: DragEvent<HTMLLIElement>) => void
  onDragOver?: (dragEvent: DragEvent<HTMLLIElement>) => void
  onDragLeave?: (dragEvent: DragEvent<HTMLLIElement>) => void
  onDrop?: (dragEvent: DragEvent<HTMLLIElement>) => void
  onDragEnd?: () => void
  children?: ReactNode
}) {
  const rowKey = countryRowKey(row)
  const NameLink = row.isHistorical ? HistoricalCountryName : CountryLink
  const hasNote = Boolean(row.note && row.note.trim())
  const hasRoleDescription = Boolean(row.roleDescription?.trim())
  const period = membershipPeriodLabel(row)
  const participation =
    row.participation && row.participation !== 'FULL'
      ? PARTICIPATION_LABEL[row.participation]
      : null

  const currentRole = row.role || 'PARTICIPANT'
  const isDefaultRole = currentRole === 'PARTICIPANT'
  const roleDisplayLabel = ROLE_LABEL[currentRole] ?? currentRole
  const roleTone = roleVisualToneOf(currentRole)

  const sideImplied =
    groupSideId !== undefined && Boolean(row.sideId) && row.sideId === groupSideId
  const showSideFactTag = Boolean(side) && !sideImplied
  const showUnassignedSidePrompt = !readOnly && sideOptions.length > 1 && !row.sideId
  const hasFacts = Boolean(period || participation || showSideFactTag)

  const secondaryFigures = useMemo(
    () =>
      leadObservation
        ? figures.filter((obs) => obs.id !== leadObservation.id)
        : figures,
    [figures, leadObservation],
  )

  const roleMenuItems = useMemo<PopoverMenuEntry[]>(() => {
    const visibleOptions = EVENT_COUNTRY_ROLE_OPTIONS.filter(
      (option) => !option.deprecated || option.value === row.role,
    )
    return [
      { type: 'section', id: 'sec-role', label: `${row.name} 역할 선택` },
      ...visibleOptions.map((option) => ({
        id: `role-${option.value}`,
        label: option.label,
        checked: option.value === currentRole,
        onSelect: () => {
          if (option.value !== currentRole) {
            onUpdate(rowKey, { role: option.value })
          }
        },
      })),
    ]
  }, [row.name, row.role, currentRole, onUpdate, rowKey])

  const sideMenuItems = useMemo<PopoverMenuEntry[]>(() => {
    if (sideOptions.length <= 1) return []
    const currentSideValue = row.sideId ?? 'none'
    return [
      { type: 'section', id: 'sec-side', label: `${row.name} 진영 배정` },
      ...sideOptions.map((option) => ({
        id: `side-${option.value}`,
        label: option.value === 'none' ? '진영 미배정' : option.label,
        checked: option.value === currentSideValue,
        onSelect: () => {
          if (option.value !== currentSideValue) {
            onUpdate(rowKey, { sideId: option.value === 'none' ? null : option.value })
          }
        },
      })),
    ]
  }, [row.name, row.sideId, sideOptions, onUpdate, rowKey])

  const handleRemoveClick = async () => {
    if (figures.length > 0) {
      const metricNames = figures
        .map((item) => item.metric.name)
        .slice(0, 3)
        .join(' · ')
      const ok = await confirm({
        title: `'${row.name}'을(를) 참여국에서 제외할까요?`,
        message: `이 나라에 기록된 수치 ${figures.length}건(${metricNames}${figures.length > 3 ? ' 외' : ''})도 함께 삭제됩니다.`,
        confirmLabel: '제외하기',
        danger: true,
      })
      if (!ok) return
    }
    onRemove(rowKey)
  }

  const combinedMenuItems = useMemo<PopoverMenuEntry[]>(() => {
    const visibleRoleOptions = EVENT_COUNTRY_ROLE_OPTIONS.filter(
      (option) => !option.deprecated || option.value === row.role,
    )
    const currentSideValue = row.sideId ?? 'none'
    return [
      {
        id: 'edit-detail',
        label: '참여 내용 바꾸기 (한 일 · 비고 · 시점)',
        icon: <FiEdit2 size={13} />,
        onSelect: () => onOpenEdit(),
      },
      ...(onAddDelegate
        ? ([
            {
              id: 'add-delegate',
              label: `‘${row.name}’ 소속 인물 잇기`,
              icon: <FiUserPlus size={13} />,
              onSelect: () => onAddDelegate(),
            },
          ] as PopoverMenuEntry[])
        : []),
      { type: 'divider', id: 'div-role' },
      { type: 'section', id: 'sec-role', label: '국가 역할 변경' },
      ...visibleRoleOptions.map((option) => ({
        id: `role-${option.value}`,
        label: option.label,
        checked: option.value === currentRole,
        onSelect: () => {
          if (option.value !== currentRole) {
            onUpdate(rowKey, { role: option.value })
          }
        },
      })),
      ...(sideOptions.length > 1
        ? ([
            { type: 'divider', id: 'div-side' },
            { type: 'section', id: 'sec-side', label: '진영 배정' },
            ...sideOptions.map((option) => ({
              id: `side-${option.value}`,
              label: option.value === 'none' ? '진영 미배정' : option.label,
              checked: option.value === currentSideValue,
              onSelect: () => {
                if (option.value !== currentSideValue) {
                  onUpdate(rowKey, {
                    sideId: option.value === 'none' ? null : option.value,
                  })
                }
              },
            })),
          ] as PopoverMenuEntry[])
        : []),
      { type: 'divider', id: 'div-rm' },
      {
        id: 'remove',
        label: '참여국에서 제외',
        danger: true,
        onSelect: () => void handleRemoveClick(),
      },
    ]
  }, [
    row.role,
    row.sideId,
    row.name,
    currentRole,
    sideOptions,
    onAddDelegate,
    onOpenEdit,
    onUpdate,
    rowKey,
    figures.length,
  ])

  return (
    <CountryRow
      $dragOver={isDragOver}
      draggable={draggable && manageMode && !readOnly}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <CountryCard>
        <CountryBody>
          <RowTopBar>
            <CountryNameLine>
              {manageMode && !readOnly && (
                <DragGrip aria-hidden title="드래그하여 순서 변경">
                  <MdDragIndicator />
                </DragGrip>
              )}
              <NameLink
                to={pathKeys.countryDetail(row.id)}
                aria-haspopup="dialog"
                onClick={(clickEvent) => {
                  if (!shouldInterceptEntityClick(clickEvent)) return
                  clickEvent.preventDefault()
                  onCountryClick(row.id)
                }}
              >
                <CountryFlag aria-hidden $monogram={!row.flagEmoji}>
                  {row.flagEmoji || row.name.charAt(0)}
                </CountryFlag>
                {row.name}
              </NameLink>

              {!isDefaultRole &&
                (readOnly ? (
                  <CountryRoleTag $tone={roleTone}>{roleDisplayLabel}</CountryRoleTag>
                ) : (
                  <PopoverMenu
                    items={roleMenuItems}
                    align="left"
                    minWidth={170}
                    ariaLabel={`${row.name} 역할 변경`}
                    renderTrigger={({ isOpen, toggle, ref: triggerRef }) => (
                      <SemanticRolePill
                        ref={triggerRef}
                        type="button"
                        $tone={roleTone}
                        $active={isOpen}
                        title="클릭하여 역할 변경"
                        onClick={toggle}
                      >
                        <span>{roleDisplayLabel}</span>
                        <FiChevronDown aria-hidden />
                      </SemanticRolePill>
                    )}
                  />
                ))}

              {showUnassignedSidePrompt && (
                <PopoverMenu
                  items={sideMenuItems}
                  align="left"
                  minWidth={170}
                  ariaLabel={`${row.name} 진영 배정`}
                  renderTrigger={({ toggle, ref: triggerRef }) => (
                    <QuickSideAssignBtn
                      ref={triggerRef}
                      type="button"
                      title="클릭하여 소속 진영 배정"
                      onClick={toggle}
                    >
                      <span>+ 진영 배정</span>
                      <FiChevronDown size={10} aria-hidden />
                    </QuickSideAssignBtn>
                  )}
                />
              )}

              {row.existenceWarning && (
                <MismatchNote role="note" title="막지는 않습니다 — 날짜나 연결을 한번 확인해 보세요">
                  <FiAlertTriangle aria-hidden size={11} />
                  {row.existenceWarning}
                </MismatchNote>
              )}
              {row.existenceWarning && replacement && !readOnly && onReplace && (
                <ReplaceCountryBtn
                  type="button"
                  title={`역할·서술·진영을 유지한 채 ‘${replacement.name}’(으)로 바꿉니다(되돌리기 가능)`}
                  onClick={() => onReplace(rowKey, replacement)}
                >
                  → {replacement.name}(으)로 교체
                </ReplaceCountryBtn>
              )}
            </CountryNameLine>

            {!readOnly && (
              <RowControls data-pinned={manageMode || undefined}>
                {manageMode ? (
                  <>
                    <GhostRowBtn
                      type="button"
                      onClick={() => onMove(rowKey, -1)}
                      disabled={isFirst}
                      aria-label={`${row.name} 위로`}
                      title="위로 이동"
                    >
                      <FiArrowUp />
                    </GhostRowBtn>
                    <GhostRowBtn
                      type="button"
                      onClick={() => onMove(rowKey, 1)}
                      disabled={isLast}
                      aria-label={`${row.name} 아래로`}
                      title="아래로 이동"
                    >
                      <FiArrowDown />
                    </GhostRowBtn>
                  </>
                ) : (
                  <>
                    {onAddDelegate && (
                      <GhostRowBtn
                        type="button"
                        onClick={onAddDelegate}
                        title={`‘${row.name}’ 소속 수반·지휘관·대표 잇기`}
                      >
                        <FiUserPlus aria-hidden />
                        <span>인물</span>
                      </GhostRowBtn>
                    )}
                    <GhostRowBtn
                      type="button"
                      onClick={onOpenEdit}
                      title={`${row.name} 참여 내용 바꾸기`}
                    >
                      <span>참여 바꾸기</span>
                    </GhostRowBtn>
                  </>
                )}
                <PopoverMenu
                  size="sm"
                  items={combinedMenuItems}
                  ariaLabel={`${row.name} 설정 및 작업 메뉴`}
                  title="역할·진영·참여 편집·제거"
                />
              </RowControls>
            )}
          </RowTopBar>

          {hasFacts && (
            <CountryFacts>
              {showSideFactTag && side && <FactTag $color={side.color}>{side.name}</FactTag>}
              {participation && <FactTag>{participation}</FactTag>}
              {period && (
                <span
                  title={
                    [row.joinReason, row.withdrawReason].filter(Boolean).join(' / ') || undefined
                  }
                >
                  {period}
                </span>
              )}
            </CountryFacts>
          )}

          {leadObservation && leadSharePct != null && (
            <CountryForceInline
              title={
                [
                  leadObservation.metric.definition,
                  formatObservationExact(leadObservation),
                  leadObservation.qualifier,
                ]
                  .filter(Boolean)
                  .join(' — ') || undefined
              }
            >
              <CountryForceHead>
                <span>{leadObservation.metric.name}</span>
                <strong>{formatObservationValue(leadObservation)}</strong>
              </CountryForceHead>
              <CountryForceTrack aria-hidden>
                <CountryForceFill
                  $color={sideColor ?? side?.color ?? null}
                  style={{ width: `${leadSharePct}%` }}
                />
              </CountryForceTrack>
            </CountryForceInline>
          )}

          {secondaryFigures.length > 0 && (
            <FigureChips aria-label={`${row.name} 수치`}>
              {secondaryFigures.map((observation) => (
                <FigureChip
                  key={observation.id}
                  title={[
                    observation.metric.definition,
                    formatObservationExact(observation),
                    observation.qualifier,
                  ]
                    .filter(Boolean)
                    .join(' — ')}
                >
                  {observation.metric.name}
                  <strong>{formatObservationValue(observation)}</strong>
                </FigureChip>
              ))}
            </FigureChips>
          )}

          {hasRoleDescription && (
            <CountryRoleLine $hasContent onDoubleClick={() => !readOnly && onOpenEdit()}>
              <ClampedProse measureKey={row.roleDescription ?? ''}>
                <span>{renderEmphasis(row.roleDescription ?? '')}</span>
              </ClampedProse>
            </CountryRoleLine>
          )}
          {hasNote && (
            <CountryNoteLine $hasContent onDoubleClick={() => !readOnly && onOpenEdit()}>
              <ClampedProse measureKey={row.note ?? ''}>
                <span>{renderEmphasis(row.note ?? '')}</span>
              </ClampedProse>
            </CountryNoteLine>
          )}
        </CountryBody>
      </CountryCard>

      {children && <DelegationSection>{children}</DelegationSection>}
    </CountryRow>
  )
}
