import { Outlet, Link } from 'react-router-dom'
import { BrandLogo } from '@/components/navigation/BrandLogo'
import { ShieldCheck, Sparkles, Smartphone } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left Editorial Branding Showcase (Desktop) */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-primary-900 via-primary-950 to-[#0c0817] text-white overflow-hidden">
        {/* Ambient subtle purple glow rings */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-primary-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-96 w-96 rounded-full bg-primary-600/15 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <BrandLogo variant="white" imgClassName="h-8" />
        </div>

        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold backdrop-blur-md text-primary-200 border border-white/10">
            <Sparkles className="h-3.5 w-3.5 text-primary-300" />
            <span>Digital Identity Redefined</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.15] text-white">
            One identity.
            <br />
            Multiple ways to present yourself.
          </h1>

          <p className="text-base text-white/70 leading-relaxed font-normal">
            Switch effortlessly between Public, Professional, and Private modes. Share your live credentials with one tap or an NFC-enabled physical card.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10 text-xs text-white/80">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-primary-400" />
              <span>Granular Field Visibility</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Smartphone className="h-4 w-4 text-primary-400" />
              <span>Instant NFC & QR Sharing</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/50 flex justify-between items-center">
          <span>© {new Date().getFullYear()} OneWinq Inc. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </div>

      {/* Right Form Card */}
      <div className="flex flex-1 flex-col justify-center items-center p-6 sm:p-12 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex justify-center mb-6">
            <BrandLogo showTagline />
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  )
}
