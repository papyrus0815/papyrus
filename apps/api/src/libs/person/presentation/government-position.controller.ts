import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { PersonService } from '../application/person.service'
import { CreateGovernmentPositionTenureDto } from './dto'

/**
 * 정부 직위/왕위 관리 컨트롤러
 */
@ApiTags('government-positions')
@Controller('government-positions')
export class GovernmentPositionController {
  constructor(private readonly personService: PersonService) {}

  /**
   * 국가원수/왕위 재임 기록 추가
   */
  @Post('tenures')
  async addTenure(@Body() dto: CreateGovernmentPositionTenureDto): Promise<any> {
    const result = await this.personService.addGovernmentPositionTenure(dto)
    
    // BigInt를 문자열로 변환하는 헬퍼 함수
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) {
          result[key] = serializeBigInt(obj[key])
        }
        return result
      }
      return obj
    }
    
    return serializeBigInt(result)
  }

  /**
   * 국가원수/왕위 재임 기록 수정
   */
  @Put('tenures/:id')
  async updateTenure(
    @Param('id') id: string,
    @Body() dto: Partial<CreateGovernmentPositionTenureDto>
  ): Promise<any> {
    const result = await this.personService.updateGovernmentPositionTenure(id, dto)
    
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) {
          result[key] = serializeBigInt(obj[key])
        }
        return result
      }
      return obj
    }
    
    return serializeBigInt(result)
  }

  /**
   * 국가원수/왕위 재임 기록 삭제
   */
  @Delete('tenures/:id')
  async deleteTenure(@Param('id') id: string): Promise<void> {
    await this.personService.deleteGovernmentPositionTenure(id)
  }
}
