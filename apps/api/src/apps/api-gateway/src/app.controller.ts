import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { join } from 'path'
import { existsSync, readdirSync } from 'fs'
import { AppConfigService } from '../../../libs/shared/config/index'
import { getUploadDirCandidates } from '../../../libs/shared/upload/upload-path.util'

@ApiTags('root')
@Controller()
export class AppController {
  constructor(private readonly config: AppConfigService) {}

  @Get('uploads/check')
  @ApiOperation({ summary: '업로드 경로 확인 (디버그)' })
  uploadsCheck(): {
    uploadPath: string
    resolvedPath: string
    imagesDirExists: boolean
    sampleFiles: string[]
    cwd: string
  } {
    const configPath = this.config.app.uploadPath
    const candidates = getUploadDirCandidates(configPath)
    const resolvedPath =
      candidates.find((d) => existsSync(d)) ?? candidates[0]
    const imagesDir = join(resolvedPath, 'images')
    const imagesDirExists = existsSync(imagesDir)
    let sampleFiles: string[] = []
    if (imagesDirExists) {
      try {
        const entries = readdirSync(imagesDir, { withFileTypes: true })
        sampleFiles = entries.filter((e) => e.isFile()).map((e) => e.name).slice(0, 10)
        // 하위 디렉터리( countries/2025/02 등) 안의 파일도 샘플로
        for (const e of entries) {
          if (e.isDirectory() && sampleFiles.length < 10) {
            const sub = readdirSync(join(imagesDir, e.name), { withFileTypes: true })
              .filter((f) => f.isFile())
              .slice(0, 2)
              .map((f) => `${e.name}/${f.name}`)
            sampleFiles.push(...sub)
          }
        }
      } catch {
        sampleFiles = []
      }
    }
    return {
      uploadPath: configPath,
      resolvedPath,
      imagesDirExists,
      sampleFiles,
      cwd: process.cwd(),
    }
  }

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
  getRoot(): {
    name: string
    version: string
    description: string
    endpoints: {
      health: string
      docs: string
    }
  } {
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
