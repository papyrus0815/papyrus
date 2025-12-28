import apiClient from './client'

export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  email: string
  password: string
  displayName: string
  bio?: string
}

export interface UserResponse {
  id: string
  email: string
  displayName: string
  bio?: string
  profileImageUrl?: string
  role: string
  followerCount: number
  followingCount: number
  curationCount: number
}

export const authApi = {
  login: async (data: LoginDto) => {
    const response = await apiClient.post<{ user: UserResponse; accessToken: string }>('/users/login', data)
    // TransformInterceptor가 { success, data } 형식으로 감싸므로 response.data.data로 접근
    return (response.data as any).data || response.data
  },

  register: async (data: RegisterDto) => {
    const response = await apiClient.post<UserResponse>('/users/register', data)
    return (response.data as any).data || response.data
  },

  getMe: async () => {
    const response = await apiClient.get<UserResponse>('/users/me')
    return (response.data as any).data || response.data
  },
}

