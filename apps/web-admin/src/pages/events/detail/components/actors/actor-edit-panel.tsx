import { type KeyboardEvent, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

import {
  ChoiceChip,
  ChoiceChips,
  EditDone,
  EditField,
  EditFoot,
  EditHint,
  EditInput,
  EditLabel,
  EditPanel,
  EditTextarea,
} from './actors.styles'

/** 하나 고르기(칩) — 누르면 바로 저장 */
export interface ActorChoiceField {
  id: string
  label: string
  value: string
  options: Array<{ value: string; label: string; hint?: string; muted?: boolean }>
  onPick: (value: string) => void
}

/** 글 칸 — 칸을 벗어나면 저장 */
export interface ActorTextField {
  id: string
  label: string
  value: string
  placeholder?: string
  /** 여러 줄(비고·한 일) — 글 높이만큼 자란다. 한 줄 칸은 Enter로 다음 칸 */
  multiline?: boolean
  maxLength?: number
  onSave: (next: string) => void
}

/**
 * 참여 탭의 편집 칸 — 인물·나라가 같이 쓴다. 고르기(칩) 칸들 위, 글 칸들 아래.
 *
 * - 열리면 카드를 화면에 들이고 **처음 빈 글 칸**(없으면 첫 글 칸)에 커서.
 * - 글은 칸마다 저장(행 단위 머지 patch · 되돌리기 토스트). '완료'·Esc는 아직 안 나간 글까지 저장하고 닫는다.
 * - ⚠️ 칩을 누르기 전·칸이 사라질 때 아직 안 나간 글을 먼저 보낸다. 칩(참여 국가·진영)을 고르면 카드가
 *   다른 묶음으로 옮겨 새로 그려지는데, blur보다 그게 먼저면 친 글이 통째로 사라졌다(실측).
 * - 열려 있는지는 위(DetailActors)가 쥔다 — 카드가 옮겨 가도 열린 채 따라온다.
 */
export function ActorEditPanel({
  name,
  choices,
  texts,
  onClose,
}: {
  /** 누구의 편집 칸인지(스크린리더 묶음 이름) */
  name: string
  choices: ActorChoiceField[]
  texts: ActorTextField[]
  onClose: () => void
}) {
  const fieldId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRefs = useRef(new Map<string, HTMLInputElement | HTMLTextAreaElement>())
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(texts.map((field) => [field.id, field.value])),
  )
  /** 마지막으로 보낸 값 — blur 저장과 '완료' 저장이 같은 글을 두 번 보내지 않게 */
  const sentRef = useRef<Record<string, string>>(
    Object.fromEntries(texts.map((field) => [field.id, field.value.trim()])),
  )
  /** 렌더 밖(칸이 사라질 때)에서 읽는 최신 글·저장 함수 */
  const draftsRef = useRef(drafts)
  draftsRef.current = drafts
  const textsRef = useRef(texts)
  textsRef.current = texts

  /* 서버 값이 바뀌면(되돌리기·다른 칸 저장 뒤 다시 받기) 쓰고 있지 않은 칸만 따라간다 — 치는 글은 덮지 않는다 */
  const valueKey = texts.map((field) => `${field.id}\u0000${field.value}`).join('\u0001')
  useEffect(() => {
    for (const field of textsRef.current) {
      sentRef.current[field.id] = field.value.trim()
      if (document.activeElement !== inputRefs.current.get(field.id)) {
        setDrafts((previous) => (previous[field.id] === field.value ? previous : { ...previous, [field.id]: field.value }))
      }
    }
  }, [valueKey])

  /* 열릴 때(새로 그려질 때 포함) 한 번 — 카드를 화면에 들이고 처음 빈 글 칸에 커서 */
  useEffect(() => {
    panelRef.current?.closest('li')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    const firstEmpty = textsRef.current.find((field) => !field.value.trim()) ?? textsRef.current[0]
    if (firstEmpty) inputRefs.current.get(firstEmpty.id)?.focus({ preventScroll: true })
  }, [])

  /* 칸이 사라질 때(닫기·카드 이동) 아직 안 나간 글을 보낸다 — blur가 오지 않는 경로의 안전망 */
  useEffect(
    () => () => {
      for (const field of textsRef.current) {
        const next = (draftsRef.current[field.id] ?? '').trim()
        if (next !== sentRef.current[field.id]) {
          sentRef.current[field.id] = next
          field.onSave(next)
        }
      }
    },
    [],
  )

  /* 여러 줄 칸은 글 높이만큼 */
  useLayoutEffect(() => {
    for (const field of texts) {
      if (!field.multiline) continue
      const node = inputRefs.current.get(field.id)
      if (!node) continue
      node.style.height = 'auto'
      node.style.height = `${node.scrollHeight}px`
    }
  }, [drafts, texts])

  const save = (field: ActorTextField) => {
    const next = (drafts[field.id] ?? '').trim()
    if (next === sentRef.current[field.id]) return
    sentRef.current[field.id] = next
    field.onSave(next)
  }
  const flushTexts = () => texts.forEach(save)
  const finish = () => {
    flushTexts()
    onClose()
  }

  const onPanelKeyDown = (keyEvent: KeyboardEvent<HTMLDivElement>) => {
    if (keyEvent.key === 'Escape') {
      keyEvent.preventDefault()
      keyEvent.stopPropagation()
      finish()
    }
  }

  return (
    <EditPanel ref={panelRef} role="group" aria-label={`${name} 정보`} onKeyDown={onPanelKeyDown}>
      {choices.map((choice) => (
        <EditField key={choice.id}>
          <EditLabel as="span" id={`${fieldId}-${choice.id}`}>
            {choice.label}
          </EditLabel>
          <ChoiceChips role="radiogroup" aria-labelledby={`${fieldId}-${choice.id}`}>
            {choice.options.map((option) => {
              const selected = option.value === choice.value
              return (
                <ChoiceChip
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  title={option.hint}
                  $selected={selected}
                  $muted={option.muted}
                  onClick={() => {
                    if (selected) return
                    flushTexts()
                    choice.onPick(option.value)
                  }}
                >
                  {option.label}
                </ChoiceChip>
              )
            })}
          </ChoiceChips>
        </EditField>
      ))}

      {texts.map((field, index) => {
        const id = `${fieldId}-${field.id}`
        const common = {
          id,
          value: drafts[field.id] ?? '',
          placeholder: field.placeholder,
          maxLength: field.maxLength,
          onBlur: () => save(field),
        }
        return (
          <EditField key={field.id}>
            <EditLabel htmlFor={id}>{field.label}</EditLabel>
            {field.multiline ? (
              <EditTextarea
                {...common}
                ref={(node) => {
                  if (node) inputRefs.current.set(field.id, node)
                  else inputRefs.current.delete(field.id)
                }}
                rows={2}
                onChange={(changeEvent) => setDrafts((previous) => ({ ...previous, [field.id]: changeEvent.target.value }))}
              />
            ) : (
              <EditInput
                {...common}
                ref={(node) => {
                  if (node) inputRefs.current.set(field.id, node)
                  else inputRefs.current.delete(field.id)
                }}
                onChange={(changeEvent) => setDrafts((previous) => ({ ...previous, [field.id]: changeEvent.target.value }))}
                onKeyDown={(keyEvent) => {
                  /* Enter = 저장하고 다음 칸으로(IME 조합 중 Enter는 글자 확정이라 넘긴다) */
                  if (keyEvent.key !== 'Enter' || keyEvent.nativeEvent.isComposing) return
                  keyEvent.preventDefault()
                  save(field)
                  const next = texts[index + 1]
                  if (next) inputRefs.current.get(next.id)?.focus()
                }}
              />
            )}
          </EditField>
        )
      })}

      <EditFoot>
        <EditHint>칸을 벗어나면 저장됩니다 · Esc로 닫기</EditHint>
        <EditDone type="button" onClick={finish}>
          완료
        </EditDone>
      </EditFoot>
    </EditPanel>
  )
}
