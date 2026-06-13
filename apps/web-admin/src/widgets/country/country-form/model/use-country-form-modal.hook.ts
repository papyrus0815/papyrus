/**
 * 현대 국가 등록/수정 모달 상태 + 저장 로직 hook.
 *
 * - 페이지마다 중복됐던 편집 상태·저장 핸들러를 한 곳에 모음.
 * - 반환값을 CountryFormModal에 그대로 spread 하면 됨.
 * - 저장 시 RHF 검증 통과 데이터를 API 페이로드로 변환하는 단일 지점.
 */
import { useCallback, useRef, useState } from 'react'

import type { Country, CountryFormData } from '@/entities/country/api'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import {
  useCreateCountry,
  useDeleteCountry,
  useUpdateCountry,
} from '@/features/country/api'

type FormMode = 'create' | 'edit'

interface FormState {
  mode: FormMode
  editing: Country | null
}

interface UseCountryFormModalOptions {
  /** 저장 성공 후 호출. id는 저장된 국가의 id, mode는 동작 종류. */
  onSaved?: (id: string, mode: FormMode) => void
}

/** RHF 검증 통과 데이터를 API 페이로드로 변환 (population: bigint string) */
function toApiPayload(data: CountryFormData) {
  return {
    name: data.name,
    fullName: data.fullName,
    localName: data.localName,
    isoCode: data.isoCode,
    flagEmoji: data.flagEmoji,
    capital: data.capital,
    population: data.population != null ? String(data.population) : undefined,
    areaSqKm: data.areaSqKm,
    thumbnailUrl: data.thumbnailUrl ?? '',
    currencyId: data.currencyId,
    languageId: data.languageId,
    continentId: data.continentId,
    defaultNameDisplayOrder: data.defaultNameDisplayOrder,
  }
}

export function useCountryFormModal(opts: UseCountryFormModalOptions = {}) {
  const createMutation = useCreateCountry()
  const updateMutation = useUpdateCountry()
  const deleteMutation = useDeleteCountry()

  const [state, setState] = useState<FormState | null>(null)
  const onSavedRef = useRef(opts.onSaved)
  onSavedRef.current = opts.onSaved

  const openCreate = useCallback(
    () => setState({ mode: 'create', editing: null }),
    [],
  )
  const openEdit = useCallback(
    (country: Country) => setState({ mode: 'edit', editing: country }),
    [],
  )
  const close = useCallback(() => setState(null), [])

  const save = useCallback(
    async (data: CountryFormData & { id?: string }) => {
      const loadingToast = notify.loading(
        data.id ? '수정하는 중...' : '등록하는 중...',
      )
      try {
        const payload = toApiPayload(data)
        let savedId: string | undefined
        if (data.id) {
          const res = await updateMutation.mutateAsync({
            id: data.id,
            data: payload,
          })
          savedId = res.id ?? data.id
          notify.success('수정되었습니다', { id: loadingToast })
        } else {
          const res = await createMutation.mutateAsync(payload)
          savedId = res.id
          notify.success('등록되었습니다', { id: loadingToast })
        }
        setState(null)
        if (savedId) {
          onSavedRef.current?.(savedId, data.id ? 'edit' : 'create')
        }
      } catch (error) {
        notify.error(
          (data.id ? '수정 실패: ' : '등록 실패: ') + (error as Error).message,
          { id: loadingToast },
        )
        throw error
      }
    },
    [createMutation, updateMutation],
  )

  const remove = useCallback(
    async (id: string, name: string) => {
      if (
        !(await confirm({
          title: '삭제 확인',
          message: `"${name}"을(를) 삭제하시겠습니까?`,
          danger: true,
        }))
      )
        return
      const loadingToast = notify.loading('삭제하는 중...')
      try {
        await deleteMutation.mutateAsync(id)
        notify.success('삭제되었습니다', { id: loadingToast })
      } catch (err) {
        notify.error('삭제 실패: ' + (err as Error).message, { id: loadingToast })
      }
    },
    [deleteMutation],
  )

  return {
    mode: state?.mode ?? null,
    editing: state?.editing ?? null,
    isOpen: state !== null,
    openCreate,
    openEdit,
    close,
    save,
    remove,
  }
}
