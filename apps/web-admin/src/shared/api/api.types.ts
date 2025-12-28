// SDK 직접 사용 정책으로 전환: 불필요한 타입 별칭 제거
// 필요한 타입은 각 사용 파일에서 '@api'에서 직접 import 하세요.

// 공통 에러 타입만 유지 (React Query defaultError 등에 사용)
export interface ApiResponse<T = any> {
  data: T
  message?: string
  success: boolean
}

export interface ApiError {
  message: string
  status: number
  code?: string
}
