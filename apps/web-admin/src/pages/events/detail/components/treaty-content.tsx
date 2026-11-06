import { useLayoutEffect, useRef, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiPlus, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { ledgerAccent, ledgerHairlineStrong } from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { type TreatyTermDto, treatyApi } from '@/shared/api/treaty'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { InlineText } from '@/shared/ui/inline-edit'
import { notify } from '@/shared/ui/toast'

/**
 * 조약 내용 — 사건 상세 조약 카드 안의 '무엇을 약속했나'(개요 + 조항 전문).
 *
 * 예전 카드는 이름·체결일·서명국과 조항 앞 3개의 발췌뿐이었고, 개요(조약 20건 중 19건에 있다)는 그리지 않았다.
 * 내용을 보려면 조약 상세로 건너가야 했다. 이제 개요와 조항 전문을 카드에서 읽고, 조항을 바로 더하고 고친다.
 * 정본은 여전히 Treaty — 조약 상세와 같은 캐시 키(['treaty', id])를 쓴다.
 */
interface TreatyContentProps {
  treatyId: string
  summary: string | null | undefined
  /** 사건 상세(조항 미리보기·개수)를 다시 읽게 */
  onChanged: () => void
}

/** 처음 보이는 조항 수 — 넘으면 '조항 N개 모두 보기' */
const TERM_PREVIEW = 5

export function TreatyContent({ treatyId, summary, onChanged }: TreatyContentProps) {
  const queryClient = useQueryClient()
  const { data: treaty, isLoading } = useQuery({
    queryKey: ['treaty', treatyId],
    queryFn: () => treatyApi.getById(treatyId),
    staleTime: 60_000,
  })
  const terms = [...(treaty?.terms ?? [])].sort((left, right) => left.order - right.order)
  const [showAll, setShowAll] = useState(false)
  const [adding, setAdding] = useState(false)
  const shown = showAll ? terms : terms.slice(0, TERM_PREVIEW)

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['treaty', treatyId] })
    void queryClient.invalidateQueries({ queryKey: ['treaties'] })
    onChanged()
  }
  const failed = (error: unknown) => {
    const text = error instanceof Error ? error.message : ''
    notify.error(text.includes('403') ? '본인이 등록한 조약만 고칠 수 있습니다' : '조약 내용을 저장하지 못했습니다')
  }

  const summaryMutation = useMutation({
    mutationFn: (next: string) => treatyApi.update(treatyId, { summary: next.trim() || null }),
    onSuccess: refresh,
    onError: failed,
  })
  const termMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<TreatyTermDto, 'title' | 'content' | 'isSecret'>> }) =>
      treatyApi.updateTerm(id, patch),
    onSuccess: refresh,
    onError: failed,
  })
  const addMutation = useMutation({
    mutationFn: (draft: { title: string; content: string; isSecret: boolean }) =>
      treatyApi.addTerm({
        treatyId,
        order: terms.length > 0 ? Math.max(...terms.map((term) => term.order)) + 1 : 0,
        title: draft.title.trim() || null,
        content: draft.content.trim(),
        isSecret: draft.isSecret,
      }),
    onSuccess: () => {
      notify.success('조항을 더했습니다')
      setAdding(false)
      setShowAll(true)
      refresh()
    },
    onError: failed,
  })
  const removeMutation = useMutation({
    mutationFn: (id: string) => treatyApi.removeTerm(id),
    onSuccess: refresh,
    onError: failed,
  })

  const removeTerm = async (term: TreatyTermDto, number: number) => {
    const ok = await confirm({
      title: '조항 지우기',
      message: `${number}조${term.title ? ` ‘${term.title}’` : ''}을(를) 지울까요? 조약 상세에서도 사라집니다.`,
      confirmLabel: '지우기',
      danger: true,
    })
    if (ok) removeMutation.mutate(term.id)
  }

  return (
    <Content aria-label="조약 내용">
      <Block>
        <BlockLabel>개요</BlockLabel>
        <InlineText
          value={treaty?.summary ?? summary ?? ''}
          onSave={(next) => summaryMutation.mutate(next)}
          placeholder="이 조약이 무엇을 정했는지 두세 문장 — 누가, 무엇을 넘기고 약속했나"
          label="조약 개요"
          multiline
          maxLength={4000}
          style={{ flex: 1 }}
          renderRead={(text) => <Clamped text={text} lines={4} />}
        />
      </Block>

      <Block>
        <BlockLabel>
          조항{terms.length > 0 && <Count>{terms.length}</Count>}
        </BlockLabel>
        {isLoading ? (
          <Hint>조항을 불러오는 중…</Hint>
        ) : terms.length === 0 && !adding ? (
          <Hint>아직 조항이 없습니다 — 할양·배상·동맹 의무처럼 조약이 정한 것을 한 조씩 적어 두면 여기서 읽힙니다.</Hint>
        ) : (
          <Terms>
            {shown.map((term, index) => (
              <Term key={term.id}>
                <TermNumber aria-hidden>{index + 1}</TermNumber>
                <TermBody>
                  {/* 제목은 있을 때만 — 없는 조항마다 '조항 제목(선택)' 자리표시가 서 있어 어수선했다 */}
                  {(term.title || term.isSecret) && (
                    <TermHead>
                      {term.title && (
                        <InlineText
                          value={term.title}
                          onSave={(next) => termMutation.mutate({ id: term.id, patch: { title: next.trim() || null } })}
                          label={`${index + 1}조 제목`}
                          maxLength={200}
                        />
                      )}
                      {term.isSecret && <Secret>비밀 조항</Secret>}
                    </TermHead>
                  )}
                  <RemoveTerm type="button" onClick={() => void removeTerm(term, index + 1)} aria-label={`${index + 1}조 지우기`}>
                    <FiX aria-hidden />
                  </RemoveTerm>
                  <InlineText
                    value={term.content}
                    onSave={(next) => {
                      if (next.trim()) termMutation.mutate({ id: term.id, patch: { content: next.trim() } })
                    }}
                    placeholder="조항 내용"
                    label={`${index + 1}조 내용`}
                    multiline
                    maxLength={8000}
                    style={{ flex: 1 }}
                    renderRead={(text) => <Clamped text={text} lines={3} />}
                  />
                </TermBody>
              </Term>
            ))}
          </Terms>
        )}
        {terms.length > TERM_PREVIEW && (
          <TextButton type="button" aria-expanded={showAll} onClick={() => setShowAll((previous) => !previous)}>
            {showAll ? '접기' : `조항 ${terms.length}개 모두 보기`}
          </TextButton>
        )}
        {adding ? (
          <NewTermForm
            saving={addMutation.isPending}
            onCancel={() => setAdding(false)}
            onSave={(draft) => addMutation.mutate(draft)}
          />
        ) : (
          <AddButton type="button" onClick={() => setAdding(true)}>
            <FiPlus aria-hidden /> 조항 더하기
          </AddButton>
        )}
      </Block>
    </Content>
  )
}

function NewTermForm({
  saving,
  onCancel,
  onSave,
}: {
  saving: boolean
  onCancel: () => void
  onSave: (draft: { title: string; content: string; isSecret: boolean }) => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isSecret, setIsSecret] = useState(false)
  return (
    <Form
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault()
        if (content.trim()) onSave({ title, content, isSecret })
      }}
    >
      <Field
        aria-label="새 조항 제목"
        placeholder="제목(선택) — 영토 할양, 배상금"
        maxLength={200}
        value={title}
        onChange={(changeEvent) => setTitle(changeEvent.target.value)}
      />
      <Area
        autoFocus
        aria-label="새 조항 내용"
        rows={3}
        placeholder="조항 내용"
        maxLength={8000}
        value={content}
        onChange={(changeEvent) => setContent(changeEvent.target.value)}
      />
      <FormRow>
        <label>
          <input type="checkbox" checked={isSecret} onChange={(changeEvent) => setIsSecret(changeEvent.target.checked)} /> 비밀 조항
        </label>
        <span />
        <TextButton type="button" onClick={onCancel}>
          취소
        </TextButton>
        <SaveButton type="submit" disabled={!content.trim() || saving}>
          {saving ? '저장 중…' : '조항 저장'}
        </SaveButton>
      </FormRow>
    </Form>
  )
}

/** 긴 글은 N줄까지, 넘치면 '더 보기' */
function Clamped({ text, lines }: { text: string; lines: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element || expanded) return
    setOverflowing(element.scrollHeight > element.clientHeight + 1)
  }, [text, expanded])
  return (
    <>
      <ClampText ref={ref} $lines={lines} data-expanded={expanded || undefined}>
        {text}
      </ClampText>
      {(overflowing || expanded) && (
        <TextButton type="button" aria-expanded={expanded} onClick={() => setExpanded((previous) => !previous)}>
          {expanded ? '접기' : '더 보기'}
        </TextButton>
      )}
    </>
  )
}

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.025)')};
`

const Block = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.text.primary};
`

const BlockLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Count = styled.span`
  margin-left: 6px;
  font-weight: 500;
  color: ${metaText};
`

const Hint = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${metaText};
`

const Terms = styled.ol`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
`

const Term = styled.li`
  position: relative;
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  gap: 8px;
  padding: 8px 0;
  border-top: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};

  &:first-child {
    border-top: none;
    padding-top: 2px;
  }
`

const TermNumber = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
  line-height: 1.9;

  &::after {
    content: '조';
    font-weight: 500;
  }
`

const TermBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding-right: 28px;
`

const TermHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-weight: 600;
`

const Secret = styled.span`
  padding: 0 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
  border: 1px solid currentColor;
`

const RemoveTerm = styled.button`
  position: absolute;
  top: 6px;
  right: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${metaText};
  cursor: pointer;
  opacity: 0;

  ${Term}:hover &,
  ${Term}:focus-within & {
    opacity: 1;
  }
  @media (hover: none) {
    opacity: 0.6;
  }
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 1px;
  }
`

const ClampText = styled.span<{ $lines: number }>`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${({ $lines }) => $lines};
  overflow: hidden;
  white-space: pre-wrap;

  &[data-expanded] {
    display: block;
    -webkit-line-clamp: unset;
  }
`

const TextButton = styled.button`
  align-self: flex-start;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${metaText};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 4px;
  }
`

const AddButton = styled(TextButton)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Field = styled.input`
  min-height: 32px;
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  font: inherit;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 1px;
  }
`

const Area = styled.textarea`
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  font: inherit;
  font-size: 14px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.primary};
  resize: vertical;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 1px;
  }
`

const FormRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};

  > span {
    flex: 1;
  }
`

const SaveButton = styled.button`
  min-height: 30px;
  padding: 0 12px;
  border: none;
  border-radius: 8px;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`
