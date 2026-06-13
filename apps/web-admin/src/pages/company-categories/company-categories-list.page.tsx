import React, { useEffect, useState } from 'react'

import { motion } from 'framer-motion'
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiTag,
  FiArrowLeft,
  FiSearch,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

import type { CompanyCategory } from '@/shared/api/company-category'
import { companyCategoryApi } from '@/shared/api/company-category'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'

const Page = styled.div`
  padding: calc(var(--header-height, 64px) + 1.5rem) 2rem 4rem;
  max-width: 1000px;
  margin: 0 auto;
`

const BackLink = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 0.875rem;
  padding: 0;
  transition: color 0.18s;
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const Header = styled.header`
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  margin-bottom: 1.75rem;
`

const TitleBadge = styled.div`
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: ${({ theme }) => theme.colors.gradient.primary};
  box-shadow: 0 6px 16px ${({ theme }) => theme.colors.shadow.md};
`

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 0.25rem;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Subtitle = styled.p`
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
`

const SearchWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 220px;
  max-width: 360px;

  svg {
    position: absolute;
    left: 12px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    pointer-events: none;
  }
`

const SearchInput = styled.input`
  width: 100%;
  padding: 0.6rem 0.875rem 0.6rem 2.25rem;
  border-radius: 12px;
  font-size: 0.875rem;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  color: ${({ theme }) => theme.colors.text.primary};
  transition:
    border-color 0.2s,
    box-shadow 0.2s;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`

const Btn = styled.button<{ $primary?: boolean; $danger?: boolean }>`
  padding: 0.55rem 1rem;
  border-radius: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  transition:
    background 0.18s,
    border-color 0.18s,
    transform 0.12s,
    box-shadow 0.18s;

  &:active {
    transform: scale(0.97);
  }

  ${({ theme, $primary, $danger }) => {
    if ($primary)
      return css`
        background: ${theme.colors.gradient.primary};
        color: ${theme.colors.button.text};
        border: none;
        box-shadow: 0 4px 14px ${theme.colors.shadow.md};
        &:hover {
          box-shadow: 0 6px 18px ${theme.colors.shadow.lg};
        }
      `
    if ($danger)
      return css`
        background: transparent;
        color: ${theme.colors.error};
        border: 1px solid ${theme.colors.alert.danger.border};
        &:hover {
          background: ${theme.mode === 'dark'
            ? 'rgba(248,113,113,0.12)'
            : 'rgba(239,68,68,0.06)'};
        }
      `
    return css`
      background: ${theme.colors.background.primary};
      color: ${theme.colors.text.secondary};
      border: 1px solid ${theme.colors.border.default};
      &:hover {
        background: ${theme.colors.hover};
        color: ${theme.colors.text.primary};
        border-color: ${theme.colors.border.medium};
      }
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
  gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  transition:
    transform 0.15s,
    box-shadow 0.15s,
    border-color 0.15s;

  &:hover {
    transform: translateY(-1px);
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 8px 22px ${({ theme }) => theme.colors.shadow.md};
  }
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
  color: ${({ theme }) => theme.colors.text.primary};
`

const SlugChip = styled.code`
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ItemMeta = styled.div`
  font-size: 0.75rem;
  margin-top: 3px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ItemActions = styled.div`
  display: flex;
  gap: 8px;
`

const EmptyBox = styled.div`
  padding: 56px 32px;
  text-align: center;
  border-radius: 16px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
`

const LoadingText = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const CompanyCategoriesListPage: React.FC = () => {
  const navigate = useNavigate()
  const [list, setList] = useState<CompanyCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = () => {
    setLoading(true)
    companyCategoryApi
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
        (c.slug?.toLowerCase().includes(q) ?? false),
    )
  }, [list, search])

  const handleDelete = async (c: CompanyCategory, e: React.MouseEvent) => {
    e.stopPropagation()
    if (
      !(await confirm({
        title: '삭제 확인',
        message: `'${c.name}' 카테고리를 삭제하시겠습니까?`,
        danger: true,
      }))
    )
      return
    try {
      await companyCategoryApi.delete(c.id)
      load()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    }
  }

  return (
    <Page>
      <BackLink onClick={() => navigate('/companies')}>
        <FiArrowLeft size={14} /> 기업 목록
      </BackLink>
      <Header>
        <TitleBadge>
          <FiTag size={22} />
        </TitleBadge>
        <div>
          <Title>기업 카테고리 관리</Title>
          <Subtitle>
            기업 분류 카테고리를 등록·수정·삭제합니다. 계층 구조(상위
            카테고리)를 지원합니다.
          </Subtitle>
        </div>
      </Header>

      <Toolbar>
        <SearchWrap>
          <FiSearch size={16} />
          <SearchInput
            type="text"
            placeholder="카테고리명·슬러그 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </SearchWrap>
        <Btn $primary onClick={() => navigate('/company-categories/new')}>
          <FiPlus size={18} />
          카테고리 추가
        </Btn>
      </Toolbar>

      {loading ? (
        <LoadingText>불러오는 중...</LoadingText>
      ) : filtered.length === 0 ? (
        <EmptyBox>
          {search ? '검색 결과가 없습니다.' : '등록된 카테고리가 없습니다.'}
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
              <ItemContent>
                <ItemName>
                  {c.name}
                  {c.slug && <SlugChip>{c.slug}</SlugChip>}
                </ItemName>
                <ItemMeta>
                  {[
                    c.parent ? `상위: ${c.parent.name}` : null,
                    c.childrenCount > 0 ? `하위 ${c.childrenCount}` : null,
                    c.companyCount > 0 ? `기업 ${c.companyCount}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </ItemMeta>
              </ItemContent>
              <ItemActions>
                <Btn
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation()
                    navigate(`/company-categories/${c.id}/edit`)
                  }}
                  title="수정"
                >
                  <FiEdit2 size={16} />
                </Btn>
                <Btn type="button" $danger onClick={(ev) => handleDelete(c, ev)} title="삭제">
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
