import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { FiEdit2, FiSearch, FiTrash2 } from 'react-icons/fi'
import {
  useDynasties,
  useDeleteDynasty,
} from '@/features/dynasty/use-dynasties.hook'
import { DynastyForm } from './components/dynasty-form'
import type { Dynasty } from '@/shared/api/dynasty'
import { getUploadImageUrl } from '@/shared/api/upload'

type SortMode = 'name' | 'startYear' | 'recent'

export const DynastyPage = () => {
  const { data: dynasties = [], isLoading } = useDynasties()
  const deleteDynasty = useDeleteDynasty()
  const [selectedDynasty, setSelectedDynasty] = useState<Dynasty | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string
    name: string
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('name')

  const handleCreate = () => {
    setSelectedDynasty(null)
    setIsFormOpen(true)
  }

  const handleEdit = (dynasty: Dynasty) => {
    setSelectedDynasty(dynasty)
    setIsFormOpen(true)
  }

  const handleDelete = (dynasty: Dynasty) => {
    setConfirmDelete({ id: dynasty.id, name: dynasty.name })
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setSelectedDynasty(null)
  }

  const filteredSorted = useMemo(() => {
    if (!Array.isArray(dynasties)) return [] as Dynasty[]
    const query = searchQuery.trim().toLowerCase()
    const list = query
      ? dynasties.filter((d) => {
          const name = d.name?.toLowerCase() ?? ''
          const desc = (d as any).description?.toLowerCase?.() ?? ''
          const origin = (d as any).originPlace?.toLowerCase?.() ?? ''
          return (
            name.includes(query) ||
            desc.includes(query) ||
            origin.includes(query)
          )
        })
      : [...dynasties]
    const yearOf = (iso: string | null | undefined) =>
      iso ? new Date(iso).getFullYear() : Number.POSITIVE_INFINITY
    if (sortMode === 'startYear') {
      list.sort(
        (a: any, b: any) => yearOf(a.startDate) - yearOf(b.startDate),
      )
    } else if (sortMode === 'recent') {
      list.sort((a: any, b: any) => {
        const aT = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const bT = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        return bT - aT
      })
    } else {
      list.sort((a: any, b: any) =>
        (a.name ?? '').localeCompare(b.name ?? '', 'ko'),
      )
    }
    return list
  }, [dynasties, searchQuery, sortMode])

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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            새 가문 추가
          </CreateButton>
        </HeaderContent>
      </Header>

      <Content>
        <ToolbarRow>
          <SearchWrap>
            <FiSearch size={14} aria-hidden />
            <SearchInput
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이름·설명·본관 검색"
            />
          </SearchWrap>
          <SortSelect
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            aria-label="정렬"
          >
            <option value="name">이름순</option>
            <option value="startYear">시작 연도순</option>
            <option value="recent">최근 수정순</option>
          </SortSelect>
          <ResultCount>{filteredSorted.length}건</ResultCount>
        </ToolbarRow>

        <DynastyGrid>
          <AnimatePresence>
            {filteredSorted.map((dynasty) => (
              <DynastyCard
                key={dynasty.id}
                as={motion.div}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -2 }}
              >
                <CardLink to={`/history/dynasties/${dynasty.id}`}>
                  <CardHeader>
                    {dynasty.thumbnailUrl ? (
                      <DynastyImage>
                        <img
                          src={getUploadImageUrl(dynasty.thumbnailUrl)}
                          alt={dynasty.name}
                        />
                      </DynastyImage>
                    ) : (
                      <DynastyImagePlaceholder>
                        {firstGlyph(dynasty.name)}
                      </DynastyImagePlaceholder>
                    )}
                    <CardBadge>가문</CardBadge>
                  </CardHeader>

                  <DynastyInfo>
                    <DynastyName>{dynasty.name}</DynastyName>
                    {(dynasty as any).originPlace && (
                      <OriginText>{(dynasty as any).originPlace}</OriginText>
                    )}
                    {dynasty.description && (
                      <DynastyDescription>
                        {dynasty.description}
                      </DynastyDescription>
                    )}
                    {(dynasty.startDate || dynasty.endDate) && (
                      <DynastyMeta>
                        <MetaText>
                          {formatYear(dynasty.startDate)} – {formatYear(dynasty.endDate) || '현재'}
                        </MetaText>
                      </DynastyMeta>
                    )}
                  </DynastyInfo>
                </CardLink>

                <DynastyActions>
                  <ActionIconBtn
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleEdit(dynasty)
                    }}
                    aria-label={`${dynasty.name} 수정`}
                  >
                    <FiEdit2 size={14} />
                  </ActionIconBtn>
                  <ActionIconBtn
                    type="button"
                    $danger
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDelete(dynasty)
                    }}
                    aria-label={`${dynasty.name} 삭제`}
                  >
                    <FiTrash2 size={14} />
                  </ActionIconBtn>
                </DynastyActions>
              </DynastyCard>
            ))}
          </AnimatePresence>

          {filteredSorted.length === 0 ? (
            <EmptyState>
              <EmptyIcon>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </EmptyIcon>
              <EmptyTitle>
                {searchQuery
                  ? '검색 결과가 없습니다'
                  : '등록된 가문이 없습니다'}
              </EmptyTitle>
              <EmptyDescription>
                {searchQuery
                  ? '다른 키워드로 검색해 보세요'
                  : '새 가문을 추가하여 시작하세요'}
              </EmptyDescription>
            </EmptyState>
          ) : null}
        </DynastyGrid>
      </Content>

      <AnimatePresence>
        {isFormOpen && (
          <DynastyForm dynasty={selectedDynasty} onClose={handleCloseForm} />
        )}
      </AnimatePresence>

      {confirmDelete && (
        <ConfirmOverlay onClick={() => setConfirmDelete(null)}>
          <ConfirmDialog onClick={(e) => e.stopPropagation()}>
            <ConfirmMessage>
              「{confirmDelete.name}」 가문을 삭제할까요?
            </ConfirmMessage>
            <ConfirmActions>
              <ConfirmCancelBtn
                type="button"
                onClick={() => setConfirmDelete(null)}
              >
                취소
              </ConfirmCancelBtn>
              <ConfirmOkBtn
                type="button"
                onClick={async () => {
                  const id = confirmDelete.id
                  setConfirmDelete(null)
                  await deleteDynasty.mutateAsync(id)
                }}
              >
                삭제
              </ConfirmOkBtn>
            </ConfirmActions>
          </ConfirmDialog>
        </ConfirmOverlay>
      )}
    </Container>
  )
}

function firstGlyph(name: string): string {
  return name?.trim().slice(0, 1) || '·'
}

function formatYear(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).getFullYear().toString()
}

const Container = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.mode === 'dark' ? '#0f0f0f' : '#f8fafc'};
`

const Header = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(15, 15, 15, 0.85);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  ` : css`
    background: white;
    border-bottom: 1px solid #e2e8f0;
  `}
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
  color: ${({ theme }) => theme.mode === 'dark' ? '#f1f5f9' : '#1e293b'};
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

const ToolbarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  flex-wrap: wrap;
`

const SearchWrap = styled.div`
  flex: 1;
  min-width: 220px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
        `
      : css`
          background: white;
          border: 1px solid #e2e8f0;
        `}
  > svg {
    color: ${({ theme }) => theme.colors.text.tertiary};
    flex-shrink: 0;
  }
`

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const SortSelect = styled.select`
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13.5px;
  cursor: pointer;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: ${theme.colors.text.primary};
        `
      : css`
          background: white;
          border: 1px solid #e2e8f0;
          color: #1e293b;
        `}
`

const ResultCount = styled.div`
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const DynastyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`

const CardLink = styled(Link)`
  display: block;
  text-decoration: none;
  color: inherit;
`

const OriginText = styled.div`
  margin-bottom: 8px;
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: #6366f1;
`

const ActionIconBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 500;
  background: transparent;
  color: ${({ $danger, theme }) =>
    $danger ? '#dc2626' : theme.colors.text.secondary};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
  &:hover {
    color: ${({ $danger }) => ($danger ? '#b91c1c' : '#4f46e5')};
    border-color: ${({ $danger }) =>
      $danger ? 'rgba(220,38,38,0.4)' : 'rgba(99,102,241,0.4)'};
    background: ${({ $danger, theme }) =>
      $danger
        ? 'rgba(220, 38, 38, 0.08)'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(238, 242, 255, 0.6)'};
  }
`

const ConfirmOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`

const ConfirmDialog = styled.div`
  width: 100%;
  max-width: 360px;
  padding: 24px 22px 20px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(28, 28, 32, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.55);
        `
      : css`
          background: #fff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.14);
        `}
`

const ConfirmMessage = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ConfirmActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`

const ConfirmCancelBtn = styled.button`
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: ${theme.colors.text.secondary};
          &:hover { background: rgba(255, 255, 255, 0.12); }
        `
      : css`
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #475569;
          &:hover { background: #e9eef5; }
        `}
`

const ConfirmOkBtn = styled.button`
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  background: #dc2626;
  color: #ffffff;
  &:hover {
    background: #b91c1c;
  }
`

const DynastyCard = styled.div`
  border-radius: 14px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    &:hover {
      background: rgba(255, 255, 255, 0.07);
      border-color: rgba(255, 255, 255, 0.14);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
    }
  ` : css`
    background: white;
    border: 1px solid #f1f5f9;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    &:hover {
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
      border-color: #e2e8f0;
    }
  `}
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
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(102, 126, 234, 0.25);
    border: 1px solid rgba(102, 126, 234, 0.4);
    color: #a5b4fc;
  ` : css`
    background: rgba(255, 255, 255, 0.95);
    color: #667eea;
  `}
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
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 56px;
  font-weight: 700;
  letter-spacing: -0.02em;
`

const DynastyInfo = styled.div`
  padding: 24px;
`

const DynastyName = styled.h3`
  margin: 0 0 12px;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f1f5f9' : '#1e293b'};
`

const DynastyDescription = styled.p`
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: ${({ theme }) => theme.mode === 'dark' ? '#94a3b8' : '#64748b'};
`

const DynastyMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const MetaText = styled.span`
  font-size: 12.5px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.mode === 'dark' ? '#94a3b8' : '#64748b'};
`

const DynastyActions = styled.div`
  display: flex;
  gap: 8px;
  padding: 16px 24px;
  ${({ theme }) => theme.mode === 'dark' ? css`
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    background: rgba(255, 255, 255, 0.02);
  ` : css`
    border-top: 1px solid #f1f5f9;
    background: #fafbfc;
  `}
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
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255, 255, 255, 0.06);
    color: #475569;
  ` : css`
    background: #f1f5f9;
    color: #94a3b8;
  `}
`

const EmptyTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.mode === 'dark' ? '#e2e8f0' : '#1e293b'};
`

const EmptyDescription = styled.p`
  margin: 0;
  font-size: 15px;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#64748b'};
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
  border: 3px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9'};
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`

const LoadingText = styled.div`
  font-size: 15px;
  font-weight: 500;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#64748b'};
`
