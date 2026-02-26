# 🔧 Guide de Dépannage - Night Watch

## Problèmes Courants et Solutions

### 1. Le backend ne démarre pas

#### Symptôme
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

#### Cause
MySQL n'est pas démarré ou les identifiants sont incorrects.

#### Solution
```bash
# Vérifier que MySQL fonctionne
sudo systemctl status mysql
# ou
sudo service mysql status

# Démarrer MySQL si arrêté
sudo systemctl start mysql

# Tester la connexion
mysql -u root -p -e "SHOW DATABASES;"

# Vérifier les identifiants dans backend/.env
cat backend/.env | grep DB_
```

---

### 2. Erreur "Missing required environment variables"

#### Symptôme
```
❌ Missing required environment variables: DB_ENCRYPTION_KEY, JWT_SECRET
```

#### Solution
```bash
cd backend

# Si .env n'existe pas
cp .env.example .env

# Générer des clés sécurisées
node -e "console.log('DB_ENCRYPTION_KEY=' + require('crypto').randomBytes(16).toString('hex'))"
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Coller ces valeurs dans .env
nano .env
```

---

### 3. Base de données non créée

#### Symptôme
```
Error: Unknown database 'night_watch_db'
```

#### Solution
```bash
# Créer la base de données
mysql -u root -p << EOF
CREATE DATABASE IF NOT EXISTS night_watch_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT
EOF

# Importer le schéma
mysql -u root -p night_watch_db < backend/database/schema.sql

# Vérifier
mysql -u root -p -e "USE night_watch_db; SHOW TABLES;"
```

---

### 4. Erreur CORS

#### Symptôme
```
Access to XMLHttpRequest blocked by CORS policy
```

#### Solution
```bash
# Dans backend/.env, vérifier:
CORS_ORIGIN=http://localhost:3000

# En production, utiliser votre domaine:
CORS_ORIGIN=https://votre-domaine.com

# Redémarrer le backend
cd backend
npm run dev
```

---

### 5. Photos ne s'uploadent pas

#### Symptôme
```
Error: ENOENT: no such file or directory, open 'uploads/photos/...'
```

#### Solution
```bash
# Créer les répertoires nécessaires
cd backend
mkdir -p uploads/photos uploads/reports

# Vérifier les permissions
chmod 755 uploads
chmod 755 uploads/photos
chmod 755 uploads/reports

# Sur Linux, donner les bonnes permissions
sudo chown -R $USER:$USER uploads
```

---

### 6. Emails ne s'envoient pas

#### Symptôme
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

#### Solution Gmail
```bash
# 1. Activer l'authentification à 2 facteurs sur Gmail
# 2. Générer un mot de passe d'application:
#    - Aller sur https://myaccount.google.com/security
#    - Sélectionner "Mots de passe des applications"
#    - Générer un mot de passe pour "Autre"

# 3. Dans backend/.env:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=mot-de-passe-application-16-caracteres
```

#### Solution autre SMTP
```bash
# Vérifier la configuration avec votre fournisseur
# Exemples courants:

# Outlook/Hotmail
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587

# Yahoo
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587

# SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=votre-api-key
```

---

### 7. Frontend ne se connecte pas au backend

#### Symptôme
```
Network Error / timeout of 30000ms exceeded
```

#### Solution
```bash
# Vérifier que le backend fonctionne
curl http://localhost:5000/health
# Devrait retourner: {"status":"healthy",...}

# Vérifier frontend/.env
cat frontend/.env
# Devrait contenir:
# REACT_APP_API_URL=http://localhost:5000/api

# Redémarrer le frontend
cd frontend
npm start
```

---

### 8. Port 3000 ou 5000 déjà utilisé

#### Symptôme
```
Error: listen EADDRINUSE: address already in use :::3000
```

#### Solution
```bash
# Trouver le processus utilisant le port
# Linux/Mac:
lsof -i :3000
lsof -i :5000

# Windows:
netstat -ano | findstr :3000
netstat -ano | findstr :5000

# Tuer le processus
# Linux/Mac:
kill -9 <PID>

# Windows:
taskkill /PID <PID> /F

# Ou changer le port dans .env
# Backend:
PORT=5001

# Frontend:
PORT=3001 npm start
```

---

### 9. Erreur 401 Unauthorized

#### Symptôme
Token invalide ou expiré

#### Solution
```bash
# Déconnexion/reconnexion
# Dans le navigateur:
localStorage.clear()
# Puis se reconnecter

# Si le problème persiste, régénérer les secrets JWT
cd backend
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Mettre à jour JWT_SECRET et JWT_REFRESH_SECRET dans .env
# Redémarrer le backend
```

---

### 10. Chat temps réel ne fonctionne pas

#### Symptôme
Les messages ne s'affichent pas en temps réel

#### Solution
```bash
# Vérifier la connexion WebSocket
# Dans la console du navigateur:
# Vous devriez voir: WebSocket connection established

# Vérifier frontend/.env
REACT_APP_SOCKET_URL=http://localhost:5000

# En production avec nginx, vérifier la config:
location /socket.io {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

---

### 11. PDF non générés

#### Symptôme
```
Error: Failed to load image
```

#### Solution
```bash
# Les logos doivent être accessibles
# Soit des URLs publiques, soit des chemins locaux valides

# Pour tester sans logos:
# Dans la table clients/sites, mettre logo_url à NULL

# Vérifier les permissions du dossier uploads/reports
cd backend
chmod 755 uploads/reports
```

---

### 12. Performance lente

#### Solutions d'optimisation

```bash
# 1. Activer la compression dans nginx (voir nginx.conf.example)

# 2. Augmenter le pool de connexions MySQL
# Dans backend/config/database.js, changer:
connectionLimit: 20  # au lieu de 10

# 3. Utiliser PM2 en mode cluster
pm2 start ecosystem.config.json

# 4. Activer le cache Redis (optionnel)
npm install redis
# Ajouter dans backend/config/cache.js

# 5. Optimiser les requêtes SQL
# Ajouter des index sur les colonnes fréquemment recherchées
```

---

### 13. Erreur de décryptage

#### Symptôme
```
Decryption error: Malformed UTF-8 data
```

#### Cause
La clé DB_ENCRYPTION_KEY a changé

#### Solution
```bash
# ⚠️ ATTENTION: Changer la clé rendra les données existantes illisibles

# Option 1: Restaurer l'ancienne clé
# Remettre l'ancienne DB_ENCRYPTION_KEY dans .env

# Option 2: Réinitialiser la base de données
mysql -u root -p << EOF
DROP DATABASE night_watch_db;
CREATE DATABASE night_watch_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT
EOF
mysql -u root -p night_watch_db < backend/database/schema.sql
```

---

## Outils de débogage

### Vérifier l'environnement complet
```bash
cd backend
node check-env.js
```

### Logs détaillés
```bash
# Backend
cd backend
DEBUG=* npm run dev

# Ou avec PM2
pm2 logs night-watch --lines 100

# Nginx
tail -f /var/log/nginx/night-watch-error.log
```

### Mode debug MySQL
```bash
mysql -u root -p << EOF
USE night_watch_db;
SHOW PROCESSLIST;
SHOW TABLE STATUS;
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
EXIT
EOF
```

---

## Obtenir de l'aide

### Avant de demander de l'aide

1. ✅ Vérifier ce guide de dépannage
2. ✅ Exécuter `backend/check-env.js`
3. ✅ Consulter les logs (backend et nginx)
4. ✅ Tester avec `curl` pour isoler le problème

### Informations à fournir

```bash
# Version Node.js
node -v

# Version MySQL
mysql --version

# Système d'exploitation
uname -a  # Linux/Mac
systeminfo  # Windows

# Logs d'erreur pertinents
# (masquer les informations sensibles comme mots de passe)
```

---

## Réinitialisation complète (dernier recours)

```bash
# ⚠️ ATTENTION: Supprime toutes les données

# 1. Arrêter l'application
pm2 stop night-watch  # ou Ctrl+C

# 2. Supprimer node_modules
rm -rf backend/node_modules frontend/node_modules
rm backend/package-lock.json frontend/package-lock.json

# 3. Supprimer uploads
rm -rf backend/uploads

# 4. Réinitialiser la base de données
mysql -u root -p << EOF
DROP DATABASE IF EXISTS night_watch_db;
CREATE DATABASE night_watch_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT
EOF
mysql -u root -p night_watch_db < backend/database/schema.sql

# 5. Réinstaller
./quick-start.sh

# 6. Redémarrer
cd backend && npm run dev
cd frontend && npm start  # nouveau terminal
```

---

## Support

- 📧 Email: support@nightwatch.com
- 📖 Documentation: README.md
- 🐛 Issues: Créer un ticket avec les détails du problème
