// backend/tests/setup.js - Configuration des tests

import dotenv from 'dotenv';
import { beforeAll, afterAll } from '@jest/globals';
import pool from '../config/database.js';

dotenv.config({ path: '.env.test' });

beforeAll(async () => {
  // Setup test database
  console.log('🧪 Setting up test environment...');
});

afterAll(async () => {
  // Cleanup
  await pool.end();
  console.log('✓ Test environment cleaned up');
});

export const createTestUser = async () => {
  const [result] = await pool.execute(
    'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
    ['test@example.com', 'hashedpassword', 'night_watch']
  );
  return result.insertId;
};

export const cleanupTestData = async () => {
  await pool.execute('DELETE FROM users WHERE email LIKE "test%"');
  await pool.execute('DELETE FROM reports WHERE id > 1000');
};
