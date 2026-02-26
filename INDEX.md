# 📚 Index des Fichiers - Night Watch

Guide rapide pour naviguer dans le projet.

---

## 📖 Documentation

| Fichier | Description |
|---------|-------------|
| **README.md** | Documentation principale et guide complet |
| **QUICKSTART.md** | Guide de démarrage rapide en 5 minutes |
| **API_DOCUMENTATION.md** | Référence complète de l'API REST |
| **TROUBLESHOOTING.md** | Guide de dépannage (13 problèmes courants) |
| **CHANGELOG.md** | Historique des versions et modifications |
| **OPTIMIZATIONS.md** | Rapport détaillé des optimisations v1.1.0 |
| **INDEX.md** | Ce fichier - navigation dans le projet |

---

## 🚀 Scripts de démarrage

| Script | Emplacement | Description |
|--------|-------------|-------------|
| **quick-start.sh** | `/` | Installation automatique complète |
| **deploy.sh** | `/` | Déploiement production automatisé |
| **check-env.js** | `backend/` | Validation de l'environnement |
| **generate-keys.js** | `backend/` | Génération clés sécurisées |

### Utilisation
```bash
# Installation développement
./quick-start.sh

# Validation environnement
cd backend && node check-env.js

# Génération clés
cd backend && node generate-keys.js

# Déploiement production
./deploy.sh
```

---

## ⚙️ Configuration

| Fichier | Emplacement | Description |
|---------|-------------|-------------|
| **.env.example** | `backend/` | Variables environnement (développement) |
| **.env.production.example** | `backend/` | Variables environnement (production) |
| **nginx.conf.example** | `/` | Configuration nginx avec SSL/HTTPS |
| **ecosystem.config.json** | `/` | Configuration PM2 pour production |
| **tailwind.config.js** | `frontend/` | Configuration Tailwind CSS |
| **postcss.config.js** | `frontend/` | Configuration PostCSS |

---

## 🗄️ Base de données

| Fichier | Emplacement | Description |
|---------|-------------|-------------|
| **schema.sql** | `backend/database/` | Schéma complet de la base de données |

### Tables principales
- `users` - Utilisateurs (encryptées)
- `clients` - Clients avec logos
- `sites` - Sites avec logos
- `shifts` - Planification des shifts
- `reports` - Rapports de veille
- `events` - Événements (incidents, observations)
- `photos` - Photos uploadées
- `chat_messages` - Messages chat (encryptés)
- `audit_logs` - Logs d'audit (RGPD)

---

## 🔧 Backend (API)

### Structure
```
backend/
├── config/
│   └── database.js          # Config DB + encryption
├── database/
│   └── schema.sql           # Schéma SQL
├── middleware/
│   ├── auth.js              # Authentification JWT
│   └── validation.js        # Validation + sanitization
├── routes/
│   ├── auth.js              # Routes authentification
│   ├── reports.js           # Routes rapports
│   ├── events.js            # Routes événements
│   ├── shifts.js            # Routes planning
│   ├── photos.js            # Routes upload photos
│   ├── pdf.js               # Routes génération PDF
│   └── admin.js             # Routes administration
├── services/
│   ├── pdfService.js        # Génération PDF
│   ├── emailService.js      # Envoi emails
│   └── chatService.js       # Chat temps réel
├── .env.example             # Variables développement
├── .env.production.example  # Variables production
├── .gitignore              # Fichiers ignorés Git
├── package.json            # Dépendances Node.js
├── server.js               # Point d'entrée serveur
├── check-env.js            # Script validation
└── generate-keys.js        # Script génération clés
```

### Routes API principales

**Authentification** (`/api/auth/`)
- POST `/login` - Connexion
- POST `/refresh` - Refresh token
- POST `/logout` - Déconnexion
- GET `/me` - Utilisateur actuel

**Rapports** (`/api/reports/`)
- GET `/` - Liste
- GET `/:id` - Détail
- POST `/` - Créer
- PUT `/:id` - Modifier
- POST `/:id/validate` - Valider
- DELETE `/:id` - Supprimer

**Événements** (`/api/events/`)
- POST `/` - Créer
- PUT `/:id` - Modifier
- DELETE `/:id` - Supprimer
- GET `/report/:reportId` - Par rapport

**Shifts** (`/api/shifts/`)
- GET `/` - Liste
- POST `/` - Créer
- PUT `/:id` - Modifier
- DELETE `/:id` - Supprimer
- POST `/sync-combo` - Sync API RH
- GET `/export/ical` - Export calendrier

**Photos** (`/api/photos/`)
- POST `/upload` - Upload
- GET `/:id` - Télécharger
- DELETE `/:id` - Supprimer

**PDF** (`/api/pdf/`)
- GET `/generate/:reportId` - Générer
- POST `/send/:reportId` - Envoyer email

**Admin** (`/api/admin/`)
- `/users/*` - Gestion utilisateurs
- `/clients/*` - Gestion clients
- `/sites/*` - Gestion sites
- `/recipients/*` - Destinataires emails

---

## 💻 Frontend (React)

### Structure
```
frontend/
├── public/
│   └── index.html           # HTML principal
├── src/
│   ├── contexts/
│   │   └── AuthContext.jsx  # Context authentification
│   ├── hooks/
│   │   └── useChat.js       # Hook chat Socket.io
│   ├── pages/
│   │   ├── Login.jsx        # Page connexion
│   │   ├── Dashboard.jsx    # Layout principal
│   │   ├── ReportsList.jsx  # Liste rapports
│   │   └── ReportEditor.jsx # Éditeur rapports
│   ├── services/
│   │   └── api.js           # Client API Axios
│   ├── App.js               # Application principale
│   ├── index.js             # Point d'entrée
│   └── index.css            # Styles Tailwind
├── .gitignore              # Fichiers ignorés Git
├── package.json            # Dépendances React
├── tailwind.config.js      # Config Tailwind
└── postcss.config.js       # Config PostCSS
```

### Pages principales
- **Login** - Authentification
- **Dashboard** - Layout avec navigation
- **ReportsList** - Liste des rapports avec filtres
- **ReportEditor** - Création/édition rapports
- (À implémenter: Schedule, Chat, Users, Sites, Settings)

### Hooks personnalisés
- `useAuth()` - Gestion authentification
- `useChat()` - Chat temps réel Socket.io

---

## 🔐 Sécurité

### Fichiers de sécurité
- `middleware/auth.js` - JWT + API keys
- `middleware/validation.js` - Sanitization + audit
- `config/database.js` - Encryption AES-256

### Fonctionnalités
- ✅ JWT avec refresh tokens
- ✅ Encryption données sensibles (AES-256)
- ✅ Rate limiting (100 req/15min)
- ✅ Helmet.js (headers sécurité)
- ✅ CORS configuré
- ✅ Sanitization inputs
- ✅ Audit logs RGPD

---

## 📦 Dépendances

### Backend (package.json)
```json
{
  "express": "^4.18.2",
  "mysql2": "^3.6.5",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.2",
  "socket.io": "^4.6.0",
  "pdfkit": "^0.13.0",
  "nodemailer": "^6.9.7",
  "helmet": "^7.1.0",
  "cors": "^2.8.5",
  "multer": "^1.4.5-lts.1",
  "crypto-js": "^4.2.0"
}
```

### Frontend (package.json)
```json
{
  "react": "^18.2.0",
  "react-router-dom": "^6.20.1",
  "axios": "^1.6.2",
  "socket.io-client": "^4.6.0",
  "@tanstack/react-query": "^5.14.2",
  "tailwindcss": "^3.3.6",
  "react-toastify": "^9.1.3",
  "react-dropzone": "^14.2.3"
}
```

---

## 🚀 Commandes utiles

### Développement
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm start
```

### Production
```bash
# Build frontend
cd frontend
npm ci --production=false
npm run build

# Démarrer avec PM2
pm2 start ecosystem.config.json
pm2 logs night-watch
pm2 status
```

### Maintenance
```bash
# Vérifier environnement
cd backend
node check-env.js

# Générer nouvelles clés
node generate-keys.js

# Logs
pm2 logs night-watch --lines 100
tail -f /var/log/nginx/night-watch-error.log
```

---

## 🎯 Prochaines étapes

1. **Installation**: Voir [QUICKSTART.md](QUICKSTART.md)
2. **Configuration**: Éditer `backend/.env`
3. **Validation**: `node backend/check-env.js`
4. **Démarrage**: `./quick-start.sh`
5. **Dépannage**: Voir [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
6. **Production**: Voir [README.md](README.md) section Déploiement

---

## 📞 Support

- 📖 [README.md](README.md) - Documentation complète
- 🚀 [QUICKSTART.md](QUICKSTART.md) - Démarrage rapide
- 🔧 [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Dépannage
- 📋 [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - Référence API
- 📝 [CHANGELOG.md](CHANGELOG.md) - Historique versions
- 📧 support@nightwatch.com

---

**Version**: 1.1.0  
**Dernière mise à jour**: 11 février 2024
