import { useState } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useJobCategories,
  useDeleteJobCategory,
} from '@/features/job-category/use-job-categories.hook'
import { JobCategoryForm } from './components/job-category-form'
import type { JobCategory } from '@/shared/api/job-category'

export const JobCategoryPage = () => {
  const { data: categories = [], isLoading } = useJobCategories()
  const deleteCategory = useDeleteJobCategory()
  const [selectedCategory, setSelectedCategory] = useState<JobCategory | null>(
    null,
  )
  const [isFormOpen, setIsFormOpen] = useState(false)

  const handleCreate = () => {
    setSelectedCategory(null)
    setIsFormOpen(true)
  }

  const handleEdit = (category: JobCategory) => {
    setSelectedCategory(category)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      await deleteCategory.mutateAsync(id)
    }
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setSelectedCategory(null)
  }

  // 최상위 카테고리만 필터링
  const topLevelCategories = Array.isArray(categories)
    ? categories.filter((cat) => !cat.parentId)
    : []

  if (isLoading) {
    return (
      <Container>
        <LoadingWrapper>
          <LoadingSpinner />
          <LoadingText>카테고리를 불러오는 중...</LoadingText>
        </LoadingWrapper>
      </Container>
    )
  }

  return (
    <Container>
      <Header>
        <HeaderContent>
          <TitleSection>
            <Title>직업 카테고리 관리</Title>
            <Subtitle>{categories.length}개의 카테고리</Subtitle>
          </TitleSection>
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
            새 카테고리 추가
          </CreateButton>
        </HeaderContent>
      </Header>

      <Content>
        <CategoryGrid>
          <AnimatePresence>
            {topLevelCategories.map((category) => (
              <CategoryCard
                key={category.id}
                as={motion.div}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -4 }}
              >
                <CardHeader>
                  {category.thumbnailUrl ? (
                    <CategoryImage>
                      <img src={category.thumbnailUrl} alt={category.name} />
                    </CategoryImage>
                  ) : (
                    <CategoryImagePlaceholder>
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </CategoryImagePlaceholder>
                  )}
                  <CardBadge>
                    {category.jobCount || 0}개 직업
                  </CardBadge>
                </CardHeader>

                <CategoryInfo>
                  <CategoryName>{category.name}</CategoryName>
                  {category.children && category.children.length > 0 && (
                    <SubCategories>
                      <SubCategoryIcon>📁</SubCategoryIcon>
                      <SubCategoryText>
                        {category.children.length}개 하위 카테고리
                      </SubCategoryText>
                    </SubCategories>
                  )}
                  {category.parent && (
                    <ParentCategory>
                      <ParentIcon>↳</ParentIcon>
                      <ParentText>{category.parent.name}</ParentText>
                    </ParentCategory>
                  )}
                </CategoryInfo>

                <CategoryActions>
                  <ActionButton onClick={() => handleEdit(category)}>
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
                  <DeleteButton onClick={() => handleDelete(category.id)}>
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
                </CategoryActions>

                {/* 하위 카테고리 표시 */}
                {category.children && category.children.length > 0 && (
                  <SubCategoryList>
                    {category.children.map((child) => {
                      const childCategory = categories.find(
                        (c) => c.id === child.id,
                      )
                      return (
                        <SubCategoryItem
                          key={child.id}
                          onClick={() => childCategory && handleEdit(childCategory)}
                        >
                          <SubCategoryItemText>{child.name}</SubCategoryItemText>
                          <SubCategoryItemBadge>
                            {childCategory?.jobCount || 0}
                          </SubCategoryItemBadge>
                        </SubCategoryItem>
                      )
                    })}
                  </SubCategoryList>
                )}
              </CategoryCard>
            ))}
          </AnimatePresence>

          {topLevelCategories.length === 0 && (
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
                  <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </EmptyIcon>
              <EmptyTitle>등록된 카테고리가 없습니다</EmptyTitle>
              <EmptyDescription>새 카테고리를 추가하여 시작하세요</EmptyDescription>
            </EmptyState>
          )}
        </CategoryGrid>
      </Content>

      <AnimatePresence>
        {isFormOpen && (
          <JobCategoryForm category={selectedCategory} onClose={handleCloseForm} />
        )}
      </AnimatePresence>
    </Container>
  )
}

// Styled Components
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

const TitleSection = styled.div`
  display: flex;
  align-items: baseline;
  gap: 16px;
`

const Title = styled.h1`
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
`

const Subtitle = styled.span`
  font-size: 15px;
  color: #64748b;
  font-weight: 500;
`

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(74, 222, 128, 0.3);
  }
`

const Content = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px;
`

const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
`

const CategoryCard = styled.div`
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
  height: 160px;
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
  color: #4ade80;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`

const CategoryImage = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const CategoryImagePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0.9;
`

const CategoryInfo = styled.div`
  padding: 24px;
`

const CategoryName = styled.h3`
  margin: 0 0 12px;
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.02em;
`

const SubCategories = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`

const SubCategoryIcon = styled.span`
  font-size: 16px;
`

const SubCategoryText = styled.span`
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
`

const ParentCategory = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
`

const ParentIcon = styled.span`
  font-size: 14px;
  color: #94a3b8;
`

const ParentText = styled.span`
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
`

const SubCategoryList = styled.div`
  padding: 16px 24px 24px;
  border-top: 1px solid #f1f5f9;
  background: #fafbfc;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const SubCategoryItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #4ade80;
    transform: translateX(4px);
  }
`

const SubCategoryItemText = styled.span`
  font-size: 14px;
  color: #475569;
  font-weight: 500;
`

const SubCategoryItemBadge = styled.span`
  padding: 4px 10px;
  background: #f1f5f9;
  color: #64748b;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
`

const CategoryActions = styled.div`
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
  border-top-color: #4ade80;
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


