import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export function RequireAuth() {
  const location = useLocation()
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    let active = true

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession()

      if (!active) return

      if (error) {
        setAuthenticated(false)
        setChecking(false)
        return
      }

      setAuthenticated(Boolean(data.session))
      setChecking(false)
    }

    void checkSession()

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return

      if (event === 'SIGNED_OUT') {
        setAuthenticated(false)
        setChecking(false)
        return
      }

      if (session) {
        setAuthenticated(true)
        setChecking(false)
      } else if (event === 'INITIAL_SESSION') {
        setAuthenticated(false)
        setChecking(false)
      }
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

  return <Outlet />
}
