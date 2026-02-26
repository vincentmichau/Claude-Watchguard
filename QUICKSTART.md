# 🚀 Démarrage Rapide - Night Watch

## ⚡ Installation en 5 minutes

### 1️⃣ Prérequis
- ✅ Node.js 18+ installé
- ✅ MySQL 8.0+ installé
- ✅ Terminal/Command Line

### 2️⃣ Installation automatique

```bash
# Exécuter le script d'installation
chmod +x quick-start.sh
./quick-start.sh
```

### 3️⃣ Configuration manuelle (si nécessaire)

#### Base de données
```bash
mysql -u root -p
CREATE DATABASE night_watch_db;
exit

mysql -u root -p night_watch_db < backend/database/schema.sql
```

#### Variables d'environnement (backend/.env)
```env
# Éditer ces valeurs
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
DB_NAME=night_watch_db
DB_ENCRYPTION_KEY=generer-une-cle-de-32-caracteres-minimum

JWT_SECRET=generer-une-cle-secrete-minimum-32-chars
JWT_REFRESH_SECRET=autre-cle-secrete-minimum-32-chars

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=mot-de-passe-application
```

### 4️⃣ Démarrage

#### Terminal 1 - Backend
```bash
cd backend
npm install
npm run dev
```
✅ Backend: http://localhost:5000

#### Terminal 2 - Frontend
```bash
cd frontend
npm install
npm start
```
✅ Frontend: http://localhost:3000

### 5️⃣ Première connexion

```
🔑 Compte administrateur par défaut:
Email: admin@nightwatch.com
Mot de passe: Admin123!
```

## 📁 Structure du projet

```
night-watch-app/
├── backend/                 # API Node.js + Express
│   ├── config/             # Configuration DB
│   ├── database/           # Schéma SQL
│   ├── middleware/         # Auth, validation, sécurité
│   ├── routes/             # Routes API
│   ├── services/           # PDF, email, chat
│   └── server.js           # Point d'entrée
│
├── frontend/               # Application React
│   ├── public/            # Fichiers statiques
│   └── src/
│       ├── contexts/      # Context API (Auth)
│       ├── hooks/         # Hooks personnalisés
│       ├── pages/         # Composants pages
│       └── services/      # API client
│
├── README.md              # Documentation complète
├── API_DOCUMENTATION.md   # Documentation API
└── quick-start.sh        # Script d'installation
```

## ✨ Fonctionnalités principales

### 📝 Gestion de rapports
- ✅ Création, modification, suppression
- ✅ Brouillons sauvegardés
- ✅ Validation (lecture seule)
- ✅ Historique complet

### 📅 Planning
- ✅ Vue calendrier mensuel
- ✅ Import/Export iCal
- ✅ Intégration API RH (Combo)

### 📸 Photos
- ✅ Upload multiple (drag & drop)
- ✅ Formats: JPG, PNG, WEBP
- ✅ Max 5MB par photo

### 📄 PDF & Email
- ✅ Génération PDF avec logos
- ✅ Envoi automatique par email
- ✅ Pièces jointes sécurisées

### 💬 Chat temps réel
- ✅ Socket.io
- ✅ Notifications
- ✅ Indicateur de saisie

### 🔐 Sécurité
- ✅ JWT + Refresh tokens
- ✅ Encryption AES (RGPD)
- ✅ Rate limiting
- ✅ Audit logs
- ✅ HTTPS ready

## 🎯 Premiers pas

### 1. Créer un site
1. Connexion en tant qu'admin
2. Menu "Sites & Clients"
3. Créer un nouveau client
4. Créer un nouveau site

### 2. Créer un utilisateur
1. Menu "Utilisateurs"
2. Ajouter un veilleur de nuit
3. Définir email et mot de passe

### 3. Planifier un shift
1. Menu "Planning"
2. Cliquer sur une date
3. Assigner un veilleur et un site

### 4. Créer un rapport
1. Menu "Rapports"
2. Nouveau rapport
3. Sélectionner le shift
4. Ajouter événements et photos
5. Valider

### 5. Envoyer par email
1. Configurer les destinataires (Admin > Sites)
2. Ouvrir le rapport validé
3. Cliquer "Envoyer"

## 🔧 Résolution de problèmes

### Backend ne démarre pas
```bash
# Vérifier MySQL
mysql -u root -p -e "SHOW DATABASES;"

# Vérifier les dépendances
cd backend && npm install

# Vérifier .env
cat backend/.env
```

### Frontend ne démarre pas
```bash
# Nettoyer cache
cd frontend
rm -rf node_modules package-lock.json
npm install

# Vérifier port 3000 libre
lsof -i :3000
```

### Erreur de connexion
- Vérifier que le backend tourne (port 5000)
- Vérifier CORS dans backend/.env
- Vérifier frontend/.env (API_URL)

### Photos ne s'uploadent pas
- Vérifier MAX_FILE_SIZE dans backend/.env
- Vérifier permissions dossier uploads/
- Format accepté: JPG, PNG, WEBP uniquement

### Emails non envoyés
- Configurer SMTP dans backend/.env
- Utiliser mot de passe d'application (Gmail)
- Vérifier pare-feu port 587

## 📚 Documentation

- **README complet**: `README.md`
- **Documentation API**: `API_DOCUMENTATION.md`
- **Support**: support@nightwatch.com

## 🚀 Déploiement production

Voir `README.md` section "Déploiement Production" pour:
- Configuration nginx
- SSL/HTTPS
- PM2 process manager
- Sauvegardes base de données
- Variables d'environnement production

## ⚠️ Important

### Sécurité
- ✅ Changer les secrets JWT en production
- ✅ Utiliser des clés encryption aléatoires
- ✅ Activer HTTPS
- ✅ Configurer pare-feu
- ✅ Sauvegardes régulières

### RGPD
- ✅ Toutes les données sensibles sont encryptées
- ✅ Audit logs activés
- ✅ Consentement utilisateur requis
- ✅ Droit à l'oubli implémenté

## 💡 Astuces

### Génération de clés sécurisées
```bash
# JWT Secret (32+ caractères)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption Key (exactement 32 caractères)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### Compte de test
```javascript
// Créer un utilisateur de test via API
POST /api/admin/users
{
  "email": "test@example.com",
  "password": "Test123!",
  "role": "night_watch"
}
```

### Import depuis Combo
```bash
# Synchroniser les shifts depuis Combo
curl -X POST http://localhost:5000/api/shifts/sync-combo \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🎉 Vous êtes prêt !

L'application est maintenant opérationnelle.

**Prochaines étapes recommandées:**
1. Personnaliser les logos clients/sites
2. Configurer les destinataires d'emails
3. Importer le planning depuis votre système RH
4. Former les utilisateurs

**Besoin d'aide ?**
- 📖 Consultez README.md
- 📧 Contact: support@nightwatch.com
- 🐛 Problème ? Créez une issue

Bon reporting ! 🌙
