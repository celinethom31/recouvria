'use client'
// src/app/dashboard/page.tsx
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DashboardData {
  dossiersActifs: number
  montantEncours: number
  relancesEchues: number
  emailsMois: number
  smsMois: number
  tauxOuverture: number
  activiteMensuelle: Array<{ mois: string; count: number }>
  statuts: Array<{ statut: string; _count: number; _sum: { montantRestant: number } }>
}

const STATUT_LABELS: Record<string, string> = {
  EN_COURS: 'En cours',
  PROMESSE_PAIEMENT: 'Promesse',
  PAYE: 'Payé',
  LITIGIEUX: 'Litigieux',
  CLASSE_SANS_SUITE: 'Classé',
  TRANSMIS_CONTENTIEUX: 'Contentieux',
}

const AGENDA = [
  { heure: '09h00', canal: 'email', label: '1ères relances du matin', count: 24, statut: 'amber' },
  { heure: '10h00', canal: 'sms', label: 'SMS rappels automatiques', count: 8, statut: 'amber' },
  { heure: '14h00', canal: 'ia', label: 'Analyse IA — dossiers bloqués', count: 5, statut: 'blue' },
  { heure: '16h00', canal: 'email', label: 'Mises en demeure', count: 3, statut: 'red' },
]

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
  const maxCount = data?.activiteMensuelle ? Math.max(...data.activiteMensuelle.map(m => m.count), 1) : 1

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Tableau de bord</span>
        <div className="flex gap-2">
          <Link href="/import" className="btn btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Importer
          </Link>
          <Link href="/agent" className="btn btn-primary btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="8" width="18" height="14" rx="2"/><path d="M12 2v6"/><circle cx="12" cy="2" r="1"/><path d="M8 13h.01M16 13h.01"/><path d="M9 17h6"/></svg>
            Agent IA
          </Link>
        </div>
      </div>

      <div className="page-content">
        {/* KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Dossiers actifs</div>
            <div className={`kpi-value blue`}>{loading ? '—' : data?.dossiersActifs ?? 0}</div>
            <div className="kpi-sub">en cours de traitement</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Encours total</div>
            <div className="kpi-value amber">{loading ? '—' : fmt(data?.montantEncours ?? 0)}</div>
            <div className="kpi-sub">à recouvrer</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Taux ouverture email</div>
            <div className="kpi-value green">{loading ? '—' : `${data?.tauxOuverture ?? 0} %`}</div>
            <div className="kpi-sub">ce mois</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Relances échues</div>
            <div className="kpi-value red">{loading ? '—' : data?.relancesEchues ?? 0}</div>
            <div className="kpi-sub">à traiter en urgence</div>
          </div>
        </div>

        <div className="two-col mb-6">
          {/* Activité mensuelle */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3>Activité mensuelle</h3>
              <div className="flex gap-3 text-sm text-muted">
                <span>📧 {loading ? '…' : data?.emailsMois} emails</span>
                <span>💬 {loading ? '…' : data?.smsMois} SMS</span>
              </div>
            </div>
            {/* Mini bar chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
              {(data?.activiteMensuelle ?? Array(6).fill({ mois: '…', count: 0 })).map((m, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.max(8, (m.count / maxCount) * 64)}px`,
                      background: i === (data?.activiteMensuelle.length ?? 1) - 1 ? '#185FA5' : '#B5D4F4',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s',
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#aaa' }}>{m.mois}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Répartition par statut */}
          <div className="card">
            <h3 style={{ marginBottom: 14 }}>Répartition des dossiers</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loading ? (
                <div className="skeleton" style={{ height: 120 }} />
              ) : (
                data?.statuts.map(s => (
                  <div key={s.statut} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 13, minWidth: 120, color: '#555' }}>{STATUT_LABELS[s.statut] || s.statut}</div>
                    <div style={{ flex: 1, background: '#f5f5f3', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (s._count / (data.dossiersActifs || 1)) * 100)}%`, height: '100%', background: '#185FA5', borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, minWidth: 24, textAlign: 'right' }}>{s._count}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Agenda du jour */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3>Agenda de la journée</h3>
            <Link href="/envois" className="btn btn-sm">Voir tous les envois</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {AGENDA.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: i < AGENDA.length - 1 ? '1px solid #f0f0ee' : 'none' }}>
                <div style={{ fontSize: 12, color: '#aaa', minWidth: 48, fontWeight: 600 }}>{item.heure}</div>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: item.canal === 'email' ? '#E6F1FB' : item.canal === 'sms' ? '#EAF3DE' : '#EEEDFE',
                  color: item.canal === 'email' ? '#185FA5' : item.canal === 'sms' ? '#3B6D11' : '#3C3489',
                  fontSize: 14, flexShrink: 0,
                }}>
                  {item.canal === 'email' ? '✉' : item.canal === 'sms' ? '💬' : '🤖'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: '#aaa' }}>{item.count} dossier{item.count > 1 ? 's' : ''}</div>
                </div>
                <span className={`badge badge-${item.statut}`}>
                  {item.statut === 'amber' ? 'En attente' : item.statut === 'blue' ? 'Automatique' : 'Urgent'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
