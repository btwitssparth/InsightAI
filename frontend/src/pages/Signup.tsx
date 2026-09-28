import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, Check, Eye, EyeOff, Loader2, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/auth/AuthLayout'
import { GoogleIcon } from '../components/auth/GoogleIcon'
import { supabase } from '../lib/supabase'

export default function Signup() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/dashboard', { replace: true })
    })
  }, [navigate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: window.location.origin + '/auth/callback',
      },
    })
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }
    if (data.session) {
      navigate('/dashboard', { replace: true })
      return
    }
    setMessage('Account created. Check your email to confirm your address, then sign in.')
    setLoading(false)
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    setError(null)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
    if (oauthError) {
      setError(oauthError.message)
      setGoogleLoading(false)
    }
  }

  return (
    <AuthLayout mode="signup">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#969690]">Get started</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Create your workspace</h2>
        <p className="mt-2 text-sm leading-6 text-[#74746f]">Keep your datasets, questions, and verified insights in one place.</p>

        <button type="button" onClick={handleGoogleSignIn} disabled={googleLoading || loading} className="mt-7 flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-[#dcdcd8] bg-white text-sm font-medium text-[#2b2b28] transition duration-150 hover:border-[#c8c8c3] hover:bg-[#fafaf8] disabled:cursor-not-allowed disabled:opacity-60">
          {googleLoading ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <GoogleIcon />}
          {googleLoading ? 'Connecting to Google…' : 'Continue with Google'}
        </button>

        <div className="my-6 flex items-center gap-3"><div className="h-px flex-1 bg-[#e5e5e2]" /><span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#a0a09a]">or</span><div className="h-px flex-1 bg-[#e5e5e2]" /></div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-[#4c4c48]">Name</span>
            <div className="relative"><UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9a95]" /><input required type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="h-11 w-full rounded-lg border border-[#dededb] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#171717] focus:ring-4 focus:ring-[#171717]/[0.06]" /></div>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-[#4c4c48]">Email</span>
            <div className="relative"><Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9a95]" /><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-11 w-full rounded-lg border border-[#dededb] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#171717] focus:ring-4 focus:ring-[#171717]/[0.06]" /></div>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-[#4c4c48]">Password</span>
            <div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9a95]" /><input required minLength={6} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" className="h-11 w-full rounded-lg border border-[#dededb] bg-white pl-10 pr-11 text-sm outline-none transition focus:border-[#171717] focus:ring-4 focus:ring-[#171717]/[0.06]" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#8c8c87] hover:bg-[#f3f3f0] hover:text-[#4a4a46]" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
          </label>
          {error && <div role="alert" className="rounded-lg border border-[#ead8d4] bg-[#fffaf8] px-3.5 py-3 text-xs leading-5 text-[#7c5148]">{error}</div>}
          {message && <div role="status" className="flex gap-2 rounded-lg border border-[#dfe5df] bg-[#fafcf9] px-3.5 py-3 text-xs leading-5 text-[#58655a]"><Check className="mt-0.5 h-4 w-4 shrink-0" /><span>{message}</span></div>}
          <button type="submit" disabled={loading || googleLoading} className="group flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#171717] text-sm font-medium text-white transition duration-150 hover:bg-[#30302e] disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-[#777772]">Already have an account? <Link to="/login" className="font-semibold text-[#292927] hover:underline">Sign in</Link></p>
      </div>
    </AuthLayout>
  )
}
