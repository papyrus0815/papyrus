/** 가문 대표 썸네일 attachment.title (고정값) */
export const DYNASTY_THUMBNAIL_ATTACHMENT_TITLE = 'dynasty-thumbnail'

/**
 * 클라이언트가 보내는 값(업로드 API의 url 등)을 attachment.file_path에 넣을 형태로 변환.
 * - `/uploads/images/...` → `images/...` (업로드 루트 기준 상대)
 * - 외부 URL은 그대로(최대 길이는 DB에서 제한)
 */
export function clientThumbnailInputToStoredFilePath(input: string): string {
  const t = input.trim()
  if (!t) return ''
  if (t.startsWith('/uploads/')) {
    return t.slice('/uploads/'.length).replace(/^\/+/, '')
  }
  return t.replace(/^\/+/, '')
}

/** attachment.file_path → API·클라이언트용 썸네일 URL */
export function storedFilePathToThumbnailUrl(filePath: string): string | null {
  const fp = filePath.trim()
  if (!fp) return null
  if (fp.startsWith('http://') || fp.startsWith('https://')) return fp
  if (fp.startsWith('/uploads/')) return fp
  return `/uploads/${fp.replace(/^\/+/, '')}`
}
