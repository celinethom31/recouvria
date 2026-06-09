'use client'
// src/app/agent/page.tsx
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Message { role: 'user' | 'assistant'; content: string }

const QUICK_ACTIONS = [
  { icon: '⚠', label: 'Analyser les dossiers à risque', prompt: 'Analyse les dossiers en cours et identifie les 5 plus à risque de non-recouvrement. Donne un score et une recommandation pour chacun.' },
  { icon: '✉', label: 'Rédiger une relance', prompt: 'Rédige une relance amiable de niveau 2 (15 jours de retard) pour une entreprise, montant 3 500 €, ton professionnel et ferme.' },
  { icon: '📋', label: 'Générer un rapport mensuel', prompt: 'Génère un rapport de recouvrement synthétique pour le mois en cours. Inclus le taux de recouvrement estimé et les recommandations.' },
  { icon: '⚖', label: 'Identifier dossiers contentieux', prompt: "Quels dossiers répondent aux critères pour être transmis en contentieux ? (retard > 60 jours, montant > 1000€, aucune réponse aux relances)" },
  { icon: '📝', label: 'Modèle de mise en demeure', prompt: 'Rédige un modèle de mise en demeure conforme à la législation française, avec les mentions obligatoires, pour une créance commerciale.' },
  { icon: '❓', label: 'Règlementation R124-4', prompt: 'Rappelle-moi les règles essentielles de la réglementation R124-4 CPCE concernant le recouvrement amiable en France.' },
]

export default function AgentPage() {
  const searchParams = useSearchParams()
  const dossierId = searchParams.get('dossier')
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Bonjour ! Je suis RecouvrIA, votre assistant expert en recouvrement amiable.\n\nJe peux vous aider à :\n• Analyser des dossiers et évaluer les risques\n• Rédiger des courriers de relance personnalisés\n• Générer des rapports de suivi\n• Répondre à vos questions sur la réglementation\n\nComment puis-je vous aider ?" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [dossier, setDossier] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (dossierId) {
      fetch(`/api/dossiers/${dossierId}`)
        .then(r => r.json())
        .then(d => {
          setDossier(d)
          const welcomeMsg = `J'ai chargé le dossier **${d.debiteurNom}** (${d.reference}).\n\n• Montant : ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(d.montantRestant)}\n• Échéance : ${new Date(d.dateEcheance).toLocaleDateString('fr-FR')}\n• Statut : ${d.statut}\n\nQue souhaitez-vous faire avec ce dossier ?`
          setMessages(m => [...m, { role: 'assistant', content: welcomeMsg }])
        })
    }
  }, [dossierId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.reply || 'Désolé, une erreur est survenue.' }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Erreur de connexion à l\'agent IA.' }])
    }
    setLoading(false)
  }

  const analyserDossier = async () => {
    if (!dossierId) return
    setLoading(true)
    setMessages(m => [...m, { role: 'user', content: `Analyse ce dossier et donne-moi une évaluation du risque et ta recommandation.` }])
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyser', dossierId }),
      })
      const data = await res.json()
      const reply = `**Score de risque : ${data.scoreRisque}/100**\n\n**Analyse :**\n${data.analyse}\n\n**Recommandation :**\n${data.recommandation}`
      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Erreur lors de l\'analyse.' }])
    }
    setLoading(false)
  }

  return (
    <>
      <div className="topbar">
        <div className="flex items-center gap-3">
          <span className="topbar-title">Agent IA</span>
          {dossier && (
            <span style={{ fontSize: 13, background: '#EEEDFE', color: '#3C3489', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>
              🗂 {dossier.debiteurNom}
            </span>
          )}
        </div>
        {dossierId && (
          <div className="flex gap-2">
            <button className="btn btn-sm" onClick={analyserDossier} disabled={loading}>🔍 Analyser ce dossier</button>
            <Link href={`/dossiers/${dossierId}`} className="btn btn-sm">← Retour au dossier</Link>
          </div>
        )}
      </div>

      <div className="page-content" style={{ display: 'flex', gap: 20, height: 'calc(100vh - 56px)', paddingBottom: 0, overflow: 'hidden' }}>
        {/* Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Messages */}
            <div className="chat-messages" style={{ flex: 1, paddingRight: 4 }}>
              {messages.map((m, i) => (
                <div key={i} className={`chat-bubble ${m.role}`} style={{ whiteSpace: 'pre-wrap' }}>
                  {m.content.split('**').map((part, j) =>
                    j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                  )}
                </div>
              ))}
              {loading && (
                <div className="chat-bubble assistant">
                  <span style={{ display: 'inline-flex', gap: 4 }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{
                        width: 6, height: 6, borderRadius: '50%', background: '#aaa',
                        animation: `bounce 1s infinite ${i * 0.15}s`,
                      }} />
                    ))}
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            {/* Input */}
            <div className="chat-input-row">
              <input
                className="form-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Posez votre question ou donnez une instruction…"
                disabled={loading}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={() => send()} disabled={loading || !input.trim()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9l20-7z"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 24, overflowY: 'auto' }}>
          <div className="card card-sm">
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Actions rapides</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {QUICK_ACTIONS.map((a, i) => (
                <button
                  key={i}
                  className="btn btn-sm"
                  style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '7px 10px', lineHeight: 1.4 }}
                  onClick={() => send(a.prompt)}
                  disabled={loading}
                >
                  <span style={{ flexShrink: 0 }}>{a.icon}</span>
                  <span style={{ fontSize: 12.5 }}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card card-sm">
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Conseils</div>
            <div style={{ fontSize: 12.5, color: '#888', lineHeight: 1.5 }}>
              L'agent connaît le contexte de vos dossiers. Vous pouvez lui demander de rédiger un courrier spécifique en précisant la référence, le ton et l'étape de relance souhaitée.
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </>
  )
}
