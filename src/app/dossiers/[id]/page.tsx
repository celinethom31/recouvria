'use client'
// src/app/dossiers/[id]/page.tsx
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const STATUT_OPTS = [
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'PROMESSE_PAIEMENT', label: 'Promesse de paiement' },
  { value: 'PAYE', label: 'Payé' },
  { value: 'LITIGIEUX', label: 'Litigieux' },
  { value: 'CLASSE_SANS_SUITE', label: 'Classé sans suite' },
  { value: 'TRANSMIS_CONTENTIEUX', label: 'Transmis contentieux' },
]
const CANAL_BADGE: Record<string, string> = { EMAIL: 'badge-blue', SMS: 'badge-green', COURRIER: 'badge-gray' }
const ENVOI_STATUT_BADGE: Record<string, string> = { ENVOYE: 'badge-blue', DELIVRE: 'badge-green', OUVERT: 'badge-green', ERREUR: 'badge-red', REFUSE: 'badge-red', EN_ATTENTE: 'badge-gray' }
const ENVOI_STATUT_LABEL: Record<string, string> = { ENVOYE: 'Envoyé', DELIVRE: 'Délivré', OUVERT: 'Ouvert', ERREUR: 'Erreur', REFUSE: 'Refusé', EN_ATTENTE: 'En attente' }

export default function DossierPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [dossier, setDossier] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showEnvoi, setShowEnvoi] = useState(false)
  const [envoi, setEnvoi] = useState({ canal: 'EMAIL', sujet: '', contenu: '' })
  const [sending, setSending] = useState(false)
  const [note, setNote] = useState('')

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const retard = () => {
    if (!dossier) return 0
    return Math.floor((Date.now() - new Date(dossier.dateEcheance).getTime()) / 86400000)
  }

  useEffect(() => {
    fetch(`/api/dossiers/${id}`)
      .then(r => r.json())
      .then(d => { setDossier(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  const updateStatut = async (statut: string) => {
    setSaving(true)
    await fetch(`/api/dossiers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statut }) })
    setDossier((d: any) => ({ ...d, statut }))
    setSaving(false)
  }

  const addNote = async () => {
    if (!note.trim()) return
    await fetch(`/api/dossiers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: note }) })
    setDossier((d: any) => ({ ...d, notes: note }))
    setNote('')
  }

  const sendManuel = async () => {
    setSending(true)
    const res = await fetch('/api/envois', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossierId: id, ...envoi }),
    })
    const data = await res.json()
    if (res.ok) {
      setShowEnvoi(false)
      setEnvoi({ canal: 'EMAIL', sujet: '', contenu: '' })
      // Recharger
      fetch(`/api/dossiers/${id}`).then(r => r.json()).then(setDossier)
    } else {
      alert('Erreur envoi : ' + data.error)
    }
    setSending(false)
  }

  if (loading) return <div className="page-content"><div className="skeleton" style={{ height: 400, borderRadius: 12 }} /></div>
  if (!dossier || dossier.error) return (
    <div className="page-content">
      <div className="card" style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>
        Dossier introuvable. <Link href="/dossiers" className="btn btn-sm">Retour</Link>
      </div>
    </div>
  )

  const r = retard()

  return (
    <>
      <div className="topbar">
        <div className="flex items-center gap-3">
          <button className="btn btn-sm btn-icon" onClick={() => router.back()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <span className="topbar-title">{dossier.debiteurNom}</span>
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#aaa', background: '#f5f5f3', padding: '2px 8px', borderRadius: 4 }}>{dossier.reference}</span>
        </div>
        <div className="flex gap-2">
          <Link href={`/agent?dossier=${id}`} className="btn btn-sm">
            🤖 Analyser avec IA
          </Link>
          <button className="btn btn-primary btn-sm" onClick={() => setShowEnvoi(!showEnvoi)}>
            ✉ Envoyer
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="two-col mb-4">
          {/* Fiche débiteur */}
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Informations débiteur</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', fontSize: 13.5 }}>
              <div><div style={{ color: '#aaa', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Type</div>{dossier.debiteurType}</div>
              <div><div style={{ color: '#aaa', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Email</div>{dossier.debiteurEmail || <span style={{ color: '#ccc' }}>—</span>}</div>
              <div><div style={{ color: '#aaa', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Téléphone</div>{dossier.debiteurTel || <span style={{ color: '#ccc' }}>—</span>}</div>
              <div><div style={{ color: '#aaa', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Adresse</div>{dossier.debiteurAdresse || <span style={{ color: '#ccc' }}>—</span>}</div>
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f0f0ee' }}>
              <h3 style={{ marginBottom: 12 }}>Créance</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', fontSize: 13.5 }}>
                <div><div style={{ color: '#aaa', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Montant initial</div><strong>{fmt(dossier.montantInitial)}</strong></div>
                <div><div style={{ color: '#aaa', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Restant dû</div><strong style={{ color: dossier.montantRestant > 0 ? '#A32D2D' : '#3B6D11' }}>{fmt(dossier.montantRestant)}</strong></div>
                <div><div style={{ color: '#aaa', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Échéance</div>{new Date(dossier.dateEcheance).toLocaleDateString('fr-FR')}</div>
                <div><div style={{ color: '#aaa', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Retard</div><strong style={{ color: r > 0 ? '#A32D2D' : '#3B6D11' }}>{r > 0 ? `J+${r}` : 'À venir'}</strong></div>
              </div>
            </div>
          </div>

          {/* Statut & scénario */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Statut du dossier</h3>
              <select
                className="form-select mb-4"
                value={dossier.statut}
                onChange={e => updateStatut(e.target.value)}
                disabled={saving}
              >
                {STATUT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <div style={{ fontSize: 12.5, color: '#aaa' }}>
                Scénario actif : <strong style={{ color: '#555' }}>{dossier.scenario?.nom || 'Aucun'}</strong>
              </div>
              <div style={{ fontSize: 12.5, color: '#aaa', marginTop: 4 }}>
                Envois : <strong>{dossier._count?.envois ?? dossier.envois?.length ?? 0}</strong>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 10 }}>Notes</h3>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <textarea
                  className="form-textarea"
                  placeholder="Ajouter une note…"
                  value={note || dossier.notes || ''}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                />
              </div>
              <button className="btn btn-sm" onClick={addNote}>Enregistrer la note</button>
            </div>
          </div>
        </div>

        {/* Formulaire d'envoi manuel */}
        {showEnvoi && (
          <div className="card mb-4" style={{ borderColor: '#185FA5' }}>
            <h3 style={{ marginBottom: 14 }}>Envoyer un message manuel</h3>
            <div className="flex gap-3 mb-4">
              <label className="toggle-wrap">
                <input type="radio" name="canal" value="EMAIL" checked={envoi.canal === 'EMAIL'} onChange={() => setEnvoi(e => ({ ...e, canal: 'EMAIL' }))} style={{ display: 'none' }} />
                <span className={`badge ${envoi.canal === 'EMAIL' ? 'badge-blue' : 'badge-gray'}`} style={{ cursor: 'pointer' }}>✉ Email</span>
              </label>
              <label className="toggle-wrap">
                <input type="radio" name="canal" value="SMS" checked={envoi.canal === 'SMS'} onChange={() => setEnvoi(e => ({ ...e, canal: 'SMS' }))} style={{ display: 'none' }} />
                <span className={`badge ${envoi.canal === 'SMS' ? 'badge-green' : 'badge-gray'}`} style={{ cursor: 'pointer' }}>💬 SMS</span>
              </label>
            </div>
            {envoi.canal === 'EMAIL' && (
              <div className="form-group">
                <label className="form-label">Objet</label>
                <input className="form-input" value={envoi.sujet} onChange={e => setEnvoi(v => ({ ...v, sujet: e.target.value }))} placeholder="Objet de l'email" />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">{envoi.canal === 'SMS' ? 'Message (max 160 car.)' : 'Corps du message'}</label>
              <textarea
                className="form-textarea"
                value={envoi.contenu}
                onChange={e => setEnvoi(v => ({ ...v, contenu: e.target.value }))}
                placeholder={envoi.canal === 'SMS' ? 'Votre message SMS…' : 'Corps de l\'email…'}
                rows={envoi.canal === 'SMS' ? 3 : 6}
                maxLength={envoi.canal === 'SMS' ? 160 : undefined}
              />
              {envoi.canal === 'SMS' && <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{envoi.contenu.length}/160 caractères</div>}
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={sendManuel} disabled={sending || !envoi.contenu}>
                {sending ? 'Envoi…' : `Envoyer ${envoi.canal === 'SMS' ? 'le SMS' : "l'email"}`}
              </button>
              <button className="btn" onClick={() => setShowEnvoi(false)}>Annuler</button>
            </div>
          </div>
        )}

        {/* Historique envois */}
        {dossier.envois?.length > 0 && (
          <div className="card mb-4">
            <h3 style={{ marginBottom: 14 }}>Historique des envois ({dossier.envois.length})</h3>
            <div className="table-card" style={{ border: 'none', borderRadius: 0, marginBottom: 0 }}>
              <table className="data-table">
                <thead>
                  <tr><th>Date</th><th>Canal</th><th>Destinataire</th><th>Objet / Message</th><th>Statut</th></tr>
                </thead>
                <tbody>
                  {dossier.envois.map((e: any) => (
                    <tr key={e.id}>
                      <td style={{ fontSize: 12, color: '#aaa' }}>{fmtDate(e.dateCreation)}</td>
                      <td><span className={`badge ${CANAL_BADGE[e.canal]}`}>{e.canal}</span></td>
                      <td style={{ fontSize: 12.5 }}>{e.destinataire}</td>
                      <td style={{ fontSize: 12.5, color: '#555', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.sujet || e.contenu?.slice(0, 60) + (e.contenu?.length > 60 ? '…' : '')}
                      </td>
                      <td><span className={`badge ${ENVOI_STATUT_BADGE[e.statut]}`}>{ENVOI_STATUT_LABEL[e.statut] || e.statut}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Journal des actions */}
        {dossier.actions?.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 14 }}>Journal d'activité</h3>
            <div className="timeline">
              {dossier.actions.map((a: any) => (
                <div key={a.id} className="timeline-item">
                  <div className={`timeline-dot ${a.type.includes('EMAIL') ? 'mail' : a.type.includes('SMS') ? 'sms' : a.type.includes('IA') || a.type.includes('ANALYSE') ? 'ia' : 'action'}`}>
                    {a.type.includes('EMAIL') ? '✉' : a.type.includes('SMS') ? '💬' : a.type.includes('IA') ? '🤖' : '●'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5 }}>{a.description}</div>
                    <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{fmtDate(a.date)} · {a.auteur}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
