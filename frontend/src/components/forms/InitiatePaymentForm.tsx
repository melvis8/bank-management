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
import { useInitiatePayment } from '@/hooks/use-payments'
import type { Account } from '@/types'

const paymentSchema = z.object({
  account_number: z.string().min(1, 'Sélectionnez un compte.'),
  amount: z.coerce.number().min(100, 'Le paiement minimum est de 100 XAF.').max(5_000_000),
  method: z.enum(['momo', 'om']),
  phone: z
    .string()
    .min(9, 'Numéro de téléphone invalide.')
    .regex(/^\+?\d{9,15}$/, 'Numéro de téléphone invalide.'),
  description: z.string().max(500).optional(),
})

type PaymentFormInput = z.input<typeof paymentSchema>
type PaymentFormValues = z.output<typeof paymentSchema>

const METHOD_LABELS: Record<PaymentFormValues['method'], string> = {
  momo: 'MTN Mobile Money',
  om: 'Orange Money',
}

export function InitiatePaymentForm({ accounts, onSuccess }: { accounts: Account[]; onSuccess?: () => void }) {
  const [pendingValues, setPendingValues] = useState<PaymentFormValues | null>(null)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const initiatePayment = useInitiatePayment()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PaymentFormInput, unknown, PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { account_number: accounts[0]?.account_number ?? '', method: 'momo', amount: 0 },
  })

  const handleConfirm = async () => {
    if (!pendingValues) return
    try {
      await initiatePayment.mutateAsync(pendingValues)
      toast.success('Paiement mobile money effectué avec succès.')
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
        <FormField label="Compte à créditer" htmlFor="payment-account" error={errors.account_number?.message}>
          <Controller
            control={control}
            name="account_number"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="payment-account" className="w-full">
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

        <FormField label="Opérateur mobile money" htmlFor="payment-method" error={errors.method?.message}>
          <Controller
            control={control}
            name="method"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="payment-method" className="w-full">
                  <SelectValue placeholder="Choisissez un opérateur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="momo">{METHOD_LABELS.momo}</SelectItem>
                  <SelectItem value="om">{METHOD_LABELS.om}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        <FormField label="Numéro de téléphone" htmlFor="payment-phone" error={errors.phone?.message}>
          <Input id="payment-phone" placeholder="699123456" aria-invalid={!!errors.phone} {...register('phone')} />
        </FormField>

        <FormField
          label="Montant (XAF)"
          htmlFor="payment-amount"
          error={errors.amount?.message}
          hint="Entre 100 et 5 000 000 XAF"
        >
          <Input
            id="payment-amount"
            type="number"
            inputMode="decimal"
            min={100}
            placeholder="5000"
            aria-invalid={!!errors.amount}
            {...register('amount')}
          />
        </FormField>

        <FormField label="Description (optionnel)" htmlFor="payment-description">
          <Input id="payment-description" placeholder="Rechargement de compte…" {...register('description')} />
        </FormField>

        <ErrorBanner error={submitError} />

        <Button type="submit" size="lg" disabled={accounts.length === 0}>
          Vérifier et confirmer
        </Button>
      </form>

      <ConfirmDialog
        open={!!pendingValues}
        onOpenChange={(open) => !open && setPendingValues(null)}
        title="Confirmer le paiement mobile money"
        loading={initiatePayment.isPending}
        onConfirm={handleConfirm}
        confirmLabel="Payer maintenant"
        description={
          pendingValues ? (
            <span>
              Créditer <AmountText amount={pendingValues.amount} className="font-semibold" /> sur{' '}
              <strong>{pendingValues.account_number}</strong> via {METHOD_LABELS[pendingValues.method]} (
              {pendingValues.phone}) ?
            </span>
          ) : (
            ''
          )
        }
      />
    </>
  )
}
