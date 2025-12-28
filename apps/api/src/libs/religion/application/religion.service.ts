import { Injectable, NotFoundException } from '@nestjs/common'
import { ReligionRepository } from '../infrastructure/religion.repository'

@Injectable()
export class ReligionService {
  constructor(private readonly religionRepository: ReligionRepository) {}

  async findAll() {
    return this.religionRepository.findAll()
  }

  async findById(id: string) {
    const religion = await this.religionRepository.findById(id)
    if (!religion) {
      throw new NotFoundException(`Religion with ID ${id} not found`)
    }
    return religion
  }

  async create(data: {
    name: string
    description?: string
    foundationDate?: Date
  }) {
    return this.religionRepository.create(data)
  }

  async update(
    id: string,
    data: {
      name?: string
      description?: string
      foundationDate?: Date
    },
  ) {
    await this.findById(id) // 존재 여부 확인
    return this.religionRepository.update(id, data)
  }

  async delete(id: string) {
    await this.findById(id) // 존재 여부 확인
    return this.religionRepository.delete(id)
  }
}
