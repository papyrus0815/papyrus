import { Injectable } from '@nestjs/common'
import { join } from 'path'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { AppConfigService } from '../config'

/** /uploads/images/ 로 시작하는 URL만 삭제 대상 (서버에 저장된 파일) */
const UPLOAD_IMAGE_PREFIX = '/uploads/images/'

@Injectable()
export class UploadService {
  constructor(private readonly configService: AppConfigService) {}

  /**
   * URL에 해당하는 업로드 파일을 디스크에서 삭제합니다.
   * - /uploads/images/... 형태의 로컬 경로만 삭제 (외부 URL은 무시)
   * - 파일이 없으면 무시
   */
  async deleteFileByUrl(url: string | null | undefined): Promise<void> {
    if (!url || typeof url !== 'string') return
    const trimmed = url.trim()
    if (!trimmed.startsWith(UPLOAD_IMAGE_PREFIX)) return

    const filename = trimmed
      .slice(UPLOAD_IMAGE_PREFIX.length)
      .replace(/^\/+/, '')
      .split('/')[0]
      ?.split('?')[0]
    if (!filename) return

    const uploadPath = this.configService.app.uploadPath
    const filePath = join(uploadPath, 'images', filename)

    if (!existsSync(filePath)) return
    try {
      await unlink(filePath)
    } catch {
      // 삭제 실패 시 로그만 하고 예외 전파하지 않음 (DB 업데이트는 진행)
    }
  }

  /**
   * 업로드 디렉터리 기준 상대 경로로 저장된 파일을 디스크에서 삭제합니다.
   * - Attachment.filePath 등 상대 경로 (예: images/xxx.png) 지원
   */
  async deleteFileByRelativePath(relativePath: string | null | undefined): Promise<void> {
    if (!relativePath || typeof relativePath !== 'string') return
    const trimmed = relativePath.trim().replace(/^\/+/, '')
    if (!trimmed) return

    const uploadPath = this.configService.app.uploadPath
    const filePath = join(uploadPath, trimmed)

    if (!existsSync(filePath)) return
    try {
      await unlink(filePath)
    } catch {
      // 삭제 실패 시 로그만 하고 예외 전파하지 않음
    }
  }
}
