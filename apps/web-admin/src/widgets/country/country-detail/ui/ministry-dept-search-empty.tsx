/**
 * 중앙부처 — 검색 결과 없음 (카테고리 열 공통)
 */
import { FiSearch } from 'react-icons/fi'

import { EmptyStateSpotlight } from '@/shared/ui/empty-state/empty-state'

type MinistryDeptSearchEmptyProps = {
  onClearSearch: () => void
}

export function MinistryDeptSearchEmpty({
  onClearSearch,
}: MinistryDeptSearchEmptyProps) {
  return (
    <EmptyStateSpotlight
      flat
      icon={<FiSearch size={30} strokeWidth={1.75} />}
      title="검색 결과가 없습니다"
      description="이 카테고리에서 검색과 일치하는 부처가 없습니다."
      primaryAction={{
        label: '검색어 지우기',
        onClick: onClearSearch,
      }}
    />
  )
}
