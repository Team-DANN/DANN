import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import ProblemSection from './components/ProblemSection.jsx'
import WorkflowSection from './components/WorkflowSection.jsx'
import FeaturesSection from './components/FeaturesSection.jsx'
import BuiltForSection from './components/BuiltForSection.jsx'
import HowItWorks from './components/HowItWorks.jsx'
import ValidationSection from './components/ValidationSection.jsx'
import PilotSection from './components/PilotSection.jsx'
import Footer from './components/Footer.jsx'

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Navbar />
      <main id="main-content">
        <Hero />
        <ProblemSection />
        <WorkflowSection />
        <FeaturesSection />
        <BuiltForSection />
        <HowItWorks />
        <ValidationSection />
        <PilotSection />
      </main>
      <Footer />
    </>
  )
}
