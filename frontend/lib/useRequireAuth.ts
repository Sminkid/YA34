'use client'

import { useEffect, useState } from 'react'

export function useRequireAuth() {
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem('appPassword')) {
      window.location.href = '/login'
    } else {
      setChecked(true)
    }
  }, [])

  return checked
}
