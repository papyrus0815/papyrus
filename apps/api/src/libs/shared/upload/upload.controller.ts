/**
 * 파일 업로드 컨트롤러
 * - 이미지는 용도별 + 연/월 폴더에 저장: images/{category}/{YYYY}/{MM}/
 *   (파일 수가 많아져도 디렉터리 분산, 보관·삭제 정책 적용 용이)
 */

import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiConsumes, ApiBody, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { AppConfigService } from '../config'
import { setUploadDirForMulter, uploadDirForMulter } from './upload-path.util'

/** 허용되는 이미지 업로드 카테고리 (저장 하위 폴더명) */
export const UPLOAD_IMAGE_CATEGORIES = [
  'countries',
  'persons',
  'events',
  'ministries',
  'political-parties',
  'attachments',
] as const
export type UploadImageCategory = (typeof UPLOAD_IMAGE_CATEGORIES)[number]

function isUploadImageCategory(s: unknown): s is UploadImageCategory {
  return typeof s === 'string' && UPLOAD_IMAGE_CATEGORIES.includes(s as UploadImageCategory)
}

/** 현재 시각 기준 연/월 (저장 경로용, 서버 로컬) */
function getDatePath(): { year: string; month: string } {
  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return { year, month }
}

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  private readonly uploadPath: string

  constructor(private readonly configService: AppConfigService) {
    this.uploadPath = this.configService.app.uploadPath
    setUploadDirForMulter(this.uploadPath)
    const imagePath = join(uploadDirForMulter, 'images')
    if (!existsSync(imagePath)) {
      mkdirSync(imagePath, { recursive: true })
    }
  }

  @Post('image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (
          req: Express.Request,
          _file: Express.Multer.File,
          cb: (error: Error | null, destination: string) => void,
        ) => {
          const raw =
            (req as unknown as { query?: { category?: string } }).query
              ?.category
          const category = isUploadImageCategory(raw) ? raw : 'attachments'
          const { year, month } = getDatePath()
          const imagePath = join(
            uploadDirForMulter,
            'images',
            category,
            year,
            month,
          )
          if (!existsSync(imagePath)) {
            mkdirSync(imagePath, { recursive: true })
          }
          cb(null, imagePath)
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9)
          const ext = extname(file.originalname)
          cb(null, `${uniqueSuffix}${ext}`)
        },
      }),
      fileFilter: (req, file, cb) => {
        const mimetypeOk =
          file.mimetype?.startsWith('image/') ||
          /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(
            file.originalname || '',
          )
        if (!mimetypeOk) {
          return cb(
            new Error('이미지 파일만 업로드할 수 있습니다.'),
            false,
          )
        }
        cb(null, true)
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  @ApiOperation({
    summary: '이미지 업로드 (category + 연/월 폴더에 저장)',
    description:
      '저장 경로: images/{category}/{YYYY}/{MM}/{filename}. 보관·삭제 정책 적용에 유리.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'category',
    required: false,
    enum: UPLOAD_IMAGE_CATEGORIES,
    description:
      '용도별 폴더. 미지정 시 attachments. countries|persons|events|ministries|attachments',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('category') category?: string,
  ): Promise<{
    url: string
    filename: string
    originalName: string
    size: number
    mimetype: string
  }> {
    if (!file) {
      throw new Error('파일이 업로드되지 않았습니다.')
    }

    const subdir = isUploadImageCategory(category) ? category : 'attachments'
    const { year, month } = getDatePath()
    const fileUrl = `/uploads/images/${subdir}/${year}/${month}/${file.filename}`

    return {
      url: fileUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    }
  }
}
