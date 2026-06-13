/**
 * 엔티티 연결 모달의 검색 데이터 흐름 훅 — 디바운스 원격 fetch + 로컬 폴백.
 * contentEditable을 건드리지 않는 순수 데이터 로직이라 컴포넌트 밖으로 분리(단위 테스트 가능).
 * 삽입(insertEntityLink, DOM 조작)은 부모가 보유한다.
 * (원본: rich-text-editor.tsx runClientEntitySearch + 검색 effect 추출 — 동작 보존)
 */
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useState,
} from 'react'

import { toast } from 'react-hot-toast'

import {
  fetchEntityLinkSearch,
  mapEntityLinkRowsToMentionItems,
} from '@/shared/api/entity-link-search'
import type { MentionItem } from '@/shared/lib/mention/mention-system'
import { searchMentionEntities } from '@/shared/lib/mention/mention-system'

import type { MentionExtensionProps } from '../rich-text-editor'

/**
 * 엔티티 링크 검색 디바운스(ms). 키 누를 때마다 즉시 fetch하면 서버 부하·취소된
 * 응답 처리가 많아짐. AbortController로 이전 요청은 항상 취소되므로 짧은 값.
 */
const ENTITY_SEARCH_DEBOUNCE_MS = 280

interface UseEntityLinkSearchParams {
  /** 모달이 열려 있을 때만 검색(entityLinkModalVisible) */
  active: boolean
  query: string
  /** 서버 검색 모드(entityLinkRemote). false면 로컬 목록만 사용 */
  remote: boolean
  countryId?: string
  mentionEntities?: MentionExtensionProps
}

export function useEntityLinkSearch({
  active,
  query,
  remote,
  countryId,
  mentionEntities,
}: UseEntityLinkSearchParams) {
  const [results, setResults] = useState<MentionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  /** 클라이언트에 넘긴 목록만으로 검색 (폴백·빈 검색어 샘플) */
  const runClientSearch = useCallback(
    (searchQuery: string) => {
      if (!mentionEntities) {
        setResults([])
        setSelectedIndex(0)
        return
      }
      const found = searchMentionEntities(searchQuery, {
        persons: mentionEntities.persons as never[],
        events: mentionEntities.events as never[],
        countries: mentionEntities.countries as never[],
        historicalCountries: mentionEntities.historicalCountries as never[],
        militaryUnits: mentionEntities.militaryUnits as never[],
        dynasties: mentionEntities.dynasties as never[],
        politicalParties: mentionEntities.politicalParties as never[],
      })
      setResults(found.slice(0, 30))
      setSelectedIndex(0)
    },
    [mentionEntities],
  )

  /** 원격 검색 + 클라이언트 폴백 */
  useEffect(() => {
    if (!active) return

    if (!remote) {
      runClientSearch(query)
      return
    }

    const trimmed = query.trim()
    if (trimmed.length === 0) {
      if (mentionEntities) {
        runClientSearch('')
      } else {
        setResults([])
        setSelectedIndex(0)
      }
      setLoading(false)
      return
    }

    setLoading(true)
    const abortController = new AbortController()
    const timer = window.setTimeout(() => {
      fetchEntityLinkSearch({
        // eslint-disable-next-line no-restricted-syntax -- q는 API 파라미터명이라 변경 불가
        q: trimmed,
        countryId,
        signal: abortController.signal,
      })
        .then((rows) => {
          setResults(mapEntityLinkRowsToMentionItems(rows).slice(0, 40))
          setSelectedIndex(0)
        })
        .catch((err: unknown) => {
          const aborted =
            (err instanceof DOMException && err.name === 'AbortError') ||
            (typeof err === 'object' &&
              err !== null &&
              'name' in err &&
              (err as { name: string }).name === 'AbortError')
          if (aborted) return
          toast.error('서버 검색에 실패했습니다. 로컬 목록으로 다시 시도합니다.')
          if (mentionEntities) {
            runClientSearch(query)
          } else {
            setResults([])
            setSelectedIndex(0)
          }
        })
        .finally(() => setLoading(false))
    }, ENTITY_SEARCH_DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
      abortController.abort()
    }
  }, [active, remote, query, countryId, mentionEntities, runClientSearch])

  return {
    results,
    loading,
    selectedIndex,
    setSelectedIndex,
    setResults,
  } as {
    results: MentionItem[]
    loading: boolean
    selectedIndex: number
    setSelectedIndex: Dispatch<SetStateAction<number>>
    setResults: Dispatch<SetStateAction<MentionItem[]>>
  }
}
