import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormField } from '@/components/shared/FormField'
import { ErrorBanner } from '@/components/shared/ErrorBanner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useAdminBanks, useCreateBank, useUpdateBank, useDeleteBank } from '@/hooks/use-admin'
import type { Bank, BankType } from '@/types'

const bankSchema = z.object({
  name: z.string().min(1, 'Le nom est requis.'),
  code: z.string().min(1, 'Le code est requis.').max(20),
  type: z.enum(['bank', 'mobile_money']),
})
type BankFormValues = z.infer<typeof bankSchema>

const TYPE_LABEL: Record<BankType, string> = { bank: 'Banque', mobile_money: 'Mobile Money' }

function BankFormDialog({
  bank,
  open,
  onOpenChange,
}: {
  bank: Bank | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const isEdit = !!bank
  const createBank = useCreateBank()
  const updateBank = useUpdateBank()
  const [submitError, setSubmitError] = useState<unknown>(null)
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<BankFormValues>({
    resolver: zodResolver(bankSchema),
    values: bank ? { name: bank.name, code: bank.code, type: bank.type } : { name: '', code: '', type: 'bank' },
  })

  const isPending = createBank.isPending || updateBank.isPending

  const onSubmit = async (values: BankFormValues) => {
    setSubmitError(null)
    try {
      if (isEdit && bank) {
        await updateBank.mutateAsync({ id: bank.id, payload: values })
        toast.success('Banque mise à jour.')
      } else {
        await createBank.mutateAsync(values)
        toast.success('Banque créée avec succès.')
        reset()
      }
      onOpenChange(false)
    } catch (error) {
      setSubmitError(error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier la banque' : 'Nouvelle banque / opérateur'}</DialogTitle>
          <DialogDescription>
            {isEdit ? bank?.name : 'Ajoutez une banque ou un opérateur mobile money au système.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <FormField label="Nom" htmlFor="bank_name" error={errors.name?.message}>
            <Input id="bank_name" placeholder="Eco Bank" {...register('name')} />
          </FormField>
          <FormField label="Code" htmlFor="bank_code" error={errors.code?.message} hint="Identifiant court unique">
            <Input id="bank_code" placeholder="ECOBANK" {...register('code')} />
          </FormField>
          <FormField label="Type" htmlFor="bank_type">
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="bank_type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Banque</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <ErrorBanner error={submitError} />
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AdminBanksPage() {
  const { data: banks, isLoading, isError, error } = useAdminBanks()
  const [formTarget, setFormTarget] = useState<{ mode: 'create' } | { mode: 'edit'; bank: Bank } | null>(null)
  const [deletingBank, setDeletingBank] = useState<Bank | null>(null)
  const [actionError, setActionError] = useState<unknown>(null)
  const deleteBank = useDeleteBank()

  const handleDelete = async () => {
    if (!deletingBank) return
    try {
      await deleteBank.mutateAsync(deletingBank.id)
      toast.success('Banque supprimée.')
      setDeletingBank(null)
    } catch (err) {
      setActionError(err)
      setDeletingBank(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Banques &amp; opérateurs</h1>
          <p className="text-sm text-muted-foreground">Gérez les établissements disponibles pour les comptes.</p>
        </div>
        <Button onClick={() => setFormTarget({ mode: 'create' })}>
          <Plus className="size-4" aria-hidden="true" />
          Nouvelle banque
        </Button>
      </div>

      {isError && <ErrorBanner error={error} />}
      {actionError !== null && <ErrorBanner error={actionError} />}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banks?.map((bank) => (
                <TableRow key={bank.id}>
                  <TableCell>{bank.name}</TableCell>
                  <TableCell className="font-mono text-xs">{bank.code}</TableCell>
                  <TableCell>{TYPE_LABEL[bank.type]}</TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Modifier"
                      onClick={() => setFormTarget({ mode: 'edit', bank })}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Supprimer" onClick={() => setDeletingBank(bank)}>
                      <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <BankFormDialog
        bank={formTarget?.mode === 'edit' ? formTarget.bank : null}
        open={!!formTarget}
        onOpenChange={(open) => !open && setFormTarget(null)}
      />

      <ConfirmDialog
        open={!!deletingBank}
        onOpenChange={(open) => !open && setDeletingBank(null)}
        title="Supprimer cette banque ?"
        description={
          deletingBank ? (
            <span>
              <strong>{deletingBank.name}</strong> sera supprimée. Cette opération échouera si des comptes actifs y
              sont encore rattachés.
            </span>
          ) : (
            ''
          )
        }
        confirmLabel="Supprimer"
        destructive
        loading={deleteBank.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
