import { useMemo, useState } from 'react'

import { mockGovernmentData } from '@/widgets/country/country-detail/mock'
import type { HistoricalEvent } from '@/widgets/country/country-detail/mock/types'

/**
 * 통계 탭 전용 — mockGovernmentData 기반 집계(탭 비활성 시 부모에서 매 렌더 계산하지 않도록 훅 내부에서만 사용).
 */
export function useGovernmentStatisticsMockData() {
  const [selectedEventType, setSelectedEventType] = useState<string>('all')

  const base = useMemo(() => {
    const totalMinistries = mockGovernmentData.ministries.length
    const totalConstitutional = mockGovernmentData.constitutionalBodies.length
    const totalAgencies = mockGovernmentData.agencies.length
    const totalLocal = mockGovernmentData.localGovernments.length
    const totalOrganizations =
      totalMinistries + totalConstitutional + totalAgencies + totalLocal

    const totalBudget = mockGovernmentData.ministries
      .reduce((sum, ministry) => {
        const budget = parseFloat(ministry.budget.replace(/[^0-9.]/g, ''))
        return sum + budget
      }, 0)
      .toFixed(1)

    const totalEmployees = mockGovernmentData.ministries
      .reduce((sum, ministry) => {
        const employees = parseInt(ministry.employees.replace(/[^0-9]/g, ''))
        return sum + employees
      }, 0)
      .toLocaleString()

    const allEvents: (HistoricalEvent & {
      orgName: string
      orgType: string
    })[] = []

    mockGovernmentData.ministries.forEach((ministry) => {
      if (ministry.events) {
        ministry.events.forEach((event) => {
          allEvents.push({
            ...event,
            orgName: ministry.name,
            orgType: '중앙부처',
          })
        })
      }
    })

    mockGovernmentData.constitutionalBodies.forEach((body) => {
      if (body.events) {
        body.events.forEach((event) => {
          allEvents.push({
            ...event,
            orgName: body.name,
            orgType: '헌법기관',
          })
        })
      }
    })

    mockGovernmentData.agencies.forEach((agency) => {
      if (agency.events) {
        agency.events.forEach((event) => {
          allEvents.push({
            ...event,
            orgName: agency.name,
            orgType: '산하기관',
          })
        })
      }
    })

    mockGovernmentData.localGovernments.forEach((local) => {
      if (local.events) {
        local.events.forEach((event: HistoricalEvent) => {
          allEvents.push({
            ...event,
            orgName: local.name,
            orgType: '지방정부',
          })
        })
      }
    })

    allEvents.sort(
      (eventA, eventB) => parseInt(eventB.year) - parseInt(eventA.year),
    )

    const eventCounts = {
      all: allEvents.length,
      establishment: allEvents.filter((event) => event.type === 'establishment')
        .length,
      reform: allEvents.filter((event) => event.type === 'reform').length,
      achievement: allEvents.filter((event) => event.type === 'achievement')
        .length,
      crisis: allEvents.filter((event) => event.type === 'crisis').length,
      merger: allEvents.filter((event) => event.type === 'merger').length,
    }

    const budgetData = mockGovernmentData.ministries[0].statistics || []

    return {
      totalMinistries,
      totalConstitutional,
      totalAgencies,
      totalLocal,
      totalOrganizations,
      totalBudget,
      totalEmployees,
      allEvents,
      eventCounts,
      budgetData,
    }
  }, [])

  const filteredEvents = useMemo(() => {
    if (selectedEventType === 'all') return base.allEvents
    return base.allEvents.filter((event) => event.type === selectedEventType)
  }, [base.allEvents, selectedEventType])

  return {
    ...base,
    filteredEvents,
    selectedEventType,
    onSelectedEventTypeChange: setSelectedEventType,
  }
}
