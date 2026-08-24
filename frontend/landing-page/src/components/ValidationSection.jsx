import { BarChart3, CircleAlert, PackageSearch } from 'lucide-react'
import Reveal from './Reveal.jsx'
import SectionHeader from './SectionHeader.jsx'

const signals = [
  {
    icon: PackageSearch,
    value: '15',
    label: 'owner interviews',
    body: 'Across tile, food, beverage and other small manufacturing businesses.',
  },
  {
    icon: CircleAlert,
    value: '10 / 15',
    label: 'mentioned a stock-out',
    body: 'Mid-production shortages appeared as a recurring operational pain point.',
  },
  {
    icon: BarChart3,
    value: 'Repeated',
    label: 'profit surprises',
    body: 'Owners repeatedly described discovering that a product was less profitable than assumed.',
  },
]

export default function ValidationSection() {
  return (
    <section className="section validation-section" id="validation">
      <div className="container">
        <Reveal>
          <SectionHeader
            eyebrow="Grounded in real workflows"
            title="The pilot starts with problems manufacturers already described."
            body="The business-plan research found a consistent pattern: knowing real-time material stock, finished inventory and weekly profit still takes manual effort for many small owners."
          />
        </Reveal>

        <div className="validation-grid">
          {signals.map(({ icon: Icon, value, label, body }, index) => (
            <Reveal key={label} delay={index * 80}>
              <article className="validation-card">
                <Icon size={22} />
                <strong className="validation-value data-number">{value}</strong>
                <h3>{label}</h3>
                <p>{body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
