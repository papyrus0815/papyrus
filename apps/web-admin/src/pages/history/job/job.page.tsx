import { useState } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { useJobs, useDeleteJob } from '@/features/job/use-jobs.hook'
import {
  useJobCategories,
  useDeleteJobCategory,
} from '@/features/job-category/use-job-categories.hook'
import { JobForm } from './components/job-form'
import { JobCategoryForm } from '../job-category/components/job-category-form'
import type { Job } from '@/shared/api/job'
import type { JobCategory } from '@/shared/api/job-category'

export const JobPage = () => {
  const { data: jobs = [], isLoading } = useJobs()
  const { data: allCategories = [] } = useJobCategories()
  const deleteJob = useDeleteJob()
  const deleteCategory = useDeleteJobCategory()
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<JobCategory | null>(null)
  const [isJobFormOpen, setIsJobFormOpen] = useState(false)
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const handleCreateJob = () => {
    setSelectedJob(null)
    setIsJobFormOpen(true)
  }

  const handleCreateCategory = () => {
    setSelectedCategory(null)
    setIsCategoryFormOpen(true)
  }

  const handleEditJob = (job: Job) => {
    setSelectedJob(job)
    setIsJobFormOpen(true)
  }

  const handleEditCategory = (category: JobCategory) => {
    setSelectedCategory(category)
    setIsCategoryFormOpen(true)
  }

  const handleDeleteJob = async (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      await deleteJob.mutateAsync(id)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까? 하위 카테고리와 직업도 함께 삭제됩니다.')) {
      await deleteCategory.mutateAsync(id)
    }
  }

  const handleCloseJobForm = () => {
    setIsJobFormOpen(false)
    setSelectedJob(null)
  }

  const handleCloseCategoryForm = () => {
    setIsCategoryFormOpen(false)
    setSelectedCategory(null)
  }

  // 카테고리 필터링
  const filteredJobs = Array.isArray(jobs)
    ? categoryFilter === 'all'
      ? jobs
      : jobs.filter((job) => job.categoryId === categoryFilter)
    : []

  // 고유 카테고리 추출 (jobs에서)
  const categories = Array.isArray(jobs)
    ? Array.from(
        new Map(
          jobs
            .filter((job) => job.category)
            .map((job) => [job.category!.id, job.category!]),
        ).values(),
      )
    : []

  // 최상위 카테고리만
  const topLevelCategories = Array.isArray(allCategories)
    ? allCategories.filter((cat) => !cat.parentId)
    : []

  if (isLoading) {
    return (
      <Container>
        <LoadingWrapper>
          <LoadingSpinner />
          <LoadingText>직업 목록을 불러오는 중...</LoadingText>
        </LoadingWrapper>
      </Container>
    )
  }

  return (
    <Container>
      <Header>
        <HeaderContent>
          <TitleSection>
            <Title>직업 관리</Title>
            <Subtitle>{filteredJobs.length}개의 직업</Subtitle>
          </TitleSection>
          <ButtonGroup>
            <CategoryButton onClick={handleCreateCategory}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              카테고리 관리
            </CategoryButton>
            <CreateButton onClick={handleCreateJob}>
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
              새 직업 추가
            </CreateButton>
          </ButtonGroup>
        </HeaderContent>

        {/* 카테고리 필터 */}
        {categories.length > 0 && (
          <CategoryFilter>
            <FilterButton
              $active={categoryFilter === 'all'}
              onClick={() => setCategoryFilter('all')}
            >
              전체
            </FilterButton>
            {categories.map((category) => (
              <FilterButton
                key={category.id}
                $active={categoryFilter === category.id}
                onClick={() => setCategoryFilter(category.id)}
              >
                {category.name}
              </FilterButton>
            ))}
          </CategoryFilter>
        )}

        {/* 카테고리 관리 섹션 */}
        {topLevelCategories.length > 0 && (
          <CategoryManagement>
            <CategoryManagementTitle>카테고리 목록</CategoryManagementTitle>
            <CategoryChips>
              {topLevelCategories.map((category) => (
                <CategoryChip key={category.id}>
                  <CategoryChipInfo onClick={() => handleEditCategory(category)}>
                    <CategoryChipName>{category.name}</CategoryChipName>
                    <CategoryChipCount>{category.jobCount || 0}개</CategoryChipCount>
                  </CategoryChipInfo>
                  <CategoryChipDelete
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    ×
                  </CategoryChipDelete>
                </CategoryChip>
              ))}
            </CategoryChips>
          </CategoryManagement>
        )}
      </Header>

      <Content>
        <JobGrid>
          <AnimatePresence>
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                as={motion.div}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -4 }}
              >
                <CardHeader>
                  {job.thumbnailUrl ? (
                    <JobImage>
                      <img src={job.thumbnailUrl} alt={job.title} />
                    </JobImage>
                  ) : (
                    <JobImagePlaceholder>
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                    </JobImagePlaceholder>
                  )}
                  {job.category && <CardBadge>{job.category.name}</CardBadge>}
                </CardHeader>

                <JobInfo>
                  <JobTitle>{job.title}</JobTitle>
                  {job.description && (
                    <JobDescription>{job.description}</JobDescription>
                  )}
                </JobInfo>

                <JobActions>
                  <ActionButton onClick={() => handleEditJob(job)}>
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
                  <DeleteButton onClick={() => handleDeleteJob(job.id)}>
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
                </JobActions>
              </JobCard>
            ))}
          </AnimatePresence>

          {filteredJobs.length === 0 && (
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
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </EmptyIcon>
              <EmptyTitle>
                {categoryFilter === 'all'
                  ? '등록된 직업이 없습니다'
                  : '해당 카테고리에 직업이 없습니다'}
              </EmptyTitle>
              <EmptyDescription>새 직업을 추가하여 시작하세요</EmptyDescription>
            </EmptyState>
          )}
        </JobGrid>
      </Content>

      <AnimatePresence>
        {isJobFormOpen && <JobForm job={selectedJob} onClose={handleCloseJobForm} />}
      </AnimatePresence>

      <AnimatePresence>
        {isCategoryFormOpen && (
          <JobCategoryForm category={selectedCategory} onClose={handleCloseCategoryForm} />
        )}
      </AnimatePresence>
    </Container>
  )
}

// Styled Components (가문 페이지와 동일한 스타일 적용)
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

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
`

const CategoryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: white;
  color: #4ade80;
  border: 2px solid #4ade80;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #4ade80;
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(74, 222, 128, 0.3);
  }
`

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(240, 147, 251, 0.3);
  }
`

const CategoryFilter = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 32px 8px;
  display: flex;
  gap: 8px;
  overflow-x: auto;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 2px;
  }
`

const FilterButton = styled.button<{ $active: boolean }>`
  padding: 8px 16px;
  background: ${(props) => (props.$active ? '#f093fb' : 'white')};
  color: ${(props) => (props.$active ? 'white' : '#64748b')};
  border: 1px solid ${(props) => (props.$active ? '#f093fb' : '#e2e8f0')};
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover {
    background: ${(props) => (props.$active ? '#e082ea' : '#f8fafc')};
    border-color: ${(props) => (props.$active ? '#e082ea' : '#cbd5e1')};
  }
`

const CategoryManagement = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 12px 32px 16px;
  border-top: 1px solid #f1f5f9;
`

const CategoryManagementTitle = styled.h3`
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const CategoryChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const CategoryChip = styled.div`
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  border-radius: 20px;
  overflow: hidden;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
  }
`

const CategoryChipInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
`

const CategoryChipName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: white;
`

const CategoryChipCount = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
`

const CategoryChipDelete = styled.button`
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`

const Content = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px;
`

const JobGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
`

const JobCard = styled.div`
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

const JobImage = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const JobImagePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0.9;
`

const JobInfo = styled.div`
  padding: 24px;
`

const JobTitle = styled.h3`
  margin: 0 0 12px;
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.02em;
`

const JobDescription = styled.p`
  margin: 0;
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const JobActions = styled.div`
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

