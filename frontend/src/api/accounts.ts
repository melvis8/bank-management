import { api } from './client'
import type { Account, CreateAccountPayload } from '@/types'

/**
 * Postgres NUMERIC columns (accounts.balance) come back from `pg` as strings
 * (e.g. "150000.00"), not JS numbers, to avoid silent float precision loss.
 * Coerce at the API boundary so every consumer can trust `Account.balance`
 * is an actual number (arithmetic like the dashboard's total would otherwise
 * silently string-concatenate and render "NaN XAF").
 */
const normalizeAccount = (account: Account): Account => ({
  ...account,
  balance: Number(account.balance),
})
const normalizeAccounts = (accounts: Account[]): Account[] => accounts.map(normalizeAccount)

export const accountsApi = {
  myAccounts: () => api.get<Account[]>('/accounts/my-accounts').then(normalizeAccounts),
  getById: (id: string) => api.get<Account>(`/accounts/${id}`).then(normalizeAccount),
  create: (payload: CreateAccountPayload) => api.post<Account>('/accounts', payload).then(normalizeAccount),
  update: (id: string, payload: Partial<Pick<Account, 'account_type' | 'status' | 'balance'>>) =>
    api.put<Account>(`/accounts/${id}`, payload).then(normalizeAccount),
  // Admin-only
  listAll: () => api.get<Account[]>('/accounts').then(normalizeAccounts),
  remove: (id: string) => api.delete(`/accounts/${id}`),
}
