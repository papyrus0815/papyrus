/**
 * 조약 상세 — `/treaties/:id`.
 *
 * 본문은 국가 상세의 조약 탭이 쓰는 `TreatyDetail`을 그대로 재사용한다(국가에
 * 의존하지 않는 컴포넌트다). 여기서는 팔레트 Provider와 뒤로가기 목적지만 준다.
 */
import React from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'

import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import { pathKeys } from '@/shared/router'
import {
  TreatyDetail,
  TreatySectionThemeProvider,
} from '@/widgets/country/country-detail/ui/treaty-section.widget'

export function TreatyDetailPage() {
  useDocumentTitle('조약')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  if (!id) {
    return null
  }

  return (
    <TreatySectionThemeProvider>
      <TreatyDetail
        treatyId={id}
        onBack={() => navigate(pathKeys.treaties.list())}
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
