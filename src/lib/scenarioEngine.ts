// src/lib/scenarioEngine.ts
import { prisma } from './prisma'
import { buildVars, renderTemplate } from './templates'
import { sendEmail, textToHtml } from './brevo'
import { sendSms } from './mtarget'
import { genererCourrier } from './agent'
import { differenceInDays } from 'date-fns'

export interface EngineResult {
  processed: number
  emailsSent: number
  smsSent: number
  errors: string[]
}

// Récupère tous les paramètres en cache
async function getParams(): Promise<Record<string, string>> {
  const all = await prisma.parametre.findMany()
  return Object.fromEntries(all.map(p => [p.cle, p.valeur]))
}

// Traite tous les dossiers actifs et déclenche les étapes dues
export async function runScenarioEngine(): Promise<EngineResult> {
  const result: EngineResult = { processed: 0, emailsSent: 0, smsSent: 0, errors: [] }
  const params = await getParams()

  const dossiers = await prisma.dossier.findMany({
    where: {
      statut: { in: ['EN_COURS', 'PROMESSE_PAIEMENT'] },
      scenarioId: { not: null },
    },
    include: {
      scenario: { include: { etapes: { where: { actif: true }, orderBy: { ordre: 'asc' } } } },
      actions: { orderBy: { date: 'desc' }, take: 20 },
      envois: { orderBy: { dateCreation: 'desc' }, take: 20 },
    },
  })

  for (const dossier of dossiers) {
    if (!dossier.scenario) continue
    result.processed++

    const jourDepuisCreation = differenceInDays(new Date(), dossier.dateCreation)

    for (const etape of dossier.scenario.etapes) {
      // L'étape est due si le nombre de jours depuis la création du dossier >= jourDeclenchement
      if (jourDepuisCreation < etape.jourDeclenchement) continue

      // Vérifier que cette étape n'a pas déjà été exécutée
      const dejaEnvoye = dossier.envois.some(e =>
        e.metadata && (e.metadata as any).etapeId === etape.id
      )
      if (dejaEnvoye) continue

      try {
        const vars = buildVars(dossier, params)
        let contenu = etape.contenu
        let sujet = etape.sujet || ''

        // Génération IA si demandée
        if (etape.genererAvecIA) {
          const historique = dossier.actions.map(a => `${a.type}: ${a.description}`)
          const generated = await genererCourrier(
            {
              reference: dossier.reference,
              debiteurNom: dossier.debiteurNom,
              debiteurType: dossier.debiteurType,
              montantInitial: dossier.montantInitial,
              montantRestant: dossier.montantRestant,
              dateEcheance: dossier.dateEcheance,
              statut: dossier.statut,
              historique,
            },
            { canal: etape.canal, sujet: etape.sujet, ordre: etape.ordre },
            params['SOCIETE_NOM'] || 'Recouvrement'
          )
          contenu = generated.contenu
          sujet = generated.sujet || sujet
        } else {
          contenu = renderTemplate(contenu, vars)
          sujet = renderTemplate(sujet, vars)
        }

        // Envoi selon le canal
        if (etape.canal === 'EMAIL' && dossier.debiteurEmail) {
          const { messageId } = await sendEmail({
            to: dossier.debiteurEmail,
            toName: dossier.debiteurNom,
            subject: sujet,
            htmlContent: textToHtml(contenu),
            fromEmail: params['SOCIETE_EMAIL'],
            fromName: params['SOCIETE_NOM'],
          })

          await prisma.envoi.create({
            data: {
              dossierId: dossier.id,
              canal: 'EMAIL',
              destinataire: dossier.debiteurEmail,
              sujet,
              contenu,
              statut: 'ENVOYE',
              dateEnvoi: new Date(),
              messageId,
              metadata: { etapeId: etape.id, etapeOrdre: etape.ordre },
            },
          })
          result.emailsSent++

        } else if (etape.canal === 'SMS' && dossier.debiteurTel) {
          const smsContenu = contenu.slice(0, 160)
          const { messageId } = await sendSms({
            to: dossier.debiteurTel,
            message: smsContenu,
            campagne: dossier.reference,
          })

          await prisma.envoi.create({
            data: {
              dossierId: dossier.id,
              canal: 'SMS',
              destinataire: dossier.debiteurTel,
              contenu: smsContenu,
              statut: 'ENVOYE',
              dateEnvoi: new Date(),
              messageId,
              metadata: { etapeId: etape.id, etapeOrdre: etape.ordre },
            },
          })
          result.smsSent++
        }

        // Enregistrer l'action
        await prisma.action.create({
          data: {
            dossierId: dossier.id,
            type: etape.canal === 'EMAIL' ? 'EMAIL_ENVOYE' : 'SMS_ENVOYE',
            description: `${etape.canal} étape ${etape.ordre} envoyé (scénario: ${dossier.scenario.nom})`,
            metadata: { etapeId: etape.id, sujet },
          },
        })

      } catch (err: any) {
        result.errors.push(`${dossier.reference} étape ${etape.ordre}: ${err.message}`)
        await prisma.envoi.create({
          data: {
            dossierId: dossier.id,
            canal: etape.canal as any,
            destinataire: etape.canal === 'EMAIL' ? (dossier.debiteurEmail || '') : (dossier.debiteurTel || ''),
            contenu: '',
            statut: 'ERREUR',
            erreur: err.message,
            metadata: { etapeId: etape.id },
          },
        })
      }
    }
  }

  return result
}
