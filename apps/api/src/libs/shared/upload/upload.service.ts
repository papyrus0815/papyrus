import { Injectable } from '@nestjs/common'
import { unlink } from 'fs/promises'
import { AppConfigService } from '../config'
import {
  getUploadDirCandidates,
  findUploadFilePath,
} from './upload-path.util'

/** /uploads/images/ 로 시작하는 URL만 삭제 대상 (서버에 저장된 파일) */
const UPLOAD_IMAGE_PREFIX = '/uploads/images/'

@Injectable()
export class UploadService {
  private readonly uploadCandidates: string[]

  constructor(private readonly configService: AppConfigService) {
    this.uploadCandidates = getUploadDirCandidates(
      this.configService.app.uploadPath,
    )
  }

  /**
   * URL에 해당하는 업로드 파일을 디스크에서 삭제합니다.
   * - /uploads/images/... 형태의 로컬 경로만 삭제 (외부 URL은 무시)
   * - 후보 경로에서 실제 파일 위치를 찾아 삭제 (레거시·이전 저장 위치 대응)
   */
  async deleteFileByUrl(url: string | null | undefined): Promise<void> {
    if (!url || typeof url !== 'string') return
    const trimmed = url.trim()
    if (!trimmed.startsWith(UPLOAD_IMAGE_PREFIX)) return

    const relativePath = trimmed
      .slice(UPLOAD_IMAGE_PREFIX.length)
      .replace(/^\/+/, '')
      .split('?')[0]
      .replace(/\/+/g, '/')
    if (!relativePath) return

    const subpath = `images/${relativePath}`
    const filePath = findUploadFilePath(this.uploadCandidates, subpath)
    if (!filePath) return
    try {
      await unlink(filePath)
    } catch {
      // 삭제 실패 시 로그만 하고 예외 전파하지 않음 (DB 업데이트는 진행)
    }
  }

  /**
   * 업로드 디렉터리 기준 상대 경로로 저장된 파일을 디스크에서 삭제합니다.
   * - Attachment.filePath 등 상대 경로 (예: images/xxx.png) 지원
   * - 후보 경로에서 실제 파일 위치를 찾아 삭제
   */
  async deleteFileByRelativePath(
    relativePath: string | null | undefined,
  ): Promise<void> {
    if (!relativePath || typeof relativePath !== 'string') return
    const trimmed = relativePath.trim().replace(/^\/+/, '').replace(/\/+/g, '/')
    if (!trimmed) return

    const filePath = findUploadFilePath(this.uploadCandidates, trimmed)
    if (!filePath) return
    try {
      await unlink(filePath)
    } catch {
      // 삭제 실패 시 로그만 하고 예외 전파하지 않음
    }
  }
}
