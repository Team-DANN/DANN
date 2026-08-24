import { Calculator, MessageCircleMore, NotebookPen, PackageX } from 'lucide-react'
import Reveal from './Reveal.jsx'
import SectionHeader from './SectionHeader.jsx'

const habits = [
  { icon: NotebookPen, label: 'Notebooks', note: 'Production and stock written down by hand.' },
  { icon: MessageCircleMore, label: 'WhatsApp', note: 'Orders and payment history buried in chats.' },
  { icon: Calculator, label: 'Spreadsheets', note: 'Manual formulas that fall behind the real shop floor.' },
  { icon: PackageX, label: 'Memory', note: 'Reordering happens when stock already looks low.' },
]

export default function ProblemSection() {
  return (
    <section className="section section--light" id="problem">
      <div className="container">
        <Reveal>
          <SectionHeader
            eyebrow="The everyday problem"
            title="Your business is moving. Your records are trying to catch up."
            body="Small manufacturers often run critical operations across notebooks, chats, memory and manually updated sheets. That makes simple questions surprisingly hard to answer."
          />
        </Reveal>

        <div className="problem-layout">
          <div className="habit-grid">
            {habits.map(({ icon: Icon, label, note }, index) => (
              <Reveal key={label} delay={index * 60}>
                <article className="habit-card">
                  <div className="icon-box"><Icon size={22} /></div>
                  <h3>{label}</h3>
                  <p>{note}</p>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal className="problem-callout" delay={120}>
            <p className="eyebrow eyebrow--inverse">The cost of guesswork</p>
            <h3>“How much do I actually have — and did I make money this week?”</h3>
            <ul className="plain-list">
              <li>Stock-outs that interrupt production</li>
              <li>Finished inventory that is hard to verify</li>
              <li>Orders and unpaid balances that are easy to lose track of</li>
              <li>Profit that stays unclear until someone does the maths manually</li>
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
