import { Injectable, NotFoundException } from '@nestjs/common'
import { DynastyRepository } from '../infrastructure/dynasty.repository'

@Injectable()
export class DynastyService {
  constructor(private readonly dynastyRepository: DynastyRepository) {}

  async findAll() {
    return this.dynastyRepository.findAll()
  }

  async findById(id: string) {
    const dynasty = await this.dynastyRepository.findById(id)
    if (!dynasty) {
      throw new NotFoundException(`Dynasty with ID ${id} not found`)
    }
    return dynasty
  }

  async create(data: {
    name: string
    description?: string
    startDate?: Date
    endDate?: Date
    thumbnailUrl?: string
  }) {
    return this.dynastyRepository.create(data)
  }

  async update(
    id: string,
    data: {
      name?: string
      description?: string
      startDate?: Date
      endDate?: Date
      thumbnailUrl?: string
    },
  ) {
    await this.findById(id)
    return this.dynastyRepository.update(id, data)
  }

  async delete(id: string) {
    await this.findById(id)
    return this.dynastyRepository.delete(id)
  }
}
