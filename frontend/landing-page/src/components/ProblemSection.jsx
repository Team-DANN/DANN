import {
  Calculator,
  ClipboardCheck,
  PackageSearch,
  Truck,
} from 'lucide-react'
import Reveal from './Reveal.jsx'
import './ProblemSection.css'

const problems = [
  {
    icon: PackageSearch,
    title: 'Stock visibility',
    description:
      'Know what raw materials and finished products are available before shortages interrupt production.',
  },
  {
    icon: ClipboardCheck,
    title: 'Production tracking',
    description:
      'Keep daily production records clear and up to date as work moves through your shop floor.',
  },
  {
    icon: Truck,
    title: 'Orders and payments',
    description:
      'See what was delivered to each retailer and keep unpaid orders visible.',
  },
  {
    icon: Calculator,
    title: 'Profit clarity',
    description:
      'Understand material costs, sales and margins without rebuilding calculations by hand.',
  },
]

export default function ProblemSection() {
  return (
    <section className="dann-problem" id="problem">
      <div className="container">
        <Reveal>
          <div className="dann-problem__intro">
            <h2>Keep your production records in one place.</h2>

            <p>
              DANN connects materials, production, inventory, retailer orders
              and profit so you can understand what is happening in your
              business without relying on scattered records.
            </p>
          </div>
        </Reveal>

        <div className="dann-problem__grid">
          {problems.map(({ icon: Icon, title, description }, index) => (
            <Reveal key={title} delay={index * 60}>
              <article className="dann-problem-card">
                <div className="dann-problem-card__icon" aria-hidden="true">
                  <Icon size={23} strokeWidth={1.8} />
                </div>

                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}