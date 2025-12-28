/**
 * Event Form Entities - Data Loading Hook
 * FSD: entities/event-form/model
 * 
 * 폼에 필요한 모든 엔티티 데이터를 로드합니다.
 */

import { useEffect, useState } from 'react'

import { getAllCountries, type CountryResponseDto } from '@/shared/api/countries'
import { getAllEventCategories, type EventCategoryDto } from '@/shared/api/event-categories'
import { getAllEvents, type EventResponseDto } from '@/shared/api/events'
import { getAllHistoricalCountries, type HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { militaryUnitApi, type MilitaryUnit } from '@/shared/api/military-unit'
import { getAllPersons, type PersonResponseDto } from '@/shared/api/persons'

export const useFormEntities = () => {
  const [availablePersons, setAvailablePersons] = useState<PersonResponseDto[]>([])
  const [availableCountries, setAvailableCountries] = useState<CountryResponseDto[]>([])
  const [availableHistoricalCountries, setAvailableHistoricalCountries] = useState<HistoricalCountryResponseDto[]>([])
  const [dbCategories, setDbCategories] = useState<EventCategoryDto[]>([])
  const [availableMilitaryUnits, setAvailableMilitaryUnits] = useState<MilitaryUnit[]>([])
  const [availableEvents, setAvailableEvents] = useState<EventResponseDto[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadEntities = async () => {
      setIsLoading(true)
      try {
        await Promise.all([
          getAllPersons()
            .then((persons) => {
              console.log('✅ 인물 목록 로드 성공:', persons.length, '명')
              setAvailablePersons(persons)
            })
            .catch((error) => {
              console.error('❌ 인물 목록 로드 실패:', error)
              setAvailablePersons([])
            }),
          getAllCountries()
            .then((countries) => {
              setAvailableCountries(countries)
            })
            .catch((error) => {
              console.error('국가 목록 로드 실패:', error)
            }),
          getAllHistoricalCountries()
            .then((hc) => {
              setAvailableHistoricalCountries(hc)
            })
            .catch((error) => {
              console.error('역사적 국가 목록 로드 실패:', error)
            }),
          getAllEventCategories()
            .then((categories) => {
              console.log('✅ 카테고리 목록 로드 성공:', categories)
              setDbCategories(categories)
            })
            .catch((error) => {
              console.error('❌ 카테고리 목록 로드 실패:', error)
              setDbCategories([])
            }),
          militaryUnitApi
            .getAll()
            .then((units) => {
              setAvailableMilitaryUnits(units)
            })
            .catch((error) => {
              console.error('군부대 목록 로드 실패:', error)
            }),
          getAllEvents()
            .then((events) => {
              console.log('✅ 사건 목록 로드 성공:', events.length, '건')
              setAvailableEvents(events)
            })
            .catch((error) => {
              console.error('❌ 사건 목록 로드 실패:', error)
              setAvailableEvents([])
            }),
        ])
      } finally {
        setIsLoading(false)
      }
    }

    loadEntities()
  }, [])

  return {
    availablePersons,
    availableCountries,
    availableHistoricalCountries,
    dbCategories,
    availableMilitaryUnits,
    availableEvents,
    isLoading,
  }
}

