import { useEffect } from 'react'

const SUFFIX = 'Papyrus'

/**
 * 문서 제목(<title>)을 지정 문자열로 설정하고, 언마운트·title 변경 시 직전 값으로 복원.
 *
 * 관리자 SPA는 라우트가 바뀌어도 <title>이 그대로라 탭·히스토리에서 화면 구분이
 * 안 된다. 상세 화면에서 대상 이름을 제목에 반영해 식별성을 높인다.
 *
 * - `title`이 비어 있으면(로딩 중 등) 변경하지 않는다 — 빈 제목 깜빡임 방지.
 * - 최종 제목은 `"<title> · Papyrus"`.
 */
export function useDocumentTitle(title: string | null | undefined): void {
  useEffect(() => {
    if (!title) return undefined
    const prev = document.title
    document.title = `${title} · ${SUFFIX}`
    return () => {
      document.title = prev
    }
  }, [title])
}
