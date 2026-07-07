import { api } from './client'
import type { AdminTransaction, DepositPayload, Transaction, TransactionStatus, TransactionType, TransferPayload, WithdrawPayload } from '@/types'

export interface DepositResult {
  account_number: string
  bank: string
  deposited: number
  new_balance: number
}

export interface WithdrawResult {
  account_number: string
  bank: string
  withdrawn: number
  fee_applied: number
  total_deducted: number
  new_balance: number
}

export interface TransferResult {
  sender_account_number: string
  recipient_account_number: string
  amount: number
  sender_new_balance: number
}

export interface TransactionHistoryFilters {
  page?: number
  limit?: number
}

export interface AdminTransactionFilters {
  page?: number
  limit?: number
  type?: TransactionType
  status?: TransactionStatus
}

// Postgres NUMERIC columns (amount, fee) come back from `pg` as strings — see
// the same note in api/accounts.ts. The deposit/withdraw/transfer results
// above don't need this: the backend computes those with JS arithmetic
// (parseFloat + ...), so they're already real numbers in the JSON response.
const normalizeTransaction = (tx: Transaction): Transaction => ({
  ...tx,
  amount: Number(tx.amount),
  fee: Number(tx.fee),
})

export const transactionsApi = {
  deposit: (payload: DepositPayload) => api.post<DepositResult>('/transactions/deposit', payload),
  withdraw: (payload: WithdrawPayload) => api.post<WithdrawResult>('/transactions/withdraw', payload),
  transfer: (payload: TransferPayload) => api.post<TransferResult>('/transactions/transfer', payload),
  history: (accountNumber: string, filters: TransactionHistoryFilters = {}) =>
    api
      .getPaginated<Transaction>(`/transactions/history/${accountNumber}`, {
        page: filters.page,
        limit: filters.limit,
      })
      .then(({ data, pagination }) => ({ data: data.map(normalizeTransaction), pagination })),
  // Admin-only — backend already returns real numbers for amount/fee here (parseFloat server-side).
  adminList: (filters: AdminTransactionFilters = {}) =>
    api.getPaginated<AdminTransaction>('/transactions/admin', {
      page: filters.page,
      limit: filters.limit,
      type: filters.type,
      status: filters.status,
    }),
}
