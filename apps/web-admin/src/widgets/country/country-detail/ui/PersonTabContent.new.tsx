import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import styled from 'styled-components'
import { dynastyApi } from '@/shared/api/dynasty'
import { personApi, type Person } from '@/shared/api/person'
import { getPersonDetailById } from '@/shared/api/persons-detail'
import { PersonList } from './person/PersonList'
import { PersonDetailView } from './person/PersonDetailView'

interface PersonTabContentProps {
  countryId: string
}

export function PersonTabContent({ countryId }: PersonTabContentProps) {
  // State
  const [persons, setPersons] = useState<Person[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [personDetail, setPersonDetail] = useState<any>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [genderFilter, setGenderFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('name')
  const itemsPerPage = 12

  // Fetch persons
  useEffect(() => {
    const fetchPersons = async () => {
      setIsLoading(true)
      try {
        const data = await personApi.getByCountryId(countryId)
        setPersons(data)
      } catch {
        setPersons([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchPersons()
  }, [countryId])

  const { data: dynasties = [] } = useQuery({
    queryKey: ['dynasties'],
    queryFn: () => dynastyApi.getAll(),
    staleTime: 1000 * 60 * 5,
  })

  // Fetch person detail
  useEffect(() => {
    if (selectedPersonId) {
      const fetchDetail = async () => {
        setIsLoadingDetail(true)
        try {
          const detail = await getPersonDetailById(selectedPersonId)
          setPersonDetail(detail)
        } catch {
          // ignore
        } finally {
          setIsLoadingDetail(false)
        }
      }
      fetchDetail()
    }
  }, [selectedPersonId])

  // Handlers
  const handleBack = () => {
    setSelectedPersonId(null)
    setPersonDetail(null)
  }

  const handlePersonClick = (personId: string) => {
    setSelectedPersonId(personId)
  }

  // Loading state
  if (isLoading) {
    return (
      <Wrap>
        <LoadingMessage>
          <Spinner />
          인물 데이터를 불러오는 중...
        </LoadingMessage>
      </Wrap>
    )
  }

  // Detail view
  if (selectedPersonId) {
    return (
      <DetailSection
        as={motion.div}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
      >
        <FloatingBackButton
          onClick={handleBack}
          as={motion.button}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M12 19l-7-7 7-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </FloatingBackButton>

        {isLoadingDetail ? (
          <LoadingMessage>
            <Spinner />
            상세 정보를 불러오는 중...
          </LoadingMessage>
        ) : personDetail ? (
          <PersonDetailView person={personDetail} />
        ) : (
          <ErrorMessage>상세 정보를 불러올 수 없습니다</ErrorMessage>
        )}
      </DetailSection>
    )
  }

  // List view
  return (
    <Wrap>
      <Container
        as={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <PersonList
          persons={persons}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          genderFilter={genderFilter}
          onGenderChange={setGenderFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onPersonClick={handlePersonClick}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          dynasties={dynasties}
        />
      </Container>
    </Wrap>
  )
}

// Styled Components
const Wrap = styled.div`
  width: 100%;
  min-height: 400px;
`

const Container = styled.div`
  max-width: 100%;
  width: 100%;
`

const LoadingMessage = styled.div`
  text-align: center;
  padding: 80px 48px;
  font-size: 15px;
  color: #6b7280;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
`

const Spinner = styled.div`
  width: 52px;
  height: 52px;
  border: 4px solid #f3e8ff;
  border-top-color: #ad46ff;
  border-right-color: #ad46ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

const DetailSection = styled.div`
  width: 100%;
  min-height: 400px;
  position: relative;
`

const FloatingBackButton = styled.button`
  position: fixed;
  top: 100px;
  left: 20px;
  z-index: 100;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 50%;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  &:hover {
    background: #f9fafb;
    border-color: #ad46ff;
    color: #ad46ff;
    box-shadow: 0 4px 12px rgba(173, 70, 255, 0.2);
  }
`

const ErrorMessage = styled.div`
  text-align: center;
  padding: 60px 20px;
  font-size: 14px;
  color: #ef4444;
  font-weight: 500;
`
