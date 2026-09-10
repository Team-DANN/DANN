import { RouterProvider } from 'react-router-dom'
import { router } from './router.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AlertsProvider } from './context/AlertsContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import { ChatbotProvider } from './features/ai-insights/chatbot/ChatbotContext.jsx'

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AlertsProvider>
          <SettingsProvider>
            <ChatbotProvider>
              <RouterProvider router={router} />
            </ChatbotProvider>
          </SettingsProvider>
        </AlertsProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}