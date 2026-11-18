import { type DragEvent } from 'react'

import { FiAlertTriangle, FiArrowDown, FiArrowUp, FiEdit2, FiX } from 'react-icons/fi'

import { getUploadImageUrl } from '@/shared/api/upload'
import { renderEmphasis } from '@/shared/lib/emphasis-markup'

import {
  type EventPersonEntry,
  participationValueOf,
  personNameOf,
} from './actors.lib'
import { ActorEditPanel } from './actor-edit-panel'
import {
  AddInfoButton,
  DeathAtEventBadge,
  EditToggle,
  FactTag,
  MismatchNote,
  OfficeAtEvent,
  PersonAvatar,
  PersonAvatarBtn,
  PersonBody,
  PersonMetaLine,
  PersonNameBtn,
  PersonNoteLine,
  PersonRoleLine,
  PersonRow,
  RemoveInline,
  ReorderBtn,
  RowActions,
} from './actors.styles'
import { ClampedProse } from './clamped-prose'

type PersonUpdate = { role?: string; note?: string; sideId?: string | null }

/**
 * 참여 인물 한 행 — 아바타 · 이름 · (진영 · 참여 국가 · 당시 직위 · 경고) · 무엇을 했나 · 비고.
 * key는 personId로 줄 것 — 사건·인물 쌍이 자연키다(서버는 쌍으로 upsert한다. 예전 delete-and-recreate
 * 시절엔 join 행 id가 저장마다 바뀌어 인라인 편집 포커스가 끊겼다).
 *
 * **읽기와 쓰기를 가른다.** 읽을 땐 글만, 고칠 땐 ✎(또는 빈 행의 '+ 적기') 하나로 편집 칸이 열려
 * 참여 국가·진영·무엇을 했나·비고를 한 자리에서 채운다. 예전엔 칸마다 숨은 ✎를 찾아 따로 열고(비고는 ✎ 두 번),
 * 참여 국가는 ▾ 모달로 골랐는데, 고르는 순간 카드가 그 나라 밑으로 옮겨 가며 새로 그려져 편집이 닫혔다.
 * 이제 편집 중 여부는 위(DetailActors)가 쥐어 카드가 옮겨 가도 열린 채 따라간다.
 */
export function ActorPersonRow({
  compact = false,
  entry,
  side = null,
  sideOptions = [],
  participationOptions,
  editing,
  onEditingChange,
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
  /** 대표단 줄 — 나라 줄 밑에 들여 놓는 작은 모양(아바타 28px) */
  compact?: boolean
  entry: EventPersonEntry
  /** 이 인물이 속한 진영(예: 산악파, 지롱드파) */
  side?: { name: string; color: string } | null
  /** 진영 선택지 — 사건에 진영이 있을 때 진영 지정/변경('none' = 미지정) */
  sideOptions?: Array<{ value: string; label: string }>
  /** 참여 자격 국가 선택지('none' = 지정 안 함) — 2개 미만이면 고를 게 없어 칸을 감춘다 */
  participationOptions: Array<{ value: string; label: string }>
  /** 편집 칸이 열렸나 — 위가 쥔다(카드가 대표단으로 옮겨 가 새로 그려져도 열린 채로) */
  editing: boolean
  onEditingChange: (open: boolean) => void
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
  /* 대표단 줄에선 참여 국가가 곧 위의 나라 — 읽을 땐 되풀이하지 않는다 */
  const participationName = !compact ? (entry.participationCountryName ?? null) : null
  const showMeta =
    Boolean(side) ||
    Boolean(participationName) ||
    offices.length > 0 ||
    Boolean(entry.deathAtEvent) ||
    Boolean(entry.lifespanWarning)

  return (
    <PersonRow
      $compact={compact}
      $editing={editing}
      draggable={draggable && !editing}
      $dragOver={isDragOver}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <PersonAvatarBtn type="button" onClick={() => onOpen(entry.personId)} aria-label={`${fullName} 상세 보기`}>
        <PersonAvatar $hasImage={Boolean(avatarUrl)} $compact={compact}>
          {avatarUrl ? (
            <img src={getUploadImageUrl(avatarUrl) || avatarUrl} alt="" loading="lazy" />
          ) : (
            <span>{fullName.charAt(0)}</span>
          )}
        </PersonAvatar>
      </PersonAvatarBtn>

      <PersonBody>
        <PersonNameBtn type="button" $compact={compact} onClick={() => onOpen(entry.personId)}>
          {fullName}
        </PersonNameBtn>
        {showMeta && (
          <PersonMetaLine>
            {side && !editing && <FactTag $color={side.color}>{side.name}</FactTag>}
            {participationName && !editing && <span>{participationName}</span>}
            {offices.length > 0 && (
              <OfficeAtEvent title="재임·재위 기록에서 사건 날짜에 맞춰 자동으로 보여 줍니다">
                당시 {offices.join(' · ')}
              </OfficeAtEvent>
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
          </PersonMetaLine>
        )}

        {editing ? (
          <ActorEditPanel
            name={fullName}
            choices={[
              ...(participationOptions.length > 1
                ? [
                    {
                      id: 'country',
                      label: '참여 국가',
                      value: participationValueOf(entry) || 'none',
                      options: participationOptions.map((option) => ({ ...option, muted: option.value === 'none' })),
                      onPick: (next: string) => onParticipation(entry.personId, next),
                    },
                  ]
                : []),
              ...(sideOptions.length > 1
                ? [
                    {
                      id: 'side',
                      label: '진영',
                      value: entry.sideId ?? 'none',
                      options: sideOptions.map((option) => ({ ...option, muted: option.value === 'none' })),
                      onPick: (next: string) => onUpdate(entry.personId, { sideId: next === 'none' ? null : next }),
                    },
                  ]
                : []),
            ]}
            texts={[
              {
                id: 'role',
                label: '무엇을 했나',
                value: entry.role ?? '',
                placeholder: '예: 협상 대표, 지휘관, 서명',
                maxLength: 100,
                onSave: (next) => onUpdate(entry.personId, { role: next }),
              },
              {
                id: 'note',
                label: '비고',
                value: entry.note ?? '',
                placeholder: '이 사건에서의 행적 · 근거 · 덧붙일 말 (*강조*는 굵게)',
                multiline: true,
                onSave: (next) => onUpdate(entry.personId, { note: next }),
              },
            ]}
            onClose={() => onEditingChange(false)}
          />
        ) : (
          <>
            {hasRole && <PersonRoleLine>{entry.role}</PersonRoleLine>}
            {hasNote && (
              <PersonNoteLine $hasContent>
                <ClampedProse measureKey={entry.note ?? ''}>
                  <span>{renderEmphasis(entry.note ?? '')}</span>
                </ClampedProse>
              </PersonNoteLine>
            )}
            {/* 아무것도 적지 않은 사람 — 무엇을 적을 자리인지 말하고 한 번에 편집 칸을 연다(대표단 줄은 ✎만) */}
            {!hasRole && !hasNote && !compact && (
              <AddInfoButton type="button" onClick={() => onEditingChange(true)}>
                + 무엇을 했나 · 비고 적기
              </AddInfoButton>
            )}
          </>
        )}
      </PersonBody>

      <RowActions>
        {!editing && (
          <EditToggle
            type="button"
            aria-label={`${fullName} 고치기(참여 국가·진영·무엇을 했나·비고)`}
            title="참여 국가·진영·무엇을 했나·비고 고치기"
            onClick={() => onEditingChange(true)}
          >
            <FiEdit2 aria-hidden />
          </EditToggle>
        )}
        {manageMode && (
          <>
            <ReorderBtn
              type="button"
              onClick={() => onMove(entry.personId, -1)}
              disabled={isFirst}
              aria-label={`${fullName} 위로`}
            >
              <FiArrowUp />
            </ReorderBtn>
            <ReorderBtn
              type="button"
              onClick={() => onMove(entry.personId, 1)}
              disabled={isLast}
              aria-label={`${fullName} 아래로`}
            >
              <FiArrowDown />
            </ReorderBtn>
          </>
        )}
        <RemoveInline type="button" onClick={() => onRemove(entry.personId)} aria-label={`${fullName} 제거`}>
          <FiX />
        </RemoveInline>
      </RowActions>
    </PersonRow>
  )
}
