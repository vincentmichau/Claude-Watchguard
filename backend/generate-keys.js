#!/usr/bin/env node

import crypto from 'crypto';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔐 Night Watch - Générateur de clés sécurisées\n');

// Generate keys
const dbEncryptionKey = crypto.randomBytes(16).toString('hex'); // 32 chars
const jwtSecret = crypto.randomBytes(32).toString('hex'); // 64 chars
const jwtRefreshSecret = crypto.randomBytes(32).toString('hex'); // 64 chars

console.log('Clés générées avec succès!\n');
console.log('═'.repeat(60));

console.log('\n📋 Copiez ces valeurs dans votre fichier .env:\n');

console.log('# Encryption key (32 caractères)');
console.log(`DB_ENCRYPTION_KEY=${dbEncryptionKey}`);

console.log('\n# JWT secrets (64 caractères)');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`JWT_REFRESH_SECRET=${jwtRefreshSecret}`);

console.log('\n' + '═'.repeat(60));

// Ask if user wants to update .env file
console.log('\n💾 Voulez-vous mettre à jour automatiquement le fichier .env?');
console.log('⚠️  ATTENTION: Ceci écrasera les valeurs existantes!\n');

import readline from 'readline';
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Continuer? (y/n): ', (answer) => {
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    try {
      const envPath = join(__dirname, '.env');
      let envContent = '';

      // Read existing .env or use example
      if (existsSync(envPath)) {
        envContent = readFileSync(envPath, 'utf8');
        console.log('\n✓ Fichier .env existant trouvé');
      } else if (existsSync(join(__dirname, '.env.example'))) {
        envContent = readFileSync(join(__dirname, '.env.example'), 'utf8');
        console.log('\n✓ Utilisation de .env.example comme base');
      } else {
        console.log('\n❌ Aucun fichier .env ou .env.example trouvé');
        process.exit(1);
      }

      // Update keys
      envContent = envContent.replace(
        /DB_ENCRYPTION_KEY=.*/,
        `DB_ENCRYPTION_KEY=${dbEncryptionKey}`
      );
      
      envContent = envContent.replace(
        /JWT_SECRET=.*/,
        `JWT_SECRET=${jwtSecret}`
      );
      
      envContent = envContent.replace(
        /JWT_REFRESH_SECRET=.*/,
        `JWT_REFRESH_SECRET=${jwtRefreshSecret}`
      );

      // Write to .env
      writeFileSync(envPath, envContent);
      
      console.log('\n✅ Fichier .env mis à jour avec succès!');
      console.log('\n⚠️  N\'oubliez pas de:');
      console.log('   1. Configurer les autres variables (DB, SMTP, etc.)');
      console.log('   2. Ne JAMAIS commiter ce fichier dans Git');
      console.log('   3. Protéger ce fichier: chmod 600 .env\n');

    } catch (error) {
      console.error('\n❌ Erreur lors de la mise à jour:', error.message);
      process.exit(1);
    }
  } else {
    console.log('\n✓ Opération annulée. Copiez manuellement les valeurs ci-dessus.\n');
  }
  
  rl.close();
});

// Security tips
rl.on('close', () => {
  console.log('🔒 Conseils de sécurité:');
  console.log('   • Utilisez des clés différentes pour chaque environnement');
  console.log('   • Ne partagez jamais vos clés');
  console.log('   • Changez les clés régulièrement (recommandé: tous les 6 mois)');
  console.log('   • Stockez les clés dans un gestionnaire de secrets en production\n');
  process.exit(0);
});
