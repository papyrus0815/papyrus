export interface CreateDynastyDto {
  name: string
  description?: string
  startDate?: string
  endDate?: string
  /** `POST /upload/image?category=dynasties` 응답의 `url`(`/uploads/...`) */
  thumbnailUrl?: string | null
}

export interface UpdateDynastyDto {
  name?: string
  description?: string
  startDate?: string
  endDate?: string
  /** 새 파일 업로드 후의 `url`. `null`/빈 문자열이면 썸네일만 삭제. 생략 시 기존 유지 */
  thumbnailUrl?: string | null
}

export interface DynastyResponseDto {
  id: string
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  thumbnailUrl: string | null
  createdAt: string
  updatedAt: string
}
