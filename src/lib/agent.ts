// src/lib/agent.ts
import Anthropic from '@anthropic-ai/sdk'
import { differenceInDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface DossierContext {
  reference: string
  debiteurNom: string
  debiteurType: string
  montantInitial: number
  montantRestant: number
  dateEcheance: Date | string
  statut: string
  historique?: string[]
  societeNom?: string
}

// Génère un courrier de relance adapté au contexte
export async function genererCourrier(
  dossier: DossierContext,
  etape: { canal: string; sujet?: string | null; ordre: number },
  societeNom: string
): Promise<{ sujet: string; contenu: string }> {
  const retard = differenceInDays(new Date(), new Date(dossier.dateEcheance))
  const estEntreprise = dossier.debiteurType === 'ENTREPRISE'
  const tonDurite = etape.ordre <= 2 ? 'aimable et professionnel' : etape.ordre <= 4 ? 'ferme mais courtois' : 'très ferme, avant recours judiciaire'

  const prompt = `Tu es expert en recouvrement amiable de créances en France. 
Génère un ${etape.canal === 'SMS' ? 'SMS' : 'email'} de relance pour le dossier suivant.

DOSSIER :
- Débiteur : ${dossier.debiteurNom} (${estEntreprise ? 'société' : 'particulier'})
- Référence : ${dossier.reference}
- Montant dû : ${dossier.montantRestant.toFixed(2)} €
- Échéance dépassée le : ${format(new Date(dossier.dateEcheance), 'dd/MM/yyyy', { locale: fr })}
- Retard : ${retard} jours
- Étape de relance : n°${etape.ordre}
- Ton requis : ${tonDurite}
- Société créancière : ${societeNom}
${dossier.historique?.length ? `- Historique : ${dossier.historique.join(', ')}` : ''}

CONTRAINTES LÉGALES (respecter obligatoirement) :
- Conformité RGPD et R124-4 CPCE
- Pas de menaces illicites
- Indiquer les voies de recours seulement à partir de l'étape 4
- Pour les particuliers : ton empathique, mention possible de délais de paiement

${etape.canal === 'SMS' ? 'FORMAT SMS : max 160 caractères, pas de formule de politesse longue, lien de contact en fin.' : `FORMAT EMAIL :
- Objet accrocheur et professionnel
- Corps de 3-5 paragraphes
- Formule d'appel adaptée (Madame/Monsieur pour particulier, formule professionnelle pour entreprise)
- Coordonnées de contact en fin`}

Réponds UNIQUEMENT en JSON valide (sans markdown) :
{
  "sujet": "objet de l'email ou null pour SMS",
  "contenu": "corps du message"
}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  try {
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return { sujet: parsed.sujet || etape.sujet || '', contenu: parsed.contenu || '' }
  } catch {
    return { sujet: etape.sujet || 'Relance de paiement', contenu: text }
  }
}

// Analyse le risque d'un dossier et recommande une action
export async function analyserDossier(dossier: DossierContext, historique: string[]): Promise<{
  scoreRisque: number
  analyse: string
  recommandation: string
}> {
  const retard = differenceInDays(new Date(), new Date(dossier.dateEcheance))

  const prompt = `Tu es expert en recouvrement amiable. Analyse ce dossier et évalue le risque de non-recouvrement.

DOSSIER :
- Débiteur : ${dossier.debiteurNom} (${dossier.debiteurType})
- Montant : ${dossier.montantRestant} €
- Retard : ${retard} jours
- Statut actuel : ${dossier.statut}
- Historique des actions : ${historique.length ? historique.join(' | ') : 'Aucun'}

Réponds UNIQUEMENT en JSON valide (sans markdown) :
{
  "scoreRisque": <entier 0-100, 100 = très risqué>,
  "analyse": "<2-3 phrases d'analyse>",
  "recommandation": "<action concrète à effectuer>"
}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  try {
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      scoreRisque: Math.min(100, Math.max(0, parseInt(parsed.scoreRisque) || 50)),
      analyse: parsed.analyse || '',
      recommandation: parsed.recommandation || '',
    }
  } catch {
    return { scoreRisque: 50, analyse: text, recommandation: '' }
  }
}

// Chat libre avec l'agent
export async function chatAgent(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  contexteDossiers?: string
): Promise<string> {
  const systemPrompt = `Tu es RecouvrIA, un assistant expert en recouvrement amiable de créances en France.
Tu aides les équipes de recouvrement à :
- Analyser des dossiers et évaluer les risques
- Rédiger des courriers de relance (emails, SMS, courriers)
- Recommander des actions adaptées
- Générer des rapports de suivi
- Répondre aux questions sur la réglementation (RGPD, R124-4 CPCE, etc.)

Tu réponds toujours en français, de façon professionnelle et concise.
Tu respectes la législation française sur le recouvrement.
${contexteDossiers ? `\nCONTEXTE ACTUEL DES DOSSIERS :\n${contexteDossiers}` : ''}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: systemPrompt,
    messages,
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}
