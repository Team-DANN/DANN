import { ArrowRight, Boxes, ClipboardList, CookingPot, Landmark, PackageCheck, Store } from 'lucide-react'
import Reveal from './Reveal.jsx'
import SectionHeader from './SectionHeader.jsx'

const steps = [
  { icon: Boxes, label: 'Raw materials' },
  { icon: CookingPot, label: 'Recipes' },
  { icon: ClipboardList, label: 'Production' },
  { icon: PackageCheck, label: 'Inventory' },
  { icon: Store, label: 'Orders' },
  { icon: Landmark, label: 'Cost & profit' },
]

export default function WorkflowSection() {
  return (
    <section className="section workflow-section" id="product">
      <div className="container">
        <Reveal>
          <SectionHeader
            eyebrow="One connected workflow"
            title="Every production entry moves the rest of the business forward."
            body="MicroMake is built around one operating loop instead of disconnected tools. Materials feed recipes, recipes become production, production becomes inventory, and sales feed the cost and profit view."
            align="center"
          />
        </Reveal>

        <Reveal className="workflow-card" delay={80}>
          <div className="workflow-track">
            {steps.map(({ icon: Icon, label }, index) => (
              <div className="workflow-node" key={label}>
                <div className="workflow-node__icon"><Icon size={22} /></div>
                <span>{label}</span>
                {index < steps.length - 1 && <ArrowRight className="workflow-arrow" size={18} aria-hidden="true" />}
              </div>
            ))}
          </div>
          <div className="workflow-caption">
            <span className="stamp-dot" />
            Log once. Keep materials, stock and the numbers connected.
          </div>
        </Reveal>
      </div>
    </section>
  )
}
