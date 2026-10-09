import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  History,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import { apiFetch } from '../../lib/apiClient.js'
import ValidationAlert from "../../components/ui/ValidationAlert.jsx";
import UploadDropzone from './UploadDropzone.jsx'
import {
  DATASET_KEYS,
  MIGRATION_DATASETS,
  autoMapFields,
  detectSheet,
  formatCellValue,
  isBlankCell,
} from './migrationConfig.js'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_ROWS = 5000

// Three labels shown to the user. Internal `stage` keeps finer steps
// (upload/mapping/review/complete); mapping+review both read as "Check".
const DISPLAY_STEPS = [
  { id: 'upload', label: 'Upload', stages: ['upload'] },
  { id: 'check', label: 'Check', stages: ['mapping', 'review'] },
  { id: 'done', label: 'Done', stages: ['complete'] },
]

function formatNumber(value) {
  return new Intl.NumberFormat().format(Number(value || 0))
}

function totalCount(counts = {}) {
  return Object.values(counts).reduce((total, count) => total + Number(count || 0), 0)
}

function uniqueHeaders(sourceHeaders) {
  const counts = new Map()
  return sourceHeaders.map((value, index) => {
    const base = String(value ?? '').trim() || `Column ${index + 1}`
    const count = (counts.get(base) || 0) + 1
    counts.set(base, count)
    return count === 1 ? base : `${base} (${count})`
  })
}

// Single source of truth for "does this sheet still need the user?".
// Used for the verdict line, the auto-expanded cards and the button state.
function sheetProblems(sheet) {
  if (!sheet.datasetKey) return ['Choose what this sheet is, or skip it.']
  if (sheet.datasetKey === 'skip') return []
  const config = MIGRATION_DATASETS[sheet.datasetKey]
  const missing = config.fields.filter((field) => field.required && !sheet.mapping[field.key])
  if (missing.length === 0) return []
  return [`Tell DANN which column is ${missing.map((field) => field.label).join(', ')}.`]
}

function sheetNeedsAttention(sheet) {
  return !sheet.confirmed || sheetProblems(sheet).length > 0
}

async function parseWorkbook(file) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
  if (workbook.SheetNames.length === 0) throw new Error('This file does not contain a readable worksheet.')

  let emptyRows = 0
  const sheets = []

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName]
    const table = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true })
    const headerIndex = table.findIndex((row) => row.some((value) => !isBlankCell(value)))

    if (headerIndex === -1) {
      emptyRows += table.length
      return
    }

    for (let index = 0; index < headerIndex; index += 1) {
      if (table[index].every((value) => isBlankCell(value))) emptyRows += 1
    }

    const headers = uniqueHeaders(table[headerIndex])
    const rows = []
    for (let index = headerIndex + 1; index < table.length; index += 1) {
      const source = table[index]
      if (source.every((value) => isBlankCell(value))) {
        emptyRows += 1
        continue
      }
      const values = Object.fromEntries(headers.map((header, column) => [header, formatCellValue(source[column])]))
      rows.push({ source_row: index + 1, values })
    }

    if (rows.length > 0) sheets.push({ name: sheetName, headers, rows })
  })

  const rowCount = sheets.reduce((total, sheet) => total + sheet.rows.length, 0)
  if (rowCount === 0) throw new Error('Add a header row and at least one non-empty data row before importing.')
  if (rowCount > MAX_ROWS) throw new Error(`Import up to ${formatNumber(MAX_ROWS)} non-empty rows at a time.`)

  return { sheets, emptyRows, rowCount }
}

function CountCard({ label, value, tone = 'muted' }) {
  const toneClass = {
    success: 'text-[var(--color-success)]',
    warning: 'text-[var(--color-warning)]',
    error: 'text-[var(--color-error)]',
    muted: 'text-[var(--color-ink)]',
  }[tone]

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-3">
      <p className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-ink)]/75">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{formatNumber(value)}</p>
    </div>
  )
}

function StageProgress({ stage, onBack }) {
  const currentIndex = DISPLAY_STEPS.findIndex((step) => step.stages.includes(stage))

  return (
    <ol className="grid grid-cols-3 gap-2">
      {DISPLAY_STEPS.map((step, index) => {
        const isCurrent = index === currentIndex
        const isDone = index < currentIndex
        return (
          <li key={step.id}>
            <button
              type="button"
              disabled={!isDone}
              onClick={() => onBack(step.stages[0])}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                isCurrent
                  ? 'border-[var(--color-stamp)] bg-[var(--color-stamp)]/10 text-[var(--color-stamp)]'
                  : isDone
                    ? 'border-[var(--color-border)] bg-[var(--color-paper-light)] text-[var(--color-ink)] hover:border-[var(--color-stamp)]'
                    : 'border-[var(--color-border)]/60 bg-[var(--color-paper)]/30 text-[var(--color-ink)]/60'
              } disabled:cursor-default`}
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-xs ${
                isCurrent || isDone ? 'bg-[var(--color-stamp)] text-white' : 'bg-[var(--color-border)] text-[var(--color-ink)]/75'
              }`}>
                {isDone ? '✓' : index + 1}
              </span>
              {step.label}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function DatasetSummary({ summary }) {
  const byDataset = summary?.by_dataset || {}
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {DATASET_KEYS.map((datasetKey) => {
        const detected = byDataset.detected?.[datasetKey] || 0
        if (detected === 0) return null
        const ready = byDataset.valid?.[datasetKey] || 0
        const attention = byDataset.attention?.[datasetKey] || 0
        const duplicates = byDataset.duplicates?.[datasetKey] || 0
        return (
          <div key={datasetKey} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-4">
            <p className="text-base font-bold text-[var(--color-ink)]">{MIGRATION_DATASETS[datasetKey].label}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-success)]">{formatNumber(ready)} {MIGRATION_DATASETS[datasetKey].label.toLowerCase()} ready</p>
            <p className="mt-1 text-sm text-[var(--color-ink)]/75">{formatNumber(detected)} found · {formatNumber(attention)} need fixing · {formatNumber(duplicates)} duplicates</p>
          </div>
        )
      })}
    </div>
  )
}

// Groups issues sharing the same (dataset, reason) into one card so a
// 300-row sheet stays reviewable: 40 rows with the same problem become
// one line with a few examples.
function groupIssues(issues, state) {
  const map = new Map()
  issues
    .filter((issue) => issue.state === state)
    .forEach((issue) => {
      const key = `${issue.dataset}|${issue.reason}`
      if (!map.has(key)) {
        map.set(key, { key, dataset: issue.dataset, reason: issue.reason, items: [] })
      }
      map.get(key).items.push(issue)
    })
  return [...map.values()].sort((a, b) => b.items.length - a.items.length)
}

function IssueGroupCard({ group, tone }) {
  const [expanded, setExpanded] = useState(false)
  const examples = group.items.slice(0, 3)
  const toneClass = tone === 'attention'
    ? 'border-[var(--color-warning)] bg-[var(--color-warning)]/10'
    : 'border-[var(--color-border)] bg-[var(--color-paper)]/30'

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-base font-bold text-[var(--color-ink)]">
        {formatNumber(group.items.length)} {MIGRATION_DATASETS[group.dataset].label.toLowerCase()} — {group.reason}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-1 flex items-center gap-1 text-sm font-semibold text-[var(--color-ink)]/75 hover:text-[var(--color-ink)]"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Hide examples' : 'See a few examples'}
      </button>

      {expanded && (
        <div className="mt-3 overflow-hidden rounded-lg border border-[var(--color-border)]/70">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-paper)] font-mono text-xs uppercase tracking-wide text-[var(--color-ink)]/75">
              <tr><th className="px-3 py-2">Sheet / row</th><th className="px-3 py-2">What DANN saw</th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/70">
              {examples.map((issue, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-[var(--color-ink)]/75">{issue.sheet_name}, row {issue.source_row}</td>
                  <td className="px-3 py-2 text-[var(--color-ink)]">
                    {Object.entries(issue.values || {}).map(([key, value]) => `${key}: ${value}`).join(' · ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {group.items.length > examples.length && (
            <p className="bg-[var(--color-paper)]/50 px-3 py-2 text-xs text-[var(--color-ink)]/75">
              + {formatNumber(group.items.length - examples.length)} more like this
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function MigrationPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [stage, setStage] = useState('upload')
  const [selectedFile, setSelectedFile] = useState(null)
  const [sheets, setSheets] = useState([])
  const [expandedSheets, setExpandedSheets] = useState(() => new Set())
  const [emptyRows, setEmptyRows] = useState(0)
  const [fileRowCount, setFileRowCount] = useState(0)
  const [review, setReview] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState(null)
  const [processingFile, setProcessingFile] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [rollbackTarget, setRollbackTarget] = useState(null)
  const [rollingBack, setRollingBack] = useState(false)

  async function refreshHistory() {
    try {
      const response = await apiFetch('/api/migrations')
      setHistory(response.data || [])
    } catch {
      setHistory([])
    }
  }

  useEffect(() => {
    void refreshHistory()
  }, [])

  const mappingProblems = useMemo(
    () => sheets.flatMap((sheet) => sheetProblems(sheet).map((problem) => `${sheet.name}: ${problem}`)),
    [sheets],
  )
  const sheetsNeedingYou = useMemo(() => sheets.filter(sheetNeedsAttention).length, [sheets])

  const canAnalyze = sheets.length > 0
    && mappingProblems.length === 0
    && sheets.some((sheet) => sheet.datasetKey !== 'skip')

  const runIdRef = useRef(0)

  async function processFile(file) {
    if (!file || processingFile) return
    const runId = ++runIdRef.current
    setError(null)
    setReview(null)
    setImportResult(null)

    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
      setError('Choose a .csv, .xlsx, or .xls file.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Choose a spreadsheet smaller than 5 MB.')
      return
    }

    setProcessingFile(true)
    try {
      const parsed = await parseWorkbook(file)
      if (runId !== runIdRef.current) return // cancelled or superseded
      const detectedSheets = parsed.sheets.map((sheet, index) => {
        const detected = detectSheet(sheet.name, sheet.headers, sheet.rows)
        return { ...sheet, id: `${index}-${sheet.name}`, ...detected }
      })
      setSelectedFile(file)
      setSheets(detectedSheets)
      // Only sheets that still need the user start expanded.
      setExpandedSheets(new Set(detectedSheets.filter(sheetNeedsAttention).map((s) => s.id)))
      setEmptyRows(parsed.emptyRows)
      setFileRowCount(parsed.rowCount)
      setStage('mapping')
    } catch (parseError) {
      if (runId !== runIdRef.current) return
      setSelectedFile(null)
      setSheets([])
      setError(parseError.message || 'We could not read that spreadsheet.')
    } finally {
      if (runId === runIdRef.current) setProcessingFile(false)
    }
  }

  function handleCancelProcessing() {
    runIdRef.current += 1 // any in-flight parse is now stale
    setProcessingFile(false)
    setError(null)
  }

  function toggleExpanded(sheetId) {
    setExpandedSheets((prev) => {
      const next = new Set(prev)
      if (next.has(sheetId)) next.delete(sheetId)
      else next.add(sheetId)
      return next
    })
  }

  function updateSheet(sheetId, updater) {
    setSheets((current) => current.map((sheet) => (sheet.id === sheetId ? updater(sheet) : sheet)))
  }

  function changeDataset(sheetId, datasetKey) {
    updateSheet(sheetId, (sheet) => ({
      ...sheet,
      datasetKey,
      mapping: datasetKey && datasetKey !== 'skip' ? autoMapFields(sheet.headers, datasetKey, sheet.rows) : {},
      confirmed: Boolean(datasetKey),
      confidence: datasetKey && datasetKey !== 'skip' ? 1 : 0,
    }))
  }

  function changeMapping(sheetId, fieldKey, header) {
    updateSheet(sheetId, (sheet) => ({
      ...sheet,
      mapping: { ...sheet.mapping, [fieldKey]: header || undefined },
    }))
  }

  function buildPayload() {
    const datasets = Object.fromEntries(DATASET_KEYS.map((datasetKey) => [datasetKey, []]))
    sheets.forEach((sheet) => {
      if (!sheet.datasetKey || sheet.datasetKey === 'skip') return
      const config = MIGRATION_DATASETS[sheet.datasetKey]
      sheet.rows.forEach((row) => {
        const values = Object.fromEntries(config.fields
          .filter((field) => sheet.mapping[field.key])
          .map((field) => [field.key, row.values[sheet.mapping[field.key]] ?? null]))
        datasets[sheet.datasetKey].push({
          source_row: row.source_row,
          sheet_name: sheet.name,
          values,
        })
      })
    })

    return {
      file: { name: selectedFile.name, size: selectedFile.size },
      empty_rows: emptyRows,
      datasets,
    }
  }

  async function handleAnalyze() {
    if (!canAnalyze || analyzing) return
    setError(null)
    setAnalyzing(true)
    try {
      const response = await apiFetch('/api/migrations/analyze', {
        method: 'POST',
        body: JSON.stringify(buildPayload()),
      })
      setReview(response.data)
      setStage('review')
      void refreshHistory()
    } catch (requestError) {
      setError(requestError.message || 'We could not check this file.')
    } finally {
      setAnalyzing(false)
    }
  }

  const attentionGroups = useMemo(() => review ? groupIssues(review.issues || [], 'attention') : [], [review])
  const duplicateGroups = useMemo(() => review ? groupIssues(review.issues || [], 'duplicate') : [], [review])

  async function handleImport() {
    if (!review || importing) return

    setError(null)
    setImporting(true)
    try {
      const response = await apiFetch(`/api/migrations/${review.id}/commit`, {
        method: 'POST',
        body: JSON.stringify({ confirm_attention: attentionGroups.length > 0 }),
      })
      setImportResult(response.data)
      setStage('complete')
      void refreshHistory()
    } catch (requestError) {
      setError(requestError.message || 'We could not finish this import.')
    } finally {
      setImporting(false)
    }
  }

  async function handleRollback(importId) {
    if (rollingBack) return
    setError(null)
    setRollingBack(true)
    try {
      await apiFetch(`/api/migrations/${importId}/rollback`, { method: 'POST' })
      setRollbackTarget(null)
      await refreshHistory()
    } catch (requestError) {
      setError(requestError.message || 'Rollback is unavailable for this import.')
    } finally {
      setRollingBack(false)
    }
  }

  function startAnotherImport() {
    setSelectedFile(null)
    setSheets([])
    setExpandedSheets(new Set())
    setEmptyRows(0)
    setFileRowCount(0)
    setReview(null)
    setImportResult(null)
    setError(null)
    setStage('upload')
  }

  function moveBack(target) {
    if (target === 'upload') {
      startAnotherImport()
      return
    }
    if (target === 'mapping' && selectedFile) {
      setReview(null)
      setStage('mapping')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8">
      <div>
        <p className="font-mono text-sm font-bold uppercase tracking-wider text-[var(--color-stamp)]">Bring in your data</p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--color-ink)] sm:text-3xl">Move your records into DANN</h1>
        <p className="mt-2 max-w-2xl text-base text-[var(--color-ink)]/75">
          Upload a spreadsheet with your products, materials, customers, orders, production history or recipes. Any layout works.
        </p>
      </div>

      <StageProgress stage={stage} onBack={moveBack} />
      <ValidationAlert message={error} title="Import issue" />

      {stage === 'upload' && (
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-5 shadow-sm sm:p-7">
          <UploadDropzone
            fileInputRef={fileInputRef}
            onFileSelect={(file) => void processFile(file)}
            processingFile={processingFile}
            onCancelProcessing={handleCancelProcessing}
          />
          <p className="mt-4 text-center text-sm text-[var(--color-ink)]/75">
            Files stay on your device. Existing records are never overwritten, and duplicates are skipped.
          </p>
        </section>
      )}

      {stage === 'mapping' && (
        <section className="flex flex-col gap-5">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-5 shadow-sm sm:p-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <h2 className="text-xl font-bold text-[var(--color-ink)]">
                  {sheetsNeedingYou === 0
                    ? 'Everything was detected — please confirm'
                    : `${formatNumber(sheetsNeedingYou)} sheet${sheetsNeedingYou === 1 ? '' : 's'} need a quick answer`}
                </h2>
                <p className="mt-2 text-base text-[var(--color-ink)]/75">
                  <span className="font-semibold text-[var(--color-ink)]">{selectedFile?.name}</span> · {formatNumber(fileRowCount)} rows across {sheets.length} sheet{sheets.length === 1 ? '' : 's'}
                </p>
                <p className="mt-1 text-sm text-[var(--color-ink)]/75">
                  {sheetsNeedingYou === 0
                    ? 'DANN matched every sheet and column. If something looks wrong, press Change on it.'
                    : 'DANN matched the rest automatically. Answer the open sheets below, then continue.'}
                </p>
              </div>
              <button type="button" onClick={startAnotherImport} className="w-fit rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-bold text-[var(--color-ink)] hover:bg-[var(--color-paper)]">Choose another file</button>
            </div>
          </div>

          {sheets.map((sheet) => {
            const config = MIGRATION_DATASETS[sheet.datasetKey]
            const isSkipped = sheet.datasetKey === 'skip'
            const isExpanded = expandedSheets.has(sheet.id)
            const confidence = Math.round((sheet.confidence || 0) * 100)
            const problems = sheetProblems(sheet)

            // A sheet collapses to one line only when it was detected AND
            // every required column is mapped. Anything else stays open.
            if (sheet.confirmed && config && !isExpanded && problems.length === 0) {
              return (
                <article key={sheet.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-success)]/40 bg-[var(--color-success)]/5 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-success)]/15 text-[var(--color-success)]"><CheckCircle2 size={18} /></span>
                    <div>
                      <p className="text-base font-bold text-[var(--color-ink)]">{sheet.name} → {config.label}</p>
                      <p className="text-sm text-[var(--color-ink)]/75">{formatNumber(sheet.rows.length)} rows · all columns matched</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => toggleExpanded(sheet.id)} className="shrink-0 text-sm font-semibold text-[var(--color-stamp)] hover:underline">Change</button>
                </article>
              )
            }

            return (
              <article key={sheet.id} className={`overflow-hidden rounded-2xl border bg-[var(--color-paper-light)] shadow-sm ${problems.length > 0 || !sheet.confirmed ? 'border-[var(--color-warning)]' : 'border-[var(--color-border)]'}`}>
                <div className="flex flex-col justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-stamp)]/10 text-[var(--color-stamp)]"><FileSpreadsheet size={19} /></span><div><h3 className="text-base font-bold text-[var(--color-ink)]">{sheet.name}</h3><p className="text-sm text-[var(--color-ink)]/75">{formatNumber(sheet.rows.length)} rows · {formatNumber(sheet.headers.length)} columns</p></div></div>
                  <div className="flex items-center gap-2">
                    <select value={sheet.datasetKey} onChange={(event) => changeDataset(sheet.id, event.target.value)} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none">
                      <option value="">What is this sheet?</option>
                      {DATASET_KEYS.map((datasetKey) => <option key={datasetKey} value={datasetKey}>{MIGRATION_DATASETS[datasetKey].label}</option>)}
                      <option value="skip">Skip this sheet</option>
                    </select>
                    {sheet.confirmed && config && problems.length === 0 && (
                      <button type="button" onClick={() => toggleExpanded(sheet.id)} className="shrink-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-bold text-[var(--color-ink)]/75 hover:bg-[var(--color-paper)]">Done</button>
                    )}
                  </div>
                </div>

                {isSkipped ? (
                  <p className="px-5 py-5 text-base text-[var(--color-ink)]/75">This sheet won't be included.</p>
                ) : config ? (
                  <div className="p-5">
                    {problems.length > 0 && (
                      <p className="mb-3 rounded-lg bg-[var(--color-warning)]/10 px-3 py-2 text-sm font-semibold text-[var(--color-ink)]">{problems[0]}</p>
                    )}
                    {confidence > 0 && confidence < 100 && (
                      <p className="mb-3 text-sm text-[var(--color-ink)]/75">DANN matched {confidence}% of this sheet to {config.label.toLowerCase()} automatically — check the rest below.</p>
                    )}
                    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                      <table className="w-full min-w-[560px] text-left text-sm">
                        <thead className="bg-[var(--color-paper)]/50 font-mono text-xs uppercase tracking-wide text-[var(--color-ink)]/75"><tr><th className="px-4 py-3">DANN needs</th><th className="px-4 py-3">Your column</th><th className="px-4 py-3">Example from your file</th></tr></thead>
                        <tbody className="divide-y divide-[var(--color-border)]/70">
                          {config.fields.map((field) => {
                            const chosen = sheet.mapping[field.key]
                            const example = chosen ? sheet.rows[0]?.values?.[chosen] : null
                            const missingRequired = field.required && !chosen
                            return (
                              <tr key={field.key}>
                                <td className="px-4 py-3 font-medium text-[var(--color-ink)]">
                                  {field.label}
                                  {field.required && <span className="ml-2 text-xs font-bold text-[var(--color-error)]">Required</span>}
                                </td>
                                <td className="px-4 py-2">
                                  <select value={chosen || ''} onChange={(event) => changeMapping(sheet.id, field.key, event.target.value)} className={`w-full rounded-lg border bg-[var(--color-paper-light)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-stamp)] focus:outline-none ${missingRequired ? 'border-[var(--color-error)]' : 'border-[var(--color-border)]'}`}>
                                    <option value="">{field.required ? 'Choose a column…' : 'Not in my file'}</option>
                                    {sheet.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                                  </select>
                                </td>
                                <td className="max-w-[200px] truncate px-4 py-3 font-mono text-sm text-[var(--color-ink)]/75" title={example ? String(example) : ''}>{example ? String(example) : '—'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : <p className="px-5 py-5 text-base text-[var(--color-ink)]">Choose what this sheet is above — DANN couldn't guess confidently.</p>}
              </article>
            )
          })}

          <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={startAnotherImport} className="flex w-fit items-center gap-2 text-sm font-semibold text-[var(--color-ink)]/75 hover:text-[var(--color-ink)]"><ArrowLeft size={16} /> Start over</button>
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <button type="button" disabled={!canAnalyze || analyzing} onClick={handleAnalyze} className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] px-5 py-3 text-base font-bold text-white hover:bg-[var(--color-stamp-dark)] disabled:cursor-not-allowed disabled:opacity-50">{analyzing && <Loader2 size={17} className="animate-spin" />}{analyzing ? 'Checking your data…' : sheetsNeedingYou === 0 ? 'Looks right — check my data' : 'Check my data'}<ArrowRight size={17} /></button>
              {!canAnalyze && mappingProblems.length > 0 && (
                <p className="text-sm text-[var(--color-ink)]/75">Answer the open sheets above to continue.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {stage === 'review' && review && (
        <section className="flex flex-col gap-5">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-[var(--color-ink)]">
              {formatNumber(review.summary.valid)} ready to import
            </h2>
            <p className="mt-2 text-base text-[var(--color-ink)]/75">
              {review.summary.attention > 0 || review.summary.duplicates > 0
                ? 'The rest of your data is ready. Rows listed below will be skipped.'
                : 'Everything looks good — nothing needs your attention.'}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <CountCard label="Ready" value={review.summary.valid} tone="success" />
              <CountCard label="Will be skipped" value={review.summary.attention} tone="warning" />
              <CountCard label="Duplicates" value={review.summary.duplicates} tone="muted" />
              <CountCard label="Empty rows" value={emptyRows} tone="muted" />
            </div>
          </div>

          <DatasetSummary summary={review.summary} />

          {attentionGroups.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-base font-bold text-[var(--color-ink)]">Skipped because they need fixing ({formatNumber(review.summary.attention)} rows)</h3>
              <p className="text-sm text-[var(--color-ink)]/75">Fix these in your spreadsheet and import again if you need them. Everything else imports normally.</p>
              {attentionGroups.map((group) => (
                <IssueGroupCard key={group.key} group={group} tone="attention" />
              ))}
            </div>
          )}

          {duplicateGroups.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-base font-bold text-[var(--color-ink)]">Already in DANN ({formatNumber(review.summary.duplicates)} rows)</h3>
              <p className="text-sm text-[var(--color-ink)]/75">These match something already saved — nothing to do, they're skipped automatically.</p>
              {duplicateGroups.map((group) => (
                <IssueGroupCard key={group.key} group={group} tone="duplicate" />
              ))}
            </div>
          )}

          <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={() => moveBack('mapping')} className="flex w-fit items-center gap-2 text-sm font-semibold text-[var(--color-ink)]/75 hover:text-[var(--color-ink)]"><ArrowLeft size={16} /> Go back</button>
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <button type="button" disabled={review.summary.valid === 0 || importing} onClick={handleImport} className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] px-5 py-3 text-base font-bold text-white hover:bg-[var(--color-stamp-dark)] disabled:cursor-not-allowed disabled:opacity-50">{importing && <Loader2 size={17} className="animate-spin" />}{importing ? 'Importing…' : `Import ${formatNumber(review.summary.valid)} records`}<ArrowRight size={17} /></button>
              {review.summary.attention > 0 && (
                <p className="text-sm text-[var(--color-ink)]/75">{formatNumber(review.summary.attention)} rows will be skipped.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {stage === 'complete' && importResult && (
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-6 text-center shadow-sm sm:p-9">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-success)] text-white"><CheckCircle2 size={30} /></span>
          <h2 className="mt-5 text-2xl font-bold text-[var(--color-ink)]">Your data is in DANN</h2>
          <p className="mx-auto mt-2 max-w-xl text-base text-[var(--color-ink)]/75">{formatNumber(totalCount(importResult.imported_counts))} records imported. If anything had failed, nothing would have been saved.</p>
          <div className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">{DATASET_KEYS.filter((key) => importResult.imported_counts?.[key] > 0).map((key) => <CountCard key={key} label={MIGRATION_DATASETS[key].label} value={importResult.imported_counts[key]} tone="success" />)}</div>
          <div className="mx-auto mt-7 flex max-w-lg flex-col gap-3 sm:flex-row"><button type="button" onClick={startAnotherImport} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-3 text-base font-bold text-[var(--color-ink)] hover:bg-[var(--color-paper)]"><FileSpreadsheet size={17} /> Import another file</button><button type="button" onClick={() => navigate('/')} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] px-4 py-3 text-base font-bold text-white hover:bg-[var(--color-stamp-dark)]">Open workspace <ArrowRight size={17} /></button></div>
        </section>
      )}

      {history.length > 0 && (
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-5 shadow-sm">
          <div className="flex items-center gap-2"><History size={18} className="text-[var(--color-stamp)]" /><div><h2 className="text-base font-bold text-[var(--color-ink)]">Previous imports</h2><p className="text-sm text-[var(--color-ink)]/75">You can undo an import as long as nothing imported has changed since.</p></div></div>
          <div className="mt-4 divide-y divide-[var(--color-border)]">{history.map((entry) => <div key={entry.id} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="text-base font-bold text-[var(--color-ink)]">{entry.file_name}</p><p className="mt-1 text-sm text-[var(--color-ink)]/75">{entry.completed_at ? new Date(entry.completed_at).toLocaleString() : 'Completed'} · {formatNumber(totalCount(entry.imported_counts))} imported</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-sm font-bold ${entry.status === 'completed' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-paper)] text-[var(--color-ink)]/75'}`}>{entry.status === 'rolled_back' ? 'Undone' : 'Imported'}</span></div>{entry.can_rollback && (rollbackTarget === entry.id ? <div className="mt-3 flex flex-col gap-3 rounded-xl border border-[var(--color-warning)] bg-[var(--color-warning)]/10 p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-[var(--color-ink)]">This will delete every record from this import, as long as none have been changed since.</p><div className="flex gap-2"><button type="button" onClick={() => setRollbackTarget(null)} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-bold text-[var(--color-ink)]">Cancel</button><button type="button" disabled={rollingBack} onClick={() => handleRollback(entry.id)} className="flex items-center gap-2 rounded-lg bg-[var(--color-error)] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{rollingBack && <Loader2 size={14} className="animate-spin" />}Confirm</button></div></div> : <button type="button" onClick={() => setRollbackTarget(entry.id)} className="mt-3 flex items-center gap-2 text-sm font-bold text-[var(--color-ink)]/75 hover:text-[var(--color-error)]"><RotateCcw size={14} /> Undo this import</button>)}</div>)}</div>
        </section>
      )}
    </div>
  )
}