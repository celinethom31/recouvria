'use client'
// src/app/import/page.tsx
import { useState, useRef } from 'react'

interface ImportResult {
  total: number
  imported: number
  skipped: number
  errors: Array<{ ligne: number; erreur: string }>
}

const CHAMPS = [
  { key: 'debiteurNom', label: 'Nom débiteur', required: true },
  { key: 'montantInitial', label: 'Montant dû (€)', required: true },
  { key: 'dateEcheance', label: "Date d'échéance", required: true },
  { key: 'debiteurEmail', label: 'Email', required: false },
  { key: 'debiteurTel', label: 'Téléphone', required: false },
  { key: 'reference', label: 'Référence', required: false },
  { key: 'debiteurType', label: 'Type (particulier/entreprise)', required: false },
  { key: 'debiteurAdresse', label: 'Adresse', required: false },
  { key: 'notes', label: 'Notes', required: false },
]

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [rows, setRows] = useState<any[][]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [scenarioId, setScenarioId] = useState('')
  const [scenarios, setScenarios] = useState<any[]>([])
  const [step, setStep] = useState<'upload' | 'mapping' | 'result'>('upload')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [dragging, setDragging] = useState(false)

  const loadScenarios = async () => {
    const d = await fetch('/api/scenarios').then(r => r.json())
    setScenarios(d)
  }

  const handleFile = async (f: File) => {
    setFile(f)
    const fd = new FormData()
    fd.append('file', f)
    fd.append('preview', 'true')
    const res = await fetch('/api/import', { method: 'POST', body: fd })
    const data = await res.json()
    setColumns(data.columns || [])
    setRows(data.rows || [])
    // Auto-mapping heuristique
    const autoMap: Record<string, string> = {}
    const HINTS: Record<string, string[]> = {
      debiteurNom: ['nom', 'name', 'debiteur', 'client', 'raison'],
      debiteurEmail: ['email', 'mail', 'courriel'],
      debiteurTel: ['tel', 'phone', 'mobile', 'portable', 'sms'],
      montantInitial: ['montant', 'amount', 'solde', 'dette', 'creance', 'due'],
      dateEcheance: ['echeance', 'echeance', 'date', 'expire', 'due'],
      reference: ['ref', 'reference', 'numero', 'facture', 'invoice'],
      debiteurType: ['type', 'categorie', 'nature'],
      debiteurAdresse: ['adresse', 'address', 'rue', 'ville'],
      notes: ['note', 'commentaire', 'remarque', 'obs'],
    }
    for (const [field, hints] of Object.entries(HINTS)) {
      const match = data.columns.find((c: string) =>
        hints.some(h => c.toLowerCase().replace(/[_\s-]/g, '').includes(h))
      )
      if (match) autoMap[field] = match
    }
    setMapping(autoMap)
    await loadScenarios()
    setStep('mapping')
  }

  const runImport = async () => {
    if (!file) return
    setImporting(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('mapping', JSON.stringify(mapping))
    if (scenarioId) fd.append('scenarioId', scenarioId)
    const res = await fetch('/api/import', { method: 'POST', body: fd })
    const data = await res.json()
    setResult(data)
    setStep('result')
    setImporting(false)
  }

  const reset = () => {
    setFile(null); setColumns([]); setRows([]); setMapping({})
    setScenarioId(''); setResult(null); setStep('upload')
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Import Excel</span>
        {step !== 'upload' && <button className="btn btn-sm" onClick={reset}>← Nouvel import</button>}
      </div>

      <div className="page-content" style={{ maxWidth: 820 }}>

        {step === 'upload' && (
          <div>
            <div
              className="card"
              style={{
                border: `2px dashed ${dragging ? '#185FA5' : '#ddd'}`,
                background: dragging ? '#f0f7ff' : '#fff',
                textAlign: 'center',
                padding: '60px 40px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                marginBottom: 20,
              }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => {
                e.preventDefault(); setDragging(false)
                const f = e.dataTransfer.files[0]
                if (f) handleFile(f)
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Glisser-déposer votre fichier Excel</div>
              <div style={{ fontSize: 13.5, color: '#aaa', marginBottom: 16 }}>ou cliquer pour sélectionner</div>
              <span className="badge badge-gray">.xlsx &nbsp; .csv &nbsp; Jusqu'à 5 000 lignes</span>
              <input ref={fileRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Format attendu du fichier</h3>
              <table className="data-table" style={{ fontSize: 13 }}>
                <thead><tr><th>Colonne</th><th>Obligatoire</th><th>Exemple</th></tr></thead>
                <tbody>
                  {CHAMPS.map(c => (
                    <tr key={c.key}>
                      <td style={{ fontWeight: 500 }}>{c.label}</td>
                      <td>{c.required ? <span className="badge badge-red">Oui</span> : <span className="badge badge-gray">Non</span>}</td>
                      <td style={{ color: '#888' }}>
                        {c.key === 'debiteurNom' ? 'Dupont SARL' : c.key === 'montantInitial' ? '4200' : c.key === 'dateEcheance' ? '15/04/2025' : c.key === 'debiteurEmail' ? 'contact@dupont.fr' : '…'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <div>
            <div className="card mb-4" style={{ background: '#EAF3DE', borderColor: '#C0DD97' }}>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: 20 }}>✅</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{file?.name} — {rows.length + 1}+ lignes détectées</div>
                  <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>{columns.length} colonnes trouvées. Vérifiez la correspondance ci-dessous.</div>
                </div>
              </div>
            </div>

            <div className="card mb-4">
              <h3 style={{ marginBottom: 14 }}>Correspondance des colonnes</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {CHAMPS.map(champ => (
                  <div key={champ.key}>
                    <label className="form-label">
                      {champ.label}
                      {champ.required && <span style={{ color: '#A32D2D', marginLeft: 4 }}>*</span>}
                    </label>
                    <select
                      className="form-select"
                      value={mapping[champ.key] || ''}
                      onChange={e => setMapping(m => ({ ...m, [champ.key]: e.target.value }))}
                    >
                      <option value="">— Ne pas importer —</option>
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Aperçu */}
            {rows.length > 0 && (
              <div className="card mb-4">
                <h3 style={{ marginBottom: 12 }}>Aperçu (5 premières lignes)</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ fontSize: 12, minWidth: 600 }}>
                    <thead>
                      <tr>{columns.map(c => <th key={c}>{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((row, i) => (
                        <tr key={i}>{columns.map((c, j) => <td key={j}>{String(row[j] ?? '')}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="card mb-4">
              <h3 style={{ marginBottom: 12 }}>Scénario de relance automatique</h3>
              <select className="form-select" value={scenarioId} onChange={e => setScenarioId(e.target.value)}>
                <option value="">— Aucun scénario (affecter manuellement) —</option>
                {scenarios.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                className="btn btn-primary"
                disabled={importing || !mapping['debiteurNom'] || !mapping['montantInitial'] || !mapping['dateEcheance']}
                onClick={runImport}
              >
                {importing ? 'Import en cours…' : `Importer les dossiers`}
              </button>
              <button className="btn" onClick={reset}>Annuler</button>
            </div>
            {(!mapping['debiteurNom'] || !mapping['montantInitial'] || !mapping['dateEcheance']) && (
              <div style={{ marginTop: 8, fontSize: 12.5, color: '#A32D2D' }}>
                ⚠ Les colonnes Nom, Montant et Échéance sont obligatoires.
              </div>
            )}
          </div>
        )}

        {step === 'result' && result && (
          <div>
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
              <div className="kpi-card"><div className="kpi-label">Total lignes</div><div className="kpi-value">{result.total}</div></div>
              <div className="kpi-card"><div className="kpi-label">Importés</div><div className="kpi-value green">{result.imported}</div></div>
              <div className="kpi-card"><div className="kpi-label">Ignorés / Erreurs</div><div className="kpi-value amber">{result.skipped}</div></div>
            </div>

            {result.errors.length > 0 && (
              <div className="card mb-4">
                <h3 style={{ marginBottom: 12 }}>Détail des erreurs ({result.errors.length})</h3>
                <table className="data-table" style={{ fontSize: 13 }}>
                  <thead><tr><th>Ligne</th><th>Erreur</th></tr></thead>
                  <tbody>
                    {result.errors.slice(0, 20).map((e, i) => (
                      <tr key={i}>
                        <td>Ligne {e.ligne}</td>
                        <td style={{ color: '#A32D2D' }}>{e.erreur}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-3">
              <a href="/dossiers" className="btn btn-primary">Voir les dossiers importés →</a>
              <button className="btn" onClick={reset}>Nouvel import</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
