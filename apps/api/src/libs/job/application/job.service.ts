import { Injectable, NotFoundException } from '@nestjs/common'
import { JobRepository } from '../infrastructure/job.repository'

@Injectable()
export class JobService {
  constructor(private readonly jobRepository: JobRepository) {}

  async findAll() {
    return this.jobRepository.findAll()
  }

  async findById(id: string) {
    const job = await this.jobRepository.findById(id)
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`)
    }
    return job
  }

  async create(data: {
    title: string
    description?: string
    thumbnailUrl?: string
    categoryId: string
  }) {
    return this.jobRepository.create(data)
  }

  async update(
    id: string,
    data: {
      title?: string
      description?: string
      thumbnailUrl?: string
      categoryId?: string
    },
  ) {
    await this.findById(id)
    return this.jobRepository.update(id, data)
  }

  async delete(id: string) {
    await this.findById(id)
    return this.jobRepository.delete(id)
  }
}
