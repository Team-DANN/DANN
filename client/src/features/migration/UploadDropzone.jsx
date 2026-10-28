import { useState } from 'react'
import { Loader2, Upload } from 'lucide-react'

export default function UploadDropzone({ fileInputRef, onFileSelect, processingFile, onCancelProcessing }) {
  const [dragging, setDragging] = useState(false)

  function openPicker() {
    fileInputRef.current?.click()
  }

  function handleDragOver(event) {
    event.preventDefault()
    if (!processingFile) setDragging(true)
  }

  function handleDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false)
  }

  function handleDrop(event) {
    event.preventDefault()
    setDragging(false)
    if (processingFile) return
    const file = event.dataTransfer.files?.[0]
    if (file) onFileSelect(file)
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openPicker()
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) onFileSelect(file)
        }}
      />

      {processingFile ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--color-stamp)] bg-[var(--color-stamp)]/5 px-6 py-11 text-center">
          <Loader2 size={28} className="animate-spin text-[var(--color-stamp)]" aria-hidden="true" />
          <p className="text-base font-bold text-[var(--color-ink)]">Reading your spreadsheet…</p>
          <button
            type="button"
            onClick={onCancelProcessing}
            aria-label="Cancel reading file"
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]/75 transition-colors hover:border-[var(--color-stamp)] hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-stamp)]"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openPicker}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-label="Choose or drop a spreadsheet"
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-stamp)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper-light)] ${
            dragging
              ? 'border-[var(--color-stamp)] bg-[var(--color-stamp)]/10'
              : 'border-[var(--color-border)] bg-[var(--color-paper)]/30 hover:border-[var(--color-stamp)] hover:bg-[var(--color-stamp)]/5'
          }`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-stamp)]/10 text-[var(--color-stamp)]">
            <Upload size={24} aria-hidden="true" />
          </span>
          <div>
            <span className="block text-base font-bold text-[var(--color-ink)]">
              {dragging ? 'Drop to upload' : 'Choose or drop a spreadsheet'}
            </span>
            <span className="mt-1 block text-sm text-[var(--color-ink)]/75">.xlsx, .xls or .csv · up to 5 MB · 5,000 rows</span>
          </div>
        </div>
      )}
    </>
  )
}