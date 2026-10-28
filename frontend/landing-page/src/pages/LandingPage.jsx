import Hero from '../sections/Hero.jsx'
import HowItWorksSection from '../components/landing/HowItWorksSection.jsx'
import BentoGridSection from '../components/landing/BentoGridSection.jsx'
import ImportSection from '../components/landing/ImportSection.jsx'
import FAQSection from '../components/landing/FAQSection.jsx'
import CTASection from '../components/landing/CTASection.jsx'
import Footer from '../components/Footer.jsx'

export default function LandingPage() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <main id="main-content">
        <Hero />
        <div className="font-bitter">
          <HowItWorksSection />
          <BentoGridSection />
          <ImportSection />
          <FAQSection />
          <CTASection />
        </div>
      </main>
      <div className="font-bitter">
        <Footer />
      </div>
    </>
  )
}