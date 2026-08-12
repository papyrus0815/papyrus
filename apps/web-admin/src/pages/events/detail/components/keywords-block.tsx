import { useRef, useState } from 'react'

import { FiPlus, FiX } from 'react-icons/fi'

import { type UpdateEventDto } from '@/shared/api/events'

import { focusNextRemovalTarget } from './detail-network.lib'
import * as NetStyles from './detail-network.styles'

interface KeywordsBlockProps {
  /** 표시 키워드 — 컨테이너가 공백/비문자열을 걸러 내려준다(부제 카운트와 동일 원본). */
  keywords: string[]
  onPatch: (patch: UpdateEventDto) => void
}

/**
 * 키워드 블록 — inline chip 편집. 칩의 ✕로 제거, "+" 인풋으로 추가. 별도 폼 X.
 * 입력·펼침 상태가 다른 블록과 얽히지 않아 상태까지 이 파일에 자급자족.
 */
export function KeywordsBlock({ keywords, onPatch }: KeywordsBlockProps) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  /* 제거 버튼 포커스 이양용 ref — 칩을 지우면 포커스가 body로 낙하해 키보드
   * 흐름이 끊기므로, 제거 직전 다음 형제의 제거 버튼(없으면 '추가' 버튼)으로 옮긴다. */
  const keywordRemoveRefs = useRef(new Map<string, HTMLButtonElement>())
  const keywordAddRef = useRef<HTMLButtonElement | null>(null)

  const submitKeyword = () => {
    const next = draft.trim()
    setDraft('')
    setAdding(false)
    if (!next) return
    if (keywords.includes(next)) return
    onPatch({ keywords: [...keywords, next] })
  }

  /**
   * blur 정책:
   *  - 입력이 비어 있으면 cancel (UI만 닫고 저장 X).
   *  - 입력이 있으면 *저장 시도* — 사용자가 길게 타이핑하다 다른 곳을 클릭해도
   *    내용이 날아가지 않도록. 짧은 부분 단어 자동 저장이 문제될 가능성은 있으나,
   *    공백 trim + 중복 차단이 들어가 있어 빈 키워드/중복은 묵음 무시.
   *  - Esc는 항상 cancel.
   */
  const handleBlur = () => {
    if (!draft.trim()) {
      cancelKeyword()
      return
    }
    submitKeyword()
  }

  const cancelKeyword = () => {
    setDraft('')
    setAdding(false)
  }

  const removeKeyword = (keyword: string) => {
    focusNextRemovalTarget(
      keywordRemoveRefs.current,
      keywords,
      keyword,
      keywordAddRef.current,
    )
    onPatch({ keywords: keywords.filter((item) => item !== keyword) })
  }

  return (
    <NetStyles.KeywordsBlock role="group" aria-labelledby="network-keywords-label">
      <NetStyles.KeywordsLabel id="network-keywords-label">키워드</NetStyles.KeywordsLabel>
      <NetStyles.KeywordsRow>
        {keywords.map((keyword) => (
          <NetStyles.KeywordChip key={keyword}>
            <span>{keyword}</span>
            <NetStyles.ChipX
              type="button"
              ref={(node) => {
                if (node) keywordRemoveRefs.current.set(keyword, node)
                else keywordRemoveRefs.current.delete(keyword)
              }}
              onClick={() => removeKeyword(keyword)}
              aria-label={`${keyword} 제거`}
            >
              <FiX />
            </NetStyles.ChipX>
          </NetStyles.KeywordChip>
        ))}
        {adding ? (
          <NetStyles.KeywordInput
            autoFocus
            value={draft}
            onChange={(changeEvent) => setDraft(changeEvent.target.value)}
            onBlur={handleBlur}
            onKeyDown={(keyEvent) => {
              // IME 조합 중 Enter는 조합 확정 — 키워드 조기 커밋 방지.
              if (keyEvent.key === 'Enter' && !keyEvent.nativeEvent.isComposing) {
                keyEvent.preventDefault()
                submitKeyword()
              }
              if (keyEvent.key === 'Escape') {
                keyEvent.preventDefault()
                cancelKeyword()
              }
            }}
            placeholder="키워드 입력 후 Enter"
          />
        ) : (
          <NetStyles.AddBtn
            type="button"
            ref={keywordAddRef}
            onClick={() => setAdding(true)}
          >
            <FiPlus /> 추가
          </NetStyles.AddBtn>
        )}
      </NetStyles.KeywordsRow>
    </NetStyles.KeywordsBlock>
  )
}
