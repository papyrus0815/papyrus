import { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiExternalLink, FiPlus, FiSearch } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import type { Ethnicity } from '@/shared/api/ethnicity'
import { ethnicityApi } from '@/shared/api/ethnicity'
import { getUploadImageUrl } from '@/shared/api/upload'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { AddButton, SectionTabHeader } from '@/shared/ui/section-page-layout'
import { SelectModal } from '@/shared/ui/select-modal/select-modal'
import { notify } from '@/shared/ui/toast'

import * as DashboardStyles from './country-detail-dashboard.styles'

export interface EthnicitySectionProps {
  /** 현대 국가 ID (있으면 해당 국가 구성 민족 조회·설정) */
  countryId?: string
  /** 역사적 국가 ID (있으면 해당 역사적 국가 구성 민족 조회·설정) */
  historicalCountryId?: string
}

type EthnicityFilterKey = 'all' | 'local' | 'documented' | 'thumbnail'

/**
 * 국가/역사적 국가별 구성 민족 섹션
 * - 4칸 헤어라인 KPI 요약 바 + 필터·검색 + 무박스 2열 헤어라인 원장 + 2열 빈 상태 스펙 원장
 */
export function EthnicitySection({
  countryId,
  historicalCountryId,
}: EthnicitySectionProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const entityId = countryId ?? historicalCountryId

  const [searchQuery, setSearchQuery] = useState('')
  const [filterKey, setFilterKey] = useState<EthnicityFilterKey>('all')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [modalSelectedIds, setModalSelectedIds] = useState<string[]>([])

  const scopedQueryKey = useMemo(
    () =>
      countryId
        ? (['ethnicities', 'by-country', countryId] as const)
        : (['ethnicities', 'by-historical-country', historicalCountryId ?? ''] as const),
    [countryId, historicalCountryId],
  )

  const { data: list = [], isLoading } = useQuery({
    queryKey: scopedQueryKey,
    queryFn: () =>
      countryId
        ? ethnicityApi.getAll({ countryId })
        : historicalCountryId
          ? ethnicityApi.getAll({ historicalCountryId })
          : Promise.resolve([]),
    enabled: Boolean(entityId),
  })

  const { data: allEthnicities = [] } = useQuery({
    queryKey: ['ethnicities', 'all'],
    queryFn: () => ethnicityApi.getAll(),
    enabled: editModalOpen,
    staleTime: 60_000,
  })

  const saveMutation = useMutation({
    mutationFn: async (nextEthnicityIds: string[]) => {
      if (countryId) {
        return ethnicityApi.setCountryEthnicities(countryId, nextEthnicityIds)
      }
      if (historicalCountryId) {
        return ethnicityApi.setHistoricalCountryEthnicities(
          historicalCountryId,
          nextEthnicityIds,
        )
      }
      return []
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ethnicities'] })
    },
  })

  const withLocalNameList = useMemo(
    () => list.filter((item) => Boolean(item.nameLocal?.trim())),
    [list],
  )
  const withDocOrParentList = useMemo(
    () =>
      list.filter(
        (item) => Boolean(item.description?.trim()) || Boolean(item.parent?.name),
      ),
    [list],
  )
  const withThumbnailList = useMemo(
    () => list.filter((item) => Boolean(item.thumbnailUrl)),
    [list],
  )

  const filteredList = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()
    return list.filter((item) => {
      if (filterKey === 'local' && !item.nameLocal?.trim()) return false
      if (
        filterKey === 'documented' &&
        !item.description?.trim() &&
        !item.parent?.name
      ) {
        return false
      }
      if (filterKey === 'thumbnail' && !item.thumbnailUrl) return false
      if (!keyword) return true
      return [
        item.name,
        item.nameLocal,
        item.description,
        item.parent?.name,
      ].some((field) => field?.toLowerCase().includes(keyword))
    })
  }, [list, filterKey, searchQuery])

  const openEditModal = () => {
    setModalSelectedIds(list.map((item) => item.id))
    setEditModalOpen(true)
  }

  const handleToggleEthnicity = (ethnicityId: string) => {
    setModalSelectedIds((prev) =>
      prev.includes(ethnicityId)
        ? prev.filter((existingId) => existingId !== ethnicityId)
        : [...prev, ethnicityId],
    )
  }

  const handleSaveEdit = async () => {
    if (!entityId) return
    try {
      await saveMutation.mutateAsync(modalSelectedIds)
      setEditModalOpen(false)
      notify.success('구성 민족 목록이 저장되었습니다.')
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : '저장에 실패했습니다.',
      )
    }
  }

  const handleUnlinkSingle = async (targetItem: Ethnicity) => {
    const confirmed = await confirm({
      title: '구성 민족 연결 해제',
      message: `'${targetItem.name}' 민족을 이 국가의 구성 민족 목록에서 연결 해제하시겠습니까? (민족 마스터 데이터 자체는 삭제되지 않습니다.)`,
      danger: true,
    })
    if (!confirmed) return
    try {
      const nextIds = list
        .filter((item) => item.id !== targetItem.id)
        .map((item) => item.id)
      await saveMutation.mutateAsync(nextIds)
      notify.success(`'${targetItem.name}' 연결이 해제되었습니다.`)
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : '연결 해제에 실패했습니다.',
      )
    }
  }

  const hasActiveFilter = filterKey !== 'all' || searchQuery.trim().length > 0

  if (!entityId) {
    return (
      <Root>
        <EmptyNotice>국가를 선택하면 구성 민족을 관리할 수 있습니다.</EmptyNotice>
      </Root>
    )
  }

  return (
    <Root>
      <SectionTabHeader
        variant="plain"
        title="구성 민족"
        description="이 국가에 거주·소속된 주요 민족 집단을 연결하고 관리합니다. 민족 마스터 데이터는 전체 민족 관리에서 등록·수정할 수 있습니다."
        rightSlot={
          <HeaderActions>
            <SecondaryBtn
              type="button"
              onClick={() => navigate(pathKeys.ethnicityTimeline())}
            >
              <FiExternalLink size={14} />
              민족 전체 관리
            </SecondaryBtn>
            <AddButton type="button" onClick={openEditModal}>
              <FiPlus size={14} />
              구성 민족 편집
            </AddButton>
          </HeaderActions>
        }
      />

      <DashboardStyles.SectionHeadlineStrip aria-label="구성 민족 요약 지표">
        <DashboardStyles.SectionHeadlineCell>
          <DashboardStyles.SectionHeadlineLabel>
            연결된 구성 민족
          </DashboardStyles.SectionHeadlineLabel>
          <DashboardStyles.SectionHeadlineValue $muted={list.length === 0}>
            {list.length > 0 ? (
              <>
                {list.length.toLocaleString('ko-KR')}
                <DashboardStyles.SectionHeadlineUnit>
                  개
                </DashboardStyles.SectionHeadlineUnit>
              </>
            ) : (
              '미등록'
            )}
          </DashboardStyles.SectionHeadlineValue>
          <DashboardStyles.SectionHeadlineSub>
            {list.length > 0
              ? '국가 소속·거주 주요 민족 집단'
              : '연결된 구성 민족 없음'}
          </DashboardStyles.SectionHeadlineSub>
        </DashboardStyles.SectionHeadlineCell>

        <DashboardStyles.SectionHeadlineCell>
          <DashboardStyles.SectionHeadlineLabel>
            현지·원어 표기
          </DashboardStyles.SectionHeadlineLabel>
          <DashboardStyles.SectionHeadlineValue
            $muted={withLocalNameList.length === 0}
          >
            {withLocalNameList.length > 0 ? (
              <>
                {withLocalNameList.length.toLocaleString('ko-KR')}
                <DashboardStyles.SectionHeadlineUnit>
                  개
                </DashboardStyles.SectionHeadlineUnit>
              </>
            ) : (
              '없음'
            )}
          </DashboardStyles.SectionHeadlineValue>
          <DashboardStyles.SectionHeadlineSub>
            {list.length > 0
              ? `전체의 ${Math.round((withLocalNameList.length / list.length) * 100)}% · 원어·한자·로마자 병기`
              : '현지 표기 데이터 대기'}
          </DashboardStyles.SectionHeadlineSub>
        </DashboardStyles.SectionHeadlineCell>

        <DashboardStyles.SectionHeadlineCell>
          <DashboardStyles.SectionHeadlineLabel>
            설명 · 계통 기록
          </DashboardStyles.SectionHeadlineLabel>
          <DashboardStyles.SectionHeadlineValue
            $muted={withDocOrParentList.length === 0}
          >
            {withDocOrParentList.length > 0 ? (
              <>
                {withDocOrParentList.length.toLocaleString('ko-KR')}
                <DashboardStyles.SectionHeadlineUnit>
                  개
                </DashboardStyles.SectionHeadlineUnit>
              </>
            ) : (
              '없음'
            )}
          </DashboardStyles.SectionHeadlineValue>
          <DashboardStyles.SectionHeadlineSub>
            {list.length > 0
              ? `역사·문화 서술 또는 상위 민족 계통 ${withDocOrParentList.length}/${list.length}개`
              : '민족 해설·상위 계통 미집계'}
          </DashboardStyles.SectionHeadlineSub>
        </DashboardStyles.SectionHeadlineCell>

        <DashboardStyles.SectionHeadlineCell>
          <DashboardStyles.SectionHeadlineLabel>
            대표 이미지 보유율
          </DashboardStyles.SectionHeadlineLabel>
          <DashboardStyles.SectionHeadlineValue
            $muted={withThumbnailList.length === 0}
          >
            {list.length > 0 ? (
              <>
                {Math.round((withThumbnailList.length / list.length) * 100)}
                <DashboardStyles.SectionHeadlineUnit>
                  %
                </DashboardStyles.SectionHeadlineUnit>
              </>
            ) : (
              '—'
            )}
          </DashboardStyles.SectionHeadlineValue>
          <DashboardStyles.SectionHeadlineSub>
            {list.length > 0
              ? `대표 썸네일 ${withThumbnailList.length}/${list.length}개`
              : '썸네일 이미지 미등록'}
          </DashboardStyles.SectionHeadlineSub>
        </DashboardStyles.SectionHeadlineCell>
      </DashboardStyles.SectionHeadlineStrip>

      {isLoading ? (
        <LoadingLine>구성 민족 목록을 불러오는 중…</LoadingLine>
      ) : list.length === 0 ? (
        <EmptySpecGrid>
          <EmptySpecCell>
            <EmptySpecTitle>
              1. 민족 마스터에서 구성 민족 선택·연결
            </EmptySpecTitle>
            <EmptySpecDesc>
              이미 등록된 민족 마스터 카탈로그에서 이 국가를 구성하는 주류 민족과 소수 민족을 복수로 선택해 즉시 연결할 수 있습니다.
            </EmptySpecDesc>
            <EmptySpecAction type="button" onClick={openEditModal}>
              + 구성 민족 편집 열기 →
            </EmptySpecAction>
          </EmptySpecCell>

          <EmptySpecCell>
            <EmptySpecTitle>
              2. 신규 민족 등록 및 계통·서술 관리
            </EmptySpecTitle>
            <EmptySpecDesc>
              민족 전체 관리 페이지에서 새로운 민족 명칭, 현지 표기, 상위 민족 계통, 역사·문화적 배경 설명을 등록한 뒤 국가와 연결하세요.
            </EmptySpecDesc>
            <EmptySpecAction
              type="button"
              onClick={() => navigate(pathKeys.ethnicityTimeline())}
            >
              민족 전체 관리로 이동 →
            </EmptySpecAction>
          </EmptySpecCell>
        </EmptySpecGrid>
      ) : (
        <>
          <Toolbar>
            <FilterChipRow role="tablist" aria-label="구성 민족 필터">
              <FilterChip
                type="button"
                role="tab"
                aria-selected={filterKey === 'all'}
                $active={filterKey === 'all'}
                onClick={() => setFilterKey('all')}
              >
                전체 <FilterChipCount>{list.length}</FilterChipCount>
              </FilterChip>
              <FilterChip
                type="button"
                role="tab"
                aria-selected={filterKey === 'local'}
                $active={filterKey === 'local'}
                onClick={() => setFilterKey('local')}
              >
                현지 표기 보유{' '}
                <FilterChipCount>{withLocalNameList.length}</FilterChipCount>
              </FilterChip>
              <FilterChip
                type="button"
                role="tab"
                aria-selected={filterKey === 'documented'}
                $active={filterKey === 'documented'}
                onClick={() => setFilterKey('documented')}
              >
                설명·계통 보유{' '}
                <FilterChipCount>{withDocOrParentList.length}</FilterChipCount>
              </FilterChip>
              <FilterChip
                type="button"
                role="tab"
                aria-selected={filterKey === 'thumbnail'}
                $active={filterKey === 'thumbnail'}
                onClick={() => setFilterKey('thumbnail')}
              >
                이미지 보유{' '}
                <FilterChipCount>{withThumbnailList.length}</FilterChipCount>
              </FilterChip>
            </FilterChipRow>

            <ToolbarRight>
              {hasActiveFilter && (
                <>
                  <FilterResultSummary>
                    검색 결과 {filteredList.length}개
                  </FilterResultSummary>
                  <FilterResetBtn
                    type="button"
                    onClick={() => {
                      setFilterKey('all')
                      setSearchQuery('')
                    }}
                  >
                    필터 초기화
                  </FilterResetBtn>
                </>
              )}
              <SearchBox>
                <FiSearch size={13} />
                <SearchInput
                  type="search"
                  value={searchQuery}
                  onChange={(changeEvent) =>
                    setSearchQuery(changeEvent.target.value)
                  }
                  placeholder="민족명 · 현지 표기 · 설명 검색…"
                  aria-label="구성 민족 검색"
                />
              </SearchBox>
            </ToolbarRight>
          </Toolbar>

          {filteredList.length === 0 ? (
            <NoMatchLine>
              선택한 필터나 검색어와 일치하는 구성 민족이 없습니다.
            </NoMatchLine>
          ) : (
            <LedgerGrid>
              {filteredList.map((item) => {
                const plainDesc = item.description
                  ? item.description.replace(/<[^>]+>/g, '').trim()
                  : ''
                return (
                  <LedgerRow key={item.id}>
                    <LedgerMain>
                      <AvatarThumb aria-hidden>
                        {item.thumbnailUrl ? (
                          <img
                            src={getUploadImageUrl(item.thumbnailUrl)}
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          <span>{item.name.trim().slice(0, 1)}</span>
                        )}
                      </AvatarThumb>
                      <MetaColumn>
                        <NameLine>
                          <EthnicityName>{item.name}</EthnicityName>
                          {item.nameLocal && (
                            <LocalNameBadge>{item.nameLocal}</LocalNameBadge>
                          )}
                          {item.parent?.name && (
                            <ParentLineageBadge>
                              상위: {item.parent.name}
                            </ParentLineageBadge>
                          )}
                        </NameLine>
                        <SubDesc $muted={!plainDesc}>
                          {plainDesc || '등록된 민족 설명이 없습니다.'}
                        </SubDesc>
                      </MetaColumn>
                    </LedgerMain>

                    <LedgerActions>
                      <RowActionBtn
                        type="button"
                        onClick={() => navigate(pathKeys.ethnicityTimeline())}
                      >
                        마스터 관리 →
                      </RowActionBtn>
                      <RowUnlinkBtn
                        type="button"
                        disabled={saveMutation.isPending}
                        onClick={() => {
                          void handleUnlinkSingle(item)
                        }}
                      >
                        연결 해제
                      </RowUnlinkBtn>
                    </LedgerActions>
                  </LedgerRow>
                )
              })}
            </LedgerGrid>
          )}
        </>
      )}

      <SelectModal
        isOpen={editModalOpen}
        onClose={() => !saveMutation.isPending && setEditModalOpen(false)}
        title="구성 민족 편집"
        options={allEthnicities.map((item) => ({
          value: item.id,
          label: item.nameLocal ? `${item.name} (${item.nameLocal})` : item.name,
        }))}
        multiple
        selectedValues={modalSelectedIds}
        onSelect={handleToggleEthnicity}
        headerExtra={
          <ModalHeaderActions>
            <ModalCancelBtn
              type="button"
              onClick={() => setEditModalOpen(false)}
              disabled={saveMutation.isPending}
            >
              취소
            </ModalCancelBtn>
            <ModalSaveBtn
              type="button"
              onClick={() => {
                void handleSaveEdit()
              }}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? '저장 중…' : '저장'}
            </ModalSaveBtn>
          </ModalHeaderActions>
        }
      />
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 28px 32px 48px;
  min-height: calc(100vh - 200px);
  width: 100%;
  min-width: 0;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 20px 16px 36px;
  }
`

const HeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const SecondaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.hover};
  }
`

const EmptyNotice = styled.p`
  margin: 0;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LoadingLine = styled.div`
  padding: 28px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EmptySpecGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const EmptySpecCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 20px 22px;

  &:first-child {
    border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  }

  @media (max-width: 768px) {
    &:first-child {
      border-right: none;
      border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
    }
  }
`

const EmptySpecTitle = styled.div`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptySpecDesc = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EmptySpecAction = styled.button`
  margin-top: 4px;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.hover};
  }
`

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const FilterChipRow = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

const FilterChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.light};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const FilterChipCount = styled.span`
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
`

const ToolbarRight = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const FilterResultSummary = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const FilterResetBtn = styled.button`
  padding: 4px 8px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const SearchBox = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: 240px;
  max-width: 100%;
  padding: 6px 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SearchInput = styled.input`
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const NoMatchLine = styled.div`
  padding: 24px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LedgerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const LedgerRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  transition: background 0.14s ease;

  &:nth-child(odd) {
    border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  }

  &:last-child:nth-child(odd) {
    grid-column: 1 / -1;
    border-right: none;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }

  @media (max-width: 900px) {
    &:nth-child(odd) {
      border-right: none;
    }
  }
`

const LedgerMain = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
`

const AvatarThumb = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  font-size: 14px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.secondary};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const MetaColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`

const NameLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const EthnicityName = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const LocalNameBadge = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const ParentLineageBadge = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.activeLight};
`

const SubDesc = styled.p<{ $muted?: boolean }>`
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: ${({ $muted, theme }) =>
    $muted ? theme.colors.text.tertiary : theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const LedgerActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

const RowActionBtn = styled.button`
  padding: 4px 8px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const RowUnlinkBtn = styled.button`
  padding: 4px 8px;
  border-radius: 5px;
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover:not(:disabled) {
    color: #dc2626;
    border-color: rgba(220, 38, 38, 0.35);
    background: rgba(220, 38, 38, 0.06);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ModalHeaderActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 0;
`

const ModalCancelBtn = styled.button`
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`

const ModalSaveBtn = styled.button`
  padding: 7px 16px;
  border-radius: 8px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`
