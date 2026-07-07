import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { transactionsApi, type TransactionHistoryFilters } from '@/api/transactions'
import { queryKeys } from '@/lib/queryKeys'
import type { DepositPayload, TransferPayload, WithdrawPayload } from '@/types'

export function useTransactionHistory(accountNumber: string | undefined, filters: TransactionHistoryFilters) {
  return useQuery({
    queryKey: queryKeys.transactions(accountNumber ?? '', filters),
    queryFn: () => transactionsApi.history(accountNumber as string, filters),
    enabled: !!accountNumber,
  })
}

/** Invalidates account balances plus any transaction history for the given account numbers. */
function invalidateAfterMoneyMovement(
  queryClient: ReturnType<typeof useQueryClient>,
  accountNumbers: (string | undefined)[]
) {
  // Invalidate the list of accounts (balance totals on dashboard)
  queryClient.invalidateQueries({ queryKey: queryKeys.accountsMine })
  // Invalidate every single-account detail page (balance on AccountDetailPage)
  queryClient.invalidateQueries({ queryKey: ['account'] })
  for (const accountNumber of accountNumbers) {
    if (!accountNumber) continue
    queryClient.invalidateQueries({ queryKey: ['transactions', accountNumber] })
  }
}

export function useDeposit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: DepositPayload) => transactionsApi.deposit(payload),
    onSuccess: (_data, variables) => {
      invalidateAfterMoneyMovement(queryClient, [variables.account_number])
    },
  })
}

export function useWithdraw() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: WithdrawPayload) => transactionsApi.withdraw(payload),
    onSuccess: (_data, variables) => {
      invalidateAfterMoneyMovement(queryClient, [variables.account_number])
    },
  })
}

export function useTransfer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: TransferPayload) => transactionsApi.transfer(payload),
    onSuccess: (_data, variables) => {
      invalidateAfterMoneyMovement(queryClient, [
        variables.sender_account_number,
        variables.recipient_account_number,
      ])
    },
  })
}
