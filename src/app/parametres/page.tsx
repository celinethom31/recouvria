'use client'
// src/app/parametres/page.tsx
import { useEffect, useState } from 'react'

interface Param { cle: string; valeur: string; description: string | null }

const SECTIONS = [
  {
    titre: 'Identité de l\'entreprise',
    params: ['SOCIETE_NOM', 'SOCIETE_EMAIL', 'SOCIETE_TEL'],
  },
  {
    titre: 'Brevo (emails)',
    lien: 'https://app.brevo.com',
    params: ['BREVO_API_KEY', 'BREVO_FROM_EMAIL', 'BREVO_FROM_NAME'],
  },
  {
    titre: 'mTarget (SMS)',
    lien: 'https://www.mtarget.fr',
    params: ['MTARGET_LOGIN', 'MTARGET_PASSWORD', 'MTARGET_EXPEDITEUR'],
  },
  {
    titre: 'Horaires d\'envoi',
    params: ['HEURE_ENVOI_EMAIL', 'HEURE_ENVOI_SMS'],
  },
]

const SECRETS = ['BREVO_API_KEY', 'MTARGET_PASSWORD']
const DESCRIPTIONS: Record<string, string> = {
  SOCIETE_NOM: 'Nom affiché dans les courriers et emails',
  SOCIETE_EMAIL: 'Email de contact de votre société',
  SOCIETE_TEL: 'Téléphone de contact (optionnel)',
  BREVO_API_KEY: 'Clé API Brevo — Settings > API Keys',
  BREVO_FROM_EMAIL: 'Adresse expéditrice (doit être vérifiée dans Brevo)',
  BREVO_FROM_NAME: 'Nom d\'expéditeur affiché',
  MTARGET_LOGIN: 'Identifiant mTarget',
  MTARGET_PASSWORD: 'Mot de passe mTarget',
  MTARGET_EXPEDITEUR: 'Expéditeur SMS (max 11 caractères)',
  HEURE_ENVOI_EMAIL: 'Heure d\'envoi quotidien des emails (format HH:MM)',
  HEURE_ENVOI_SMS: 'Heure d\'envoi quotidien des SMS (format HH:MM)',
}

export default function ParametresPage() {
  const [params, setParams] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testSms, setTestSms] = useState('')
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/parametres')
      .then(r => r.json())
      .then(d => {
        const map: Record<string, string> = {}
        d.forEach((p: Param) => { map[p.cle] = p.valeur })
        setParams(map)
        setLoading(false)
      })
  }, [])

  const save = async () => {
    setSaving(true)
    await fetch('/api/parametres', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const testBrevo = async () => {
    if (!testEmail) return
    setTesting('brevo')
    try {
      const res = await fetch('/api/parametres/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: 'brevo', email: testEmail }),
      })
      const d = await res.json()
      setTestResult(r => ({ ...r, brevo: d.ok ? '✅ Email envoyé avec succès' : `❌ ${d.error}` }))
    } catch { setTestResult(r => ({ ...r, brevo: '❌ Erreur de connexion' })) }
    setTesting(null)
  }

  const testMtarget = async () => {
    if (!testSms) return
    setTesting('mtarget')
    try {
      const res = await fetch('/api/parametres/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: 'mtarget', phone: testSms }),
      })
      const d = await res.json()
      setTestResult(r => ({ ...r, mtarget: d.ok ? '✅ SMS envoyé avec succès' : `❌ ${d.error}` }))
    } catch { setTestResult(r => ({ ...r, mtarget: '❌ Erreur de connexion' })) }
    setTesting(null)
  }

  if (loading) return <div className="page-content"><div className="skeleton" style={{ height: 400, borderRadius: 12 }} /></div>

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Paramètres</span>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
          {saving ? 'Enregistrement…' : saved ? '✓ Enregistré !' : 'Enregistrer'}
        </button>
      </div>

      <div className="page-content" style={{ maxWidth: 700 }}>
        {SECTIONS.map(section => (
          <div key={section.titre} className="card mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3>{section.titre}</h3>
              {section.lien && (
                <a href={section.lien} target="_blank" rel="noopener" className="btn btn-sm" style={{ fontSize: 12 }}>
                  Ouvrir ↗
                </a>
              )}
            </div>
            {section.params.map(cle => (
              <div key={cle} className="form-group">
                <label className="form-label">{DESCRIPTIONS[cle] || cle}</label>
                <input
                  className="form-input"
                  type={SECRETS.includes(cle) ? 'password' : 'text'}
                  value={params[cle] || ''}
                  onChange={e => setParams(p => ({ ...p, [cle]: e.target.value }))}
                  placeholder={cle}
                  autoComplete="off"
                />
              </div>
            ))}

            {/* Test Brevo */}
            {section.titre.includes('Brevo') && (
              <div style={{ marginTop: 12, padding: 12, background: '#f5f5f3', borderRadius: 8 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>Tester la connexion email</div>
                <div className="flex gap-2">
                  <input className="form-input" style={{ flex: 1 }} placeholder="Votre email de test" value={testEmail} onChange={e => setTestEmail(e.target.value)} />
                  <button className="btn btn-sm" onClick={testBrevo} disabled={testing === 'brevo' || !testEmail}>
                    {testing === 'brevo' ? 'Test…' : 'Envoyer un test'}
                  </button>
                </div>
                {testResult.brevo && <div style={{ marginTop: 8, fontSize: 13 }}>{testResult.brevo}</div>}
              </div>
            )}

            {/* Test mTarget */}
            {section.titre.includes('mTarget') && (
              <div style={{ marginTop: 12, padding: 12, background: '#f5f5f3', borderRadius: 8 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>Tester la connexion SMS</div>
                <div className="flex gap-2">
                  <input className="form-input" style={{ flex: 1 }} placeholder="Numéro de test (0612345678)" value={testSms} onChange={e => setTestSms(e.target.value)} />
                  <button className="btn btn-sm" onClick={testMtarget} disabled={testing === 'mtarget' || !testSms}>
                    {testing === 'mtarget' ? 'Test…' : 'Envoyer un SMS test'}
                  </button>
                </div>
                {testResult.mtarget && <div style={{ marginTop: 8, fontSize: 13 }}>{testResult.mtarget}</div>}
              </div>
            )}
          </div>
        ))}

        {/* Section cron */}
        <div className="card mb-4">
          <h3 style={{ marginBottom: 12 }}>Automatisation (cron)</h3>
          <div style={{ fontSize: 13.5, color: '#555', lineHeight: 1.6, marginBottom: 12 }}>
            Le moteur de scénarios est déclenché via l'URL suivante. Configurer dans votre hébergement (cPanel > Tâches cron, Vercel Cron, etc.) pour une exécution quotidienne à 8h.
          </div>
          <div style={{ background: '#f5f5f3', borderRadius: 8, padding: 12, fontFamily: 'monospace', fontSize: 12.5, wordBreak: 'break-all' }}>
            GET https://votre-domaine.com/api/cron?secret=<strong>VOTRE_CRON_SECRET</strong>
          </div>
          <div style={{ marginTop: 10, fontSize: 12.5, color: '#aaa' }}>
            Expression cron recommandée : <code style={{ background: '#f5f5f3', padding: '1px 6px', borderRadius: 4 }}>0 8 * * *</code> (tous les jours à 8h00)
          </div>
        </div>
      </div>
    </>
  )
}
