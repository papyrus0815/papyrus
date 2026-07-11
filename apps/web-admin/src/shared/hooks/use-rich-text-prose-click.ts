import { useCallback, useEffect, useRef } from 'react'

import type { NavigateFunction } from 'react-router-dom'

import { dynastyApi } from '@/shared/api/dynasty'
import { getGlossaryTermById, type GlossaryTermDto } from '@/shared/api/glossary'
import { getHistoricalCountryById } from '@/shared/api/historical-countries'
import { militaryUnitApi } from '@/shared/api/military-unit'
import { politicalPartyApi } from '@/shared/api/political-party'
import { pathKeys } from '@/shared/router'
import { notify } from '@/shared/ui/toast'

/**
 * 세션 단위 용어/가문 상세 캐시 — 같은 항목을 반복 클릭해도 재fetch·「로딩…」 깜빡임을
 * 없앤다(C4). 백과 한 세션에서 term/dynasty 수는 작아 evict 없이 유지한다.
 * `.has()`로 캐시 유무를 판단(설명이 null인 정상 항목과 미조회를 구분).
 */
const glossaryTermCache = new Map<string, GlossaryTermDto>()
const dynastyDescCache = new Map<string, string | null>()

/**
 * 용어 캐시 무효화 — 용어 수정/삭제 후 호출해 다음 클릭이 최신값을 다시 불러오게 한다.
 * (id 생략 시 전체 비움). 캐시가 세션 내내 유지돼 편집 결과가 툴팁에 안 비치는 것을 방지.
 */
export function invalidateGlossaryTermCache(id?: string): void {
  if (id) glossaryTermCache.delete(id)
  else glossaryTermCache.clear()
}

/** 가문 툴팁 설명 캐시 무효화 (id 생략 시 전체). */
export function invalidateDynastyTooltipCache(id?: string): void {
  if (id) dynastyDescCache.delete(id)
  else dynastyDescCache.clear()
}

export type RichTextTermTooltipState = {
  termId: string
  name: string
  description: string | null
  x: number
  y: number
  /** 용어의 출처 국가(현대/역사) — 팝오버 「더 보기」 딥링크용(C5). */
  countryId?: string | null
  historicalCountryId?: string | null
}

export type RichTextDynastyTooltipState = {
  dynastyId: string
  name: string
  description: string | null
  x: number
  y: number
}

export type UseRichTextProseClickOptions = {
  navigate: NavigateFunction
  /** 인물 멘션/엔티티 링크 클릭 시 */
  onPersonClick: (personId: string) => void
  /**
   * 설정 시, 클릭한 인물 id가 이 값과 같으면 onPersonClick 대신 안내 토스트
   * (전기 모달·메인 패널에서 “지금 보는 사람” 중복 클릭 방지)
   */
  samePersonId?: string | null
  /** 생략 시 용어(.term) 클릭은 무시 */
  setTermTooltip?: React.Dispatch<
    React.SetStateAction<RichTextTermTooltipState | null>
  >
  /** 생략 시 가문 엔티티 클릭은 무시 */
  setDynastyTooltip?: React.Dispatch<
    React.SetStateAction<RichTextDynastyTooltipState | null>
  >
  /**
   * 설정 시 정당 엔티티 링크 클릭 시 라우팅 대신 콜백 (예: 선거 서술 읽기 화면에서 모달).
   * `countryId`는 링크의 `data-entity-country-id` 또는 API 조회 결과.
   */
  onPoliticalPartyClick?: (args: {
    partyId: string
    countryId: string | null
  }) => void
  /** 설정 시, 클릭한 정당 id가 이 값과 같으면 토스트만 (모달 안 중복 열기) */
  samePoliticalPartyId?: string | null
}

/**
 * RichTextEditor 읽기 전용 본문(.mention / .entity-link / .term) 클릭 처리.
 * 포스트·사건 상세·인물 상세 등에서 동일 동작을 유지하기 위해 공통화.
 */
export function useRichTextProseClick(options: UseRichTextProseClickOptions): {
  handleProseClick: (e: React.MouseEvent) => void
} {
  const {
    navigate,
    onPersonClick,
    samePersonId,
    setTermTooltip,
    setDynastyTooltip,
    onPoliticalPartyClick,
    samePoliticalPartyId,
  } = options

  const handleProseClick = useCallback(
    (e: React.MouseEvent) => {
      /** 텍스트 노드만 target인 경우(브라우저마다 다름) closest 없음 → 전체 핸들러 실패 방지 */
      const raw = e.target
      const el =
        raw instanceof Element
          ? raw
          : raw instanceof Text
            ? raw.parentElement
            : null
      if (!el) return
      const target = el as HTMLElement

      const personMentionEl = target.closest('.mention[data-type="person"]')
      const personLinkEl = target.closest(
        '.entity-link[data-entity-type="person"]',
      )
      const personEl = personMentionEl ?? personLinkEl
      if (personEl) {
        const id =
          personEl.getAttribute('data-id') ??
          personEl.getAttribute('data-entity-id')
        if (id) {
          e.preventDefault()
          if (samePersonId != null && id === samePersonId) {
            notify.show('현재 보고 있는 인물입니다.', { icon: 'ℹ️' })
            return
          }
          onPersonClick(id)
        }
        return
      }

      const groupMentionEl = target.closest(
        '.mention[data-type="personGroup"]',
      )
      const groupLinkEl = target.closest(
        '.entity-link[data-entity-type="personGroup"]',
      )
      const groupEl = groupMentionEl ?? groupLinkEl
      if (groupEl) {
        const id =
          groupEl.getAttribute('data-id') ??
          groupEl.getAttribute('data-entity-id')
        if (id) {
          e.preventDefault()
          navigate(pathKeys.personGroupDetail(id))
        }
        return
      }

      const dynastyMentionEl = target.closest('.mention[data-type="dynasty"]')
      const dynastyLinkEl = target.closest(
        '.entity-link[data-entity-type="dynasty"]',
      )
      const dynastyEl = dynastyMentionEl ?? dynastyLinkEl
      if (dynastyEl && setDynastyTooltip) {
        const id =
          dynastyEl.getAttribute('data-id') ??
          dynastyEl.getAttribute('data-entity-id')
        const name =
          dynastyEl.getAttribute('data-name') ??
          dynastyEl.getAttribute('data-entity-name') ??
          ''
        if (id) {
          e.preventDefault()
          const cachedDesc = dynastyDescCache.has(id)
            ? (dynastyDescCache.get(id) ?? '')
            : null
          setDynastyTooltip({
            dynastyId: id,
            name,
            description: cachedDesc,
            x: e.clientX,
            y: e.clientY,
          })
          if (!dynastyDescCache.has(id)) {
            dynastyApi
              .getById(id)
              .then((dynasty) => {
                dynastyDescCache.set(id, dynasty.description ?? null)
                setDynastyTooltip((prev) =>
                  prev && prev.dynastyId === id
                    ? { ...prev, description: dynasty.description ?? '' }
                    : prev,
                )
              })
              .catch(() => {
                setDynastyTooltip((prev) =>
                  prev && prev.dynastyId === id
                    ? { ...prev, description: '(정보를 불러올 수 없습니다)' }
                    : prev,
                )
              })
          }
        }
        return
      }

      const partyLinkEl = target.closest(
        '.entity-link[data-entity-type="politicalParty"]',
      )
      if (partyLinkEl) {
        const partyId = partyLinkEl.getAttribute('data-entity-id')
        if (!partyId) return
        e.preventDefault()
        const countryIdAttr = partyLinkEl.getAttribute('data-entity-country-id')
        if (onPoliticalPartyClick) {
          if (samePoliticalPartyId != null && partyId === samePoliticalPartyId) {
            notify.show('현재 보고 있는 정당입니다.', { icon: 'ℹ️' })
            return
          }
          if (countryIdAttr) {
            onPoliticalPartyClick({ partyId, countryId: countryIdAttr })
            return
          }
          politicalPartyApi
            .getById(partyId)
            .then((p) =>
              onPoliticalPartyClick({
                partyId,
                countryId: p.countryId ?? null,
              }),
            )
            .catch(() => notify.error('정당 정보를 불러올 수 없습니다.'))
          return
        }
        const go = (cid: string) =>
          navigate(pathKeys.countryElectionPartyDetail(cid, partyId))
        if (countryIdAttr) {
          go(countryIdAttr)
          return
        }
        politicalPartyApi
          .getById(partyId)
          .then((p) => {
            if (p.countryId) go(p.countryId)
            else
              // 연결된 현대 국가가 없어 이동할 곳이 없음 — 무엇을 눌렀는지 알려주고
              // 붉은 오류 대신 안내 톤으로(데드엔드 완화).
              notify.show(
                `정당 「${p.name}」 — 연결된 현대 국가가 없어 이동할 수 없습니다.`,
                { icon: 'ℹ️' },
              )
          })
          .catch(() => notify.error('정당 정보를 불러올 수 없습니다.'))
        return
      }

      const eventLinkEl = target.closest(
        '.entity-link[data-entity-type="event"]',
      )
      if (eventLinkEl) {
        const eventId = eventLinkEl.getAttribute('data-entity-id')
        if (eventId) {
          e.preventDefault()
          navigate(pathKeys.events.detail(eventId))
        }
        return
      }

      const companyLinkEl = target.closest(
        '.entity-link[data-entity-type="company"]',
      )
      if (companyLinkEl) {
        const companyId = companyLinkEl.getAttribute('data-entity-id')
        if (companyId) {
          e.preventDefault()
          navigate(pathKeys.companies.detail(companyId))
        }
        return
      }

      const countryLinkEl = target.closest(
        '.entity-link[data-entity-type="country"]',
      )
      if (countryLinkEl) {
        const cid = countryLinkEl.getAttribute('data-entity-id')
        if (cid) {
          e.preventDefault()
          navigate(pathKeys.countryDetail(cid))
        }
        return
      }

      const historicalCountryMentionEl = target.closest(
        '.mention[data-type="historicalCountry"]',
      )
      const historicalCountryLinkEl = target.closest(
        '.entity-link[data-entity-type="historicalCountry"]',
      )
      const historicalCountryEl =
        historicalCountryMentionEl ?? historicalCountryLinkEl
      if (historicalCountryEl) {
        const hid =
          historicalCountryEl.getAttribute('data-id') ??
          historicalCountryEl.getAttribute('data-entity-id')
        if (hid) {
          e.preventDefault()
          getHistoricalCountryById(hid)
            .then((hc) => {
              const first = hc.parentModernCountryIds?.[0]
              if (first)
                navigate(pathKeys.countryHistorical(first))
              else
                notify.show(
                  `「${hc.name}」 — 연결된 현대 국가가 없어 역사 탭으로 이동할 수 없습니다.`,
                  { icon: 'ℹ️' },
                )
            })
            .catch(() =>
              notify.error('역사적 국가 정보를 불러올 수 없습니다.'),
            )
        }
        return
      }

      const militaryUnitMentionEl = target.closest(
        '.mention[data-type="militaryUnit"]',
      )
      const militaryUnitLinkEl = target.closest(
        '.entity-link[data-entity-type="militaryUnit"]',
      )
      const militaryUnitEl = militaryUnitMentionEl ?? militaryUnitLinkEl
      if (militaryUnitEl) {
        const mid =
          militaryUnitEl.getAttribute('data-id') ??
          militaryUnitEl.getAttribute('data-entity-id')
        if (mid) {
          e.preventDefault()
          militaryUnitApi
            .getById(mid)
            .then((unit) => {
              const unitCountryId = unit?.countryId
              if (unitCountryId)
                navigate(pathKeys.countryGovernment(unitCountryId))
              else
                notify.show(
                  `부대 「${unit?.name ?? ''}」 — 연결된 현대 국가가 없어 행정조직 탭으로 이동할 수 없습니다.`,
                  { icon: 'ℹ️' },
                )
            })
            .catch(() => notify.error('군부대 정보를 불러올 수 없습니다.'))
        }
        return
      }

      const termEl = target.closest('.term')
      if (termEl && setTermTooltip) {
        const termId = termEl.getAttribute('data-term-id')
        const name =
          termEl.getAttribute('data-term-name') || termEl.textContent || ''
        if (termId) {
          e.preventDefault()
          const cached = glossaryTermCache.get(termId)
          setTermTooltip({
            termId,
            // 표제·설명·출처를 캐시(있으면)로 즉시 채워 재fetch·깜빡임 제거(C4).
            name: cached?.name || name,
            description: cached ? (cached.description ?? '') : null,
            countryId: cached?.countryId ?? null,
            historicalCountryId: cached?.historicalCountryId ?? null,
            x: e.clientX,
            y: e.clientY,
          })
          if (!cached) {
            getGlossaryTermById(termId)
              .then((termDto) => {
                glossaryTermCache.set(termId, termDto)
                setTermTooltip((prev) =>
                  prev && prev.termId === termId
                    ? {
                        ...prev,
                        // 전역 개명 반영 — 본문에 프리즈된 옛 이름 대신 최신 표제(C4).
                        name: termDto.name || prev.name,
                        description: termDto.description ?? '',
                        countryId: termDto.countryId ?? null,
                        historicalCountryId: termDto.historicalCountryId ?? null,
                      }
                    : prev,
                )
              })
              .catch(() => {
                setTermTooltip((prev) =>
                  prev && prev.termId === termId
                    ? { ...prev, description: '(설명을 불러올 수 없습니다)' }
                    : prev,
                )
              })
          }
        }
      }
    },
    [
      navigate,
      onPersonClick,
      samePersonId,
      setTermTooltip,
      setDynastyTooltip,
      onPoliticalPartyClick,
      samePoliticalPartyId,
    ],
  )

  return { handleProseClick }
}

/** 용어/가문 툴팁 열림 시 Escape로 닫기 */
export function useRichTextTooltipEscape(
  termOpen: boolean,
  dynastyOpen: boolean,
  onCloseTerm: () => void,
  onCloseDynasty: () => void,
) {
  const onCloseTermRef = useRef(onCloseTerm)
  const onCloseDynastyRef = useRef(onCloseDynasty)
  onCloseTermRef.current = onCloseTerm
  onCloseDynastyRef.current = onCloseDynasty

  useEffect(() => {
    if (!termOpen && !dynastyOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (termOpen) onCloseTermRef.current()
      if (dynastyOpen) onCloseDynastyRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [termOpen, dynastyOpen])
}
