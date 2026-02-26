import express from 'express';
import bcrypt from 'bcryptjs';
import { body, param } from 'express-validator';
import pool, { encrypt, decrypt } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

// ========== USERS ==========

// Get all users
router.get('/users', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, email, role, is_active, created_at, last_login FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create user
router.post('/users',
  authenticate,
  authorize('admin'),
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  body('role').isIn(['admin', 'manager', 'night_watch']),
  body('firstName').optional().trim(),
  body('lastName').optional().trim(),
  validate,
  async (req, res) => {
    try {
      const { email, password, role, firstName, lastName } = req.body;

      const hashedPassword = await bcrypt.hash(password, 10);

      const [result] = await pool.execute(`
        INSERT INTO users (email, password_hash, role, first_name_encrypted, last_name_encrypted)
        VALUES (?, ?, ?, ?, ?)
      `, [email, hashedPassword, role, encrypt(firstName), encrypt(lastName)]);

      res.status(201).json({
        id: result.insertId,
        message: 'Utilisateur créé'
      });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Email déjà utilisé' });
      }
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Update user
router.put('/users/:id',
  authenticate,
  authorize('admin'),
  param('id').isInt(),
  body('role').optional().isIn(['admin', 'manager', 'night_watch']),
  body('isActive').optional().isBoolean(),
  validate,
  async (req, res) => {
    try {
      const { role, isActive } = req.body;

      await pool.execute(`
        UPDATE users 
        SET role = COALESCE(?, role),
            is_active = COALESCE(?, is_active),
            updated_at = NOW()
        WHERE id = ?
      `, [role, isActive, req.params.id]);

      res.json({ message: 'Utilisateur mis à jour' });
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Delete user
router.delete('/users/:id',
  authenticate,
  authorize('admin'),
  param('id').isInt(),
  validate,
  async (req, res) => {
    try {
      await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
      res.json({ message: 'Utilisateur supprimé' });
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ========== CLIENTS ==========

// Get all clients
router.get('/clients', authenticate, async (req, res) => {
  try {
    const [clients] = await pool.execute(
      'SELECT * FROM clients WHERE is_active = true ORDER BY name'
    );
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create client
router.post('/clients',
  authenticate,
  authorize('admin', 'manager'),
  body('name').trim().notEmpty(),
  body('logoUrl').optional().isURL(),
  body('contactEmail').optional().isEmail(),
  validate,
  async (req, res) => {
    try {
      const { name, logoUrl, contactEmail } = req.body;

      const [result] = await pool.execute(`
        INSERT INTO clients (name, logo_url, contact_email)
        VALUES (?, ?, ?)
      `, [name, logoUrl, contactEmail]);

      res.status(201).json({
        id: result.insertId,
        message: 'Client créé'
      });
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Update client
router.put('/clients/:id',
  authenticate,
  authorize('admin', 'manager'),
  param('id').isInt(),
  validate,
  async (req, res) => {
    try {
      const { name, logoUrl, contactEmail } = req.body;

      await pool.execute(`
        UPDATE clients 
        SET name = COALESCE(?, name),
            logo_url = COALESCE(?, logo_url),
            contact_email = COALESCE(?, contact_email),
            updated_at = NOW()
        WHERE id = ?
      `, [name, logoUrl, contactEmail, req.params.id]);

      res.json({ message: 'Client mis à jour' });
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ========== SITES ==========

// Get all sites
router.get('/sites', authenticate, async (req, res) => {
  try {
    const [sites] = await pool.execute(`
      SELECT s.*, c.name as client_name, c.logo_url as client_logo
      FROM sites s
      JOIN clients c ON s.client_id = c.id
      WHERE s.is_active = true
      ORDER BY c.name, s.name
    `);

    const decryptedSites = sites.map(s => ({
      ...s,
      address: decrypt(s.address_encrypted),
      contact_name: decrypt(s.contact_name_encrypted),
      contact_phone: decrypt(s.contact_phone_encrypted)
    }));

    res.json(decryptedSites);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create site
router.post('/sites',
  authenticate,
  authorize('admin', 'manager'),
  body('clientId').isInt(),
  body('name').trim().notEmpty(),
  body('logoUrl').optional().isURL(),
  body('address').optional().trim(),
  validate,
  async (req, res) => {
    try {
      const { clientId, name, logoUrl, address, contactName, contactPhone } = req.body;

      const [result] = await pool.execute(`
        INSERT INTO sites (client_id, name, logo_url, address_encrypted, contact_name_encrypted, contact_phone_encrypted)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [clientId, name, logoUrl, encrypt(address), encrypt(contactName), encrypt(contactPhone)]);

      res.status(201).json({
        id: result.insertId,
        message: 'Site créé'
      });
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Update site
router.put('/sites/:id',
  authenticate,
  authorize('admin', 'manager'),
  param('id').isInt(),
  validate,
  async (req, res) => {
    try {
      const { name, logoUrl, address, contactName, contactPhone } = req.body;

      await pool.execute(`
        UPDATE sites 
        SET name = COALESCE(?, name),
            logo_url = COALESCE(?, logo_url),
            address_encrypted = COALESCE(?, address_encrypted),
            contact_name_encrypted = COALESCE(?, contact_name_encrypted),
            contact_phone_encrypted = COALESCE(?, contact_phone_encrypted),
            updated_at = NOW()
        WHERE id = ?
      `, [
        name, 
        logoUrl, 
        address ? encrypt(address) : null,
        contactName ? encrypt(contactName) : null,
        contactPhone ? encrypt(contactPhone) : null,
        req.params.id
      ]);

      res.json({ message: 'Site mis à jour' });
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ========== EMAIL RECIPIENTS ==========

// Get recipients
router.get('/recipients', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { siteId, clientId } = req.query;
    let query = 'SELECT * FROM email_recipients WHERE is_active = true';
    const params = [];

    if (siteId) {
      query += ' AND site_id = ?';
      params.push(siteId);
    }
    if (clientId) {
      query += ' AND client_id = ?';
      params.push(clientId);
    }

    const [recipients] = await pool.execute(query, params);

    const decrypted = recipients.map(r => ({
      ...r,
      email: decrypt(r.email_encrypted)
    }));

    res.json(decrypted);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Add recipient
router.post('/recipients',
  authenticate,
  authorize('admin', 'manager'),
  body('email').isEmail(),
  body('type').isIn(['primary', 'cc', 'bcc']),
  validate,
  async (req, res) => {
    try {
      const { siteId, clientId, email, name, type } = req.body;

      const [result] = await pool.execute(`
        INSERT INTO email_recipients (site_id, client_id, email_encrypted, name, type)
        VALUES (?, ?, ?, ?, ?)
      `, [siteId || null, clientId || null, encrypt(email), name, type]);

      res.status(201).json({
        id: result.insertId,
        message: 'Destinataire ajouté'
      });
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

export default router;
