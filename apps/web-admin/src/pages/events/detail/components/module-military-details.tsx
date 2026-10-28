import { useState } from 'react'

import { FiChevronDown, FiChevronUp } from 'react-icons/fi'
import styled from 'styled-components'

import { RADIUS } from '@/entities/event/ui/ledger-tokens'

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
  { key: 'treaty', label: '강화·조약' },
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
      buildMilitaryPatch(event, (current) => ({ ...(current ?? {}), ...patch })),
    )
  }

  const toggleCombatType = (value: string) => {
    const next = combatTypes.includes(value)
      ? combatTypes.filter((t) => t !== value)
      : [...combatTypes, value]
    updateDetails({ combatTypes: next })
  }

  const warCost = typeof event.warCost === 'string' ? event.warCost : ''

  /**
   * 분쟁 유형 — 사건 형식(WAR·BATTLE…)과 같은 말이면 줄을 세우지 않는다. 내용 있는 작전 정보 5건이 모두
   * 형식과 같은 값('전쟁')을 한 번 더 적고 있었다. 형식과 **다를 때만**(전쟁 사건의 공성 국면 등) 보인다.
   */
  const typeIsConflict = CONFLICT_TYPES.some((type) => type.value === event.type)
  const showConflictType = md.conflictType ? md.conflictType !== event.type : !typeIsConflict

  /**
   * 빈 칸은 접는다 — 내용 없는 작전 정보(이집트 원정)는 '입력'·'선택' 자리표시 13개가 414px을 먹었다.
   * 채운 줄만 보이고, 빈 줄은 '비어 있는 항목 N개'를 눌러야 열린다. 전부 비었으면 안내 한 줄 + '항목 채우기'.
   */
  const filledText = TEXT_FIELDS.filter((field) => String(md[field.key] ?? '').trim())
  const emptyText = TEXT_FIELDS.filter((field) => !String(md[field.key] ?? '').trim())
  const hasAnything =
    filledText.length > 0 || combatTypes.length > 0 || warCost.trim() !== '' || Boolean(md.conflictType)
  const [showEmpty, setShowEmpty] = useState(false)
  const emptyCount =
    emptyText.length +
    (combatTypes.length === 0 ? 1 : 0) +
    (warCost.trim() === '' ? 1 : 0) +
    (showConflictType && !md.conflictType ? 1 : 0)
  const isShown = (filled: boolean) => filled || showEmpty

  const textRow = (field: (typeof TEXT_FIELDS)[number]) => (
    <S.DefRow key={field.key}>
      <S.DefLabel>{field.label}</S.DefLabel>
      <S.DefValue>
        <InlineText
          value={(md[field.key] as string | undefined) ?? ''}
          onSave={(next) => updateDetails({ [field.key]: next.trim() || undefined })}
          placeholder="입력"
          multiline
          multilineEnter
        />
      </S.DefValue>
    </S.DefRow>
  )

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
                buildMilitaryPatch(event, () => null),
              )
            }
          />
        </S.SectionActions>
      </S.SectionHeader>

      <S.ModuleDataCard $accent={MODULE_COLOR['military-details']}>
        <S.Definitions>
          {showConflictType && isShown(Boolean(md.conflictType)) && (
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
          )}

          {isShown(combatTypes.length > 0) && (
          <S.DefRow>
            <S.DefLabel>전투 유형</S.DefLabel>
            <S.DefValue>
              <ChipRow>
                {COMBAT_TYPES.map((ct) => (
                  <ToggleChip
                    key={ct.value}
                    type="button"
                    $active={combatTypes.includes(ct.value)}
                    aria-pressed={combatTypes.includes(ct.value)}
                    onClick={() => toggleCombatType(ct.value)}
                  >
                    {ct.label}
                  </ToggleChip>
                ))}
              </ChipRow>
            </S.DefValue>
          </S.DefRow>
          )}

          {/* 순서는 고정(목적→…→전략적 영향) — 채운 줄과 빈 줄을 갈라 놓지 않는다 */}
          {TEXT_FIELDS.filter((field) => isShown(filledText.includes(field))).map(textRow)}

          {isShown(warCost.trim() !== '') && (
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
          )}
        </S.Definitions>
        {!hasAnything && !showEmpty && <EmptyNote>아직 적은 작전 정보가 없습니다.</EmptyNote>}
        {emptyCount > 0 && (
          <EmptyToggle type="button" aria-expanded={showEmpty} onClick={() => setShowEmpty((prev) => !prev)}>
            {showEmpty ? <FiChevronUp aria-hidden /> : <FiChevronDown aria-hidden />}
            {showEmpty ? '빈 항목 접기' : hasAnything ? `비어 있는 항목 ${emptyCount}개` : `항목 채우기 (${emptyCount})`}
          </EmptyToggle>
        )}
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
  border-radius: ${RADIUS.PILL};
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

/** 빈 줄 펼치기 — 카드 안 마지막 줄, 낮은 목소리의 글자 버튼 */
const EmptyToggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  padding: 4px 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  svg {
    width: 13px;
    height: 13px;
  }
`

const EmptyNote = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`
