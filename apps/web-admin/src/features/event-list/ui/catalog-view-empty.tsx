/**
 * 카탈로그 비-목록 뷰(격자·통계·트리·갤러리)의 **공용 빈 상태 슬롯**.
 * FSD: features/event-list/ui
 *
 * ## 왜 공용인가 (2026-08-02 검토 GAP-3)
 *
 * 목록 뷰만 세 가지 빈 상태를 구분했다 — ⑴ 아직 로드 중 ⑵ 필터 결과 0건 ⑶ 데이터 0건.
 * 나머지 4뷰는 배열 길이가 0이면 곧장 "표시할 데이터가 없습니다"를 **확정**했다.
 * 카탈로그는 `autoLoadAll`로 서버 페이지를 순차 소진하고 1000년 이전 사건은 서버
 * 정렬상 마지막 페이지에 몰리므로, "아직 안 왔을 뿐인데 없다고 단정"하는 창이 실제로
 * 존재한다. 게다가 그 화면에는 필터를 풀 경로가 하나도 없어(칩 바는 툴바에 있고
 * 뷰 본문은 통째로 비어 있다) 회복 동선이 끊긴다.
 *
 * 세 분기의 판정을 여기 한 곳에 모아, 뷰는 '자기 도메인의 문구와 아이콘'만 넘긴다.
 */
import type { ReactNode } from 'react'

import { FiFilter, FiLoader } from 'react-icons/fi'

import { EmptyStateSpotlight } from '@/shared/ui/empty-state/empty-state'

export interface CatalogViewEmptyProps {
  /** 데이터가 정말 0건일 때 쓸 아이콘 */
  icon: ReactNode
  /** 데이터가 정말 0건일 때 쓸 제목 */
  title: string
  /** 데이터가 정말 0건일 때 쓸 설명 */
  description?: ReactNode
  /** 첫 페이지 로딩 중 */
  isLoading?: boolean
  /** 받아올 페이지가 남아 있음(autoLoadAll 소진 중) */
  hasMoreData?: boolean
  /** 내용을 좁히는 필터·검색·북마크가 걸려 있는가 */
  hasActiveFilters?: boolean
  /** 필터 초기화 — 없으면 CTA를 렌더하지 않는다 */
  onResetFilters?: () => void
}

export function CatalogViewEmpty({
  icon,
  title,
  description,
  isLoading = false,
  hasMoreData = false,
  hasActiveFilters = false,
  onResetFilters,
}: CatalogViewEmptyProps) {
  // ⑴ 아직 받아올 게 남았다 — 0건을 **확정하지 않는다**.
  if (isLoading || hasMoreData) {
    return (
      <EmptyStateSpotlight
        icon={<FiLoader size={28} />}
        title="사건을 불러오는 중입니다"
        description="전체 사건을 다 받은 뒤에 조건에 맞는 결과를 보여드립니다."
      />
    )
  }

  // ⑵ 다 받았는데 0건이고 필터가 걸려 있다 — 원인과 회복 경로를 함께 말한다.
  if (hasActiveFilters) {
    return (
      <EmptyStateSpotlight
        icon={<FiFilter size={28} />}
        title="현재 조건과 일치하는 사건이 없습니다"
        description="필터를 해제하면 다시 표시됩니다."
        primaryAction={
          onResetFilters
            ? { label: '모든 필터 초기화', onClick: onResetFilters }
            : undefined
        }
      />
    )
  }

  // ⑶ 필터도 없는데 0건 — 뷰가 준 문구를 그대로 쓴다(뷰마다 '연대'·'사건'으로 단위가 다르다).
  return (
    <EmptyStateSpotlight
      icon={icon}
      title={title}
      description={description}
    />
  )
}
