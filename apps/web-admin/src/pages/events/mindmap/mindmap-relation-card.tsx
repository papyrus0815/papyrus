/**
 * 마인드맵 연결 카드 — 선을 누르면(고치기·지우기), 마디를 끌어 다른 마디에 놓으면(새로 잇기) 뜬다.
 * 관계 설명은 35개 중 27개에 적혀 있는데 그림에선 선 위 마우스 올림으로만 보였다 — 카드가 '왜'를 읽는 자리.
 */
import { useState } from 'react'

import { FiArrowRight, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { metaText } from '@/pages/events/styles/theme'

import { type MindRelationItem, type MindRelationType } from './mindmap-types'
import { DIRECTED_RELATIONS, RELATION_DASH, RELATION_TYPE_NAME } from './survey-mindmap.lib'

const TYPES: MindRelationType[] = ['LED_TO', 'INFLUENCED', 'RESPONSE_TO', 'CONCURRENT', 'RELATED']

export interface RelationDraft {
  type: MindRelationType
  description: string
}

function TypePicker({ value, onChange }: { value: MindRelationType; onChange: (next: MindRelationType) => void }) {
  return (
    <Types role="radiogroup" aria-label="관계 종류">
      {TYPES.map((type) => (
        <button key={type} type="button" role="radio" aria-checked={value === type} onClick={() => onChange(type)}>
          <svg width="18" height="6" aria-hidden="true">
            <line x1="1" y1="3" x2="17" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray={RELATION_DASH[type] || undefined} />
          </svg>
          {RELATION_TYPE_NAME[type]}
        </button>
      ))}
    </Types>
  )
}

function ItemEditor({
  item,
  onSave,
  onDelete,
}: {
  item: MindRelationItem
  onSave?: (item: MindRelationItem, draft: RelationDraft) => Promise<void>
  onDelete?: (item: MindRelationItem) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<RelationDraft>({ type: item.type, description: item.description ?? '' })
  const directed = DIRECTED_RELATIONS.has(item.type)
  return (
    <Item>
      <Pair>
        <strong>{item.fromTitle}</strong>
        <span className="arrow" aria-label={directed ? '에서' : '와'}>
          {directed ? <FiArrowRight aria-hidden /> : '↔'}
        </span>
        <strong>{item.toTitle}</strong>
      </Pair>
      {!editing ? (
        <>
          <Kind>{RELATION_TYPE_NAME[item.type]}</Kind>
          {item.description ? <Why>{item.description}</Why> : <Why data-empty>이유가 아직 적혀 있지 않습니다</Why>}
          {(onSave || onDelete) && (
            <Actions>
              {onSave && (
                <button type="button" onClick={() => setEditing(true)}>
                  고치기
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  data-danger
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true)
                    try {
                      await onDelete(item)
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  연결 끊기
                </button>
              )}
            </Actions>
          )}
        </>
      ) : (
        <>
          <TypePicker value={draft.type} onChange={(type) => setDraft((previous) => ({ ...previous, type }))} />
          <textarea
            value={draft.description}
            onChange={(changeEvent) => setDraft((previous) => ({ ...previous, description: changeEvent.target.value }))}
            placeholder="어떻게 이어지나 — 한두 문장"
            rows={3}
            aria-label="연결 이유"
          />
          <Actions>
            <button type="button" onClick={() => setEditing(false)}>
              취소
            </button>
            <button
              type="button"
              data-primary
              disabled={busy}
              onClick={async () => {
                if (!onSave) return
                setBusy(true)
                try {
                  await onSave(item, draft)
                  setEditing(false)
                } finally {
                  setBusy(false)
                }
              }}
            >
              저장
            </button>
          </Actions>
        </>
      )}
    </Item>
  )
}

export function RelationCard({
  items,
  onClose,
  onSave,
  onDelete,
}: {
  items: MindRelationItem[]
  onClose: () => void
  onSave?: (item: MindRelationItem, draft: RelationDraft) => Promise<void>
  onDelete?: (item: MindRelationItem) => Promise<void>
}) {
  return (
    <Card role="dialog" aria-label="연결">
      <Head>
        <span>연결{items.length > 1 ? ` ${items.length}` : ''}</span>
        <Close type="button" onClick={onClose} aria-label="닫기">
          <FiX aria-hidden />
        </Close>
      </Head>
      {items.map((item) => (
        <ItemEditor key={item.id} item={item} onSave={onSave} onDelete={onDelete} />
      ))}
    </Card>
  )
}

export function NewRelationCard({
  fromTitle,
  toTitle,
  onCancel,
  onCreate,
}: {
  fromTitle: string
  toTitle: string
  onCancel: () => void
  onCreate: (draft: RelationDraft) => Promise<void>
}) {
  const [draft, setDraft] = useState<RelationDraft>({ type: 'LED_TO', description: '' })
  const [busy, setBusy] = useState(false)
  return (
    <Card role="dialog" aria-label="새 연결">
      <Head>
        <span>새 연결</span>
        <Close type="button" onClick={onCancel} aria-label="닫기">
          <FiX aria-hidden />
        </Close>
      </Head>
      <Item>
        <Pair>
          <strong>{fromTitle}</strong>
          <span className="arrow">
            <FiArrowRight aria-hidden />
          </span>
          <strong>{toTitle}</strong>
        </Pair>
        <Hint>끈 마디가 원인 쪽, 놓은 마디가 결과 쪽입니다(방향 없는 종류는 상관없음)</Hint>
        <TypePicker value={draft.type} onChange={(type) => setDraft((previous) => ({ ...previous, type }))} />
        <textarea
          value={draft.description}
          onChange={(changeEvent) => setDraft((previous) => ({ ...previous, description: changeEvent.target.value }))}
          placeholder="어떻게 이어지나 — 한두 문장(선택)"
          rows={3}
          aria-label="연결 이유"
          autoFocus
        />
        <Actions>
          <button type="button" onClick={onCancel}>
            취소
          </button>
          <button
            type="button"
            data-primary
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await onCreate(draft)
              } finally {
                setBusy(false)
              }
            }}
          >
            잇기
          </button>
        </Actions>
      </Item>
    </Card>
  )
}

const Card = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(340px, calc(100% - 24px));
  max-height: calc(100% - 24px);
  overflow-y: auto;
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background.primary};
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};

  textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 6px 8px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    border-radius: 8px;
    background: transparent;
    font: inherit;
    font-size: 13px;
    color: inherit;
    resize: vertical;
  }
`

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
  color: ${metaText};
`

const Close = styled.button`
  display: inline-flex;
  padding: 2px;
  border: 0;
  border-radius: 4px;
  background: none;
  color: inherit;
  cursor: pointer;
`

const Item = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  & + & {
    padding-top: 10px;
    border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  }
`

const Pair = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  line-height: 1.4;

  .arrow {
    display: inline-flex;
    color: ${metaText};
  }
`

const Kind = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Why = styled.p`
  margin: 0;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};

  &[data-empty] {
    color: ${metaText};
    font-style: italic;
  }
`

const Hint = styled.span`
  font-size: 12px;
  color: ${metaText};
`

const Types = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;

  button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    border-radius: 999px;
    background: transparent;
    font: inherit;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.secondary};
    cursor: pointer;

    &[aria-checked='true'] {
      border-color: ${({ theme }) => theme.colors.text.primary};
      color: ${({ theme }) => theme.colors.text.primary};
      font-weight: 700;
    }
  }
`

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 6px;

  button {
    padding: 4px 10px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    border-radius: 8px;
    background: transparent;
    font: inherit;
    font-size: 12.5px;
    color: ${({ theme }) => theme.colors.text.primary};
    cursor: pointer;

    &[data-primary] {
      border-color: transparent;
      background: ${({ theme }) => theme.colors.text.primary};
      color: ${({ theme }) => theme.colors.background.primary};
      font-weight: 700;
    }
    &[data-danger] {
      color: #dc2626;
    }
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }
`
