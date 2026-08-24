import { ArrowRight, CheckCircle2 } from 'lucide-react'
import ProductPreview from './ProductPreview.jsx'
import Reveal from './Reveal.jsx'

export default function Hero() {
  return (
      <section className="hero section-shell" id="top">
        <div className="container hero-grid">
          <Reveal className="hero-copy">
            <div className="hero-pill"><span /> Built for small-batch manufacturers</div>
            <h1>
              Run production with clarity — <em>without ERP complexity.</em>
            </h1>
            <p className="hero-lede">
              DANN connects materials, daily production, finished stock, retailer orders and profit in one simple mobile-first workflow.
            </p>
            <div className="hero-actions">
              <a className="button button--primary" href="#pilot">
                Join the pilot <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="button button--secondary" href="#how-it-works">See how it works</a>
            </div>
            <div className="hero-trust" aria-label="Product principles">
              <span><CheckCircle2 size={16} /> Minimal typing</span>
              <span><CheckCircle2 size={16} /> Mobile-first</span>
              <span><CheckCircle2 size={16} /> Poor-connectivity tolerant</span>
            </div>
          </Reveal>

          <Reveal className="hero-visual" delay={100}>
            <div className="hero-visual__tag hero-visual__tag--top">SHOP-FLOOR READY</div>
            <ProductPreview />
            <div className="hero-visual__tag hero-visual__tag--bottom">ONE CONNECTED LOOP</div>
          </Reveal>
        </div>
      </section>
  )
}
