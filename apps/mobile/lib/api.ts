import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { getAccessToken, clearTokens } from './auth-storage'

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL

if (!baseURL) {
  console.warn('[api] EXPO_PUBLIC_API_BASE_URL is not set — API calls will fail')
}

export const api = axios.create({
  baseURL,
  timeout: 15000,
})

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

let onUnauthorized: (() => void) | null = null
export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    if (err.response?.status === 401) {
      await clearTokens()
      onUnauthorized?.()
    }
    return Promise.reject(err)
  },
)
