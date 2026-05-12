import { type UpdateEventDto } from '@/shared/api/events'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'
import { InlineText } from './inline'
import { MODULE_COLOR } from './module-colors'
import { ModuleRemoveAction } from './module-remove-action'

interface ModuleMilitaryDetailsProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto) => void
}

/**
 * 작전 정보 — 분쟁/전투 유형, 전술/전략/결과 등.
 * `militaryDetails`는 `any | null` 가변 형태라 알려진 필드만 inline-edit 노출.
 * 빈 값으로 저장하면 해당 키 삭제(undefined 머지).
 */
const FIELDS: Array<{ key: string; label: string }> = [
  { key: 'conflictType', label: '분쟁 유형' },
  { key: 'combatType', label: '전투 유형' },
  { key: 'tactics', label: '전술' },
  { key: 'strategy', label: '전략' },
  { key: 'outcome', label: '결과' },
]

export function ModuleMilitaryDetails({
  event,
  onPatch,
}: ModuleMilitaryDetailsProps) {
  const data = (event.militaryDetails as Record<string, unknown> | null | undefined) ?? {}

  const readValue = (key: string): string => {
    const raw = data[key]
    if (raw === undefined || raw === null) return ''
    if (Array.isArray(raw)) {
      return raw
        .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
        .filter(Boolean)
        .join(', ')
    }
    if (typeof raw === 'string') return raw
    return String(raw)
  }

  const updateField = (key: string, next: string) => {
    const trimmed = next.trim()
    const merged: Record<string, unknown> = { ...data }
    if (trimmed) merged[key] = trimmed
    else delete merged[key]
    onPatch({ militaryDetails: merged })
  }

  const warCost = typeof event.warCost === 'string' ? event.warCost : ''

  return (
    <S.Section id="module-military-details">
      <S.SectionHeader>
        <S.SectionTitle>
          <S.SectionTitleDot $color={MODULE_COLOR['military-details']} />
          작전 정보
        </S.SectionTitle>
        <S.SectionActions>
          <ModuleRemoveAction
            label="작전 정보"
            onRemove={() => onPatch({ militaryDetails: null })}
          />
        </S.SectionActions>
      </S.SectionHeader>

      <S.Definitions>
        {FIELDS.map((field) => (
          <S.DefRow key={field.key}>
            <S.DefLabel>{field.label}</S.DefLabel>
            <S.DefValue>
              <InlineText
                value={readValue(field.key)}
                onSave={(next) => updateField(field.key, next)}
                placeholder={`${field.label} 입력`}
                multiline
              />
            </S.DefValue>
          </S.DefRow>
        ))}
        <S.DefRow>
          <S.DefLabel>전쟁 비용</S.DefLabel>
          <S.DefValue>
            <InlineText
              value={warCost}
              onSave={(next) =>
                onPatch({ warCost: next.trim() || undefined })
              }
              placeholder="전쟁 비용 입력"
            />
          </S.DefValue>
        </S.DefRow>
      </S.Definitions>
    </S.Section>
  )
}
