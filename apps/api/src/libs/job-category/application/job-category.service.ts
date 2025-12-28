import { Injectable, NotFoundException } from '@nestjs/common'
import { JobCategoryRepository } from '../infrastructure/job-category.repository'

@Injectable()
export class JobCategoryService {
  constructor(
    private readonly jobCategoryRepository: JobCategoryRepository,
  ) {}

  async findAll() {
    return this.jobCategoryRepository.findAll()
  }

  async findById(id: string) {
    const category = await this.jobCategoryRepository.findById(id)
    if (!category) {
      throw new NotFoundException(`JobCategory with ID ${id} not found`)
    }
    return category
  }

  async create(data: {
    name: string
    thumbnailUrl?: string
    parentId?: string
  }) {
    return this.jobCategoryRepository.create(data)
  }

  async update(
    id: string,
    data: {
      name?: string
      thumbnailUrl?: string
      parentId?: string
    },
  ) {
    await this.findById(id)
    return this.jobCategoryRepository.update(id, data)
  }

  async delete(id: string) {
    await this.findById(id)
    return this.jobCategoryRepository.delete(id)
  }
}


