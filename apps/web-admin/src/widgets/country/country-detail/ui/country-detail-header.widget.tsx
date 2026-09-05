import { useEffect, useRef, useState } from 'react'

import { motion } from 'framer-motion'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { getUploadImageUrl } from '@/shared/api/upload'

import * as S from './country-detail.styles'

interface CountryDetailHeaderProps {
  country: UnifiedCountry
  continentName?: string
  onEdit?: (country: UnifiedCountry) => void
  onDelete?: (id: string) => void
  /** 헤더 우측에 배치할 액션 (예: 카테고리 설정 버튼) */
  rightSlot?: React.ReactNode
}

/**
 * 국가 상세 히어로 — 국기 타일 · 국호 · 대륙/ISO · 케밥 메뉴를 96px 한 줄에.
 *
 * 예전에는 폭 전체 × 168px 국기 배너였다. 실DB에서 썸네일 보유가 **71개국 중 2개**라
 * 69개국에서 이 자리가 통째로 빈 화면이었고, 있는 2개도 가로 국기를 cover 해 색 얼룩이 됐다.
 * 국기는 제 비율의 타일로 세우고 없으면 `flagEmoji`(71/71 보유)로 대신한다.
 *
 * 언어·화폐 배지는 제거했다 — `languageId`/`currencyId`가 실DB에서 0/71이라
 * 한 번도 렌더된 적이 없는 분기였다. 값이 붙는 날 되살리는 편이 정직하다.
 */
export function CountryDetailHeader({
  country,
  continentName,
  onEdit,
  onDelete,
  rightSlot,
}: CountryDetailHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const kebabRef = useRef<HTMLDivElement>(null)

  // 메뉴 열림 상태에서 바깥 클릭·Esc로 닫기
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (kebabRef.current && !kebabRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const isoCode = country.isoCode?.trim() || null

  return (
    <S.HeroBand
      as={motion.div}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <S.HeroFlagTile aria-hidden={!country.thumbnailUrl}>
        {country.thumbnailUrl ? (
          <img
            src={getUploadImageUrl(country.thumbnailUrl)}
            alt={`${country.name} 국기`}
          />
        ) : country.flagEmoji ? (
          country.flagEmoji
        ) : (
          <S.HeroFlagInitial>
            {(isoCode ?? country.name).slice(0, 2)}
          </S.HeroFlagInitial>
        )}
      </S.HeroFlagTile>

      <S.HeroTitleCol>
        <S.HeroName>{country.name}</S.HeroName>
        <S.HeroMetaRow>
          {country.localName && (
            <S.HeroLocalName>{country.localName}</S.HeroLocalName>
          )}
          {country.localName && (continentName || isoCode) && (
            <S.HeroMetaSep aria-hidden>·</S.HeroMetaSep>
          )}
          {continentName && <S.HeroMetaChip>{continentName}</S.HeroMetaChip>}
          {/*
            ISO는 규모 지표가 아니라 식별자다. 예전엔 규모 바에서 인구·면적과 같은
            칸을 차지해 "이 나라가 어떤 나라인가"의 답인 척했다 — 이름 옆이 제자리다.
          */}
          {isoCode && (
            <S.HeroMetaChip title="ISO 국가 코드">{isoCode}</S.HeroMetaChip>
          )}
        </S.HeroMetaRow>
      </S.HeroTitleCol>

      <S.HeroActions>
        {rightSlot}
        {(onEdit || onDelete) && (
          <S.HeroKebab ref={kebabRef}>
            <S.KebabButton
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="국가 작업 메뉴"
              onClick={(event) => {
                event.stopPropagation()
                setMenuOpen((open) => !open)
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </S.KebabButton>
            <S.DropdownMenu
              role="menu"
              style={{ display: menuOpen ? 'block' : 'none' }}
            >
              {onEdit && (
                <S.DropdownButton
                  type="button"
                  role="menuitem"
                  onClick={(event) => {
                    event.stopPropagation()
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
                  onClick={(event) => {
                    event.stopPropagation()
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
          </S.HeroKebab>
        )}
      </S.HeroActions>
    </S.HeroBand>
  )
}
