import { motion } from 'framer-motion'

import type { Country } from '@/entities/country/api'

import { CountryFlag } from '../../shared'
import * as S from './CountryDetail.styles'

interface CountryDetailHeaderProps {
  country: Country
  continentName?: string
  onEdit?: (country: Country) => void
  onDelete?: (id: string) => void
}

/**
 * 국가 상세 페이지 헤더 - 개선된 디자인
 * - 국기, 국가명, 로컬명
 * - 대륙, 언어, 화폐 배지
 * - 수정/삭제 케밥 메뉴
 */
export function CountryDetailHeader({
  country,
  continentName,
  onEdit,
  onDelete,
}: CountryDetailHeaderProps) {
  return (
    <>
      {/* 국기 이미지 컨테이너 */}
      <S.MiniFlagWrapper
        as={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: '100%', height: '100%' }}
        >
          <CountryFlag
            thumbnailUrl={country.thumbnailUrl}
            countryName={country.name}
            size="full"
          />
        </motion.div>

        {/* 국가명 - 국기 위에 좌측 상단 오버레이 */}
        <S.CountryNameOverlay
          as={motion.div}
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div whileHover={{ x: 4, transition: { duration: 0.2 } }}>
            <S.AnalyticsCountryName>{country.name}</S.AnalyticsCountryName>
          </motion.div>
          {country.localName && (
            <motion.div whileHover={{ x: 4, transition: { duration: 0.2 } }}>
              <S.AnalyticsCountryLocalName>
                {country.localName}
              </S.AnalyticsCountryLocalName>
            </motion.div>
          )}
        </S.CountryNameOverlay>

        {/* 그래디언트 오버레이 (더 나은 텍스트 가독성) */}
        <S.FlagGradientOverlay />

        {/* 대륙 뱃지 - 국기 영역 좌측 하단 */}
        {continentName && (
          <S.FlagBottomLeftOverlay
            as={motion.div}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <S.InfoBadge>
                <S.BadgeLabel>대륙</S.BadgeLabel>
                <S.BadgeValue>{continentName}</S.BadgeValue>
              </S.InfoBadge>
            </motion.div>
          </S.FlagBottomLeftOverlay>
        )}
      </S.MiniFlagWrapper>

      {/* 국가 정보 배지들 - 언어·화폐 (대륙은 국기 영역 좌하단에 배치) */}
      {(country.languageId || country.currencyId) && (
        <S.AnalyticsBadges
          as={motion.div}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {country.languageId && (
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <S.InfoBadge>
                <S.BadgeLabel>언어</S.BadgeLabel>
                <S.BadgeValue>{country.languageId}</S.BadgeValue>
              </S.InfoBadge>
            </motion.div>
          )}
          {country.currencyId && (
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <S.InfoBadge>
                <S.BadgeLabel>화폐</S.BadgeLabel>
                <S.BadgeValue>{country.currencyId}</S.BadgeValue>
              </S.InfoBadge>
            </motion.div>
          )}
        </S.AnalyticsBadges>
      )}

      {/* 케밥 메뉴 */}
      {(onEdit || onDelete) && (
        <S.CompactKebabMenu
          as={motion.div}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <S.KebabButton
            as={motion.button}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
              e.stopPropagation()
              const menu = e.currentTarget.nextElementSibling as HTMLElement
              if (menu) {
                menu.style.display =
                  menu.style.display === 'block' ? 'none' : 'block'
              }
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </S.KebabButton>
          <S.DropdownMenu>
            {onEdit && (
              <S.DropdownButton
                as={motion.button}
                whileHover={{ x: 4 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(country)
                  const menu = e.currentTarget.parentElement as HTMLElement
                  if (menu) menu.style.display = 'none'
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
                as={motion.button}
                whileHover={{ x: 4 }}
                transition={{ duration: 0.2 }}
                $isDelete
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(country.id)
                  const menu = e.currentTarget.parentElement as HTMLElement
                  if (menu) menu.style.display = 'none'
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
        </S.CompactKebabMenu>
      )}
    </>
  )
}
