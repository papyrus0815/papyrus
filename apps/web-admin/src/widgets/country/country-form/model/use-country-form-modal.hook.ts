/**
 * 현대 국가 등록/수정 모달 상태 + 저장 로직 hook.
 *
 * - 페이지마다 중복됐던 편집 상태·저장 핸들러를 한 곳에 모음.
 * - 반환값을 CountryFormModal에 그대로 spread 하면 됨.
 */
import { useCallback, useState } from 'react'

import { toast } from 'react-hot-toast'

import type { Country } from '@/entities/country/api'
import {
  useCreateCountry,
  useDeleteCountry,
  useUpdateCountry,
} from '@/features/country/api'

export function useCountryFormModal() {
  const createMutation = useCreateCountry()
  const updateMutation = useUpdateCountry()
  const deleteMutation = useDeleteCountry()

  const [editing, setEditing] = useState<Country | null>(null)

  const openCreate = useCallback(() => setEditing({} as Country), [])
  const openEdit = useCallback((country: Country) => setEditing(country), [])
  const close = useCallback(() => setEditing(null), [])

  const save = useCallback(
    async (data: Omit<Country, 'id'> & { id?: string }) => {
      const loadingToast = toast.loading(
        data.id ? '수정하는 중...' : '등록하는 중...',
      )
      try {
        const payload = {
          name: data.name,
          fullName: (data as { fullName?: string }).fullName,
          localName: data.localName,
          isoCode: data.isoCode,
          flagEmoji: data.flagEmoji,
          capital: data.capital,
          population: data.population ? String(data.population) : undefined,
          areaSqKm: data.areaSqKm ? Number(data.areaSqKm) : undefined,
          thumbnailUrl: data.thumbnailUrl,
          currencyId: data.currencyId,
          languageId: data.languageId,
          continentId: data.continentId,
          defaultNameDisplayOrder: (
            data as { defaultNameDisplayOrder?: 'korean' | 'western' }
          ).defaultNameDisplayOrder,
        }
        if (data.id) {
          await updateMutation.mutateAsync({
            id: data.id,
            data: { ...payload, thumbnailUrl: payload.thumbnailUrl ?? '' },
          })
          toast.success('수정되었습니다', { id: loadingToast })
        } else {
          await createMutation.mutateAsync(payload)
          toast.success('등록되었습니다', { id: loadingToast })
        }
        setEditing(null)
      } catch (error) {
        toast.error(
          (data.id ? '수정 실패: ' : '등록 실패: ') + (error as Error).message,
          { id: loadingToast },
        )
      }
    },
    [createMutation, updateMutation],
  )

  const remove = useCallback(
    async (id: string, name: string) => {
      if (!window.confirm(`"${name}"을(를) 삭제하시겠습니까?`)) return
      const loadingToast = toast.loading('삭제하는 중...')
      try {
        await deleteMutation.mutateAsync(id)
        toast.success('삭제되었습니다', { id: loadingToast })
      } catch (err) {
        toast.error('삭제 실패: ' + (err as Error).message, { id: loadingToast })
      }
    },
    [deleteMutation],
  )

  return {
    editing,
    isOpen: editing !== null,
    openCreate,
    openEdit,
    close,
    save,
    remove,
  }
}
