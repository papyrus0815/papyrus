/**
 * 대륙 관리 페이지
 *
 * @description
 * 대륙 데이터의 CRUD 기능을 제공하는 페이지
 * - 대륙 목록 조회
 * - 대륙 등록/수정/삭제
 * - 대륙별 국가 통계 집계
 * - 데스크탑/모바일 반응형 UI
 */

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styled from 'styled-components'
import type { ContinentResponseDto } from '@/shared/api/continents'
import { ActionMenu } from '@/shared/ui/action-menu/action-menu'
import { Z_INDEX, OVERLAY_STYLES } from '@/shared/styles/z-index'
import { useThemeStore } from '@/shared/styles/theme.store'
import { useContinentPage } from './use-continent-page.hook'
import { ContinentForm } from './components/continent-form'

export default function ContinentsPage() {
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const {
    // Data
    continents,
    continentStats,
    isLoading,
    isError,
    error,

    // State
    showSidebar,
    editingContinent,
    isMobileListOpen,
    setIsMobileListOpen,

    // Mutations
    deleteMutation,

    // Handlers
    handleDelete,
    handleEdit,
    handleCreate,
    handleUpdate,
    handleCloseSidebar,
    handleOpenCreate,
  } = useContinentPage()

  if (isLoading) {
    return (
      <Wrap>
        <LoadingMessage>대륙 데이터를 불러오는 중...</LoadingMessage>
      </Wrap>
    )
  }

  if (isError) {
    return (
      <Wrap>
        <ErrorState>
          <ErrorIcon>⚠️</ErrorIcon>
          <ErrorTitle>데이터를 불러올 수 없습니다</ErrorTitle>
          <ErrorDesc>
            {error?.message || '알 수 없는 오류가 발생했습니다'}
          </ErrorDesc>
          <RetryButton onClick={() => window.location.reload()}>
            다시 시도
          </RetryButton>
        </ErrorState>
      </Wrap>
    )
  }

  const hasData = continents && continents.length > 0

  return (
    <>
      {/* Mobile List Overlay */}
      <AnimatePresence>
        {isMobileListOpen && (
          <>
            <MobileListOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileListOpen(false)}
            />
            <MobileListPane
              as={motion.div}
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info) => {
                if (info.offset.y > 150) {
                  setIsMobileListOpen(false)
                }
              }}
            >
              <MobileListHeader>
                <DragHandle />
                <MobileListTitleRow>
                  <MobileListTitle>대륙 목록</MobileListTitle>
                  <MobileListClose onClick={() => setIsMobileListOpen(false)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                        fill="currentColor"
                      />
                    </svg>
                  </MobileListClose>
                </MobileListTitleRow>
              </MobileListHeader>
              {hasData ? (
                <MobileListContent>
                  {continents.map((continent, index) => {
                    const stats = continentStats[continent.id]
                    return (
                      <MobileListItem
                        key={continent.id}
                        onClick={() => setIsMobileListOpen(false)}
                      >
                        <MobileListItemHeader>
                          <MobileListItemIndex>{index + 1}</MobileListItemIndex>
                          <MobileListItemName>
                            {continent.name}
                          </MobileListItemName>
                        </MobileListItemHeader>
                        <MobileListItemBody>
                          <MobileListItemInfo>
                            <span>영문:</span> {continent.enName || '-'}
                          </MobileListItemInfo>
                          <MobileListItemInfo>
                            <span>ISO:</span> {continent.isoCode || '-'}
                          </MobileListItemInfo>
                          <MobileListItemInfo>
                            <span>면적:</span>{' '}
                            {stats?.realArea
                              ? stats.realArea.toLocaleString()
                              : continent.areaSqKm
                                ? Number(continent.areaSqKm).toLocaleString()
                                : '-'}{' '}
                            km²
                          </MobileListItemInfo>
                          <MobileListItemInfo>
                            <span>인구:</span>{' '}
                            {stats?.realPopulation
                              ? stats.realPopulation.toLocaleString()
                              : continent.population
                                ? Number(continent.population).toLocaleString()
                                : '-'}
                          </MobileListItemInfo>
                          <MobileListItemInfo>
                            <span>국가:</span>{' '}
                            {stats?.realCountryCount !== undefined
                              ? stats.realCountryCount
                              : continent.countryCount || 0}
                            개
                          </MobileListItemInfo>
                        </MobileListItemBody>
                        <MobileListItemActions>
                          <MobileListActionButton
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(continent)
                              setIsMobileListOpen(false)
                            }}
                          >
                            ✏️ 수정
                          </MobileListActionButton>
                          <MobileListActionButton
                            $variant="danger"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(continent.id, continent.name)
                              setIsMobileListOpen(false)
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            🗑️ 삭제
                          </MobileListActionButton>
                        </MobileListItemActions>
                      </MobileListItem>
                    )
                  })}
                </MobileListContent>
              ) : (
                <MobileEmptyState>
                  <EmptyIcon>🌍</EmptyIcon>
                  <EmptyTitle>등록된 대륙이 없습니다</EmptyTitle>
                  <EmptyDesc>
                    새로운 대륙을 추가하여 데이터를 관리해보세요.
                  </EmptyDesc>
                </MobileEmptyState>
              )}
            </MobileListPane>
          </>
        )}
      </AnimatePresence>

      <Wrap
        as={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Header>
          <TitleSection>
            <Title>🌏 대륙 관리</Title>
            <Stats>총 {continents?.length || 0}개 대륙</Stats>
          </TitleSection>
          <AddButton onClick={handleOpenCreate}>
            <span>➕</span> 새 대륙 등록
          </AddButton>
        </Header>

        {hasData ? (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th style={{ width: '60px', textAlign: 'center' }}>No</Th>
                  <Th>대륙명</Th>
                  <Th>영문명</Th>
                  <Th>ISO 코드</Th>
                  <Th>면적 (km²)</Th>
                  <Th>인구</Th>
                  <Th>국가 수</Th>
                  <Th style={{ width: '80px', textAlign: 'center' }}>작업</Th>
                </tr>
              </thead>
              <tbody>
                {continents.map((continent, index) => {
                  const stats = continentStats[continent.id]
                  return (
                    <tr key={continent.id}>
                      <Td
                        style={{
                          textAlign: 'center',
                          color: isDark ? '#71717a' : '#999',
                        }}
                      >
                        {index + 1}
                      </Td>
                      <Td>
                        <ContinentName>{continent.name}</ContinentName>
                      </Td>
                      <Td>{continent.enName || '-'}</Td>
                      <Td>{continent.isoCode || '-'}</Td>
                      <Td>
                        <DataCell>
                          {stats?.realArea ? (
                            <>
                              <RealValue>
                                {stats.realArea.toLocaleString()}
                              </RealValue>
                              {continent.areaSqKm &&
                                Number(continent.areaSqKm) !==
                                  stats.realArea && (
                                  <DbValue
                                    title={`DB 저장값: ${Number(continent.areaSqKm).toLocaleString()}`}
                                  >
                                    (DB:{' '}
                                    {Number(
                                      continent.areaSqKm,
                                    ).toLocaleString()}
                                    )
                                  </DbValue>
                                )}
                            </>
                          ) : continent.areaSqKm ? (
                            Number(continent.areaSqKm).toLocaleString()
                          ) : (
                            '-'
                          )}
                        </DataCell>
                      </Td>
                      <Td>
                        <DataCell>
                          {stats?.realPopulation ? (
                            <>
                              <RealValue>
                                {stats.realPopulation.toLocaleString()}
                              </RealValue>
                              {continent.population &&
                                Number(continent.population) !==
                                  stats.realPopulation && (
                                  <DbValue
                                    title={`DB 저장값: ${Number(continent.population).toLocaleString()}`}
                                  >
                                    (DB:{' '}
                                    {Number(
                                      continent.population,
                                    ).toLocaleString()}
                                    )
                                  </DbValue>
                                )}
                            </>
                          ) : continent.population ? (
                            Number(continent.population).toLocaleString()
                          ) : (
                            '-'
                          )}
                        </DataCell>
                      </Td>
                      <Td>
                        <DataCell>
                          {stats?.realCountryCount !== undefined ? (
                            <>
                              <RealValue>{stats.realCountryCount}</RealValue>
                              {continent.countryCount &&
                                continent.countryCount !==
                                  stats.realCountryCount && (
                                  <DbValue
                                    title={`DB 저장값: ${continent.countryCount}`}
                                  >
                                    (DB: {continent.countryCount})
                                  </DbValue>
                                )}
                            </>
                          ) : (
                            continent.countryCount || 0
                          )}
                        </DataCell>
                      </Td>
                      <Td style={{ textAlign: 'center' }}>
                        <ActionMenu
                          items={[
                            {
                              id: 'edit',
                              label: '수정',
                              icon: '✏️',
                              onClick: () => handleEdit(continent),
                            },
                            {
                              id: 'delete',
                              label: '삭제',
                              icon: '🗑️',
                              onClick: () =>
                                handleDelete(continent.id, continent.name),
                              variant: 'danger',
                              disabled: deleteMutation.isPending,
                            },
                          ]}
                        />
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          </TableWrap>
        ) : (
          <EmptyState>
            <EmptyIcon>🌍</EmptyIcon>
            <EmptyTitle>등록된 대륙이 없습니다</EmptyTitle>
            <EmptyDesc>새로운 대륙을 추가하여 데이터를 관리해보세요.</EmptyDesc>
            <EmptyButton onClick={handleOpenCreate}>
              <span>➕</span> 첫 대륙 등록하기
            </EmptyButton>
          </EmptyState>
        )}
      </Wrap>

      {/* 우측 사이드바 */}
      <ContinentForm
        isOpen={showSidebar}
        initialData={editingContinent || undefined}
        onSubmit={editingContinent ? handleUpdate : handleCreate}
        onCancel={handleCloseSidebar}
      />
    </>
  )
}

// Styled Components
const Wrap = styled.div`
  width: 100%;
  min-height: 100vh;
  padding: 72px 24px 24px;
  background: ${({ theme }) => (theme.mode === 'dark' ? '#212121' : '#fff')};
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
`

const TitleSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const Title = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#1a1a1a')};
  letter-spacing: -0.5px;
`

const Stats = styled.div`
  font-size: 13px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#71717a' : '#999')};
  font-weight: 500;
`

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#1a1a1a')};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#212121' : '#fff')};
  border: 1.5px solid
    ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#e0e0e0')};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  span {
    font-size: 16px;
  }

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? '#f5f5f5' : '#1a1a1a'};
    background: ${({ theme }) => (theme.mode === 'dark' ? '#1d1d1d' : '#fafafa')};
  }

  &:active {
    transform: scale(0.98);
  }
`

const LoadingMessage = styled.div`
  text-align: center;
  padding: 80px 48px;
  font-size: 14px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#71717a' : '#999')};
`

const ErrorState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120px 48px;
  text-align: center;
`

const ErrorIcon = styled.div`
  font-size: 48px;
  margin-bottom: 24px;
  opacity: 0.5;
`

const ErrorTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#1a1a1a')};
  letter-spacing: -0.3px;
`

const ErrorDesc = styled.p`
  margin: 0 0 32px 0;
  font-size: 14px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#666')};
  max-width: 400px;
  line-height: 1.6;
`

const RetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: #1a1a1a;
  border: 1.5px solid #1a1a1a;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: #000;
    border-color: #000;
  }

  &:active {
    transform: scale(0.98);
  }
`

const TableWrap = styled.div`
  background: ${({ theme }) => (theme.mode === 'dark' ? '#212121' : '#fff')};
  border: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#e0e0e0')};
  border-radius: 12px;
  overflow: hidden;

  @media (max-width: 1024px) {
    display: none; /* 태블릿/모바일에서는 숨기고 MobileListPane 사용 */
  }
`

// Mobile List Styles
const MobileListOverlay = styled(motion.div)`
  display: none;

  @media (max-width: 1024px) {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${OVERLAY_STYLES.BACKGROUND};
    z-index: ${Z_INDEX.MODAL_OVERLAY};
    backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
  }
`

const MobileListPane = styled.div`
  display: none;

  @media (max-width: 1024px) {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${({ theme }) => (theme.mode === 'dark' ? '#212121' : '#fff')};
    border-radius: 20px 20px 0 0;
    z-index: 1004;
    overflow: hidden;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  }
`

const DragHandle = styled.div`
  width: 40px;
  height: 4px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
  border-radius: 2px;
  margin: 8px auto 4px;
  cursor: grab;
  transition: background 0.2s ease;

  &:active {
    cursor: grabbing;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
  }
`

const MobileListHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 20px 16px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? '#212121'
      : 'linear-gradient(180deg, #fafbfc 0%, #fff 100%)'};
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
`

const MobileListTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const MobileListTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#202124')};
  letter-spacing: -0.02em;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
`

const MobileListClose = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#70757a')};
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'};
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#202124')};
  }

  &:active {
    transform: scale(0.92);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`

const MobileListContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
`

const MobileListItem = styled.div`
  background: ${({ theme }) => (theme.mode === 'dark' ? '#212121' : '#fff')};
  border: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#e5e7eb')};
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.98);
  }
`

const MobileListItemHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#f0f0f0')};
`

const MobileListItemIndex = styled.div`
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary) 0%, #9146ff 100%);
  color: #fff;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
`

const MobileListItemName = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#202124')};
  flex: 1;
`

const MobileListItemBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const MobileListItemInfo = styled.div`
  font-size: 13px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#5f6368')};
  display: flex;
  gap: 8px;

  span {
    font-weight: 600;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#70757a')};
    min-width: 50px;
  }
`

const MobileListItemActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#f0f0f0')};
`

const MobileListActionButton = styled.button<{ $variant?: 'danger' }>`
  flex: 1;
  padding: 10px 16px;
  border: 1px solid
    ${(props) =>
      props.$variant === 'danger'
        ? '#ef4444'
        : props.theme.mode === 'dark'
          ? '#2a2a2a'
          : '#e5e7eb'};
  background: ${(props) =>
    props.$variant === 'danger'
      ? '#fef2f2'
      : props.theme.mode === 'dark'
        ? '#212121'
        : '#fff'};
  color: ${(props) =>
    props.$variant === 'danger'
      ? '#dc2626'
      : props.theme.mode === 'dark'
        ? '#f5f5f5'
        : '#202124'};
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${(props) =>
      props.$variant === 'danger'
        ? '#fee2e2'
        : props.theme.mode === 'dark'
          ? '#1d1d1d'
          : '#f9fafb'};
    border-color: ${(props) =>
      props.$variant === 'danger'
        ? '#dc2626'
        : props.theme.mode === 'dark'
          ? '#3f3f46'
          : '#d1d5db'};
  }

  &:active:not(:disabled) {
    transform: scale(0.96);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const MobileEmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`

const Th = styled.th`
  padding: 14px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#666')};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#e0e0e0')};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1d1d1d' : '#fafafa')};
`

const Td = styled.td`
  padding: 16px;
  font-size: 14px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#1a1a1a')};
  border-bottom: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#f0f0f0')};

  &:first-child {
    font-weight: 500;
  }
`

const ContinentName = styled.div`
  font-weight: 600;
`

const DataCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const RealValue = styled.div`
  font-weight: 500;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#1a1a1a')};
`

const DbValue = styled.div`
  font-size: 12px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#71717a' : '#999')};
  font-style: italic;
  cursor: help;

  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#666')};
  }
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120px 48px;
  text-align: center;
  margin-top: 24px;
`

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 24px;
  opacity: 0.3;
  filter: grayscale(100%);
`

const EmptyTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#1a1a1a')};
  letter-spacing: -0.3px;
`

const EmptyDesc = styled.p`
  margin: 0 0 32px 0;
  font-size: 14px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#666')};
  max-width: 320px;
  line-height: 1.6;
`

const EmptyButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#1a1a1a')};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#212121' : '#fff')};
  border: 1.5px solid
    ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#e0e0e0')};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  span {
    font-size: 16px;
  }

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? '#f5f5f5' : '#1a1a1a'};
    background: ${({ theme }) => (theme.mode === 'dark' ? '#1d1d1d' : '#fafafa')};
  }

  &:active {
    transform: scale(0.98);
  }
`
