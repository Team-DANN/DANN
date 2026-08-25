import { ArrowRight, CheckCircle2 } from 'lucide-react'
import ProductPreview from './ProductPreview.jsx'
import Reveal from './Reveal.jsx'

export default function Hero() {
  return (
    <section className="hero section-shell" id="top">
      <div className="container hero-grid">
        <Reveal className="hero-copy">
          <h1>
            Run your production. Know your stock. Understand your profit.
          </h1>

          <p className="hero-lede">
            DANN connects materials, production, inventory, retailer orders and
            profit in one simple workflow built for small manufacturers.
          </p>

          <div className="hero-actions">
            <a className="button button--primary" href="#pilot">
              Sign up
              <ArrowRight size={18} aria-hidden="true" />
            </a>

            <a
              className="button button--secondary"
              href="#how-it-works"
            >
              See how it works
            </a>
          </div>

          <div className="hero-trust" aria-label="DANN product principles">
            <span>
              <CheckCircle2 size={16} aria-hidden="true" />
              Mobile-first
            </span>

            <span>
              <CheckCircle2 size={16} aria-hidden="true" />
              Minimal typing
            </span>

            <span>
              <CheckCircle2 size={16} aria-hidden="true" />
              Built for everyday production
            </span>
          </div>
        </Reveal>

        <Reveal className="hero-visual" delay={100}>
          <div className="hero-visual__frame">
            <ProductPreview />
          </div>
        </Reveal>
      </div>
    </section>
  )
}