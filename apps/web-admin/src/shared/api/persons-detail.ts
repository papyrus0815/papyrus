import * as personsApi from '@api/functional/persons/detail'
import { apiConnection } from './client'

/**
 * ID로 인물 상세 조회 (관계 데이터 포함)
 */
export async function getPersonDetailById(id: string) {
  try {
    const response = (await personsApi.getDetailById(apiConnection, id)) as any
    return response.data || response
  } catch (error) {
    throw error
  }
}

// 타입 export
export type PersonDetail = Awaited<ReturnType<typeof getPersonDetailById>>
