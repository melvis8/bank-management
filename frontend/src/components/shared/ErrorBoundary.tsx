import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Last-resort catch for render crashes so one broken component (e.g. a
 * misused UI primitive) doesn't white-screen the whole app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </span>
          <h1 className="font-heading text-xl font-semibold">Un problème est survenu</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Une erreur inattendue a interrompu l'affichage de cette page. Rechargez la page pour continuer ;
            aucune donnée n'a été perdue.
          </p>
          <Button onClick={() => window.location.reload()}>Recharger la page</Button>
        </div>
      )
    }

    return this.props.children
  }
}
