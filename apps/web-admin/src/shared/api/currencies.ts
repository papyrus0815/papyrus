/**
 * 화폐 API 서비스 — Nestia SDK 기반 read-only
 */
import * as currenciesApi from '@api/functional/currencies'
import { apiConnection } from './client'

export type CurrencyResponseDto = Awaited<
  ReturnType<typeof currenciesApi.getAllCurrencies>
>[number]

export async function getAllCurrencies(): Promise<CurrencyResponseDto[]> {
  const response = (await currenciesApi.getAllCurrencies(apiConnection)) as any
  return response.data || response
}
