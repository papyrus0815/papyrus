import { useEffect, useMemo, useRef, useState } from 'react'

import { motion } from 'framer-motion'
import { FiEdit2, FiMoreHorizontal, FiTrash2 } from 'react-icons/fi'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { useCurrencies } from '@/features/currency/use-currencies.hook'
import { useLanguages } from '@/features/language/use-languages.hook'
import { getUploadImageUrl } from '@/shared/api/upload'

import * as S from './country-detail.styles'

interface CountryDetailHeaderProps {
  country: UnifiedCountry
  continentName?: string
  onEdit?: (country: UnifiedCountry) => void
  onDelete?: (id: string) => void
  /** 헤더 우측에 배치할 액션 (예: 카테고리 설정 버튼) */
  rightSlot?: React.ReactNode
  /**
   * 이름 아래 메타 줄을 통째로 바꾼다 — 역사 국가는 현지명·대륙·ISO 대신
   * 영문 표기·존속 기간·국가 형태를 싣는다. 없으면 현대 국가 기본 메타.
   */
  meta?: React.ReactNode
  /** 썸네일·국기 이모지가 없을 때 타일에 세울 표지(역사 국가는 🏛). 없으면 이름 두 글자 */
  fallbackIcon?: React.ReactNode
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
  meta,
  fallbackIcon,
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

  const { data: currencies = [] } = useCurrencies()
  const { data: languages = [] } = useLanguages()

  const isoCode = country.isoCode?.trim() || null
  const trimmedFullName = country.fullName?.trim() || null
  const fullName =
    trimmedFullName && trimmedFullName !== country.name.trim()
      ? trimmedFullName
      : null
  const trimmedLocalName = country.localName?.trim() || null
  const localName =
    trimmedLocalName &&
    trimmedLocalName !== country.name.trim() &&
    trimmedLocalName !== fullName
      ? trimmedLocalName
      : null

  const currencyLabel = useMemo(() => {
    if (!country.currencyId) return null
    const found = currencies.find((item) => item.id === country.currencyId)
    if (!found) return null
    return `${found.name} (${found.code}${found.symbol ? ` · ${found.symbol}` : ''})`
  }, [country.currencyId, currencies])

  const languageLabel = useMemo(() => {
    if (!country.languageId) return null
    const found = languages.find((item) => item.id === country.languageId)
    if (!found) return null
    return found.name
  }, [country.languageId, languages])

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
        ) : fallbackIcon ? (
          fallbackIcon
        ) : (
          <S.HeroFlagInitial>
            {(isoCode ?? country.name).slice(0, 2)}
          </S.HeroFlagInitial>
        )}
      </S.HeroFlagTile>

      <S.HeroTitleCol>
        <S.HeroName>{country.name}</S.HeroName>
        <S.HeroMetaRow>
          {meta}
          {!meta && (
          <>
          {fullName && (
            <S.HeroLocalName title="공식 국호">{fullName}</S.HeroLocalName>
          )}
          {fullName && localName && (
            <S.HeroMetaSep aria-hidden>·</S.HeroMetaSep>
          )}
          {/* 현지명이 이름·정식국호와 같으면 두 번 적지 않는다 */}
          {localName && (
            <S.HeroLocalName title="현지어 표기">{localName}</S.HeroLocalName>
          )}
          {(fullName || localName) &&
            (continentName || isoCode || languageLabel || currencyLabel) && (
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
          {languageLabel && (
            <S.HeroMetaChip title="공용어">공용어 {languageLabel}</S.HeroMetaChip>
          )}
          {currencyLabel && (
            <S.HeroMetaChip title="공식 통화">{currencyLabel}</S.HeroMetaChip>
          )}
          </>
          )}
        </S.HeroMetaRow>
      </S.HeroTitleCol>

      <S.HeroActions>
        {rightSlot}
        {onEdit && (
          <S.HeroEditButton
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onEdit(country)
            }}
          >
            <FiEdit2 aria-hidden />
            정보 수정
          </S.HeroEditButton>
        )}
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
              <FiMoreHorizontal aria-hidden />
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
                  <FiEdit2 aria-hidden />
                  정보 수정
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
                  <FiTrash2 aria-hidden />
                  국가 삭제
                </S.DropdownButton>
              )}
            </S.DropdownMenu>
          </S.HeroKebab>
        )}
      </S.HeroActions>
    </S.HeroBand>
  )
}
