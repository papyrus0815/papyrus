/**
 * 목록 필터용 모달 (대륙/정렬/국가타입)
 * - Provider 내부에서만 사용. Context의 setContinentFilter 등 사용.
 */
import React from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { COUNTRY_TYPE_LABELS } from '@/entities/country/model/unified-types'
import type { CountryTypeFilter } from '@/entities/country/model/unified-types'
import { useCountryListState } from './country-list-state.context'
import type { SortBy } from './country-list-state.context'
import * as S from '@/pages/history/country/country.styles'

interface CountryListModalsProps {
  showContinentModal: boolean
  setShowContinentModal: (v: boolean) => void
  showSortModal: boolean
  setShowSortModal: (v: boolean) => void
  showCountryTypeModal: boolean
  setShowCountryTypeModal: (v: boolean) => void
}

export function CountryListModals({
  showContinentModal,
  setShowContinentModal,
  showSortModal,
  setShowSortModal,
  showCountryTypeModal,
  setShowCountryTypeModal,
}: CountryListModalsProps) {
  const {
    continents,
    continentFilter,
    setContinentFilter,
    sortBy,
    setSortBy,
    countryTypeFilter,
    setCountryTypeFilter,
  } = useCountryListState()

  const closeContinent = () => setShowContinentModal(false)
  const closeSort = () => setShowSortModal(false)
  const closeCountryType = () => setShowCountryTypeModal(false)

  return (
    <>
      {showContinentModal &&
        createPortal(
          <>
            <S.SelectModalOverlay
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={closeContinent}
            />
            <S.SelectModal
              as={motion.div}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <S.SelectModalHeader>
                <S.SelectModalTitle>대륙 선택</S.SelectModalTitle>
                <S.SelectModalClose onClick={closeContinent}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                      fill="currentColor"
                    />
                  </svg>
                </S.SelectModalClose>
              </S.SelectModalHeader>
              <S.SelectModalContent>
                <S.SelectOption
                  $active={!continentFilter}
                  onClick={() => {
                    setContinentFilter('')
                    closeContinent()
                  }}
                >
                  <S.SelectOptionIcon>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                        fill="currentColor"
                      />
                    </svg>
                  </S.SelectOptionIcon>
                  <S.SelectOptionText>전체 대륙</S.SelectOptionText>
                  {!continentFilter && (
                    <S.SelectOptionCheck>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                          fill="currentColor"
                        />
                      </svg>
                    </S.SelectOptionCheck>
                  )}
                </S.SelectOption>
                {continents.map((continent) => (
                  <S.SelectOption
                    key={continent.id}
                    $active={continentFilter === continent.id}
                    onClick={() => {
                      setContinentFilter(continent.id)
                      closeContinent()
                    }}
                  >
                    <S.SelectOptionIcon>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                          fill="currentColor"
                        />
                      </svg>
                    </S.SelectOptionIcon>
                    <S.SelectOptionText>{continent.name}</S.SelectOptionText>
                    {continentFilter === continent.id && (
                      <S.SelectOptionCheck>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                            fill="currentColor"
                          />
                        </svg>
                      </S.SelectOptionCheck>
                    )}
                  </S.SelectOption>
                ))}
              </S.SelectModalContent>
            </S.SelectModal>
          </>,
          document.body,
        )}

      {showSortModal &&
        createPortal(
          <>
            <S.SelectModalOverlay
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={closeSort}
            />
            <S.SelectModal
              as={motion.div}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <S.SelectModalHeader>
                <S.SelectModalTitle>정렬 기준</S.SelectModalTitle>
                <S.SelectModalClose onClick={closeSort}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                      fill="currentColor"
                    />
                  </svg>
                </S.SelectModalClose>
              </S.SelectModalHeader>
              <S.SelectModalContent>
                {(['name', 'population', 'area'] as SortBy[]).map((sort) => (
                  <S.SelectOption
                    key={sort}
                    $active={sortBy === sort}
                    onClick={() => {
                      setSortBy(sort)
                      closeSort()
                    }}
                  >
                    <S.SelectOptionIcon>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M14 7l-5 5 5 5V7z" fill="currentColor" />
                      </svg>
                    </S.SelectOptionIcon>
                    <S.SelectOptionText>
                      {sort === 'name' ? '이름순' : sort === 'population' ? '인구순' : '면적순'}
                    </S.SelectOptionText>
                    {sortBy === sort && (
                      <S.SelectOptionCheck>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                            fill="currentColor"
                          />
                        </svg>
                      </S.SelectOptionCheck>
                    )}
                  </S.SelectOption>
                ))}
              </S.SelectModalContent>
            </S.SelectModal>
          </>,
          document.body,
        )}

      {showCountryTypeModal &&
        createPortal(
          <>
            <S.SelectModalOverlay
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={closeCountryType}
            />
            <S.SelectModal
              as={motion.div}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <S.SelectModalHeader>
                <S.SelectModalTitle>국가 타입</S.SelectModalTitle>
                <S.SelectModalClose onClick={closeCountryType}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                      fill="currentColor"
                    />
                  </svg>
                </S.SelectModalClose>
              </S.SelectModalHeader>
              <S.SelectModalContent>
                {(['all', 'modern', 'historical'] as CountryTypeFilter[]).map((type) => (
                  <S.SelectOption
                    key={type}
                    $active={countryTypeFilter === type}
                    onClick={() => {
                      setCountryTypeFilter(type)
                      closeCountryType()
                    }}
                  >
                    <S.SelectOptionIcon>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                          fill="currentColor"
                        />
                      </svg>
                    </S.SelectOptionIcon>
                    <S.SelectOptionText>{COUNTRY_TYPE_LABELS[type]}</S.SelectOptionText>
                    {countryTypeFilter === type && (
                      <S.SelectOptionCheck>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                            fill="currentColor"
                          />
                        </svg>
                      </S.SelectOptionCheck>
                    )}
                  </S.SelectOption>
                ))}
              </S.SelectModalContent>
            </S.SelectModal>
          </>,
          document.body,
        )}
    </>
  )
}
