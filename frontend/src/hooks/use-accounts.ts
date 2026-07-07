import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountsApi } from '@/api/accounts'
import { banksApi } from '@/api/banks'
import { queryKeys } from '@/lib/queryKeys'
import type { CreateAccountPayload } from '@/types'

export function useMyAccounts() {
  return useQuery({
    queryKey: queryKeys.accountsMine,
    queryFn: accountsApi.myAccounts,
  })
}

export function useAccount(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.account(id ?? ''),
    queryFn: () => accountsApi.getById(id as string),
    enabled: !!id,
  })
}

export function useBanks() {
  return useQuery({
    queryKey: queryKeys.banks,
    queryFn: banksApi.list,
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAccountPayload) => accountsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountsMine })
    },
  })
}
