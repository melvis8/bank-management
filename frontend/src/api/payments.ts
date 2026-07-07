import { api } from './client'
import type { CamerpayAdminPayment, CamerpayPayment, InitiatePaymentPayload } from '@/types'

export interface InitiatePaymentResult {
  account_number: string
  amount: number
  new_balance: number
  reference: string
  status: string
}

export interface VerifyPaymentResult {
  reference: string
  amount: number
  currency: string
  status: string
  created_at: string
}

export interface RefundPaymentResult {
  reference: string
  refunded_amount: number
  new_balance: number
}

export interface PaymentHistoryFilters {
  page?: number
  limit?: number
}

export const paymentsApi = {
  initiate: (payload: InitiatePaymentPayload) =>
    api.post<InitiatePaymentResult>('/payments/initiate', payload),
  verify: (reference: string) => api.get<VerifyPaymentResult>(`/payments/verify/${reference}`),
  history: (filters: PaymentHistoryFilters = {}) =>
    api.getPaginated<CamerpayPayment>('/payments/history', { page: filters.page, limit: filters.limit }),
  refund: (reference: string) => api.post<RefundPaymentResult>(`/payments/refund/${reference}`),
  // Admin-only
  adminList: (filters: PaymentHistoryFilters = {}) =>
    api.getPaginated<CamerpayAdminPayment>('/payments/admin', { page: filters.page, limit: filters.limit }),
}
