import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { paymentsApi, type PaymentHistoryFilters } from '@/api/payments'
import { queryKeys } from '@/lib/queryKeys'
import type { InitiatePaymentPayload } from '@/types'

export function usePaymentHistory(filters: PaymentHistoryFilters) {
  return useQuery({
    queryKey: queryKeys.paymentsHistory(filters),
    queryFn: () => paymentsApi.history(filters),
  })
}

export function useInitiatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: InitiatePaymentPayload) => paymentsApi.initiate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountsMine })
      queryClient.invalidateQueries({ queryKey: ['payments', 'history'] })
    },
  })
}

export function useRefundPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reference: string) => paymentsApi.refund(reference),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountsMine })
      queryClient.invalidateQueries({ queryKey: ['payments', 'history'] })
    },
  })
}
