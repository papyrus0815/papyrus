import { FiPlus, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { type UpdateEventDto } from '@/shared/api/events'

import {
  type CasualtyShape,
  buildMilitaryPatch,
  getMilitary,
} from '../military-edit'
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
 * 사상자·피해 — 정규화 militaryEvent.casualties(진영별 행)의 편집 가능 뷰.
 *
 * 정규화 모델은 진영명 + 전사(totalKilled) + 부상(totalWounded)만 저장한다(서버
 * CasualtiesData). 진영 단위로 행을 추가/제거하고 각 값을 InlineText로 편집한다.
 */
export function ModuleCasualties({ event, onPatch }: ModuleCasualtiesProps) {
  const rows = getMilitary(event).casualties ?? []

  const updateRow = (idx: number, patch: Partial<CasualtyShape>) => {
    onPatch(
      buildMilitaryPatch(event, (draft) => ({
        ...draft,
        casualties: draft.casualties.map((c, i) =>
          i === idx ? { ...c, ...patch } : c,
        ),
      })),
    )
  }

  const addRow = () => {
    onPatch(
      buildMilitaryPatch(event, (draft) => ({
        ...draft,
        casualties: [...draft.casualties, { sideName: '' }],
      })),
    )
  }

  const removeRow = (idx: number) => {
    onPatch(
      buildMilitaryPatch(event, (draft) => ({
        ...draft,
        casualties: draft.casualties.filter((_, i) => i !== idx),
      })),
    )
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
            onRemove={() =>
              onPatch(
                buildMilitaryPatch(event, (draft) => ({
                  ...draft,
                  casualties: [],
                })),
              )
            }
          />
        </S.SectionActions>
      </S.SectionHeader>

      <Rows>
        {rows.map((row, idx) => (
          <Row key={idx}>
            <SideNameCell>
              <InlineText
                value={row.sideName ?? ''}
                onSave={(next) => updateRow(idx, { sideName: next.trim() })}
                placeholder={`진영 ${idx + 1}`}
              />
            </SideNameCell>
            <NumCell>
              <NumLabel>전사</NumLabel>
              <InlineText
                value={row.totalKilled ?? ''}
                onSave={(next) =>
                  updateRow(idx, { totalKilled: next.trim() || undefined })
                }
                placeholder="—"
              />
            </NumCell>
            <NumCell>
              <NumLabel>부상</NumLabel>
              <InlineText
                value={row.totalWounded ?? ''}
                onSave={(next) =>
                  updateRow(idx, { totalWounded: next.trim() || undefined })
                }
                placeholder="—"
              />
            </NumCell>
            <RemoveBtn
              type="button"
              onClick={() => removeRow(idx)}
              aria-label="행 제거"
            >
              <FiX />
            </RemoveBtn>
          </Row>
        ))}
      </Rows>

      <AddBtn type="button" onClick={addRow}>
        <FiPlus /> 진영 피해 추가
      </AddBtn>
    </S.Section>
  )
}

const Rows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const Row = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'};
  border-radius: 10px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr 1fr auto;
  }
`

const SideNameCell = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};

  @media (max-width: 520px) {
    grid-column: 1 / -1;
  }
`

const NumCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const NumLabel = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RemoveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  border-radius: 4px;
  transition: color 0.14s, background 0.14s;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'};
  }

  svg {
    width: 13px;
    height: 13px;
  }
`

const AddBtn = styled.button`
  align-self: flex-start;
  margin-top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.2)'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.14s, border-color 0.14s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
  }

  svg {
    width: 12px;
    height: 12px;
  }
`
