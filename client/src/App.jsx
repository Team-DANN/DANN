import { RouterProvider } from 'react-router-dom'
import { router } from './router.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AlertsProvider } from './context/AlertsContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import SettingsModal from './features/settings/SettingsModal.jsx'

export default function App() {
  return (
    <ThemeProvider>
      <AlertsProvider>
        <SettingsProvider>
          <RouterProvider router={router} />
          <SettingsModal />
        </SettingsProvider>
      </AlertsProvider>
    </ThemeProvider>
  )
}