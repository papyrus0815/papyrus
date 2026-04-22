/**
 * /history/dashboard/administration — 행정부 다국가 비교 대시보드.
 *
 * 여러 국가(현대/역사)를 선택해 내각·부처 구성을 나란히 비교.
 * 국가 선택은 CountrySelectModal (복수 선택) 사용.
 */
import { useCallback, useState } from 'react'

import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

import type { HistoricalCountry } from '@/entities/historical-country/api'
import {
  type UnifiedCountry,
  historicalToUnified,
} from '@/entities/country/model/unified-types'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { pathKeys } from '@/shared/router'
import { CountrySelectModal } from '@/shared/ui/country-select-modal/country-select-modal'
import { AdministrationCabinetComparison } from '@/widgets/country/administration-cabinet-comparison/administration-cabinet-comparison.widget'
import {
  HistoryShell,
  LeftFilterSlot,
  useHistoryCoreData,
} from '@/widgets/history-shell'

export default function DashboardAdministrationPage() {
  const navigate = useNavigate()
  const { unifiedCountries, apiCountries, apiHistoricalCountries } =
    useHistoryCoreData()

  const [territories, setTerritories] = useState<UnifiedCountry[]>([])
  const [pickerOpen, setPickerOpen] = useState(() => true)

  const resolvePick = useCallback(
    (id: string, isHistorical: boolean): UnifiedCountry | undefined => {
      if (!isHistorical) {
        const modern = unifiedCountries.find((c) => c.id === id)
        if (modern?.type === 'modern') return modern
        return undefined
      }
      for (const country of unifiedCountries) {
        if (country.type === 'modern' && country.historicalCountries) {
          const hit = country.historicalCountries.find((h) => h.id === id)
          if (hit) return historicalToUnified(hit)
        }
      }
      const fromApi = (apiHistoricalCountries ?? []).find((hc) => hc.id === id)
      if (fromApi) return historicalToUnified(fromApi as HistoricalCountry)
      return undefined
    },
    [unifiedCountries, apiHistoricalCountries],
  )

  const handlePick = useCallback(
    (pick: { id: string; name: string; isHistorical: boolean }) => {
      const resolved = resolvePick(pick.id, pick.isHistorical)
      if (!resolved) {
        toast.error('선택한 국가 정보를 불러오지 못했습니다.')
        return
      }
      setTerritories((prev) => {
        const exists = prev.some(
          (c) =>
            c.id === pick.id && (c.type === 'historical') === pick.isHistorical,
        )
        if (exists) {
          return prev.filter(
            (c) =>
              !(
                c.id === pick.id &&
                (c.type === 'historical') === pick.isHistorical
              ),
          )
        }
        return [...prev, resolved]
      })
    },
    [resolvePick],
  )

  const removeTerritory = useCallback((t: UnifiedCountry) => {
    setTerritories((prev) =>
      prev.filter((c) => !(c.id === t.id && c.type === t.type)),
    )
  }, [])

  const reorderTerritories = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return
      setTerritories((prev) => {
        if (
          fromIndex < 0 ||
          fromIndex >= prev.length ||
          toIndex < 0 ||
          toIndex >= prev.length
        ) {
          return prev
        }
        const next = [...prev]
        const [item] = next.splice(fromIndex, 1)
        next.splice(toIndex, 0, item)
        return next
      })
    },
    [],
  )

  return (
    <HistoryShell
      left={({ listCollapsed, toggleListCollapsed }) => (
        <LeftFilterSlot
          view="administration"
          collapsed={listCollapsed}
          onToggleCollapse={toggleListCollapsed}
        />
      )}
      right={
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          style={{ width: '100%', minHeight: '100%' }}
        >
          <AdministrationCabinetComparison
            territories={territories}
            onOpenCountryPicker={() => setPickerOpen(true)}
            onNavigateGovernment={(id) =>
              navigate(pathKeys.history.countryGovernment(id))
            }
            onRemoveTerritory={removeTerritory}
            onReorderTerritories={reorderTerritories}
          />
        </motion.div>
      }
    >
      <CountrySelectModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="비교할 국가 선택 (여러 개 선택 가능)"
        multiSelect
        selectedCountryIds={territories.map((c) => c.id)}
        modernCountries={(apiCountries ?? []) as CountryResponseDto[]}
        historicalCountries={
          (apiHistoricalCountries ?? []) as HistoricalCountryResponseDto[]
        }
        onSelect={handlePick}
      />
    </HistoryShell>
  )
}
