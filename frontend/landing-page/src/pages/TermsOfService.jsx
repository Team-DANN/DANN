import { Link } from 'react-router-dom'
import Brand from '../components/Brand.jsx'

export default function TermsOfService() {
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
          Terms of Service
        </h1>

        <p className="mt-4 text-sm text-ink-muted">
          Last updated: September 2026
        </p>

        <div className="mt-12 space-y-10 text-[15px] leading-7 text-ink-muted">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              1. Acceptance of these terms
            </h2>
            <p>
              By accessing or using DANN, you agree to these Terms of Service.
              If you do not agree to these terms, do not use the service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              2. The DANN service
            </h2>
            <p>
              DANN provides tools intended to help small manufacturers manage
              production-related information including materials, inventory,
              production activity, orders and business performance. Features
              may change as the product develops.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              3. Accounts
            </h2>
            <p>
              You are responsible for providing accurate account information,
              keeping your login credentials secure and for activity that
              occurs through your account.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              4. Your business data
            </h2>
            <p>
              You remain responsible for the business information you enter
              into DANN. You grant DANN the permissions reasonably necessary
              to host, process and display that information in order to provide
              the service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              5. Acceptable use
            </h2>
            <p>
              You may not use DANN to violate applicable law, interfere with
              the service, attempt unauthorized access, introduce malicious
              software, misuse another person's account or use the platform in
              a way that harms other users or DANN.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              6. Intellectual property
            </h2>
            <p>
              DANN and its software, design, branding and original service
              content are protected by applicable intellectual-property laws.
              These terms do not transfer ownership of DANN intellectual
              property to you.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              7. Availability and changes
            </h2>
            <p>
              We may update, improve, suspend or change parts of the service.
              We do not guarantee that every feature will always be available
              or operate without interruption.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              8. Disclaimer
            </h2>
            <p>
              DANN is provided as a business-management tool. You remain
              responsible for business decisions, record accuracy, regulatory
              obligations and verification of information used in your
              operations.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              9. Limitation of liability
            </h2>
            <p>
              To the extent permitted by applicable law, DANN will not be
              liable for indirect, incidental, special or consequential losses
              arising from use of, or inability to use, the service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              10. Termination
            </h2>
            <p>
              Access may be suspended or terminated where necessary to protect
              the service, enforce these terms, respond to unlawful activity
              or address serious misuse.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              11. Changes to these terms
            </h2>
            <p>
              These terms may be updated as DANN develops. Updated terms will
              be published on this page with a revised date.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              12. Contact
            </h2>
            <p>
              Questions about these terms can be sent to{' '}
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