import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

@ApiTags('root')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API 루트 엔드포인트' })
  @ApiResponse({
    status: 200,
    description: 'API 정보',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        version: { type: 'string' },
        description: { type: 'string' },
        endpoints: {
          type: 'object',
          properties: {
            health: { type: 'string' },
            docs: { type: 'string' },
          },
        },
      },
    },
  })
  getRoot() {
    return {
      name: 'Papyrus API',
      version: '2.0.0',
      description: 'Historical database management API with advanced features',
      endpoints: {
        health: '/health',
        docs: '/api-docs',
      },
    }
  }
}
