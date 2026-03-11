import React, { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import styled from 'styled-components'

import type { HistoricalCountry, HistoricalEntityKind } from '@/entities/historical-country/api'
import { useCountries } from '@/features/country/api'
import {
  useCreateHistoricalCountry,
  useDeleteHistoricalCountry,
  useHistoricalCountries,
  useHistoricalCountryFilters,
  useHistoricalCountry,
  useUpdateHistoricalCountry,
} from '@/features/historical-country'
import { HistoricalCountryDashboard } from '@/widgets/historical-country/historical-country-dashboard'
import { HistoricalCountryDetail } from '@/widgets/historical-country/historical-country-detail'
import { HistoricalCountryFormModal } from '@/widgets/historical-country/historical-country-form'
import { HistoricalCountryList } from '@/widgets/historical-country/historical-country-list'

export default function HistoricalCountryPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard')
  const [selectedCountry, setSelectedCountry] =
    useState<HistoricalCountry | null>(null)
  /** 수정/등록할 역사적 국가 (null이면 폼 숨김, {}면 신규 등록) */
  const [editingCountry, setEditingCountry] =
    useState<HistoricalCountry | Record<string, never> | null>(null)

  // API 데이터 조회
  const { data: apiCountries, isLoading } = useHistoricalCountries()
  const { data: modernCountries = [] } = useCountries()
  /** 수정 시 상세 API로 상위 현대 국가(parentModernCountryIds) 포함해 조회 */
  const editingId =
    editingCountry && typeof editingCountry === 'object' && 'id' in editingCountry
      ? editingCountry.id
      : undefined
  const { data: editingDetail } = useHistoricalCountry(editingId)
  const createMutation = useCreateHistoricalCountry()
  const updateMutation = useUpdateHistoricalCountry()
  const deleteMutation = useDeleteHistoricalCountry()

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
    setEditingCountry(country)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 역사적 국가를 삭제하시겠습니까?')) return
    const loadingToast = toast.loading('삭제하는 중...')
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('삭제되었습니다', { id: loadingToast })
      if (selectedCountry?.id === id) setSelectedCountry(null)
    } catch (error) {
      toast.error('삭제 실패: ' + (error as Error).message, { id: loadingToast })
    }
  }

  const handleSaveHistorical = async (
    data: Omit<HistoricalCountry, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string
      parentModernCountryIds?: string[]
      parentHistoricalCountryIds?: string[]
      transitionEventType?: string
      transitionScope?: string | null
    },
  ) => {
    const loadingToast = toast.loading(
      data.id ? '수정하는 중...' : '등록하는 중...',
    )
    try {
      if (data.id) {
        await updateMutation.mutateAsync({
          id: data.id,
          data: {
            name: data.name,
            enName: data.enName,
            description: data.description ?? null,
            thumbnailUrl: data.thumbnailUrl ?? null,
            startEra: data.startEra ?? null,
            startYear: data.startYear ?? null,
            startMonth: data.startMonth ?? null,
            startDay: data.startDay ?? null,
            endEra: data.endEra ?? null,
            endYear: data.endYear ?? null,
            endMonth: data.endMonth ?? null,
            endDay: data.endDay ?? null,
            stateType: data.stateType,
            entityKind: (data as { entityKind?: string | null }).entityKind ?? null,
            parentModernCountryIds: data.parentModernCountryIds,
            parentHistoricalCountryIds: data.parentHistoricalCountryIds,
            transitionEventType: data.transitionEventType,
            transitionScope: (data as { transitionScope?: string | null }).transitionScope ?? null,
          },
        })
        toast.success('수정되었습니다', { id: loadingToast })
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          enName: data.enName,
          description: data.description ?? undefined,
          thumbnailUrl: data.thumbnailUrl ?? undefined,
          startEra: data.startEra ?? undefined,
          startYear: data.startYear ?? undefined,
          startMonth: data.startMonth ?? undefined,
          startDay: data.startDay ?? undefined,
          endEra: data.endEra ?? undefined,
          endYear: data.endYear ?? undefined,
          endMonth: data.endMonth ?? undefined,
          endDay: data.endDay ?? undefined,
          stateType: data.stateType,
          entityKind: (data as { entityKind?: string | null }).entityKind ?? undefined,
          parentModernCountryIds: data.parentModernCountryIds,
          parentHistoricalCountryIds: data.parentHistoricalCountryIds,
          transitionEventType: data.transitionEventType,
          transitionScope: (data as { transitionScope?: string | null }).transitionScope ?? undefined,
        })
        toast.success('등록되었습니다', { id: loadingToast })
      }
      setEditingCountry(null)
    } catch (error) {
      toast.error(
        (data.id ? '수정 실패: ' : '등록 실패: ') + (error as Error).message,
        { id: loadingToast },
      )
    }
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
          <HeaderRow>
            <div>
              <Title>🏛️ 역사적 국가</Title>
              <Description>
                과거에 존재했던 국가들의 역사를 탐험해보세요
              </Description>
            </div>
            <AddButton
              type="button"
              onClick={() => setEditingCountry({} as HistoricalCountry)}
            >
              + 국가 등록
            </AddButton>
          </HeaderRow>
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
          <FilterButton onClick={() => filters.setShowEntityKindModal(true)}>
            {filters.entityKindFilter === 'ALL'
              ? '📌 성격: 전체'
              : `📌 ${filters.entityKindFilter === 'STATE' ? '국가' : filters.entityKindFilter === 'REGIME' ? '정권' : '시대'}`}
          </FilterButton>
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

      {/* 역사적 국가 등록/수정 모달 (인물 등록 모달과 동일 디자인) */}
      <HistoricalCountryFormModal
        isOpen={editingCountry !== null}
        onClose={() => setEditingCountry(null)}
        editing={
          editingCountry === null
            ? null
            : editingCountry && editingId
              ? (editingDetail ?? (editingCountry as HistoricalCountry))
              : (editingCountry as HistoricalCountry | Record<string, never>)
        }
        modernCountries={modernCountries.map((c) => ({
          id: c.id,
          name: c.name,
        }))}
        historicalCountries={(countries ?? [])
          .filter((hc) => hc.id !== (editingCountry && 'id' in editingCountry ? editingCountry.id : undefined))
          .map((hc) => ({ id: hc.id, name: hc.name }))}
        onSave={handleSaveHistorical}
      />

      {/* 정치체 성격 필터 모달 */}
      {filters.showEntityKindModal &&
        createPortal(
          <ModalOverlay onClick={() => filters.setShowEntityKindModal(false)}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalTitle>정치체 성격 필터</ModalTitle>
              <ModalOption
                $active={filters.entityKindFilter === 'ALL'}
                onClick={() => {
                  filters.setEntityKindFilter('ALL')
                  filters.setShowEntityKindModal(false)
                }}
              >
                전체
              </ModalOption>
              {(
                [
                  { value: 'STATE' as const, label: '주권 국가' },
                  { value: 'REGIME' as const, label: '정권·군정' },
                  { value: 'PERIOD' as const, label: '시대' },
                ] as { value: HistoricalEntityKind; label: string }[]
              ).map((opt) => (
                <ModalOption
                  key={opt.value}
                  $active={filters.entityKindFilter === opt.value}
                  onClick={() => {
                    filters.setEntityKindFilter(opt.value)
                    filters.setShowEntityKindModal(false)
                  }}
                >
                  {opt.label}
                </ModalOption>
              ))}
              <ModalClose onClick={() => filters.setShowEntityKindModal(false)}>닫기</ModalClose>
            </ModalContent>
          </ModalOverlay>,
          document.body,
        )}
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

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`

const AddButton = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.25);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.35);
  }
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

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
`
const ModalContent = styled(motion.div)`
  background: white;
  border-radius: 12px;
  padding: 20px;
  min-width: 240px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
`
const ModalTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #111827;
`
const ModalOption = styled.button<{ $active?: boolean }>`
  display: block;
  width: 100%;
  padding: 10px 12px;
  text-align: left;
  border: none;
  background: ${(p) => (p.$active ? '#6366f1' : 'transparent')};
  color: ${(p) => (p.$active ? 'white' : '#374151')};
  font-size: 14px;
  cursor: pointer;
  border-radius: 8px;
  margin-bottom: 4px;
  &:hover {
    background: ${(p) => (p.$active ? '#5558e3' : '#f3f4f6')};
  }
`
const ModalClose = styled.button`
  margin-top: 12px;
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  cursor: pointer;
  width: 100%;
  &:hover {
    background: #f9fafb;
  }
`
