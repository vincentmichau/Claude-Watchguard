#!/bin/bash

echo "🌙 Night Watch - Installation et Démarrage"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé${NC}"
    echo "Installez Node.js 18+ depuis https://nodejs.org"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check MySQL
if ! command -v mysql &> /dev/null; then
    echo -e "${YELLOW}⚠ MySQL n'est pas installé ou pas dans PATH${NC}"
    echo "Assurez-vous que MySQL 8.0+ est installé"
fi

echo ""
echo "📦 Installation des dépendances..."
echo ""

# Backend
echo "Backend..."
cd backend
npm install
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}⚠ Créé .env - Configurez vos paramètres !${NC}"
fi
cd ..

# Frontend
echo "Frontend..."
cd frontend
npm install
if [ ! -f .env ]; then
    echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
    echo "REACT_APP_SOCKET_URL=http://localhost:5000" >> .env
fi
cd ..

echo ""
echo -e "${GREEN}✓ Installation terminée${NC}"
echo ""
echo "📋 Prochaines étapes:"
echo ""
echo "1. Créer la base de données:"
echo "   mysql -u root -p < backend/database/schema.sql"
echo ""
echo "2. Configurer backend/.env avec vos paramètres"
echo ""
echo "3. Démarrer le backend:"
echo "   cd backend && npm run dev"
echo ""
echo "4. Démarrer le frontend (nouveau terminal):"
echo "   cd frontend && npm start"
echo ""
echo "5. Ouvrir http://localhost:3000"
echo ""
echo "🔑 Compte par défaut:"
echo "   Email: admin@nightwatch.com"
echo "   Mot de passe: Admin123!"
echo ""
echo -e "${GREEN}Bon développement ! 🚀${NC}"
