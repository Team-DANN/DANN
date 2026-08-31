import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import OnboardingLayout from './pages/onboarding/OnboardingLayout.jsx'
import OwnerNameStep from './pages/onboarding/OwnerNameStep.jsx'
import BusinessNameStep from './pages/onboarding/BusinessNameStep.jsx'
import BusinessTypeStep from './pages/onboarding/BusinessTypeStep.jsx'
import OnboardingComplete from './pages/onboarding/OnboardingComplete.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route path="/onboarding" element={<OnboardingLayout />}>
        <Route path="owner-name" element={<OwnerNameStep />} />
        <Route path="business-name" element={<BusinessNameStep />} />
        <Route path="business-type" element={<BusinessTypeStep />} />
        <Route path="complete" element={<OnboardingComplete />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}