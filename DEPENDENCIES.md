# 📦 Installation des Dépendances - Optimisations v1.2

Guide pour installer les dépendances des nouvelles fonctionnalités.

---

## Backend - Nouvelles dépendances

### Production
```bash
cd backend

# Cache Redis
npm install redis

# Logging structuré
npm install winston

# Export Excel
npm install exceljs

# Date formatting
npm install date-fns
```

### Développement (tests)
```bash
# Framework de tests
npm install --save-dev jest @jest/globals

# Tests API
npm install --save-dev supertest

# Coverage
npm install --save-dev @jest/coverage
```

### Installation complète
```bash
cd backend
npm install redis winston exceljs date-fns --save
npm install jest @jest/globals supertest --save-dev
```

---

## package.json mis à jour

Ajouter ces lignes dans `backend/package.json`:

```json
{
  "name": "night-watch-backend",
  "version": "1.2.0",
  "type": "module",
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js",
    "test": "NODE_ENV=test jest",
    "test:watch": "NODE_ENV=test jest --watch",
    "test:coverage": "NODE_ENV=test jest --coverage"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.5",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "multer": "^1.4.5-lts.1",
    "pdfkit": "^0.13.0",
    "nodemailer": "^6.9.7",
    "socket.io": "^4.6.0",
    "joi": "^17.11.0",
    "crypto-js": "^4.2.0",
    "express-validator": "^7.0.1",
    "redis": "^4.6.11",
    "winston": "^3.11.0",
    "exceljs": "^4.4.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "@jest/globals": "^29.7.0",
    "supertest": "^6.3.3"
  },
  "jest": {
    "testEnvironment": "node",
    "coverageDirectory": "coverage",
    "collectCoverageFrom": [
      "**/*.js",
      "!**/node_modules/**",
      "!**/tests/**",
      "!**/coverage/**"
    ],
    "testMatch": [
      "**/tests/**/*.test.js"
    ]
  }
}
```

---

## Frontend - Aucune nouvelle dépendance

Le frontend n'a pas besoin de nouvelles dépendances pour cette version.

Les optimisations frontend (lazy loading, etc.) utilisent des fonctionnalités React natives.

---

## Docker - Images utilisées

Si vous utilisez Docker, ces images seront automatiquement téléchargées:

```yaml
services:
  mysql:
    image: mysql:8.0              # ~150MB

  redis:
    image: redis:7-alpine         # ~30MB

  backend:
    build: ./backend              # Custom build
    
  frontend:
    build: ./frontend             # Custom build
    base: nginx:alpine            # ~20MB

  nginx:
    image: nginx:alpine           # ~20MB
```

### Pull des images
```bash
docker-compose pull
```

---

## Vérification des installations

### Backend
```bash
cd backend

# Vérifier les dépendances
npm list redis
npm list winston
npm list exceljs
npm list jest

# Vérifier que tout fonctionne
npm test
node check-env.js
```

### Docker
```bash
# Vérifier les images
docker images

# Vérifier les services
docker-compose ps

# Tester Redis
docker-compose exec redis redis-cli ping
# Devrait retourner: PONG
```

---

## Tailles des packages

| Package | Taille | Utilisation |
|---------|--------|-------------|
| redis | ~500KB | Cache serveur |
| winston | ~200KB | Logging structuré |
| exceljs | ~2MB | Export Excel |
| date-fns | ~500KB | Date formatting |
| jest | ~5MB | Tests (dev only) |
| supertest | ~100KB | Tests API (dev only) |

**Total production**: ~3.2MB  
**Total développement**: +5.1MB

---

## Alternatives légères

Si vous voulez réduire la taille:

### Cache
```bash
# Au lieu de Redis, utiliser node-cache (in-memory)
npm install node-cache  # ~50KB
```

### Logging
```bash
# Au lieu de Winston, utiliser Pino (plus léger)
npm install pino pino-pretty  # ~150KB
```

### Excel
```bash
# Au lieu d'ExcelJS, utiliser xlsx (plus simple)
npm install xlsx  # ~1MB
```

---

## Variables d'environnement

Ajouter dans `backend/.env`:

```bash
# Redis (si utilisé)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Logging
LOG_LEVEL=info
# Options: error, warn, info, http, verbose, debug, silly

# Backup
BACKUP_DIR=/var/backups/night-watch
BACKUP_RETENTION_DAYS=30
BACKUP_NOTIFICATION_EMAIL=admin@example.com
BACKUP_REMOTE_PATH=  # Optionnel: s3://bucket/path ou user@server:/path
```

---

## Configuration Redis

### Option 1: Local (développement)
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis

# Vérifier
redis-cli ping
```

### Option 2: Docker (recommandé)
```bash
# Utiliser docker-compose.yml fourni
docker-compose up -d redis

# Vérifier
docker-compose exec redis redis-cli ping
```

### Option 3: Cloud
- **Redis Cloud**: https://redis.com/cloud
- **AWS ElastiCache**: Pour production AWS
- **Azure Cache**: Pour production Azure

Configurer dans `.env`:
```bash
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

---

## Résolution de problèmes

### Redis ne se connecte pas
```bash
# Vérifier que Redis tourne
docker-compose ps redis
# ou
redis-cli ping

# Vérifier les credentials
redis-cli -a your_password ping

# Sans Redis, l'app fonctionne mais sans cache
# Les logs afficheront: "⚠️ Running without cache"
```

### Tests ne fonctionnent pas
```bash
# Réinstaller les dépendances de test
npm install --save-dev jest @jest/globals supertest

# Vérifier la config Jest dans package.json

# Créer .env.test
cp .env .env.test
# Modifier DB_NAME pour utiliser une DB de test
```

### ExcelJS génère des erreurs
```bash
# Vérifier la version
npm list exceljs

# Réinstaller si nécessaire
npm uninstall exceljs
npm install exceljs@latest
```

---

## Ordre d'installation recommandé

### 1. Base (sans nouvelles fonctionnalités)
```bash
cd backend
npm install
cd ../frontend
npm install
```

### 2. Ajouter Redis + Cache
```bash
cd backend
npm install redis
# Tester les routes avec cache
```

### 3. Ajouter Logging
```bash
npm install winston
# Vérifier logs/combined.log
```

### 4. Ajouter Export Excel
```bash
npm install exceljs date-fns
# Tester route /reports/:id/export/excel
```

### 5. Ajouter Tests (développement)
```bash
npm install --save-dev jest @jest/globals supertest
npm test
```

---

## Scripts de vérification

### check-dependencies.sh
```bash
#!/bin/bash

echo "🔍 Vérification des dépendances..."

cd backend

# Production
for pkg in redis winston exceljs date-fns; do
    if npm list $pkg > /dev/null 2>&1; then
        echo "✅ $pkg"
    else
        echo "❌ $pkg - Installer: npm install $pkg"
    fi
done

# Development
for pkg in jest supertest; do
    if npm list $pkg > /dev/null 2>&1; then
        echo "✅ $pkg (dev)"
    else
        echo "⚠️  $pkg (dev) - Installer: npm install --save-dev $pkg"
    fi
done

echo ""
echo "Pour installer tout:"
echo "npm install redis winston exceljs date-fns"
echo "npm install --save-dev jest @jest/globals supertest"
```

---

## Conclusion

**Installation minimale** (sans fonctionnalités avancées):
- Fonctionnement normal garanti
- Pas de cache → performances standards
- Pas de logs structurés → console.log basique
- Pas d'export Excel → seulement PDF

**Installation complète** (recommandé):
- Toutes les fonctionnalités
- Performances optimales avec cache
- Logs professionnels
- Exports multi-formats
- Tests automatisés

**Taille totale ajoutée**: ~3.2MB (production) + 5.1MB (dev)

---

**Support**: Si problèmes d'installation, consultez TROUBLESHOOTING.md
