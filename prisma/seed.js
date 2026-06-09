// prisma/seed.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Scénarios par défaut
  const scenarioStandard = await prisma.scenario.upsert({
    where: { id: 'scenario-standard' },
    update: {},
    create: {
      id: 'scenario-standard',
      nom: 'Relance Standard',
      description: 'Scénario polyvalent pour créances B2B et B2C',
      actif: true,
      etapes: {
        create: [
          { ordre: 1, jourDeclenchement: 0,  canal: 'EMAIL', sujet: 'Rappel de facture — {REFERENCE}', contenu: 'Bonjour {NOM},\n\nNous vous contactons concernant la facture {REFERENCE} d\'un montant de {MONTANT} € arrivée à échéance le {DATE_ECHEANCE}.\n\nNous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.\n\nCordialement,\n{SOCIETE}', genererAvecIA: false },
          { ordre: 2, jourDeclenchement: 7,  canal: 'SMS',   sujet: null, contenu: 'Rappel : votre solde de {MONTANT}€ (réf. {REFERENCE}) est impayé. Merci de régulariser ou de nous contacter. {SOCIETE}', genererAvecIA: false },
          { ordre: 3, jourDeclenchement: 15, canal: 'EMAIL', sujet: '2ème relance — règlement urgent {REFERENCE}', contenu: 'Bonjour {NOM},\n\nMalgré notre premier rappel, votre solde de {MONTANT} € reste impayé.\n\nNous vous demandons de régulariser cette situation dans les 8 jours.\n\nCordialement,\n{SOCIETE}', genererAvecIA: false },
          { ordre: 4, jourDeclenchement: 30, canal: 'EMAIL', sujet: '3ème relance — {REFERENCE}', contenu: '', genererAvecIA: true },
          { ordre: 5, jourDeclenchement: 45, canal: 'EMAIL', sujet: 'Mise en demeure — {REFERENCE}', contenu: '', genererAvecIA: true },
          { ordre: 6, jourDeclenchement: 60, canal: 'SMS',   sujet: null, contenu: 'Dernier rappel avant procédure : {MONTANT}€ dus (réf. {REFERENCE}). Contactez-nous d\'urgence. {SOCIETE}', genererAvecIA: false },
        ]
      }
    }
  })

  const scenarioDouce = await prisma.scenario.upsert({
    where: { id: 'scenario-douce' },
    update: {},
    create: {
      id: 'scenario-douce',
      nom: 'Relance Douce (particuliers)',
      description: 'Ton bienveillant, délais allongés',
      actif: true,
      etapes: {
        create: [
          { ordre: 1, jourDeclenchement: 0,  canal: 'EMAIL', sujet: 'Votre facture {REFERENCE}', contenu: 'Bonjour {NOM},\n\nNous vous rappelons que la facture {REFERENCE} de {MONTANT} € est arrivée à échéance.\n\nN\'hésitez pas à nous contacter si vous avez des questions.\n\nCordialement,\n{SOCIETE}', genererAvecIA: false },
          { ordre: 2, jourDeclenchement: 14, canal: 'SMS',   sujet: null, contenu: 'Rappel amical : facture {REFERENCE} ({MONTANT}€). Besoin d\'aide ? Appelez-nous. {SOCIETE}', genererAvecIA: false },
          { ordre: 3, jourDeclenchement: 30, canal: 'EMAIL', sujet: 'Suivi règlement — {REFERENCE}', contenu: '', genererAvecIA: true },
          { ordre: 4, jourDeclenchement: 50, canal: 'EMAIL', sujet: 'Dernière relance amiable — {REFERENCE}', contenu: '', genererAvecIA: true },
        ]
      }
    }
  })

  const scenarioRenforcee = await prisma.scenario.upsert({
    where: { id: 'scenario-renforcee' },
    update: {},
    create: {
      id: 'scenario-renforcee',
      nom: 'Procédure Renforcée',
      description: 'Pour créances importantes ou débiteurs récalcitrants',
      actif: true,
      etapes: {
        create: [
          { ordre: 1, jourDeclenchement: 0,  canal: 'EMAIL', sujet: 'Relance urgente — {REFERENCE}', contenu: 'Bonjour {NOM},\n\nVotre dette de {MONTANT} € est impayée depuis {JOURS_RETARD} jours. Nous exigeons un règlement immédiat.\n\n{SOCIETE}', genererAvecIA: false },
          { ordre: 2, jourDeclenchement: 3,  canal: 'SMS',   sujet: null, contenu: 'URGENT : {MONTANT}€ impayés (réf. {REFERENCE}). Contactez-nous sous 48h. {SOCIETE}', genererAvecIA: false },
          { ordre: 3, jourDeclenchement: 7,  canal: 'EMAIL', sujet: '2ème relance ferme — {REFERENCE}', contenu: '', genererAvecIA: true },
          { ordre: 4, jourDeclenchement: 15, canal: 'EMAIL', sujet: 'Mise en demeure — {REFERENCE}', contenu: '', genererAvecIA: true },
          { ordre: 5, jourDeclenchement: 16, canal: 'SMS',   sujet: null, contenu: 'Mise en demeure envoyée pour {MONTANT}€. Réglez sous 8j ou recours judiciaire. {SOCIETE}', genererAvecIA: false },
          { ordre: 6, jourDeclenchement: 30, canal: 'EMAIL', sujet: 'Notification avant recours — {REFERENCE}', contenu: '', genererAvecIA: true },
        ]
      }
    }
  })

  // Dossiers de démonstration
  const dossiers = [
    { reference: 'DOS-2025-0041', debiteurNom: 'Dupont SARL', debiteurEmail: 'contact@dupont.fr', debiteurTel: '0612345678', debiteurType: 'ENTREPRISE', montantInitial: 4200, montantRestant: 4200, dateEcheance: new Date('2025-04-15'), statut: 'EN_COURS', priorite: 'HAUTE', scenarioId: scenarioStandard.id },
    { reference: 'DOS-2025-0039', debiteurNom: 'Martin Pierre', debiteurEmail: 'p.martin@gmail.com', debiteurTel: '0698765432', debiteurType: 'PARTICULIER', montantInitial: 890, montantRestant: 890, dateEcheance: new Date('2025-05-01'), statut: 'PROMESSE_PAIEMENT', priorite: 'NORMALE', scenarioId: scenarioDouce.id },
    { reference: 'DOS-2025-0038', debiteurNom: 'Lefebvre & Cie', debiteurEmail: 'compta@lefebvre.fr', debiteurTel: '0556789012', debiteurType: 'ENTREPRISE', montantInitial: 12750, montantRestant: 12750, dateEcheance: new Date('2025-03-20'), statut: 'LITIGIEUX', priorite: 'URGENTE', scenarioId: scenarioRenforcee.id },
    { reference: 'DOS-2025-0037', debiteurNom: 'Benali Fatima', debiteurEmail: 'f.benali@hotmail.com', debiteurTel: '0634561234', debiteurType: 'PARTICULIER', montantInitial: 340, montantRestant: 0, dateEcheance: new Date('2025-05-10'), statut: 'PAYE', priorite: 'BASSE', scenarioId: scenarioDouce.id },
    { reference: 'DOS-2025-0035', debiteurNom: 'Techno Pro SAS', debiteurEmail: 'daf@technopro.fr', debiteurTel: '0478901234', debiteurType: 'ENTREPRISE', montantInitial: 6400, montantRestant: 6400, dateEcheance: new Date('2025-03-28'), statut: 'EN_COURS', priorite: 'HAUTE', scenarioId: scenarioStandard.id },
  ]

  for (const d of dossiers) {
    await prisma.dossier.upsert({
      where: { reference: d.reference },
      update: {},
      create: d
    })
  }

  // Paramètres par défaut
  const params = [
    { cle: 'SOCIETE_NOM', valeur: 'Mon Entreprise', description: 'Nom affiché dans les courriers' },
    { cle: 'SOCIETE_EMAIL', valeur: 'contact@monentreprise.fr', description: 'Email expéditeur' },
    { cle: 'BREVO_API_KEY', valeur: '', description: 'Clé API Brevo (Sendinblue)' },
    { cle: 'MTARGET_LOGIN', valeur: '', description: 'Login mTarget SMS' },
    { cle: 'MTARGET_PASSWORD', valeur: '', description: 'Mot de passe mTarget SMS' },
    { cle: 'MTARGET_EXPEDITEUR', valeur: 'RECOUVR', description: 'Expéditeur SMS (max 11 car.)' },
    { cle: 'HEURE_ENVOI_EMAIL', valeur: '09:00', description: 'Heure quotidienne d\'envoi des emails' },
    { cle: 'HEURE_ENVOI_SMS', valeur: '10:00', description: 'Heure quotidienne d\'envoi des SMS' },
  ]

  for (const p of params) {
    await prisma.parametre.upsert({
      where: { cle: p.cle },
      update: {},
      create: p
    })
  }

  console.log('✅ Base de données initialisée avec succès')
}

main().catch(console.error).finally(() => prisma.$disconnect())
