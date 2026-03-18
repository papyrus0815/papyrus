import { useState } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useDynasties,
  useDeleteDynasty,
} from '@/features/dynasty/use-dynasties.hook'
import { DynastyForm } from './components/dynasty-form'
import type { Dynasty } from '@/shared/api/dynasty'

export const DynastyPage = () => {
  const { data: dynasties = [], isLoading } = useDynasties()
  const deleteDynasty = useDeleteDynasty()
  const [selectedDynasty, setSelectedDynasty] = useState<Dynasty | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const handleCreate = () => {
    setSelectedDynasty(null)
    setIsFormOpen(true)
  }

  const handleEdit = (dynasty: Dynasty) => {
    setSelectedDynasty(dynasty)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      await deleteDynasty.mutateAsync(id)
    }
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setSelectedDynasty(null)
  }

  if (isLoading) {
    return (
      <Container>
        <LoadingWrapper>
          <LoadingSpinner />
          <LoadingText>가문 목록을 불러오는 중...</LoadingText>
        </LoadingWrapper>
      </Container>
    )
  }

  return (
    <Container>
      <Header>
        <HeaderContent>
          <Title>가문 관리</Title>
          <CreateButton onClick={handleCreate}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            새 가문 추가
          </CreateButton>
        </HeaderContent>
      </Header>

      <Content>
        <DynastyGrid>
          <AnimatePresence>
            {Array.isArray(dynasties) &&
              dynasties.map((dynasty) => (
                <DynastyCard
                  key={dynasty.id}
                  as={motion.div}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -4 }}
                >
                  <CardHeader>
                    {dynasty.thumbnailUrl ? (
                      <DynastyImage>
                        <img src={dynasty.thumbnailUrl} alt={dynasty.name} />
                      </DynastyImage>
                    ) : (
                      <DynastyImagePlaceholder>
                        <svg
                          width="48"
                          height="48"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      </DynastyImagePlaceholder>
                    )}
                    <CardBadge>가문</CardBadge>
                  </CardHeader>

                  <DynastyInfo>
                    <DynastyName>{dynasty.name}</DynastyName>
                    {dynasty.description && (
                      <DynastyDescription>
                        {dynasty.description}
                      </DynastyDescription>
                    )}

                    {(dynasty.startDate || dynasty.endDate) && (
                      <DynastyMeta>
                        <MetaItem>
                          <MetaIcon>📅</MetaIcon>
                          <MetaText>
                            {dynasty.startDate
                              ? new Date(dynasty.startDate).toLocaleDateString(
                                  'ko-KR',
                                  {
                                    year: 'numeric',
                                    month: 'long',
                                  },
                                )
                              : '시작일 미정'}
                            {' ~ '}
                            {dynasty.endDate
                              ? new Date(dynasty.endDate).toLocaleDateString(
                                  'ko-KR',
                                  {
                                    year: 'numeric',
                                    month: 'long',
                                  },
                                )
                              : '현재'}
                          </MetaText>
                        </MetaItem>
                      </DynastyMeta>
                    )}
                  </DynastyInfo>

                  <DynastyActions>
                    <ActionButton onClick={() => handleEdit(dynasty)}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      수정
                    </ActionButton>
                    <DeleteButton onClick={() => handleDelete(dynasty.id)}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      삭제
                    </DeleteButton>
                  </DynastyActions>
                </DynastyCard>
              ))}
          </AnimatePresence>

          {!dynasties || !Array.isArray(dynasties) || dynasties.length === 0 ? (
            <EmptyState>
              <EmptyIcon>
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </EmptyIcon>
              <EmptyTitle>등록된 가문이 없습니다</EmptyTitle>
              <EmptyDescription>새 가문을 추가하여 시작하세요</EmptyDescription>
            </EmptyState>
          ) : null}
        </DynastyGrid>
      </Content>

      <AnimatePresence>
        {isFormOpen && (
          <DynastyForm dynasty={selectedDynasty} onClose={handleCloseForm} />
        )}
      </AnimatePresence>
    </Container>
  )
}

const Container = styled.div`
  min-height: 100vh;
  background: #f8fafc;
`

const Header = styled.div`
  background: white;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 10;
`

const HeaderContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const Title = styled.h1`
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
`

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
  }
`

const Content = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px;
`

const DynastyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
`

const DynastyCard = styled.div`
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #f1f5f9;

  &:hover {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
    border-color: #e2e8f0;
  }
`

const CardHeader = styled.div`
  position: relative;
  width: 100%;
  height: 200px;
`

const CardBadge = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  color: #667eea;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`

const DynastyImage = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const DynastyImagePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0.9;
`

const DynastyInfo = styled.div`
  padding: 24px;
`

const DynastyName = styled.h3`
  margin: 0 0 12px;
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.02em;
`

const DynastyDescription = styled.p`
  margin: 0 0 16px;
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const DynastyMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const MetaIcon = styled.span`
  font-size: 16px;
  flex-shrink: 0;
`

const MetaText = styled.span`
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
`

const DynastyActions = styled.div`
  display: flex;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid #f1f5f9;
  background: #fafbfc;
`

const ActionButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 11px;
  background: white;
  color: #475569;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    transform: translateY(-1px);
  }
`

const DeleteButton = styled(ActionButton)`
  color: #dc2626;

  &:hover {
    background: #fef2f2;
    border-color: #fecaca;
  }
`

const EmptyState = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
`

const EmptyIcon = styled.div`
  width: 80px;
  height: 80px;
  background: #f1f5f9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  color: #94a3b8;
`

const EmptyTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
`

const EmptyDescription = styled.p`
  margin: 0;
  font-size: 15px;
  color: #64748b;
`

const LoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 16px;
`

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid #f1f5f9;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

const LoadingText = styled.div`
  font-size: 15px;
  color: #64748b;
  font-weight: 500;
`
