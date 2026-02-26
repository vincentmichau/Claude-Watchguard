import express from 'express';
import { body, param } from 'express-validator';
import pool, { encrypt, decrypt } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

// Create event
router.post('/',
  authenticate,
  body('reportId').isInt(),
  body('type').isIn(['incident', 'observation', 'maintenance', 'other']),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('title').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('location').optional().trim(),
  body('eventTime').isISO8601(),
  validate,
  async (req, res) => {
    try {
      const { reportId, type, severity, title, description, location, eventTime } = req.body;

      // Check report ownership and status
      const [reports] = await pool.execute(
        'SELECT user_id, status FROM reports WHERE id = ?',
        [reportId]
      );

      if (reports.length === 0) {
        return res.status(404).json({ error: 'Rapport non trouvé' });
      }

      if (reports[0].status === 'validated') {
        return res.status(403).json({ error: 'Rapport validé non modifiable' });
      }

      if (req.user.role === 'night_watch' && reports[0].user_id !== req.user.id) {
        return res.status(403).json({ error: 'Accès refusé' });
      }

      const [result] = await pool.execute(`
        INSERT INTO events (report_id, type, severity, title, description_encrypted, location_encrypted, event_time)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [reportId, type, severity || 'low', title, encrypt(description), encrypt(location), eventTime]);

      res.status(201).json({
        id: result.insertId,
        message: 'Événement créé'
      });
    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Update event
router.put('/:id',
  authenticate,
  param('id').isInt(),
  body('type').optional().isIn(['incident', 'observation', 'maintenance', 'other']),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('title').optional().trim(),
  body('description').optional().trim(),
  body('location').optional().trim(),
  body('eventTime').optional().isISO8601(),
  validate,
  async (req, res) => {
    try {
      // Check if event exists and report is modifiable
      const [events] = await pool.execute(`
        SELECT e.*, r.user_id, r.status 
        FROM events e
        JOIN reports r ON e.report_id = r.id
        WHERE e.id = ?
      `, [req.params.id]);

      if (events.length === 0) {
        return res.status(404).json({ error: 'Événement non trouvé' });
      }

      const event = events[0];

      if (event.status === 'validated') {
        return res.status(403).json({ error: 'Rapport validé non modifiable' });
      }

      if (req.user.role === 'night_watch' && event.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Accès refusé' });
      }

      const { type, severity, title, description, location, eventTime } = req.body;

      await pool.execute(`
        UPDATE events 
        SET type = COALESCE(?, type),
            severity = COALESCE(?, severity),
            title = COALESCE(?, title),
            description_encrypted = COALESCE(?, description_encrypted),
            location_encrypted = COALESCE(?, location_encrypted),
            event_time = COALESCE(?, event_time),
            updated_at = NOW()
        WHERE id = ?
      `, [
        type, 
        severity, 
        title, 
        description ? encrypt(description) : null,
        location ? encrypt(location) : null,
        eventTime,
        req.params.id
      ]);

      res.json({ message: 'Événement mis à jour' });
    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Delete event
router.delete('/:id',
  authenticate,
  param('id').isInt(),
  validate,
  async (req, res) => {
    try {
      const [events] = await pool.execute(`
        SELECT e.*, r.user_id, r.status 
        FROM events e
        JOIN reports r ON e.report_id = r.id
        WHERE e.id = ?
      `, [req.params.id]);

      if (events.length === 0) {
        return res.status(404).json({ error: 'Événement non trouvé' });
      }

      const event = events[0];

      if (event.status === 'validated') {
        return res.status(403).json({ error: 'Rapport validé non modifiable' });
      }

      if (req.user.role === 'night_watch' && event.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Accès refusé' });
      }

      await pool.execute('DELETE FROM events WHERE id = ?', [req.params.id]);

      res.json({ message: 'Événement supprimé' });
    } catch (error) {
      console.error('Delete event error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Get events for a report
router.get('/report/:reportId',
  authenticate,
  param('reportId').isInt(),
  validate,
  async (req, res) => {
    try {
      const [events] = await pool.execute(
        'SELECT * FROM events WHERE report_id = ? ORDER BY event_time DESC',
        [req.params.reportId]
      );

      const decryptedEvents = events.map(e => ({
        ...e,
        description: decrypt(e.description_encrypted),
        location: decrypt(e.location_encrypted)
      }));

      res.json(decryptedEvents);
    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

export default router;
