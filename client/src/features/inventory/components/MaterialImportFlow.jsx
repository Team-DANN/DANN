import { useState } from 'react'
import { AlertCircle, ArrowLeft, CheckCircle2, FileSpreadsheet, Loader2, Upload } from 'lucide-react'

const MAX_FILE_SIZE = 2 * 1024 * 1024
const MAX_ROWS = 500

const columnAliases = {
  name: ['name', 'material', 'material name'],
  unit: ['unit', 'uom', 'unit of measure'],
  current_stock: ['current stock', 'starting quantity', 'quantity', 'stock', 'qty on hand'],
  reorder_threshold: ['reorder threshold', 'low stock threshold', 'minimum stock'],
  unit_cost: ['unit cost', 'cost', 'cost per unit'],
  supplier_name: ['supplier', 'supplier name'],
}

function normaliseHeader(value) {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
}

function parseCsv(source) {
  const rows = []
  let row = []
  let value = ''
  let quoted = false

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]

    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
      continue
    }

    if (!quoted && character === ',') {
      row.push(value.trim())
      value = ''
      continue
    }

    if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && source[index + 1] === '\n') index += 1
      row.push(value.trim())
      rows.push(row)
      row = []
      value = ''
      continue
    }

    value += character
  }

  if (quoted) throw new Error('The CSV has an unclosed quoted value.')
  if (value.length > 0 || row.length > 0) rows.push([...row, value.trim()])

  return rows.filter((rowValues) => rowValues.some(Boolean))
}

function getColumnIndexes(headers) {
  return Object.fromEntries(
    Object.entries(columnAliases).map(([field, aliases]) => [
      field,
      headers.findIndex((header) => aliases.includes(normaliseHeader(header))),
    ])
  )
}

function parseNumber(value, label, rowNumber) {
  if (!value) return 0
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Row ${rowNumber}: ${label} must be a non-negative number.`)
  }
  return parsed
}

function parseMaterialRows(source) {
  const table = parseCsv(source.replace(/^\uFEFF/, ''))
  if (table.length < 2) throw new Error('Add a header row and at least one material row.')

  const [headers, ...sourceRows] = table
  const columns = getColumnIndexes(headers)
  if (columns.name === -1 || columns.unit === -1) {
    throw new Error('Your CSV needs “name” and “unit” columns.')
  }

  const rows = sourceRows.map((sourceRow, index) => {
    const rowNumber = index + 2
    const getValue = (field) => {
      const column = columns[field]
      return column === -1 ? '' : (sourceRow[column] || '').trim()
    }

    const name = getValue('name')
    const unit = getValue('unit')
    if (!name || !unit) throw new Error(`Row ${rowNumber}: name and unit are required.`)

    return {
      name,
      unit,
      current_stock: parseNumber(getValue('current_stock'), 'Starting quantity', rowNumber),
      reorder_threshold: parseNumber(getValue('reorder_threshold'), 'Reorder threshold', rowNumber),
      unit_cost: parseNumber(getValue('unit_cost'), 'Unit cost', rowNumber),
      supplier_name: getValue('supplier_name') || undefined,
    }
  })

  if (rows.length > MAX_ROWS) throw new Error(`Import up to ${MAX_ROWS} materials at a time.`)
  return rows
}

export default function MaterialImportFlow({ onBack, onImport, onDone }) {
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError(null)
    setImportedCount(0)
    setRows([])

    if (file.size > MAX_FILE_SIZE) {
      setFileName('')
      setError('Choose a CSV smaller than 2 MB.')
      return
    }

    try {
      const materialRows = parseMaterialRows(await file.text())
      setFileName(file.name)
      setRows(materialRows)
    } catch (err) {
      setFileName('')
      setError(err.message || 'We could not read that CSV.')
    }
  }

  async function handleImport() {
    if (rows.length === 0 || submitting) return

    setSubmitting(true)
    setError(null)
    try {
      await onImport(rows)
      setImportedCount(rows.length)
      setRows([])
      setFileName('')
    } catch (err) {
      setError(err.message || 'We could not import those materials.')
    } finally {
      setSubmitting(false)
    }
  }

  if (importedCount > 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-6 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success)] text-white">
          <CheckCircle2 size={26} />
        </div>
        <div>
          <h2 className="font-sans text-xl font-bold text-[var(--color-ink)]">{importedCount} materials imported</h2>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">Your starting inventory is ready to review.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setImportedCount(0)}
            className="flex-1 rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
          >
            Import more
          </button>
          <button
            type="button"
            onClick={onDone}
            className="flex-1 rounded-xl bg-[var(--color-stamp)] px-4 py-3 text-sm font-semibold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)]"
          >
            View inventory
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-2 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      >
        <ArrowLeft size={16} />
        Back to inventory
      </button>

      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-stamp)]">Initial data import</p>
        <h1 className="mt-1 font-sans text-2xl font-bold text-[var(--color-ink)]">Import starting materials</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Use a CSV with <span className="font-mono">name</span> and <span className="font-mono">unit</span> columns. Quantity, cost, threshold, and supplier are optional.
        </p>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-paper-light)] px-6 py-10 text-center hover:border-[var(--color-stamp)]">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-stamp)]/10 text-[var(--color-stamp)]">
          <Upload size={22} />
        </div>
        <div>
          <span className="block text-sm font-bold text-[var(--color-ink)]">Choose a CSV file</span>
          <span className="mt-1 block text-xs text-[var(--color-ink-muted)]">Up to 500 rows and 2 MB</span>
        </div>
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFileChange} />
      </label>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--color-error)] bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {rows.length === 0 && !error && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-4 text-sm text-[var(--color-ink-muted)]">
          <FileSpreadsheet size={20} className="shrink-0 text-[var(--color-stamp)]" />
          No file selected. Export your spreadsheet as a CSV, then choose it here.
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <div>
              <p className="text-sm font-bold text-[var(--color-ink)]">{rows.length} materials ready to import</p>
              <p className="text-xs text-[var(--color-ink-muted)]">{fileName}</p>
            </div>
            <FileSpreadsheet size={20} className="text-[var(--color-stamp)]" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="bg-[var(--color-paper)]/50 font-mono uppercase tracking-wide text-[var(--color-ink-muted)]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Starting qty</th>
                  <th className="px-4 py-3">Unit cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/60 text-[var(--color-ink)]">
                {rows.slice(0, 5).map((row) => (
                  <tr key={`${row.name}-${row.unit}`}>
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3">{row.unit}</td>
                    <td className="px-4 py-3 font-mono">{row.current_stock}</td>
                    <td className="px-4 py-3 font-mono">{row.unit_cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 5 && <p className="border-t border-[var(--color-border)] px-4 py-3 text-xs text-[var(--color-ink-muted)]">Plus {rows.length - 5} more rows.</p>}
        </div>
      )}

      <button
        type="button"
        disabled={rows.length === 0 || submitting}
        onClick={handleImport}
        className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] px-5 py-3.5 text-sm font-bold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
        {submitting ? 'Importing materials…' : `Import ${rows.length || ''} materials`}
      </button>
    </div>
  )
}
