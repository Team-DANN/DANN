import logoCharcoal from '../assets/DANN-logo-charcoal.webp'
import logoTerracotta from '../assets/DANN-logo-terracotta.webp'

export default function Brand({ tone = 'charcoal', compact = false }) {
  const logo = tone === 'terracotta' ? logoTerracotta : logoCharcoal

  return (
    <a className="brand" href="#top" aria-label="DANN home">
      <img className="brand__logo" src={logo} alt="DANN" />
      {!compact && (
        <span className="brand__product">
          <span className="brand__name">DANN</span>
        </span>
      )}
    </a>
  )
}
