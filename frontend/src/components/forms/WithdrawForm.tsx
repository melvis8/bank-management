import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormField } from '@/components/shared/FormField'
import { ErrorBanner } from '@/components/shared/ErrorBanner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { AmountText } from '@/components/shared/AmountText'
import { useWithdraw } from '@/hooks/use-transactions'
import type { Account } from '@/types'

const MAX_WITHDRAWAL = 500_000
const WITHDRAWAL_FEE_RATE = 0.02

const withdrawSchema = z.object({
  account_number: z.string().min(1, 'Sélectionnez un compte.'),
  amount: z
    .coerce.number()
    .positive('Le montant doit être supérieur à 0.')
    .max(MAX_WITHDRAWAL, `Le retrait maximum est de ${MAX_WITHDRAWAL.toLocaleString('fr-FR')} XAF.`),
  reference: z.string().max(255).optional(),
})

type WithdrawFormInput = z.input<typeof withdrawSchema>
type WithdrawFormValues = z.output<typeof withdrawSchema>

export function WithdrawForm({ accounts, onSuccess }: { accounts: Account[]; onSuccess?: () => void }) {
  const [pendingValues, setPendingValues] = useState<WithdrawFormValues | null>(null)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const withdraw = useWithdraw()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<WithdrawFormInput, unknown, WithdrawFormValues>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: { account_number: accounts[0]?.account_number ?? '' },
  })

  const handleConfirm = async () => {
    if (!pendingValues) return
    try {
      await withdraw.mutateAsync(pendingValues)
      toast.success('Retrait effectué avec succès.')
      reset()
      setPendingValues(null)
      onSuccess?.()
    } catch (error) {
      setSubmitError(error)
      setPendingValues(null)
    }
  }

  const fee = pendingValues ? Math.round(pendingValues.amount * WITHDRAWAL_FEE_RATE) : 0

  return (
    <>
      <form
        onSubmit={handleSubmit((values) => {
          setSubmitError(null)
          setPendingValues(values)
        })}
        className="flex flex-col gap-4"
        noValidate
      >
        <FormField label="Compte à débiter" htmlFor="withdraw-account" error={errors.account_number?.message}>
          <Controller
            control={control}
            name="account_number"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="withdraw-account" className="w-full">
                  <SelectValue placeholder="Choisissez un compte" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.account_number}>
                      {account.bank_name} · {account.account_number} ·{' '}
                      <AmountText amount={account.balance} tone="muted" />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        <FormField
          label="Montant (XAF)"
          htmlFor="withdraw-amount"
          error={errors.amount?.message}
          hint="Des frais de 2% s'appliquent, plafond 500 000 XAF par opération."
        >
          <Input
            id="withdraw-amount"
            type="number"
            inputMode="decimal"
            min={1}
            placeholder="10000"
            aria-invalid={!!errors.amount}
            {...register('amount')}
          />
        </FormField>

        <FormField label="Référence (optionnel)" htmlFor="withdraw-reference">
          <Input id="withdraw-reference" placeholder="Retrait guichet…" {...register('reference')} />
        </FormField>

        <ErrorBanner error={submitError} />

        <Button type="submit" size="lg" disabled={accounts.length === 0}>
          Vérifier et confirmer
        </Button>
      </form>

      <ConfirmDialog
        open={!!pendingValues}
        onOpenChange={(open) => !open && setPendingValues(null)}
        title="Confirmer le retrait"
        loading={withdraw.isPending}
        onConfirm={handleConfirm}
        confirmLabel="Confirmer le retrait"
        description={
          pendingValues ? (
            <span className="flex flex-col gap-1 text-left">
              <span>
                Retirer <AmountText amount={pendingValues.amount} className="font-semibold" /> du compte{' '}
                <strong>{pendingValues.account_number}</strong> ?
              </span>
              <span className="text-xs text-muted-foreground">
                Frais estimés : <AmountText amount={fee} tone="muted" /> — total débité ≈{' '}
                <AmountText amount={pendingValues.amount + fee} tone="muted" />
              </span>
            </span>
          ) : (
            ''
          )
        }
      />
    </>
  )
}
