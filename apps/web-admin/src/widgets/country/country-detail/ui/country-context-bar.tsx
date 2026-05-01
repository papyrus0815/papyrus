import { useEffect, useId, useRef, useState } from 'react'

import styled from 'styled-components'

import type { Country } from '@/entities/country/api'
import { getUploadImageUrl } from '@/shared/api/upload'

import * as S from './country-detail.styles'

interface CountryContextBarProps {
  country: Country
  continentName?: string
  onEdit?: (country: Country) => void
  onDelete?: (id: string) => void
}

/**
 * 국가 상세 모든 탭 상단에 항상 노출되는 컴팩트 컨텍스트 바.
 * - 작은 국기 + 국가명 + 대륙
 * - 케밥 메뉴 (수정/삭제) — state·outside-click·ESC 처리
 *
 * 통계 탭의 hero 헤더(`CountryDetailHeader`)와 보완 관계.
 * Hero는 탭별로 가변, 본 컨텍스트 바는 어떤 탭에 있든 "어느 국가 보고 있는지" 항상 알려준다.
 */
export function CountryContextBar({
  country,
  continentName,
  onEdit,
  onDelete,
}: CountryContextBarProps) {
  const hasMenu = Boolean(onEdit || onDelete)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuContainerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!menuOpen) return
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null
      if (target && menuContainerRef.current?.contains(target)) return
      setMenuOpen(false)
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  return (
    <Bar role="region" aria-label="현재 국가">
      <FlagThumb>
        {country.thumbnailUrl ? (
          <img src={getUploadImageUrl(country.thumbnailUrl)} alt="" />
        ) : country.flagEmoji ? (
          <span>{country.flagEmoji}</span>
        ) : (
          <span>🏛️</span>
        )}
      </FlagThumb>
      <NameCol>
        <Name title={country.name}>{country.name}</Name>
        {(continentName || country.localName) && (
          <SubMeta>
            {continentName && <MetaItem>{continentName}</MetaItem>}
            {continentName && country.localName && <MetaSep>·</MetaSep>}
            {country.localName && <MetaItem>{country.localName}</MetaItem>}
          </SubMeta>
        )}
      </NameCol>
      {hasMenu && (
        <KebabWrap ref={menuContainerRef}>
          <KebabBtn
            ref={triggerRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label="국가 작업 메뉴"
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((prev) => !prev)
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </KebabBtn>
          <S.DropdownMenu id={menuId} role="menu" $open={menuOpen}>
            {onEdit && (
              <S.DropdownButton
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  onEdit(country)
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                수정
              </S.DropdownButton>
            )}
            {onDelete && (
              <S.DropdownButton
                type="button"
                role="menuitem"
                $isDelete
                onClick={() => {
                  setMenuOpen(false)
                  onDelete(country.id)
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                삭제
              </S.DropdownButton>
            )}
          </S.DropdownMenu>
        </KebabWrap>
      )}
    </Bar>
  )
}

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 24px;
  background: ${({ theme }) => theme.colors.background.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (max-width: 768px) {
    padding: 8px 16px;
  }
`

const FlagThumb = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.06)'
      : 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e8ecf1'};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const NameCol = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
`

const Name = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.01em;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const SubMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const MetaItem = styled.span`
  white-space: nowrap;
`

const MetaSep = styled.span`
  opacity: 0.5;
`

const KebabWrap = styled.div`
  position: relative;
  flex-shrink: 0;
`

const KebabBtn = styled.button`
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f3f4f6'};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`
