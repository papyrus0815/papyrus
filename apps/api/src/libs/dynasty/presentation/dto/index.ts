export interface CreateDynastyDto {
  name: string
  description?: string
  startDate?: string
  endDate?: string
  thumbnailUrl?: string
}

export interface UpdateDynastyDto {
  name?: string
  description?: string
  startDate?: string
  endDate?: string
  thumbnailUrl?: string
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
