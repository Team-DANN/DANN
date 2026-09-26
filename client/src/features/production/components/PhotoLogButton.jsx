import { useRef, useState } from 'react'
import { Camera, Upload } from 'lucide-react'

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

export default function PhotoLogButton({ onPhotosSelected, processing }) {
  const cameraInputRef = useRef(null)
  const uploadInputRef = useRef(null)
  const [error, setError] = useState(null)
  const [compressing, setCompressing] = useState(false)

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
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">
        <button
          type="button"
          disabled={processing || compressing}
          onClick={() => cameraInputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] py-3 text-sm font-medium text-[var(--color-ink)] disabled:opacity-50 lg:py-4 lg:text-base"
        >
          <Camera size={18} strokeWidth={2} />
          Take photo
        </button>
        <button
          type="button"
          disabled={processing || compressing}
          onClick={() => uploadInputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] py-3 text-sm font-medium text-[var(--color-ink)] disabled:opacity-50 lg:py-4 lg:text-base"
        >
          <Upload size={18} strokeWidth={2} />
          Upload photos
        </button>
      </div>

      <p className="text-xs text-[var(--color-ink-muted)]">Up to {MAX_PHOTOS} photos — large photos are resized automatically</p>
      {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
      {compressing && <p className="text-xs text-[var(--color-ink-muted)]">Preparing photos...</p>}
      {processing && <p className="text-xs text-[var(--color-ink-muted)]">Reading photos...</p>}

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => validateAndSubmit(e.target.files)} />
      <input ref={uploadInputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => validateAndSubmit(e.target.files)} />
    </div>
  )
}