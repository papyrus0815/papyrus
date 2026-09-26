import { type ReactNode } from 'react'

import { FiPlus, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { RADIUS } from '@/pages/events/ledger/styles/ledger-tokens'

import { type UpdateEventDto } from '@/shared/api/events'

import {
  type CasualtyShape,
  buildMilitaryPatch,
  getMilitary,
} from '../military-edit'
import { metaText } from '@/pages/events/styles/theme'
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
                renderRead={renderCasualtyValue}
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
                renderRead={renderCasualtyValue}
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

/**
 * 사상자 값은 자유 서술이다 — "약 7만 (전사·전상사)", "약 14만 (전사·전상사, 질병 사망 별도)".
 * 통째로 16px 굵게 두면 수치 칸(1fr ≈ 170px)에서 두세 줄로 꺾여, 정작 **수치**가 괄호 설명에
 * 묻혔다. 읽기 표시에서만 수치는 굵게, 괄호 설명은 그 아래 작은 보조 글씨로 가른다.
 * 편집 진입 시엔 원문 그대로다.
 */
const CASUALTY_NOTE = /^(.+?)\s*[(（](.+)[)）]\s*$/

function renderCasualtyValue(value: string): ReactNode {
  const match = value.match(CASUALTY_NOTE)
  if (!match) return value
  return (
    <>
      {match[1]}
      <CasualtyNote>{match[2]}</CasualtyNote>
    </>
  )
}

const CasualtyNote = styled.span`
  display: block;
  margin-top: 2px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.45;
  word-break: keep-all;
  color: ${metaText};
`

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
  border-radius: ${RADIUS.MD};

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

/* '전사'·'부상'·'실종' — 한글이다. uppercase는 무의미하고 0.08em은 낱자로 흩뜨린다.
   바로 옆이 사상자 **수치**라, 이 라벨이 안 읽히면 그 숫자가 무엇의 수인지 사라진다. */
const NumLabel = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: ${metaText};
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
  border-radius: ${RADIUS.XS};
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
  border-radius: ${RADIUS.SM};
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
