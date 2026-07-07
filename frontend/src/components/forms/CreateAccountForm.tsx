import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { FormField } from '@/components/shared/FormField'
import { ErrorBanner } from '@/components/shared/ErrorBanner'
import { useBanks, useCreateAccount } from '@/hooks/use-accounts'

const createAccountSchema = z.object({
  bank_id: z.string().min(1, 'Sélectionnez une banque.'),
  account_type: z.enum(['savings', 'current']),
})

type CreateAccountValues = z.infer<typeof createAccountSchema>

export function CreateAccountForm({ onSuccess }: { onSuccess?: () => void }) {
  const { data: banks, isLoading: banksLoading } = useBanks()
  const createAccount = useCreateAccount()
  const [submitError, setSubmitError] = useState<unknown>(null)

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateAccountValues>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: { bank_id: '', account_type: 'savings' },
  })

  const onSubmit = async (values: CreateAccountValues) => {
    setSubmitError(null)
    try {
      const account = await createAccount.mutateAsync(values)
      toast.success(`Compte ${account.account_number} créé avec succès.`)
      onSuccess?.()
    } catch (error) {
      setSubmitError(error)
    }
  }

  if (banksLoading) {
    return <Skeleton className="h-40 w-full" />
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <FormField label="Banque ou opérateur" htmlFor="new_account_bank" error={errors.bank_id?.message}>
        <Controller
          control={control}
          name="bank_id"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="new_account_bank" className="w-full">
                <SelectValue placeholder="Choisissez une banque" />
              </SelectTrigger>
              <SelectContent>
                {banks?.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField label="Type de compte" htmlFor="new_account_type" error={errors.account_type?.message}>
        <Controller
          control={control}
          name="account_type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="new_account_type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="savings">Épargne</SelectItem>
                <SelectItem value="current">Courant</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <ErrorBanner error={submitError} />

      <Button type="submit" disabled={createAccount.isPending || !banks || banks.length === 0}>
        {createAccount.isPending ? 'Création…' : 'Créer le compte'}
      </Button>
    </form>
  )
}
