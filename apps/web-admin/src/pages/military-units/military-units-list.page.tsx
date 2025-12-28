/**
 * 군부대 목록 페이지
 */
import React, { useEffect, useState } from 'react'

import { FiEdit2, FiFilter, FiImage, FiPlus, FiSearch, FiShield, FiTrash2, FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import type { CountryResponseDto } from '@/shared/api/countries'
import { getAllCountries } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import type { MilitaryUnit, MilitaryUnitType } from '@/shared/api/military-unit'
import { militaryUnitApi } from '@/shared/api/military-unit'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { CountrySelectModal } from '@/shared/ui/country-select-modal/CountrySelectModal'

// 목업 데이터
const MOCK_MILITARY_UNITS: MilitaryUnit[] = [
  {
    id: '1',
    name: '제1보병사단',
    unitType: 'DIVISION',
    countryId: 'kr',
    isActive: true,
    establishedDate: '1945-08-15',
    disbandedDate: null,
    description: '대한민국 육군 최초의 보병사단',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    country: {
      id: 'kr',
      name: '대한민국',
      flagEmoji: '🇰🇷',
    },
  },
  {
    id: '2',
    name: '해병 제1사단',
    unitType: 'DIVISION',
    countryId: 'kr',
    isActive: true,
    establishedDate: '1949-04-15',
    disbandedDate: null,
    description: '대한민국 해병대 최정예 부대',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    country: {
      id: 'kr',
      name: '대한민국',
      flagEmoji: '🇰🇷',
    },
  },
  {
    id: '3',
    name: '제1기갑사단',
    unitType: 'DIVISION',
    countryId: 'us',
    isActive: true,
    establishedDate: '1940-07-15',
    disbandedDate: null,
    description: '미국 육군의 전설적인 기갑사단',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    country: {
      id: 'us',
      name: '미국',
      flagEmoji: '🇺🇸',
    },
  },
  {
    id: '4',
    name: '나폴레옹 근위대',
    unitType: 'SPECIAL_FORCES',
    countryId: 'fr',
    isActive: false,
    establishedDate: '1804-05-18',
    disbandedDate: '1815-06-18',
    description: '나폴레옹의 정예 친위 부대',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    country: {
      id: 'fr',
      name: '프랑스',
      flagEmoji: '🇫🇷',
    },
  },
  {
    id: '5',
    name: '제101공수사단',
    unitType: 'DIVISION',
    countryId: 'us',
    isActive: true,
    establishedDate: '1942-08-16',
    disbandedDate: null,
    description: '미국의 명성 높은 공수부대, 노르망디 상륙작전 참전',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    country: {
      id: 'us',
      name: '미국',
      flagEmoji: '🇺🇸',
    },
  },
]

const UNIT_TYPE_LABELS: Record<MilitaryUnitType, string> = {
  FIELD_ARMY: '야전군',
  CORPS: '군단',
  DIVISION: '사단',
  BRIGADE: '여단',
  REGIMENT: '연대',
  BATTALION: '대대',
  COMPANY: '중대',
  PLATOON: '소대',
  SQUAD: '분대',
  FLEET: '함대',
  SQUADRON: '전대',
  WING: '비행단',
  SPECIAL_FORCES: '특수부대',
  DETACHMENT: '파견대',
  OTHER: '기타',
}

export const MilitaryUnitsListPage: React.FC = () => {
  const navigate = useNavigate()
  const playClickSound = useClickSound()

  const [militaryUnits, setMilitaryUnits] = useState<MilitaryUnit[]>(MOCK_MILITARY_UNITS)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCountry, setFilterCountry] = useState<string>('')
  const [filterCountryName, setFilterCountryName] = useState<string>('')
  const [filterUnitType, setFilterUnitType] = useState<MilitaryUnitType | ''>('')
  const [filterUnitTypeName, setFilterUnitTypeName] = useState<string>('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterActiveName, setFilterActiveName] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  const [countryModalOpen, setCountryModalOpen] = useState(false)
  const [unitTypeModalOpen, setUnitTypeModalOpen] = useState(false)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  
  // 국가 데이터
  const [modernCountries, setModernCountries] = useState<CountryResponseDto[]>([])
  const [historicalCountries, setHistoricalCountries] = useState<HistoricalCountryResponseDto[]>([])

  // 군부대 목록 로드 (실제 API 사용 시 활성화)
  useEffect(() => {
    // loadMilitaryUnits()
    loadCountries()
  }, [])

  const loadCountries = async () => {
    try {
      const [modern, historical] = await Promise.all([
        getAllCountries(),
        getAllHistoricalCountries(),
      ])
      setModernCountries(modern)
      setHistoricalCountries(historical)
    } catch (error) {
      console.error('국가 목록 로드 실패:', error)
    }
  }

  const loadMilitaryUnits = async () => {
    try {
      setLoading(true)
      const data = await militaryUnitApi.getAll()
      setMilitaryUnits(data)
    } catch (error) {
      console.error('군부대 목록 로드 실패:', error)
      // 실패 시 목업 데이터 사용
      setMilitaryUnits(MOCK_MILITARY_UNITS)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`'${name}' 군부대를 삭제하시겠습니까?`)) {
      return
    }

    try {
      await militaryUnitApi.delete(id)
      alert('군부대가 삭제되었습니다.')
      loadMilitaryUnits()
    } catch (error) {
      console.error('군부대 삭제 실패:', error)
      alert('군부대 삭제에 실패했습니다.')
    }
  }

  // 필터링된 목록
  const filteredUnits = militaryUnits.filter((unit) => {
    // 검색어 필터
    const matchesSearch = unit.name.toLowerCase().includes(searchQuery.toLowerCase())

    // 국가 필터
    const matchesCountry = !filterCountry || unit.country?.id === filterCountry

    // 부대 유형 필터
    const matchesUnitType = !filterUnitType || unit.unitType === filterUnitType

    // 활동 상태 필터
    const matchesActive =
      filterActive === 'all' ||
      (filterActive === 'active' && unit.isActive) ||
      (filterActive === 'inactive' && !unit.isActive)

    return matchesSearch && matchesCountry && matchesUnitType && matchesActive
  })

  // 고유 국가 목록
  const uniqueCountries = Array.from(
    new Set(militaryUnits.map((unit) => unit.country).filter(Boolean)),
  ).filter((country, index, self) => 
    self.findIndex((c) => c?.id === country?.id) === index
  )

  // 활성 필터 개수
  const activeFilterCount = [filterCountry, filterUnitType, filterActive !== 'all' ? '1' : ''].filter(Boolean).length

  // 메타 통계
  const activeUnitsCount = filteredUnits.filter((u) => u.isActive).length
  const inactiveUnitsCount = filteredUnits.filter((u) => !u.isActive).length

  return (
    <PageWrapper>
      <PageHeader>
        <HeaderLeft>
          <FiShield size={32} />
          <div>
            <h1>군부대 관리</h1>
            <p>군부대 정보를 관리합니다</p>
          </div>
        </HeaderLeft>
        <CreateButton
          onClick={() => {
            playClickSound()
            navigate('/military-units/create')
          }}
        >
          <FiPlus size={18} />
          군부대 추가
        </CreateButton>
      </PageHeader>

      <MainLayout>
        {/* 좌측 필터 사이드바 */}
        <FilterSidebar>
          <SidebarSection>
            <SidebarTitle>필터</SidebarTitle>
            
            <FilterGroup>
              <FilterLabel>검색</FilterLabel>
              <SidebarSearchInput
                type="text"
                placeholder="군부대명 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </FilterGroup>

            <FilterGroup>
              <FilterLabel>국가</FilterLabel>
              <CountrySelectButton
                onClick={() => {
                  playClickSound()
                  setCountryModalOpen(true)
                }}
              >
                {filterCountryName ? (
                  <span>{filterCountryName}</span>
                ) : (
                  <span style={{ color: '#94a3b8' }}>국가 선택</span>
                )}
              </CountrySelectButton>
              {filterCountry && (
                <ClearCountryButton
                  onClick={() => {
                    playClickSound()
                    setFilterCountry('')
                    setFilterCountryName('')
                  }}
                >
                  <FiX size={14} />
                </ClearCountryButton>
              )}
            </FilterGroup>

            <FilterGroup>
              <FilterLabel>부대 유형</FilterLabel>
              <CountrySelectButton
                onClick={() => {
                  playClickSound()
                  setUnitTypeModalOpen(true)
                }}
              >
                {filterUnitTypeName ? (
                  <span>{filterUnitTypeName}</span>
                ) : (
                  <span style={{ color: '#94a3b8' }}>부대 유형 선택</span>
                )}
              </CountrySelectButton>
              {filterUnitType && (
                <ClearCountryButton
                  onClick={() => {
                    playClickSound()
                    setFilterUnitType('')
                    setFilterUnitTypeName('')
                  }}
                >
                  <FiX size={14} />
                </ClearCountryButton>
              )}
            </FilterGroup>

            <FilterGroup>
              <FilterLabel>활동 상태</FilterLabel>
              <CountrySelectButton
                onClick={() => {
                  playClickSound()
                  setStatusModalOpen(true)
                }}
              >
                {filterActiveName ? (
                  <span>{filterActiveName}</span>
                ) : (
                  <span style={{ color: '#94a3b8' }}>상태 선택</span>
                )}
              </CountrySelectButton>
              {filterActive !== 'all' && (
                <ClearCountryButton
                  onClick={() => {
                    playClickSound()
                    setFilterActive('all')
                    setFilterActiveName('')
                  }}
                >
                  <FiX size={14} />
                </ClearCountryButton>
              )}
            </FilterGroup>

            {activeFilterCount > 0 && (
              <ClearFiltersButton
                onClick={() => {
                  playClickSound()
                  setSearchQuery('')
                  setFilterCountry('')
                  setFilterCountryName('')
                  setFilterUnitType('')
                  setFilterUnitTypeName('')
                  setFilterActive('all')
                  setFilterActiveName('')
                }}
              >
                <FiX size={16} />
                필터 초기화
              </ClearFiltersButton>
            )}
          </SidebarSection>
        </FilterSidebar>

        {/* 우측 컨텐츠 영역 */}
        <ContentArea>
          {/* 상단 메타 정보 */}
          <MetaInfoBar>
            <MetaCard>
              <MetaIcon>
                <FiShield size={20} />
              </MetaIcon>
              <MetaContent>
                <MetaValue>{filteredUnits.length}</MetaValue>
                <MetaLabel>전체 군부대</MetaLabel>
              </MetaContent>
            </MetaCard>

            <MetaCard>
              <MetaIcon $color="#10b981">
                <FiShield size={20} />
              </MetaIcon>
              <MetaContent>
                <MetaValue>{activeUnitsCount}</MetaValue>
                <MetaLabel>활동 중</MetaLabel>
              </MetaContent>
            </MetaCard>

            <MetaCard>
              <MetaIcon $color="#64748b">
                <FiShield size={20} />
              </MetaIcon>
              <MetaContent>
                <MetaValue>{inactiveUnitsCount}</MetaValue>
                <MetaLabel>해산됨</MetaLabel>
              </MetaContent>
            </MetaCard>

            <MetaCard>
              <MetaIcon $color="#f59e0b">
                <FiShield size={20} />
              </MetaIcon>
              <MetaContent>
                <MetaValue>{uniqueCountries.length}</MetaValue>
                <MetaLabel>국가</MetaLabel>
              </MetaContent>
            </MetaCard>
          </MetaInfoBar>

          {/* 군부대 그리드 */}
          {loading ? (
            <LoadingMessage>로딩 중...</LoadingMessage>
          ) : filteredUnits.length === 0 ? (
            <EmptyMessage>
              {searchQuery || activeFilterCount > 0
                ? '검색 결과가 없습니다.'
                : '등록된 군부대가 없습니다.'}
            </EmptyMessage>
          ) : (
            <UnitsGrid>
              {filteredUnits.map((unit) => (
                <UnitCard 
                  key={unit.id}
                  onClick={() => {
                    playClickSound()
                    navigate(`/military-units/${unit.id}`)
                  }}
                >
                  {/* 썸네일 이미지 */}
                  <UnitThumbnail>
                    {unit.thumbnail ? (
                      <ThumbnailImage src={unit.thumbnail} alt={unit.name} />
                    ) : (
                      <ThumbnailPlaceholder>
                        <FiImage size={32} />
                      </ThumbnailPlaceholder>
                    )}
                    {!unit.isActive && (
                      <InactiveBadgeOverlay>해산됨</InactiveBadgeOverlay>
                    )}
                  </UnitThumbnail>

                  <UnitContent>
                    <UnitHeader>
                      <UnitInfo>
                        <UnitName>{unit.name}</UnitName>
                        {unit.country && (
                          <UnitMeta>
                            {unit.country.flagEmoji} {unit.country.name}
                          </UnitMeta>
                        )}
                      </UnitInfo>
                    </UnitHeader>

                    <UnitBody>
                      {unit.unitType && (
                        <UnitDetail>
                          <DetailLabel>부대 유형</DetailLabel>
                          <DetailValue>{UNIT_TYPE_LABELS[unit.unitType]}</DetailValue>
                        </UnitDetail>
                      )}
                      {unit.establishedDate && (
                        <UnitDetail>
                          <DetailLabel>창설일</DetailLabel>
                          <DetailValue>{unit.establishedDate}</DetailValue>
                        </UnitDetail>
                      )}
                      {unit.description && (
                        <UnitDescription>{unit.description}</UnitDescription>
                      )}
                    </UnitBody>

                    <UnitActions onClick={(e) => e.stopPropagation()}>
                      <ActionButton
                        onClick={(e) => {
                          e.stopPropagation()
                          playClickSound()
                          navigate(`/military-units/edit/${unit.id}`)
                        }}
                      >
                        <FiEdit2 size={14} />
                      </ActionButton>
                      <ActionButton
                        $variant="danger"
                        onClick={(e) => {
                          e.stopPropagation()
                          playClickSound()
                          handleDelete(unit.id, unit.name)
                        }}
                      >
                        <FiTrash2 size={14} />
                      </ActionButton>
                    </UnitActions>
                  </UnitContent>
                </UnitCard>
              ))}
            </UnitsGrid>
          )}
        </ContentArea>
      </MainLayout>

      {/* 국가 선택 모달 */}
      <CountrySelectModal
        isOpen={countryModalOpen}
        onClose={() => setCountryModalOpen(false)}
        onSelect={(country) => {
          const flagEmoji = modernCountries.find((c) => c.id === country.id)?.flagEmoji || 
                           historicalCountries.find((c) => c.id === country.id)?.flagEmoji || 
                           '🏳️'
          setFilterCountry(country.id)
          setFilterCountryName(`${flagEmoji} ${country.name}`)
          setCountryModalOpen(false)
        }}
        modernCountries={modernCountries}
        historicalCountries={historicalCountries}
      />

      {/* 부대 유형 선택 모달 */}
      {unitTypeModalOpen && (
        <SimpleSelectModal
          title="부대 유형 선택"
          isOpen={unitTypeModalOpen}
          onClose={() => setUnitTypeModalOpen(false)}
          options={Object.entries(UNIT_TYPE_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
          onSelect={(value, label) => {
            setFilterUnitType(value as MilitaryUnitType)
            setFilterUnitTypeName(label)
            setUnitTypeModalOpen(false)
          }}
          selectedValue={filterUnitType}
        />
      )}

      {/* 활동 상태 선택 모달 */}
      {statusModalOpen && (
        <SimpleSelectModal
          title="활동 상태 선택"
          isOpen={statusModalOpen}
          onClose={() => setStatusModalOpen(false)}
          options={[
            { value: 'all', label: '전체' },
            { value: 'active', label: '활동 중' },
            { value: 'inactive', label: '해산됨' },
          ]}
          onSelect={(value, label) => {
            setFilterActive(value as 'all' | 'active' | 'inactive')
            setFilterActiveName(value === 'all' ? '' : label)
            setStatusModalOpen(false)
          }}
          selectedValue={filterActive}
        />
      )}
    </PageWrapper>
  )
}

// 간단한 선택 모달 컴포넌트
interface SimpleSelectModalProps {
  title: string
  isOpen: boolean
  onClose: () => void
  options: Array<{ value: string; label: string }>
  onSelect: (value: string, label: string) => void
  selectedValue?: string
}

const SimpleSelectModal: React.FC<SimpleSelectModalProps> = ({
  title,
  isOpen,
  onClose,
  options,
  onSelect,
  selectedValue,
}) => {
  const playClickSound = useClickSound()

  if (!isOpen) return null

  return (
    <ModalOverlay onClick={onClose}>
      <ModalBox onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <ModalCloseButton onClick={onClose}>
            <FiX size={20} />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          {options.map((option) => (
            <ModalOption
              key={option.value}
              $selected={selectedValue === option.value}
              onClick={() => {
                playClickSound()
                onSelect(option.value, option.label)
              }}
            >
              <span>{option.label}</span>
              {selectedValue === option.value && <FiShield size={16} />}
            </ModalOption>
          ))}
        </ModalBody>
      </ModalBox>
    </ModalOverlay>
  )
}

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`

const ModalBox = styled.div`
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 400px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
`

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
`

const ModalCloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(148, 163, 184, 0.08);
  color: #94a3b8;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
  }
`

const ModalBody = styled.div`
  padding: 12px;
  overflow-y: auto;
  flex: 1;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(226, 232, 240, 0.3);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.4);
    border-radius: 4px;

    &:hover {
      background: rgba(148, 163, 184, 0.6);
    }
  }
`

const ModalOption = styled.button<{ $selected: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: ${({ $selected }) => ($selected ? '600' : '500')};
  color: ${({ $selected }) => ($selected ? '#6366f1' : '#0f172a')};
  background: ${({ $selected }) =>
    $selected ? 'rgba(99, 102, 241, 0.08)' : 'transparent'};
  border: 1.5px solid
    ${({ $selected }) =>
      $selected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(226, 232, 240, 0.6)'};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:hover {
    background: ${({ $selected }) =>
      $selected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.04)'};
    border-color: ${({ $selected }) =>
      $selected ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.2)'};
    transform: translateX(4px);
  }

  &:active {
    transform: translateX(2px);
  }

  svg {
    color: #6366f1;
  }
`

const PageWrapper = styled.div`
  min-height: 100vh;
  background: #f8fafc;
  padding: calc(var(--header-height, 64px) + 24px) 24px 24px;
`

const PageHeader = styled.div`
  max-width: 1400px;
  margin: 0 auto 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  color: #6366f1;

  h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    color: #0f172a;
  }

  p {
    margin: 4px 0 0;
    font-size: 14px;
    color: #64748b;
  }
`

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);

  &:hover {
    background: linear-gradient(135deg, #4f46e5, #4338ca);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`

const MainLayout = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  gap: 24px;
  align-items: flex-start;

  @media (max-width: 1024px) {
    flex-direction: column;
  }
`

const FilterSidebar = styled.aside`
  width: 280px;
  flex-shrink: 0;
  position: sticky;
  top: calc(var(--header-height, 64px) + 24px);

  @media (max-width: 1024px) {
    width: 100%;
    position: static;
  }
`

const SidebarSection = styled.div`
  background: #ffffff;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 16px;
  padding: 24px;
`

const SidebarTitle = styled.h2`
  margin: 0 0 20px;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
`

const ContentArea = styled.div`
  flex: 1;
  min-width: 0;
`

const MetaInfoBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const MetaCard = styled.div`
  background: #ffffff;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.08);
  }
`

const MetaIcon = styled.div<{ $color?: string }>`
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => $color ? `${$color}15` : 'rgba(99, 102, 241, 0.1)'};
  border-radius: 10px;
  color: ${({ $color }) => $color || '#6366f1'};
`

const MetaContent = styled.div`
  flex: 1;
  min-width: 0;
`

const MetaValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
`

const MetaLabel = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  margin-top: 2px;
`

const SidebarSearchInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: #0f172a;
  background: #ffffff;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 10px;
  outline: none;
  transition: all 0.2s ease;

  &::placeholder {
    color: #94a3b8;
  }

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  position: relative;

  &:last-of-type {
    margin-bottom: 0;
  }
`

const FilterLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const CountrySelectButton = styled.button`
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: #0f172a;
  background: #ffffff;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 10px;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:hover {
    border-color: #6366f1;
  }

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`

const ClearCountryButton = styled.button`
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(99, 102, 241, 0.1);
  border: none;
  border-radius: 6px;
  color: #6366f1;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.2);
  }
`

const FilterSelect = styled.select`
  padding: 10px 14px;
  font-size: 14px;
  color: #0f172a;
  background: #ffffff;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 10px;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`

const ClearFiltersButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.08);
  border: 1.5px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 20px;
  width: 100%;

  &:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: #6366f1;
  }
`

const LoadingMessage = styled.div`
  text-align: center;
  padding: 60px 20px;
  font-size: 16px;
  color: #64748b;
`

const EmptyMessage = styled.div`
  text-align: center;
  padding: 60px 20px;
  font-size: 16px;
  color: #64748b;
`

const UnitsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`

const UnitCard = styled.div`
  background: #ffffff;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.08);
    transform: translateY(-2px);
  }
`

const UnitThumbnail = styled.div`
  position: relative;
  width: 100%;
  height: 160px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(79, 70, 229, 0.02));
  overflow: hidden;
`

const ThumbnailImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const ThumbnailPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(99, 102, 241, 0.3);
`

const InactiveBadgeOverlay = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  color: #ffffff;
  background: rgba(100, 116, 139, 0.9);
  backdrop-filter: blur(4px);
  border-radius: 6px;
`

const UnitContent = styled.div`
  padding: 16px;
`

const UnitHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
`

const UnitInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const UnitName = styled.h3`
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const UnitMeta = styled.div`
  font-size: 12px;
  color: #64748b;
`

const UnitBody = styled.div`
  margin-bottom: 12px;
`

const UnitDetail = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);

  &:last-child {
    border-bottom: none;
  }
`

const DetailLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
`

const DetailValue = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: #0f172a;
`

const UnitDescription = styled.p`
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`

const UnitActions = styled.div`
  display: flex;
  gap: 6px;
  justify-content: flex-end;
`

const ActionButton = styled.button<{ $variant?: 'danger' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: ${({ $variant }) => ($variant === 'danger' ? '#ef4444' : '#6366f1')};
  background: ${({ $variant }) =>
    $variant === 'danger'
      ? 'rgba(239, 68, 68, 0.08)'
      : 'rgba(99, 102, 241, 0.08)'};
  border: 1.5px solid
    ${({ $variant }) =>
      $variant === 'danger'
        ? 'rgba(239, 68, 68, 0.2)'
        : 'rgba(99, 102, 241, 0.2)'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $variant }) =>
      $variant === 'danger'
        ? 'rgba(239, 68, 68, 0.15)'
        : 'rgba(99, 102, 241, 0.15)'};
    border-color: ${({ $variant }) =>
      $variant === 'danger' ? '#ef4444' : '#6366f1'};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`

