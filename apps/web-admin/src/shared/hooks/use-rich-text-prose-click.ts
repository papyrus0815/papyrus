import { useCallback, useEffect, useRef } from 'react'

import { toast } from 'react-hot-toast'
import type { NavigateFunction } from 'react-router-dom'

import { dynastyApi } from '@/shared/api/dynasty'
import { getGlossaryTermById } from '@/shared/api/glossary'
import { getHistoricalCountryById } from '@/shared/api/historical-countries'
import { militaryUnitApi } from '@/shared/api/military-unit'
import { politicalPartyApi } from '@/shared/api/political-party'
import { pathKeys } from '@/shared/router'

export type RichTextTermTooltipState = {
  termId: string
  name: string
  description: string | null
  x: number
  y: number
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
            toast('현재 보고 있는 인물입니다.', { icon: 'ℹ️' })
            return
          }
          onPersonClick(id)
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
          setDynastyTooltip({
            dynastyId: id,
            name,
            description: null,
            x: e.clientX,
            y: e.clientY,
          })
          dynastyApi
            .getById(id)
            .then((dynasty) => {
              setDynastyTooltip((prev) =>
                prev && prev.dynastyId === id
                  ? { ...prev, description: dynasty.description ?? null }
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
            toast('현재 보고 있는 정당입니다.', { icon: 'ℹ️' })
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
            .catch(() => toast.error('정당 정보를 불러올 수 없습니다.'))
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
              toast.error(
                '이 정당에 연결된 현대 국가가 없어 해당 국가 화면으로 이동할 수 없습니다.',
              )
          })
          .catch(() => toast.error('정당 정보를 불러올 수 없습니다.'))
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
                toast.error(
                  '연결된 현대 국가가 없어 해당 국가의 역사 탭으로 이동할 수 없습니다.',
                )
            })
            .catch(() =>
              toast.error('역사적 국가 정보를 불러올 수 없습니다.'),
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
            .then((u) => {
              const cid = u?.countryId
              if (cid)
                navigate(pathKeys.countryGovernment(cid))
              else
                toast.error(
                  '이 부대에 연결된 현대 국가가 없어 행정조직 탭으로 이동할 수 없습니다.',
                )
            })
            .catch(() => toast.error('군부대 정보를 불러올 수 없습니다.'))
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
          setTermTooltip({
            termId,
            name,
            description: null,
            x: e.clientX,
            y: e.clientY,
          })
          getGlossaryTermById(termId)
            .then((termDto) => {
              setTermTooltip((prev) =>
                prev && prev.termId === termId
                  ? { ...prev, description: termDto.description }
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
