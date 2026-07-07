import { api } from './client'
import type { Account, CreateUserPayload, UpdateUserPayload, User } from '@/types'

export interface UserWithAccounts extends User {
  accounts: Account[]
}

export const usersApi = {
  // /users/:id embeds raw account rows — balance comes back as a Postgres
  // NUMERIC string (see api/accounts.ts), so normalize it here too.
  getById: (id: string) =>
    api.get<UserWithAccounts>(`/users/${id}`).then((u) => ({
      ...u,
      accounts: u.accounts.map((a) => ({ ...a, balance: Number(a.balance) })),
    })),
  // Admin-only
  listAll: () => api.get<User[]>('/users'),
  create: (payload: CreateUserPayload) => api.post<User>('/users', payload),
  update: (id: string, payload: UpdateUserPayload) => api.put<User>(`/users/${id}`, payload),
  remove: (id: string) => api.delete(`/users/${id}`),
  removeAll: () => api.delete('/users'),
}
