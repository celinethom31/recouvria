'use client'
// src/app/envois/page.tsx
import { useEffect, useState } from 'react'

const STATUT_BADGE: Record<string, string> = {
  EN_ATTENTE: 'badge-gray', ENVOYE: 'badge-blue', DELIVRE: 'badge-green',
  OUVERT: 'badge-green', ERREUR: 'badge-red', REFUSE: 'badge-red',
}
const STATUT_LABEL: Record<string, string> = {
  EN_ATTENTE: 'En attente', ENVOYE: 'Envoyé', DELIVRE: 'Délivré',
  OUVERT: 'Ouvert', ERREUR: 'Erreur', REFUSE: 'Refusé',
}

export default function EnvoisPage() {
  const [envois, setEnvois] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [canal, setCanal] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (canal) params.set('canal', canal)
    params.set('page', String(page))
    fetch(`/api/envois?${params}`)
      .then(r => r.json())
      .then(d => { setEnvois(d.envois || []); setTotal(d.total || 0); setLoading(false) })
  }, [canal, page])

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

  const emailCount = envois.filter(e => e.canal === 'EMAIL').length
  const smsCount = envois.filter(e => e.canal === 'SMS').length
  const ouverts = envois.filter(e => e.statut === 'OUVERT').length
  const erreurs = envois.filter(e => e.statut === 'ERREUR').length

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Envois ({total})</span>
      </div>

      <div className="page-content">
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
          <div className="kpi-card"><div className="kpi-label">Total envois</div><div className="kpi-value blue">{total}</div></div>
          <div className="kpi-card"><div className="kpi-label">Emails</div><div className="kpi-value blue">{emailCount}</div></div>
          <div className="kpi-card"><div className="kpi-label">SMS</div><div className="kpi-value green">{smsCount}</div></div>
          <div className="kpi-card"><div className="kpi-label">Erreurs</div><div className="kpi-value red">{erreurs}</div></div>
        </div>

        {/* Filtres canal */}
        <div className="flex gap-2 mb-4">
          {['', 'EMAIL', 'SMS'].map(c => (
            <button
              key={c}
              className={`btn btn-sm ${canal === c ? 'btn-primary' : ''}`}
              onClick={() => { setCanal(c); setPage(1) }}
            >
              {c === '' ? 'Tous' : c === 'EMAIL' ? '✉ Emails' : '💬 SMS'}
            </button>
          ))}
        </div>

        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Canal</th>
                <th>Dossier</th>
                <th>Destinataire</th>
                <th>Objet / Message</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(10).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(6).fill(0).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 14, width: j === 4 ? 200 : 80 }} /></td>
                    ))}
                  </tr>
                ))
              ) : envois.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>Aucun envoi trouvé</td></tr>
              ) : (
                envois.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontSize: 12, color: '#aaa', whiteSpace: 'nowrap' }}>{fmtDate(e.dateCreation)}</td>
                    <td>
                      <span className={`badge ${e.canal === 'EMAIL' ? 'badge-blue' : 'badge-green'}`}>
                        {e.canal === 'EMAIL' ? '✉' : '💬'} {e.canal}
                      </span>
                    </td>
                    <td>
                      {e.dossier && (
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{e.dossier.debiteurNom}</div>
                          <div style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace' }}>{e.dossier.reference}</div>
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 12.5, color: '#555' }}>{e.destinataire}</td>
                    <td style={{ fontSize: 12.5, color: '#555', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.sujet || e.contenu?.slice(0, 60) + (e.contenu?.length > 60 ? '…' : '')}
                    </td>
                    <td>
                      <div>
                        <span className={`badge ${STATUT_BADGE[e.statut]}`}>{STATUT_LABEL[e.statut]}</span>
                        {e.erreur && <div style={{ fontSize: 11, color: '#A32D2D', marginTop: 2 }}>{e.erreur.slice(0, 50)}</div>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > 50 && (
          <div className="flex items-center justify-between mt-4">
            <span style={{ fontSize: 13, color: '#888' }}>{(page - 1) * 50 + 1}–{Math.min(page * 50, total)} sur {total}</span>
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
