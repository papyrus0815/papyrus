import { useEffect, useMemo, useState } from 'react'

import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { pathKeys } from '@/shared/router'
import {
  CountryInlineModal,
  type CountryInlineModalTarget,
} from '@/widgets/country/country-inline-modal'

import { type EventDetail } from '../use-event-detail'

interface CountryInfoModalProps {
  event: EventDetail
  /** 열려 있는 국가 id (URL `?country=`). null이면 모달 닫힘. */
  countryId: string | null
  /** 관련국 안에서의 전환 — URL 파라미터 승격(공유·새로고침 복원 가능). */
  onOpen: (countryId: string) => void
  onClose: () => void
}

/**
 * 사건 상세에서 관련국 클릭 시 띄우는 국가 정보 모달 — PersonDetailModal의 국가판.
 *
 * URL은 id만 담으므로(`?country=<id>`) 현대/역사 구분은 사건 응답의 두 배열
 * (relatedCountries / relatedHistoricalCountries) 중 어느 쪽에 실렸는지로 복원한다.
 * 관련국이 아닌 국가(모달 안 '역사적 전신' 칩으로 전환한 경우)는 URL로 표현할 수
 * 없으므로 로컬 상태로만 전환한다 — PersonInlineModal의 내부 스택과 같은 원리.
 *
 * '국가 상세로 이동' 시 history state에 `from: { kind: 'event', … }`을 실어
 * person-detail-modal.tsx와 동일하게 복귀 진입점 여지를 남긴다.
 */
export function CountryInfoModal({
  event,
  countryId,
  onOpen,
  onClose,
}: CountryInfoModalProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { eventId } = useParams<{ eventId: string }>()

  const modernCountries = event.relatedCountries ?? []
  const historicalCountries = event.relatedHistoricalCountries ?? []

  /** URL 엔트리 대상 — 사건 관련국 두 배열에서 kind·이름을 복원. 못 찾으면 null(닫힘). */
  const entryTarget = useMemo<CountryInlineModalTarget | null>(() => {
    if (!countryId) return null
    const modern = modernCountries.find((country) => country.id === countryId)
    if (modern) return { id: modern.id, kind: 'modern', name: modern.name }
    const historical = historicalCountries.find(
      (country) => country.id === countryId,
    )
    if (historical)
      return { id: historical.id, kind: 'historical', name: historical.name }
    return null
  }, [countryId, modernCountries, historicalCountries])

  /** 관련국 밖 국가(전신 칩 전환 등) — URL 대신 로컬 상태로 표시. */
  const [switchTarget, setSwitchTarget] =
    useState<CountryInlineModalTarget | null>(null)

  // 새 엔트리(다른 관련국 클릭·URL 변경)가 오면 로컬 전환 상태를 리셋.
  useEffect(() => {
    setSwitchTarget(null)
  }, [countryId])

  const target = switchTarget ?? entryTarget

  /**
   * `?country=`가 관련국에서 해석되지 않으면(크래프트 딥링크, 모달 열림 중
   * 관련국 제거·undo 경합) 모달은 조용히 닫힌 상태가 되는데, 파라미터만 URL에
   * 영구 잔류한다 — onClose(replace)로 정리한다. 전신 칩 로컬 뷰(switchTarget)
   * 표시 중에는 닫지 않는다. event는 Suspense 뒤라 배열은 항상 로드 완료 상태.
   */
  useEffect(() => {
    if (countryId && !entryTarget && !switchTarget) onClose()
  }, [countryId, entryTarget, switchTarget, onClose])

  /** 이웃 칩 — 이 사건의 관련국 전체(현재 국가·중복 제외는 위젯이 처리). */
  const peers = useMemo<CountryInlineModalTarget[]>(
    () => [
      ...modernCountries.map((country) => ({
        id: country.id,
        kind: 'modern' as const,
        name: country.name,
      })),
      ...historicalCountries.map((country) => ({
        id: country.id,
        kind: 'historical' as const,
        name: country.name,
      })),
    ],
    [modernCountries, historicalCountries],
  )

  const handleSwitch = (next: CountryInlineModalTarget) => {
    const isEventCountry =
      modernCountries.some((country) => country.id === next.id) ||
      historicalCountries.some((country) => country.id === next.id)
    if (isEventCountry) {
      // 관련국이면 URL 엔트리로 승격 — 공유·새로고침에도 복원된다.
      setSwitchTarget(null)
      // 이미 같은 엔트리면 push 생략 — 동일 URL 중복 push는 죽은 히스토리 스텝이 된다.
      if (next.id !== countryId) onOpen(next.id)
      return
    }
    setSwitchTarget(next)
  }

  const handleClose = () => {
    setSwitchTarget(null)
    onClose()
  }

  return (
    <CountryInlineModal
      target={target}
      onClose={handleClose}
      onSwitch={handleSwitch}
      peers={peers}
      peersLabel="이 사건의 다른 관련국"
      onNavigateDetail={(destination) => {
        navigate(pathKeys.countryDetail(destination.id), {
          state: {
            from: {
              kind: 'event',
              eventId: eventId ?? null,
              pathname: location.pathname,
            },
          },
        })
      }}
    />
  )
}
