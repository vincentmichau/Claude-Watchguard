import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import pool from '../config/database.js';
import { validate } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
  
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN
  });
  
  return { accessToken, refreshToken };
};

// Login
router.post('/login',
  body('email').isEmail(),
  body('password').notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const [users] = await pool.execute(
        'SELECT * FROM users WHERE email = ? AND is_active = true',
        [email]
      );

      if (users.length === 0) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      const user = users[0];
      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      const { accessToken, refreshToken } = generateTokens(user.id);

      // Store refresh token
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await pool.execute(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, refreshToken, expiresAt]
      );

      // Update last login
      await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Refresh token
router.post('/refresh',
  body('refreshToken').notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { refreshToken } = req.body;

      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      const [tokens] = await pool.execute(
        'SELECT * FROM refresh_tokens WHERE token = ? AND user_id = ? AND expires_at > NOW()',
        [refreshToken, decoded.userId]
      );

      if (tokens.length === 0) {
        return res.status(401).json({ error: 'Refresh token invalide' });
      }

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);

      // Delete old and insert new refresh token
      await pool.execute('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
      
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await pool.execute(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [decoded.userId, newRefreshToken, expiresAt]
      );

      res.json({ accessToken, refreshToken: newRefreshToken });
    } catch (error) {
      res.status(401).json({ error: 'Token invalide' });
    }
  }
);

// Logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await pool.execute('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
    }

    res.json({ message: 'Déconnexion réussie' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, email, role, created_at, last_login FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
