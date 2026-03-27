import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { PrismaService } from '@prisma/prisma.service'
import { serializeElectionBigInt } from '../election-serialize.util'

@ApiTags('law-types')
@Controller('law-types')
@UseGuards(AuthGuard('jwt'))
export class LawTypeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const rows = await this.prisma.lawType.findMany({
      orderBy: { name: 'asc' },
    })
    return serializeElectionBigInt(rows)
  }

  @Post()
  async create(
    @Body() body: { name: string; description?: string | null },
  ) {
    const name = body.name?.trim()
    if (!name) throw new BadRequestException('법 유형 이름을 입력하세요.')
    const row = await this.prisma.lawType.create({
      data: {
        name,
        description: body.description?.trim() || undefined,
      },
    })
    return serializeElectionBigInt(row)
  }
}
