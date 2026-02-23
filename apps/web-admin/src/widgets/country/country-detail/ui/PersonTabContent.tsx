import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styled from 'styled-components'
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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const itemsPerPage = 12

  // Fetch persons
  const fetchPersons = async () => {
    setIsLoading(true)
    try {
      const data = await personApi.getByCountryId(countryId)
      setPersons(data)
    } catch (error) {
      setPersons([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPersons()
  }, [countryId])

  // Fetch person detail
  useEffect(() => {
    if (selectedPersonId) {
      const fetchDetail = async () => {
        setIsLoadingDetail(true)
        try {
          const detail = await getPersonDetailById(selectedPersonId)
          setPersonDetail(detail)
        } catch (error) {
        } finally {
          setIsLoadingDetail(false)
        }
      }
      fetchDetail()
    }
  }, [selectedPersonId])

  // Handlers
  const handlePersonClick = async (personId: string) => {
    setSelectedPersonId(personId)
    setIsModalOpen(true)
    setIsLoadingDetail(true)

    try {
      const detail = await getPersonDetailById(personId)
      setPersonDetail(detail)
    } catch (error) {
      setPersonDetail(null)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedPersonId(null)
    setPersonDetail(null)
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

  return (
    <Wrap>
      <Container>
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
        />
      </Container>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <ModalOverlay
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
          >
            <ModalContainer
              as={motion.div}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle>인물 상세</ModalTitle>
                <CloseButton
                  onClick={handleCloseModal}
                  as={motion.button}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M18 6L6 18M6 6l12 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </CloseButton>
              </ModalHeader>

              <ModalContent>
                {isLoadingDetail ? (
                  <LoadingMessage>
                    <Spinner />
                    상세 정보를 불러오는 중...
                  </LoadingMessage>
                ) : personDetail ? (
                  <PersonDetailView person={personDetail} />
                ) : (
                  <ErrorMessage>
                    <ErrorIcon>
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M12 8v4M12 16h.01"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </ErrorIcon>
                    <ErrorTitle>상세 정보를 불러올 수 없습니다</ErrorTitle>
                    <ErrorDesc>
                      데이터를 불러오는 중 문제가 발생했습니다.
                      <br />
                      잠시 후 다시 시도해주세요.
                    </ErrorDesc>
                  </ErrorMessage>
                )}
              </ModalContent>
            </ModalContainer>
          </ModalOverlay>
        )}
      </AnimatePresence>
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
  border: 4px solid #e5e7eb;
  border-top-color: #0f172a;
  border-right-color: #0f172a;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
`

const ModalContainer = styled.div`
  position: relative;
  width: 95%;
  max-width: 1400px;
  height: 90vh;
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (max-width: 768px) {
    width: 100%;
    height: 100vh;
    border-radius: 0;
  }
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28px 36px;
  border-bottom: 2px solid #f1f5f9;
  background: #fff;
  flex-shrink: 0;
`

const ModalTitle = styled.h2`
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
`

const CloseButton = styled.button`
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 12px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
    color: #0f172a;
  }

  svg {
    stroke: currentColor;
  }
`

const ModalContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 36px;
  background: #fafafa;

  @media (max-width: 768px) {
    padding: 24px;
  }
`

const ErrorMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  text-align: center;
`

const ErrorIcon = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 16px;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border: 2px solid #fecaca;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
  margin-bottom: 20px;
`

const ErrorTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: #374151;
  margin: 0 0 10px 0;
`

const ErrorDesc = styled.p`
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
  margin: 0;
`
