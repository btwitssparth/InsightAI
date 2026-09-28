import type { ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
  mode: 'signin' | 'signup'
}

function DataFlowGraphic() {
  return (
    <svg viewBox="0 0 560 560" role="img" aria-label="InsightAI data analysis illustration" className="h-full w-full">
      <defs>
        <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" fill="none" stroke="currentColor" strokeWidth="1" opacity=".12" />
        </pattern>
      </defs>
      <rect width="560" height="560" rx="36" fill="url(#grid)" />
      <path d="M96 382C150 310 190 342 238 276C292 202 328 244 380 178C414 136 452 154 474 116" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="7 9" opacity=".35" />
      <g transform="translate(72 120)">
        <rect width="138" height="92" rx="18" fill="white" stroke="currentColor" />
        <circle cx="28" cy="28" r="10" fill="currentColor" opacity=".12" />
        <path d="M24 28h8M28 24v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <rect x="24" y="51" width="74" height="7" rx="3.5" fill="currentColor" opacity=".12" />
        <rect x="24" y="66" width="52" height="7" rx="3.5" fill="currentColor" opacity=".08" />
        <text x="24" y="92" fill="currentColor" fontSize="11" fontWeight="600">RAW DATA</text>
      </g>
      <g transform="translate(208 246)">
        <rect width="150" height="112" rx="20" fill="#171717" />
        <path d="M38 70V45M58 70V32M78 70V52M98 70V22" stroke="white" strokeWidth="9" strokeLinecap="round" opacity=".92" />
        <path d="M28 80h82" stroke="white" strokeWidth="2" opacity=".25" />
        <text x="28" y="100" fill="white" fontSize="11" fontWeight="600" opacity=".8">ANALYSIS ENGINE</text>
      </g>
      <g transform="translate(366 76)">
        <rect width="126" height="92" rx="18" fill="white" stroke="currentColor" />
        <path d="M26 63L44 48L59 55L83 29" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="26" cy="63" r="4" fill="currentColor" /><circle cx="44" cy="48" r="4" fill="currentColor" /><circle cx="59" cy="55" r="4" fill="currentColor" /><circle cx="83" cy="29" r="4" fill="currentColor" />
        <text x="20" y="82" fill="currentColor" fontSize="10" fontWeight="600">INSIGHTS</text>
      </g>
      <g transform="translate(386 348)">
        <rect width="112" height="74" rx="16" fill="white" stroke="currentColor" />
        <path d="M23 49h64M23 39h48M23 29h30" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity=".18" />
        <path d="M23 49h42" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <text x="23" y="64" fill="currentColor" fontSize="9" fontWeight="600">EVIDENCE</text>
      </g>
      <circle cx="92" cy="382" r="5" fill="currentColor" /><circle cx="474" cy="116" r="5" fill="currentColor" /><circle cx="442" cy="348" r="5" fill="currentColor" />
    </svg>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#171717] text-white">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path d="M5 18V9M12 18V5M19 18v-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <span className="text-[15px] font-semibold tracking-[-0.02em]">InsightAI</span>
    </div>
  )
}

export function AuthLayout({ children, mode }: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#171717]">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
        <aside className="relative hidden overflow-hidden border-r border-[#e5e5e3] bg-[#f0f0ed] p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div>
            <Brand />
            <div className="mt-20 max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#858580]">AI-powered data analysis</p>
              <h1 className="mt-4 max-w-lg text-4xl font-semibold leading-[1.08] tracking-[-0.045em] xl:text-5xl">From raw datasets to answers you can verify.</h1>
              <p className="mt-5 max-w-md text-[15px] leading-7 text-[#686863]">InsightAI plans the analysis, executes it against your actual data, then explains the verified result.</p>
            </div>
          </div>
          <div className="relative mx-auto mt-12 w-full max-w-[520px] text-[#242422]"><DataFlowGraphic /></div>
          <p className="text-xs text-[#999994]">Your analysis workspace</p>
        </aside>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[430px] page-enter">
            <div className="mb-10 lg:hidden"><Brand /></div>
            {children}
            <p className="mt-8 text-center text-[11px] leading-5 text-[#9a9a95]">
              {mode === 'signin' ? 'By continuing, you agree to use InsightAI responsibly and keep your account secure.' : 'Create an account to keep your datasets and analyses in your private workspace.'}
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
