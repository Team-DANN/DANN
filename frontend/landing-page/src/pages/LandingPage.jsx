import Hero from '../sections/Hero.jsx'
import FeaturesSection from '../sections/FeaturesSection.jsx'
import HowItWorks from '../sections/HowItWorks.jsx'
import WhoItsFor from '../sections/WhoItsFor.jsx'
import FAQ from '../sections/FAQ.jsx'
import Footer from '../components/Footer.jsx'

export default function LandingPage() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <main id="main-content">
        <Hero />
        <FeaturesSection />
        <HowItWorks />
        <WhoItsFor />
        <FAQ />
      </main>
      <Footer />
    </>
  )
}