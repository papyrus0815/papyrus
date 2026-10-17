import { useMemo, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'

import {
  RADIUS,
  ledgerAccent,
  ledgerAccentHover,
  ledgerHairline,
  ledgerHairlineStrong,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { splitEventIntoChildren } from '@/shared/api/events'
import { invalidateEventQueries } from '@/shared/api/invalidate-events'
import { Modal, ModalBody, ModalFooter } from '@/shared/ui/modal'
import { notify } from '@/shared/ui/toast'

import { type EventDetail } from '../use-event-detail'
import { crossPatchErrorMessage } from './detail-network.lib'
import { sectionKindOf } from './narrative-sections.lib'
import {
  type SplitRow,
  type SplitTarget,
  buildSplitPayload,
  initialSplitRows,
  rowError,
  summarizeRows,
} from './split-plan.lib'

const TARGETS: ReadonlyArray<{ value: SplitTarget; label: string }> = [
  { value: 'CHILD', label: '하위 사건' },
  { value: 'BACKGROUND', label: '배경' },
  { value: 'AFTERMATH', label: '여파' },
  { value: 'DROP', label: '버리기' },
]

interface SplitIntoChildrenModalProps {
  event: EventDetail
  onClose: () => void
}

/**
 * 단일 사건 → 묶음 사건('하위 사건으로 나누기').
 *
 * 묶음 사건의 전개는 하위 사건이 맡는다 — 그래서 전환은 지금 있는 전개 단락을 **어디로 보낼지
 * 정하는 일**이다. 단락마다 하위 사건(단락 본문이 그 사건의 전개가 된다)·배경·여파·버리기 중
 * 하나를 고르면 서버가 한 트랜잭션으로 나누고 묶음으로 바꾼다. 단락이 이미 하위 사건을 가리키면
 * 새로 만들지 않고 그 사건으로 옮긴다.
 */
export function SplitIntoChildrenModal({ event, onClose }: SplitIntoChildrenModalProps) {
  const queryClient = useQueryClient()
  const developmentSections = useMemo(
    () =>
      [...(event.eventSections ?? [])]
        .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
        .filter((section) => sectionKindOf(section.sectionType) === 'narrative'),
    [event.eventSections],
  )
  const subjectTitleById = useMemo(
    () => new Map((event.childEvents ?? []).map((child) => [child.id, child.title])),
    [event.childEvents],
  )
  const [rows, setRows] = useState<SplitRow[]>(() => initialSplitRows(developmentSections))
  const [submitting, setSubmitting] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  const updateRow = (index: number, patch: Partial<SplitRow>) =>
    setRows((previous) => previous.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)))

  const errors = rows.map(rowError)
  const hasErrors = errors.some(Boolean)

  const submit = async () => {
    if (hasErrors) {
      setShowErrors(true)
      return
    }
    setSubmitting(true)
    try {
      const result = await splitEventIntoChildren(event.id, buildSplitPayload(rows))
      invalidateEventQueries(queryClient, { eventId: event.id })
      const made = result.createdChildIds.length
      const moved = result.movedToExistingChild
      notify.success(
        made + moved > 0
          ? `묶음 사건이 됐습니다 — 하위 사건 ${made}건 생성${moved > 0 ? ` · ${moved}개 단락을 기존 하위로` : ''}`
          : '묶음 사건이 됐습니다 — 전개는 하위 사건으로 기록합니다',
      )
      onClose()
    } catch (error) {
      notify.error(crossPatchErrorMessage(error))
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="하위 사건으로 나누기"
      subtitle="묶음 사건은 전개를 글로 쓰지 않고 하위 사건으로 기록합니다"
      size="wide"
      closeOnOverlayClick={!submitting}
    >
      <Form
        onSubmit={(formEvent) => {
          formEvent.preventDefault()
          void submit()
        }}
      >
        <ModalBody>
          {rows.length === 0 ? (
            <Lead>
              전개 단락이 없습니다. 묶음 사건이 되면 &lsquo;{event.title}&rsquo;의 전개는 하위 사건으로
              쌓이고, 본문에는 배경과 여파만 남습니다.
            </Lead>
          ) : (
            <>
              <Lead>
                전개 단락 {rows.length}개의 행선지를 정해 주세요. &lsquo;하위 사건&rsquo;을 고르면 단락 본문이
                그대로 새 하위 사건의 전개가 됩니다.
              </Lead>
              <RowList>
                {rows.map((row, index) => {
                  const error = showErrors ? errors[index] : null
                  const existingTitle = row.subjectEventId
                    ? subjectTitleById.get(row.subjectEventId)
                    : undefined
                  return (
                    <RowItem key={row.sectionId}>
                      <RowHead>
                        <RowIndex aria-hidden>{index + 1}</RowIndex>
                        <RowTitle>{row.sectionTitle || '(제목 없는 단락)'}</RowTitle>
                      </RowHead>
                      <Targets role="radiogroup" aria-label={`${index + 1}번 단락의 행선지`}>
                        {TARGETS.map((target) => (
                          <TargetOption key={target.value} $active={row.to === target.value}>
                            <input
                              type="radio"
                              name={`split-${row.sectionId}`}
                              checked={row.to === target.value}
                              onChange={() => updateRow(index, { to: target.value })}
                            />
                            {target.label}
                          </TargetOption>
                        ))}
                      </Targets>
                      {row.to === 'CHILD' &&
                        (row.subjectEventId ? (
                          <Note>
                            이미 하위 사건 &lsquo;{existingTitle ?? '연결된 사건'}&rsquo;을 서술하는 단락이라 그 사건의 전개로
                            옮깁니다.
                          </Note>
                        ) : (
                          <Fields>
                            <Field $grow>
                              <FieldLabel htmlFor={`split-title-${row.sectionId}`}>하위 사건 제목</FieldLabel>
                              <Input
                                id={`split-title-${row.sectionId}`}
                                value={row.title}
                                onChange={(change) => updateRow(index, { title: change.target.value })}
                                aria-invalid={Boolean(error) || undefined}
                              />
                            </Field>
                            <Field>
                              <FieldLabel htmlFor={`split-start-${row.sectionId}`}>시작</FieldLabel>
                              <Input
                                id={`split-start-${row.sectionId}`}
                                value={row.start}
                                placeholder="예: 1854-11-05"
                                onChange={(change) => updateRow(index, { start: change.target.value })}
                              />
                            </Field>
                            <Field>
                              <FieldLabel htmlFor={`split-end-${row.sectionId}`}>끝</FieldLabel>
                              <Input
                                id={`split-end-${row.sectionId}`}
                                value={row.end}
                                placeholder="(선택)"
                                onChange={(change) => updateRow(index, { end: change.target.value })}
                              />
                            </Field>
                          </Fields>
                        ))}
                      {error && <ErrorText role="alert">{error}</ErrorText>}
                    </RowItem>
                  )
                })}
              </RowList>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          {rows.length > 0 && <Summary>{summarizeRows(rows)}</Summary>}
          <Button type="button" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button type="submit" $primary disabled={submitting}>
            {submitting ? '나누는 중…' : rows.length > 0 ? '나누고 묶음 사건으로' : '묶음 사건으로 바꾸기'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

/** 본문만 스크롤하고 바닥(요약·버튼)은 고정 — 모달 상자의 남은 높이를 채운다 */
const Form = styled.form`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`

const Lead = styled.p`
  margin: 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RowList = styled.ol`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
`

const RowItem = styled.li`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 0;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  &:last-child {
    border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }
`

const RowHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
`

const RowIndex = styled.span`
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`

const RowTitle = styled.span`
  min-width: 0;
  font-size: 14.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow-wrap: anywhere;
`

const Targets = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const TargetOption = styled.label<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ theme, $active }) => ($active ? ledgerAccent(theme.mode) : ledgerHairlineStrong(theme.mode))};
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ theme, $active }) => ($active ? ledgerAccent(theme.mode) : theme.colors.text.secondary)};
  cursor: pointer;

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  &:focus-within {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

const Fields = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

const Field = styled.div<{ $grow?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: ${({ $grow }) => ($grow ? '1 1 260px' : '0 1 140px')};
  min-width: 0;
`

const FieldLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: ${metaText};
`

const Input = styled.input`
  min-height: 34px;
  padding: 6px 10px;
  font: inherit;
  font-size: 13.5px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};

  &[aria-invalid='true'] {
    border-color: ${({ theme }) => theme.colors.error};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 1px;
  }
`

const Note = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ErrorText = styled.p`
  margin: 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.error};
`

const Summary = styled.span`
  margin-right: auto;
  font-size: 12.5px;
  color: ${metaText};
`

const Button = styled.button<{ $primary?: boolean }>`
  padding: 7px 16px;
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ theme, $primary }) => ($primary ? ledgerAccent(theme.mode) : ledgerHairlineStrong(theme.mode))};
  background: ${({ theme, $primary }) => ($primary ? ledgerAccent(theme.mode) : 'transparent')};
    /* 다크의 강조색은 밝은 인디고라 흰 글자가 안 읽힌다 — 면이 밝으면 글자를 어둡게 */
  color: ${({ theme, $primary }) =>
    $primary ? (theme.mode === 'dark' ? '#111827' : '#fff') : theme.colors.text.primary};
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:not(:disabled):hover {
    background: ${({ theme, $primary }) => ($primary ? ledgerAccentHover(theme.mode) : 'transparent')};
  }
  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`
