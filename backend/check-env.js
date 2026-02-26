#!/usr/bin/env node

import dotenv from 'dotenv';
import { createConnection } from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const checks = [];

// Check 1: Environment variables
console.log('🔍 Vérification des variables d\'environnement...');
const requiredVars = [
  'DB_HOST',
  'DB_USER', 
  'DB_PASSWORD',
  'DB_NAME',
  'DB_ENCRYPTION_KEY',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASSWORD'
];

const missingVars = requiredVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error('❌ Variables manquantes:', missingVars.join(', '));
  checks.push(false);
} else {
  console.log('✅ Toutes les variables sont définies');
  checks.push(true);
}

// Check 2: Encryption key length
console.log('\n🔍 Vérification de la clé de chiffrement...');
if (process.env.DB_ENCRYPTION_KEY && process.env.DB_ENCRYPTION_KEY.length >= 32) {
  console.log('✅ Clé de chiffrement valide');
  checks.push(true);
} else {
  console.error('❌ La clé de chiffrement doit faire au moins 32 caractères');
  checks.push(false);
}

// Check 3: JWT secrets length
console.log('\n🔍 Vérification des secrets JWT...');
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32 &&
    process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length >= 32) {
  console.log('✅ Secrets JWT valides');
  checks.push(true);
} else {
  console.error('❌ Les secrets JWT doivent faire au moins 32 caractères');
  checks.push(false);
}

// Check 4: Database connection
console.log('\n🔍 Test de connexion à la base de données...');
try {
  const connection = await createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  await connection.query('SELECT 1');
  console.log('✅ Connexion à la base de données réussie');
  checks.push(true);
  await connection.end();
} catch (error) {
  console.error('❌ Impossible de se connecter à la base de données:', error.message);
  checks.push(false);
}

// Check 5: Upload directory
console.log('\n🔍 Vérification des répertoires...');
const uploadDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  console.log('📁 Création du répertoire uploads...');
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.mkdirSync(join(uploadDir, 'photos'), { recursive: true });
  fs.mkdirSync(join(uploadDir, 'reports'), { recursive: true });
}
console.log('✅ Répertoires OK');
checks.push(true);

// Summary
console.log('\n' + '='.repeat(50));
const passed = checks.filter(Boolean).length;
const total = checks.length;

if (passed === total) {
  console.log('✅ Tous les tests ont réussi! L\'application est prête.');
  process.exit(0);
} else {
  console.error(`❌ ${total - passed}/${total} tests ont échoué. Veuillez corriger les problèmes ci-dessus.`);
  process.exit(1);
}
