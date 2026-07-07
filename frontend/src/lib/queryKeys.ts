/** Centralized TanStack Query keys — see prompt.txt plan for the invalidation table. */
export const queryKeys = {
  accountsMine: ['accounts', 'mine'] as const,
  account: (id: string) => ['account', id] as const,
  banks: ['banks'] as const,
  transactions: (accountNumber: string, filters: { page?: number; limit?: number }) =>
    ['transactions', accountNumber, filters] as const,
  paymentsHistory: (filters: { page?: number; limit?: number }) =>
    ['payments', 'history', filters] as const,
  adminUsers: ['admin', 'users'] as const,
  adminUser: (id: string) => ['admin', 'user', id] as const,
  adminAccounts: ['admin', 'accounts'] as const,
  adminBanks: ['admin', 'banks'] as const,
  adminPayments: (filters: { page?: number; limit?: number }) =>
    ['admin', 'payments', filters] as const,
  adminTransactions: (filters: { page?: number; limit?: number; type?: string; status?: string }) =>
    ['admin', 'transactions', filters] as const,
}
