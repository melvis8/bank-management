import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Landmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared/FormField'
import { ErrorBanner } from '@/components/shared/ErrorBanner'
import { authApi } from '@/api/auth'
import { useAuth } from '@/hooks/useAuth'

const registerSchema = z.object({
  first_name: z.string().min(1, 'Le prénom est requis.'),
  last_name: z.string().min(1, 'Le nom est requis.'),
  email: z.string().min(1, "L'email est requis.").email('Adresse email invalide.'),
  password: z.string().min(6, 'Minimum 6 caractères.'),
  phone: z.string().min(1, 'Le téléphone est requis.'),
  address: z.string().optional(),
})

type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<unknown>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) })

  const onSubmit = async (values: RegisterFormValues) => {
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      await authApi.register(values)
      // Registration doesn't return a session token — log the new user in right away
      // so they don't have to re-type their credentials on a separate screen.
      await login({ email: values.email, password: values.password })
      navigate('/', { replace: true })
    } catch (error) {
      setSubmitError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Landmark className="size-5" aria-hidden="true" />
          </span>
          <h1 className="font-heading text-xl font-semibold">Créer un compte</h1>
          <p className="text-sm text-muted-foreground">
            Inscrivez-vous pour ouvrir un compte bancaire et gérer votre argent.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Prénom" htmlFor="first_name" error={errors.first_name?.message}>
              <Input id="first_name" autoComplete="given-name" {...register('first_name')} />
            </FormField>
            <FormField label="Nom" htmlFor="last_name" error={errors.last_name?.message}>
              <Input id="last_name" autoComplete="family-name" {...register('last_name')} />
            </FormField>
          </div>

          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="vous@exemple.com"
              {...register('email')}
            />
          </FormField>

          <FormField label="Téléphone" htmlFor="phone" error={errors.phone?.message}>
            <Input id="phone" autoComplete="tel" placeholder="+237699000111" {...register('phone')} />
          </FormField>

          <FormField label="Mot de passe" htmlFor="password" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              {...register('password')}
            />
          </FormField>

          <FormField label="Adresse (optionnel)" htmlFor="address">
            <Input id="address" autoComplete="street-address" {...register('address')} />
          </FormField>

          <ErrorBanner error={submitError} />

          <Button type="submit" className="mt-2 w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Création du compte…' : 'Créer mon compte'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Déjà inscrit ?{' '}
          <Link to="/login" className="font-medium text-accent-foreground hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
