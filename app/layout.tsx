import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hackathon App',
  description: 'Built with Next.js + Supabase + Tailwind',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-[var(--bg)] text-[var(--text-primary)]">
        {children}
      </body>
    </html>
  )
}
