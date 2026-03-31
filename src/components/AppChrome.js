'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'

const PRIMARY_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    match: '/dashboard',
    available: true,
    icon: DashboardIcon,
  },
  {
    label: 'Serviços',
    href: '/dashboard',
    match: '/servicos',
    available: false,
    icon: ServicesIcon,
  },
  {
    label: 'Documentações',
    href: '/dashboard',
    match: '/documentacoes',
    available: false,
    icon: DocumentationIcon,
  },
]

const SECONDARY_ITEMS = [
  {
    label: 'Configurações',
    href: '/dashboard',
    match: '/configuracoes',
    available: false,
    icon: SettingsIcon,
  },
]

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v4A1.5 1.5 0 0 1 9.5 11h-4A1.5 1.5 0 0 1 4 9.5v-4Zm9 0A1.5 1.5 0 0 1 14.5 4h4A1.5 1.5 0 0 1 20 5.5v7A1.5 1.5 0 0 1 18.5 14h-4a1.5 1.5 0 0 1-1.5-1.5v-7Zm-9 9A1.5 1.5 0 0 1 5.5 13h4A1.5 1.5 0 0 1 11 14.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5v-4Zm9 3A1.5 1.5 0 0 1 14.5 16h4a1.5 1.5 0 0 1 0 3h-4a1.5 1.5 0 0 1-1.5-1.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ServicesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5.5 4A1.5 1.5 0 0 0 4 5.5v3A1.5 1.5 0 0 0 5.5 10h13A1.5 1.5 0 0 0 20 8.5v-3A1.5 1.5 0 0 0 18.5 4h-13Zm0 10A1.5 1.5 0 0 0 4 15.5v3A1.5 1.5 0 0 0 5.5 20h8A1.5 1.5 0 0 0 15 18.5v-3a1.5 1.5 0 0 0-1.5-1.5h-8ZM18 15a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H18Zm0 3a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H18Z"
        fill="currentColor"
      />
    </svg>
  )
}

function DocumentationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 4.75A1.75 1.75 0 0 1 8.75 3h5.69c.46 0 .9.18 1.23.51l2.82 2.82c.33.33.51.77.51 1.23v11.69A1.75 1.75 0 0 1 17.25 21H8.75A1.75 1.75 0 0 1 7 19.25V4.75Zm3 4a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5h-4Zm0 4a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5h-6Zm0 4a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5h-6Z"
        fill="currentColor"
      />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10.89 4.46a1.5 1.5 0 0 1 2.22 0l.55.6a1.5 1.5 0 0 0 1.57.4l.79-.27a1.5 1.5 0 0 1 1.92.96l.26.79a1.5 1.5 0 0 0 1.1 1.02l.82.19a1.5 1.5 0 0 1 1.1 1.92l-.27.79a1.5 1.5 0 0 0 .4 1.57l.6.55a1.5 1.5 0 0 1 0 2.22l-.6.55a1.5 1.5 0 0 0-.4 1.57l.27.79a1.5 1.5 0 0 1-1.1 1.92l-.82.19a1.5 1.5 0 0 0-1.1 1.02l-.26.79a1.5 1.5 0 0 1-1.92.96l-.79-.27a1.5 1.5 0 0 0-1.57.4l-.55.6a1.5 1.5 0 0 1-2.22 0l-.55-.6a1.5 1.5 0 0 0-1.57-.4l-.79.27a1.5 1.5 0 0 1-1.92-.96l-.26-.79a1.5 1.5 0 0 0-1.1-1.02l-.82-.19a1.5 1.5 0 0 1-1.1-1.92l.27-.79a1.5 1.5 0 0 0-.4-1.57l-.6-.55a1.5 1.5 0 0 1 0-2.22l.6-.55a1.5 1.5 0 0 0 .4-1.57l-.27-.79a1.5 1.5 0 0 1 1.1-1.92l.82-.19a1.5 1.5 0 0 0 1.1-1.02l.26-.79a1.5 1.5 0 0 1 1.92-.96l.79.27a1.5 1.5 0 0 0 1.57-.4l.55-.6ZM12 9.5a2.5 2.5 0 1 0 0 5.01A2.5 2.5 0 0 0 12 9.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ChevronIcon({ collapsed }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={collapsed ? 'sidebar-toggle__icon sidebar-toggle__icon--collapsed' : 'sidebar-toggle__icon'}>
      <path
        d="M14.78 5.97a.75.75 0 0 1 0 1.06L9.81 12l4.97 4.97a.75.75 0 1 1-1.06 1.06l-5.5-5.5a.75.75 0 0 1 0-1.06l5.5-5.5a.75.75 0 0 1 1.06 0Z"
        fill="currentColor"
      />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 12a3.75 3.75 0 1 0 0-7.5A3.75 3.75 0 0 0 12 12Zm0 1.5c-3.87 0-7 2.24-7 5a.75.75 0 0 0 .75.75h12.5A.75.75 0 0 0 19 18.5c0-2.76-3.13-5-7-5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10 4.75A1.75 1.75 0 0 1 11.75 3h4.5A1.75 1.75 0 0 1 18 4.75v14.5A1.75 1.75 0 0 1 16.25 21h-4.5A1.75 1.75 0 0 1 10 19.25V16.5a.75.75 0 0 1 1.5 0v2.75a.25.25 0 0 0 .25.25h4.5a.25.25 0 0 0 .25-.25V4.75a.25.25 0 0 0-.25-.25h-4.5a.25.25 0 0 0-.25.25V7.5a.75.75 0 0 1-1.5 0V4.75ZM4.22 12.53a.75.75 0 0 1 0-1.06l2.5-2.5a.75.75 0 0 1 1.06 1.06L6.56 11.25h6.69a.75.75 0 0 1 0 1.5H6.56l1.22 1.22a.75.75 0 1 1-1.06 1.06l-2.5-2.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function SidebarItem({ item, active, collapsed }) {
  const Icon = item.icon

  if (!item.available) {
    return (
      <button
        type="button"
        className="sidebar-link sidebar-link--muted"
        disabled
        title={collapsed ? `${item.label} em breve` : undefined}
      >
        <span className="sidebar-link__icon">
          <Icon />
        </span>
        {!collapsed ? (
          <>
            <span className="sidebar-link__label">{item.label}</span>
            <span className="sidebar-link__hint">Em breve</span>
          </>
        ) : null}
      </button>
    )
  }

  return (
    <Link
      href={item.href}
      className={`sidebar-link ${active ? 'sidebar-link--active' : ''}`}
      title={collapsed ? item.label : undefined}
    >
      <span className="sidebar-link__icon">
        <Icon />
      </span>
      {!collapsed ? <span className="sidebar-link__label">{item.label}</span> : null}
    </Link>
  )
}

function SidebarSection({ title, items, collapsed, pathname }) {
  return (
    <section className="sidebar-section">
      {!collapsed ? <span className="sidebar-section__title">{title}</span> : null}
      <div className="app-sidebar__nav" aria-label={title}>
        {items.map((item) => {
          const active = item.available && (pathname === item.href || pathname.startsWith(`${item.match}/`))
          return (
            <SidebarItem
              key={item.label}
              item={item}
              active={active}
              collapsed={collapsed}
            />
          )
        })}
      </div>
    </section>
  )
}

export default function AppChrome({ children }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className={`app-layout ${collapsed ? 'app-layout--collapsed' : ''}`}>
      <aside className={`app-sidebar ${collapsed ? 'app-sidebar--collapsed' : ''}`}>
        <div className="app-sidebar__inner">
          <div className="app-sidebar__top">
            <div className="app-sidebar__brand">
              <span className="app-brand__mark">QA</span>
              {!collapsed ? (
                <div className="app-brand__text">
                  <span className="app-brand__title">Quality Adalta</span>
                  <span className="app-brand__subtitle">Operations dashboard</span>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="sidebar-toggle"
              onClick={() => setCollapsed((current) => !current)}
              aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
              title={collapsed ? 'Expandir menu lateral' : undefined}
            >
              <ChevronIcon collapsed={collapsed} />
              {!collapsed ? <span>Recolher menu</span> : null}
            </button>
          </div>

          <div className="sidebar-groups">
            <SidebarSection
              title="Principal"
              items={PRIMARY_ITEMS}
              collapsed={collapsed}
              pathname={pathname}
            />

            <div className="sidebar-divider" />

            <SidebarSection
              title="Sistema"
              items={SECONDARY_ITEMS}
              collapsed={collapsed}
              pathname={pathname}
            />
          </div>

          <div className="app-sidebar__footer">
            <div className="sidebar-user">
              <div className="sidebar-user__avatar">
                <UserIcon />
              </div>
              {!collapsed ? (
                <div className="sidebar-user__content">
                  <span className="sidebar-user__name">Quality Adalta</span>
                  <span className="sidebar-user__role">Workspace principal</span>
                </div>
              ) : null}
            </div>

            <LogoutButton
              className={`sidebar-logout ${collapsed ? 'sidebar-logout--collapsed' : ''}`}
              label="Sair"
              title="Sair da conta"
            >
              <span className="sidebar-link__icon">
                <LogoutIcon />
              </span>
              {!collapsed ? <span className="sidebar-link__label">Sair</span> : null}
            </LogoutButton>
          </div>
        </div>
      </aside>

      <div className="app-content">
        <header className="app-topbar">
          <div className="app-topbar__inner">
            <div className="app-brand">
              <span className="app-brand__mark">QA</span>
              <div className="app-brand__text">
                <span className="app-brand__title">Quality Adalta</span>
                <span className="app-brand__subtitle">Operations dashboard</span>
              </div>
            </div>

            <div className="app-chip">Fluxo de serviços e documentação</div>
          </div>
        </header>

        <div className="app-content__body">{children}</div>
      </div>
    </div>
  )
}
