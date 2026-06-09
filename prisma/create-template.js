// Ce script génère un fichier Excel modèle pour l'import
// Lancer avec : node prisma/create-template.js
const XLSX = require('xlsx')

const headers = [
  'NOM_DEBITEUR',
  'EMAIL',
  'TELEPHONE',
  'MONTANT_DU',
  'DATE_ECHEANCE',
  'REFERENCE',
  'TYPE',
  'ADRESSE',
  'NOTES',
]

const exemples = [
  ['Dupont SARL', 'contact@dupont.fr', '0612345678', 4200, '15/04/2025', 'FAC-2025-001', 'ENTREPRISE', '12 rue de la Paix, 75001 Paris', ''],
  ['Martin Pierre', 'p.martin@gmail.com', '0698765432', 890, '01/05/2025', 'FAC-2025-002', 'PARTICULIER', '5 avenue Victor Hugo, 31000 Toulouse', ''],
  ['Lefebvre & Cie', 'compta@lefebvre.fr', '0556789012', 12750, '20/03/2025', 'FAC-2025-003', 'ENTREPRISE', '', 'Dossier sensible'],
]

const wb = XLSX.utils.book_new()
const ws = XLSX.utils.aoa_to_sheet([headers, ...exemples])

// Largeurs des colonnes
ws['!cols'] = [
  { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 12 },
  { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 35 }, { wch: 25 },
]

XLSX.utils.book_append_sheet(wb, ws, 'Dossiers')
XLSX.writeFile(wb, 'template_import_recouvria.xlsx')
console.log('✅ Fichier template_import_recouvria.xlsx créé')
