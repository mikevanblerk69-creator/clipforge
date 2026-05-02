'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import {
  ArrowRight,
  Play,
  Zap,
  Film,
  ImageIcon,
  Mic,
  Scissors,
  Check,
  ChevronRight,
  Star,
} from 'lucide-react'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'

// ─── Animation helpers ──────────────────────────────────────────────────────

function FadeIn({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Landing Page ────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-16 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-radial from-orange/5 via-transparent to-transparent pointer-events-none" />

        {/* Animated orbs */}
        <motion.div
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-orange/6 blur-[80px] pointer-events-none"
        />
        <motion.div
          animate={{
            x: [0, -30, 0],
            y: [0, 20, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-cyan/6 blur-[80px] pointer-events-none"
        />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange/30 bg-orange/5 text-sm text-orange mb-8"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>50 free credits on signup — no card required</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="font-display text-[clamp(4rem,12vw,9rem)] leading-[0.92] tracking-wide mb-6"
          >
            <span className="text-gradient">FORGE</span>
            <br />
            <span className="text-foreground">YOUR VISION</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="text-lg md:text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            The AI-powered video studio for creators who demand cinematic quality.
            Transform text and images into stunning videos in seconds.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
          >
            <Link
              href="/auth/signup"
              className="group flex items-center gap-2 px-8 py-4 bg-orange hover:bg-orange-dark text-white font-semibold rounded-xl transition-all duration-200 shadow-glow-orange hover:shadow-glow-orange-lg hover:-translate-y-0.5 text-base"
            >
              <Zap className="w-4.5 h-4.5" />
              Start Creating Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="group flex items-center gap-2 px-8 py-4 border border-border hover:border-white/20 bg-transparent text-foreground font-semibold rounded-xl transition-all duration-200 text-base hover:bg-white/5">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                <Play className="w-3 h-3 ml-0.5" />
              </div>
              Watch Demo
            </button>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
            className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted"
          >
            {[
              { value: '50', label: 'free credits' },
              { value: '4', label: 'generation modes' },
              { value: '60s', label: 'avg generation time' },
              { value: '4K', label: 'output quality' },
            ].map(({ value, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-foreground font-bold text-base">{value}</span>
                <span>{label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-5 h-8 rounded-full border border-border flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-orange" />
          </div>
        </motion.div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase text-orange mb-3 block">
              What&apos;s inside
            </span>
            <h2 className="font-display text-5xl md:text-7xl tracking-wide mb-4 text-foreground">
              EVERYTHING YOU NEED
            </h2>
            <p className="text-muted text-lg max-w-xl mx-auto">
              A complete cinematic toolkit powered by cutting-edge AI models.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((feature, i) => (
              <FadeIn key={feature.title} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="p-6 rounded-2xl bg-surface border border-border hover:border-orange/20 transition-all duration-300 group relative overflow-hidden"
                >
                  {/* Gradient corner */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-orange/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5 ${feature.iconBg}`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted leading-relaxed mb-4">{feature.description}</p>

                  <div className="flex flex-wrap gap-1.5">
                    {feature.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-28 px-4 relative">
        <div className="absolute inset-0 bg-gradient-radial from-cyan/4 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-5xl mx-auto relative">
          <FadeIn className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase text-cyan mb-3 block">
              Simple process
            </span>
            <h2 className="font-display text-5xl md:text-7xl tracking-wide mb-4">
              HOW IT WORKS
            </h2>
            <p className="text-muted text-lg max-w-xl mx-auto">
              From idea to cinematic video in three simple steps.
            </p>
          </FadeIn>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-1/2 left-[16.66%] right-[16.66%] h-0.5 -translate-y-1/2 bg-gradient-to-r from-orange via-cyan to-orange opacity-20" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {HOW_IT_WORKS.map((step, i) => (
                <FadeIn key={step.step} delay={i * 0.15}>
                  <div className="relative p-6 rounded-2xl bg-surface border border-border text-center group hover:border-cyan/30 transition-all duration-300 hover:shadow-glow-cyan">
                    <div className="font-display text-7xl text-foreground/5 absolute top-4 right-4 leading-none">
                      {step.step}
                    </div>

                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange/10 to-cyan/10 border border-border flex items-center justify-center text-2xl mx-auto mb-5">
                        {step.icon}
                      </div>

                      <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange/20 text-orange text-xs font-bold mb-3">
                        {i + 1}
                      </div>

                      <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                      <p className="text-sm text-muted leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF / STATS ── */}
      <section className="py-20 px-4 border-y border-border">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '10K+', label: 'Videos Generated' },
              { value: '2,400+', label: 'Active Creators' },
              { value: '4.9★', label: 'User Rating' },
              { value: '< 60s', label: 'Generation Time' },
            ].map(({ value, label }) => (
              <FadeIn key={label}>
                <div className="text-3xl font-display tracking-wide text-gradient mb-1">
                  {value}
                </div>
                <div className="text-sm text-muted">{label}</div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING/CREDITS ── */}
      <section className="py-28 px-4">
        <div className="max-w-4xl mx-auto">
          <FadeIn className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase text-orange mb-3 block">
              Pricing
            </span>
            <h2 className="font-display text-5xl md:text-7xl tracking-wide mb-4">
              START CREATING TODAY
            </h2>
            <p className="text-muted text-lg max-w-xl mx-auto">
              Start free. Scale as you grow. No subscriptions required.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free Tier */}
            <FadeIn delay={0.1}>
              <div className="p-6 rounded-2xl border border-orange/40 bg-orange/3 shadow-glow-orange relative">
                <div className="absolute -top-3 left-6">
                  <span className="bg-orange text-white text-xs font-bold px-3 py-1 rounded-full">
                    FREE
                  </span>
                </div>
                <div className="mt-2 mb-5">
                  <div className="text-4xl font-display text-orange mb-1">50</div>
                  <div className="text-sm text-muted">credits on signup</div>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground/80">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className="block text-center py-3 bg-orange hover:bg-orange-dark text-white font-semibold rounded-xl transition-all duration-200 shadow-glow-orange hover:-translate-y-0.5"
                >
                  Get Started Free
                </Link>
              </div>
            </FadeIn>

            {/* Credit Packs */}
            <FadeIn delay={0.2}>
              <div className="p-6 rounded-2xl border border-cyan/40 bg-cyan/3 shadow-glow-cyan relative">
                <div className="absolute -top-3 left-6">
                  <span className="bg-cyan text-black text-xs font-bold px-3 py-1 rounded-full">
                    TOP UP
                  </span>
                </div>
                <div className="mt-2 mb-5">
                  <div className="text-4xl font-display text-cyan mb-1">From R99</div>
                  <div className="text-sm text-muted">Credits never expire</div>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {PRO_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground/80">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/pricing"
                  className="block text-center py-3 bg-cyan hover:bg-cyan/80 text-black font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                >
                  View Packages
                </Link>
              </div>
            </FadeIn>
          </div>

          {/* Credit packs note */}
          <FadeIn delay={0.3} className="text-center mt-8">
            <p className="text-sm text-muted">
              Need more credits?{' '}
              <span className="text-orange font-medium">Top up anytime</span>
              {' '}— starting at $9 for 100 credits. Credits never expire.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 px-4 bg-surface/50">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-12">
            <h2 className="font-display text-4xl md:text-5xl tracking-wide mb-2">
              LOVED BY CREATORS
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <FadeIn key={t.name} delay={i * 0.1}>
                <div className="p-5 rounded-2xl bg-surface border border-border">
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="w-3.5 h-3.5 fill-orange text-orange" />
                    ))}
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange to-cyan flex items-center justify-center text-xs font-bold text-white">
                      {t.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{t.name}</div>
                      <div className="text-xs text-muted">{t.role}</div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-28 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange/8 via-background to-cyan/8 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <FadeIn className="max-w-3xl mx-auto text-center relative">
          <h2 className="font-display text-5xl md:text-7xl tracking-wide mb-4">
            READY TO FORGE
            <br />
            <span className="text-gradient">YOUR VISION?</span>
          </h2>
          <p className="text-muted text-lg mb-10 max-w-xl mx-auto">
            Join thousands of creators already using ClipForge to bring their ideas to life.
            Start with 50 free credits — no credit card required.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-3 px-10 py-4 bg-orange hover:bg-orange-dark text-white font-bold text-lg rounded-xl transition-all duration-200 shadow-glow-orange-lg hover:shadow-[0_0_60px_rgba(255,107,43,0.5)] hover:-translate-y-1"
          >
            <Zap className="w-5 h-5" />
            Start Free Now
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-xs text-muted mt-4">
            No credit card required &nbsp;&bull;&nbsp; 50 free credits &nbsp;&bull;&nbsp; Cancel anytime
          </p>
        </FadeIn>
      </section>

      <Footer />
    </div>
  )
}

// ─── Data ────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    title: 'Text to Video',
    icon: '🎬',
    iconBg: 'bg-orange/10 border border-orange/20',
    description:
      'Describe any scene in natural language and watch AI transform your words into stunning cinematic footage. Multiple styles, aspect ratios, and durations.',
    tags: ['Cinematic', 'Anime', 'Realistic', '5s / 10s', '4K'],
  },
  {
    title: 'Image to Video',
    icon: '🖼️',
    iconBg: 'bg-cyan/10 border border-cyan/20',
    description:
      'Bring any still image to life. Upload a photo and AI generates natural motion — camera movements, environmental effects, and seamless animation.',
    tags: ['Drag & Drop', 'Motion Prompt', 'Any Image'],
  },
  {
    title: 'Lip Sync',
    icon: '🎙️',
    iconBg: 'bg-purple-500/10 border border-purple-500/20',
    description:
      'Sync any audio to any face. Upload your video and audio, or type text with our TTS engine. Perfect for content creators and film production.',
    tags: ['TTS Voices', 'Audio Upload', 'Multi-language'],
  },
  {
    title: 'Video Editor',
    icon: '✂️',
    iconBg: 'bg-green-500/10 border border-green-500/20',
    description:
      'Trim, add text overlays, watermarks, and more. A lightweight editor built right into your studio so you never need to leave ClipForge.',
    tags: ['Trim', 'Text Overlay', 'Export', 'Watermark'],
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: '✍️',
    title: 'Describe',
    description:
      'Write your prompt describing the scene, mood, style, and action. The more detail, the better the result.',
  },
  {
    step: '02',
    icon: '🤖',
    title: 'Generate',
    description:
      'Our AI models process your request and generate high-quality cinematic video frames in real time.',
  },
  {
    step: '03',
    icon: '🚀',
    title: 'Download',
    description:
      'Your video is ready. Download in full quality, share directly, or continue editing in our studio.',
  },
]

const FREE_FEATURES = [
  '50 credits on signup',
  'Text to Video (5s & 10s)',
  'Image to Video generation',
  'Lip Sync with TTS',
  '4 artistic styles',
  'All aspect ratios (16:9, 9:16, 1:1)',
  'Full HD export',
  'Video history & management',
]

const PRO_FEATURES = [
  'Starter — R99 for 10 credits',
  'Pro — R199 for 25 credits',
  'Studio — R399 for 60 credits',
  'Credits never expire',
  'Top up anytime, no subscription',
  'Same-day delivery to your account',
  'All video types included',
  'ZAR pricing via PayFast',
]

const TESTIMONIALS = [
  {
    name: 'Alex Chen',
    role: 'YouTube Creator',
    text: "ClipForge is insane. I generated a full cinematic intro for my channel in under 2 minutes. The quality blew me away.",
  },
  {
    name: 'Sarah Miller',
    role: 'Social Media Manager',
    text: "We use ClipForge daily for our clients' social content. The image-to-video feature is absolutely magic for product shots.",
  },
  {
    name: 'Marcus Webb',
    role: 'Indie Filmmaker',
    text: "As a solo filmmaker, ClipForge gives me the ability to prototype scenes that used to require a full crew. It's a game-changer.",
  },
]
