import Navbar from '../components/Navbar.jsx'
import Hero from '../sections/Hero.jsx'
import WhoItsFor from '../sections/WhoItsFor.jsx'
import FeaturesSection from '../sections/FeaturesSection.jsx'
import HowItWorks from '../sections/HowItWorks.jsx'
import PilotSection from '../sections/PilotSection.jsx'
import Footer from '../components/Footer.jsx'

export default function LandingPage() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Navbar />
      <main id="main-content">
        <Hero />
        <WhoItsFor />
        <FeaturesSection />
        <HowItWorks />
        <PilotSection />
      </main>
      <Footer />
    </>
  )
}