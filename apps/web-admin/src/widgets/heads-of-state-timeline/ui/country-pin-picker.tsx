/**
 * 비교할 국가 추가 모달 — 공용 {@link CountryPicker}의 `add` 모드 어댑터.
 *
 * 한 번 열어 여러 국가를 담고 'N개 추가'로 한꺼번에 핀한다(예전 단일 SelectModal은 고를 때마다
 * 닫혀 N번 열어야 했다). 이미 핀한 국가는 '추가됨'으로 잠기고 목록 아래로 내려간다.
 * 예전엔 이 위젯 전용 구현(606줄)이었으나 검색 필드·정렬·시대 표기가 공용 피커와 달랐다.
 */
import { useMemo } from 'react'

import { CountryPicker, type CountryPickerPick } from '@/shared/ui/country-picker'

import type { PinnedSegment } from '../model/types'
import { optionToSegment, useCountryOptions } from '../model/use-country-options'

interface Props {
  isOpen: boolean
  onClose: () => void
  /** 선택한 국가들을 일괄 추가 */
  onPickMany: (segments: Omit<PinnedSegment, 'segmentId'>[]) => void
  /** 모달 제목 — 신규 행 vs 한 행에 segment 추가 케이스 모두 지원 */
  title?: string
  /** 이미 핀한 옵션은 잠금 표시 ('C:<id>' / 'H:<id>') */
  alreadyPinnedOptionIds?: string[]
}

/** 'C:<id>' / 'H:<id>' ↔ 피커의 (id, isHistorical) */
const toOptionId = (pick: CountryPickerPick) => `${pick.isHistorical ? 'H' : 'C'}:${pick.id}`

export function CountryPinPicker({
  isOpen,
  onClose,
  onPickMany,
  title = '국가 추가',
  alreadyPinnedOptionIds = [],
}: Props) {
  // 닫혀 있는 동안엔 fetch하지 않는다 — 페이지 진입 시 전체 국가 다운로드 비용 회피
  const { options, modernCountries, historicalCountries, isLoading } = useCountryOptions(isOpen)

  const pinnedIds = useMemo(
    () => alreadyPinnedOptionIds.map((optionId) => optionId.slice(2)),
    [alreadyPinnedOptionIds],
  )

  return (
    <CountryPicker
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      mode="add"
      modernCountries={modernCountries ?? []}
      historicalCountries={historicalCountries ?? []}
      selectedIds={pinnedIds}
      isLoading={isLoading}
      onCommit={(picks) => {
        const byOptionId = new Map(options.map((option) => [option.optionId, option]))
        const segments = picks
          .map((pick) => byOptionId.get(toOptionId(pick)))
          .filter((option): option is NonNullable<typeof option> => option != null)
          .map(optionToSegment)
        if (segments.length > 0) onPickMany(segments)
      }}
    />
  )
}
