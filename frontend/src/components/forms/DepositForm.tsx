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
import { useDeposit } from '@/hooks/use-transactions'
import type { Account } from '@/types'

const depositSchema = z.object({
  account_number: z.string().min(1, 'Sélectionnez un compte.'),
  amount: z.coerce.number().min(100, 'Le dépôt minimum est de 100 XAF.'),
  reference: z.string().max(255).optional(),
})

type DepositFormInput = z.input<typeof depositSchema>
type DepositFormValues = z.output<typeof depositSchema>

export function DepositForm({ accounts, onSuccess }: { accounts: Account[]; onSuccess?: () => void }) {
  const [pendingValues, setPendingValues] = useState<DepositFormValues | null>(null)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const deposit = useDeposit()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<DepositFormInput, unknown, DepositFormValues>({
    resolver: zodResolver(depositSchema),
    defaultValues: { account_number: accounts[0]?.account_number ?? '' },
  })

  const handleConfirm = async () => {
    if (!pendingValues) return
    try {
      await deposit.mutateAsync(pendingValues)
      toast.success('Dépôt effectué avec succès.')
      reset()
      setPendingValues(null)
      onSuccess?.()
    } catch (error) {
      setSubmitError(error)
      setPendingValues(null)
    }
  }

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
        <FormField label="Compte à créditer" htmlFor="deposit-account" error={errors.account_number?.message}>
          <Controller
            control={control}
            name="account_number"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="deposit-account" className="w-full">
                  <SelectValue placeholder="Choisissez un compte" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.account_number}>
                      {account.bank_name} · {account.account_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        <FormField label="Montant (XAF)" htmlFor="deposit-amount" error={errors.amount?.message} hint="Minimum 100 XAF">
          <Input
            id="deposit-amount"
            type="number"
            inputMode="decimal"
            min={100}
            placeholder="5000"
            aria-invalid={!!errors.amount}
            {...register('amount')}
          />
        </FormField>

        <FormField label="Référence (optionnel)" htmlFor="deposit-reference">
          <Input id="deposit-reference" placeholder="Épargne du mois…" {...register('reference')} />
        </FormField>

        <ErrorBanner error={submitError} />

        <Button type="submit" size="lg" disabled={accounts.length === 0}>
          Vérifier et confirmer
        </Button>
      </form>

      <ConfirmDialog
        open={!!pendingValues}
        onOpenChange={(open) => !open && setPendingValues(null)}
        title="Confirmer le dépôt"
        loading={deposit.isPending}
        onConfirm={handleConfirm}
        confirmLabel="Confirmer le dépôt"
        description={
          pendingValues ? (
            <span>
              Déposer <AmountText amount={pendingValues.amount} className="font-semibold" /> sur le compte{' '}
              <strong>{pendingValues.account_number}</strong> ?
            </span>
          ) : (
            ''
          )
        }
      />
    </>
  )
}
