import { RouterProvider } from 'react-router-dom'
import { router } from './router.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AlertsProvider } from './context/AlertsContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import SettingsModal from './features/settings/SettingsModal.jsx'
import { ChatbotProvider } from './features/ai-insights/chatbot/ChatbotContext.jsx'
import ChatbotWidget from './features/ai-insights/chatbot/ChatbotWidget.jsx'

export default function App() {
  return (
    <ThemeProvider>
      <AlertsProvider>
        <SettingsProvider>
          <ChatbotProvider>
            <RouterProvider router={router} />
            <SettingsModal />
            <ChatbotWidget />
          </ChatbotProvider>
        </SettingsProvider>
      </AlertsProvider>
    </ThemeProvider>
  )
}