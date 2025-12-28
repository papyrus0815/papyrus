import React, { useMemo, useState } from 'react'

import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import styled from 'styled-components'

import type { HistoricalCountry } from '@/entities/historical-country/api'
import { useHistoricalCountries } from '@/features/historical-country'
import { useHistoricalCountryFilters } from '@/features/historical-country'
import { HistoricalCountryDashboard } from '@/widgets/historical-country/historical-country-dashboard'
import { HistoricalCountryDetail } from '@/widgets/historical-country/historical-country-detail'
import { HistoricalCountryList } from '@/widgets/historical-country/historical-country-list'

export default function HistoricalCountryPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard')
  const [selectedCountry, setSelectedCountry] =
    useState<HistoricalCountry | null>(null)

  // API 데이터 조회
  const { data: apiCountries, isLoading } = useHistoricalCountries()

  // 로컬 타입으로 변환
  const countries = useMemo(() => {
    if (!apiCountries) return []
    return apiCountries as HistoricalCountry[]
  }, [apiCountries])

  // 필터링
  const filters = useHistoricalCountryFilters({ countries })

  const handleSelectCountry = (country: HistoricalCountry) => {
    setSelectedCountry(country)
  }

  const handleEdit = (country: HistoricalCountry) => {
    toast('수정 기능은 곧 추가됩니다!', { icon: '🚧' })
  }

  const handleDelete = (id: string) => {
    toast('삭제 기능은 곧 추가됩니다!', { icon: '🚧' })
  }

  if (isLoading) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
        <LoadingText>역사적 국가 정보를 불러오는 중...</LoadingText>
      </LoadingContainer>
    )
  }

  return (
    <Container>
      {/* 헤더 */}
      <Header>
        <HeaderContent>
          <Title>🏛️ 역사적 국가</Title>
          <Description>
            과거에 존재했던 국가들의 역사를 탐험해보세요
          </Description>
        </HeaderContent>
      </Header>

      {/* 탭 네비게이션 */}
      <TabContainer>
        <TabButton
          $active={activeTab === 'dashboard'}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 대시보드
        </TabButton>
        <TabButton
          $active={activeTab === 'list'}
          onClick={() => setActiveTab('list')}
        >
          📚 국가 목록 ({countries.length})
        </TabButton>
      </TabContainer>

      {/* 필터 바 (목록 탭에서만) */}
      {activeTab === 'list' && (
        <FilterBar>
          <SearchInput
            type="text"
            placeholder="국가명, 영문명으로 검색..."
            value={filters.query}
            onChange={(e) => filters.setQuery(e.target.value)}
          />
          <FilterButton onClick={() => filters.setShowStateTypeModal(true)}>
            {filters.stateTypeFilter === 'ALL'
              ? '🏛️ 모든 형태'
              : `🏛️ ${filters.stateTypeFilter}`}
          </FilterButton>
          <FilterButton onClick={() => filters.setShowSortModal(true)}>
            📊 정렬:{' '}
            {filters.sortBy === 'name'
              ? '이름'
              : filters.sortBy === 'startDate'
                ? '연대'
                : '기간'}
          </FilterButton>
        </FilterBar>
      )}

      {/* 컨텐츠 */}
      <Content>
        {activeTab === 'dashboard' ? (
          <HistoricalCountryDashboard countries={countries} />
        ) : (
          <ListViewContainer>
            <ListSection>
              <HistoricalCountryList
                countries={filters.filtered}
                selectedId={selectedCountry?.id || null}
                onSelect={handleSelectCountry}
              />
            </ListSection>
            <DetailSection>
              <HistoricalCountryDetail
                country={selectedCountry}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </DetailSection>
          </ListViewContainer>
        )}
      </Content>
    </Container>
  )
}

// Styled Components
const Container = styled.div`
  min-height: 100vh;
  background: #f9fafb;
`

const Header = styled.div`
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  padding: 40px 24px;
`

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`

const Title = styled.h1`
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 12px 0;
`

const Description = styled.p`
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
`

const TabContainer = styled.div`
  display: flex;
  gap: 8px;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  max-width: 1200px;
  margin: 0 auto;
`

const TabButton = styled.button<{ $active: boolean }>`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: ${(props) => (props.$active ? '#6366f1' : 'transparent')};
  color: ${(props) => (props.$active ? 'white' : '#6b7280')};
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) => (props.$active ? '#5558e3' : '#f3f4f6')};
  }
`

const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  max-width: 1200px;
  margin: 0 auto;
`

const SearchInput = styled.input`
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  outline: none;

  &:focus {
    border-color: #6366f1;
  }
`

const FilterButton = styled.button`
  padding: 10px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
  }
`

const Content = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
`

const ListViewContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

const ListSection = styled.div``

const DetailSection = styled.div`
  position: sticky;
  top: 24px;
  height: fit-content;

  @media (max-width: 1024px) {
    position: static;
  }
`

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f9fafb;
`

const LoadingSpinner = styled(motion.div)`
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

const LoadingText = styled.div`
  margin-top: 16px;
  font-size: 16px;
  color: #6b7280;
`
