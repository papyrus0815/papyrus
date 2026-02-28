/**
 * /uploads/* 요청 시 업로드 파일 서빙. Nest 미들웨어로 등록해 라우터보다 먼저 실행.
 */

import { Injectable, NestMiddleware } from '@nestjs/common'
import type { Request, Response, NextFunction } from 'express'
import { AppConfigService } from '../config'
import {
  getUploadDirCandidates,
  findUploadFilePath,
} from './upload-path.util'

@Injectable()
export class UploadServeMiddleware implements NestMiddleware {
  private readonly candidates: string[]

  constructor(private readonly config: AppConfigService) {
    this.candidates = getUploadDirCandidates(this.config.app.uploadPath)
  }

  use(req: Request, res: Response, next: NextFunction): void {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next()
    }
    const pathname = (req.originalUrl || req.url || '').split('?')[0]
    if (!pathname.startsWith('/uploads/') && pathname !== '/uploads') {
      return next()
    }
    const subpath = pathname.replace(/^\/uploads\/?/, '').replace(/\/+/g, '/')
    if (!subpath || subpath.includes('..')) {
      res.status(400).send('Invalid path')
      return
    }
    const filePath = findUploadFilePath(this.candidates, subpath)
    if (!filePath) {
      res.status(404).send('Not found')
      return
    }
    res.sendFile(filePath, (err: Error | null) => {
      if (err && !res.headersSent) res.status(500).send('Error')
    })
  }
}
