'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Login() {

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function fazerLogin() {

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) {
      alert(error.message)
    } else {
      window.location.href = '/dashboard'
    }

  }

  return (
    <div style={{ padding: 40 }}>

      <h1>Login</h1>

      <input
        placeholder="email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <br /><br />

      <input
        type="password"
        placeholder="senha"
        onChange={(e) => setPassword(e.target.value)}
      />

      <br /><br />

      <button onClick={fazerLogin}>
        Entrar
      </button>

    </div>
  )
}