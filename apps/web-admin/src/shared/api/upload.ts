/**
 * 파일 업로드 API
 */

import { getApiConnection } from './client'

/** API가 돌려주는 업로드 경로 접두사 (외부 도메인의 /uploads/ 오인 방지) */
const UPLOADS_IMAGES_PREFIX = '/uploads/images/'

function apiOriginFromConnection(): string {
  const raw = getApiConnection().host.replace(/\/$/, '')
  if (!raw) return ''
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`
    return new URL(withProto).origin
  } catch {
    return ''
  }
}

/**
 * 업로드 이미지 URL을 API 기준 전체 URL로 변환.
 * - `getApiConnection().host`와 업로드 fetch가 동일 베이스를 쓰도록 함(api.service의 Electron 등 분기와 일치).
 * - 상대 경로(/uploads/...)에 API origin 부착.
 * - DB에 예전 호스트(예: localhost)로 저장된 절대 URL이 있어도, `/uploads/images/`면 현재 API로 재작성.
 */
export function getUploadImageUrl(path: string | null | undefined): string {
  if (!path || typeof path !== 'string') return ''
  const trimmed = path.trim()
  if (!trimmed) return ''

  const origin = apiOriginFromConnection()
  const base = origin || getApiConnection().host.replace(/\/$/, '')

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed)
      if (u.pathname.startsWith(UPLOADS_IMAGES_PREFIX) && origin) {
        return `${origin}${u.pathname}${u.search}`
      }
    } catch {
      /* keep trimmed */
    }
    return trimmed
  }

  if (!base) return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return trimmed.startsWith('/') ? `${base}${trimmed}` : `${base}/${trimmed}`
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

/** 이미지 업로드 시 저장할 하위 폴더 (용도별 분리) */
export type UploadImageCategory =
  | 'countries'
  | 'persons'
  | 'events'
  | 'ministries'
  | 'political-parties'
  | 'attachments'

/**
 * 이미지 업로드 (클라이언트 유효성 검사 후 전송)
 * @param file - 업로드할 이미지 파일
 * @param category - 용도별 폴더. 미지정 시 'attachments'
 */
export async function uploadImage(
  file: File,
  category: UploadImageCategory = 'attachments',
): Promise<UploadImageResponse> {
  validateImageFile(file)

  const formData = new FormData()
  formData.append('file', file)

  const conn = getApiConnection()
  const url = new URL(`${conn.host}/upload/image`)
  url.searchParams.set('category', category)

  // Authorization만 전달. Content-Type은 설정하지 않아 브라우저가 FormData에 맞게 boundary 포함해 설정하게 함.
  const headers: HeadersInit = {}
  if (conn.headers?.Authorization) {
    headers.Authorization = conn.headers.Authorization as string
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  })

  if (!response.ok) {
    const text = await response.text()
    let msg = text
    try {
      const json = JSON.parse(text)
      msg = json.message ?? json.error ?? text
    } catch {
      if (!text || text.length > 200) msg = `${response.status} ${response.statusText}`
    }
    throw new Error(`이미지 업로드 실패: ${response.status} ${response.statusText} - ${msg}`)
  }

  return response.json()
}

