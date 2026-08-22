'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import TopNav from '@/components/TopNav'
import { useRequireAuth } from '@/lib/useRequireAuth'

interface ServingMember {
  name: string
  position: string
  status: string
  photo: string
}

interface PlanEvent {
  id: string
  date: string
  title: string
  serviceType: string
  members: ServingMember[]
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function CalendarPage() {
  const checked = useRequireAuth()
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [events, setEvents] = useState<PlanEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<PlanEvent | null>(null)


  useEffect(() => {
    if (!checked) return;

    apiFetch('/planning-center/all-plans')
      .then(data => setEvents(data))
  }, [checked])

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  // Build event map keyed by day number
  const eventMap = new Map<number, PlanEvent[]>()
    events.forEach(event => {
    const [year, month, day] = event.date.split('T')[0].split('-').map(Number)
    if (month - 1 === currentMonth && year === currentYear) {
        if (!eventMap.has(day)) eventMap.set(day, [])
        eventMap.get(day)!.push(event)
    }
    })

    // Sort events within each day by time
    eventMap.forEach((dayEvents, day) => {
    eventMap.set(day, dayEvents.sort((a, b) => a.date.localeCompare(b.date)))
    })

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  while (cells.length % 7 !== 0) cells.push(null)

    if (!checked) return null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <TopNav />
      <main className="px-6 py-8 md:px-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Calendar</h1>
            <p className="text-sm text-gray-500 mt-1">Planning Center services</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
              <ChevronLeftIcon />
            </button>
            <span className="text-sm font-semibold text-gray-900 w-36 text-center">
              {MONTHS[currentMonth]} {currentYear}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
              <ChevronRightIcon />
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden h-[calc(100vh-220px)]">
          <div className="grid grid-cols-7 border-b border-gray-200">
            {DAYS.map(day => (
              <div key={day} className="py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-400">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 h-full">
            {cells.map((day, i) => {
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
              const dayEvents = day ? eventMap.get(day) : undefined

              return (
                <div
                  key={i}
                  className={`min-h-0 h-full p-2 border-b border-r border-gray-100 ${!day ? 'bg-gray-50' : 'hover:bg-gray-50 transition-colors'}`}
                >
                  {day && (
                    <>
                      <span className={`text-sm font-medium inline-flex items-center justify-center w-7 h-7 rounded-full ${
                        isToday ? 'bg-gray-900 text-white' : 'text-gray-700'
                      }`}>
                        {day}
                      </span>
                      <div className="mt-1 flex flex-col gap-1">
                        {dayEvents?.map(event => (
                            <div
                                key={event.id}
                                onClick={() => setSelectedEvent(event)}
                                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 truncate cursor-pointer hover:bg-blue-100 transition-colors"
                            >
                                {event.title} · {event.serviceType}
                            </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
          {selectedEvent && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
    onClick={() => setSelectedEvent(null)}
  >
    <div
      className="bg-white rounded-xl shadow-xl p-6 w-80 max-h-[80vh] overflow-y-auto"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-gray-900">{selectedEvent.serviceType}</p>
          <p className="text-xs text-gray-400 mt-0.5">{selectedEvent.title} · {new Date(selectedEvent.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button
          onClick={() => setSelectedEvent(null)}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ✕
        </button>
      </div>

      {selectedEvent.members.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No YA34 members serving.</p>
      ) : (
        <>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">YA34 Serving</p>
          <div className="flex flex-col gap-2">
            {selectedEvent.members.map((member, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={member.photo}
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                    alt={member.name}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                  <span className="text-sm font-medium text-gray-900 truncate">{member.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-gray-400">{member.position}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    member.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700' :
                    member.status === 'Declined' ? 'bg-red-50 text-red-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>{member.status}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  </div>
)}
        </div>
      </main>
    </div>
  )
}