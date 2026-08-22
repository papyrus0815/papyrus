/**
 * 국가 목록 로딩 placeholder — 조판 원본은 `@/shared/ui/sidebar-list`
 * (인물 목록과 공유). 여기서는 라벨만 국가로 고정한다.
 */
import React from 'react'

import { SidebarListSkeleton } from '@/shared/ui/sidebar-list'

export function CountryListSkeleton() {
  return <SidebarListSkeleton label="국가 목록 로딩 중" />
}
