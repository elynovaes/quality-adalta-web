'use client'

import { useEffect, useState } from 'react'

export function AppDialog({
  open,
  title,
  description,
  children,
  actions,
  onClose,
}) {
  useEffect(() => {
    if (!open) {
      return undefined
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) {
    return null
  }

  return (
    <div className="app-dialog__backdrop" role="presentation" onClick={onClose}>
      <div
        className="app-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="app-dialog__header">
          <div>
            <h2 id="app-dialog-title" className="app-dialog__title">
              {title}
            </h2>
            {description ? <p className="app-dialog__description">{description}</p> : null}
          </div>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="app-dialog__body">{children}</div>
        {actions ? <div className="app-dialog__actions">{actions}</div> : null}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  busy = false,
  onConfirm,
  onClose,
}) {
  return (
    <AppDialog
      open={open}
      title={title}
      description={description}
      onClose={busy ? undefined : onClose}
      actions={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={tone === 'danger' ? 'btn btn--danger' : 'btn btn--primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Processando...' : confirmLabel}
          </button>
        </>
      }
    />
  )
}

export function PromptDialog({
  open,
  title,
  description,
  label,
  placeholder,
  defaultValue = '',
  confirmLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  busy = false,
  error = '',
  onConfirm,
  onClose,
}) {
  const [value, setValue] = useState(defaultValue)

  return (
    <AppDialog
      open={open}
      title={title}
      description={description}
      onClose={busy ? undefined : onClose}
      actions={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => onConfirm(value)}
            disabled={busy}
          >
            {busy ? 'Salvando...' : confirmLabel}
          </button>
        </>
      }
    >
      <label className="field">
        <span className="field__label">{label}</span>
        <input
          className="input"
          value={value}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      {error ? <p className="feedback-text feedback-text--error">{error}</p> : null}
    </AppDialog>
  )
}
