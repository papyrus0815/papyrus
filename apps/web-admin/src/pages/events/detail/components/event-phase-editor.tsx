import { useMemo, useState } from 'react'

import { FiPlus, FiTrash2 } from 'react-icons/fi'
import styled from 'styled-components'

import { ledgerAccent, RADIUS } from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { type EventPhaseInput } from '@/shared/api/events'
import { Modal, ModalFooter } from '@/shared/ui/modal'

import {
  type EventPhase,
  type PhaseChild,
  assignPhases,
  formatPhasePoint,
  parsePhasePoint,
} from './event-phase.lib'

/**
 * 국면 편집 — 묶음 안의 구획(목차)을 이름·기간으로 적는다. 국면은 사건이 아니라서 사건 목록·검색에 서지 않고,
 * 하위 사건은 이 묶음 바로 아래에 그대로 둔 채 시작일로 국면에 자동 배정된다(하위 사건 쪽에서 손으로도 바꿀 수 있다).
 */
interface Draft {
  key: string
  id?: string
  title: string
  start: string
  end: string
}

interface EventPhaseEditorProps {
  isOpen: boolean
  onClose: () => void
  phases: ReadonlyArray<EventPhase>
  /** 직계 하위 — 국면마다 몇 건이 들어가는지 미리 보인다 */
  childEvents: ReadonlyArray<PhaseChild>
  saving: boolean
  onSave: (phases: EventPhaseInput[]) => void
  /** 직계 하위 중 묶음(대분류) 수 — 반 이상이면 '국면은 그 묶음 안에서' 안내 */
  collectionChildCount?: number
}

let draftSeq = 0
const nextKey = () => `draft-${(draftSeq += 1)}`

const toDraft = (phase: EventPhase): Draft => ({
  key: phase.id,
  id: phase.id,
  title: phase.title,
  start: formatPhasePoint(phase.startEra, phase.startYear, phase.startMonth, phase.startDay),
  end: formatPhasePoint(phase.endEra, phase.endYear, phase.endMonth, phase.endDay),
})

export function EventPhaseEditor({
  isOpen,
  onClose,
  phases,
  childEvents,
  saving,
  onSave,
  collectionChildCount = 0,
}: EventPhaseEditorProps) {
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    phases.length > 0
      ? [...phases].sort((left, right) => left.order - right.order).map(toDraft)
      : [{ key: nextKey(), title: '', start: '', end: '' }],
  )

  const update = (key: string, patch: Partial<Draft>) =>
    setDrafts((prev) => prev.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)))

  /* 입력 → 저장 모양. 읽을 수 없는 날짜·빈 이름은 오류로 모은다 */
  const parsed = useMemo(
    () =>
      drafts.map((draft) => {
        const start = parsePhasePoint(draft.start)
        const end = parsePhasePoint(draft.end)
        const errors = [
          !draft.title.trim() ? '이름' : null,
          start === undefined ? '시작' : null,
          end === undefined ? '끝' : null,
        ].filter(Boolean)
        const input: EventPhaseInput = {
          id: draft.id,
          title: draft.title.trim(),
          startEra: start?.era ?? null,
          startYear: start?.year ?? null,
          startMonth: start?.month ?? null,
          startDay: start?.day ?? null,
          endEra: end?.era ?? null,
          endYear: end?.year ?? null,
          endMonth: end?.month ?? null,
          endDay: end?.day ?? null,
        }
        return { key: draft.key, errors, input }
      }),
    [drafts],
  )
  const hasErrors = parsed.some((row) => row.errors.length > 0)

  /* 미리보기 — 지금 적은 국면으로 하위가 몇 건씩 들어가는지(손 지정은 기존 국면 id일 때만 유지) */
  const counts = useMemo(() => {
    const preview: EventPhase[] = parsed.map((row, index) => ({ ...row.input, id: row.input.id ?? row.key, order: index }))
    const assignment = assignPhases(preview, childEvents)
    const byPhase = new Map<string, number>()
    let outside = 0
    for (const value of assignment.values()) {
      if (value.phaseId) byPhase.set(value.phaseId, (byPhase.get(value.phaseId) ?? 0) + 1)
      else outside += 1
    }
    return { byPhase, outside }
  }, [parsed, childEvents])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="국면 나누기"
      subtitle="이 사건을 시간으로 나눈 장(章) — 사건이 아니라 목차라서 사건 목록에 따로 서지 않습니다"
      maxWidth="760px"
    >
      <Body>
        <Hint>
          하위 사건은 지금 자리에 그대로 두고, 시작일로 국면에 자동으로 들어갑니다. 월·일은 몰라도 됩니다 —
          ‘1791.10’, ‘1792.8.10’, ‘기원전 49’. 끝을 비우면 다음 국면 전까지입니다.
        </Hint>
        {/*
          * 하위가 대분류(묶음)면 국면은 그 묶음 안에서 — 여기서 나누면 몇 해짜리 묶음이 시작일로 한 국면에 통째로
          * 들어간다(프랑스 혁명에 국면을 두자 입법의회기가 1국면, 1792–1797 대불동맹 전쟁이 2국면이 됐다).
          */}
        {childEvents.length > 0 && collectionChildCount * 2 >= childEvents.length && (
          <Note $warn>
            직계 하위 {childEvents.length}건 중 {collectionChildCount}건이 묶음(대분류)입니다. 국면은 사건이 실제로 들어 있는
            묶음 안에서 나누세요 — 여기서 나누면 묶음 전체가 시작일로 한 국면에 들어갑니다.
          </Note>
        )}
        <Rows>
          {drafts.map((draft, index) => {
            const row = parsed[index]
            const count = counts.byPhase.get(draft.id ?? draft.key) ?? 0
            return (
              <Row key={draft.key}>
                <Ordinal aria-hidden>{index + 1}</Ordinal>
                <TitleInput
                  value={draft.title}
                  onChange={(changeEvent) => update(draft.key, { title: changeEvent.target.value })}
                  placeholder="예: 의회 개원과 거부권 정국 마비"
                  aria-label={`${index + 1}국면 이름`}
                  maxLength={200}
                  data-invalid={row.errors.includes('이름') || undefined}
                />
                <DateInput
                  value={draft.start}
                  onChange={(changeEvent) => update(draft.key, { start: changeEvent.target.value })}
                  placeholder="시작 1791.10"
                  aria-label={`${index + 1}국면 시작`}
                  data-invalid={row.errors.includes('시작') || undefined}
                />
                <Dash aria-hidden>–</Dash>
                <DateInput
                  value={draft.end}
                  onChange={(changeEvent) => update(draft.key, { end: changeEvent.target.value })}
                  placeholder="끝 1792.3"
                  aria-label={`${index + 1}국면 끝`}
                  data-invalid={row.errors.includes('끝') || undefined}
                />
                <Count title="지금 기간으로 이 국면에 들어가는 직계 하위 사건">하위 {count}건</Count>
                <IconButton
                  type="button"
                  onClick={() => setDrafts((prev) => prev.filter((item) => item.key !== draft.key))}
                  aria-label={`${index + 1}국면 지우기`}
                  title="지우기 — 하위 사건은 그대로 남습니다"
                >
                  <FiTrash2 aria-hidden />
                </IconButton>
              </Row>
            )
          })}
        </Rows>
        <AddRow
          type="button"
          onClick={() => setDrafts((prev) => [...prev, { key: nextKey(), title: '', start: '', end: '' }])}
        >
          <FiPlus aria-hidden /> 국면 추가
        </AddRow>
        {counts.outside > 0 && drafts.length > 0 && (
          <Note>어느 국면에도 들지 않는 하위 사건 {counts.outside}건 — 전개에서 ‘국면 전·사이·후’로 따로 모입니다.</Note>
        )}
        {hasErrors && <Note $warn>이름이 비었거나 읽을 수 없는 날짜가 있습니다 (빨간 칸)</Note>}
      </Body>
      <ModalFooter>
        <SecondaryButton type="button" onClick={onClose}>
          취소
        </SecondaryButton>
        <PrimaryButton
          type="button"
          disabled={hasErrors || saving}
          onClick={() => onSave(parsed.map((row) => row.input))}
        >
          {saving ? '저장 중…' : '저장'}
        </PrimaryButton>
      </ModalFooter>
    </Modal>
  )
}

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 24px 16px;
  overflow-y: auto;
`

const Hint = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: ${metaText};
`

const Rows = styled.ol`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const Row = styled.li`
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) 96px 10px 96px 64px 28px;
  align-items: center;
  gap: 6px;

  @media (max-width: 639px) {
    grid-template-columns: 22px 1fr 1fr 28px;
    grid-template-areas: 'num title title del' 'num start end count';

    & > :nth-child(1) { grid-area: num; }
    & > :nth-child(2) { grid-area: title; }
    & > :nth-child(3) { grid-area: start; }
    & > :nth-child(4) { display: none; }
    & > :nth-child(5) { grid-area: end; }
    & > :nth-child(6) { grid-area: count; }
    & > :nth-child(7) { grid-area: del; }
  }
`

const Ordinal = styled.span`
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const inputBase = `
  box-sizing: border-box;
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  background: transparent;
  font: inherit;
  font-size: 13.5px;
`

const TitleInput = styled.input`
  ${inputBase}
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.SM};
  color: ${({ theme }) => theme.colors.text.primary};

  &[data-invalid] {
    border-color: #dc2626;
  }
  &:focus {
    outline: none;
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const DateInput = styled(TitleInput)`
  font-variant-numeric: tabular-nums;
`

const Dash = styled.span`
  text-align: center;
  color: ${metaText};
`

const Count = styled.span`
  font-size: 12px;
  color: ${metaText};
  white-space: nowrap;
`

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${metaText};
  cursor: pointer;

  &:hover {
    color: #dc2626;
  }
`

const AddRow = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 30px;
  padding: 0 10px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.SM};
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
`

const Note = styled.p<{ $warn?: boolean }>`
  margin: 0;
  font-size: 12.5px;
  color: ${({ theme, $warn }) => ($warn ? (theme.mode === 'dark' ? '#f87171' : '#dc2626') : metaText({ theme }))};
`

const SecondaryButton = styled.button`
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.MD};
  background: transparent;
  font: inherit;
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
`

const PrimaryButton = styled.button`
  min-height: 36px;
  padding: 0 18px;
  border: none;
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  font: inherit;
  font-size: 13.5px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`
