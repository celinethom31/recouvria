'use client'
// src/app/dossiers/page.tsx
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const STATUT_OPTS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'PROMESSE_PAIEMENT', label: 'Promesse de paiement' },
  { value: 'PAYE', label: 'Payé' },
  { value: 'LITIGIEUX', label: 'Litigieux' },
  { value: 'TRANSMIS_CONTENTIEUX', label: 'Contentieux' },
]

const STATUT_BADGE: Record<string, string> = {
  EN_COURS: 'badge-amber',
  PROMESSE_PAIEMENT: 'badge-blue',
  PAYE: 'badge-green',
  LITIGIEUX: 'badge-red',
  CLASSE_SANS_SUITE: 'badge-gray',
  TRANSMIS_CONTENTIEUX: 'badge-purple',
}

const STATUT_LABELS: Record<string, string> = {
  EN_COURS: 'En cours',
  PROMESSE_PAIEMENT: 'Promesse',
  PAYE: 'Payé',
  LITIGIEUX: 'Litigieux',
  CLASSE_SANS_SUITE: 'Classé',
  TRANSMIS_CONTENTIEUX: 'Contentieux',
}

const PRIORITE_BADGE: Record<string, string> = {
  BASSE: 'badge-gray',
  NORMALE: 'badge-blue',
  HAUTE: 'badge-amber',
  URGENTE: 'badge-red',
}

interface Dossier {
  id: string
  reference: string
  debiteurNom: string
  debiteurEmail: string | null
  debiteurType: string
  montantRestant: number
  dateEcheance: string
  statut: string
  priorite: string
  scenario: { nom: string } | null
  _count: { envois: number }
}

export default function DossiersPage() {
  const router = useRouter()
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statut, setStatut] = useState('')
  const [page, setPage] = useState(1)

  const fetchDossiers = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (statut) params.set('statut', statut)
    params.set('page', String(page))
    fetch(`/api/dossiers?${params}`)
      .then(r => r.json())
      .then(d => { setDossiers(d.dossiers || []); setTotal(d.total || 0); setLoading(false) })
      .catch(() => setLoading(false))
  }, [search, statut, page])

  useEffect(() => { fetchDossiers() }, [fetchDossiers])

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
  const retard = (d: string) => {
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
    return days > 0 ? `J+${days}` : 'À venir'
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Dossiers ({total})</span>
        <div className="flex gap-2">
          <Link href="/import" className="btn btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Import Excel
          </Link>
          <Link href="/dossiers/nouveau" className="btn btn-primary btn-sm">
            + Nouveau dossier
          </Link>
        </div>
      </div>

      <div className="page-content">
        {/* Filtres */}
        <div className="flex gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
          <input
            className="form-input"
            style={{ maxWidth: 280 }}
            placeholder="Rechercher (nom, référence, email)…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          <select
            className="form-select"
            style={{ maxWidth: 200 }}
            value={statut}
            onChange={e => { setStatut(e.target.value); setPage(1) }}
          >
            {STATUT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {(search || statut) && (
            <button className="btn btn-sm" onClick={() => { setSearch(''); setStatut(''); setPage(1) }}>
              ✕ Réinitialiser
            </button>
          )}
        </div>

        {/* Table */}
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Débiteur</th>
                <th>Référence</th>
                <th>Montant dû</th>
                <th>Retard</th>
                <th>Scénario</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(8).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(7).fill(0).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 16, width: j === 0 ? 160 : 80 }} /></td>
                    ))}
                  </tr>
                ))
              ) : dossiers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>
                    Aucun dossier trouvé
                    {!search && !statut && <div style={{ marginTop: 8 }}><Link href="/import" className="btn btn-primary btn-sm">Importer depuis Excel</Link></div>}
                  </td>
                </tr>
              ) : (
                dossiers.map(d => (
                  <tr key={d.id} onClick={() => router.push(`/dossiers/${d.id}`)}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{d.debiteurNom}</div>
                      {d.debiteurEmail && <div style={{ fontSize: 12, color: '#aaa' }}>{d.debiteurEmail}</div>}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#555' }}>{d.reference}</td>
                    <td style={{ fontWeight: 700, fontSize: 14 }}>{fmt(d.montantRestant)}</td>
                    <td>
                      {new Date(d.dateEcheance) < new Date() ? (
                        <span className="badge badge-red">{retard(d.dateEcheance)}</span>
                      ) : (
                        <span className="badge badge-gray">À venir</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: 12.5, color: '#666' }}>{d.scenario?.nom || '—'}</span>
                    </td>
                    <td>
                      <span className={`badge ${STATUT_BADGE[d.statut] || 'badge-gray'}`}>
                        {STATUT_LABELS[d.statut] || d.statut}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <Link href={`/dossiers/${d.id}`} className="btn btn-icon btn-sm" title="Voir le dossier">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </Link>
                        <Link href={`/agent?dossier=${d.id}`} className="btn btn-icon btn-sm" title="Analyser avec IA">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="8" width="18" height="14" rx="2"/><path d="M12 2v6"/><circle cx="12" cy="2" r="1"/><path d="M8 13h.01M16 13h.01"/><path d="M9 17h6"/></svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 50 && (
          <div className="flex items-center justify-between mt-4">
            <span style={{ fontSize: 13, color: '#888' }}>
              {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} sur {total} dossiers
            </span>
            <div className="flex gap-2">
              <button className="btn btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Précédent</button>
              <button className="btn btn-sm" disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)}>Suivant →</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
