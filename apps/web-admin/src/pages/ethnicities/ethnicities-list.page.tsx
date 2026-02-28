import React, { useEffect, useState } from 'react'

import { motion } from 'framer-motion'
import { FiPlus, FiEdit2, FiTrash2, FiUsers } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

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
`
const Subtitle = styled.p`
  color: #64748b;
  font-size: 0.875rem;
  margin-bottom: 1.25rem;
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
  border: 1px solid #e5e7eb;
  min-width: 200px;
  font-size: 0.875rem;
`
const Btn = styled.button<{ $primary?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: ${(p) => (p.$primary ? '#6366f1' : '#fff')};
  color: ${(p) => (p.$primary ? '#fff' : '#374151')};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  &:hover {
    opacity: 0.9;
  }
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
  border: 1px solid #e5e7eb;
  background: ${(p) => (p.$selected ? '#eef2ff' : '#fff')};
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  &:hover {
    background: #f8fafc;
    border-color: #c7d2fe;
  }
`
const Thumb = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
`
const ItemContent = styled.div`
  flex: 1;
  min-width: 0;
`
const ItemName = styled.div`
  font-weight: 600;
  color: #0f172a;
  font-size: 0.9375rem;
`
const ItemMeta = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 2px;
`
const ItemActions = styled.div`
  display: flex;
  gap: 8px;
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

  useEffect(() => {
    load()
  }, [])

  const filtered = React.useMemo(() => {
    if (!search.trim()) return list
    const q = search.trim().toLowerCase()
    return list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.nameLocal?.toLowerCase().includes(q) ?? false),
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
        <p style={{ color: '#64748b', fontSize: 14 }}>불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            background: '#f8fafc',
            borderRadius: 16,
            color: '#64748b',
            fontSize: 14,
          }}
        >
          {search ? '검색 결과가 없습니다.' : '등록된 민족이 없습니다. 민족 추가로 등록하세요.'}
        </div>
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
                  <img
                    src={getUploadImageUrl(e.thumbnailUrl)}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  '👥'
                )}
              </Thumb>
              <ItemContent>
                <ItemName>{e.name}</ItemName>
                <ItemMeta>
                  {e.nameLocal && `${e.nameLocal} · `}
                  {e.parent ? `상위: ${e.parent.name}` : '—'}
                </ItemMeta>
              </ItemContent>
              <ItemActions>
                <Btn
                  type="button"
                  onClick={(ev) => handleEdit(e.id, ev)}
                  title="수정"
                >
                  <FiEdit2 size={16} />
                </Btn>
                <Btn
                  type="button"
                  onClick={(ev) => handleDelete(e.id, e.name, ev)}
                  title="삭제"
                  style={{ color: '#b91c1c', borderColor: '#fecaca' }}
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
