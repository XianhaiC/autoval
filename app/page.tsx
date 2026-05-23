import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-[400px] w-full text-center space-y-4">
        <h1 className="text-[32px] font-black tracking-tight">Hackathon App</h1>
        <p className="text-[var(--text-secondary)] text-[15px]">
          Next.js 14 + Supabase + Tailwind. Ready to build.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-block h-[44px] px-6 rounded-[var(--radius)] bg-[var(--text-primary)] text-white text-[14px] font-bold leading-[44px]"
          >
            Dashboard
          </Link>
          <Link
            href="/auth"
            className="inline-block h-[44px] px-6 rounded-[var(--radius)] border border-[var(--border)] text-[var(--text-secondary)] text-[14px] font-medium leading-[44px]"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
