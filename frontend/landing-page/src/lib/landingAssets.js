/**
 * LANDING ASSETS REGISTRY
 * 
 * RECOMMENDED SIZES & FORMATS FOR MEDIA ASSETS:
 * - Images: WebP or PNG format, 1600px max width, compressed (< 300 KB).
 * - Videos: MP4 format (H.264 video codec), max 1600px width, < 5 MB file size, looped, muted / no audio track.
 * 
 * ASSET PLACEMENT INSTRUCTIONS:
 * - Place static media files into `frontend/landing-page/public/` directory (e.g. `public/images/step1.webp`).
 * - Reference public path as string starting with leading slash (e.g. `src: "/images/step1.webp"`).
 * - Or import local assets from `src/assets/` and assign directly to `src`.
 * - When `src` is `null`, the component automatically renders a styled placeholder box.
 */

import productionVideo from '../assets/production.mp4'
import profitVideo from '../assets/profit.mp4'
import orderImage from '../assets/order.png'
import inventoryImage from '../assets/inventory.png'
import migrationImage from '../assets/migration.png'

export const LANDING_ASSETS = {
  howStep1: {
    kind: 'video',
    src: productionVideo,
    poster: null,
    alt: 'Voice logging on the shop floor demo video',
    label: 'Voice logging on the shop floor',
    ratio: '16/9',
  },
  howStep2: {
    kind: 'image',
    src: inventoryImage,
    alt: 'DANN raw material runway and stock warning screen',
    label: 'Stock runway warning screen',
    ratio: '16/9',
  },
  howStep3: {
    kind: 'image',
    src: orderImage,
    alt: 'DANN retailer dispatch and payment tracking screen',
    label: 'Retailer dispatches and payment tracking',
    ratio: '16/9',
  },
  bentoVoice: {
    kind: 'video',
    src: productionVideo,
    poster: null,
    alt: 'Voice-powered floor logging interactive preview',
    label: 'Voice-powered floor logging preview',
    ratio: '16/9',
  },
  bentoDispatches: {
    kind: 'image',
    src: inventoryImage,
    alt: 'Retailer dispatch and pending accounts receivable overview',
    label: 'Retailer dispatches & payment tracking preview',
    ratio: '16/9',
  },
  bentoProfit: {
    kind: 'video',
    src: profitVideo,
    poster: null,
    alt: 'Production cost and product profit calculation screen',
    label: 'Production cost & profit dashboard',
    ratio: '16/9',
  },
  importScreen: {
    kind: 'image',
    src: migrationImage,
    alt: 'DANN spreadsheet data migration tool showing column auto-mapping',
    label: 'Excel & CSV spreadsheet import tool',
    ratio: '16/9',
  },
}
