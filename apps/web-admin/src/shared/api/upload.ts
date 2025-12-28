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

/**
 * 이미지 업로드
 */
export async function uploadImage(
  file: File,
): Promise<UploadImageResponse> {
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

