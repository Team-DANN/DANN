import {
  AlertTriangle,
  Check,
  PackageCheck,
  ShoppingBag,
} from 'lucide-react'

export default function ProductPreview() {
  return (
    <div
      className="product-preview"
      aria-label="Illustrative DANN production dashboard"
    >
      <div className="preview-chrome">
        <div className="preview-chrome__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <span className="preview-chrome__title">
          DANN | Production overview
        </span>
      </div>

      <div className="preview-body">
        <div className="preview-topbar">
          <div>
            <span className="preview-kicker">Today</span>
            <strong>Production overview</strong>
          </div>

          <div className="preview-status">
            <span className="preview-status__dot" aria-hidden="true" />
            Updated
          </div>
        </div>

        <div className="preview-grid">
          <article className="preview-stat preview-stat--wide">
            <div className="preview-stat__head">
              <span className="preview-label">Finished inventory</span>
              <span className="preview-badge preview-badge--success">
                36 added today
              </span>
            </div>

            <div className="preview-stat-row">
              <strong className="data-number">286</strong>
              <span className="trend">units available</span>
            </div>

            <div className="mini-bars" aria-hidden="true">
              <span style={{ height: '38%' }} />
              <span style={{ height: '52%' }} />
              <span style={{ height: '44%' }} />
              <span style={{ height: '69%' }} />
              <span style={{ height: '58%' }} />
              <span style={{ height: '78%' }} />
              <span style={{ height: '72%' }} />
            </div>
          </article>

          <article className="preview-stat">
            <PackageCheck size={18} aria-hidden="true" />

            <span className="preview-label">Production logged</span>

            <strong className="data-number data-number--sm">
              36 packs
            </strong>

            <span className="preview-note">
              <Check size={13} aria-hidden="true" />
              Inventory updated
            </span>
          </article>

          <article className="preview-stat preview-stat--warning">
            <AlertTriangle size={18} aria-hidden="true" />

            <span className="preview-label">Low stock</span>

            <strong className="data-number data-number--sm">
              2 materials
            </strong>

            <span className="preview-note">
              Reorder soon
            </span>
          </article>
        </div>

        <div className="production-entry">
          <div className="production-entry__icon">
            <ShoppingBag size={18} aria-hidden="true" />
          </div>

          <div className="production-entry__copy">
            <span>Latest production entry</span>
            <strong>Masala snack | 36 packs</strong>
          </div>

          <span className="production-entry__time data-number">
            09:42
          </span>
        </div>

        <div
          className="preview-footer"
          aria-label="Dashboard sections"
        >
          <span>Materials</span>
          <span className="active">Production</span>
          <span>Orders</span>
          <span>Profit</span>
        </div>
      </div>
    </div>
  )
}