/**
 * 파일 업로드 컨트롤러
 */

import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { AppConfigService } from '../config'

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  private readonly uploadPath: string

  constructor(private readonly configService: AppConfigService) {
    // 생성자에서 uploadPath를 미리 계산하여 저장
    this.uploadPath = this.configService.app.uploadPath
    
    // 업로드 디렉토리가 없으면 생성
    const imagePath = join(this.uploadPath, 'images')
    if (!existsSync(imagePath)) {
      mkdirSync(imagePath, { recursive: true })
    }
  }

  @Post('image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (() => {
          // uploadPath를 클로저로 캡처 (생성자에서 이미 설정됨)
          const uploadPath = (this as unknown as UploadController).uploadPath || './uploads'
          return (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
            const imagePath = join(uploadPath, 'images')

            // 디렉토리가 없으면 생성
            if (!existsSync(imagePath)) {
              mkdirSync(imagePath, { recursive: true })
            }

            cb(null, imagePath)
          }
        }).bind(this)(),
        filename: (req, file, cb) => {
          // 고유한 파일명 생성
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9)
          const ext = extname(file.originalname)
          cb(null, `${uniqueSuffix}${ext}`)
        },
      }),
      fileFilter: (req, file, cb) => {
        // 이미지 파일만 허용 (mimetype이 image/로 시작하거나, 없을 때 확장자로 판단)
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
  @ApiOperation({ summary: '이미지 업로드' })
  @ApiConsumes('multipart/form-data')
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

    // 파일 URL 반환 (정적 파일 서빙 경로)
    const fileUrl = `/uploads/images/${file.filename}`

    return {
      url: fileUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    }
  }
}
