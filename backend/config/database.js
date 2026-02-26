import mysql from 'mysql2/promise';
import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_ENCRYPTION_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please check your .env file');
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4'
});

// Encryption utilities for GDPR compliance
export const encrypt = (text) => {
  if (!text) return null;
  try {
    return CryptoJS.AES.encrypt(text, process.env.DB_ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
};

export const decrypt = (ciphertext) => {
  if (!ciphertext) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext.toString(), process.env.DB_ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || null;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

// Test connection with retry logic
const testConnection = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection();
      console.log('✓ Database connected successfully');
      connection.release();
      return;
    } catch (err) {
      console.error(`✗ Database connection attempt ${i + 1} failed:`, err.message);
      if (i === retries - 1) {
        console.error('❌ Could not connect to database after', retries, 'attempts');
        process.exit(1);
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

testConnection();

export default pool;
