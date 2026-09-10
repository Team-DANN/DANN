import { Link } from 'react-router-dom'
import logoCharcoal from '../assets/logos/DANN-logo-charcoal.webp'

export default function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="DANN home">
      <img
        src={logoCharcoal}
        alt="DANN"
        className="h-8 w-auto sm:h-10 lg:h-11"
      />
    </Link>
  )
}
