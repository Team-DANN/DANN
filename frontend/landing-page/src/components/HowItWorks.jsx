import { ArrowDown } from 'lucide-react'
import Reveal from './Reveal.jsx'
import SectionHeader from './SectionHeader.jsx'

const steps = [
  ['01', 'Add your materials', 'Enter the raw materials you keep, their stock and cost.'],
  ['02', 'Define your products', 'Create a simple recipe for what each product consumes.'],
  ['03', 'Log what you make', 'Record each batch or daily quantity with minimal input.'],
  ['04', 'Track stock & orders', 'Finished inventory and retailer deliveries stay connected.'],
  ['05', 'See cost & profit', 'Review material cost against revenue without rebuilding the maths.'],
]

export default function HowItWorks() {
  return (
    <section className="section section--light" id="how-it-works">
      <div className="container">
        <Reveal>
          <SectionHeader
            eyebrow="How it works"
            title="From setup to a clearer daily routine in five steps."
            body="The workflow follows the way physical goods move through a small manufacturing business, so the app asks for less and gives back more context."
            align="center"
          />
        </Reveal>

        <div className="steps-list">
          {steps.map(([number, title, body], index) => (
            <Reveal key={number} delay={index * 60}>
              <article className="step-card">
                <span className="step-number data-number">{number}</span>
                <div className="step-copy">
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
                {index < steps.length - 1 && <ArrowDown className="step-arrow" size={18} aria-hidden="true" />}
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
