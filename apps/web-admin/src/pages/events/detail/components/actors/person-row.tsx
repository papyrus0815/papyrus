import { type DragEvent, useMemo } from 'react'

import {
  FiAlertTriangle,
  FiArrowDown,
  FiArrowUp,
  FiChevronDown,
  FiEdit2,
} from 'react-icons/fi'
import { MdDragIndicator } from 'react-icons/md'

import { getUploadImageUrl } from '@/shared/api/upload'
import { renderEmphasis } from '@/shared/lib/emphasis-markup'
import { PopoverMenu, type PopoverMenuEntry } from '@/shared/ui/popover-menu'

import {
  type EventPersonEntry,
  participationValueOf,
  personNameOf,
} from './actors.lib'
import {
  AddInfoButton,
  DeathAtEventBadge,
  DragGrip,
  FactTag,
  GhostRowBtn,
  MismatchNote,
  OfficeAtEvent,
  PersonAvatar,
  PersonAvatarBtn,
  PersonBody,
  PersonMetaLine,
  PersonNameBtn,
  PersonNameLine,
  PersonNoteLine,
  PersonRoleLine,
  PersonRow,
  QuickSideAssignBtn,
  RowControls,
  RowTopBar,
} from './actors.styles'
import { ClampedProse } from './clamped-prose'

type PersonUpdate = { role?: string; note?: string; sideId?: string | null }

export function ActorPersonRow({
  compact = false,
  entry,
  side = null,
  countrySideName = null,
  groupSideId,
  sideOptions = [],
  participationOptions,
  readOnly = false,
  onOpenEdit,
  manageMode,
  isFirst,
  isLast,
  onOpen,
  onUpdate,
  onParticipation,
  onMove,
  onRemove,
  draggable = true,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: {
  compact?: boolean
  entry: EventPersonEntry
  side?: { name: string; color: string } | null
  /**
   * 소속국의 진영 이름 — 인물 진영을 비우면 이 진영을 따른다. 그래서 메뉴의 '비움'은
   * '진영 미배정'이 아니라 '소속국 따름'이다(비워도 진영 밖으로 나가지 않는다).
   */
  countrySideName?: string | null
  groupSideId?: string | null
  sideOptions?: Array<{ value: string; label: string }>
  participationOptions: Array<{ value: string; label: string }>
  readOnly?: boolean
  onOpenEdit: () => void
  manageMode: boolean
  isFirst: boolean
  isLast: boolean
  onOpen: (personId: string) => void
  onUpdate: (personId: string, patch: PersonUpdate) => void
  onParticipation: (personId: string, value: string) => void
  onMove: (personId: string, direction: -1 | 1) => void
  onRemove: (personId: string) => void
  draggable?: boolean
  isDragOver?: boolean
  onDragStart?: (dragEvent: DragEvent<HTMLLIElement>) => void
  onDragOver?: (dragEvent: DragEvent<HTMLLIElement>) => void
  onDragLeave?: (dragEvent: DragEvent<HTMLLIElement>) => void
  onDrop?: (dragEvent: DragEvent<HTMLLIElement>) => void
  onDragEnd?: () => void
}) {
  const fullName = personNameOf(entry)
  const avatarUrl = entry.person?.profileImageUrl ?? undefined
  const hasNote = Boolean(entry.note && entry.note.trim())
  const hasRole = Boolean(entry.role && entry.role.trim())
  const offices = entry.officesAtEvent ?? []
  const currentParticipation = participationValueOf(entry) || 'none'
  const selectedCountryOption =
    currentParticipation !== 'none'
      ? participationOptions.find((option) => option.value === currentParticipation)
      : undefined
  const participationName = !compact
    ? (entry.participationCountryName ?? selectedCountryOption?.label ?? null)
    : null

  const sideImplied =
    groupSideId !== undefined && Boolean(entry.sideId) && entry.sideId === groupSideId
  const showSideTag = Boolean(side) && !sideImplied
  const showUnassignedCountryPrompt =
    !compact && !readOnly && participationOptions.length > 1 && !participationName

  const showMeta = showSideTag || Boolean(participationName) || offices.length > 0

  const countryMenuItems = useMemo<PopoverMenuEntry[]>(() => {
    if (participationOptions.length <= 1) return []
    return [
      { type: 'section', id: 'sec-country', label: `${fullName} 소속 국가 지정` },
      ...participationOptions.map((option) => ({
        id: `country-${option.value}`,
        label: option.value === 'none' ? '소속 국가 없음 (단독)' : option.label,
        checked: option.value === currentParticipation,
        onSelect: () => {
          if (option.value !== currentParticipation) {
            onParticipation(entry.personId, option.value)
          }
        },
      })),
    ]
  }, [fullName, participationOptions, currentParticipation, onParticipation, entry.personId])

  const combinedMenuItems = useMemo<PopoverMenuEntry[]>(() => {
    const currentSideValue = entry.sideId ?? 'none'
    return [
      {
        id: 'edit',
        label: '편집 (역할 · 행적 · 소속국)',
        icon: <FiEdit2 size={13} />,
        onSelect: () => onOpenEdit(),
      },
      ...(participationOptions.length > 1
        ? ([
            { type: 'divider', id: 'div-country' },
            { type: 'section', id: 'sec-country', label: '소속 국가 지정' },
            ...participationOptions.map((option) => ({
              id: `country-${option.value}`,
              label: option.value === 'none' ? '소속 국가 없음 (단독)' : option.label,
              checked: option.value === currentParticipation,
              onSelect: () => {
                if (option.value !== currentParticipation) {
                  onParticipation(entry.personId, option.value)
                }
              },
            })),
          ] as PopoverMenuEntry[])
        : []),
      ...(sideOptions.length > 1
        ? ([
            { type: 'divider', id: 'div-side' },
            { type: 'section', id: 'sec-side', label: '진영 배정' },
            ...sideOptions.map((option) => ({
              id: `side-${option.value}`,
              label:
                option.value === 'none'
                  ? countrySideName
                    ? `소속국 따름 (${countrySideName})`
                    : '진영 미배정'
                  : option.label,
              checked: option.value === currentSideValue,
              onSelect: () => {
                if (option.value !== currentSideValue) {
                  onUpdate(entry.personId, {
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
        label: '참여 인물에서 제외',
        danger: true,
        onSelect: () => onRemove(entry.personId),
      },
    ]
  }, [
    entry.sideId,
    entry.personId,
    countrySideName,
    participationOptions,
    currentParticipation,
    sideOptions,
    onOpenEdit,
    onParticipation,
    onUpdate,
    onRemove,
  ])

  return (
    <PersonRow
      $compact={compact}
      draggable={draggable && manageMode && !readOnly}
      $dragOver={isDragOver}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <PersonBody>
        <RowTopBar>
          <PersonNameLine $compact={compact}>
            {manageMode && !readOnly && (
              <DragGrip aria-hidden title="드래그하여 순서 변경">
                <MdDragIndicator />
              </DragGrip>
            )}
            <PersonAvatarBtn
              type="button"
              onClick={() => onOpen(entry.personId)}
              aria-label={`${fullName} 상세 보기`}
            >
              <PersonAvatar $hasImage={Boolean(avatarUrl)} $compact={compact}>
                {avatarUrl ? (
                  <img src={getUploadImageUrl(avatarUrl) || avatarUrl} alt="" loading="lazy" />
                ) : (
                  <span>{fullName.charAt(0)}</span>
                )}
              </PersonAvatar>
            </PersonAvatarBtn>
            <PersonNameBtn
              type="button"
              $compact={compact}
              onClick={() => onOpen(entry.personId)}
            >
              {fullName}
            </PersonNameBtn>

            {showUnassignedCountryPrompt && (
              <PopoverMenu
                items={countryMenuItems}
                align="left"
                minWidth={185}
                ariaLabel={`${fullName} 소속 국가 지정`}
                renderTrigger={({ toggle, ref: triggerRef }) => (
                  <QuickSideAssignBtn
                    ref={triggerRef}
                    type="button"
                    title="소속 국가를 지정하면 해당 국가 아래로 묶입니다"
                    onClick={toggle}
                  >
                    <span>+ 소속국</span>
                    <FiChevronDown size={10} aria-hidden />
                  </QuickSideAssignBtn>
                )}
              />
            )}

            {entry.deathAtEvent && (
              <DeathAtEventBadge
                title={
                  entry.deathAtEvent.cause
                    ? `${entry.deathAtEvent.label}${entry.deathAtEvent.dateLabel ? ` (${entry.deathAtEvent.dateLabel})` : ''} — ${entry.deathAtEvent.cause}`
                    : undefined
                }
              >
                {entry.deathAtEvent.label}
                {entry.deathAtEvent.dateLabel ? ` · ${entry.deathAtEvent.dateLabel}` : ''}
              </DeathAtEventBadge>
            )}
            {entry.lifespanWarning && (
              <MismatchNote role="note" title="막지는 않습니다 — 날짜나 연결을 한번 확인해 보세요">
                <FiAlertTriangle aria-hidden size={11} />
                {entry.lifespanWarning}
              </MismatchNote>
            )}
          </PersonNameLine>

          {!readOnly && (
            <RowControls data-pinned={manageMode || undefined}>
              {manageMode ? (
                <>
                  <GhostRowBtn
                    type="button"
                    onClick={() => onMove(entry.personId, -1)}
                    disabled={isFirst}
                    aria-label={`${fullName} 위로`}
                    title="위로 이동"
                  >
                    <FiArrowUp />
                  </GhostRowBtn>
                  <GhostRowBtn
                    type="button"
                    onClick={() => onMove(entry.personId, 1)}
                    disabled={isLast}
                    aria-label={`${fullName} 아래로`}
                    title="아래로 이동"
                  >
                    <FiArrowDown />
                  </GhostRowBtn>
                </>
              ) : (
                <GhostRowBtn
                  type="button"
                  onClick={onOpenEdit}
                  title={`${fullName} 역할 · 행적 · 소속국 편집`}
                >
                  <FiEdit2 aria-hidden />
                  <span>편집</span>
                </GhostRowBtn>
              )}
              <PopoverMenu
                size="sm"
                items={combinedMenuItems}
                ariaLabel={`${fullName} 더보기 메뉴`}
                title="역할 · 소속국 · 진영 배정 · 제외"
              />
            </RowControls>
          )}
        </RowTopBar>

        {showMeta && (
          <PersonMetaLine $compact={compact}>
            {showSideTag && side && <FactTag $color={side.color}>{side.name}</FactTag>}
            {participationName && <FactTag>{participationName}</FactTag>}
            {offices.length > 0 && (
              <OfficeAtEvent title="재임·재위 기록에서 사건 날짜에 맞춰 자동으로 보여 줍니다">
                당시 {offices.join(' · ')}
              </OfficeAtEvent>
            )}
          </PersonMetaLine>
        )}

        {hasRole && (
          <PersonRoleLine $compact={compact} onDoubleClick={() => !readOnly && onOpenEdit()}>
            {entry.role}
          </PersonRoleLine>
        )}
        {hasNote && (
          <PersonNoteLine
            $hasContent
            $compact={compact}
            onDoubleClick={() => !readOnly && onOpenEdit()}
          >
            <ClampedProse measureKey={entry.note ?? ''}>
              <span>{renderEmphasis(entry.note ?? '')}</span>
            </ClampedProse>
          </PersonNoteLine>
        )}
        {!compact && !hasRole && !hasNote && !readOnly && (
          <AddInfoButton type="button" onClick={onOpenEdit}>
            역할 · 행적 기록하기
          </AddInfoButton>
        )}
      </PersonBody>
    </PersonRow>
  )
}
