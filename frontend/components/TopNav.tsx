'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/' },
  { label: 'Members', href: '/members' },
  { label: 'Calendar', href: '/calendar' },
  { label: 'CG Plan', href: '/cg-plan' },
]

export default function TopNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
      <div className="relative px-6 md:px-10 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-md bg-gray-900 flex items-center justify-center text-white text-sm font-bold">
            Y
          </div>
          <span className="text-sm font-bold tracking-tight text-gray-900">YA34</span>
        </div>
        <nav className="hidden md:flex items-center gap-1 ml-8">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === item.href ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => {
            sessionStorage.removeItem('appPassword')
            window.location.href = '/login'
          }}
          className="text-xs font-medium text-gray-500 hover:text-gray-900"
        >
          Log out
        </button>
      </div>
    </header>
  )
}
