// src/lib/templates.ts
import { format, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'

export interface TemplateVars {
  NOM: string
  REFERENCE: string
  MONTANT: string
  MONTANT_TOTAL: string
  DATE_ECHEANCE: string
  JOURS_RETARD: string
  SOCIETE: string
  EMAIL_SOCIETE: string
  TEL_SOCIETE?: string
  LIEN_PAIEMENT?: string
}

export function buildVars(dossier: any, params: Record<string, string>): TemplateVars {
  const retard = differenceInDays(new Date(), new Date(dossier.dateEcheance))
  const interet = retard > 0 ? dossier.montantRestant * 0.03 * (retard / 365) : 0
  return {
    NOM: dossier.debiteurNom,
    REFERENCE: dossier.reference,
    MONTANT: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(dossier.montantRestant),
    MONTANT_TOTAL: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(dossier.montantRestant + interet),
    DATE_ECHEANCE: format(new Date(dossier.dateEcheance), 'dd/MM/yyyy', { locale: fr }),
    JOURS_RETARD: retard > 0 ? `${retard} jours` : '0 jour',
    SOCIETE: params['SOCIETE_NOM'] || 'Notre société',
    EMAIL_SOCIETE: params['SOCIETE_EMAIL'] || '',
    TEL_SOCIETE: params['SOCIETE_TEL'] || undefined,
  }
}

export function renderTemplate(template: string, vars: TemplateVars): string {
  return Object.entries(vars).reduce((text, [key, value]) => {
    if (value === undefined) return text
    return text.replaceAll(`{${key}}`, value)
  }, template)
}
