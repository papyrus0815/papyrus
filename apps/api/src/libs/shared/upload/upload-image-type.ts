import { extname } from 'path'
import type { Response } from 'express'

/**
 * 업로드 허용 이미지 형식 — MIME → 저장 확장자.
 *
 * 저장 확장자는 원본 파일명이 아니라 여기서 정한다. 원본 확장자를 그대로 쓰면 `x.html`을
 * `image/png`로 올려 `.html`로 저장시킨 뒤, 같은 오리진의 /uploads에서 문서로 열게 할 수 있었다.
 * SVG는 실제로 쓰이므로 허용하되, 서빙 쪽 헤더(setUploadServeHeaders)로 스크립트를 막는다.
 */
const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
}

/** 원본 파일명 확장자로 받아 주는 것 — MIME과 짝이 맞아야 한다 */
const ACCEPTED_ORIGINAL_EXTENSIONS: Record<string, readonly string[]> = {
  '.jpg': ['.jpg', '.jpeg', '.jfif'],
  '.png': ['.png'],
  '.gif': ['.gif'],
  '.webp': ['.webp'],
  '.bmp': ['.bmp'],
  '.avif': ['.avif'],
  '.svg': ['.svg'],
}

/**
 * 허용되는 이미지면 저장할 확장자, 아니면 null.
 * MIME(클라이언트가 보낸 값)과 원본 확장자가 **둘 다** 허용 목록에 있고 서로 맞아야 한다 —
 * 예전엔 둘 중 하나만 맞으면 통과했다.
 */
export function resolveImageExtension(
  mimetype: string | undefined,
  originalName: string | undefined,
): string | null {
  const extension = mimetype ? IMAGE_EXTENSION_BY_MIME[mimetype.toLowerCase()] : undefined
  if (!extension) return null
  const original = extname(originalName ?? '').toLowerCase()
  return ACCEPTED_ORIGINAL_EXTENSIONS[extension].includes(original) ? extension : null
}

/**
 * /uploads 응답 헤더 — 업로드 파일은 사용자가 올린 것이라 문서로 실행되면 안 된다.
 * - nosniff: 확장자가 말하는 형식으로만 읽게(이미지를 HTML로 추측하지 않게)
 * - CSP sandbox: SVG를 주소창으로 직접 열어도 스크립트가 돌지 않게. <img>로 쓰는 데는 영향 없음.
 */
export function setUploadServeHeaders(res: Response): void {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox",
  )
}
