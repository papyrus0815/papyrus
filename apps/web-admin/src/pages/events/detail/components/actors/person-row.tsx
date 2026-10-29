import { FiArrowDown, FiArrowUp, FiX } from 'react-icons/fi'

import { getUploadImageUrl } from '@/shared/api/upload'
import { renderEmphasis } from '@/shared/lib/emphasis-markup'
import { InlineSelect } from '@/shared/ui/inline-edit'

import { InlineText } from '../inline'
import {
  type EventPersonEntry,
  participationValueOf,
  personNameOf,
} from './actors.lib'
import {
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

/**
 * 참여 인물 한 행 — 아바타 · 이름 · (참여 국가 · 당시 직위 · 경고) · 무엇을 했나 · 비고.
 * key는 personId로 줄 것 — 사건·인물 쌍이 자연키다(서버는 쌍으로 upsert한다. 예전 delete-and-recreate
 * 시절엔 join 행 id가 저장마다 바뀌어 인라인 편집 포커스가 끊겼다).
 */
export function ActorPersonRow({
  entry,
  participationOptions,
  manageMode,
  isFirst,
  isLast,
  onOpen,
  onUpdate,
  onParticipation,
  onMove,
  onRemove,
}: {
  entry: EventPersonEntry
  /** 참여 자격 국가 선택지 — 2개 미만이면 고를 게 없어 줄을 감춘다 */
  participationOptions: Array<{ value: string; label: string }>
  manageMode: boolean
  isFirst: boolean
  isLast: boolean
  onOpen: (personId: string) => void
  onUpdate: (personId: string, patch: { role?: string; note?: string }) => void
  onParticipation: (personId: string, value: string) => void
  onMove: (personId: string, direction: -1 | 1) => void
  onRemove: (personId: string) => void
}) {
  const fullName = personNameOf(entry)
  const avatarUrl = entry.person?.profileImageUrl ?? undefined
  const hasNote = Boolean(entry.note && entry.note.trim())
  const offices = entry.officesAtEvent ?? []
  const showMeta = participationOptions.length > 1 || offices.length > 0 || Boolean(entry.lifespanWarning)

  return (
    <PersonRow>
      <PersonAvatarBtn type="button" onClick={() => onOpen(entry.personId)} aria-label={`${fullName} 상세 보기`}>
        <PersonAvatar $hasImage={Boolean(avatarUrl)}>
          {avatarUrl ? (
            <img src={getUploadImageUrl(avatarUrl) || avatarUrl} alt="" loading="lazy" />
          ) : (
            <span>{fullName.charAt(0)}</span>
          )}
        </PersonAvatar>
      </PersonAvatarBtn>

      <PersonBody>
        <PersonNameBtn type="button" onClick={() => onOpen(entry.personId)}>
          {fullName}
        </PersonNameBtn>
        {showMeta && (
          <PersonMetaLine>
            {participationOptions.length > 1 && (
              <InlineSelect
                value={participationValueOf(entry)}
                options={participationOptions}
                onSave={(next) => onParticipation(entry.personId, next)}
                placeholder={entry.participationCountryName ?? '참여 국가 지정'}
                label={`${fullName}의 참여 국가`}
              />
            )}
            {offices.length > 0 && (
              <OfficeAtEvent title="재임·재위 기록에서 사건 날짜에 맞춰 자동으로 보여 줍니다">
                당시 {offices.join(' · ')}
              </OfficeAtEvent>
            )}
            {entry.lifespanWarning && (
              <MismatchNote role="note" title="막지는 않습니다 — 날짜나 연결을 한번 확인해 보세요">
                ⚠ {entry.lifespanWarning}
              </MismatchNote>
            )}
          </PersonMetaLine>
        )}
        <PersonRoleLine>
          <InlineText
            value={entry.role ?? ''}
            onSave={(next) => onUpdate(entry.personId, { role: next })}
            placeholder="무엇을 했나 (예: 협상 대표, 지휘관)"
            validate={(next) => (next.length > 100 ? '역할은 100자 이내로 입력하세요' : null)}
          />
        </PersonRoleLine>
        <PersonNoteLine $hasContent={hasNote}>
          <ClampedProse measureKey={entry.note ?? ''}>
            <InlineText
              value={entry.note ?? ''}
              onSave={(next) => onUpdate(entry.personId, { note: next })}
              placeholder="비고 추가"
              label={`${fullName} 비고`}
              multiline
              /* 여러 줄 비고 — Enter는 줄바꿈, 저장은 blur로. */
              multilineEnter
              renderRead={renderEmphasis}
            />
          </ClampedProse>
        </PersonNoteLine>
      </PersonBody>

      <RowActions>
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
