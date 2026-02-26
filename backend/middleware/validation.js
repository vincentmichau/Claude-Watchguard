import { validationResult } from 'express-validator';
import pool from '../config/database.js';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const auditLog = async (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Log the action
    if (req.user) {
      const action = `${req.method} ${req.path}`;
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];
      
      pool.execute(
        'INSERT INTO audit_logs (user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)',
        [req.user.id, action, ip, userAgent]
      ).catch(err => console.error('Audit log error:', err));
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
        obj[key] = sanitize(obj[key]);
      });
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  next();
};

export const checkReportOwnership = async (req, res, next) => {
  try {
    const reportId = req.params.id || req.body.reportId;
    const [reports] = await pool.execute(
      'SELECT user_id, status FROM reports WHERE id = ?',
      [reportId]
    );

    if (reports.length === 0) {
      return res.status(404).json({ error: 'Rapport non trouvé' });
    }

    const report = reports[0];
    
    if (req.user.role === 'night_watch' && report.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé à ce rapport' });
    }

    if (report.status === 'validated' && req.method !== 'GET') {
      return res.status(403).json({ error: 'Rapport validé non modifiable' });
    }

    req.report = report;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Erreur de vérification' });
  }
};
