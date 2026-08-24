import Brand from './Brand.jsx'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Brand tone="terracotta" />
          <p>Simple production and inventory management for small-scale manufacturers.</p>
        </div>

        <nav className="footer-nav" aria-label="Footer navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#why-dann">Why DANN</a>
          <a href="#pilot">Pilot</a>
        </nav>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} DANN.</span>
        <span>Built for the shop floor, not the IT department.</span>
      </div>
    </footer>
  )
}
