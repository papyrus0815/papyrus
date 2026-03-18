/**
 * 국가별 인물 리스트 섹션
 * - PersonListContent 공용 컴포넌트 사용 (국가 상세·인물 페이지 동일 기능·디자인)
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'

import { dynastyApi } from '@/shared/api/dynasty'
import { getPersonsByTenureCountry } from '@/shared/api/persons'
import { PersonListContent } from '@/shared/ui/person-list-content/person-list-content'
import { PersonRegisterViewModal } from '@/widgets/country/country-list/ui/person-register-view-modal'

interface PersonListSectionProps {
  countryId: string
  /** 리스트 ↔ 인물 상세 전환 시 호출 (상단 공통 헤더 문구 변경용) */
  onViewChange?: (view: 'list' | 'detail') => void
  /** true면 상단 타이틀·설명 행 숨김 (국가 상세 인물 탭에서 공통 헤더 사용) */
  hideMainHeader?: boolean
  /** true면 리스트 내 '인물 등록' 버튼 숨김 (헤더 우측에 배치된 경우) */
  hideCreateButton?: boolean
  /** 값이 바뀔 때마다 등록 폼 열기 (헤더 버튼에서 사용) */
  registerTrigger?: number
}

const LoadingWrap = styled.div`
  padding: 32px;
  text-align: center;
  color: #64748b;
`

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(99, 102, 241, 0.2);
  border-top-color: #6366f1;
  border-radius: 50%;
  margin: 0 auto 16px;
  animation: spin 0.8s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`

const ErrorWrap = styled.div`
  padding: 24px;
  color: #dc2626;
  text-align: center;
`

export function PersonListSection({
  countryId,
  onViewChange,
  hideMainHeader,
  hideCreateButton,
  registerTrigger,
}: PersonListSectionProps) {
  const queryClient = useQueryClient()
  const { data: persons = [], isLoading, error } = useQuery({
    queryKey: ['persons-by-country', countryId],
    queryFn: () => getPersonsByTenureCountry({ countryId }),
    staleTime: 1000 * 60 * 2,
  })
  const { data: dynasties = [] } = useQuery({
    queryKey: ['dynasties'],
    queryFn: () => dynastyApi.getAll(),
    staleTime: 1000 * 60 * 5,
  })

  if (isLoading) {
    return (
      <LoadingWrap>
        <Spinner />
        <p>인물 목록을 불러오는 중...</p>
      </LoadingWrap>
    )
  }

  if (error) {
    return <ErrorWrap>인물 목록을 불러오지 못했습니다.</ErrorWrap>
  }

  return (
    <PersonListContent
      persons={persons}
      dynasties={dynasties.map((d) => ({ id: d.id, name: d.name }))}
      initialCountryId={countryId}
      invalidateKeys={['persons-by-country', countryId]}
      title="인물 리스트"
      emptyMessage="이 국가에 등록된 인물이 없습니다."
      emptyFilterMessage="검색·필터 조건에 맞는 인물이 없습니다."
      onViewChange={onViewChange}
      hideMainHeader={hideMainHeader}
      hideCreateButton={hideCreateButton}
      registerTrigger={registerTrigger}
      enableCountryFilter={false}
      renderRegisterModal={(props) => (
        <PersonRegisterViewModal
          isOpen={props.isOpen}
          onClose={props.onClose}
          initialCountryId={props.initialCountryId}
          editPersonId={props.editPersonId}
          onSuccess={props.onSuccess}
        />
      )}
    />
  )
}
