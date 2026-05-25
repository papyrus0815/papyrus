import React, { useEffect, useState } from 'react'

import { motion } from 'framer-motion'
import { FiPlus, FiEdit2, FiTrash2, FiBriefcase } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

import type { Company, CompanyStatus } from '@/shared/api/company'
import { companyApi } from '@/shared/api/company'

const STATUS_LABEL: Record<CompanyStatus, string> = {
  ACTIVE: '활동 중',
  DISSOLVED: '해산',
  MERGED: '합병',
  SUSPENDED: '중단',
  OTHER: '기타',
}

const Page = styled.div`
  padding: 1.5rem 2rem;
  max-width: 1000px;
  margin: 0 auto;
`

const Title = styled.h1`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
`

const Subtitle = styled.p`
  font-size: 0.875rem;
  margin-bottom: 1.25rem;
  color: #64748b;
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`

const SearchInput = styled.input`
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  min-width: 200px;
  font-size: 0.875rem;
  transition: all 0.2s;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #f1f5f9;
          &::placeholder {
            color: #475569;
          }
          &:focus {
            outline: none;
            border-color: rgba(99, 102, 241, 0.5);
            background: rgba(255, 255, 255, 0.07);
          }
        `
      : css`
          background: white;
          border: 1px solid #e5e7eb;
          color: #0f172a;
          &:focus {
            outline: none;
            border-color: #6366f1;
          }
        `}
`

const Btn = styled.button<{ $primary?: boolean; $danger?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
  &:hover {
    opacity: 0.9;
  }
  ${({ theme, $primary, $danger }) => {
    if ($primary) return css`background: #6366f1; color: white; border: none;`
    if ($danger && theme.mode === 'dark')
      return css`
        background: rgba(248, 113, 113, 0.1);
        color: #f87171;
        border: 1px solid rgba(248, 113, 113, 0.25);
      `
    if (theme.mode === 'dark')
      return css`
        background: rgba(255, 255, 255, 0.06);
        color: #94a3b8;
        border: 1px solid rgba(255, 255, 255, 0.1);
        &:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #e2e8f0;
        }
      `
    return css`
      background: white;
      color: ${$danger ? '#b91c1c' : '#374151'};
      border: 1px solid ${$danger ? '#fecaca' : '#e5e7eb'};
    `
  }}
`

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const ListItem = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  transition: all 0.15s;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          &:hover {
            background: rgba(255, 255, 255, 0.07);
            border-color: rgba(255, 255, 255, 0.14);
          }
        `
      : css`
          background: white;
          border: 1px solid #e5e7eb;
          &:hover {
            background: #f8fafc;
            border-color: #c7d2fe;
          }
        `}
`

const Thumb = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
`

const ItemContent = styled.div`
  flex: 1;
  min-width: 0;
`

const ItemName = styled.div`
  font-weight: 600;
  font-size: 0.9375rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
`

const StatusChip = styled.span<{ $status: CompanyStatus | null }>`
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 999px;
  ${({ $status }) =>
    $status === 'ACTIVE'
      ? css`
          background: rgba(34, 197, 94, 0.15);
          color: #16a34a;
        `
      : css`
          background: rgba(148, 163, 184, 0.2);
          color: #64748b;
        `}
`

const ItemMeta = styled.div`
  font-size: 0.75rem;
  margin-top: 2px;
  color: #64748b;
`

const ItemActions = styled.div`
  display: flex;
  gap: 8px;
`

const EmptyBox = styled.div`
  padding: 48px;
  text-align: center;
  border-radius: 16px;
  font-size: 14px;
  color: #64748b;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
        `
      : css`
          background: #f8fafc;
        `}
`

const LoadingText = styled.p`
  font-size: 14px;
  color: #64748b;
`

export const CompaniesListPage: React.FC = () => {
  const navigate = useNavigate()
  const [list, setList] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = () => {
    setLoading(true)
    companyApi
      .getAll()
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = React.useMemo(() => {
    if (!search.trim()) return list
    const q = search.trim().toLowerCase()
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.shortName?.toLowerCase().includes(q) ?? false) ||
        (c.localName?.toLowerCase().includes(q) ?? false),
    )
  }, [list, search])

  const handleCreate = () => navigate('/companies/new')
  const handleEdit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/companies/${id}/edit`)
  }
  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`'${name}' 기업을 삭제하시겠습니까?`)) return
    try {
      await companyApi.delete(id)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    }
  }

  return (
    <Page>
      <Title>
        <FiBriefcase size={24} />
        기업 관리
      </Title>
      <Subtitle>
        기업 마스터 데이터를 등록·수정·삭제합니다. 국가·창립자·조직 등과 연결할 수
        있습니다.
      </Subtitle>

      <Toolbar>
        <SearchInput
          type="text"
          placeholder="기업명·약칭 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Btn $primary onClick={handleCreate}>
          <FiPlus size={18} />
          기업 추가
        </Btn>
      </Toolbar>

      {loading ? (
        <LoadingText>불러오는 중...</LoadingText>
      ) : filtered.length === 0 ? (
        <EmptyBox>
          {search
            ? '검색 결과가 없습니다.'
            : '등록된 기업이 없습니다. 기업 추가로 등록하세요.'}
        </EmptyBox>
      ) : (
        <List>
          {filtered.map((c, idx) => (
            <ListItem
              key={c.id}
              as={motion.li}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
            >
              <Thumb>
                {c.logoUrl ? (
                  <img
                    src={c.logoUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  '🏢'
                )}
              </Thumb>
              <ItemContent>
                <ItemName>
                  {c.name}
                  {c.shortName && <span style={{ color: '#94a3b8', fontWeight: 400 }}>({c.shortName})</span>}
                  {c.status && <StatusChip $status={c.status}>{STATUS_LABEL[c.status]}</StatusChip>}
                </ItemName>
                <ItemMeta>
                  {[
                    c.country?.name ?? c.historicalCountry?.name,
                    c.foundedAt ? `설립 ${c.foundedAt.slice(0, 10)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </ItemMeta>
              </ItemContent>
              <ItemActions>
                <Btn type="button" onClick={(ev) => handleEdit(c.id, ev)} title="수정">
                  <FiEdit2 size={16} />
                </Btn>
                <Btn
                  type="button"
                  $danger
                  onClick={(ev) => handleDelete(c.id, c.name, ev)}
                  title="삭제"
                >
                  <FiTrash2 size={16} />
                </Btn>
              </ItemActions>
            </ListItem>
          ))}
        </List>
      )}
    </Page>
  )
}
