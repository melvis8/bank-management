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
import { useTransfer } from '@/hooks/use-transactions'
import type { Account } from '@/types'

const transferSchema = z
  .object({
    sender_account_number: z.string().min(1, 'Sélectionnez un compte source.'),
    recipient_account_number: z
      .string()
      .min(1, 'Le numéro de compte destinataire est requis.'),
    amount: z.coerce.number().positive('Le montant doit être supérieur à 0.'),
    reference: z.string().max(255).optional(),
  })
  .refine((data) => data.sender_account_number !== data.recipient_account_number, {
    message: 'Le compte source et le compte destinataire doivent être différents.',
    path: ['recipient_account_number'],
  })

type TransferFormInput = z.input<typeof transferSchema>
type TransferFormValues = z.output<typeof transferSchema>

interface TransferFormProps {
  accounts: Account[]
  onSuccess?: () => void
}

export function TransferForm({ accounts, onSuccess }: TransferFormProps) {
  const [pendingValues, setPendingValues] = useState<TransferFormValues | null>(null)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const transfer = useTransfer()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TransferFormInput, unknown, TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: { sender_account_number: accounts[0]?.account_number ?? '' },
  })

  const openConfirmation = (values: TransferFormValues) => {
    setSubmitError(null)
    setPendingValues(values)
  }

  const handleConfirm = async () => {
    if (!pendingValues) return
    try {
      await transfer.mutateAsync(pendingValues)
      toast.success('Virement effectué avec succès.')
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
      <form onSubmit={handleSubmit(openConfirmation)} className="flex flex-col gap-4" noValidate>
        <FormField
          label="Compte source"
          htmlFor="sender_account_number"
          error={errors.sender_account_number?.message}
        >
          <Controller
            control={control}
            name="sender_account_number"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="sender_account_number" className="w-full">
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
          label="Compte destinataire"
          htmlFor="recipient_account_number"
          error={errors.recipient_account_number?.message}
          hint="Numéro de compte au format BMS-XXXX-00000000"
        >
          <Input
            id="recipient_account_number"
            placeholder="BMS-UBA-12345678"
            aria-invalid={!!errors.recipient_account_number}
            {...register('recipient_account_number')}
          />
        </FormField>

        <FormField label="Montant (XAF)" htmlFor="amount" error={errors.amount?.message}>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            min={100}
            step="1"
            placeholder="10000"
            aria-invalid={!!errors.amount}
            {...register('amount')}
          />
        </FormField>

        <FormField label="Référence (optionnel)" htmlFor="reference" error={errors.reference?.message}>
          <Input id="reference" placeholder="Loyer, remboursement…" {...register('reference')} />
        </FormField>

        <ErrorBanner error={submitError} />

        <Button type="submit" size="lg" disabled={accounts.length === 0}>
          Vérifier et confirmer
        </Button>
      </form>

      <ConfirmDialog
        open={!!pendingValues}
        onOpenChange={(open) => !open && setPendingValues(null)}
        title="Confirmer le virement"
        loading={transfer.isPending}
        onConfirm={handleConfirm}
        confirmLabel="Envoyer le virement"
        description={
          pendingValues ? (
            <span className="flex flex-col gap-1 text-left">
              <span>
                Envoyer <AmountText amount={pendingValues.amount} className="font-semibold" /> depuis{' '}
                <strong>{pendingValues.sender_account_number}</strong> vers{' '}
                <strong>{pendingValues.recipient_account_number}</strong> ?
              </span>
              <span className="text-xs text-muted-foreground">Cette action ne peut pas être annulée.</span>
            </span>
          ) : (
            ''
          )
        }
      />
    </>
  )
}
