import { CloudOff, Factory, Fingerprint, Smartphone, Type, UserRound } from 'lucide-react'
import Reveal from './Reveal.jsx'
import SectionHeader from './SectionHeader.jsx'

const principles = [
  { icon: Smartphone, title: 'Phone first', text: 'Designed to be usable from the shop floor, not only from a desk.' },
  { icon: Type, title: 'Minimal typing', text: 'Pick-from-list interactions wherever possible for faster daily logging.' },
  { icon: CloudOff, title: 'Connectivity-aware', text: 'Built with poor-connectivity tolerance in mind, with syncing when back online.' },
  { icon: UserRound, title: 'Works for one person', text: 'No roles, permissions or workflow overhead before the business needs them.' },
]

export default function BuiltForSection() {
  return (
    <section className="section built-for" id="why-dann">
      <div className="container built-for-grid">
        <Reveal className="built-for-copy">
          <SectionHeader
            eyebrow="Built for small manufacturers"
            title="The operating rhythm of a larger factory, sized for one owner."
            body="DANN is for the person buying materials, making the product and managing retailer relationships — often all in the same day."
          />
          <div className="manufacturer-chips" aria-label="Example manufacturers">
            <span><Factory size={15} /> Tile makers</span>
            <span><Fingerprint size={15} /> Snack producers</span>
            <span><Factory size={15} /> Small drinks bottlers</span>
          </div>
        </Reveal>

        <div className="principle-list">
          {principles.map(({ icon: Icon, title, text }, index) => (
            <Reveal key={title} delay={index * 70}>
              <article className="principle-row">
                <div className="principle-row__number data-number">0{index + 1}</div>
                <div className="principle-row__icon"><Icon size={21} /></div>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
