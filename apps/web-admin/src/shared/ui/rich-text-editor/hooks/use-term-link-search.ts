/**
 * 용어(glossary) 연결 모달의 검색 데이터 흐름 훅 — getGlossaryTerms 호출 + 결과 보관.
 * 명령형 search(query)를 노출(모달 입력 onChange에서 호출). 디바운스 없음(원본 동작 유지).
 * 삽입/생성(insertTermLink 등 DOM·CRUD)은 부모가 보유한다.
 * (원본: rich-text-editor.tsx searchTermLinks + 상태 추출 — 동작 보존)
 */
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useState,
} from 'react'

import { type GlossaryTermDto, getGlossaryTerms } from '@/shared/api/glossary'

import type { DocumentScope } from '../rich-text-editor'

export function useTermLinkSearch(documentScope?: DocumentScope) {
  const [results, setResults] = useState<GlossaryTermDto[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  const search = useCallback(
    async (query: string) => {
      try {
        const params: Parameters<typeof getGlossaryTerms>[0] = {}
        if (query) params['q'] = query
        if (documentScope?.type === 'event') params.eventId = documentScope.id
        const list = await getGlossaryTerms(params)
        setResults(list)
        setSelectedIndex(0)
      } catch {
        setResults([])
      }
    },
    [documentScope],
  )

  return {
    results,
    selectedIndex,
    setSelectedIndex,
    setResults,
    search,
  } as {
    results: GlossaryTermDto[]
    selectedIndex: number
    setSelectedIndex: Dispatch<SetStateAction<number>>
    setResults: Dispatch<SetStateAction<GlossaryTermDto[]>>
    search: (query: string) => Promise<void>
  }
}
