import React, { useEffect, useState } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiGlobe, FiBriefcase } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { apiConnection } from '@/shared/api/client'
import type { OrganizationResponseDto, OrganizationType } from '@/shared/api/organizations'
import {
  getOrganizations,
  getOrganizationsTree,
  deleteOrganization,
} from '@/shared/api/organizations'
import { getAllCountries } from '@/shared/api/countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'

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

const Page = styled.div`
  padding: 1.5rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
`
const Title = styled.h1`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`
const Toolbar = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`
const Select = styled.select`
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #ddd;
  min-width: 160px;
`
const Btn = styled.button<{ primary?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 1px solid #ddd;
  background: ${(p) => (p.primary ? 'var(--color-primary, #2563eb)' : '#fff')};
  color: ${(p) => (p.primary ? '#fff' : '#333')};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  &:hover {
    opacity: 0.9;
  }
`
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  th,
  td {
    padding: 0.6rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid #eee;
  }
  th {
    font-weight: 600;
    background: #f8f9fa;
  }
  tr:hover td {
    background: #f8f9fa;
  }
`
const TreeView = styled.div`
  margin-top: 1rem;
  .node {
    margin-left: 1.5rem;
    padding: 0.25rem 0;
    border-left: 2px solid #e0e0e0;
    padding-left: 0.5rem;
  }
  .node-name {
    font-weight: 500;
  }
  .node-meta {
    font-size: 0.85rem;
    color: #666;
    margin-left: 0.5rem;
  }
`

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

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`"${name}" 조직을 삭제하시겠습니까?`)) return
    playClickSound()
    try {
      await deleteOrganization(apiConnection, id)
      loadOrganizations()
    } catch {
      alert('삭제 실패')
    }
  }

  const renderTreeNode = (node: any, depth = 0) => (
    <div key={node.id} className="node" style={{ marginLeft: depth * 16 }}>
      <span className="node-name">{node.name}</span>
      <span className="node-meta">
        {ORGANIZATION_TYPE_LABEL[node.type as OrganizationType] ?? node.type} ·{' '}
        {node.countryId || node.historicalCountryId ? '소속 있음' : '-'}
      </span>
      {node.children?.length > 0 &&
        node.children.map((c: any) => renderTreeNode(c, depth + 1))}
    </div>
  )

  return (
    <Page>
      <Title>
        <FiBriefcase size={22} />
        행정기구 · 조직
      </Title>
      <Toolbar>
        <Select
          value={filterCountryId}
          onChange={(e) => setFilterCountryId(e.target.value)}
        >
          <option value="">현대 국가 전체</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          value={filterHistoricalCountryId}
          onChange={(e) => setFilterHistoricalCountryId(e.target.value)}
        >
          <option value="">역사적 국가 전체</option>
          {historicalCountries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          value={filterType}
          onChange={(e) => setFilterType((e.target.value as OrganizationType) || '')}
        >
          <option value="">유형 전체</option>
          {(Object.keys(ORGANIZATION_TYPE_LABEL) as OrganizationType[]).map(
            (t) => (
              <option key={t} value={t}>
                {ORGANIZATION_TYPE_LABEL[t]}
              </option>
            ),
          )}
        </Select>
        <Btn
          type="button"
          onClick={() => {
            setViewMode(viewMode === 'list' ? 'tree' : 'list')
            playClickSound()
          }}
        >
          {viewMode === 'list' ? '계층 보기' : '목록 보기'}
        </Btn>
        <Btn
          primary
          type="button"
          onClick={() => {
            playClickSound()
            navigate('/organizations/new')
          }}
        >
          <FiPlus size={16} />
          조직 등록
        </Btn>
      </Toolbar>
      {loading ? (
        <p>로딩 중...</p>
      ) : viewMode === 'tree' ? (
        <TreeView>
          {tree.length === 0 ? (
            <p>조직이 없습니다. 필터를 바꾸거나 새로 등록해 보세요.</p>
          ) : (
            tree.map((node) => renderTreeNode(node))
          )}
        </TreeView>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>이름</th>
              <th>유형</th>
              <th>소속 국가</th>
              <th>설명</th>
              <th style={{ width: 120 }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5}>조직이 없습니다.</td>
              </tr>
            ) : (
              list.map((org) => (
                <tr key={org.id}>
                  <td>
                    <strong>{org.name}</strong>
                    {org.shortName && (
                      <span style={{ color: '#666', marginLeft: 6 }}>
                        ({org.shortName})
                      </span>
                    )}
                  </td>
                  <td>
                    {ORGANIZATION_TYPE_LABEL[org.type] ?? org.type}
                  </td>
                  <td>
                    {org.countryId
                      ? countries.find((c) => c.id === org.countryId)?.name ??
                        org.countryId
                      : org.historicalCountryId
                        ? historicalCountries.find(
                            (c) => c.id === org.historicalCountryId,
                          )?.name ?? org.historicalCountryId
                        : '-'}
                  </td>
                  <td>
                    {org.description
                      ? org.description.slice(0, 60) +
                        (org.description.length > 60 ? '…' : '')
                      : '-'}
                  </td>
                  <td>
                    <Btn
                      type="button"
                      onClick={() => {
                        playClickSound()
                        navigate(`/organizations/${org.id}/edit`)
                      }}
                    >
                      <FiEdit2 size={14} />
                      수정
                    </Btn>
                    <Btn
                      type="button"
                      onClick={() => handleDelete(org.id, org.name)}
                    >
                      <FiTrash2 size={14} />
                      삭제
                    </Btn>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}
    </Page>
  )
}
