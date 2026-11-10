import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { PrismaService } from '@prisma/prisma.service'
import { serializeElectionBigInt } from '../election-serialize.util'

export interface CreateLawTypeBody {
  name: string
  description?: string | null
}

@ApiTags('law-types')
@Controller('law-types')
@UseGuards(AuthGuard('jwt'))
export class LawTypeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(): Promise<any> {
    const rows = await this.prisma.lawType.findMany({
      orderBy: { name: 'asc' },
    })
    return serializeElectionBigInt(rows)
  }

  @Post()
  async create(
    @Body() body: CreateLawTypeBody,
  ): Promise<any> {
    const name = body.name?.trim()
    if (!name) throw new BadRequestException('법 유형 이름을 입력하세요.')
    if (this.prisma.lawType?.findFirst) {
      const existing = await this.prisma.lawType.findFirst({
        where: { name },
        select: { id: true },
      })
      if (existing) {
        throw new ConflictException('이미 동일한 이름의 법 유형이 존재합니다.')
      }
    }
    const row = await this.prisma.lawType.create({
      data: {
        name,
        description: body.description?.trim() || undefined,
      },
    })
    return serializeElectionBigInt(row)
  }
}
