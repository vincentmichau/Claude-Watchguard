import express from 'express';
import { body, param } from 'express-validator';
import pool, { encrypt, decrypt } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, checkReportOwnership } from '../middleware/validation.js';

const router = express.Router();

// Get all reports (with filters)
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, siteId, startDate, endDate } = req.query;
    let query = `
      SELECT r.*, s.name as site_name, c.name as client_name, u.email as user_email
      FROM reports r
      JOIN sites s ON r.site_id = s.id
      JOIN clients c ON s.client_id = c.id
      JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'night_watch') {
      query += ' AND r.user_id = ?';
      params.push(req.user.id);
    }

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }

    if (siteId) {
      query += ' AND r.site_id = ?';
      params.push(siteId);
    }

    if (startDate && endDate) {
      query += ' AND r.created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY r.created_at DESC LIMIT 100';

    const [reports] = await pool.execute(query, params);

    const decryptedReports = reports.map(r => ({
      ...r,
      summary: decrypt(r.summary_encrypted)
    }));

    res.json(decryptedReports);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get single report with details
router.get('/:id', authenticate, param('id').isInt(), validate, async (req, res) => {
  try {
    const [reports] = await pool.execute(`
      SELECT r.*, s.name as site_name, s.logo_url as site_logo, 
             c.name as client_name, c.logo_url as client_logo,
             sh.start_time, sh.end_time
      FROM reports r
      JOIN sites s ON r.site_id = s.id
      JOIN clients c ON s.client_id = c.id
      JOIN shifts sh ON r.shift_id = sh.id
      WHERE r.id = ?
    `, [req.params.id]);

    if (reports.length === 0) {
      return res.status(404).json({ error: 'Rapport non trouvé' });
    }

    const report = reports[0];

    if (req.user.role === 'night_watch' && report.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Get events
    const [events] = await pool.execute(
      'SELECT * FROM events WHERE report_id = ? ORDER BY event_time',
      [req.params.id]
    );

    // Get photos
    const [photos] = await pool.execute(
      'SELECT id, file_name, file_size, mime_type, uploaded_at, report_id, event_id FROM photos WHERE report_id = ?',
      [req.params.id]
    );

    res.json({
      ...report,
      summary: decrypt(report.summary_encrypted),
      events: events.map(e => ({
        ...e,
        description: decrypt(e.description_encrypted),
        location: decrypt(e.location_encrypted)
      })),
      photos
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create report
router.post('/',
  authenticate,
  body('shiftId').isInt(),
  body('title').optional().trim(),
  body('summary').optional().trim(),
  validate,
  async (req, res) => {
    try {
      const { shiftId, title, summary } = req.body;

      // Verify shift belongs to user
      const [shifts] = await pool.execute(
        'SELECT * FROM shifts WHERE id = ? AND user_id = ?',
        [shiftId, req.user.id]
      );

      if (shifts.length === 0) {
        return res.status(404).json({ error: 'Shift non trouvé' });
      }

      const shift = shifts[0];

      const [result] = await pool.execute(`
        INSERT INTO reports (shift_id, user_id, site_id, title, summary_encrypted, status)
        VALUES (?, ?, ?, ?, ?, 'draft')
      `, [shiftId, req.user.id, shift.site_id, title || 'Rapport de nuit', encrypt(summary)]);

      res.status(201).json({
        id: result.insertId,
        message: 'Rapport créé avec succès'
      });
    } catch (error) {
      console.error('Create report error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Update report (draft only)
router.put('/:id',
  authenticate,
  param('id').isInt(),
  body('title').optional().trim(),
  body('summary').optional().trim(),
  validate,
  checkReportOwnership,
  async (req, res) => {
    try {
      const { title, summary } = req.body;

      await pool.execute(`
        UPDATE reports 
        SET title = COALESCE(?, title), 
            summary_encrypted = COALESCE(?, summary_encrypted),
            updated_at = NOW()
        WHERE id = ?
      `, [title, summary ? encrypt(summary) : null, req.params.id]);

      res.json({ message: 'Rapport mis à jour' });
    } catch (error) {
      console.error('Update report error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Validate report (make it read-only)
router.post('/:id/validate',
  authenticate,
  param('id').isInt(),
  validate,
  checkReportOwnership,
  async (req, res) => {
    try {
      await pool.execute(`
        UPDATE reports 
        SET status = 'validated', validated_at = NOW()
        WHERE id = ?
      `, [req.params.id]);

      res.json({ message: 'Rapport validé avec succès' });
    } catch (error) {
      console.error('Validate report error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Delete report (draft only)
router.delete('/:id',
  authenticate,
  param('id').isInt(),
  validate,
  checkReportOwnership,
  async (req, res) => {
    try {
      await pool.execute('DELETE FROM reports WHERE id = ?', [req.params.id]);
      res.json({ message: 'Rapport supprimé' });
    } catch (error) {
      console.error('Delete report error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

export default router;
