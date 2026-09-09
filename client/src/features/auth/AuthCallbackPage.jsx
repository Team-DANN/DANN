import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setError('No login token found.')
      return
    }

    const run = async () => {
      try {
        await login(token)
        // Strip the token from the URL immediately, then continue in.
        navigate('/', { replace: true })
      } catch {
        setError('Could not verify your login. Please try again.')
      }
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertCircle className="text-error" size={28} />
        <p className="text-ink">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3">
      <Loader2 className="animate-spin text-stamp" size={28} />
      <p className="text-ink-muted">Logging you in…</p>
    </div>
  )
}