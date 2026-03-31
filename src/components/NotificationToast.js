'use client'

import { useEffect } from 'react'

export default function NotificationToast({
  message,
  tone = 'success',
  visible,
  onClose,
}) {
  useEffect(() => {
    if (!visible) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      onClose?.()
    }, 3200)

    return () => window.clearTimeout(timeoutId)
  }, [onClose, visible])

  if (!visible || !message) {
    return null
  }

  return (
    <div className={`toast toast--${tone}`} role="status" aria-live="polite">
      <div className="toast__icon" aria-hidden="true">
        {tone === 'error' ? '!' : '✓'}
      </div>
      <div className="toast__content">
        <strong className="toast__title">
          {tone === 'error' ? 'Nao foi possivel concluir' : 'Tudo certo'}
        </strong>
        <span className="toast__message">{message}</span>
      </div>
      <button className="toast__close" onClick={onClose} aria-label="Fechar notificacao">
        Fechar
      </button>
    </div>
  )
}
