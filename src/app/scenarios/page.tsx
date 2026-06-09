'use client'
// src/app/scenarios/page.tsx
import { useEffect, useState } from 'react'

interface Etape {
  id?: string
  ordre: number
  jourDeclenchement: number
  canal: 'EMAIL' | 'SMS' | 'COURRIER'
  sujet: string | null
  contenu: string
  genererAvecIA: boolean
  actif: boolean
}

interface Scenario {
  id: string
  nom: string
  description: string | null
  actif: boolean
  etapes: Etape[]
  _count: { dossiers: number }
}

const CANAL_STYLE: Record<string, { bg: string; color: string; icon: string }> = {
  EMAIL: { bg: '#E6F1FB', color: '#185FA5', icon: '✉' },
  SMS: { bg: '#EAF3DE', color: '#3B6D11', icon: '💬' },
  COURRIER: { bg: '#F1EFE8', color: '#555', icon: '📄' },
}

const NEW_SCENARIO: Omit<Scenario, 'id' | '_count'> = {
  nom: '',
  description: '',
  actif: true,
  etapes: [
    { ordre: 1, jourDeclenchement: 0, canal: 'EMAIL', sujet: 'Rappel de facture — {REFERENCE}', contenu: 'Bonjour {NOM},\n\nVotre facture {REFERENCE} de {MONTANT} est échue depuis le {DATE_ECHEANCE}.\n\nMerci de procéder au règlement.\n\nCordialement,\n{SOCIETE}', genererAvecIA: false, actif: true },
  ],
}

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Scenario | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/scenarios').then(r => r.json()).then(d => {
      setScenarios(d)
      if (d.length > 0) setSelected(d[0])
      setLoading(false)
    })
  }, [])

  const startNew = () => {
    setDraft({ ...NEW_SCENARIO })
    setEditing(true)
    setSelected(null)
  }

  const addEtape = () => {
    const last = draft.etapes[draft.etapes.length - 1]
    setDraft((d: any) => ({
      ...d,
      etapes: [...d.etapes, {
        ordre: d.etapes.length + 1,
        jourDeclenchement: (last?.jourDeclenchement ?? 0) + 7,
        canal: 'EMAIL',
        sujet: '',
        contenu: '',
        genererAvecIA: false,
        actif: true,
      }],
    }))
  }

  const removeEtape = (i: number) => {
    setDraft((d: any) => ({
      ...d,
      etapes: d.etapes.filter((_: any, idx: number) => idx !== i).map((e: any, idx: number) => ({ ...e, ordre: idx + 1 })),
    }))
  }

  const saveScenario = async () => {
    setSaving(true)
    const res = await fetch('/api/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
    const saved = await res.json()
    setScenarios(s => [...s, saved])
    setSelected(saved)
    setEditing(false)
    setDraft(null)
    setSaving(false)
  }

  const VARIABLES = ['{NOM}', '{REFERENCE}', '{MONTANT}', '{DATE_ECHEANCE}', '{JOURS_RETARD}', '{SOCIETE}']

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Scénarios de relance</span>
        <button className="btn btn-primary btn-sm" onClick={startNew}>+ Nouveau scénario</button>
      </div>

      <div className="page-content">
        <div className="two-col" style={{ alignItems: 'flex-start' }}>
          {/* Liste des scénarios */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading ? (
              Array(3).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />)
            ) : (
              scenarios.map(sc => (
                <div
                  key={sc.id}
                  className="card card-sm"
                  style={{ cursor: 'pointer', borderColor: selected?.id === sc.id ? '#185FA5' : '#e8e8e6', background: selected?.id === sc.id ? '#f0f7ff' : '#fff', transition: 'all 0.1s' }}
                  onClick={() => { setSelected(sc); setEditing(false) }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{sc.nom}</div>
                      <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
                        {sc.etapes.length} étapes · {sc._count?.dossiers ?? 0} dossiers actifs
                      </div>
                    </div>
                    <div
                      className={`toggle ${sc.actif ? 'on' : ''}`}
                      title={sc.actif ? 'Actif' : 'Inactif'}
                    />
                  </div>
                </div>
              ))
            )}

            {/* Variables disponibles */}
            <div className="card" style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Variables disponibles</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {VARIABLES.map(v => (
                  <code key={v} style={{ fontSize: 11.5, background: '#f5f5f3', padding: '2px 7px', borderRadius: 4, border: '1px solid #e0e0dc', color: '#555' }}>{v}</code>
                ))}
              </div>
            </div>
          </div>

          {/* Détail / éditeur */}
          <div>
            {editing && draft ? (
              <div className="card">
                <h3 style={{ marginBottom: 16 }}>Nouveau scénario</h3>
                <div className="form-group">
                  <label className="form-label">Nom du scénario</label>
                  <input className="form-input" value={draft.nom} onChange={e => setDraft((d: any) => ({ ...d, nom: e.target.value }))} placeholder="Ex: Relance Standard" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input className="form-input" value={draft.description} onChange={e => setDraft((d: any) => ({ ...d, description: e.target.value }))} placeholder="Optionnel" />
                </div>

                <div style={{ borderTop: '1px solid #f0f0ee', paddingTop: 16, marginBottom: 12 }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3>Étapes</h3>
                    <button className="btn btn-sm" onClick={addEtape}>+ Ajouter une étape</button>
                  </div>

                  {draft.etapes.map((etape: Etape, i: number) => (
                    <div key={i} style={{ background: '#fafaf8', borderRadius: 10, padding: 14, marginBottom: 10, border: '1px solid #e8e8e6' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div style={{ fontWeight: 600, fontSize: 13 }}>Étape {etape.ordre}</div>
                        <button className="btn btn-sm btn-danger" onClick={() => removeEtape(i)}>Supprimer</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div>
                          <label className="form-label">Délai (jours depuis création)</label>
                          <input type="number" className="form-input" value={etape.jourDeclenchement} min={0}
                            onChange={e => setDraft((d: any) => ({ ...d, etapes: d.etapes.map((ee: any, ii: number) => ii === i ? { ...ee, jourDeclenchement: parseInt(e.target.value) } : ee) }))} />
                        </div>
                        <div>
                          <label className="form-label">Canal</label>
                          <select className="form-select" value={etape.canal}
                            onChange={e => setDraft((d: any) => ({ ...d, etapes: d.etapes.map((ee: any, ii: number) => ii === i ? { ...ee, canal: e.target.value } : ee) }))}>
                            <option value="EMAIL">Email</option>
                            <option value="SMS">SMS</option>
                          </select>
                        </div>
                      </div>
                      {etape.canal === 'EMAIL' && (
                        <div style={{ marginBottom: 8 }}>
                          <label className="form-label">Objet de l'email</label>
                          <input className="form-input" value={etape.sujet || ''} placeholder="Objet avec variables : {REFERENCE}"
                            onChange={e => setDraft((d: any) => ({ ...d, etapes: d.etapes.map((ee: any, ii: number) => ii === i ? { ...ee, sujet: e.target.value } : ee) }))} />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="form-label" style={{ marginBottom: 0 }}>Contenu</label>
                          <label className="toggle-wrap" style={{ gap: 6 }}>
                            <span style={{ fontSize: 12, color: '#888' }}>Générer avec IA</span>
                            <div className={`toggle ${etape.genererAvecIA ? 'on' : ''}`}
                              onClick={() => setDraft((d: any) => ({ ...d, etapes: d.etapes.map((ee: any, ii: number) => ii === i ? { ...ee, genererAvecIA: !ee.genererAvecIA } : ee) }))} />
                          </label>
                        </div>
                        {etape.genererAvecIA ? (
                          <div style={{ background: '#EEEDFE', borderRadius: 8, padding: 10, fontSize: 13, color: '#3C3489' }}>
                            🤖 L'IA génèrera automatiquement ce message en fonction du contexte du dossier.
                          </div>
                        ) : (
                          <textarea className="form-textarea" rows={4} value={etape.contenu} placeholder="Contenu avec variables…"
                            onChange={e => setDraft((d: any) => ({ ...d, etapes: d.etapes.map((ee: any, ii: number) => ii === i ? { ...ee, contenu: e.target.value } : ee) }))} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button className="btn btn-primary" onClick={saveScenario} disabled={saving || !draft.nom}>{saving ? 'Enregistrement…' : 'Enregistrer le scénario'}</button>
                  <button className="btn" onClick={() => { setEditing(false); setDraft(null) }}>Annuler</button>
                </div>
              </div>
            ) : selected ? (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3>{selected.nom}</h3>
                    {selected.description && <div style={{ fontSize: 13, color: '#aaa', marginTop: 3 }}>{selected.description}</div>}
                  </div>
                  <span style={{ fontSize: 13, color: '#aaa' }}>{selected._count?.dossiers ?? 0} dossiers actifs</span>
                </div>

                <div className="step-list">
                  {selected.etapes.map((e, i) => {
                    const cs = CANAL_STYLE[e.canal]
                    return (
                      <div key={i} className="step-item">
                        <div className="step-day">J+{e.jourDeclenchement}</div>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: cs.bg, color: cs.color, fontSize: 14, flexShrink: 0 }}>
                          {e.genererAvecIA ? '🤖' : cs.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 500 }}>
                            {e.genererAvecIA ? `IA : génération automatique (${e.canal})` : (e.sujet || `${e.canal} — étape ${e.ordre}`)}
                          </div>
                          {!e.genererAvecIA && e.contenu && (
                            <div style={{ fontSize: 12, color: '#aaa', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>
                              {e.contenu.replace(/\n/g, ' ').slice(0, 80)}…
                            </div>
                          )}
                        </div>
                        <span className={`badge ${e.canal === 'EMAIL' ? 'badge-blue' : 'badge-green'}`}>{e.canal}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', color: '#aaa', padding: 60 }}>
                Sélectionner un scénario ou en créer un nouveau
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
