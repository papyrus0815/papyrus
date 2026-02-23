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
            .then(setAvailablePersons)
            .catch(() => setAvailablePersons([])),
          getAllCountries().then(setAvailableCountries).catch(() => {}),
          getAllHistoricalCountries()
            .then(setAvailableHistoricalCountries)
            .catch(() => {}),
          getAllEventCategories()
            .then(setDbCategories)
            .catch(() => setDbCategories([])),
          militaryUnitApi.getAll().then(setAvailableMilitaryUnits).catch(() => {}),
          getAllEvents()
            .then(setAvailableEvents)
            .catch(() => setAvailableEvents([])),
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

