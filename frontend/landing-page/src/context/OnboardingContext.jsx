import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'dann_onboarding_draft'

const OnboardingContext = createContext(null)

function loadDraft() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function OnboardingProvider({ children }) {
  const [draft, setDraft] = useState(loadDraft)

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  }, [draft])

  const updateDraft = useCallback((fields) => {
    setDraft((prev) => ({ ...prev, ...fields }))
  }, [])

  const clearDraft = useCallback(() => {
    setDraft({})
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <OnboardingContext.Provider value={{ draft, updateDraft, clearDraft }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return ctx
}
