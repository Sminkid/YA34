export async function apiFetch(path: string) {
  const password = sessionStorage.getItem('appPassword')

  const res = await fetch(`http://localhost:3001${path}`, {
    headers: { 'x-app-password': password || '' },
  })

  if (res.status === 401) {
    sessionStorage.removeItem('appPassword')
    window.location.href = '/login?error=1'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`)
  }

  return res.json()
}
