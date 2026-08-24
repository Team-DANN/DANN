import { AlertTriangle, Boxes, ClipboardCheck, IndianRupee, PackageOpen, Store } from 'lucide-react'
import Reveal from './Reveal.jsx'
import SectionHeader from './SectionHeader.jsx'

const features = [
  {
    icon: Boxes,
    number: '01',
    title: 'Materials & recipes',
    body: 'List raw materials with stock and cost, then define what each product needs.',
  },
  {
    icon: ClipboardCheck,
    number: '02',
    title: 'Daily production logging',
    body: 'Record what you made. MicroMake deducts recipe materials and adds finished stock.',
  },
  {
    icon: PackageOpen,
    number: '03',
    title: 'Finished inventory',
    body: 'See current product stock without rebuilding a spreadsheet or doing a full manual count.',
  },
  {
    icon: Store,
    number: '04',
    title: 'Retailers & orders',
    body: 'Track deliveries against inventory and keep paid or unpaid order status visible.',
  },
  {
    icon: IndianRupee,
    number: '05',
    title: 'Cost & profit',
    body: 'Connect material cost in with revenue out to understand margins by batch and period.',
  },
  {
    icon: AlertTriangle,
    number: '06',
    title: 'Low-stock alerts',
    body: 'Use simple threshold warnings to spot shortages before they block production.',
  },
]

export default function FeaturesSection() {
  return (
    <section className="section section--light" id="features">
      <div className="container">
        <Reveal>
          <SectionHeader
            eyebrow="The six-part MVP"
            title="Only the tools a small manufacturer needs to run the daily loop."
            body="No HR suite. No accounting maze. No implementation project. The first version stays focused on the path from raw materials to money in."
          />
        </Reveal>

        <div className="feature-grid">
          {features.map(({ icon: Icon, number, title, body }, index) => (
            <Reveal key={title} delay={(index % 3) * 70}>
              <article className="feature-card">
                <div className="feature-card__top">
                  <div className="icon-box icon-box--stamp"><Icon size={22} /></div>
                  <span className="feature-number data-number">{number}</span>
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
