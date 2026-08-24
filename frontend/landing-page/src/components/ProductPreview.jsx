import { AlertTriangle, ArrowUpRight, Check, PackageCheck, Wheat } from 'lucide-react'

export default function ProductPreview() {
  return (
    <div className="product-preview" aria-label="Illustrative DANN production overview">
      <div className="preview-topbar">
        <div>
          <span className="preview-kicker">TODAY'S WORKSHOP</span>
          <strong>Good morning</strong>
        </div>
        <div className="preview-avatar" aria-hidden="true">M</div>
      </div>

      <div className="preview-grid">
        <article className="preview-stat preview-stat--wide">
          <span className="preview-label">Finished stock</span>
          <div className="preview-stat-row">
            <strong className="data-number">286</strong>
            <span className="trend"><ArrowUpRight size={14} /> 36 today</span>
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
          <PackageCheck size={20} />
          <span className="preview-label">Produced</span>
          <strong className="data-number data-number--sm">36 packs</strong>
          <span className="preview-note"><Check size={13} /> Stock updated</span>
        </article>

        <article className="preview-stat preview-stat--warning">
          <AlertTriangle size={20} />
          <span className="preview-label">Low stock</span>
          <strong className="data-number data-number--sm">2 materials</strong>
          <span className="preview-note">Reorder soon</span>
        </article>
      </div>

      <div className="production-entry">
        <div className="production-entry__icon"><Wheat size={19} /></div>
        <div className="production-entry__copy">
          <span>Production logged</span>
          <strong>Masala snack · 36 packs</strong>
        </div>
        <span className="production-entry__time data-number">09:42</span>
      </div>

      <div className="preview-footer">
        <span>Materials</span>
        <span className="active">Production</span>
        <span>Orders</span>
        <span>Profit</span>
      </div>
    </div>
  )
}
