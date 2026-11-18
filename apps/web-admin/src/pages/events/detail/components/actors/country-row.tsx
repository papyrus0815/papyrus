import { type DragEvent, type ReactNode } from 'react'

import { FiAlertTriangle, FiArrowDown, FiArrowUp, FiEdit2, FiX } from 'react-icons/fi'

import { EVENT_COUNTRY_ROLE_OPTIONS, type EventCountryRole } from '@/entities/event/model'
import { formatObservationExact, formatObservationValue } from '@/entities/evidence/lib/format-observation'
import { type Observation } from '@/shared/api/evidence'
import { renderEmphasis } from '@/shared/lib/emphasis-markup'
import { pathKeys } from '@/shared/router'
import { shouldInterceptEntityClick } from '@/widgets/country/country-inline-modal'

import { ActorEditPanel } from './actor-edit-panel'
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
  CountryLink,
  CountryNameLine,
  CountryNoteLine,
  CountryRoleLine,
  CountryRoleTag,
  CountryRow,
  EditToggle,
  FactTag,
  FigureChip,
  FigureChips,
  HistoricalCountryName,
  MismatchNote,
  RemoveInline,
  ReorderBtn,
  RowActions,
} from './actors.styles'
import { ClampedProse } from './clamped-prose'
import { type CountryPatch } from './use-actor-mutations'

const ROLE_LABEL = Object.fromEntries(EVENT_COUNTRY_ROLE_OPTIONS.map((option) => [option.value, option.label])) as Record<
  string,
  string
>

/**
 * 참여국 한 행 — 이름 · 역할 · 이 나라가 한 일 · 비고.
 * 진영별 묶음과 평평한 목록이 같이 쓴다.
 *
 * **나라 카드에는 나라만.** 그 나라 자격의 인물(대표단, children)은 카드 **밖**, 바로 아래에 들여 쓴 제 카드로 선다.
 * 예전엔 나라 카드 안에 인물 카드가 들어 있어(카드 안의 카드) 인물에 마우스를 올려도 나라의 ✎·✕가 켜지고,
 * 인물 편집 칸이 회색 상자 안에서 좁게 열렸다.
 *
 * **읽기와 쓰기를 가른다(인물 카드와 같다).** 읽을 땐 글과 정보 있는 역할만, 고칠 땐 ✎ 하나로 편집 칸이 열려
 * 역할·진영(한 번 누르기)·한 일·비고를 한 자리에서. 예전엔 칸마다 숨은 ✎, 역할은 ▾ 모달이었고, 진영을 바꾸면
 * 나라가 다른 진영 칸으로 옮겨 새로 그려지며 편집이 닫혔다 — 이제 열려 있는지는 위(DetailActors)가 쥔다.
 */
export function ActorCountryRow({
  row,
  figures = [],
  side = null,
  sideOptions = [],
  groupSideId,
  editing,
  onEditingChange,
  manageMode,
  isFirst,
  isLast,
  onCountryClick,
  onUpdate,
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
  /** 이 나라 몫의 측정값(병력·사상자 등) — 진영 모듈·수치 모듈에서 적은 값 */
  figures?: Observation[]
  /** 진영 — 진영별 칸 밖(평평한 목록)에서만 넘긴다. 칸 안이면 머리가 이미 말한다 */
  side?: { name: string; color: string } | null
  /** 진영 선택지('none' = 진영 미지정) — 사건에 진영이 있을 때 */
  sideOptions?: Array<{ value: string; label: string }>
  /**
   * 이 행이 놓인 진영 칸(진영별 묶음일 때). 행의 진영이 칸과 같으면 진영 칩을 세우지 않는다 —
   * 칸 머리가 이미 말한다(1차대전: '동맹국' 칸 안 네 줄이 모두 '동맹국 ▾' 칩을 달고 있었다).
   * undefined = 평평한 목록.
   */
  groupSideId?: string | null
  /** 편집 칸이 열렸나 — 위가 쥔다(진영을 바꿔 다른 칸으로 옮겨 가도 열린 채로) */
  editing: boolean
  onEditingChange: (open: boolean) => void
  manageMode: boolean
  isFirst: boolean
  isLast: boolean
  onCountryClick: (countryId: string) => void
  onUpdate: (rowKey: string, patch: CountryPatch) => void
  onMove: (rowKey: string, direction: -1 | 1) => void
  onRemove: (rowKey: string) => void
  draggable?: boolean
  isDragOver?: boolean
  onDragStart?: (dragEvent: DragEvent<HTMLLIElement>) => void
  onDragOver?: (dragEvent: DragEvent<HTMLLIElement>) => void
  onDragLeave?: (dragEvent: DragEvent<HTMLLIElement>) => void
  onDrop?: (dragEvent: DragEvent<HTMLLIElement>) => void
  onDragEnd?: () => void
  /** 행 아래에 매다는 것 — 대표단(그 나라 인물) 등 */
  children?: ReactNode
}) {
  const rowKey = countryRowKey(row)
  const NameLink = row.isHistorical ? HistoricalCountryName : CountryLink
  const hasNote = Boolean(row.note && row.note.trim())
  const hasRoleDescription = Boolean(row.roleDescription?.trim())
  const period = membershipPeriodLabel(row)
  const participation = row.participation && row.participation !== 'FULL' ? PARTICIPATION_LABEL[row.participation] : null
  /*
   * 기본값은 말하지 않는다 — 역할 '참여국'(참여국 1,201줄 중 720줄)과 칸이 이미 말하는 진영은 세우지 않는다.
   * 편집 중엔 편집 칸의 칩이 말하므로 여기선 걷는다(같은 것이 두 번 서지 않게).
   */
  const isDefaultRole = !row.role || row.role === 'PARTICIPANT'
  const showRoleTag = !isDefaultRole && !editing
  const sideImplied = groupSideId !== undefined && Boolean(row.sideId) && row.sideId === groupSideId
  const showSideTag = Boolean(side) && !sideImplied && !editing
  const hasFacts = Boolean(period || participation || showSideTag)

  return (
    <CountryRow
      draggable={draggable && !editing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <CountryCard $dragOver={isDragOver} $editing={editing}>
        <CountryBody>
          <CountryNameLine>
            <NameLink
              to={pathKeys.countryDetail(row.id)}
              aria-haspopup="dialog"
              onClick={(clickEvent) => {
                if (!shouldInterceptEntityClick(clickEvent)) return
                clickEvent.preventDefault()
                onCountryClick(row.id)
              }}
            >
              {row.flagEmoji && <CountryFlag aria-hidden>{row.flagEmoji}</CountryFlag>}
              {row.name}
            </NameLink>
            {row.existenceWarning && (
              <MismatchNote role="note" title="막지는 않습니다 — 날짜나 연결을 한번 확인해 보세요">
                <FiAlertTriangle aria-hidden size={11} />
                {row.existenceWarning}
              </MismatchNote>
            )}
            {showRoleTag && <CountryRoleTag>{ROLE_LABEL[row.role ?? ''] ?? row.role}</CountryRoleTag>}
          </CountryNameLine>
          {hasFacts && (
            <CountryFacts>
              {showSideTag && side && <FactTag $color={side.color}>{side.name}</FactTag>}
              {participation && <FactTag>{participation}</FactTag>}
              {period && (
                <span title={[row.joinReason, row.withdrawReason].filter(Boolean).join(' / ') || undefined}>
                  {period}
                </span>
              )}
            </CountryFacts>
          )}
          {figures.length > 0 && (
            <FigureChips aria-label={`${row.name} 수치`}>
              {figures.map((observation) => (
                <FigureChip
                  key={observation.id}
                  title={[observation.metric.definition, formatObservationExact(observation), observation.qualifier]
                    .filter(Boolean)
                    .join(' — ')}
                >
                  {observation.metric.name}
                  <strong>{formatObservationValue(observation)}</strong>
                </FigureChip>
              ))}
            </FigureChips>
          )}

          {editing ? (
            <ActorEditPanel
              name={row.name}
              choices={[
                {
                  id: 'role',
                  label: '역할',
                  value: row.role || 'PARTICIPANT',
                  options: EVENT_COUNTRY_ROLE_OPTIONS.filter(
                    // 동맹국·적대국은 진영(D1)으로 대체 — 현재 값일 때만 보인다
                    (option) => !option.deprecated || option.value === row.role,
                  ).map((option) => ({ value: option.value, label: option.label, hint: option.hint })),
                  onPick: (next) => onUpdate(rowKey, { role: next as EventCountryRole }),
                },
                ...(sideOptions.length > 1
                  ? [
                      {
                        id: 'side',
                        label: '진영',
                        value: row.sideId ?? 'none',
                        options: sideOptions.map((option) => ({ ...option, muted: option.value === 'none' })),
                        onPick: (next: string) => onUpdate(rowKey, { sideId: next === 'none' ? null : next }),
                      },
                    ]
                  : []),
              ]}
              texts={[
                {
                  id: 'roleDescription',
                  label: '이 나라가 한 일',
                  value: row.roleDescription ?? '',
                  placeholder: '이 사건에서 이 나라가 한 일 (*강조*는 굵게)',
                  multiline: true,
                  onSave: (next) => onUpdate(rowKey, { roleDescription: next }),
                },
                {
                  id: 'note',
                  label: '비고',
                  value: row.note ?? '',
                  placeholder: '근거 · 덧붙일 말',
                  multiline: true,
                  onSave: (next) => onUpdate(rowKey, { note: next }),
                },
              ]}
              onClose={() => onEditingChange(false)}
            />
          ) : (
            <>
              {hasRoleDescription && (
                <CountryRoleLine $hasContent>
                  <ClampedProse measureKey={row.roleDescription ?? ''}>
                    <span>{renderEmphasis(row.roleDescription ?? '')}</span>
                  </ClampedProse>
                </CountryRoleLine>
              )}
              {hasNote && (
                <CountryNoteLine $hasContent>
                  <ClampedProse measureKey={row.note ?? ''}>
                    <span>{renderEmphasis(row.note ?? '')}</span>
                  </ClampedProse>
                </CountryNoteLine>
              )}
            </>
          )}
        </CountryBody>

        <RowActions>
          {!editing && (
            <EditToggle
              type="button"
              onClick={() => onEditingChange(true)}
              aria-label={`${row.name} 고치기(역할·진영·한 일·비고)`}
              title="역할·진영·한 일·비고 고치기"
            >
              <FiEdit2 aria-hidden />
            </EditToggle>
          )}
          {manageMode && (
            <>
              <ReorderBtn type="button" onClick={() => onMove(rowKey, -1)} disabled={isFirst} aria-label={`${row.name} 위로`}>
                <FiArrowUp />
              </ReorderBtn>
              <ReorderBtn type="button" onClick={() => onMove(rowKey, 1)} disabled={isLast} aria-label={`${row.name} 아래로`}>
                <FiArrowDown />
              </ReorderBtn>
            </>
          )}
          <RemoveInline type="button" onClick={() => onRemove(rowKey)} aria-label={`${row.name} 제거`}>
            <FiX />
          </RemoveInline>
        </RowActions>
      </CountryCard>
      {children}
    </CountryRow>
  )
}
