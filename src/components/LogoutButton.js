'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function LogoutButton({ className = 'btn btn--secondary' }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.log(error)
      setLoading(false)
      return
    }

    router.push('/login')
  }

  return (
    <button className={className} onClick={handleLogout} disabled={loading}>
      {loading ? 'Saindo...' : 'Logout'}
    </button>
  )
}
