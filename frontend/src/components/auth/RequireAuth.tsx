import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    let active = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setAuthenticated(Boolean(data.session))
      setChecking(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setAuthenticated(Boolean(session))
      setChecking(false)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <Loader2 className="h-5 w-5 animate-spin text-[#6b6b66]" />
      </div>
    )
  }

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
