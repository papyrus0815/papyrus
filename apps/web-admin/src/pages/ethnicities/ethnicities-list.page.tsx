import React, { useEffect, useState } from 'react'

import { motion } from 'framer-motion'
import { FiPlus, FiEdit2, FiTrash2, FiUsers } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

import type { Ethnicity } from '@/shared/api/ethnicity'
import { ethnicityApi } from '@/shared/api/ethnicity'
import { getUploadImageUrl } from '@/shared/api/upload'

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
  color: ${({ theme }) => theme.mode === 'dark' ? '#f1f5f9' : '#0f172a'};
`

const Subtitle = styled.p`
  font-size: 0.875rem;
  margin-bottom: 1.25rem;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#64748b'};
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
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #f1f5f9;
    &::placeholder { color: #475569; }
    &:focus {
      outline: none;
      border-color: rgba(99, 102, 241, 0.5);
      background: rgba(255, 255, 255, 0.07);
    }
  ` : css`
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
  &:hover { opacity: 0.9; }
  ${({ theme, $primary, $danger }) => {
    if ($primary) return css`background: #6366f1; color: white; border: none;`
    if ($danger && theme.mode === 'dark') return css`
      background: rgba(248, 113, 113, 0.1);
      color: #f87171;
      border: 1px solid rgba(248, 113, 113, 0.25);
    `
    if (theme.mode === 'dark') return css`
      background: rgba(255, 255, 255, 0.06);
      color: #94a3b8;
      border: 1px solid rgba(255, 255, 255, 0.1);
      &:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }
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

const ListItem = styled.li<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
  ${({ theme, $selected }) => theme.mode === 'dark' ? css`
    background: ${$selected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.04)'};
    border: 1px solid ${$selected ? 'rgba(99, 102, 241, 0.35)' : 'rgba(255, 255, 255, 0.08)'};
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    &:hover {
      background: rgba(255, 255, 255, 0.07);
      border-color: rgba(255, 255, 255, 0.14);
    }
  ` : css`
    background: ${$selected ? '#eef2ff' : 'white'};
    border: 1px solid ${$selected ? '#c7d2fe' : '#e5e7eb'};
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
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
`

const ItemContent = styled.div`
  flex: 1;
  min-width: 0;
`

const ItemName = styled.div`
  font-weight: 600;
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f1f5f9' : '#0f172a'};
`

const ItemMeta = styled.div`
  font-size: 0.75rem;
  margin-top: 2px;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#64748b'};
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
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    color: #64748b;
  ` : css`
    background: #f8fafc;
    color: #64748b;
  `}
`

const LoadingText = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.mode === 'dark' ? '#475569' : '#64748b'};
`

export const EthnicitiesListPage: React.FC = () => {
  const navigate = useNavigate()
  const [list, setList] = useState<Ethnicity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    ethnicityApi
      .getAll()
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = React.useMemo(() => {
    if (!search.trim()) return list
    const q = search.trim().toLowerCase()
    return list.filter(
      (e) => e.name.toLowerCase().includes(q) || (e.nameLocal?.toLowerCase().includes(q) ?? false),
    )
  }, [list, search])

  const handleCreate = () => navigate('/ethnicities/new')
  const handleEdit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/ethnicities/${id}/edit`)
  }
  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`'${name}' 민족을 삭제하시겠습니까?`)) return
    try {
      await ethnicityApi.delete(id)
      if (selectedId === id) setSelectedId(null)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    }
  }

  return (
    <Page>
      <Title>
        <FiUsers size={24} />
        민족 관리
      </Title>
      <Subtitle>민족 마스터 데이터를 등록·수정·삭제합니다. 국가/역사적 국가 상세에서 구성 민족으로 연결할 수 있습니다.</Subtitle>

      <Toolbar>
        <SearchInput
          type="text"
          placeholder="민족명 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Btn $primary onClick={handleCreate}>
          <FiPlus size={18} />
          민족 추가
        </Btn>
      </Toolbar>

      {loading ? (
        <LoadingText>불러오는 중...</LoadingText>
      ) : filtered.length === 0 ? (
        <EmptyBox>
          {search ? '검색 결과가 없습니다.' : '등록된 민족이 없습니다. 민족 추가로 등록하세요.'}
        </EmptyBox>
      ) : (
        <List>
          {filtered.map((e, idx) => (
            <ListItem
              key={e.id}
              $selected={selectedId === e.id}
              onClick={() => setSelectedId(e.id)}
              as={motion.li}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
            >
              <Thumb>
                {e.thumbnailUrl ? (
                  <img src={getUploadImageUrl(e.thumbnailUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : '👥'}
              </Thumb>
              <ItemContent>
                <ItemName>{e.name}</ItemName>
                <ItemMeta>
                  {e.nameLocal && `${e.nameLocal} · `}
                  {e.parent ? `상위: ${e.parent.name}` : '—'}
                </ItemMeta>
              </ItemContent>
              <ItemActions>
                <Btn type="button" onClick={(ev) => handleEdit(e.id, ev)} title="수정">
                  <FiEdit2 size={16} />
                </Btn>
                <Btn type="button" $danger onClick={(ev) => handleDelete(e.id, e.name, ev)} title="삭제">
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
