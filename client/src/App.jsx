import { RouterProvider } from 'react-router-dom'
import { router } from './router.jsx'

// App only mounts the router — no other logic lives here.
export default function App() {
  return <RouterProvider router={router} />
}
