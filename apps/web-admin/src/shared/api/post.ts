/**
 * 글(Post) API — 백엔드 /posts 사용 (컨트롤러 @Controller('posts'))
 * 404 나면 API 재빌드 후 서버 재시작 필요
 */
import * as curationsApi from '@api/functional/curations'

import { getApiConnection } from './client'

export interface PostItem {
  id: string
  userId: string
  keywords?: string
  title: string
  content: string
  visibility: string
  status: string
  viewCount: number
  likeCount: number
  commentCount: number
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

export interface PostListResponse {
  curations: PostItem[]
  total: number
}

export interface CreatePostDto {
  title: string
  content: string
  keywords?: string
  visibility?: string
  publish?: boolean
}

export interface UpdatePostDto {
  title?: string
  content?: string
  keywords?: string
  visibility?: string
}

/** 목록 조회 (관리자) */
export async function getPostList(params?: {
  page?: number
  pageSize?: number
  status?: string
  orderBy?: 'createdAt' | 'publishedAt' | 'viewCount' | 'likeCount'
  order?: 'asc' | 'desc'
}): Promise<PostListResponse> {
  const conn = getApiConnection()
  const search = new URLSearchParams()
  if (params?.page != null) search.set('page', String(params.page))
  if (params?.pageSize != null) search.set('pageSize', String(params.pageSize))
  if (params?.status) search.set('status', params.status)
  if (params?.orderBy) search.set('orderBy', params.orderBy)
  if (params?.order) search.set('order', params.order)
  const url = `${conn.host}/posts?${search.toString()}`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(conn.headers?.Authorization && { Authorization: conn.headers.Authorization }),
    },
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return {
    curations: data.curations ?? data?.data?.curations ?? [],
    total: data.total ?? data?.data?.total ?? 0,
  }
}

/** 단건 조회 */
export async function getPostById(id: string): Promise<PostItem> {
  const conn = getApiConnection()
  const data = await curationsApi.findById(conn, id)
  const raw = (data as any)?.data ?? data
  return Array.isArray(raw) ? raw[0] : raw
}

/** 생성 */
export async function createPost(dto: CreatePostDto): Promise<PostItem> {
  const conn = getApiConnection()
  const data = await curationsApi.create(conn, dto as any)
  const raw = (data as any)?.data ?? data
  return Array.isArray(raw) ? raw[0] : raw
}

/** 수정 */
export async function updatePost(id: string, dto: UpdatePostDto): Promise<PostItem> {
  const conn = getApiConnection()
  const data = await curationsApi.update(conn, id, dto as any)
  const raw = (data as any)?.data ?? data
  return Array.isArray(raw) ? raw[0] : raw
}

/** 삭제 */
export async function deletePost(id: string): Promise<void> {
  const conn = getApiConnection()
  await curationsApi._delete(conn, id)
}
