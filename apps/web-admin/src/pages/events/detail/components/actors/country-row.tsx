import { type ReactNode } from 'react'

import { FiArrowDown, FiArrowUp, FiX } from 'react-icons/fi'

import { EVENT_COUNTRY_ROLE_OPTIONS, type EventCountryRole } from '@/entities/event/model'
import { renderEmphasis } from '@/shared/lib/emphasis-markup'
import { pathKeys } from '@/shared/router'
import { InlineSelect } from '@/shared/ui/inline-edit'
import { shouldInterceptEntityClick } from '@/widgets/country/country-inline-modal'

import { InlineText } from '../inline'
import { type CountryRowData, countryRowKey } from './actors.lib'
import {
  CountryBody,
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
          {/* 평범한 '참여국'(또는 미지정)은 모든 행이 같은 글자라 소음 — 행에 들어왔을 때만 보인다 */}
          <CountryRolePicker data-default={!row.role || row.role === 'PARTICIPANT' ? '' : undefined}>
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
        </CountryNameLine>
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
        <CountryNoteLine $hasContent={hasNote}>
          <InlineText
            value={row.note ?? ''}
            onSave={(next) => onUpdate(rowKey, { note: next })}
            placeholder="비고 추가"
            multiline
            multilineEnter
            renderRead={renderEmphasis}
          />
        </CountryNoteLine>
        {children}
      </CountryBody>

      <RowActions>
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
