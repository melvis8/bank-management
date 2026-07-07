import { useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { Eye, Plus, Pencil, Trash2 } from 'lucide-react'
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
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SearchInput } from '@/components/shared/SearchInput'
import { ExportCsvButton } from '@/components/shared/ExportCsvButton'
import {
  useAdminUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useDeleteAllUsers,
} from '@/hooks/use-admin'
import type { Role, User } from '@/types'

const createUserSchema = z.object({
  first_name: z.string().min(1, 'Le prénom est requis.'),
  last_name: z.string().min(1, 'Le nom est requis.'),
  email: z.string().email('Adresse email invalide.'),
  password: z.string().min(6, 'Minimum 6 caractères.'),
  phone: z.string().min(1, 'Le téléphone est requis.'),
  address: z.string().optional(),
  role: z.enum(['user', 'admin']),
})
type CreateUserValues = z.infer<typeof createUserSchema>

function CreateUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createUser = useCreateUser()
  const [submitError, setSubmitError] = useState<unknown>(null)
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateUserValues>({ resolver: zodResolver(createUserSchema), defaultValues: { role: 'user' } })

  const onSubmit = async (values: CreateUserValues) => {
    setSubmitError(null)
    try {
      await createUser.mutateAsync(values)
      toast.success('Utilisateur créé avec succès.')
      reset()
      onOpenChange(false)
    } catch (error) {
      setSubmitError(error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un utilisateur</DialogTitle>
          <DialogDescription>Le mot de passe pourra être communiqué à l'utilisateur.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-1 gap-3">
            <FormField label="Rôle" htmlFor="role" error={errors.role?.message}>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Utilisateur</SelectItem>
                      <SelectItem value="admin">Administrateur</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Prénom" htmlFor="first_name" error={errors.first_name?.message}>
              <Input id="first_name" {...register('first_name')} />
            </FormField>
            <FormField label="Nom" htmlFor="last_name" error={errors.last_name?.message}>
              <Input id="last_name" {...register('last_name')} />
            </FormField>
          </div>
          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" {...register('email')} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Mot de passe" htmlFor="password" error={errors.password?.message}>
              <Input id="password" type="password" {...register('password')} />
            </FormField>
            <FormField label="Téléphone" htmlFor="phone" error={errors.phone?.message}>
              <Input id="phone" {...register('phone')} />
            </FormField>
          </div>
          <FormField label="Adresse (optionnel)" htmlFor="address">
            <Input id="address" {...register('address')} />
          </FormField>
          <ErrorBanner error={submitError} />
          <Button type="submit" disabled={createUser.isPending}>
            {createUser.isPending ? 'Création…' : "Créer l'utilisateur"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const updateUserSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().optional(),
  status: z.enum(['active', 'suspended']),
  role: z.enum(['user', 'admin']),
})
type UpdateUserValues = z.infer<typeof updateUserSchema>

export function EditUserDialog({ user, onOpenChange }: { user: User | null; onOpenChange: (v: boolean) => void }) {
  const updateUser = useUpdateUser()
  const [submitError, setSubmitError] = useState<unknown>(null)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UpdateUserValues>({
    resolver: zodResolver(updateUserSchema),
    values: user
      ? {
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          address: user.address ?? '',
          status: user.status,
          role: user.role,
        }
      : undefined,
  })

  if (!user) return null

  const onSubmit = async (values: UpdateUserValues) => {
    setSubmitError(null)
    try {
      await updateUser.mutateAsync({ id: user.id, payload: values })
      toast.success('Utilisateur mis à jour.')
      onOpenChange(false)
    } catch (error) {
      setSubmitError(error)
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier {user.first_name} {user.last_name}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Prénom" htmlFor="edit_first_name" error={errors.first_name?.message}>
              <Input id="edit_first_name" {...register('first_name')} />
            </FormField>
            <FormField label="Nom" htmlFor="edit_last_name" error={errors.last_name?.message}>
              <Input id="edit_last_name" {...register('last_name')} />
            </FormField>
          </div>
          <FormField label="Téléphone" htmlFor="edit_phone" error={errors.phone?.message}>
            <Input id="edit_phone" {...register('phone')} />
          </FormField>
          <FormField label="Adresse" htmlFor="edit_address">
            <Input id="edit_address" {...register('address')} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Statut" htmlFor="edit_status">
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="edit_status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="suspended">Suspendu</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Rôle" htmlFor="edit_role">
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="edit_role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Utilisateur</SelectItem>
                      <SelectItem value="admin">Administrateur</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
          <ErrorBanner error={submitError} />
          <Button type="submit" disabled={updateUser.isPending}>
            {updateUser.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export const ROLE_LABEL: Record<Role, string> = { user: 'Utilisateur', admin: 'Administrateur' }

export function AdminUsersPage() {
  const { data: users, isLoading, isError, error } = useAdminUsers()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false)
  const [actionError, setActionError] = useState<unknown>(null)
  const [search, setSearch] = useState('')
  const deleteUser = useDeleteUser()
  const deleteAllUsers = useDeleteAllUsers()

  const filteredUsers = useMemo(() => {
    if (!users) return []
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      [u.first_name, u.last_name, u.email, u.user_id, u.phone].some((field) =>
        field.toLowerCase().includes(q)
      )
    )
  }, [users, search])

  const handleDelete = async () => {
    if (!deletingUser) return
    try {
      await deleteUser.mutateAsync(deletingUser.id)
      toast.success('Utilisateur supprimé.')
      setDeletingUser(null)
    } catch (err) {
      setActionError(err)
      setDeletingUser(null)
    }
  }

  const handleDeleteAll = async () => {
    try {
      const result = await deleteAllUsers.mutateAsync()
      toast.success(result.message ?? 'Utilisateurs supprimés.')
      setConfirmDeleteAllOpen(false)
    } catch (err) {
      setActionError(err)
      setConfirmDeleteAllOpen(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground">Gérez les comptes utilisateurs de la plateforme.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportCsvButton
            filename="utilisateurs"
            rows={filteredUsers.map((u) => ({
              identifiant: u.user_id,
              prenom: u.first_name,
              nom: u.last_name,
              email: u.email,
              telephone: u.phone,
              role: ROLE_LABEL[u.role],
              statut: u.status,
              cree_le: u.created_at,
            }))}
          />
          <Button variant="destructive" onClick={() => setConfirmDeleteAllOpen(true)}>
            <Trash2 className="size-4" aria-hidden="true" />
            Tout supprimer
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Nouvel utilisateur
          </Button>
        </div>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par nom, email, identifiant…" />

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
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.first_name} {u.last_name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="font-mono text-xs">{u.phone}</TableCell>
                  <TableCell>{ROLE_LABEL[u.role]}</TableCell>
                  <TableCell><StatusBadge status={u.status} /></TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" aria-label="Voir le détail" render={<Link to={`/admin/users/${u.id}`} />}>
                      <Eye className="size-4" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Modifier" onClick={() => setEditingUser(u)}>
                      <Pencil className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Supprimer"
                      onClick={() => setDeletingUser(u)}
                    >
                      <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Aucun utilisateur ne correspond à la recherche.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditUserDialog user={editingUser} onOpenChange={(open) => !open && setEditingUser(null)} />

      <ConfirmDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        title="Supprimer cet utilisateur ?"
        description={
          deletingUser ? (
            <span>
              <strong>{deletingUser.first_name} {deletingUser.last_name}</strong> ({deletingUser.email}) sera
              définitivement supprimé, ainsi que ses comptes associés.
            </span>
          ) : (
            ''
          )
        }
        confirmLabel="Supprimer"
        destructive
        loading={deleteUser.isPending}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={confirmDeleteAllOpen}
        onOpenChange={setConfirmDeleteAllOpen}
        title="Supprimer TOUS les utilisateurs ?"
        description="Action irréversible : tous les utilisateurs seront supprimés, à l'exception de votre propre compte administrateur."
        confirmLabel="Tout supprimer"
        destructive
        loading={deleteAllUsers.isPending}
        onConfirm={handleDeleteAll}
      />
    </div>
  )
}
