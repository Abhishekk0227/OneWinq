import * as React from 'react'
import { Link } from 'react-router-dom'
import { PublicNavbar } from '@/components/navigation/PublicNavbar'
import {
  ArrowRight,
  ArrowDownRight,
  Radio,
  Shield,
  Users,
  Building,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
} from 'lucide-react'

type ModeKey = 'public' | 'private' | 'professional'

export default function LandingPage() {
  const [activeTab, setActiveTab] = React.useState<ModeKey>('public')
  const [openFaq, setOpenFaq] = React.useState<number | null>(null)

  const modeContent = {
    public: {
      index: '01 / 03',
      label: 'THE OPEN DOOR',
      title: 'Meet the real you.',
      description:
        'A warm, human profile for the people you want to find you — and the parts of you worth remembering.',
      tags: ['Your story', 'Interests', 'Social links'],
      color: '#a855f7',
    },
    private: {
      index: '02 / 03',
      label: 'THE CLOSE CIRCLE',
      title: 'For the ones you trust.',
      description:
        'Personal contact details, direct notes, and quiet signals reserved strictly for verified connections.',
      tags: ['Direct line', 'Personal notes', 'Trusted circle'],
      color: '#7c3aed',
    },
    professional: {
      index: '03 / 03',
      label: 'THE SIGNAL',
      title: 'Lead with what you build.',
      description:
        'A focused, proof-backed showcase of projects, verified credentials, and the problems you solve best.',
      tags: ['Key projects', 'Verified work', 'Capabilities'],
      color: '#9333ea',
    },
  }

  const activeMode = modeContent[activeTab]

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-purple-200 selection:text-purple-900">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION (Deep Royal Purple Gradient) */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#3b0f64] via-[#54168c] to-[#7620bc] text-white pt-2 pb-24 lg:pb-36">
        {/* Top Navbar */}
        <PublicNavbar />

        {/* Concentric glowing circles behind right card */}
        <div className="absolute top-1/2 right-10 lg:right-32 -translate-y-1/2 w-[550px] h-[550px] rounded-full border border-white/10 pointer-events-none -z-0" />
        <div className="absolute top-1/2 right-10 lg:right-32 -translate-y-1/2 w-[720px] h-[720px] rounded-full border border-white/5 pointer-events-none -z-0" />
        <div className="absolute top-1/2 right-10 lg:right-32 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-white/[0.03] pointer-events-none -z-0" />

        <div className="container mx-auto px-6 lg:px-12 relative z-10 pt-10 lg:pt-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Hero Column */}
            <div className="lg:col-span-7 space-y-8 text-left max-w-2xl">
              {/* Monospace Pre-header */}
              <div className="text-xs font-mono font-medium tracking-[0.25em] text-purple-200/90 uppercase">
                A BETTER WAY TO BE KNOWN
              </div>

              {/* Expressive Editorial Headline */}
              <h1 className="text-5xl sm:text-7xl lg:text-[5.5rem] font-bold tracking-tight text-white leading-[1.02]">
                Your<br />
                identity.<br />
                <span className="font-serif italic font-normal text-purple-200 block mt-1">
                  Your way.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-white/80 font-normal leading-relaxed max-w-lg">
                OneWinq gives every side of you a place to live — and lets you choose which one enters the room.
              </p>

              {/* Hero Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link to="/signup">
                  <button className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold bg-[#7c25c2] hover:bg-[#8e2ddb] text-white shadow-lg shadow-purple-950/40 transition-all active:scale-95">
                    <span>Create your OneWinq</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>

                <a href="#why">
                  <button className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/20 backdrop-blur-sm transition-all active:scale-95">
                    <span>See how it works</span>
                    <ArrowDownRight className="h-4 w-4" />
                  </button>
                </a>
              </div>

              {/* Bottom Subtle Note */}
              <div className="pt-4 text-xs font-mono text-purple-200/60 flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-300" />
                <span>Built for the many ways you show up.</span>
              </div>
            </div>

            {/* Right Hero Column: The Floating Tilted White Card */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end relative">
              {/* Floating "Tap to share" badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 lg:left-12 z-20">
                <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium bg-black/40 backdrop-blur-md text-white border border-white/20 shadow-xl">
                  <Radio className="h-3.5 w-3.5 text-purple-300 animate-pulse" />
                  <span>Tap to share</span>
                </div>
              </div>

              {/* White Profile Card */}
              <div className="w-full max-w-sm rounded-[28px] bg-white p-8 text-zinc-900 shadow-2xl shadow-purple-950/50 border border-white/40 transform -rotate-2 hover:rotate-0 transition-transform duration-300 text-left space-y-6">
                {/* Header row */}
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span>ONEWINQ / PUBLIC</span>
                  <span className="text-zinc-700 text-sm">✦</span>
                </div>

                {/* Avatar with serif monogram */}
                <div>
                  <div className="h-16 w-16 rounded-full bg-[#a855f7] text-white flex items-center justify-center font-serif text-2xl font-normal shadow-md">
                    AM
                  </div>
                </div>

                {/* Identity Name & Subtitle */}
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
                    Alex Morgan
                  </h2>
                  <p className="text-xs text-zinc-500 font-medium">
                    Designer, connector, curious human
                  </p>
                </div>

                {/* Human Interest Tags */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="rounded-full bg-purple-100/80 px-3.5 py-1 text-xs font-medium text-purple-900">
                    Design systems
                  </span>
                  <span className="rounded-full bg-purple-100/80 px-3.5 py-1 text-xs font-medium text-purple-900">
                    City walks
                  </span>
                  <span className="rounded-full bg-purple-100/80 px-3.5 py-1 text-xs font-medium text-purple-900">
                    Good questions
                  </span>
                </div>

                {/* Card URL Footer */}
                <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-xs font-mono text-purple-600 font-medium">
                  <span>onewinq.me/alex</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. "MORE THAN A PROFILE" (Minimalist Asymmetrical Editorial) */}
      {/* ========================================================================= */}
      <section className="py-28 lg:py-36 bg-white border-b border-zinc-100">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Column: Subtle Metadata & Line */}
            <div className="lg:col-span-4 space-y-4 text-left pt-2">
              <div className="text-xs font-mono font-medium tracking-[0.2em] text-purple-600 uppercase">
                MORE THAN A PROFILE
              </div>
              <div className="flex items-center gap-3">
                <div className="h-px w-10 bg-purple-300" />
                <span className="text-xs font-mono text-zinc-700">A living identity layer</span>
              </div>
            </div>

            {/* Right Column: Giant Statement */}
            <div className="lg:col-span-8 space-y-8 text-left">
              <h2 className="text-4xl sm:text-6xl lg:text-[4.2rem] font-bold tracking-tight text-zinc-900 leading-[1.08]">
                There is no one version of you.{' '}
                <span className="font-serif italic font-normal block sm:inline">
                  Why should there be?
                </span>
              </h2>

              <p className="text-base sm:text-lg text-zinc-600 font-normal leading-relaxed max-w-2xl">
                Your weekend self. Your work self. The person your closest friends know. OneWinq lets each version be honest — without making you manage a dozen disconnected links.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. "WHY ONEWINQ?" (3 Elegant Cards with Numbering) */}
      {/* ========================================================================= */}
      <section id="why" className="py-28 lg:py-36 bg-[#fdfaff] border-b border-purple-50">
        <div className="container mx-auto px-6 lg:px-12 space-y-16">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 text-left">
            <div className="space-y-3">
              <div className="text-xs font-mono font-medium tracking-[0.2em] text-purple-600 uppercase">
                REAL PROBLEMS • ONE SOLUTION
              </div>
              <h2 className="text-4xl sm:text-6xl font-bold tracking-tight text-zinc-900">
                Why OneWinq<span className="font-serif italic font-normal">?</span>
              </h2>
            </div>
            <p className="text-sm sm:text-base text-zinc-600 max-w-sm leading-relaxed">
              Because your identity, information and connections deserve <em className="font-serif text-zinc-800">one connected home</em>.
            </p>
          </div>

          {/* 3 Clean Rounded Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="rounded-[26px] bg-white p-8 border border-purple-100/70 shadow-sm text-left flex flex-col justify-between space-y-8 hover:shadow-md hover:border-purple-200 transition-all duration-200">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-purple-600 font-semibold tracking-wider">
                    01 / 03
                  </span>
                  <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Shield className="h-4 w-4" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-zinc-900">Complete Control</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Privacy shouldn't be complicated or out of your hands.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-dashed border-zinc-200/80 text-xs text-zinc-700 leading-relaxed flex items-start gap-2">
                <span className="text-purple-600 shrink-0 font-mono">→</span>
                <span>Control profile visibility and decide what you share, with whom, and when.</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="rounded-[26px] bg-white p-8 border border-purple-100/70 shadow-sm text-left flex flex-col justify-between space-y-8 hover:shadow-md hover:border-purple-200 transition-all duration-200">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-purple-600 font-semibold tracking-wider">
                    02 / 03
                  </span>
                  <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-zinc-900">Your Network, Always With You</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    As your network grows, finding the right person becomes difficult.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-dashed border-zinc-200/80 text-xs text-zinc-700 leading-relaxed flex items-start gap-2">
                <span className="text-purple-600 shrink-0 font-mono">→</span>
                <span>Keep all your connections organized in your OneWinq dashboard anytime.</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="rounded-[26px] bg-white p-8 border border-purple-100/70 shadow-sm text-left flex flex-col justify-between space-y-8 hover:shadow-md hover:border-purple-200 transition-all duration-200">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-purple-600 font-semibold tracking-wider">
                    03 / 03
                  </span>
                  <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Building className="h-4 w-4" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-zinc-900">Built for Organizations Too</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Individual identity to enterprise identity layer.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-dashed border-zinc-200/80 text-xs text-zinc-700 leading-relaxed flex items-start gap-2">
                <span className="text-purple-600 shrink-0 font-mono">→</span>
                <span>Connect companies, employees, teams, permissions and digital cards in one workspace.</span>
              </div>
            </div>
          </div>

          {/* Minimal Carousel Line */}
          <div className="flex items-center justify-between pt-4 text-xs font-mono text-zinc-400">
            <div className="flex items-center gap-3">
              <span>01</span>
              <div className="w-24 h-0.5 bg-purple-600 rounded-full" />
              <span>03</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-8 w-8 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-50 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="h-8 w-8 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-50 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. "LET THE MOMENT SET THE TONE" (Interactive 3-Mode Studio) */}
      {/* ========================================================================= */}
      <section id="profiles" className="py-28 lg:py-36 bg-white border-b border-zinc-100">
        <div className="container mx-auto px-6 lg:px-12 space-y-16">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 text-left">
            <div className="space-y-2">
              <h2 className="text-4xl sm:text-6xl font-bold tracking-tight text-zinc-900 leading-[1.08]">
                Let the moment<br />
                <span className="font-serif italic font-normal">set the tone.</span>
              </h2>
            </div>
            <p className="text-sm sm:text-base text-zinc-600 max-w-sm leading-relaxed">
              Make the right impression without sanding off the interesting parts. Your profiles are yours to shape, switch, and share.
            </p>
          </div>

          {/* Two-Column Mode Switcher */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: 3 Clickable Modes */}
            <div className="lg:col-span-5 space-y-2 text-left">
              {/* Public Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('public')}
                className={`w-full flex items-center justify-between p-6 rounded-2xl transition-all text-left ${
                  activeTab === 'public'
                    ? 'border-l-4 border-purple-600 bg-purple-50/50'
                    : 'border-l-4 border-transparent hover:bg-zinc-50'
                }`}
              >
                <div>
                  <div className="text-lg font-bold text-zinc-900">Public</div>
                  <div className="text-xs text-zinc-500 mt-0.5">The open door</div>
                </div>
                <ArrowRight className={`h-4 w-4 transition-transform ${activeTab === 'public' ? 'text-purple-600 translate-x-1' : 'text-zinc-300'}`} />
              </button>

              {/* Private Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('private')}
                className={`w-full flex items-center justify-between p-6 rounded-2xl transition-all text-left ${
                  activeTab === 'private'
                    ? 'border-l-4 border-purple-600 bg-purple-50/50'
                    : 'border-l-4 border-transparent hover:bg-zinc-50'
                }`}
              >
                <div>
                  <div className="text-lg font-bold text-zinc-900">Private</div>
                  <div className="text-xs text-zinc-500 mt-0.5">The close circle</div>
                </div>
                <ArrowRight className={`h-4 w-4 transition-transform ${activeTab === 'private' ? 'text-purple-600 translate-x-1' : 'text-zinc-300'}`} />
              </button>

              {/* Professional Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('professional')}
                className={`w-full flex items-center justify-between p-6 rounded-2xl transition-all text-left ${
                  activeTab === 'professional'
                    ? 'border-l-4 border-purple-600 bg-purple-50/50'
                    : 'border-l-4 border-transparent hover:bg-zinc-50'
                }`}
              >
                <div>
                  <div className="text-lg font-bold text-zinc-900">Professional</div>
                  <div className="text-xs text-zinc-500 mt-0.5">The signal</div>
                </div>
                <ArrowRight className={`h-4 w-4 transition-transform ${activeTab === 'professional' ? 'text-purple-600 translate-x-1' : 'text-zinc-300'}`} />
              </button>
            </div>

            {/* Right Column: Premium Dark Showcase Card */}
            <div className="lg:col-span-7">
              <div className="rounded-[28px] bg-[#0e0e14] text-white p-8 sm:p-12 border border-zinc-800 shadow-2xl text-left relative overflow-hidden transition-all duration-300">
                {/* Abstract graphic sphere in background */}
                <div className="absolute right-8 top-12 w-48 h-48 rounded-2xl bg-gradient-to-br from-purple-600/20 to-transparent border border-white/10 hidden sm:flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-purple-400 opacity-90 blur-xs" />
                  <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-purple-700 opacity-80" />
                </div>

                <div className="relative z-10 space-y-6 max-w-md">
                  {/* Mode Bar */}
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pb-2">
                    <span>ONEWINQ / {activeTab.toUpperCase()}</span>
                    <span>{activeMode.index}</span>
                  </div>

                  {/* Mode Tag */}
                  <div className="text-xs font-mono tracking-widest text-purple-400 uppercase font-semibold">
                    {activeMode.label}
                  </div>

                  {/* Headline */}
                  <h3 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
                    {activeMode.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-zinc-400 leading-relaxed font-normal">
                    {activeMode.description}
                  </p>

                  {/* Pills */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {activeMode.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-1 text-xs text-zinc-300 font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. "YOUR PEOPLE, IN ONE PLACE" (Constellation Network Showcase) */}
      {/* ========================================================================= */}
      <section id="network" className="py-20 lg:py-28 bg-[#fbf8fe] border-b border-purple-100/70 overflow-hidden">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-5 text-left">
              <div className="text-xs font-mono tracking-widest text-[#7620bc] uppercase font-semibold">
                YOUR PEOPLE, IN ONE PLACE
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-950 leading-[1.1]">
                A network<br />
                that<br />
                remembers<br />
                <span className="font-serif italic font-normal text-zinc-900">the human part.</span>
              </h2>

              <p className="text-sm sm:text-base text-zinc-600 max-w-md leading-relaxed font-normal pt-1">
                Not a follower count. Not a spreadsheet. OneWinq helps you hold onto the people, context, and small details that make a connection worth keeping.
              </p>

              <div className="pt-2">
                <Link to="/signup">
                  <button className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold bg-zinc-950 hover:bg-zinc-800 text-white transition-all shadow-md active:scale-95">
                    <span>Keep exploring</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>
            </div>

            {/* Right Constellation Graphic */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center relative">
              <div className="relative w-full max-w-[440px] h-[320px] flex items-center justify-center">
                {/* SVG Connecting Orbits & Lines */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 440 320"
                  fill="none"
                >
                  {/* Outer Orbit Ellipse */}
                  <ellipse
                    cx="220"
                    cy="160"
                    rx="180"
                    ry="115"
                    stroke="#c084fc"
                    strokeWidth="1"
                    strokeDasharray="3 4"
                    opacity="0.55"
                  />
                  {/* Inner Orbit Ellipse */}
                  <ellipse
                    cx="220"
                    cy="160"
                    rx="125"
                    ry="75"
                    stroke="#d8b4fe"
                    strokeWidth="1"
                    strokeDasharray="2 4"
                    opacity="0.35"
                  />
                  {/* Subtle Geometric Constellation Vectors */}
                  <line x1="75" y1="75" x2="360" y2="90" stroke="#c084fc" strokeWidth="0.75" strokeDasharray="3 4" opacity="0.4" />
                  <line x1="55" y1="230" x2="370" y2="240" stroke="#c084fc" strokeWidth="0.75" strokeDasharray="3 4" opacity="0.4" />
                  <line x1="110" y1="140" x2="330" y2="180" stroke="#c084fc" strokeWidth="0.75" strokeDasharray="3 4" opacity="0.35" />
                  <line x1="75" y1="75" x2="220" y2="160" stroke="#c084fc" strokeWidth="0.75" strokeDasharray="2 3" opacity="0.3" />
                  <line x1="360" y1="90" x2="220" y2="160" stroke="#c084fc" strokeWidth="0.75" strokeDasharray="2 3" opacity="0.3" />
                  <line x1="55" y1="230" x2="220" y2="160" stroke="#c084fc" strokeWidth="0.75" strokeDasharray="2 3" opacity="0.3" />
                  <line x1="370" y1="240" x2="220" y2="160" stroke="#c084fc" strokeWidth="0.75" strokeDasharray="2 3" opacity="0.3" />
                </svg>

                {/* Node JL (Top Left) */}
                <div className="absolute top-8 left-10 group cursor-pointer">
                  <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-zinc-950 border-2 border-purple-400 text-white font-serif text-sm flex items-center justify-center shadow-md relative transition-transform group-hover:scale-110">
                    JL
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-purple-400 rounded-full ring-2 ring-[#fbf8fe]" />
                  </div>
                </div>

                {/* Node RK (Top Right) */}
                <div className="absolute top-6 right-10 group cursor-pointer">
                  <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[#8b24dc] border-2 border-purple-300 text-white font-serif text-sm flex items-center justify-center shadow-md relative transition-transform group-hover:scale-110">
                    RK
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-purple-300 rounded-full ring-2 ring-[#fbf8fe]" />
                  </div>
                </div>

                {/* Center Node AM (Primary) */}
                <div className="relative z-10 group cursor-pointer">
                  <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-[#9333ea] border-4 border-purple-300/60 text-white font-serif text-xl sm:text-2xl flex items-center justify-center shadow-xl relative transition-transform group-hover:scale-105">
                    AM
                    <span className="absolute top-1 right-1 w-3 h-3 bg-purple-300 rounded-full ring-2 ring-[#fbf8fe]" />
                  </div>
                </div>

                {/* Node NS (Bottom Left) */}
                <div className="absolute bottom-8 left-6 group cursor-pointer">
                  <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[#d8b4fe] border-2 border-purple-400 text-purple-950 font-serif text-sm font-medium flex items-center justify-center shadow-md relative transition-transform group-hover:scale-110">
                    NS
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-purple-500 rounded-full ring-2 ring-[#fbf8fe]" />
                  </div>
                </div>

                {/* Node TF (Bottom Right) */}
                <div className="absolute bottom-6 right-8 group cursor-pointer">
                  <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-zinc-950 border-2 border-purple-400 text-white font-serif text-sm flex items-center justify-center shadow-md relative transition-transform group-hover:scale-110">
                    TF
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-purple-400 rounded-full ring-2 ring-[#fbf8fe]" />
                  </div>
                </div>
              </div>

              {/* Bottom Network Status Pill */}
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-1.5 border border-purple-200/90 shadow-sm text-xs font-mono text-zinc-700">
                <span>your network / 48 connections</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. "GOOD TO KNOW" (The Useful Answers - Accordion FAQ) */}
      {/* ========================================================================= */}
      <section id="faq" className="py-20 lg:py-28 bg-white border-b border-purple-100/70">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
            {/* Left Header */}
            <div className="lg:col-span-5 space-y-3 text-left">
              <div className="text-xs font-mono tracking-widest text-[#7620bc] uppercase font-semibold">
                THE USEFUL ANSWERS
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-950 leading-[1.1]">
                Good to<br />
                <span className="font-serif italic font-normal text-zinc-900">know.</span>
              </h2>
            </div>

            {/* Right Accordion List */}
            <div className="lg:col-span-7 divide-y divide-purple-100 border-t border-b border-purple-100 text-left">
              {[
                {
                  q: 'What is OneWinq?',
                  a: 'OneWinq is a modern digital identity layer. It gives you a single permanent link and NFC-enabled cards to present different verified versions of yourself—personal, professional, or private—depending on the context and room you enter.',
                },
                {
                  q: 'Do I need a new profile for every context?',
                  a: 'No. You have one unified account with multiple distinct modes and identities. You decide which details, links, and contact channels are visible under each mode without managing multiple disconnected URLs.',
                },
                {
                  q: 'How does the OneWinq Card work?',
                  a: 'The physical OneWinq NFC card instantly beams your active digital profile to any modern smartphone with a single contactless tap—no apps, downloads, or sign-ups required for the recipient.',
                },
                {
                  q: 'Is OneWinq for teams too?',
                  a: 'Yes. OneWinq Organizations lets companies provision corporate identity cards, enforce team branding, coordinate verified employee credentials, and manage access centrally.',
                },
              ].map((item, idx) => {
                const isOpen = openFaq === idx
                return (
                  <div key={item.q} className="py-4 sm:py-5 transition-colors">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between gap-6 text-left group"
                    >
                      <span className="text-base font-medium text-zinc-900 group-hover:text-purple-700 transition-colors">
                        {item.q}
                      </span>
                      <span className="shrink-0 text-purple-700 p-1">
                        {isOpen ? (
                          <Minus className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-200" />
                        )}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="pt-3 pr-8 text-sm text-zinc-600 leading-relaxed font-normal animate-in fade-in-50 duration-200">
                        {item.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. "READY WHEN YOU ARE" (Final Impression CTA & Sleek Minimal Footer) */}
      {/* ========================================================================= */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 text-left pb-20">
            <div className="space-y-3">
              <div className="text-xs font-mono tracking-widest text-[#7620bc] uppercase font-semibold">
                READY WHEN YOU ARE
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-950 leading-[1.1]">
                Make a better<br />
                <span className="font-serif italic font-normal text-[#7620bc]">first impression.</span>
              </h2>
            </div>

            <div className="space-y-5 max-w-sm">
              <p className="text-sm sm:text-base text-zinc-700 font-medium leading-relaxed">
                One identity. More context. A lot more you.
              </p>
              <div>
                <Link to="/signup">
                  <button className="inline-flex items-center gap-3 rounded-full px-7 py-3.5 text-sm font-semibold bg-zinc-950 hover:bg-zinc-800 text-white transition-all shadow-lg active:scale-95">
                    <span>Create your OneWinq</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Minimalist Footer matching user screenshot */}
          <div className="border-t border-purple-100/80 pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-zinc-600">
            <div className="font-bold text-zinc-950 text-base tracking-tight lowercase">
              onewinq
            </div>

            <div className="flex items-center gap-8 font-medium">
              <a href="#profiles" className="hover:text-zinc-950 transition-colors">Profiles</a>
              <a href="#network" className="hover:text-zinc-950 transition-colors">Network</a>
              <a href="#faq" className="hover:text-zinc-950 transition-colors">FAQ</a>
              <Link to="/app/support" className="hover:text-zinc-950 transition-colors">Contact</Link>
            </div>

            <div className="text-zinc-400">
              © 2025 OneWinq
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
