/**
 * 건국·멸망 카드의 입력 모달 — 카드 안에서 바로 입력칸을 펼치던 것(역할 메모 한 줄 입력·배경
 * 리치 에디터)을 모달로 옮겼다. 카드는 읽는 자리로 두고, 쓰는 일은 모달 한 곳에서.
 */
import { type KeyboardEvent, useEffect, useRef, useState } from 'react'

import { FiTrash2 } from 'react-icons/fi'
import styled from 'styled-components'

import { uploadImage } from '@/shared/api/upload'
import { Modal, ModalBody, ModalFooter } from '@/shared/ui/modal'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'

import { FoundingThumb } from './founding-media'

const NOTE_MAX = 255

/** 자주 쓰는 역할 — 누르면 메모 칸에 들어간다(덮어쓰지 않고 비어 있을 때만 그대로, 아니면 뒤에 덧붙임) */
const NOTE_SUGGESTIONS = {
  FOUNDING: ['건국 선포', '초대 군주', '반란 주도', '독립 선언', '왕조 개창', '후원국'],
  DISSOLUTION: ['정복', '병합', '수도 함락', '왕위 찬탈', '혁명 주도', '분할'],
} as const

export interface AgentEditTarget {
  id: string
  label: string
  kindLabel: string
  span: string
  note: string | null
  imageUrl: string | null | undefined
  round: boolean
  /** 미리보기를 열 수 있는 주체(인물·국가)인가 — 자유 입력 이름은 볼 것이 없다 */
  canPreview: boolean
}

interface AgentEditModalProps {
  target: AgentEditTarget | null
  side: 'FOUNDING' | 'DISSOLUTION'
  /** '건국자'·'멸망시킨 쪽' */
  roleLabel: string
  saving: boolean
  removing: boolean
  onClose: () => void
  onSave: (note: string) => void
  onRemove: () => void
  onPreview: () => void
}

export function AgentEditModal({
  target,
  side,
  roleLabel,
  saving,
  removing,
  onClose,
  onSave,
  onRemove,
  onPreview,
}: AgentEditModalProps) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (target) setDraft(target.note ?? '')
  }, [target])

  const submit = () => {
    if (!saving) onSave(draft.trim())
  }
  const onKeyDown = (keyEvent: KeyboardEvent<HTMLTextAreaElement>) => {
    // 한 줄 메모 — Enter로 저장, Shift+Enter만 줄바꿈(한글 조합 중 Enter는 무시)
    if (keyEvent.key === 'Enter' && !keyEvent.shiftKey && !keyEvent.nativeEvent.isComposing) {
      keyEvent.preventDefault()
      submit()
    }
  }
  const addSuggestion = (word: string) => {
    setDraft((current) => {
      const trimmed = current.trim()
      if (!trimmed) return word
      if (trimmed.includes(word)) return current
      return `${trimmed} · ${word}`.slice(0, NOTE_MAX)
    })
    inputRef.current?.focus()
  }

  return (
    <Modal
      isOpen={!!target}
      onClose={onClose}
      title={`${roleLabel} 역할`}
      size="narrow"
      maxWidth="460px"
      initialFocusRef={inputRef}
    >
      {target && (
        <>
          <ModalBody>
            <Who>
              <FoundingThumb
                src={target.imageUrl}
                name={target.label}
                shape={target.round ? 'round' : 'rect'}
                size={44}
                keepPlaceholder
              />
              <WhoText>
                <strong>{target.label}</strong>
                <span>{[target.kindLabel, target.span].filter(Boolean).join(' · ')}</span>
              </WhoText>
              {target.canPreview && (
                <GhostButton type="button" onClick={onPreview}>
                  자세히 보기
                </GhostButton>
              )}
            </Who>

            <Field>
              <FieldLabel htmlFor="statehood-agent-note">
                이 {side === 'FOUNDING' ? '건국' : '멸망'}에서 한 일
              </FieldLabel>
              <NoteArea
                id="statehood-agent-note"
                ref={inputRef}
                rows={2}
                value={draft}
                maxLength={NOTE_MAX}
                placeholder={side === 'FOUNDING' ? '예: 위화도 회군 후 즉위' : '예: 사비성 함락'}
                onChange={(changeEvent) => setDraft(changeEvent.target.value)}
                onKeyDown={onKeyDown}
              />
              <FieldFoot>
                <Suggestions aria-label="자주 쓰는 역할">
                  {NOTE_SUGGESTIONS[side].map((word) => (
                    <SuggestionChip key={word} type="button" onClick={() => addSuggestion(word)}>
                      {word}
                    </SuggestionChip>
                  ))}
                </Suggestions>
                <Count>
                  {draft.length}/{NOTE_MAX}
                </Count>
              </FieldFoot>
            </Field>
          </ModalBody>
          <ModalFooter>
            <DangerButton type="button" onClick={onRemove} disabled={removing}>
              <FiTrash2 aria-hidden /> {roleLabel}에서 빼기
            </DangerButton>
            <Spacer />
            <SecondaryButton type="button" onClick={onClose}>
              취소
            </SecondaryButton>
            <PrimaryButton type="button" onClick={submit} disabled={saving}>
              {saving ? '저장 중…' : '저장'}
            </PrimaryButton>
          </ModalFooter>
        </>
      )}
    </Modal>
  )
}

interface BackgroundEditModalProps {
  isOpen: boolean
  /** '건국'·'멸망' */
  title: string
  side: 'founding' | 'dissolution'
  initialHtml: string
  saving: boolean
  onClose: () => void
  onSave: (html: string) => void
}

export function BackgroundEditModal({
  isOpen,
  title,
  side,
  initialHtml,
  saving,
  onClose,
  onSave,
}: BackgroundEditModalProps) {
  const [draft, setDraft] = useState(initialHtml)
  useEffect(() => {
    if (isOpen) setDraft(initialHtml)
  }, [isOpen, initialHtml])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${title} 배경`}
      subtitle={`이 나라가 어떤 경위로 ${side === 'founding' ? '세워졌는지' : '사라졌는지'} — 사진·표도 넣을 수 있습니다`}
      size="wide"
      closeOnOverlayClick={false}
    >
      <ModalBody>
        {isOpen && (
          <RichTextEditor
            value={initialHtml}
            onChange={(html) => setDraft(html)}
            placeholder={`이 나라가 어떤 경위로 ${side === 'founding' ? '세워졌는지' : '사라졌는지'} 적어 주세요`}
            showTitle={false}
            onImageUpload={async (file) => {
              const result = await uploadImage(file, 'attachments')
              return result.url ?? (result as unknown as string)
            }}
          />
        )}
      </ModalBody>
      <ModalFooter>
        <SecondaryButton type="button" onClick={onClose}>
          취소
        </SecondaryButton>
        <PrimaryButton
          type="button"
          disabled={saving}
          onClick={() => {
            const html = draft.replace(/<p><\/p>/g, '').trim()
            onSave(html.replace(/<[^>]*>/g, '').trim() ? html : '')
          }}
        >
          {saving ? '저장 중…' : '저장'}
        </PrimaryButton>
      </ModalFooter>
    </Modal>
  )
}

// ─── Styled ─────────────────────────────────────────────────────────────────

const Who = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const WhoText = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong {
    font-size: 15px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  span {
    font-size: 12.5px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const FieldLabel = styled.label`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const NoteArea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  border-radius: 10px;
  background: transparent;
  font: inherit;
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.primary};
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.activeLight};
  }
`

const FieldFoot = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
`

const Suggestions = styled.div`
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const SuggestionChip = styled.button`
  height: 26px;
  padding: 0 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 999px;
  background: transparent;
  font: inherit;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.activeLight};
  }
`

const Count = styled.span`
  flex: none;
  padding-top: 4px;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Spacer = styled.span`
  flex: 1;
`

const buttonBase = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const PrimaryButton = styled.button`
  ${buttonBase}
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
`

const SecondaryButton = styled.button`
  ${buttonBase}
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
`

const GhostButton = styled.button`
  ${buttonBase}
  height: 30px;
  padding: 0 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const DangerButton = styled.button`
  ${buttonBase}
  padding: 0 10px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.alert.danger.fg};

  &:hover {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(248,113,113,0.12)' : '#fef2f2')};
  }
`
