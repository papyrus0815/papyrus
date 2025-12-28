export interface JobCategoryResponseDto {
  id: string
  name: string
  thumbnailUrl: string | null
  parentId: string | null
  parent?: {
    id: string
    name: string
  }
  children?: Array<{
    id: string
    name: string
  }>
  jobCount?: number
  createdAt: string
  updatedAt: string
}

export interface CreateJobCategoryDto {
  name: string
  thumbnailUrl?: string
  parentId?: string
}

export interface UpdateJobCategoryDto {
  name?: string
  thumbnailUrl?: string
  parentId?: string
}


