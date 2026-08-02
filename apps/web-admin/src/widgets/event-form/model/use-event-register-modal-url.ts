/**
 * 사건 등록 모달의 열림 상태를 URL(`?eventForm=new`)에 동기화한다.
 *
 * 얻는 것:
 *  - **뒤로가기로 닫기** — 여는 것을 push로 남기므로 브라우저 뒤로가기가 모달만 닫는다
 *  - **새로고침·공유 복원** — 주소를 다시 열면 모달이 열린 상태로 시작
 *
 * 열기는 push(`replace: false`), 닫기는 replace — 닫은 뒤 뒤로가기를 누르면 모달이 다시
 * 열리는 되감기를 막는다. (사건 상세의 `?person=`/`?country=`와 같은 규약)
 *
 * ⚠️ 뒤로가기는 우리 코드를 거치지 않고 모달을 언마운트시킨다. 미저장 입력이 조용히
 * 사라지지 않도록 `useBlocker`로 가로채 확인을 받는다 — 모달 자체의 닫기(X·취소·Esc)는
 * 이미 확인을 받은 뒤 dirty를 내리고 오므로 여기서 두 번 묻지 않는다.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import { useBlocker, useSearchParams } from 'react-router-dom'

import { confirm } from '@/shared/ui/confirm-dialog'

/** 등록 폼 열림을 나타내는 쿼리 파라미터 */
export const EVENT_FORM_PARAM = 'eventForm'
const NEW_EVENT_VALUE = 'new'

const LEAVE_MESSAGE = '저장하지 않은 변경 사항이 있습니다. 닫으시겠습니까?'

export interface EventRegisterModalUrlState {
  isOpen: boolean
  open: () => void
  close: () => void
  /** 모달의 `onDirtyChange`에 그대로 연결 */
  onDirtyChange: (isDirty: boolean) => void
}

export function useEventRegisterModalUrl(): EventRegisterModalUrlState {
  const [searchParams, setSearchParams] = useSearchParams()
  const isOpen = searchParams.get(EVENT_FORM_PARAM) === NEW_EVENT_VALUE

  const [isDirty, setIsDirty] = useState(false)
  // state 대신 ref로 판정 — confirm 직후 같은 틱의 navigate가 stale state로 막히지 않게.
  const isDirtyRef = useRef(false)
  isDirtyRef.current = isDirty

  const open = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.set(EVENT_FORM_PARAM, NEW_EVENT_VALUE)
    setSearchParams(next, { replace: false })
  }, [searchParams, setSearchParams])

  const close = useCallback(() => {
    // 여기 도달했다는 건 모달이 이미 확인을 받았다는 뜻 — 블로커가 또 묻지 않게 먼저 내린다.
    isDirtyRef.current = false
    setIsDirty(false)
    const next = new URLSearchParams(searchParams)
    next.delete(EVENT_FORM_PARAM)
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  /**
   * 모달이 닫힌 뒤에는 dirty를 반드시 내린다.
   * 뒤로가기로 언마운트되면 모달은 `onDirtyChange(false)`를 보낼 기회가 없어, 이게 없으면
   * **그 다음 아무 이동이나 계속 막힌다**.
   */
  useEffect(() => {
    if (isOpen) return
    isDirtyRef.current = false
    setIsDirty(false)
  }, [isOpen])

  const blocker = useBlocker(() => isDirtyRef.current)
  // blocked 진입당 confirm 1회만 — 비동기 confirm 대기 중 리렌더로 다이얼로그 중복 방지.
  const promptingRef = useRef(false)

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      promptingRef.current = false
      return
    }
    if (promptingRef.current) return
    promptingRef.current = true
    confirm({ title: '확인', message: LEAVE_MESSAGE }).then((confirmed) => {
      if (confirmed) {
        isDirtyRef.current = false
        setIsDirty(false)
        blocker.proceed()
      } else {
        blocker.reset()
      }
    })
  }, [blocker])

  return { isOpen, open, close, onDirtyChange: setIsDirty }
}
