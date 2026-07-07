import { AlertCircle } from 'lucide-react'
import { getErrorMessage } from '@/lib/errors'

/** Inline, actionable error message for forms — never a bare "une erreur est survenue". */
export function ErrorBanner({ error }: { error: unknown }) {
  if (!error) return null

  const message = typeof error === 'string' ? error : getErrorMessage(error)

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}
