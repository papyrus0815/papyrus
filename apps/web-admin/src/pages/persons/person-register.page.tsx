/**
 * 인물 등록 전용 페이지
 * - 역대 수반 기본정보/업적 폼과 동일한 공용 레이아웃을 쓰는 PersonRegisterView 사용
 * - 수정은 person-create.page (기존 스텝 폼) 사용
 */
import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import { toast } from 'react-hot-toast'

import { pathKeys } from '@/shared/router'
import { PersonRegisterView } from '@/shared/ui/person-register-modal'

const PageWrapper = styled.div`
  position: fixed;
  top: var(--header-height, 56px);
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: calc(100vh - var(--header-height, 56px));
  padding: 24px;
  overflow-y: auto;
  background: #f8fafc;
`

const ContentWrap = styled.div`
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
`

export default function PersonRegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetCountryId = searchParams.get('countryId') ?? undefined

  return (
    <PageWrapper>
      <ContentWrap>
        <PersonRegisterView
          initialCountryId={presetCountryId}
          onCancel={() => navigate(pathKeys.persons.root())}
          onSuccess={(personId) => {
            toast.success('인물이 등록되었습니다.')
            navigate(pathKeys.persons.detail(personId))
          }}
        />
      </ContentWrap>
    </PageWrapper>
  )
}
