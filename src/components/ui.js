export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function PageShell({ children, className = '', narrow = false }) {
  return (
    <main className="page-shell">
      <div className={cn('page-shell__inner', narrow && 'page-shell__inner--narrow', className)}>
        {children}
      </div>
    </main>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  compact = false,
}) {
  return (
    <section className={cn('page-header', compact && 'page-header--compact')}>
      <div className="page-header__content">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p className="page-header__description">{description}</p> : null}
        {meta ? <div className="page-header__meta">{meta}</div> : null}
      </div>

      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </section>
  );
}

export function SurfaceCard({ children, className = '' }) {
  return <section className={cn('surface-card', className)}>{children}</section>;
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {hint ? <span className="field__hint">{hint}</span> : null}
      {children}
    </label>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">
        +
      </div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}
