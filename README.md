# 🌙 Night Watch - Application de Reporting pour Veilleurs de Nuit

Application complète de gestion de reporting pour veilleurs de nuit avec authentification sécurisée, gestion multi-sites, génération de PDF et chat temps réel.

## 🚀 Fonctionnalités

### ✅ Gestion des Rapports
- Création, modification, suppression de rapports
- Brouillons modifiables
- Validation (rend le rapport non-modifiable)
- Historique complet

### 📅 Planning
- Visualisation calendrier mensuel
- Import/Export iCal
- Intégration API RH (Combo)
- Multi-sites

### 📸 Gestion des Photos
- Upload multiple
- Drag & drop
- Formats: JPG, PNG, WEBP
- Limite: 5MB par photo

### 📄 Génération PDF
- PDF professionnel avec logos
- Envoi automatique par email
- Pièces jointes sécurisées

### 💬 Chat Temps Réel
- Socket.io
- Notifications
- Indicateur de saisie

### 🔐 Sécurité
- JWT avec refresh tokens
- Encryption base de données (AES)
- Rate limiting
- RGPD compliant
- Audit logs
- HTTPS ready

### 👥 Multi-rôles
- Admin: gestion complète
- Manager: gestion sites/utilisateurs
- Night Watch: rapports uniquement

## 📋 Prérequis

- Node.js 18+ 
- MySQL 8.0+
- npm ou yarn
- (Optionnel) PM2 pour production
- (Optionnel) nginx pour reverse proxy

## 🛠️ Installation

### 1. Base de données

```bash
# Créer la base de données
mysql -u root -p < backend/database/schema.sql

# Vérifier
mysql -u root -p -e "SHOW DATABASES;"
```

### 2. Backend

```bash
cd backend

# Installer les dépendances
npm install

# Configuration
cp .env.example .env

# Éditer .env avec vos paramètres:
# - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
# - JWT_SECRET (générer une clé sécurisée)
# - DB_ENCRYPTION_KEY (32 caractères minimum)
# - SMTP_* (configuration email)

# Démarrer le serveur
npm run dev
```

Le backend démarre sur http://localhost:5000

## 🔍 Scripts Utiles

### Validation de l'environnement
```bash
cd backend
node check-env.js
```
Ce script vérifie :
- Variables d'environnement requises
- Longueur des clés de sécurité
- Connexion à la base de données
- Existence des répertoires uploads

### Déploiement production
```bash
chmod +x deploy.sh
./deploy.sh
```
Script automatique qui :
- Build le frontend
- Installe les dépendances
- Valide l'environnement
- Configure systemd (optionnel)

### Démarrage avec PM2
```bash
# Installation PM2
npm install -g pm2

# Démarrer l'application
pm2 start ecosystem.config.json

# Commandes utiles
pm2 status              # Voir le statut
pm2 logs night-watch    # Voir les logs
pm2 restart night-watch # Redémarrer
pm2 stop night-watch    # Arrêter
```

### 3. Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Créer .env
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
echo "REACT_APP_SOCKET_URL=http://localhost:5000" >> .env

# Démarrer l'application
npm start
```

Le frontend démarre sur http://localhost:3000

## 🔑 Compte par défaut

```
Email: admin@nightwatch.com
Mot de passe: Admin123!
```

## 📁 Structure du Projet

```
night-watch-app/
├── backend/
│   ├── config/         # Configuration DB
│   ├── middleware/     # Auth, validation, security
│   ├── routes/         # API routes
│   ├── services/       # PDF, email, chat
│   ├── database/       # SQL schema
│   └── server.js       # Point d'entrée
│
└── frontend/
    ├── src/
    │   ├── contexts/   # Auth context
    │   ├── hooks/      # Custom hooks (chat)
    │   ├── pages/      # Composants pages
    │   ├── services/   # API client
    │   └── App.js      # Application principale
    └── package.json
```

## 🔗 API Endpoints

### Authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/me` - Utilisateur actuel

### Rapports
- `GET /api/reports` - Liste rapports
- `GET /api/reports/:id` - Détail rapport
- `POST /api/reports` - Créer rapport
- `PUT /api/reports/:id` - Modifier rapport
- `POST /api/reports/:id/validate` - Valider rapport
- `DELETE /api/reports/:id` - Supprimer rapport

### Événements
- `POST /api/events` - Créer événement
- `PUT /api/events/:id` - Modifier événement
- `DELETE /api/events/:id` - Supprimer événement
- `GET /api/events/report/:reportId` - Événements d'un rapport

### Shifts
- `GET /api/shifts` - Liste shifts
- `POST /api/shifts` - Créer shift
- `PUT /api/shifts/:id` - Modifier shift
- `DELETE /api/shifts/:id` - Supprimer shift
- `POST /api/shifts/sync-combo` - Sync avec Combo
- `GET /api/shifts/export/ical` - Export iCal

### Photos
- `POST /api/photos/upload` - Upload photo
- `GET /api/photos/:id` - Télécharger photo
- `DELETE /api/photos/:id` - Supprimer photo

### PDF
- `GET /api/pdf/generate/:reportId` - Générer PDF
- `POST /api/pdf/send/:reportId` - Envoyer email

### Admin
- Utilisateurs: `/api/admin/users/*`
- Clients: `/api/admin/clients/*`
- Sites: `/api/admin/sites/*`
- Destinataires: `/api/admin/recipients/*`

## 🔒 Sécurité

### Encryption
- Toutes les données sensibles sont encryptées (AES-256)
- Mots de passe hashés (bcrypt)
- Tokens JWT sécurisés

### Rate Limiting
- 100 requêtes / 15 min (général)
- 5 tentatives de connexion / 15 min

### Headers de sécurité
- Helmet.js
- CORS configuré
- HSTS activé

### RGPD
- Audit logs complets
- Encryption at rest
- Droit à l'oubli
- Consentement utilisateur

## 🚀 Déploiement Production

### 1. Variables d'environnement

```bash
# Backend
NODE_ENV=production
DB_ENCRYPTION_KEY=<32-char-key>
JWT_SECRET=<secure-key>
CORS_ORIGIN=https://votre-domaine.com

# Frontend
REACT_APP_API_URL=https://api.votre-domaine.com
```

### 2. Build Frontend

```bash
cd frontend
npm run build
# Servir le dossier build/ avec nginx ou serveur statique
```

### 3. Serveur Backend

```bash
cd backend
npm start
# Utiliser PM2 pour la production:
pm2 start server.js --name night-watch
```

### 4. Base de données

- Activer SSL pour MySQL
- Sauvegardes automatiques
- Réplication recommandée

### 5. Reverse Proxy (nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name votre-domaine.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        root /path/to/frontend/build;
        try_files $uri /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 📊 Intégration HR (Combo)

```javascript
// Configuration dans .env
COMBO_API_KEY=your-api-key
COMBO_API_URL=https://api.combo.com/v1

// Synchronisation
POST /api/shifts/sync-combo
```

## 🔧 Développement

### Ajouter une nouvelle route

1. Backend: créer route dans `backend/routes/`
2. Ajouter middleware auth si nécessaire
3. Frontend: ajouter fonction dans `services/api.js`
4. Créer hook React Query si besoin

### Contribuer

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amazing`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing`)
5. Ouvrir une Pull Request

## 📝 License

Propriétaire - Tous droits réservés

## 👤 Support

Pour toute question ou problème:
- 📖 Documentation complète: README.md
- 🔧 Guide de dépannage: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- 📋 Documentation API: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- 📝 Changelog: [CHANGELOG.md](CHANGELOG.md)
- 📧 Email: support@nightwatch.com

---

**Note**: Cette application gère des données sensibles. Assurez-vous de suivre les meilleures pratiques de sécurité en production.
