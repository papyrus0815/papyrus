/**
 * 인물 뷰 공용 정렬 바 — 매트릭스/갤럭시/스토리/왕조 중 카드 그리드 뷰(스토리·왕조)에서 사용.
 * store의 `sort` 상태를 직접 읽고 쓴다 → URL/persist에 자동 동기화.
 * 세기 '그룹' 순서는 EraOrderToggle이 담당 — 여기서는 그룹 내부 인물 순서만 제어.
 */
import { usePersonInfographicFilterStore } from '../../model/filter.store'
import { SORT_OPTIONS } from '../../model/sort-helpers'

import { SegmentedRadioGroup } from './segmented-radio-group'

export function SortBar() {
  const sort = usePersonInfographicFilterStore((state) => state.sort)
  const setSort = usePersonInfographicFilterStore((state) => state.setSort)

  return (
    <SegmentedRadioGroup
      label="정렬"
      ariaLabel="인물 정렬 기준"
      options={SORT_OPTIONS}
      value={sort}
      onChange={setSort}
    />
  )
}
