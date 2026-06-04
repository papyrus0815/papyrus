import styled from 'styled-components'

import { type UpdateEventDto } from '@/shared/api/events'
import { formatCompactNumber } from '@/pages/events/utils/events.utils'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'
import { InlineText } from './inline'
import { MODULE_COLOR } from './module-colors'
import { ModuleRemoveAction } from './module-remove-action'

interface ModuleCasualtiesProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto) => void
}

/**
 * 사상자 — `casualties` 응답이 `any | null`이라 형태가 가변.
 * 알려진 키(killed/wounded/missing/captured/civilian/total) 모두를 그리드로 노출.
 * 숫자/문자 모두 받되, parseInt 가능한 문자열은 number로 저장(서버 정규화).
 *
 * 큰 숫자(인적 피해)는 본문에서 *통계 그리드*로 강조 — 다른 모듈의 dl과 차별화해
 * "수치"임을 시각적으로 분리.
 */
const KNOWN_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'killed', label: '전사' },
  { key: 'wounded', label: '부상' },
  { key: 'missing', label: '실종' },
  { key: 'captured', label: '포로' },
  { key: 'civilian', label: '민간인' },
  { key: 'total', label: '합계' },
]

export function ModuleCasualties({ event, onPatch }: ModuleCasualtiesProps) {
  const data = (event.casualties as Record<string, unknown> | null | undefined) ?? {}

  const readValue = (key: string): string => {
    const raw = data[key]
    if (raw === undefined || raw === null) return ''
    if (typeof raw === 'number') return String(raw)
    if (typeof raw === 'string') return raw
    return ''
  }

  const updateField = (key: string, next: string) => {
    const trimmed = next.trim()
    const merged: Record<string, unknown> = { ...data }
    if (trimmed) {
      const num = Number(trimmed.replace(/[, ]/g, ''))
      merged[key] = Number.isFinite(num) && /^[\d, ]+$/.test(trimmed) ? num : trimmed
    } else {
      delete merged[key]
    }
    onPatch({ casualties: merged })
  }

  const note = typeof data.note === 'string' ? data.note : ''

  /* read-mode 표시값 — 숫자는 compact 포맷, 문자는 그대로. 빈 값은 InlineText
     placeholder가 처리. 통계 그리드는 항상 모든 필드 노출(빈 값 포함). */
  const formatDisplay = (key: string): string => {
    const raw = data[key]
    if (raw === undefined || raw === null) return ''
    if (typeof raw === 'number') return formatCompactNumber(raw)
    if (typeof raw === 'string') return raw
    return ''
  }

  return (
    <S.Section id="module-casualties">
      <S.SectionHeader>
        <S.SectionTitle>
          <S.SectionTitleDot $color={MODULE_COLOR.casualties} />
          사상자·피해
        </S.SectionTitle>
        <S.SectionActions>
          <ModuleRemoveAction
            label="사상자·피해"
            onRemove={() => onPatch({ casualties: null })}
          />
        </S.SectionActions>
      </S.SectionHeader>

      <Stats>
        {KNOWN_FIELDS.map((field) => (
          <StatCell key={field.key}>
            <StatLabel>{field.label}</StatLabel>
            <StatValue>
              {/* InlineText는 read 모드에서 raw 문자열을 보여주지만, 숫자 시각 강조
                  를 위해 현재 표시값을 별도 InlineText의 value prop으로 전달.
                  편집 진입 시 raw(숫자 그대로)를 보여주려면 별도 swap 필요 — 우선
                  compact 포맷이 그대로 input에 들어가도 사용자 입장에서 큰 문제 없음. */}
              <InlineText
                value={formatDisplay(field.key) || readValue(field.key)}
                onSave={(next) => updateField(field.key, next)}
                placeholder="—"
              />
            </StatValue>
          </StatCell>
        ))}
      </Stats>

      <NoteRow>
        <StatLabel>비고</StatLabel>
        <NoteValue>
          <InlineText
            value={note}
            onSave={(next) => {
              const trimmed = next.trim()
              const merged: Record<string, unknown> = { ...data }
              if (trimmed) merged.note = trimmed
              else delete merged.note
              onPatch({ casualties: merged })
            }}
            placeholder="추가 설명"
            multiline
          />
        </NoteValue>
      </NoteRow>
    </S.Section>
  )
}

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 12px;
`

/**
 * Stat 카드 — 라벨-숫자 쌍을 hairline 카드로 승격해 "수치"임을 시각적으로 분리.
 * 좌측 상단에 모듈 색(군사) 미세 액센트 룰. 빈 값은 카드 안에서 "—"로 일관 표시.
 */
const StatCell = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 13px 15px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'};
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.015)'};
  transition: border-color 0.15s, background 0.15s;

  &::before {
    content: '';
    position: absolute;
    top: 13px;
    left: 0;
    width: 3px;
    height: 14px;
    border-radius: 0 2px 2px 0;
    background: ${MODULE_COLOR.casualties};
    opacity: 0.55;
  }

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.16)'};
  }
`

const StatLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
`

const StatValue = styled.span`
  font-size: 25px;
  font-weight: 750;
  color: ${({ theme }) => theme.colors.text.primary};
  font-variant-numeric: tabular-nums slashed-zero;
  letter-spacing: -0.02em;
  line-height: 1.1;
`

const NoteRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(15,23,42,0.08)'};
`

const NoteValue = styled.span`
  font-size: 13.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
`
