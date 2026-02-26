#!/bin/bash

echo "🚀 Night Watch - Déploiement Production"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
  echo -e "${RED}⚠️  Ne pas exécuter ce script en tant que root${NC}"
  exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js non installé${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check environment
if [ ! -f backend/.env ]; then
    echo -e "${RED}❌ Fichier backend/.env manquant${NC}"
    echo "Copiez .env.example et configurez-le"
    exit 1
fi

echo -e "${GREEN}✓ Configuration trouvée${NC}"
echo ""

# Build Frontend
echo -e "${BLUE}📦 Build du frontend...${NC}"
cd frontend
npm ci --production=false
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build frontend échoué${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Frontend build OK${NC}"
cd ..

# Install Backend Dependencies
echo ""
echo -e "${BLUE}📦 Installation des dépendances backend...${NC}"
cd backend
npm ci --production

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Installation backend échouée${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Backend dependencies OK${NC}"

# Run environment check
echo ""
echo -e "${BLUE}🔍 Vérification de l'environnement...${NC}"
node check-env.js

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Vérification environnement échouée${NC}"
    exit 1
fi

cd ..

# Create systemd service file (optional)
echo ""
echo -e "${YELLOW}📝 Voulez-vous créer un service systemd? (y/n)${NC}"
read -r create_service

if [ "$create_service" = "y" ]; then
    SERVICE_FILE="/etc/systemd/system/night-watch.service"
    APP_DIR=$(pwd)
    APP_USER=$(whoami)
    
    echo "Création du fichier service..."
    sudo tee $SERVICE_FILE > /dev/null << EOF
[Unit]
Description=Night Watch Application
After=network.target mysql.service

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR/backend
Environment=NODE_ENV=production
ExecStart=$(which node) server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable night-watch
    
    echo -e "${GREEN}✓ Service systemd créé${NC}"
    echo ""
    echo "Commandes utiles:"
    echo "  sudo systemctl start night-watch    # Démarrer"
    echo "  sudo systemctl stop night-watch     # Arrêter"
    echo "  sudo systemctl status night-watch   # Statut"
    echo "  sudo systemctl restart night-watch  # Redémarrer"
    echo "  journalctl -u night-watch -f        # Logs"
fi

echo ""
echo -e "${GREEN}✅ Déploiement terminé avec succès!${NC}"
echo ""
echo "📋 Prochaines étapes:"
echo ""
echo "1. Configurer nginx (voir README.md)"
echo "2. Configurer le certificat SSL"
echo "3. Démarrer l'application:"
if [ "$create_service" = "y" ]; then
    echo "   sudo systemctl start night-watch"
else
    echo "   cd backend && NODE_ENV=production node server.js"
    echo "   Ou installer PM2: npm install -g pm2"
    echo "   pm2 start backend/server.js --name night-watch"
fi
echo ""
echo "4. Le frontend est dans frontend/build/"
echo "   Configurez nginx pour le servir"
echo ""
echo -e "${GREEN}Bonne production! 🎉${NC}"
