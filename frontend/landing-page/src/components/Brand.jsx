import logoCharcoal from '../assets/DANN-logo-charcoal.webp'
import logoTerracotta from '../assets/DANN-logo-terracotta.webp'

export default function Brand({ tone = 'charcoal', compact = false }) {
  const logo = tone === 'terracotta' ? logoTerracotta : logoCharcoal

  return (
    <a className="brand" href="#top" aria-label="MicroMake home">
      <img className="brand__logo" src={logo} alt="DANN" />
      {!compact && (
        <span className="brand__product">
          <span className="brand__name">MicroMake</span>
          <span className="brand__eyebrow">by DANN</span>
        </span>
      )}
    </a>
  )
}
