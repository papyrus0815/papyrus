import { type ReactNode, useState } from 'react'

import { FiArrowDown, FiArrowUp, FiEdit2, FiX } from 'react-icons/fi'

import { EVENT_COUNTRY_ROLE_OPTIONS, type EventCountryRole } from '@/entities/event/model'
import { formatObservationExact, formatObservationValue } from '@/entities/evidence/lib/format-observation'
import { type Observation } from '@/shared/api/evidence'
import { renderEmphasis } from '@/shared/lib/emphasis-markup'
import { pathKeys } from '@/shared/router'
import { InlineSelect } from '@/shared/ui/inline-edit'
import { shouldInterceptEntityClick } from '@/widgets/country/country-inline-modal'

import { InlineText } from '../inline'
import {
  type CountryRowData,
  countryRowKey,
  membershipPeriodLabel,
  PARTICIPATION_LABEL,
} from './actors.lib'
import {
  CountryBody,
  CountryFacts,
  EditToggle,
  FactTag,
  FigureChip,
  FigureChips,
  CountryFlag,
  CountryLink,
  CountryNameLine,
  CountryNoteLine,
  CountryRoleLine,
  CountryRolePicker,
  CountryRow,
  HistoricalCountryName,
  MismatchNote,
  RemoveInline,
  ReorderBtn,
  RowActions,
} from './actors.styles'
import { ClampedProse } from './clamped-prose'
import { type CountryPatch } from './use-actor-mutations'

/**
 * 참여국 한 행 — 이름(역사국가는 기울임) · 역할 칩 · 이 나라가 한 일 · 비고.
 * 진영별 묶음과 평평한 목록이 같이 쓴다.
 */
export function ActorCountryRow({
  row,
  figures = [],
  side = null,
  manageMode,
  isFirst,
  isLast,
  onCountryClick,
  onUpdate,
  onMove,
  onRemove,
  children,
}: {
  row: CountryRowData
  /** 이 나라 몫의 측정값(병력·사상자 등) — 진영 모듈·수치 모듈에서 적은 값 */
  figures?: Observation[]
  /** 진영 — 진영별 칸 밖(평평한 목록)에서만 넘긴다. 칸 안이면 머리가 이미 말한다 */
  side?: { name: string; color: string } | null
  manageMode: boolean
  isFirst: boolean
  isLast: boolean
  onCountryClick: (countryId: string) => void
  onUpdate: (rowKey: string, patch: CountryPatch) => void
  onMove: (rowKey: string, direction: -1 | 1) => void
  onRemove: (rowKey: string) => void
  /** 행 아래에 매다는 것 — 대표단(그 나라 인물) 등 */
  children?: ReactNode
}) {
  const rowKey = countryRowKey(row)
  const NameLink = row.isHistorical ? HistoricalCountryName : CountryLink
  const hasNote = Boolean(row.note && row.note.trim())
  const hasRoleDescription = Boolean(row.roleDescription?.trim())
  /** 빈 칸 편집 — ✎를 눌러 연다(hover로 펼치지 않는다: 행이 덜컹거렸다) */
  const [editing, setEditing] = useState(false)
  const isDefaultRole = !row.role || row.role === 'PARTICIPANT'
  const period = membershipPeriodLabel(row)
  const participation = row.participation && row.participation !== 'FULL' ? PARTICIPATION_LABEL[row.participation] : null
  const hasFacts = Boolean(period || participation || side)

  return (
    <CountryRow>
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
              ⚠ {row.existenceWarning}
            </MismatchNote>
          )}
          {/* 평범한 '참여국'(또는 미지정)은 모든 행이 같은 글자라 소음 — 편집 중에만 */}
          {(!isDefaultRole || editing) && (
          <CountryRolePicker>
            <InlineSelect
              value={row.role ?? ''}
              options={EVENT_COUNTRY_ROLE_OPTIONS.filter(
                // 동맹국·적대국은 진영(D1)으로 대체 — 현재 값일 때만 보인다
                (option) => !option.deprecated || option.value === row.role,
              ).map((option) => ({
                value: option.value,
                label: option.label,
                description: option.hint,
              }))}
              onSave={(next) => onUpdate(rowKey, { role: next as EventCountryRole })}
              placeholder="역할 지정"
              label={`${row.name} 역할`}
            />
          </CountryRolePicker>
          )}
        </CountryNameLine>
        {hasFacts && (
          <CountryFacts>
            {side && <FactTag $color={side.color}>{side.name}</FactTag>}
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
        {(hasRoleDescription || editing) && (
        <CountryRoleLine $hasContent={hasRoleDescription}>
          <ClampedProse measureKey={row.roleDescription ?? ''}>
            <InlineText
              value={row.roleDescription ?? ''}
              onSave={(next) => onUpdate(rowKey, { roleDescription: next })}
              placeholder="이 나라가 한 일 추가"
              label={`${row.name}이(가) 한 일`}
              multiline
              multilineEnter
              renderRead={renderEmphasis}
            />
          </ClampedProse>
        </CountryRoleLine>
        )}
        {(hasNote || editing) && (
        <CountryNoteLine $hasContent={hasNote}>
          <ClampedProse measureKey={row.note ?? ''}>
            <InlineText
              value={row.note ?? ''}
              onSave={(next) => onUpdate(rowKey, { note: next })}
              placeholder="비고 추가"
              multiline
              multilineEnter
              renderRead={renderEmphasis}
            />
          </ClampedProse>
        </CountryNoteLine>
        )}
        {children}
      </CountryBody>

      <RowActions>
        <EditToggle
          type="button"
          $active={editing}
          aria-pressed={editing}
          onClick={() => setEditing((open) => !open)}
          aria-label={editing ? `${row.name} 편집 끝` : `${row.name} 빈 칸 채우기(역할·한 일·비고)`}
          title={editing ? '편집 끝' : '역할·한 일·비고 채우기'}
        >
          {editing ? '완료' : <FiEdit2 aria-hidden />}
        </EditToggle>
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
    </CountryRow>
  )
}
