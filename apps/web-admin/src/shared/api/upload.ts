/**
 * 파일 업로드 API
 */

const getApiHost = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL

  if (envUrl === '') {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return origin
  }

  if (envUrl) {
    return envUrl
  }

  return 'http://localhost:8000'
}

export interface UploadImageResponse {
  url: string
  filename: string
  originalName: string
  size: number
  mimetype: string
}

/** 허용 이미지 MIME 타입 접두사 */
const IMAGE_MIME_PREFIX = 'image/'

/** 허용 이미지 확장자 (mimetype 없을 때 fallback) */
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i

/** 최대 파일 크기 (10MB, 서버와 동일) */
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

/**
 * 이미지 파일 클라이언트 유효성 검사
 * - 업로드 전 호출하여 즉시 피드백 가능
 */
export function validateImageFile(file: File): void {
  if (!file || !(file instanceof File)) {
    throw new Error('파일을 선택해주세요.')
  }
  const mimetypeOk =
    file.type?.startsWith(IMAGE_MIME_PREFIX) ||
    IMAGE_EXTENSIONS.test(file.name || '')
  if (!mimetypeOk) {
    throw new Error('이미지 파일만 업로드할 수 있습니다. (jpg, png, gif, webp 등)')
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`파일 크기는 ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB 이하여야 합니다.`)
  }
}

/**
 * 이미지 업로드 (클라이언트 유효성 검사 후 전송)
 */
export async function uploadImage(
  file: File,
): Promise<UploadImageResponse> {
  validateImageFile(file)

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${getApiHost()}/upload/image`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`이미지 업로드 실패: ${error}`)
  }

  return response.json()
}

