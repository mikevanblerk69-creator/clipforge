import Link from 'next/link'
import { Zap, Twitter, Github, MessageCircle } from 'lucide-react'

const footerLinks = {
  Product: [
    { label: 'Features', href: '/#features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Changelog', href: '/changelog' },
    { label: 'Roadmap', href: '/roadmap' },
  ],
  Legal: [
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Cookie Policy', href: '/cookies' },
    { label: 'DMCA', href: '/dmca' },
  ],
  Company: [
    { label: 'About', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Contact', href: '/contact' },
    { label: 'Status', href: '/status' },
  ],
}

const socialLinks = [
  { icon: Twitter, href: 'https://twitter.com/clipforge', label: 'Twitter / X' },
  { icon: Github, href: 'https://github.com/clipforge', label: 'GitHub' },
  { icon: MessageCircle, href: 'https://discord.gg/clipforge', label: 'Discord' },
]

export function Footer() {
  return (
    <footer className="bg-[#080808] border-t border-white/5 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange to-cyan flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-display text-2xl tracking-wider text-gradient">
                ClipForge
              </span>
            </Link>

            <p className="text-sm text-muted leading-relaxed max-w-xs mb-6">
              The AI-powered cinematic video studio for creators who demand quality.
              Forge your vision with the power of AI.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-muted hover:text-orange hover:border-orange/30 transition-all duration-200"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-xs font-semibold tracking-widest uppercase text-muted mb-4">
                {title}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ClipForge. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Built with{' '}
            <span className="text-red-500">&#10084;</span>
            {' '}in Cape Town
          </p>
        </div>
      </div>
    </footer>
  )
}
