import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/api/users'
import { banksApi } from '@/api/banks'
import { accountsApi } from '@/api/accounts'
import { transactionsApi, type AdminTransactionFilters } from '@/api/transactions'
import { paymentsApi, type PaymentHistoryFilters } from '@/api/payments'
import { queryKeys } from '@/lib/queryKeys'
import type { CreateBankPayload, CreateUserPayload, UpdateUserPayload } from '@/types'

// ─── Users ──────────────────────────────────────────────────────────────────

export function useAdminUsers() {
  return useQuery({ queryKey: queryKeys.adminUsers, queryFn: usersApi.listAll })
}

export function useAdminUser(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.adminUser(id ?? ''),
    queryFn: () => usersApi.getById(id as string),
    enabled: !!id,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => usersApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers }),
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      usersApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers }),
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers }),
  })
}

export function useDeleteAllUsers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => usersApi.removeAll(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers }),
  })
}

// ─── Accounts ───────────────────────────────────────────────────────────────

export function useAdminAccounts() {
  return useQuery({ queryKey: queryKeys.adminAccounts, queryFn: accountsApi.listAll })
}

export function useAdminUpdateAccountStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' }) =>
      accountsApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminAccounts })
      queryClient.invalidateQueries({ queryKey: queryKeys.accountsMine })
    },
  })
}

// ─── Banks ──────────────────────────────────────────────────────────────────

export function useAdminBanks() {
  return useQuery({ queryKey: queryKeys.adminBanks, queryFn: banksApi.list })
}

export function useCreateBank() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateBankPayload) => banksApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBanks })
      queryClient.invalidateQueries({ queryKey: queryKeys.banks })
    },
  })
}

export function useUpdateBank() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateBankPayload> }) =>
      banksApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBanks })
      queryClient.invalidateQueries({ queryKey: queryKeys.banks })
    },
  })
}

export function useDeleteBank() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => banksApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBanks })
      queryClient.invalidateQueries({ queryKey: queryKeys.banks })
    },
  })
}

// ─── Payments (admin read-only list) ───────────────────────────────────────

export function useAdminPayments(filters: PaymentHistoryFilters) {
  return useQuery({
    queryKey: queryKeys.adminPayments(filters),
    queryFn: () => paymentsApi.adminList(filters),
  })
}

// ─── Transactions (admin read-only list) ───────────────────────────────────

export function useAdminTransactions(filters: AdminTransactionFilters) {
  return useQuery({
    queryKey: queryKeys.adminTransactions(filters),
    queryFn: () => transactionsApi.adminList(filters),
  })
}
