// backend/tests/auth.test.js - Tests authentification

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../server.js';
import { createTestUser, cleanupTestData } from './setup.js';

describe('Authentication API', () => {
  
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@nightwatch.com',
          password: 'Admin123!'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toHaveProperty('email', 'admin@nightwatch.com');
    });

    test('should fail with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@nightwatch.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should fail with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@nightwatch.com'
        });

      expect(response.status).toBe(400);
    });

    test('should apply rate limiting after 5 attempts', async () => {
      const credentials = {
        email: 'admin@nightwatch.com',
        password: 'wrongpassword'
      };

      // Make 6 failed attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(credentials);
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials);

      expect(response.status).toBe(429); // Too Many Requests
    });
  });

  describe('POST /api/auth/refresh', () => {
    test('should refresh token with valid refresh token', async () => {
      // First login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@nightwatch.com',
          password: 'Admin123!'
        });

      const { refreshToken } = loginResponse.body;

      // Refresh token
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    test('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    test('should return user data with valid token', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@nightwatch.com',
          password: 'Admin123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('email', 'admin@nightwatch.com');
      expect(response.body).toHaveProperty('role');
    });

    test('should fail without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });
  });
});
