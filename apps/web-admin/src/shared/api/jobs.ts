/**
 * 직업 API 서비스
 * Nestia SDK를 사용한 타입 안전한 직업 CRUD
 */

import * as jobsApi from '@api/functional/jobs'
import { apiConnection } from './client'

// SDK에서 생성된 타입 사용
export type JobResponseDto = Awaited<ReturnType<typeof jobsApi.getAll>>[number]
export type CreateJobDto = Parameters<typeof jobsApi.create>[1]
export type UpdateJobDto = Parameters<typeof jobsApi.update>[2]

/**
 * 모든 직업 조회
 */
export async function getAllJobs(): Promise<JobResponseDto[]> {
  try {
    const response = (await jobsApi.getAll(apiConnection)) as any
    // TransformInterceptor로 래핑된 응답에서 data 추출
    return response.data || response
  } catch (error) {
    throw error
  }
}

/**
 * 직업 상세 조회
 */
export async function getJobById(id: string): Promise<JobResponseDto> {
  try {
    const response = (await jobsApi.getById(apiConnection, id)) as any
    return response.data || response
  } catch (error) {
    throw error
  }
}

/**
 * 직업 생성
 */
export async function createJob(data: CreateJobDto): Promise<JobResponseDto> {
  try {
    const response = (await jobsApi.create(apiConnection, data)) as any
    return response.data || response
  } catch (error) {
    throw error
  }
}

/**
 * 직업 수정
 */
export async function updateJob(
  id: string,
  data: UpdateJobDto,
): Promise<JobResponseDto> {
  try {
    const response = (await jobsApi.update(apiConnection, id, data)) as any
    return response.data || response
  } catch (error) {
    throw error
  }
}

/**
 * 직업 삭제
 */
export async function deleteJob(id: string): Promise<void> {
  try {
    await jobsApi._delete(apiConnection, id)
  } catch (error) {
    throw error
  }
}
