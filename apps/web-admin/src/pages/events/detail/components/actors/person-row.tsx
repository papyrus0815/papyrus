import { type DragEvent, type KeyboardEvent, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

import { FiAlertTriangle, FiArrowDown, FiArrowUp, FiEdit2, FiX } from 'react-icons/fi'

import { getUploadImageUrl } from '@/shared/api/upload'
import { renderEmphasis } from '@/shared/lib/emphasis-markup'

import {
  type EventPersonEntry,
  participationValueOf,
  personNameOf,
} from './actors.lib'
import {
  AddInfoButton,
  ChoiceChip,
  ChoiceChips,
  DeathAtEventBadge,
  EditDone,
  EditField,
  EditFoot,
  EditHint,
  EditInput,
  EditLabel,
  EditPanel,
  EditTextarea,
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
          <PersonEditPanel
            entry={entry}
            fullName={fullName}
            sideOptions={sideOptions}
            participationOptions={participationOptions}
            onUpdate={onUpdate}
            onParticipation={onParticipation}
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

/** 역할은 100자까지(서버 검증과 같다) */
const ROLE_MAX = 100

/**
 * 한 사람의 편집 칸 — 참여 국가 · 진영(한 번 누르면 저장) · 무엇을 했나 · 비고(칸을 벗어나면 저장).
 *
 * - 열리면 '무엇을 했나'에 커서가 가고 카드가 화면에 들어온다. 참여 국가를 고르면 카드가 그 나라 밑으로
 *   옮겨 가며 새로 그려지는데, 그때도 같은 자리(무엇을 했나)로 돌아와 이어 적는다.
 * - 저장은 칸마다(행 단위 머지 patch, 되돌리기 토스트 그대로). '완료'·Esc는 아직 안 나간 글까지 저장하고 닫는다.
 * - ⚠️ 칸에서 아직 안 나간 글은 **칩을 누르기 전·칸이 사라질 때** 먼저 보낸다. 참여 국가를 고르면 카드가 옮겨 가며
 *   새로 그려지는데, blur보다 그게 먼저면 비고에 친 글이 통째로 사라졌다(실측: 비고를 치고 '미국'을 누르자 유실).
 */
function PersonEditPanel({
  entry,
  fullName,
  sideOptions,
  participationOptions,
  onUpdate,
  onParticipation,
  onClose,
}: {
  entry: EventPersonEntry
  fullName: string
  sideOptions: Array<{ value: string; label: string }>
  participationOptions: Array<{ value: string; label: string }>
  onUpdate: (personId: string, patch: PersonUpdate) => void
  onParticipation: (personId: string, value: string) => void
  onClose: () => void
}) {
  const fieldId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const roleRef = useRef<HTMLInputElement>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const [roleDraft, setRoleDraft] = useState(entry.role ?? '')
  const [noteDraft, setNoteDraft] = useState(entry.note ?? '')
  /** 마지막으로 보낸 값 — blur 저장과 '완료' 저장이 같은 글을 두 번 보내지 않게 */
  const sentRef = useRef({ role: (entry.role ?? '').trim(), note: (entry.note ?? '').trim() })
  /** 지금 친 글 — 칸이 사라질 때(cleanup) 렌더 밖에서 읽는다 */
  const draftRef = useRef({ role: roleDraft, note: noteDraft })
  draftRef.current = { role: roleDraft, note: noteDraft }
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  /* 서버 값이 바뀌면(되돌리기·다른 칸 저장 후 다시 받기) 쓰고 있지 않은 칸만 따라간다 — 치는 글은 덮지 않는다 */
  useEffect(() => {
    sentRef.current.role = (entry.role ?? '').trim()
    if (document.activeElement !== roleRef.current) setRoleDraft(entry.role ?? '')
  }, [entry.role])
  useEffect(() => {
    sentRef.current.note = (entry.note ?? '').trim()
    if (document.activeElement !== noteRef.current) setNoteDraft(entry.note ?? '')
  }, [entry.note])

  /*
   * 열릴 때(새로 그려질 때 포함) — 카드를 화면에 들이고 **처음 빈 칸**에 커서(둘 다 차 있으면 무엇을 했나).
   * 참여 국가를 골라 카드가 옮겨 간 뒤에도 이어 적을 자리로 돌아온다.
   */
  useEffect(() => {
    panelRef.current?.closest('li')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    const target = (entry.role ?? '').trim() && !(entry.note ?? '').trim() ? noteRef.current : roleRef.current
    target?.focus({ preventScroll: true })
    // 처음 그려질 때만 — 이후 값이 바뀔 때마다 커서를 옮기면 치는 중에 튄다
  }, [])

  /* 칸이 사라질 때(닫기·카드 이동) 아직 안 나간 글을 보낸다 — blur가 오지 않는 경로의 안전망 */
  useEffect(
    () => () => {
      const role = draftRef.current.role.trim()
      const note = draftRef.current.note.trim()
      const patch: PersonUpdate = {}
      if (role !== sentRef.current.role) patch.role = role
      if (note !== sentRef.current.note) patch.note = note
      if (patch.role !== undefined || patch.note !== undefined) onUpdateRef.current(entry.personId, patch)
    },
    [entry.personId],
  )

  /* 비고 칸은 글 높이만큼 자란다 */
  useLayoutEffect(() => {
    const node = noteRef.current
    if (!node) return
    node.style.height = 'auto'
    node.style.height = `${node.scrollHeight}px`
  }, [noteDraft])

  const saveRole = () => {
    const next = roleDraft.trim()
    if (next === sentRef.current.role) return
    sentRef.current.role = next
    onUpdate(entry.personId, { role: next })
  }
  const saveNote = () => {
    const next = noteDraft.trim()
    if (next === sentRef.current.note) return
    sentRef.current.note = next
    onUpdate(entry.personId, { note: next })
  }
  /** 칸에 남은 글을 먼저 보낸다 — 칩(참여 국가·진영)을 누르기 전에 */
  const flushText = () => {
    saveRole()
    saveNote()
  }
  const finish = () => {
    flushText()
    onClose()
  }

  const participationValue = participationValueOf(entry) || 'none'
  const sideValue = entry.sideId ?? 'none'
  const showParticipation = participationOptions.length > 1
  const showSide = sideOptions.length > 1

  const onPanelKeyDown = (keyEvent: KeyboardEvent<HTMLDivElement>) => {
    if (keyEvent.key === 'Escape') {
      keyEvent.preventDefault()
      keyEvent.stopPropagation()
      finish()
    }
  }

  return (
    <EditPanel ref={panelRef} role="group" aria-label={`${fullName} 정보`} onKeyDown={onPanelKeyDown}>
      {showParticipation && (
        <EditField>
          <EditLabel as="span" id={`${fieldId}-country`}>
            참여 국가
          </EditLabel>
          <ChoiceChips role="radiogroup" aria-labelledby={`${fieldId}-country`}>
            {participationOptions.map((option) => {
              const selected = option.value === participationValue
              return (
                <ChoiceChip
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  $selected={selected}
                  $muted={option.value === 'none'}
                  onClick={() => {
                    if (selected) return
                    flushText()
                    onParticipation(entry.personId, option.value)
                  }}
                >
                  {option.label}
                </ChoiceChip>
              )
            })}
          </ChoiceChips>
        </EditField>
      )}

      {showSide && (
        <EditField>
          <EditLabel as="span" id={`${fieldId}-side`}>
            진영
          </EditLabel>
          <ChoiceChips role="radiogroup" aria-labelledby={`${fieldId}-side`}>
            {sideOptions.map((option) => {
              const selected = option.value === sideValue
              return (
                <ChoiceChip
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  $selected={selected}
                  $muted={option.value === 'none'}
                  onClick={() => {
                    if (selected) return
                    flushText()
                    onUpdate(entry.personId, { sideId: option.value === 'none' ? null : option.value })
                  }}
                >
                  {option.label}
                </ChoiceChip>
              )
            })}
          </ChoiceChips>
        </EditField>
      )}

      <EditField>
        <EditLabel htmlFor={`${fieldId}-role`}>무엇을 했나</EditLabel>
        <EditInput
          ref={roleRef}
          id={`${fieldId}-role`}
          value={roleDraft}
          maxLength={ROLE_MAX}
          placeholder="예: 협상 대표, 지휘관, 서명"
          onChange={(changeEvent) => setRoleDraft(changeEvent.target.value)}
          onBlur={saveRole}
          onKeyDown={(keyEvent) => {
            /* Enter = 저장하고 비고로(IME 조합 중 Enter는 글자 확정이라 넘긴다) */
            if (keyEvent.key === 'Enter' && !keyEvent.nativeEvent.isComposing) {
              keyEvent.preventDefault()
              saveRole()
              noteRef.current?.focus()
            }
          }}
        />
      </EditField>

      <EditField>
        <EditLabel htmlFor={`${fieldId}-note`}>비고</EditLabel>
        <EditTextarea
          ref={noteRef}
          id={`${fieldId}-note`}
          rows={2}
          value={noteDraft}
          placeholder="이 사건에서의 행적 · 근거 · 덧붙일 말 (*강조*는 굵게)"
          onChange={(changeEvent) => setNoteDraft(changeEvent.target.value)}
          onBlur={saveNote}
        />
      </EditField>

      <EditFoot>
        <EditHint>칸을 벗어나면 저장됩니다 · Esc로 닫기</EditHint>
        <EditDone type="button" onClick={finish}>
          완료
        </EditDone>
      </EditFoot>
    </EditPanel>
  )
}
