import { Injectable, NotFoundException } from '@nestjs/common'
import { Person } from '@prisma/client'
import {
  IPersonRepository,
  CreatePersonData,
  UpdatePersonData,
} from '../domain/person.repository'
import { PersonPrismaRepository } from '../infrastructure/person.prisma.repository'

/**
 * 인물 도메인 서비스
 */
@Injectable()
export class PersonService {
  constructor(private readonly personRepository: PersonPrismaRepository) {}

  /**
   * 모든 인물 목록 조회
   */
  async findAll(): Promise<Person[]> {
    return this.personRepository.findAll()
  }

  /**
   * 모든 인물 목록 조회 (정부 직책 포함)
   */
  async findAllWithGovernmentPositions() {
    return this.personRepository.findAllWithGovernmentPositions()
  }

  /**
   * ID로 인물 조회
   */
  async findById(id: string): Promise<Person> {
    const person = await this.personRepository.findById(id)
    if (!person) {
      throw new NotFoundException(`인물을 찾을 수 없습니다 (ID: ${id})`)
    }
    return person
  }

  /**
   * ID로 인물 상세 조회 (관계 데이터 포함)
   */
  async findByIdWithRelations(id: string) {
    const person = await this.personRepository.findByIdWithRelations(id)
    if (!person) {
      throw new NotFoundException(`인물을 찾을 수 없습니다 (ID: ${id})`)
    }
    return person
  }

  /**
   * 인물 생성
   */
  async create(data: CreatePersonData): Promise<Person> {
    return this.personRepository.create(data)
  }

  /**
   * 인물 수정
   */
  async update(id: string, data: UpdatePersonData): Promise<Person> {
    await this.findById(id) // 존재 여부 확인
    return this.personRepository.update(id, data)
  }

  /**
   * 인물 삭제
   */
  async delete(id: string): Promise<void> {
    await this.findById(id) // 존재 여부 확인
    await this.personRepository.delete(id)
  }
}
