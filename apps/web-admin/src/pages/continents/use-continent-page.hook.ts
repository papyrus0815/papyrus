/**
 * 대륙 페이지 비즈니스 로직 훅
 *
 * @description
 * 대륙 페이지의 상태 관리 및 비즈니스 로직을 담당합니다.
 * - 대륙 CRUD 작업
 * - 사이드바 상태 관리
 * - 대륙별 국가 통계 계산
 */

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'react-hot-toast'
import type { ContinentResponseDto } from '@/shared/api/continents'
import type { CountryResponseDto } from '@/shared/api/countries'
import {
  useContinents,
  useDeleteContinent,
  useCreateContinent,
  useUpdateContinent,
} from '@/features/continent/use-continents.hook'
import { useCountries } from '@/features/country/api'

export type ContinentStats = {
  realArea: number
  realPopulation: number
  realCountryCount: number
}

export function useContinentPage() {
  const { data: continents, isLoading, isError, error } = useContinents()
  const { data: countries } = useCountries()
  const deleteMutation = useDeleteContinent()
  const createMutation = useCreateContinent()
  const updateMutation = useUpdateContinent()

  const [showSidebar, setShowSidebar] = useState(false)
  const [editingContinent, setEditingContinent] =
    useState<ContinentResponseDto | null>(null)
  const [isMobileListOpen, setIsMobileListOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('list')

  /**
   * 대륙별 국가 데이터 집계
   *
   * @description
   * 각 대륙에 속한 국가들의 면적, 인구, 개수를 실시간으로 계산합니다.
   */
  const continentStats = useMemo(() => {
    if (!countries || !continents) return {}

    const stats: Record<string, ContinentStats> = {}

    continents.forEach((continent) => {
      const continentCountries = countries.filter(
        (country: CountryResponseDto) => country.continentId === continent.id,
      )

      stats[continent.id] = {
        realArea: continentCountries.reduce(
          (sum, country) =>
            sum + (country.areaSqKm ? Number(country.areaSqKm) : 0),
          0,
        ),
        realPopulation: continentCountries.reduce(
          (sum, country) =>
            sum + (country.population ? Number(country.population) : 0),
          0,
        ),
        realCountryCount: continentCountries.length,
      }
    })

    return stats
  }, [countries, continents])

  /**
   * 대륙 삭제 핸들러
   */
  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`"${name}"을(를) 삭제하시겠습니까?`)) {
      const loadingToast = toast.loading('삭제하는 중...')
      try {
        await deleteMutation.mutateAsync(id)
        toast.success('삭제되었습니다', { id: loadingToast })
      } catch (err) {
        toast.error('삭제 실패: ' + (err as Error).message, {
          id: loadingToast,
        })
      }
    }
  }

  /**
   * 대륙 수정 핸들러
   */
  const handleEdit = (continent: ContinentResponseDto) => {
    setEditingContinent(continent)
    setShowSidebar(true)
  }

  /**
   * 대륙 생성 핸들러
   */
  const handleCreate = async (data: any) => {
    const loadingToast = toast.loading('대륙을 등록하는 중...')
    try {
      await createMutation.mutateAsync(data)
      toast.success('대륙이 추가되었습니다!', { id: loadingToast })
      setShowSidebar(false)
      setEditingContinent(null)
    } catch (error) {
      toast.error('대륙 추가 실패: ' + (error as Error).message, {
        id: loadingToast,
      })
    }
  }

  /**
   * 대륙 수정 제출 핸들러
   */
  const handleUpdate = async (data: any) => {
    if (!editingContinent) return

    const loadingToast = toast.loading('대륙을 수정하는 중...')
    try {
      await updateMutation.mutateAsync({
        id: editingContinent.id,
        data,
      })
      toast.success('대륙이 수정되었습니다!', { id: loadingToast })
      setShowSidebar(false)
      setEditingContinent(null)
    } catch (error) {
      toast.error('대륙 수정 실패: ' + (error as Error).message, {
        id: loadingToast,
      })
    }
  }

  /**
   * 사이드바 닫기 핸들러
   */
  const handleCloseSidebar = () => {
    setShowSidebar(false)
    setEditingContinent(null)
  }

  /**
   * 새 대륙 등록 시작
   */
  const handleOpenCreate = () => {
    setEditingContinent(null)
    setShowSidebar(true)
  }

  /**
   * 모바일 뷰 모드 전환 이벤트 리스너
   */
  useEffect(() => {
    const handleViewModeSwitch = (e: Event) => {
      const customEvent = e as CustomEvent
      const mode = customEvent.detail as 'dashboard' | 'list'
      setActiveTab(mode)
      setIsMobileListOpen(mode === 'list')
    }

    window.addEventListener('switchViewMode', handleViewModeSwitch)

    return () => {
      window.removeEventListener('switchViewMode', handleViewModeSwitch)
    }
  }, [])

  return {
    // Data
    continents,
    continentStats,
    isLoading,
    isError,
    error,

    // State
    showSidebar,
    editingContinent,
    isMobileListOpen,
    setIsMobileListOpen,
    activeTab,

    // Mutations
    deleteMutation,

    // Handlers
    handleDelete,
    handleEdit,
    handleCreate,
    handleUpdate,
    handleCloseSidebar,
    handleOpenCreate,
  }
}
