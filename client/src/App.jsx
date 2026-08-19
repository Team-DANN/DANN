import { RouterProvider } from 'react-router-dom'
import { router } from './router.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AlertsProvider } from './context/AlertsContext.jsx'

export default function App() {
  return (
    <ThemeProvider>
      <AlertsProvider>
        <RouterProvider router={router} />
      </AlertsProvider>
    </ThemeProvider>
  )
}