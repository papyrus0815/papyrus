import styled from 'styled-components'

import { type UpdateEventDto } from '@/shared/api/events'

import {
  type MilitaryDetailsShape,
  buildMilitaryPatch,
  getMilitary,
} from '../military-edit'
import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'
import { InlineSelect, InlineText } from './inline'
import { MODULE_COLOR } from './module-colors'
import { ModuleRemoveAction } from './module-remove-action'

interface ModuleMilitaryDetailsProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto) => void
}

/* 정규화 enum — 서버 ConflictTypeDto / CombatTypeDto와 1:1(대문자 값 그대로 저장). */
const CONFLICT_TYPES: Array<{ value: string; label: string }> = [
  { value: 'BATTLE', label: '전투' },
  { value: 'WAR', label: '전쟁' },
  { value: 'SIEGE', label: '공성' },
  { value: 'CAMPAIGN', label: '원정' },
  { value: 'SKIRMISH', label: '소규모 전투' },
]

const COMBAT_TYPES: Array<{ value: string; label: string }> = [
  { value: 'LAND', label: '지상' },
  { value: 'NAVAL', label: '해상' },
  { value: 'AIR', label: '공중' },
  { value: 'AMPHIBIOUS', label: '상륙' },
  { value: 'COMBINED', label: '합동' },
]

const TEXT_FIELDS: Array<{ key: keyof MilitaryDetailsShape; label: string }> = [
  { key: 'objective', label: '목적' },
  { key: 'tactics', label: '전술' },
  { key: 'strategy', label: '전략' },
  { key: 'outcome', label: '결과' },
  { key: 'territoryChanges', label: '영토 변화' },
  { key: 'strategicImpact', label: '전략적 영향' },
]

/**
 * 작전 정보 — 정규화 militaryEvent.militaryDetails의 편집 가능 뷰.
 * 분쟁 유형(select)·전투 유형(토글 칩)·텍스트 필드. 전쟁 비용은 Event 컬럼이라 별도 patch.
 */
export function ModuleMilitaryDetails({
  event,
  onPatch,
}: ModuleMilitaryDetailsProps) {
  const md = getMilitary(event).militaryDetails ?? {}
  const combatTypes = md.combatTypes ?? []

  const updateDetails = (patch: Partial<MilitaryDetailsShape>) => {
    onPatch(
      buildMilitaryPatch(event, (draft) => ({
        ...draft,
        militaryDetails: { ...(draft.militaryDetails ?? {}), ...patch },
      })),
    )
  }

  const toggleCombatType = (value: string) => {
    const next = combatTypes.includes(value)
      ? combatTypes.filter((t) => t !== value)
      : [...combatTypes, value]
    updateDetails({ combatTypes: next })
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
            onRemove={() =>
              onPatch(
                buildMilitaryPatch(event, (draft) => ({
                  ...draft,
                  militaryDetails: undefined,
                })),
              )
            }
          />
        </S.SectionActions>
      </S.SectionHeader>

      <S.ModuleDataCard $accent={MODULE_COLOR['military-details']}>
        <S.Definitions>
          <S.DefRow>
            <S.DefLabel>분쟁 유형</S.DefLabel>
            <S.DefValue>
              <InlineSelect
                value={md.conflictType ?? ''}
                options={CONFLICT_TYPES}
                onSave={(next) =>
                  updateDetails({ conflictType: next || undefined })
                }
                placeholder="선택"
              />
            </S.DefValue>
          </S.DefRow>

          <S.DefRow>
            <S.DefLabel>전투 유형</S.DefLabel>
            <S.DefValue>
              <ChipRow>
                {COMBAT_TYPES.map((ct) => (
                  <ToggleChip
                    key={ct.value}
                    type="button"
                    $active={combatTypes.includes(ct.value)}
                    onClick={() => toggleCombatType(ct.value)}
                  >
                    {ct.label}
                  </ToggleChip>
                ))}
              </ChipRow>
            </S.DefValue>
          </S.DefRow>

          {TEXT_FIELDS.map((field) => (
            <S.DefRow key={field.key}>
              <S.DefLabel>{field.label}</S.DefLabel>
              <S.DefValue>
                <InlineText
                  value={(md[field.key] as string | undefined) ?? ''}
                  onSave={(next) =>
                    updateDetails({ [field.key]: next.trim() || undefined })
                  }
                  placeholder="입력"
                  multiline
                  multilineEnter
                />
              </S.DefValue>
            </S.DefRow>
          ))}

          <S.DefRow>
            <S.DefLabel>전쟁 비용</S.DefLabel>
            <S.DefValue>
              <InlineText
                value={warCost}
                onSave={(next) => onPatch({ warCost: next.trim() || undefined })}
                placeholder="입력"
              />
            </S.DefValue>
          </S.DefRow>
        </S.Definitions>
      </S.ModuleDataCard>
    </S.Section>
  )
}

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const ToggleChip = styled.button<{ $active: boolean }>`
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active
        ? MODULE_COLOR['military-details']
        : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.16)'
        : 'rgba(15,23,42,0.16)'};
  background: ${({ $active }) =>
    $active ? `${MODULE_COLOR['military-details']}1a` : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.14s, background 0.14s, color 0.14s;

  &:hover {
    border-color: ${MODULE_COLOR['military-details']};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
