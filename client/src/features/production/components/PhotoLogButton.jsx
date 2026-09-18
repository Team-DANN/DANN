import { useRef, useState } from 'react'
import { Camera, Upload } from 'lucide-react'

const MAX_PHOTOS = 5 // caps how much of the daily OCR.space quota one submission can use
const MAX_BYTES = 1_000_000 // OCR.space free-tier limit — checked here, not just on failure

export default function PhotoLogButton({ onPhotosSelected, processing }) {
  const cameraInputRef = useRef(null)
  const uploadInputRef = useRef(null)
  const [error, setError] = useState(null)

  function validateAndSubmit(fileList) {
    let files = Array.from(fileList)
    if (files.length === 0) return

    if (files.length > MAX_PHOTOS) {
      setError(`Max ${MAX_PHOTOS} photos at a time — using the first ${MAX_PHOTOS}.`)
      files = files.slice(0, MAX_PHOTOS)
    } else {
      setError(null)
    }

    const oversized = files.filter((f) => f.size > MAX_BYTES)
    if (oversized.length > 0) {
      setError(`${oversized.length} photo(s) are over 1MB and were skipped — try a lower-res shot.`)
    }

    const valid = files.filter((f) => f.size <= MAX_BYTES)
    if (valid.length > 0) onPhotosSelected(valid)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">
        <button
          type="button"
          disabled={processing}
          onClick={() => cameraInputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] py-3 text-sm font-medium text-[var(--color-ink)] disabled:opacity-50 lg:py-4 lg:text-base"
        >
          <Camera size={18} strokeWidth={2} />
          Take photo
        </button>
        <button
          type="button"
          disabled={processing}
          onClick={() => uploadInputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] py-3 text-sm font-medium text-[var(--color-ink)] disabled:opacity-50 lg:py-4 lg:text-base"
        >
          <Upload size={18} strokeWidth={2} />
          Upload photos
        </button>
      </div>

      <p className="text-xs text-[var(--color-ink-muted)]">Up to {MAX_PHOTOS} photos, 1MB each</p>
      {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
      {processing && <p className="text-xs text-[var(--color-ink-muted)]">Reading photos…</p>}

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => validateAndSubmit(e.target.files)} />
      <input ref={uploadInputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => validateAndSubmit(e.target.files)} />
    </div>
  )
}