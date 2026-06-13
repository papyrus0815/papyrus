import React, { useEffect, useState } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiGlobe, FiBriefcase, FiAward, FiX, FiChevronRight } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

import { apiConnection } from '@/shared/api/client'
import type { OrganizationResponseDto, OrganizationType } from '@/shared/api/organizations'
import {
  getOrganizations,
  getOrganizationsTree,
  deleteOrganization,
  updateOrganization,
} from '@/shared/api/organizations'
import { getAllCountries } from '@/shared/api/countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import { PositionDefinitionsSection } from '@/widgets/country/country-detail/ui/position-definitions-section.widget'

const ORGANIZATION_TYPE_LABEL: Record<OrganizationType, string> = {
  POLITICAL_PARTY: '정당',
  INTERGOVERNMENTAL_ORG: '국제기구',
  NGO: 'NGO',
  TRADE_UNION: '노동조합',
  GOVERNMENT_AGENCY: '정부기관/행정기구',
  MILITARY_ALLIANCE: '군사동맹',
  RELIGIOUS_ORG: '종교단체',
  BUSINESS_ASSOCIATION: '업계단체',
  EDUCATION: '교육기관',
  MILITARY_ACADEMY: '군사교육기관',
  COMPANY: '기업',
  OTHER: '기타',
}

const ORGANIZATION_TYPE_COLOR: Partial<Record<OrganizationType, { bg: string; color: string }>> = {
  GOVERNMENT_AGENCY: { bg: '#eff6ff', color: '#1d4ed8' },
  POLITICAL_PARTY: { bg: '#fef3c7', color: '#92400e' },
  MILITARY_ALLIANCE: { bg: '#fce7f3', color: '#9d174d' },
  INTERGOVERNMENTAL_ORG: { bg: '#ecfdf5', color: '#065f46' },
  COMPANY: { bg: '#f5f3ff', color: '#5b21b6' },
}

// ───────────────────────── Styled Components ─────────────────────────

const Layout = styled.div`
  display: flex;
  /* 고정 헤더 아래로 내려 겹침 방지 */
  margin-top: var(--header-height, 64px);
  height: calc(100vh - var(--header-height, 64px));
  min-height: 0;
  overflow: hidden;
`

const ListPanel = styled.div<{ hasDetail: boolean }>`
  flex: ${(p) => (p.hasDetail ? '0 0 480px' : '1')};
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-right: ${(p) =>
    p.hasDetail
      ? `1px solid ${p.theme.colors.border.default}`
      : 'none'};
  overflow: hidden;
  transition: flex 0.25s ease;
`

const DetailPanel = styled.div<{ open: boolean }>`
  flex: 1;
  min-width: 0;
  display: ${(p) => (p.open ? 'flex' : 'none')};
  flex-direction: column;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background.secondary};
`

const PanelHeader = styled.div`
  padding: 20px 24px 16px;
  background: ${({ theme }) => theme.colors.background.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
`

const PanelTitle = styled.h1`
  font-size: 17px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`

const Toolbar = styled.div`
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.background.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  flex-shrink: 0;
`

const Select = styled.select`
  padding: 7px 10px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  font-size: 13px;
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  min-width: 130px;
  cursor: pointer;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
  option {
    background: ${({ theme }) => theme.colors.background.primary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const IconBtn = styled.button`
  padding: 7px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition:
    background 0.18s,
    color 0.18s,
    border-color 0.18s;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
`

const PrimaryBtn = styled(IconBtn)`
  border: none;
  background: ${({ theme }) => theme.colors.gradient.primary};
  color: ${({ theme }) => theme.colors.button.text};
  box-shadow: 0 4px 14px ${({ theme }) => theme.colors.shadow.md};
  &:hover {
    color: ${({ theme }) => theme.colors.button.text};
    box-shadow: 0 6px 18px ${({ theme }) => theme.colors.shadow.lg};
  }
`

const CardList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const OrgCard = styled.div<{ selected?: boolean }>`
  background: ${(p) =>
    p.selected ? p.theme.colors.activeLight : p.theme.colors.background.primary};
  border: 1.5px solid
    ${(p) => (p.selected ? p.theme.colors.primary : p.theme.colors.border.default)};
  border-radius: 14px;
  padding: 14px 16px;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    border-color 0.15s ease;
  display: flex;
  align-items: center;
  gap: 12px;
  &:hover {
    transform: translateY(-1px);
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 8px 22px ${({ theme }) => theme.colors.shadow.md};
  }
`

const OrgCardIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 18px;
`

const OrgCardContent = styled.div`
  flex: 1;
  min-width: 0;
`

const OrgCardName = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const OrgCardMeta = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TypeBadge = styled.span<{ $bg?: string; $color?: string }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: ${(p) => p.$bg ?? p.theme.colors.background.tertiary};
  color: ${(p) => p.$color ?? p.theme.colors.text.secondary};
  flex-shrink: 0;
`

const ChevronIcon = styled.div<{ selected?: boolean }>`
  color: ${(p) =>
    p.selected ? p.theme.colors.primary : p.theme.colors.text.tertiary};
  flex-shrink: 0;
  transition: color 0.15s;
`

// Detail panel
const DetailHeader = styled.div`
  padding: 20px 24px 16px;
  background: ${({ theme }) => theme.colors.background.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
`

const DetailTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 4px;
`

const DetailSubtitle = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  gap: 6px;
`

const CloseBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition:
    background 0.18s,
    color 0.18s;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const DetailTabBar = styled.div`
  display: flex;
  padding: 0 24px;
  background: ${({ theme }) => theme.colors.background.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
  flex-shrink: 0;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  &::-webkit-scrollbar {
    height: 5px;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.border.medium};
  }
`

const DetailTabBtn = styled.button<{ $active?: boolean }>`
  flex: 0 0 auto;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? 700 : 500)};
  color: ${(p) =>
    p.$active ? p.theme.colors.primary : p.theme.colors.text.secondary};
  background: transparent;
  border: none;
  border-bottom: 2px solid
    ${(p) => (p.$active ? p.theme.colors.primary : 'transparent')};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  transition: all 0.15s;
  &:hover {
    color: ${(p) =>
      p.$active ? p.theme.colors.primary : p.theme.colors.text.primary};
  }
`

const DetailBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
`

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const FormLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const detailFieldStyles = css`
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.primary};
  transition:
    border-color 0.18s,
    box-shadow 0.18s;
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.25)'
          : 'rgba(99, 102, 241, 0.15)'};
  }
`

const FormInput = styled.input`
  ${detailFieldStyles}
`

const FormTextarea = styled.textarea`
  ${detailFieldStyles}
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
`

const SaveBtn = styled.button`
  padding: 0.6rem 1.25rem;
  border-radius: 12px;
  border: none;
  background: ${({ theme }) => theme.colors.gradient.primary};
  color: ${({ theme }) => theme.colors.button.text};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 20px;
  box-shadow: 0 4px 14px ${({ theme }) => theme.colors.shadow.md};
  transition:
    box-shadow 0.18s,
    transform 0.12s;
  &:hover {
    box-shadow: 0 6px 18px ${({ theme }) => theme.colors.shadow.lg};
  }
  &:active {
    transform: scale(0.97);
  }
`

const DeleteBtn = styled.button`
  padding: 0.6rem 1.25rem;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.alert.danger.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.error};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 20px;
  margin-left: 8px;
  transition: background 0.18s;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(248,113,113,0.12)' : 'rgba(239,68,68,0.06)'};
  }
`

const TreeRow = styled.div`
  padding: 4px 0 4px 8px;
  border-left: 2px solid ${({ theme }) => theme.colors.border.default};
`

const TreeName = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TreeMeta = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-left: 6px;
`

// ───────────────────────── Component ─────────────────────────

export const OrganizationsListPage: React.FC = () => {
  const navigate = useNavigate()
  const playClickSound = useClickSound()
  const [list, setList] = useState<OrganizationResponseDto[]>([])
  const [tree, setTree] = useState<any[]>([])
  const [countries, setCountries] = useState<CountryResponseDto[]>([])
  const [historicalCountries, setHistoricalCountries] = useState<
    HistoricalCountryResponseDto[]
  >([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list')
  const [filterCountryId, setFilterCountryId] = useState('')
  const [filterHistoricalCountryId, setFilterHistoricalCountryId] = useState('')
  const [filterType, setFilterType] = useState<OrganizationType | ''>('')

  // 선택된 조직 & 상세 패널 탭
  const [selectedOrg, setSelectedOrg] = useState<OrganizationResponseDto | null>(null)
  const [detailTab, setDetailTab] = useState<'edit' | 'positions'>('edit')

  // 수정 폼
  const [editForm, setEditForm] = useState({
    name: '',
    shortName: '',
    description: '',
    logoUrl: '',
  })

  const load = async () => {
    setLoading(true)
    try {
      const [c, h] = await Promise.all([
        getAllCountries(),
        getAllHistoricalCountries(),
      ])
      setCountries(c)
      setHistoricalCountries(h)
    } catch {
      // ignore
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const loadOrganizations = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (filterCountryId) params.countryId = filterCountryId
      if (filterHistoricalCountryId)
        params.historicalCountryId = filterHistoricalCountryId
      if (filterType) params.type = filterType
      const [listRes, treeRes] = await Promise.all([
        getOrganizations(apiConnection, params),
        getOrganizationsTree(apiConnection, params),
      ])
      setList(listRes)
      setTree(treeRes)
    } catch {
      setList([])
      setTree([])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadOrganizations()
  }, [filterCountryId, filterHistoricalCountryId, filterType])

  const openDetail = (org: OrganizationResponseDto, tab: 'edit' | 'positions' = 'edit') => {
    setSelectedOrg(org)
    setDetailTab(tab)
    setEditForm({
      name: org.name,
      shortName: org.shortName ?? '',
      description: org.description ?? '',
      logoUrl: org.logoUrl ?? '',
    })
    playClickSound()
  }

  const handleDelete = async (id: string, name: string) => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message: `"${name}" 조직을 삭제하시겠습니까?`,
        danger: true,
      }))
    )
      return
    playClickSound()
    try {
      await deleteOrganization(apiConnection, id)
      if (selectedOrg?.id === id) setSelectedOrg(null)
      loadOrganizations()
    } catch {
      notify.error('삭제 실패')
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedOrg) return
    try {
      const updated = await updateOrganization(apiConnection, selectedOrg.id, {
        name: editForm.name.trim() || undefined,
        shortName: editForm.shortName.trim() || null,
        description: editForm.description.trim() || null,
        logoUrl: editForm.logoUrl.trim() || null,
        type: selectedOrg.type,
      })
      setSelectedOrg(updated)
      loadOrganizations()
      notify.success('저장되었습니다.')
    } catch {
      notify.error('저장에 실패했습니다.')
    }
  }

  const renderTreeNode = (node: any, depth = 0) => (
    <TreeRow key={node.id} style={{ marginLeft: depth * 16 }}>
      <TreeName>{node.name}</TreeName>
      <TreeMeta>
        {ORGANIZATION_TYPE_LABEL[node.type as OrganizationType] ?? node.type} ·{' '}
        {node.countryId || node.historicalCountryId ? '소속 있음' : '-'}
      </TreeMeta>
      {node.children?.length > 0 &&
        node.children.map((c: any) => renderTreeNode(c, depth + 1))}
    </TreeRow>
  )

  const getCountryName = (org: OrganizationResponseDto) => {
    if (org.countryId) return countries.find((c) => c.id === org.countryId)?.name ?? org.countryId
    if (org.historicalCountryId) return historicalCountries.find((c) => c.id === org.historicalCountryId)?.name ?? org.historicalCountryId
    return null
  }

  return (
    <Layout>
      {/* ─── 좌측 목록 패널 ─── */}
      <ListPanel hasDetail={!!selectedOrg}>
        <PanelHeader>
          <PanelTitle>
            <FiBriefcase size={20} />
            행정기구 · 조직
          </PanelTitle>
          <PrimaryBtn
            type="button"
            onClick={() => { playClickSound(); navigate('/organizations/new') }}
          >
            <FiPlus size={15} />
            등록
          </PrimaryBtn>
        </PanelHeader>

        <Toolbar>
          <Select
            value={filterCountryId}
            onChange={(e) => setFilterCountryId(e.target.value)}
          >
            <option value="">현대 국가 전체</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Select
            value={filterHistoricalCountryId}
            onChange={(e) => setFilterHistoricalCountryId(e.target.value)}
          >
            <option value="">역사적 국가 전체</option>
            {historicalCountries.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Select
            value={filterType}
            onChange={(e) => setFilterType((e.target.value as OrganizationType) || '')}
          >
            <option value="">유형 전체</option>
            {(Object.keys(ORGANIZATION_TYPE_LABEL) as OrganizationType[]).map((t) => (
              <option key={t} value={t}>{ORGANIZATION_TYPE_LABEL[t]}</option>
            ))}
          </Select>
          <IconBtn
            type="button"
            onClick={() => { setViewMode(viewMode === 'list' ? 'tree' : 'list'); playClickSound() }}
          >
            {viewMode === 'list' ? '계층 보기' : '목록 보기'}
          </IconBtn>
        </Toolbar>

        {loading ? (
          <div style={{ padding: 24, color: '#64748b', fontSize: 14 }}>로딩 중...</div>
        ) : viewMode === 'tree' ? (
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
            {tree.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: 14 }}>조직이 없습니다.</p>
            ) : (
              tree.map((node) => renderTreeNode(node))
            )}
          </div>
        ) : (
          <CardList>
            {list.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                조직이 없습니다. 필터를 바꾸거나 새로 등록해 보세요.
              </div>
            ) : (
              list.map((org) => {
                const typeStyle = ORGANIZATION_TYPE_COLOR[org.type]
                const countryName = getCountryName(org)
                return (
                  <OrgCard
                    key={org.id}
                    selected={selectedOrg?.id === org.id}
                    onClick={() => openDetail(org)}
                  >
                    <OrgCardIcon>
                      <FiBriefcase />
                    </OrgCardIcon>
                    <OrgCardContent>
                      <OrgCardName>
                        {org.name}
                        {org.shortName && (
                          <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 6, fontSize: 12 }}>
                            ({org.shortName})
                          </span>
                        )}
                      </OrgCardName>
                      <OrgCardMeta>
                        {countryName && <span>{countryName} · </span>}
                        {org.description
                          ? org.description.slice(0, 40) + (org.description.length > 40 ? '…' : '')
                          : '설명 없음'}
                      </OrgCardMeta>
                    </OrgCardContent>
                    <TypeBadge $bg={typeStyle?.bg} $color={typeStyle?.color}>
                      {ORGANIZATION_TYPE_LABEL[org.type] ?? org.type}
                    </TypeBadge>
                    <ChevronIcon selected={selectedOrg?.id === org.id}>
                      <FiChevronRight size={16} />
                    </ChevronIcon>
                  </OrgCard>
                )
              })
            )}
          </CardList>
        )}
      </ListPanel>

      {/* ─── 우측 상세 패널 ─── */}
      <DetailPanel open={!!selectedOrg}>
        {selectedOrg && (
          <>
            <DetailHeader>
              <div>
                <DetailTitle>{selectedOrg.name}</DetailTitle>
                <DetailSubtitle>
                  <TypeBadge
                    $bg={ORGANIZATION_TYPE_COLOR[selectedOrg.type]?.bg}
                    $color={ORGANIZATION_TYPE_COLOR[selectedOrg.type]?.color}
                  >
                    {ORGANIZATION_TYPE_LABEL[selectedOrg.type] ?? selectedOrg.type}
                  </TypeBadge>
                  {getCountryName(selectedOrg) && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FiGlobe size={12} />
                      {getCountryName(selectedOrg)}
                    </span>
                  )}
                </DetailSubtitle>
              </div>
              <CloseBtn type="button" onClick={() => setSelectedOrg(null)}>
                <FiX size={16} />
              </CloseBtn>
            </DetailHeader>

            <DetailTabBar>
              <DetailTabBtn
                $active={detailTab === 'edit'}
                onClick={() => setDetailTab('edit')}
              >
                <FiEdit2 size={13} />
                기본 정보 수정
              </DetailTabBtn>
              <DetailTabBtn
                $active={detailTab === 'positions'}
                onClick={() => setDetailTab('positions')}
              >
                <FiAward size={13} />
                직위 설정
              </DetailTabBtn>
            </DetailTabBar>

            <DetailBody>
              {detailTab === 'edit' && (
                <>
                  <FormGrid>
                    <FormField style={{ gridColumn: 'span 2' }}>
                      <FormLabel>조직명 *</FormLabel>
                      <FormInput
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="조직명"
                      />
                    </FormField>
                    <FormField>
                      <FormLabel>약칭</FormLabel>
                      <FormInput
                        value={editForm.shortName}
                        onChange={(e) => setEditForm({ ...editForm, shortName: e.target.value })}
                        placeholder="약칭 (선택)"
                      />
                    </FormField>
                    <FormField>
                      <FormLabel>로고 URL</FormLabel>
                      <FormInput
                        value={editForm.logoUrl}
                        onChange={(e) => setEditForm({ ...editForm, logoUrl: e.target.value })}
                        placeholder="이미지 URL (선택)"
                      />
                    </FormField>
                    <FormField style={{ gridColumn: 'span 2' }}>
                      <FormLabel>설명</FormLabel>
                      <FormTextarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="조직 설명 (선택)"
                      />
                    </FormField>
                  </FormGrid>
                  <div style={{ display: 'flex', marginTop: 20, gap: 8 }}>
                    <SaveBtn type="button" onClick={handleSaveEdit}>
                      저장
                    </SaveBtn>
                    <IconBtn
                      type="button"
                      onClick={() => { playClickSound(); navigate(`/organizations/${selectedOrg.id}/edit`) }}
                    >
                      상세 편집
                    </IconBtn>
                    <DeleteBtn
                      type="button"
                      onClick={() => handleDelete(selectedOrg.id, selectedOrg.name)}
                    >
                      <FiTrash2 size={13} />
                      삭제
                    </DeleteBtn>
                  </div>
                </>
              )}

              {detailTab === 'positions' && (
                <PositionDefinitionsSection
                  fixedOrganizationId={selectedOrg.id}
                  fixedOrganizationName={
                    selectedOrg.shortName
                      ? `${selectedOrg.name} (${selectedOrg.shortName})`
                      : selectedOrg.name
                  }
                />
              )}
            </DetailBody>
          </>
        )}
      </DetailPanel>
    </Layout>
  )
}
