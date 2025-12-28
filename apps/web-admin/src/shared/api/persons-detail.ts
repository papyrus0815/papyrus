import * as personsApi from '@api/functional/persons/detail'
import { apiConnection } from './client'

/**
 * ID로 인물 상세 조회 (관계 데이터 포함)
 */
export async function getPersonDetailById(id: string) {
  try {
    console.log('🔍 인물 상세 조회 요청:', id)
    const response = (await personsApi.getDetailById(apiConnection, id)) as any
    console.log('✅ 인물 상세 조회 응답:', response)
    const result = response.data || response
    console.log('📦 최종 데이터:', result)
    return result
  } catch (error) {
    console.error(`❌ 인물 상세 조회 실패 (ID: ${id}):`, error)
    throw error
  }
}

// 타입 export
export type PersonDetail = Awaited<ReturnType<typeof getPersonDetailById>>
