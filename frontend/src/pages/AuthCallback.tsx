import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function resolveSession() {
      const { data, error: sessionError } = await supabase.auth.getSession()

      if (!active) return

      if (sessionError || !data.session) {
        setError(sessionError?.message ?? 'Could not complete authentication.')
        return
      }

      navigate('/dashboard', { replace: true })
    }

    void resolveSession()

    return () => {
      active = false
    }
  }, [navigate])

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-5">
      <div className="w-full max-w-sm rounded-2xl border border-[#e5e5e3] bg-white p-7 text-center shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
        {error ? (
          <>
            <h1 className="text-lg font-semibold text-[#171717]">Authentication failed</h1>
            <p className="mt-2 text-sm leading-6 text-[#777772]">{error}</p>
            <button onClick={() => navigate('/login', { replace: true })} className="mt-5 h-10 rounded-lg bg-[#171717] px-4 text-sm font-medium text-white hover:bg-[#30302e]">
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#555550]" />
            <h1 className="mt-4 text-lg font-semibold text-[#171717]">Finishing sign in…</h1>
            <p className="mt-2 text-sm text-[#777772]">Preparing your InsightAI workspace.</p>
          </>
        )}
      </div>
    </main>
  )
}
