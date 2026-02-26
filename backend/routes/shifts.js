import express from 'express';
import { body, param } from 'express-validator';
import pool, { encrypt, decrypt } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

// Get shifts (with calendar view)
router.get('/', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, userId, siteId } = req.query;
    
    let query = `
      SELECT s.*, si.name as site_name, u.email as user_email,
             c.name as client_name
      FROM shifts s
      JOIN sites si ON s.site_id = si.id
      JOIN clients c ON si.client_id = c.id
      JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'night_watch') {
      query += ' AND s.user_id = ?';
      params.push(req.user.id);
    } else if (userId) {
      query += ' AND s.user_id = ?';
      params.push(userId);
    }

    if (siteId) {
      query += ' AND s.site_id = ?';
      params.push(siteId);
    }

    if (startDate && endDate) {
      query += ' AND s.start_time >= ? AND s.end_time <= ?';
      params.push(startDate, endDate);
    } else {
      // Default: current month + next 2 months
      const now = new Date();
      const threeMonthsLater = new Date(now.getFullYear(), now.getMonth() + 3, 0);
      query += ' AND s.start_time >= ? AND s.start_time <= ?';
      params.push(now.toISOString(), threeMonthsLater.toISOString());
    }

    query += ' ORDER BY s.start_time';

    const [shifts] = await pool.execute(query, params);

    const decryptedShifts = shifts.map(s => ({
      ...s,
      notes: decrypt(s.notes_encrypted)
    }));

    res.json(decryptedShifts);
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create shift (admin/manager only)
router.post('/',
  authenticate,
  authorize('admin', 'manager'),
  body('userId').isInt(),
  body('siteId').isInt(),
  body('startTime').isISO8601(),
  body('endTime').isISO8601(),
  body('notes').optional().trim(),
  validate,
  async (req, res) => {
    try {
      const { userId, siteId, startTime, endTime, notes } = req.body;

      const [result] = await pool.execute(`
        INSERT INTO shifts (user_id, site_id, start_time, end_time, notes_encrypted, status)
        VALUES (?, ?, ?, ?, ?, 'scheduled')
      `, [userId, siteId, startTime, endTime, encrypt(notes)]);

      res.status(201).json({
        id: result.insertId,
        message: 'Shift créé'
      });
    } catch (error) {
      console.error('Create shift error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Update shift
router.put('/:id',
  authenticate,
  authorize('admin', 'manager'),
  param('id').isInt(),
  body('userId').optional().isInt(),
  body('siteId').optional().isInt(),
  body('startTime').optional().isISO8601(),
  body('endTime').optional().isISO8601(),
  body('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled']),
  body('notes').optional().trim(),
  validate,
  async (req, res) => {
    try {
      const { userId, siteId, startTime, endTime, status, notes } = req.body;

      await pool.execute(`
        UPDATE shifts 
        SET user_id = COALESCE(?, user_id),
            site_id = COALESCE(?, site_id),
            start_time = COALESCE(?, start_time),
            end_time = COALESCE(?, end_time),
            status = COALESCE(?, status),
            notes_encrypted = COALESCE(?, notes_encrypted),
            updated_at = NOW()
        WHERE id = ?
      `, [userId, siteId, startTime, endTime, status, notes ? encrypt(notes) : null, req.params.id]);

      res.json({ message: 'Shift mis à jour' });
    } catch (error) {
      console.error('Update shift error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Delete shift
router.delete('/:id',
  authenticate,
  authorize('admin', 'manager'),
  param('id').isInt(),
  validate,
  async (req, res) => {
    try {
      await pool.execute('DELETE FROM shifts WHERE id = ?', [req.params.id]);
      res.json({ message: 'Shift supprimé' });
    } catch (error) {
      console.error('Delete shift error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Sync with Combo HR API (example)
router.post('/sync-combo',
  authenticate,
  authorize('admin', 'manager'),
  async (req, res) => {
    try {
      // This is a placeholder - actual implementation depends on Combo API docs
      const comboApiUrl = process.env.COMBO_API_URL;
      const comboApiKey = process.env.COMBO_API_KEY;

      // Fetch shifts from Combo
      const response = await fetch(`${comboApiUrl}/schedules`, {
        headers: {
          'Authorization': `Bearer ${comboApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Combo API error');
      }

      const comboShifts = await response.json();

      // Import shifts into database
      let imported = 0;
      for (const shift of comboShifts.data || []) {
        // Map Combo employee to our user (by email or external ID)
        const [users] = await pool.execute(
          'SELECT id FROM users WHERE email = ?',
          [shift.employee.email]
        );

        if (users.length > 0) {
          await pool.execute(`
            INSERT INTO shifts (user_id, site_id, start_time, end_time, external_id, status)
            VALUES (?, ?, ?, ?, ?, 'scheduled')
            ON DUPLICATE KEY UPDATE updated_at = NOW()
          `, [users[0].id, shift.location_id, shift.start_time, shift.end_time, shift.id]);
          
          imported++;
        }
      }

      res.json({ 
        message: `${imported} shifts importés depuis Combo`,
        imported 
      });
    } catch (error) {
      console.error('Combo sync error:', error);
      res.status(500).json({ error: 'Erreur de synchronisation' });
    }
  }
);

// Export shifts to iCal format
router.get('/export/ical', authenticate, async (req, res) => {
  try {
    const { userId } = req.query;
    const targetUserId = userId || req.user.id;

    const [shifts] = await pool.execute(`
      SELECT s.*, si.name as site_name
      FROM shifts s
      JOIN sites si ON s.site_id = si.id
      WHERE s.user_id = ?
      ORDER BY s.start_time
    `, [targetUserId]);

    // Generate iCal format
    let ical = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Night Watch//EN\n';
    
    shifts.forEach(shift => {
      const start = new Date(shift.start_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const end = new Date(shift.end_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      ical += `BEGIN:VEVENT\n`;
      ical += `UID:${shift.id}@nightwatch.com\n`;
      ical += `DTSTART:${start}\n`;
      ical += `DTEND:${end}\n`;
      ical += `SUMMARY:Veille de nuit - ${shift.site_name}\n`;
      ical += `DESCRIPTION:Shift de nuit\n`;
      ical += `STATUS:${shift.status.toUpperCase()}\n`;
      ical += `END:VEVENT\n`;
    });

    ical += 'END:VCALENDAR';

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', 'attachment; filename="shifts.ics"');
    res.send(ical);
  } catch (error) {
    console.error('Export iCal error:', error);
    res.status(500).json({ error: 'Erreur d\'exportation' });
  }
});

export default router;
