import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common'
import { MilitaryUnitService } from '../application/military-unit.service'
import type {
  MilitaryUnitDto,
  CreateMilitaryUnitDto,
  UpdateMilitaryUnitDto,
} from './dto'

@Controller('military-units')
export class MilitaryUnitController {
  constructor(private readonly militaryUnitService: MilitaryUnitService) {}

  /**
   * 모든 군부대 조회
   *
   * @tag military-units
   * @summary Get all military units
   * @returns 군부대 목록
   */
  @Get()
  async getAll(): Promise<any> {
    return this.militaryUnitService.findAll()
  }

  /**
   * 특정 군부대 조회
   *
   * @tag military-units
   * @summary Get military unit by ID
   * @param id 군부대 ID
   * @returns 군부대 상세 정보
   */
  @Get(':id')
  async getById(@Param('id') id: string): Promise<any> {
    return this.militaryUnitService.findById(id)
  }

  /**
   * 새로운 군부대 생성
   *
   * @tag military-units
   * @summary Create a new military unit
   * @param data 군부대 생성 데이터
   * @returns 생성된 군부대 정보
   */
  @Post()
  async create(@Body() data: CreateMilitaryUnitDto): Promise<any> {
    return this.militaryUnitService.create(data)
  }

  /**
   * 군부대 정보 수정
   *
   * @tag military-units
   * @summary Update military unit
   * @param id 군부대 ID
   * @param data 수정할 데이터
   * @returns 수정된 군부대 정보
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateMilitaryUnitDto,
  ): Promise<any> {
    return this.militaryUnitService.update(id, data)
  }

  /**
   * 군부대 삭제
   *
   * @tag military-units
   * @summary Delete military unit
   * @param id 군부대 ID
   */
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.militaryUnitService.delete(id)
  }
}
