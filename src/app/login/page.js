'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Field, PageHeader, PageShell, SurfaceCard } from '../../components/ui'

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
    <PageShell narrow>
      <div className="login-shell">
        <div className="login-panel stack-lg">
          <PageHeader
            eyebrow="Acesso"
            title="Entrar no painel"
            description="Use suas credenciais para acessar a área operacional e gerenciar serviços e documentações."
            compact
          />

          <SurfaceCard className="surface-card--hero">
            <div className="stack-lg">
              <Field label="Email">
                <input
                  id="email"
                  className="input"
                  placeholder="voce@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              <Field label="Senha">
                <input
                  id="password"
                  className="input"
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>

              <div className="form-actions">
                <button className="btn btn--primary" onClick={fazerLogin}>
                  Entrar
                </button>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </PageShell>
  )
}
