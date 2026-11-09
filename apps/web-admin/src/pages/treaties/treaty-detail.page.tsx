/**
 * 조약 상세 — `/treaties/:id`.
 *
 * 본문은 국가 상세의 조약 탭이 쓰는 `TreatyDetail`을 그대로 재사용한다(국가에
 * 의존하지 않는 컴포넌트다). 여기서는 팔레트 Provider와 뒤로가기 목적지만 준다.
 */
import React from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { treatyApi } from '@/shared/api/treaty'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import { pathKeys } from '@/shared/router'
import {
  TreatyDetail,
  TreatySectionThemeProvider,
} from '@/widgets/country/country-detail/ui/treaty-section.widget'

import { readListSearch } from '@/shared/lib/treaty-list-state'

export function TreatyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  /* TreatyDetail과 같은 키 — 요청은 한 번이다. 탭 제목이 '조약'만이면 탭 여러 개를 구분할 수 없다. */
  const { data: treaty } = useQuery({
    queryKey: ['treaty', id],
    queryFn: () => treatyApi.getById(id!),
    enabled: !!id,
  })
  useDocumentTitle(treaty?.name ? `${treaty.name} · 조약` : '조약')

  if (!id) {
    return null
  }

  /* '목록'은 들어온 목록으로 — 거기서 걸어 둔 검색·유형·정렬을 그대로 되살린다 */
  const listSearch = readListSearch(location.state)

  return (
    <TreatySectionThemeProvider>
      <TreatyDetail
        treatyId={id}
        onBack={() => navigate(`${pathKeys.treaties.list()}${listSearch}`)}
        onInvalidate={() => {
          /* 카탈로그·사이드바가 같이 쓰는 목록 키와 이 조약 단건을 함께 무효화 */
          void queryClient.invalidateQueries({ queryKey: ['treaties'] })
          void queryClient.invalidateQueries({ queryKey: ['treaty', id] })
        }}
      />
    </TreatySectionThemeProvider>
  )
}

export default TreatyDetailPage
