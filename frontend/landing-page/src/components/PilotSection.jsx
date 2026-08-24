import { ArrowRight, CheckCircle2, FlaskConical } from 'lucide-react'
import { useState } from 'react'
import Reveal from './Reveal.jsx'

export default function PilotSection() {
  const [status, setStatus] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const entry = {
      name: data.get('name'),
      business: data.get('business'),
      type: data.get('type'),
      createdAt: new Date().toISOString(),
    }

    try {
      localStorage.setItem('dann-pilot-interest', JSON.stringify(entry))
      setStatus('Saved on this device. Pilot intake is not connected to a server yet.')
      form.reset()
    } catch {
      setStatus('Pilot intake is not connected to a server yet. Please contact the DANN team directly.')
    }
  }

  return (
    <section className="section pilot-section" id="pilot">
      <div className="container">
        <Reveal className="pilot-card">
          <div className="pilot-copy">
            <div className="pilot-icon"><FlaskConical size={24} /></div>
            <p className="eyebrow eyebrow--inverse">Early pilot</p>
            <h2>Help shape a simpler way to run small-batch production.</h2>
            <p>
              DANN is validating the core workflow with real manufacturers before focusing on monetization. Early pilot users get free access in exchange for practical feedback.
            </p>
            <div className="pilot-points">
              <span><CheckCircle2 size={16} /> Free during the MVP pilot</span>
              <span><CheckCircle2 size={16} /> Built around daily use, not sign-up numbers</span>
              <span><CheckCircle2 size={16} /> Feedback directly shapes the product</span>
            </div>
          </div>

          <form className="pilot-form" onSubmit={handleSubmit}>
            <div className="form-heading">
              <span className="data-number">PILOT / INTEREST</span>
              <h3>Tell us about your workshop</h3>
              <p>No payment or account details required.</p>
            </div>

            <label>
              Your name
              <input name="name" type="text" autoComplete="name" placeholder="e.g. Priya" required />
            </label>

            <label>
              Business name
              <input name="business" type="text" autoComplete="organization" placeholder="Your production business" required />
            </label>

            <label>
              What do you make?
              <input name="type" type="text" placeholder="Tiles, snacks, drinks…" required />
            </label>

            <button className="button button--primary button--full" type="submit">
              Save my pilot interest <ArrowRight size={18} />
            </button>
            <p className="form-note">This landing-page prototype stores your entry only on this device until a pilot-intake endpoint is connected.</p>
            <p className="form-status" role="status" aria-live="polite">{status}</p>
          </form>
        </Reveal>
      </div>
    </section>
  )
}
