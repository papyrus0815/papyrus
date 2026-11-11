import { Injectable } from '@nestjs/common'
import { MilitaryUnitRepository } from '../infrastructure/military-unit.repository'
import type {
  CreateMilitaryUnitDto,
  CreateMilitaryUnitTransitionDto,
  UpdateMilitaryUnitDto,
  UpdateMilitaryUnitTransitionDto,
} from '../presentation/dto'

@Injectable()
export class MilitaryUnitService {
  constructor(private readonly repository: MilitaryUnitRepository) {}

  async findAll(filters?: {
    countryId?: string
    historicalCountryId?: string
    search?: string
    unitType?: string
    branch?: string
  }) {
    return this.repository.findAll(filters)
  }

  async findById(id: string) {
    return this.repository.findById(id)
  }

  async listTenures(id: string) {
    return this.repository.listTenures(id)
  }

  async listEvents(id: string) {
    return this.repository.listEvents(id)
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

  async addTransition(id: string, body: CreateMilitaryUnitTransitionDto) {
    return this.repository.addTransition(id, body)
  }

  async updateTransition(
    transitionId: string,
    body: UpdateMilitaryUnitTransitionDto,
  ) {
    return this.repository.updateTransition(transitionId, body)
  }

  async deleteTransition(transitionId: string) {
    return this.repository.deleteTransition(transitionId)
  }
}
