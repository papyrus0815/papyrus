import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { ReligionService } from '../application/religion.service'
import {
  CreateReligionDto,
  UpdateReligionDto,
  ReligionResponseDto,
} from './dto'

/**
 * 종교 관리 컨트롤러
 */
@ApiTags('religions')
@Controller('religions')
export class ReligionController {
  constructor(private readonly religionService: ReligionService) {}

  /**
   * 모든 종교 목록 조회
   */
  @Get()
  async getAll(): Promise<ReligionResponseDto[]> {
    const religions = await this.religionService.findAll()
    return religions.map((religion) => ({
      id: religion.id,
      name: religion.name,
      description: religion.description,
      foundationDate: religion.foundationDate
        ? religion.foundationDate.toISOString()
        : null,
      createdAt: religion.createdAt.toISOString(),
      updatedAt: religion.updatedAt.toISOString(),
    }))
  }

  /**
   * ID로 종교 조회
   */
  @Get(':id')
  async getById(@Param('id') id: string): Promise<ReligionResponseDto> {
    const religion = await this.religionService.findById(id)
    return {
      id: religion.id,
      name: religion.name,
      description: religion.description,
      foundationDate: religion.foundationDate
        ? religion.foundationDate.toISOString()
        : null,
      createdAt: religion.createdAt.toISOString(),
      updatedAt: religion.updatedAt.toISOString(),
    }
  }

  /**
   * 종교 생성
   */
  @Post()
  async create(@Body() dto: CreateReligionDto): Promise<ReligionResponseDto> {
    const religion = await this.religionService.create({
      name: dto.name,
      description: dto.description,
      foundationDate: dto.foundationDate
        ? new Date(dto.foundationDate)
        : undefined,
    })

    return {
      id: religion.id,
      name: religion.name,
      description: religion.description,
      foundationDate: religion.foundationDate
        ? religion.foundationDate.toISOString()
        : null,
      createdAt: religion.createdAt.toISOString(),
      updatedAt: religion.updatedAt.toISOString(),
    }
  }

  /**
   * 종교 수정
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReligionDto,
  ): Promise<ReligionResponseDto> {
    const religion = await this.religionService.update(id, {
      name: dto.name,
      description: dto.description,
      foundationDate: dto.foundationDate
        ? new Date(dto.foundationDate)
        : undefined,
    })

    return {
      id: religion.id,
      name: religion.name,
      description: religion.description,
      foundationDate: religion.foundationDate
        ? religion.foundationDate.toISOString()
        : null,
      createdAt: religion.createdAt.toISOString(),
      updatedAt: religion.updatedAt.toISOString(),
    }
  }

  /**
   * 종교 삭제
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.religionService.delete(id)
  }
}
