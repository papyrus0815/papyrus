import { Injectable } from '@nestjs/common'
import { MilitaryUnitRepository } from '../infrastructure/military-unit.repository'
import type {
  CreateMilitaryUnitDto,
  UpdateMilitaryUnitDto,
} from '../presentation/dto'

@Injectable()
export class MilitaryUnitService {
  constructor(private readonly repository: MilitaryUnitRepository) {}

  async findAll() {
    return this.repository.findAll()
  }

  async findById(id: string) {
    return this.repository.findById(id)
  }

  async create(data: CreateMilitaryUnitDto) {
    return this.repository.create(data)
  }

  async update(id: string, data: UpdateMilitaryUnitDto) {
    return this.repository.update(id, data)
  }

  async delete(id: string) {
    return this.repository.delete(id)
  }
}
