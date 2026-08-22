'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link' 
import { apiFetch } from '@/lib/api'

interface Role {
  position: string
  department: string
  service: string
  status: string
}

interface Person {
  id: string
  name: string
  avatar: string
  status: string
  email: string | null
  phone: string | null
  servingThisSunday: boolean
  roles: Role[]
  unavailableThisSunday: boolean
}

interface ServingMember {
  name: string
  position: string
  status: string
  photo: string
}

interface ServiceTime {
  id: string
  title: string
  serviceType: string
  peopleCount: number
  members: ServingMember[]
}

interface UpcomingEvent {
  date: string
  services: ServiceTime[]
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  )
}

function CheckBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12.75 2.25 2.25 4.5-4.5m4.5 2.25a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

const ACCENTS = [
  { text: 'text-rose-700', avatarBg: 'bg-rose-100', avatarText: 'text-rose-700', solid: 'bg-rose-500' },
  { text: 'text-blue-700', avatarBg: 'bg-blue-100', avatarText: 'text-blue-700', solid: 'bg-blue-500' },
  { text: 'text-amber-700', avatarBg: 'bg-amber-100', avatarText: 'text-amber-700', solid: 'bg-amber-500' },
  { text: 'text-emerald-700', avatarBg: 'bg-emerald-100', avatarText: 'text-emerald-700', solid: 'bg-emerald-500' },
  { text: 'text-violet-700', avatarBg: 'bg-violet-100', avatarText: 'text-violet-700', solid: 'bg-violet-500' },
]

function accentFor(key: string) {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return ACCENTS[hash % ACCENTS.length]
}

function Avatar({ name, src, seed, size = 9 }: { name: string; src: string | null; seed: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const sizeClass = size === 9 ? 'w-9 h-9' : 'w-8 h-8'
  const accent = accentFor(seed)

  if (!src || failed) {
    return (
      <div className={`${sizeClass} rounded-full ${accent.avatarBg} ${accent.avatarText} flex items-center justify-center text-xs font-bold shrink-0`}>
        {initials(name) || '?'}
      </div>
    )
  }

  return (
    <img
      src={src}
      className={`${sizeClass} rounded-full object-cover shrink-0 ring-1 ring-gray-200`}
      alt={name}
      onError={() => setFailed(true)}
    />
  )
}

function SkeletonRow() {
  return <div className="skeleton h-14 rounded-lg" />
}

const NAV_ITEMS = ['Dashboard', 'Members', 'Calendar', 'CG Plan']

const STAT_META = [
  { label: 'Total members', icon: <UsersIcon />, iconBg: 'bg-blue-50', iconText: 'text-blue-600' },
  { label: 'Serving this Sunday', icon: <CheckBadgeIcon />, iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' },
  { label: 'Upcoming events', icon: <CalendarIcon />, iconBg: 'bg-amber-50', iconText: 'text-amber-600' },
]

function TopNav() {
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
          {[
            { label: 'Dashboard', href: '/' },
            { label: 'Members', href: '/members' },
            { label: 'Calendar', href: '/calendar' },
            { label: 'CG Plan', href: '/cg-plan' },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                item.label === 'Dashboard' ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
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

export default function Home() {
  const [people, setPeople] = useState<Person[]>([])
  const [peopleLoaded, setPeopleLoaded] = useState(false)
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])
  const [eventsLoaded, setEventsLoaded] = useState(false)

  useEffect(() => {
    apiFetch('/planning-center/members-with-service')
    .then((data) => setPeople(data))
    .finally(() => setPeopleLoaded(true))


    apiFetch('/planning-center/upcoming-events')
      .then((data) => setUpcomingEvents(data))
      .finally(() => setEventsLoaded(true))
  }, [])

  const statValues = [
    people.length.toString(),
    people.filter((p) => p.servingThisSunday).length.toString(),
    upcomingEvents.length.toString(),
  ]

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <TopNav />

      <main className="max-w-7xl mx-auto px-6 py-8 md:px-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Planning Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview for YA3 + YA4</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {STAT_META.map((stat, i) => (
            <div key={stat.label} className="rounded-lg bg-white border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{stat.label}</span>
                <div className={`w-10 h-10 rounded-md ${stat.iconBg} ${stat.iconText} flex items-center justify-center shrink-0`}>
                  {stat.icon}
                </div>
              </div>
              <p className="text-3xl font-bold tracking-tight font-mono text-gray-900">{statValues[i]}</p>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-2 gap-8 items-stretch">

          {/* Members */}
          <section className="rounded-lg bg-white border border-gray-200 p-5 h-[600px] flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-200">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Members</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 rounded px-2 py-0.5">
                YA3 + YA4
              </span>
            </div>
            <div className="flex flex-col divide-y divide-gray-100 overflow-y-auto flex-1">
              {!peopleLoaded ? (
                <div className="flex flex-col gap-1.5 py-1">
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </div>
              ) : people.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">No members found.</p>
              ) : (
                people.map((person) => (
                  <div key={person.id} className="flex items-center gap-3 py-3 hover:bg-gray-50 transition-colors -mx-1 px-1">
                    <Avatar name={person.name} src={person.avatar} seed={person.id} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-gray-900">{person.name}</p>

                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {person.unavailableThisSunday ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-50 text-orange-700">
                          Not Available
                        </span>
                      ) : person.servingThisSunday ? (
                        <>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                            Serving Sunday
                          </span>
                          {person.roles.map((role, i) => (
                            <span key={i} className="text-[11px] text-gray-400">
                              {role.service} · {role.department} · {role.position}
                            </span>
                          ))}
                        </>
                      ) : person.roles.length > 0 ? (
                        <>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-50 text-red-700">
                            Declined Serving Sunday
                          </span>
                          {person.roles.map((role, i) => (
                            <span key={i} className="text-[11px] text-gray-400">
                              {role.service} · {role.department} · {role.position}
                            </span>
                          ))}
                        </>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">
                          Not serving
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Upcoming Events */}
          <section className="rounded-lg bg-white border border-gray-200 p-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 pb-3 mb-4 border-b border-gray-200">
              Upcoming Events
            </h2>
            <div className="flex flex-col gap-3">
              {!eventsLoaded ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : upcomingEvents.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">No upcoming events.</p>
              ) : (
                upcomingEvents.map((event) => {
                  const accent = accentFor(event.date)
                  return (
                    <div key={event.date} className={`border-l-2 ${accent.solid.replace('bg-', 'border-')} pl-3.5 py-3 pr-3.5 bg-gray-50 rounded-r-md`}>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-2.5">{event.date}</p>
                      <div className="flex flex-col gap-2.5">
                        {event.services.map((service) => (
                          <div key={service.id} className="relative flex items-center gap-3 group cursor-pointer rounded-md px-2 py-1.5 -mx-2 hover:bg-gray-100 transition-colors">
                            <span className={`w-1.5 h-1.5 rounded-full ${accent.solid} shrink-0`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-sm font-semibold truncate text-gray-900">{service.serviceType}</span>
                                  <span className="text-xs text-gray-400 truncate">{service.title}</span>
                                </div>
                                <span className="text-xs font-mono text-gray-500 shrink-0">{service.peopleCount}</span>
                              </div>
                            </div>

                            {service.members.length > 0 && (
                              <div className="absolute left-0 bottom-full mb-1 z-50 hidden group-hover:block w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">YA34 Serving</p>
                                <div className="flex flex-col gap-1.5">
                                  {service.members.map((member, i) => (
                                    <div key={i} className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <img
                                          src={member.photo}
                                          className="w-5 h-5 rounded-full object-cover shrink-0"
                                          alt={member.name}
                                          onError={(e) => (e.currentTarget.style.display = 'none')}
                                        />
                                        <span className="text-xs font-medium text-gray-900 truncate">{member.name}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[10px] text-gray-400">{member.position}</span>
                                        <span className={`text-[10px] font-bold px-1 rounded ${
                                          member.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700' :
                                          member.status === 'Declined' ? 'bg-red-50 text-red-700' :
                                          member.status === 'Not Available' ? 'bg-orange-50 text-orange-700' :
                                          'bg-gray-100 text-gray-500'
                                        }`}>{member.status}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}
