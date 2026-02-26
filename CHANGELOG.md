# Changelog - Night Watch

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

## [1.1.0] - 2024-02-11 - OPTIMISATIONS & CORRECTIONS

### 🐛 Corrections de bugs
- **Backend/routes/photos.js**: Correction import `decrypt` mal placé (ligne 185 → ligne 6)
- **Backend/server.js**: Correction parsing `parseInt()` pour rate limiting
- **Backend/config/database.js**: Amélioration gestion d'erreurs encryption/decryption
- **Frontend/App.js**: Ajout `replace` prop aux Navigate pour éviter historique inutile

### ✨ Améliorations

#### Backend
- **database.js**: 
  - Validation des variables d'environnement requises au démarrage
  - Retry logic pour connexion DB (3 tentatives avec délai)
  - Charset UTF-8 explicite pour éviter problèmes d'encodage
  - Meilleure gestion d'erreurs avec logs détaillés

- **pdfService.js**:
  - Vérification existence fichiers logos avant insertion
  - Gestion URLs vs chemins locaux
  - Dimensions contraintes pour images (fit: [100, 80])
  - Logs plus explicites

- **server.js**:
  - Parsing sécurisé des variables d'environnement
  - Prévention NaN dans rate limiting

#### Frontend
- **App.js**:
  - Lazy loading des pages (améliore temps chargement initial)
  - Composant LoadingSpinner centralisé et réutilisable
  - React.Suspense pour chargement asynchrone
  - staleTime: 5 minutes pour React Query (réduit requêtes inutiles)

- **AuthContext.jsx**:
  - useCallback pour optimiser re-renders
  - Fonction `refetchUser` exposée pour mise à jour manuelle
  - Meilleure gestion d'erreurs avec logs
  - Cleanup localStorage plus robuste

### 🆕 Nouveaux fichiers

#### Configuration et outils
- **backend/.gitignore**: Ignore node_modules, .env, uploads, logs
- **frontend/.gitignore**: Ignore build, node_modules, .env.local
- **frontend/postcss.config.js**: Configuration PostCSS pour Tailwind
- **backend/check-env.js**: Script validation environnement (5 checks)
- **deploy.sh**: Script déploiement production automatisé
- **ecosystem.config.json**: Configuration PM2 pour production

#### Documentation
- **TROUBLESHOOTING.md**: Guide dépannage complet (13 problèmes courants)
- **nginx.conf.example**: Configuration nginx complète avec SSL/HTTPS
- **CHANGELOG.md**: Ce fichier

### 🔒 Sécurité
- Validation stricte des variables d'environnement au démarrage
- Prevention injection via sanitization améliorée
- Gestion sécurisée des erreurs de décryptage
- Configuration nginx avec headers de sécurité

### ⚡ Performance
- Lazy loading React pour bundle splitting
- staleTime React Query pour réduire requêtes
- Compression gzip dans nginx.conf
- Cache des assets statiques (1 an)
- PM2 cluster mode pour utilisation multi-cores

### 📝 Documentation
- Guide de dépannage exhaustif
- Configuration nginx production-ready
- Scripts de déploiement automatisés
- Validation environnement avant démarrage

### 🔧 DevOps
- Script check-env.js vérifie :
  - Variables d'environnement
  - Longueur clés encryption/JWT
  - Connexion base de données
  - Existence répertoires uploads
- Script deploy.sh automatise :
  - Build frontend
  - Installation dépendances production
  - Validation environnement
  - Création service systemd (optionnel)
- Configuration PM2 avec :
  - Mode cluster
  - Auto-restart
  - Rotation logs
  - Limite mémoire

---

## [1.0.0] - 2024-02-11 - VERSION INITIALE

### ✨ Fonctionnalités initiales

#### Gestion de rapports
- ✅ CRUD complet (Create, Read, Update, Delete)
- ✅ Multi-sites et multi-clients avec logos
- ✅ Statuts: brouillon, validé, envoyé
- ✅ Historique complet avec filtres

#### Événements
- ✅ Types: incident, observation, maintenance, autre
- ✅ Niveaux de gravité: low, medium, high, critical
- ✅ Horodatage et localisation
- ✅ Attachement aux rapports

#### Photos
- ✅ Upload drag & drop
- ✅ Formats: JPG, PNG, WEBP
- ✅ Limite 5MB par photo
- ✅ Suppression sécurisée

#### PDF & Email
- ✅ Génération PDF avec logos client/site
- ✅ Envoi email automatique avec PJ
- ✅ Destinataires configurables (TO/CC/BCC)
- ✅ Templates professionnels

#### Planning
- ✅ Vue calendrier mensuel
- ✅ Gestion shifts multi-veilleurs
- ✅ Import/Export iCal
- ✅ Intégration API Combo HR

#### Chat temps réel
- ✅ Socket.io
- ✅ Messages encryptés
- ✅ Notifications
- ✅ Indicateurs de saisie

#### Administration
- ✅ Gestion utilisateurs (3 rôles)
- ✅ Gestion sites/clients
- ✅ Configuration destinataires emails
- ✅ Audit logs RGPD

#### Sécurité
- ✅ JWT + refresh tokens
- ✅ Encryption AES-256 base de données
- ✅ Rate limiting (100 req/15min)
- ✅ Helmet.js, CORS, HSTS
- ✅ Sanitization entrées utilisateur
- ✅ Audit logs complets

### 🏗️ Architecture

#### Backend
- Node.js + Express.js
- MySQL 8.0 avec encryption
- Socket.io pour temps réel
- PDFKit pour génération PDF
- Nodemailer pour emails
- bcryptjs pour mots de passe
- JWT pour authentification

#### Frontend
- React 18
- Tailwind CSS
- React Router v6
- React Query (TanStack)
- Socket.io-client
- Axios avec intercepteurs
- React Hook Form

### 📦 Structure
```
night-watch-app/
├── backend/          # API Node.js
│   ├── config/      # Configuration
│   ├── database/    # Schéma SQL
│   ├── middleware/  # Auth, validation
│   ├── routes/      # Routes API
│   └── services/    # PDF, email, chat
├── frontend/        # Application React
│   ├── public/     # Statiques
│   └── src/
│       ├── contexts/
│       ├── hooks/
│       ├── pages/
│       └── services/
└── docs/           # Documentation
```

---

## Format

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

### Types de modifications
- **Added** pour les nouvelles fonctionnalités
- **Changed** pour les changements aux fonctionnalités existantes
- **Deprecated** pour les fonctionnalités bientôt supprimées
- **Removed** pour les fonctionnalités supprimées
- **Fixed** pour les corrections de bugs
- **Security** pour les corrections de vulnérabilités
