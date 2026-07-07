import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <p className="font-mono text-sm text-muted-foreground">Erreur 404</p>
      <h1 className="font-heading text-2xl font-semibold">Page introuvable</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        La page que vous cherchez n'existe pas ou a été déplacée.
      </p>
      <Button render={<Link to="/" />}>Retour au tableau de bord</Button>
    </div>
  )
}
