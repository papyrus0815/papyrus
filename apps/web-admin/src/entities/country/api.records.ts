/**
 * 국가 기록(CountryRecord) React Query 훅.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as recordsApi from '@/shared/api/country-records'
import type {
  CountryRecord,
  CreateCountryRecordInput,
  UpdateCountryRecordInput,
} from '@/shared/api/country-records'

export type { CountryRecord, CreateCountryRecordInput, UpdateCountryRecordInput }

export const countryRecordKeys = {
  list: (countryId: string) => ['countries', countryId, 'records'] as const,
}

export function useCountryRecords(countryId: string | null | undefined) {
  return useQuery<CountryRecord[]>({
    queryKey: countryRecordKeys.list(countryId ?? ''),
    queryFn: () => recordsApi.getCountryRecords(countryId!),
    enabled: !!countryId,
  })
}

export function useCreateCountryRecord(countryId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateCountryRecordInput) =>
      recordsApi.createCountryRecord(countryId, dto),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: countryRecordKeys.list(countryId) }),
  })
}

export function useUpdateCountryRecord(countryId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      recordId,
      dto,
    }: {
      recordId: string
      dto: UpdateCountryRecordInput
    }) => recordsApi.updateCountryRecord(countryId, recordId, dto),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: countryRecordKeys.list(countryId) }),
  })
}

export function useDeleteCountryRecord(countryId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (recordId: string) =>
      recordsApi.deleteCountryRecord(countryId, recordId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: countryRecordKeys.list(countryId) }),
  })
}
