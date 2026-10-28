import { Image, Play } from 'lucide-react'

export default function MediaSlot({ asset, className = '' }) {
  if (!asset) return null

  const { kind = 'image', src, poster, alt = '', label = 'Media', ratio = '16/9' } = asset

  // Aspect ratio class helper
  const ratioClass = ratio === '16/9' ? 'aspect-video' : `aspect-[${ratio}]`

  if (src) {
    if (kind === 'video') {
      return (
        <div className={`overflow-hidden rounded-2xl bg-ink border border-border/50 shadow-sm ${ratioClass} ${className}`}>
          <video
            src={src}
            poster={poster || undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={alt || label}
            className="h-full w-full object-cover"
          />
        </div>
      )
    }

    return (
      <div className={`overflow-hidden rounded-2xl bg-ink border border-border/50 shadow-sm ${ratioClass} ${className}`}>
        <img
          src={src}
          alt={alt || label}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  // Placeholder state when src is null
  const isVideo = kind === 'video'
  const Icon = isVideo ? Play : Image
  const placeholderTypeLabel = isVideo ? 'VIDEO PLACEHOLDER' : 'IMAGE PLACEHOLDER'
  const resolutionText = isVideo ? '16:9' : '1600×900'

  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-stamp/5 p-6 text-center shadow-inner ${ratioClass} ${className}`}
      aria-label={`${placeholderTypeLabel} for ${label}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-stamp/20 bg-stamp/10 text-stamp shadow-sm">
        <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div>
        <p className="font-mono text-xs font-semibold tracking-wider text-ink-muted uppercase">
          {placeholderTypeLabel} · {resolutionText}
        </p>
        <p className="mt-1.5 text-xs font-medium text-ink/80 max-w-xs sm:max-w-sm mx-auto">
          {label}
        </p>
      </div>
    </div>
  )
}
