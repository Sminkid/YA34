'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { API_URL } from '@/lib/api'

export default function LoginPage() {
    const [password, setPassword] = useState('')
    const [error, setError] = useState(false)
    const searchParams = useSearchParams()
    const showError = error || searchParams.get('error') === '1'


  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setError(false)

  const res = await fetch(`${API_URL}/planning-center/ping`, {
    headers: { 'x-app-password': password },
  })

  if (res.ok) {
    sessionStorage.setItem('appPassword', password)
    window.location.href = '/'
  } else {
    setError(true)
  }
}

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg border border-gray-200 flex flex-col gap-4 w-80">
        <h1 className="text-lg font-bold text-gray-900 text-center">YA34 Access</h1>
        {error && (
          <p className="text-sm text-red-600">Incorrect password, try again.</p>
        )}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <button type="submit" className="bg-gray-900 text-white rounded-md py-2 text-sm font-medium">
          Enter
        </button>
      </form>
    </div>
  )
}
