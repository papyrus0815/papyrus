/**
 * 시대 스토리 세기 그룹 시간축 방향 토글 — 최신순 ↔ 오래된순.
 * store의 `eraGroupOrder`를 직접 읽고 쓴다 → URL/persist에 자동 동기화.
 *
 * 세기 '그룹'의 나열 순서만 제어한다(맨 위에 어느 세기가 오는지).
 * 그룹 내부 인물 순서는 SortBar(sort)가 담당 — 두 축은 독립.
 */
import {
  usePersonInfographicFilterStore,
  type EraGroupOrder,
} from '../../model/filter.store'

import { SegmentedRadioGroup } from './segmented-radio-group'

const ORDER_OPTIONS: Array<[EraGroupOrder, string]> = [
  ['desc', '최신순'],
  ['asc', '오래된순'],
]

export function EraOrderToggle() {
  const eraGroupOrder = usePersonInfographicFilterStore(
    (state) => state.eraGroupOrder,
  )
  const setEraGroupOrder = usePersonInfographicFilterStore(
    (state) => state.setEraGroupOrder,
  )

  return (
    <SegmentedRadioGroup
      label="순서"
      ariaLabel="세기 그룹 순서"
      options={ORDER_OPTIONS}
      value={eraGroupOrder}
      onChange={setEraGroupOrder}
    />
  )
}
