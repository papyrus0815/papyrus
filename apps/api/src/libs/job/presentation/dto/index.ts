export interface JobCategoryDto {
  id: string
  name: string
  thumbnailUrl: string | null
}

export interface JobResponseDto {
  id: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  categoryId: string
  category?: JobCategoryDto
  createdAt: string
  updatedAt: string
}

export interface CreateJobDto {
  title: string
  description?: string
  thumbnailUrl?: string
  categoryId: string
}

export interface UpdateJobDto {
  title?: string
  description?: string
  thumbnailUrl?: string
  categoryId?: string
}
