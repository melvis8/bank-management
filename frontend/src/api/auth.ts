import { api } from './client'
import type { AuthUser, LoginPayload, LoginResponse, RegisterPayload, User } from '@/types'

export const authApi = {
  login: (payload: LoginPayload) => api.postFull<LoginResponse>('/auth/login', payload),
  register: (payload: RegisterPayload) =>
    api.post<Pick<User, 'id' | 'user_id' | 'email' | 'first_name' | 'last_name' | 'phone' | 'role'>>(
      '/auth/register',
      payload
    ),
}

export type { AuthUser }
