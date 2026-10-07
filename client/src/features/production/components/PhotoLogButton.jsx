// PATH: src/features/production/components/PhotoLogButton.jsx
import { useEffect, useRef, useState } from 'react'
import { Camera, Upload, Sparkles } from 'lucide-react'

const MAX_PHOTOS = 5 // caps how much of the daily OCR.space quota one submission can use
const MAX_BYTES = 1_000_000 // OCR.space free-tier limit
const MAX_DIMENSION = 1600 // long edge, px — plenty for OCR legibility at a fraction of the file size
const COMPRESS_QUALITIES = [0.8, 0.6, 0.45, 0.3] // tried in order until the result is under MAX_BYTES

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => { resolve(img); URL.revokeObjectURL(url) }
    img.onerror = (err) => { URL.revokeObjectURL(url); reject(err) }
    img.src = url
  })
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

// Real phone cameras routinely produce 2-8MB photos, far past the 1MB
// limit below — without this, "Take photo" rejected or silently skipped
// almost every real shot, and the only workaround was manually lowering
// camera resolution beforehand, which nobody actually does. This resizes
// to a long edge of MAX_DIMENSION and re-encodes as JPEG, trying
// progressively lower quality until it's under MAX_BYTES, before the
// size check below ever runs. Falls back to the original file if
// anything here fails (e.g. an unsupported image type) — the existing
// size check still catches that case with its normal message.
async function compressImage(file) {
  if (file.size <= MAX_BYTES) return file // already small enough, skip the work

  try {
    const img = await loadImage(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    for (const quality of COMPRESS_QUALITIES) {
      const blob = await canvasToBlob(canvas, quality)
      if (blob && blob.size <= MAX_BYTES) {
        return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
      }
    }
    // Never got under the limit even at the lowest quality — return the
    // smallest attempt anyway, so the "still over 1MB" message below
    // reports an honest, much-smaller size instead of the original's.
    const smallest = await canvasToBlob(canvas, COMPRESS_QUALITIES[COMPRESS_QUALITIES.length - 1])
    return smallest ? new File([smallest], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : file
  } catch {
    return file
  }
}

// autoTrigger ('camera' | 'upload' | undefined) lets a caller open the
// camera/upload picker immediately on mount — used by Sync Data's
// navigate-then-open handoff (sidebar can't reach a handler that only
// exists on whichever page is currently mounted, so it navigates here
// and this does the "click" for it). Caveat: a programmatic .click() on
// a file input fired from an effect after navigation, rather than a
// direct click handler, is reliable in Chrome but can be silently
// blocked on Safari/iOS if the browser decides user-activation didn't
// carry over the navigation. Worth testing on iOS specifically — if it's
// blocked there, the fallback is simply that the card is sitting right
// there, one real tap away, not a broken feature.
export default function PhotoLogButton({ onPhotosSelected, processing, autoTrigger }) {
  const cameraInputRef = useRef(null)
  const uploadInputRef = useRef(null)
  const [error, setError] = useState(null)
  const [compressing, setCompressing] = useState(false)

  useEffect(() => {
    if (autoTrigger === 'camera') cameraInputRef.current?.click()
    if (autoTrigger === 'upload') uploadInputRef.current?.click()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTrigger])

  async function validateAndSubmit(fileList) {
    let files = Array.from(fileList)
    if (files.length === 0) return

    if (files.length > MAX_PHOTOS) {
      setError(`Max ${MAX_PHOTOS} photos at a time — using the first ${MAX_PHOTOS}.`)
      files = files.slice(0, MAX_PHOTOS)
    } else {
      setError(null)
    }

    setCompressing(true)
    const compressed = await Promise.all(files.map(compressImage))
    setCompressing(false)

    const oversized = compressed.filter((f) => f.size > MAX_BYTES)
    if (oversized.length > 0) {
      setError(`${oversized.length} photo(s) are still over 1MB even after compressing — try a lower-res shot or crop tighter.`)
    }

    const valid = compressed.filter((f) => f.size <= MAX_BYTES)
    if (valid.length > 0) onPhotosSelected(valid)
  }

  return (
    <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-paper-light)] p-4 transition-colors hover:border-[var(--color-stamp)]/50 lg:p-6">
      <div className="flex items-start gap-3 lg:gap-4">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-paper)] text-[var(--color-stamp)] lg:h-14 lg:w-14">
          <Sparkles size={20} strokeWidth={2} className="lg:h-6 lg:w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-sans text-sm font-semibold text-[var(--color-ink)] lg:text-base">Add from a photo</p>
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)] lg:text-sm">
            Snap a batch sheet, label, or delivery note — DANN reads it and fills in the details for you.
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2 lg:gap-3">
        <button
          type="button"
          disabled={processing || compressing}
          onClick={() => cameraInputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-stamp)] py-2.5 text-sm font-semibold text-[var(--color-paper-light)] hover:bg-[var(--color-stamp-dark)] disabled:opacity-50 lg:py-3 lg:text-base"
        >
          <Camera size={16} strokeWidth={2} className="lg:h-[18px] lg:w-[18px]" />
          Take photo
        </button>
        <button
          type="button"
          disabled={processing || compressing}
          onClick={() => uploadInputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-stamp)] disabled:opacity-50 lg:py-3 lg:text-base"
        >
          <Upload size={16} strokeWidth={2} className="lg:h-[18px] lg:w-[18px]" />
          Upload
        </button>
      </div>

      <p className="mt-2 text-[11px] text-[var(--color-ink-muted)] lg:text-xs">
        Up to {MAX_PHOTOS} photos — large photos are resized automatically
      </p>
      {error && <p className="mt-1 text-xs text-[var(--color-error)]">{error}</p>}
      {compressing && <p className="mt-1 text-xs text-[var(--color-ink-muted)]">Preparing photos...</p>}
      {processing && <p className="mt-1 text-xs text-[var(--color-ink-muted)]">Reading photos...</p>}

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => validateAndSubmit(e.target.files)} />
      <input ref={uploadInputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => validateAndSubmit(e.target.files)} />
    </div>
  )
}