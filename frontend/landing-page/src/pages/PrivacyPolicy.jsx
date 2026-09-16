import { Link } from 'react-router-dom'
import Brand from '../components/Brand.jsx'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-paper-light text-ink">
      <header className="border-b border-border bg-paper-light">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link to="/" aria-label="Return to DANN home">
            <Brand />
          </Link>

          <Link
            to="/"
            className="text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <p className="mb-3 text-sm font-medium text-stamp">Legal</p>

        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Privacy Policy
        </h1>

        <p className="mt-4 text-sm text-ink-muted">
          Last updated: September 2026
        </p>

        <div className="mt-12 space-y-10 text-[15px] leading-7 text-ink-muted">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              1. About this policy
            </h2>
            <p>
              This Privacy Policy explains how DANN handles information when
              you create an account, use the DANN service, contact us, or
              interact with our website.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              2. Information we may collect
            </h2>
            <p>
              Information may include account and onboarding details such as
              your name, business name, business type and country; information
              you enter about materials, production, inventory, orders and
              business operations; messages you send to support; and technical
              information associated with use of the service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              3. How information is used
            </h2>
            <p>
              We use information to provide and maintain DANN, operate account
              and production-management features, provide support, improve the
              service, protect the platform from misuse and communicate
              important service information.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              4. Service providers
            </h2>
            <p>
              DANN may rely on hosting, database, authentication,
              communications or other technology providers to operate the
              service. These providers may process information as necessary to
              provide their services to DANN.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              5. Disclosure of information
            </h2>
            <p>
              Information may be disclosed when necessary to operate the
              service, comply with applicable law, protect DANN or its users,
              complete a business restructuring, or when you give us
              permission to do so.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              6. Data retention
            </h2>
            <p>
              Information is retained for as long as reasonably necessary to
              provide the service, maintain legitimate business records,
              resolve disputes and meet applicable legal obligations.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              7. Security
            </h2>
            <p>
              We use reasonable measures intended to protect information.
              However, no online service or storage system can guarantee
              absolute security.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              8. Your choices
            </h2>
            <p>
              You may contact us to ask questions about your information or to
              request appropriate access, correction or deletion, subject to
              applicable law and legitimate record-retention requirements.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              9. Changes to this policy
            </h2>
            <p>
              We may update this Privacy Policy as DANN develops. The updated
              version will be published on this page with a revised date.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              10. Contact
            </h2>
            <p>
              Questions about this policy can be sent to{' '}
              <a
                href="mailto:infodannbusiness@gmail.com"
                className="font-medium text-stamp hover:underline"
              >
                infodannbusiness@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}