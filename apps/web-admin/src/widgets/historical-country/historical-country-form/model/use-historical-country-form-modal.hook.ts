/**
 * 역사 국가 등록/수정/삭제 모달 상태 + 저장 로직 hook.
 *
 * - 편집 대상 `HistoricalCountry`와 preset 값을 관리
 * - 서버 상세(useHistoricalCountry) 자동 조회
 * - create·update·delete 뮤테이션 일원화
 */
import { useCallback, useState } from 'react'

import { toast } from 'react-hot-toast'

import type { HistoricalCountry } from '@/entities/historical-country/api'
import {
  useCreateHistoricalCountry,
  useDeleteHistoricalCountry,
  useHistoricalCountry,
  useUpdateHistoricalCountry,
} from '@/features/historical-country'

export type HistoricalCountryFormPreset =
  | { stateType: 'SHOGUNATE'; entityKind: 'REGIME' }
  | undefined

export type HistoricalCountrySavePayload = Omit<
  HistoricalCountry,
  'id' | 'createdAt' | 'updatedAt'
> & {
  id?: string
  parentModernCountryIds?: string[]
  parentHistoricalCountryIds?: string[]
  transitionEventType?: string
}

export function useHistoricalCountryFormModal() {
  const createMutation = useCreateHistoricalCountry()
  const updateMutation = useUpdateHistoricalCountry()
  const deleteMutation = useDeleteHistoricalCountry()

  const [editing, setEditing] = useState<HistoricalCountry | null>(null)
  const [preset, setPreset] = useState<HistoricalCountryFormPreset>(undefined)

  // 수정 모드에서만 서버 상세를 가져온다 (parentModernCountryIds 등 전체 데이터)
  const { data: editingDetail } = useHistoricalCountry(editing?.id)

  const openCreate = useCallback(
    (initialPreset?: HistoricalCountryFormPreset) => {
      setEditing({} as HistoricalCountry)
      setPreset(initialPreset)
    },
    [],
  )

  const openEdit = useCallback((country: HistoricalCountry) => {
    setEditing(country)
    setPreset(undefined)
  }, [])

  const close = useCallback(() => {
    setEditing(null)
    setPreset(undefined)
  }, [])

  const save = useCallback(
    async (data: HistoricalCountrySavePayload) => {
      const loadingToast = toast.loading(
        data.id ? '수정하는 중...' : '등록하는 중...',
      )
      try {
        const shared = {
          name: data.name,
          enName: data.enName,
          description: data.description ?? null,
          thumbnailUrl: data.thumbnailUrl ?? null,
          startEra: data.startEra ?? null,
          startYear: data.startYear ?? null,
          startMonth: data.startMonth ?? null,
          startDay: data.startDay ?? null,
          endEra: data.endEra ?? null,
          endYear: data.endYear ?? null,
          endMonth: data.endMonth ?? null,
          endDay: data.endDay ?? null,
          stateType: data.stateType,
          parentModernCountryIds: data.parentModernCountryIds,
          parentHistoricalCountryIds: data.parentHistoricalCountryIds,
          transitionEventType: data.transitionEventType,
        }
        if (data.id) {
          await updateMutation.mutateAsync({ id: data.id, data: shared })
          toast.success('수정되었습니다', { id: loadingToast })
        } else {
          await createMutation.mutateAsync({
            ...shared,
            description: shared.description ?? undefined,
            thumbnailUrl: shared.thumbnailUrl ?? undefined,
            startEra: shared.startEra ?? undefined,
            startYear: shared.startYear ?? undefined,
            startMonth: shared.startMonth ?? undefined,
            startDay: shared.startDay ?? undefined,
            endEra: shared.endEra ?? undefined,
            endYear: shared.endYear ?? undefined,
            endMonth: shared.endMonth ?? undefined,
            endDay: shared.endDay ?? undefined,
          })
          toast.success('등록되었습니다', { id: loadingToast })
        }
        close()
      } catch (error) {
        toast.error(
          (data.id ? '수정 실패: ' : '등록 실패: ') + (error as Error).message,
          { id: loadingToast },
        )
      }
    },
    [createMutation, updateMutation, close],
  )

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      if (!confirm('정말 삭제하시겠습니까?')) return false
      const loadingToast = toast.loading('삭제하는 중...')
      try {
        await deleteMutation.mutateAsync(id)
        toast.success('삭제되었습니다', { id: loadingToast })
        return true
      } catch (err) {
        toast.error('삭제 실패: ' + (err as Error).message, {
          id: loadingToast,
        })
        return false
      }
    },
    [deleteMutation],
  )

  /** CountryDetailFormModal의 `editing` prop에 그대로 전달하면 되는 값 */
  const editingForModal =
    editing === null ? null : editing?.id ? (editingDetail ?? editing) : editing

  return {
    editing,
    editingForModal,
    preset,
    isOpen: editing !== null,
    openCreate,
    openEdit,
    close,
    save,
    remove,
  }
}
