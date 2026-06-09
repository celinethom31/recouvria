# RecouvrIA — Guide d'installation et de déploiement

## Vue d'ensemble

RecouvrIA est une application Next.js 14 (React + Node.js) avec :
- **Base de données** : PostgreSQL via Prisma ORM
- **Emails** : Brevo (Sendinblue)
- **SMS** : mTarget
- **IA** : Claude (Anthropic)
- **Import** : fichiers Excel (.xlsx / .csv)

---

## 1. Prérequis

- Node.js 18+ installé sur votre machine
- Une base de données PostgreSQL (voir options ci-dessous)
- Vos clés API (Brevo, mTarget, Anthropic)

### Options base de données

**Option A — Supabase (recommandé, gratuit)**
1. Créer un compte sur https://supabase.com
2. Nouveau projet > noter l'URL de connexion dans "Settings > Database"
3. Utiliser l'URL dans `DATABASE_URL`

**Option B — o2switch (si hébergement mutualisé)**
- o2switch ne supporte pas PostgreSQL nativement
- Utiliser Supabase (plan gratuit 500 MB) + déployer l'app sur Vercel
- Ou louer un VPS OVH (2€/mois) pour avoir PostgreSQL local

**Option C — Localhost (développement)**
```bash
# Installer PostgreSQL
# macOS : brew install postgresql
# Ubuntu : sudo apt install postgresql
createdb recouvria
```

---

## 2. Installation

```bash
# Cloner / copier le projet
cd recouvria

# Installer les dépendances
npm install

# Copier et configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec vos vraies valeurs

# Initialiser la base de données
npm run db:push

# Charger les données de démonstration
npm run db:seed

# Démarrer en développement
npm run dev
```

L'application est accessible sur **http://localhost:3000**

---

## 3. Configuration des services

### 3.1 Brevo (emails)

1. Connectez-vous sur https://app.brevo.com
2. Paramètres → Clés API → Créer une clé
3. Copiez la clé dans `BREVO_API_KEY`
4. **Important** : vérifiez votre domaine expéditeur dans Brevo (Expéditeurs et domaines)
   - Ajouter votre domaine (ex: monentreprise.fr)
   - Valider les enregistrements SPF et DKIM dans votre DNS

### 3.2 mTarget (SMS)

1. Connectez-vous sur https://www.mtarget.fr
2. Récupérez vos identifiants de connexion API
3. Renseignez `MTARGET_LOGIN` et `MTARGET_PASSWORD`
4. `MTARGET_EXPEDITEUR` : 11 caractères max (ex: "RECOUVR", "CFDEBIT", etc.)
5. Vérifiez que votre compte dispose de crédits SMS

### 3.3 Anthropic (IA)

1. Créer un compte sur https://console.anthropic.com
2. API Keys → Create Key
3. Copiez dans `ANTHROPIC_API_KEY`
4. Facturation à l'usage (environ 0,003€ par courrier généré)

---

## 4. Déploiement en production

### Option A — Vercel (le plus simple, recommandé)

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel

# Configurer les variables d'environnement
# Vercel Dashboard > Projet > Settings > Environment Variables
# Ajouter toutes les variables de .env.example
```

**Configurer le cron Vercel** (vercel.json) :
```json
{
  "crons": [
    {
      "path": "/api/cron?secret=VOTRE_CRON_SECRET",
      "schedule": "0 8 * * *"
    }
  ]
}
```
Cela déclenche le moteur de scénarios chaque jour à 8h.

### Option B — o2switch (hébergement mutualisé)

o2switch ne supporte pas Node.js en production.
**Solution** : utiliser Vercel pour l'app + Supabase pour la BDD.
Les deux sont gratuits pour ce volume d'usage.

### Option C — VPS (contrôle total)

```bash
# Sur votre VPS Ubuntu
sudo apt update && sudo apt install -y nodejs npm postgresql nginx

# Cloner le projet
git clone ... && cd recouvria
npm install && npm run build

# PM2 pour garder l'app en vie
npm install -g pm2
pm2 start npm --name "recouvria" -- start
pm2 save && pm2 startup

# Nginx reverse proxy
# /etc/nginx/sites-available/recouvria
server {
    listen 80;
    server_name recouvria.mondomaine.fr;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}

# Cron système (déclenche le moteur à 8h chaque jour)
crontab -e
# Ajouter :
# 0 8 * * * curl -s "https://recouvria.mondomaine.fr/api/cron?secret=VOTRE_SECRET"
```

---

## 5. Structure du projet

```
recouvria/
├── prisma/
│   ├── schema.prisma       ← Modèles de données
│   └── seed.js             ← Données initiales
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── dossiers/   ← CRUD dossiers
│   │   │   ├── scenarios/  ← CRUD scénarios
│   │   │   ├── envois/     ← Envois email/SMS
│   │   │   ├── import/     ← Import Excel
│   │   │   ├── agent/      ← Agent IA
│   │   │   ├── dashboard/  ← Statistiques
│   │   │   └── cron/       ← Moteur automatique
│   │   └── (pages Next.js à créer)
│   └── lib/
│       ├── prisma.ts       ← Client base de données
│       ├── brevo.ts        ← Service email
│       ├── mtarget.ts      ← Service SMS
│       ├── agent.ts        ← Agent IA Claude
│       ├── templates.ts    ← Moteur de templates
│       ├── scenarioEngine.ts ← Moteur de scénarios
│       └── importExcel.ts  ← Import fichiers Excel
```

---

## 6. Import Excel — format attendu

Votre fichier Excel doit contenir les colonnes suivantes (noms libres, vous ferez le mapping à l'import) :

| Donnée | Obligatoire | Exemples |
|--------|-------------|---------|
| Nom du débiteur | ✅ | "Dupont SARL", "Martin Pierre" |
| Montant dû (€) | ✅ | 4200, 1500.50 |
| Date d'échéance | ✅ | 15/04/2025, 2025-04-15 |
| Email | recommandé | contact@dupont.fr |
| Téléphone | recommandé | 0612345678 |
| Référence | optionnel | FAC-2025-001 |
| Type (particulier/entreprise) | optionnel | ENTREPRISE |
| Adresse | optionnel | 12 rue de la Paix, 75001 Paris |
| Notes | optionnel | texte libre |

---

## 7. Conformité légale

L'application respecte les règles du recouvrement amiable en France :
- **R124-4 CPCE** : pas de menaces, identification claire du créancier
- **RGPD** : les données débiteurs ne doivent pas être conservées au-delà de 5 ans après clôture
- **Heures d'envoi** : SMS configurés pour 10h-18h (modifier dans les paramètres)
- **Opt-out** : prévoir un lien de désabonnement dans les emails (configurable dans Brevo)

---

## 8. Sécurité

- Changez `CRON_SECRET` et `NEXTAUTH_SECRET` par des valeurs aléatoires fortes
- Générer : `openssl rand -hex 32`
- Ne committez jamais `.env.local` sur Git (il est dans `.gitignore`)
- Activez HTTPS en production (Vercel le fait automatiquement)

---

## 9. Support

Pour toute question sur le code ou la configuration, contactez votre développeur ou consultez :
- Documentation Next.js : https://nextjs.org/docs
- Documentation Prisma : https://www.prisma.io/docs
- Documentation Brevo API : https://developers.brevo.com
- Documentation mTarget : https://www.mtarget.fr/api-sms
