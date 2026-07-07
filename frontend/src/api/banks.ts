import { api } from './client'
import type { Bank, CreateBankPayload } from '@/types'

export const banksApi = {
  list: () => api.get<Bank[]>('/banks'),
  getById: (id: string) => api.get<Bank>(`/banks/${id}`),
  // Admin-only
  create: (payload: CreateBankPayload) => api.post<Bank>('/banks', payload),
  update: (id: string, payload: Partial<CreateBankPayload>) => api.put<Bank>(`/banks/${id}`, payload),
  remove: (id: string) => api.delete(`/banks/${id}`),
}
