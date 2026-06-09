'use client'
// src/components/Sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard', label: 'Tableau de bord', icon: <IconDashboard /> },
      { href: '/dossiers', label: 'Dossiers', icon: <IconFolder /> },
      { href: '/envois', label: 'Envois', icon: <IconSend /> },
    ],
  },
  {
    label: 'Automatisation',
    items: [
      { href: '/scenarios', label: 'Scénarios', icon: <IconTimeline /> },
      { href: '/agent', label: 'Agent IA', icon: <IconRobot /> },
      { href: '/import', label: 'Import Excel', icon: <IconImport /> },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { href: '/parametres', label: 'Paramètres', icon: <IconSettings /> },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">
          Recouv<span>IA</span>
        </div>
        <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>Recouvrement amiable</div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(section => (
          <div key={section.label}>
            <div className="sidebar-section">{section.label}</div>
            {section.items.map(item => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link${isActive ? ' active' : ''}`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: '14px 16px', borderTop: '1px solid #e8e8e6' }}>
        <div style={{ fontSize: 12, color: '#aaa' }}>v1.0 · Feniks Consulting</div>
      </div>
    </aside>
  )
}

function IconDashboard() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
}
function IconFolder() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>
}
function IconSend() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9l20-7z"/></svg>
}
function IconTimeline() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/><path d="M12 5v14"/><path d="M8 8h8"/><path d="M8 16h8"/></svg>
}
function IconRobot() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="8" width="18" height="14" rx="2"/><path d="M12 2v6"/><circle cx="12" cy="2" r="1"/><path d="M8 13h.01M16 13h.01"/><path d="M9 17h6"/></svg>
}
function IconImport() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="12" x2="12" y2="18"/><polyline points="9 15 12 18 15 15"/></svg>
}
function IconSettings() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
}
