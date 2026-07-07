import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadCsv } from '@/lib/csv'

interface ExportCsvButtonProps {
  filename: string
  rows: Record<string, unknown>[]
}

export function ExportCsvButton({ filename, rows }: ExportCsvButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={rows.length === 0}
      onClick={() => downloadCsv(filename, rows)}
    >
      <Download className="size-4" aria-hidden="true" />
      Exporter CSV
    </Button>
  )
}
