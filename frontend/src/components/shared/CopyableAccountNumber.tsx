import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

/** Small copy-to-clipboard button for sharing an account number to receive a transfer. */
export function CopyableAccountNumber({ accountNumber }: { accountNumber: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(accountNumber)
      setCopied(true)
      toast.success('Numéro de compte copié.')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Impossible de copier automatiquement. Sélectionnez le numéro manuellement.')
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={handleCopy}
      aria-label={`Copier le numéro de compte ${accountNumber}`}
    >
      {copied ? <Check className="size-3.5 text-success" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
    </Button>
  )
}
