import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const [users] = await pool.execute(
      'SELECT id, email, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0 || !users[0].is_active) {
      return res.status(401).json({ error: 'Utilisateur non autorisé' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré' });
    }
    return res.status(401).json({ error: 'Token invalide' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    next();
  };
};

export const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key manquante' });
    }

    const [keys] = await pool.execute(
      'SELECT * FROM api_keys WHERE key_hash = ? AND is_active = true',
      [apiKey]
    );

    if (keys.length === 0) {
      return res.status(401).json({ error: 'API key invalide' });
    }

    const key = keys[0];
    
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return res.status(401).json({ error: 'API key expirée' });
    }

    await pool.execute(
      'UPDATE api_keys SET last_used = NOW() WHERE id = ?',
      [key.id]
    );

    req.apiKey = key;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Erreur d\'authentification API' });
  }
};
