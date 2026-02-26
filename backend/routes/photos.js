import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.js';
import pool, { encrypt, decrypt } from '../config/database.js';

const router = express.Router();

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'photos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé. Utilisez JPG, PNG ou WEBP.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 // 5MB default
  }
});

// Upload photo for report or event
router.post('/upload',
  authenticate,
  upload.single('photo'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier fourni' });
      }

      const { reportId, eventId } = req.body;

      if (!reportId && !eventId) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'reportId ou eventId requis' });
      }

      // Check ownership
      if (reportId) {
        const [reports] = await pool.execute(
          'SELECT user_id, status FROM reports WHERE id = ?',
          [reportId]
        );

        if (reports.length === 0) {
          fs.unlinkSync(req.file.path);
          return res.status(404).json({ error: 'Rapport non trouvé' });
        }

        if (reports[0].status === 'validated') {
          fs.unlinkSync(req.file.path);
          return res.status(403).json({ error: 'Rapport validé non modifiable' });
        }

        if (req.user.role === 'night_watch' && reports[0].user_id !== req.user.id) {
          fs.unlinkSync(req.file.path);
          return res.status(403).json({ error: 'Accès refusé' });
        }
      }

      // Save to database
      const [result] = await pool.execute(`
        INSERT INTO photos (report_id, event_id, file_path_encrypted, file_name, file_size, mime_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        reportId || null,
        eventId || null,
        encrypt(req.file.path),
        req.file.originalname,
        req.file.size,
        req.file.mimetype
      ]);

      res.status(201).json({
        id: result.insertId,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        message: 'Photo téléchargée'
      });
    } catch (error) {
      console.error('Upload error:', error);
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: 'Erreur de téléchargement' });
    }
  }
);

// Get photo
router.get('/:id',
  authenticate,
  async (req, res) => {
    try {
      const [photos] = await pool.execute(
        'SELECT * FROM photos WHERE id = ?',
        [req.params.id]
      );

      if (photos.length === 0) {
        return res.status(404).json({ error: 'Photo non trouvée' });
      }

      const photo = photos[0];
      const filePath = decrypt(photo.file_path_encrypted);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Fichier introuvable' });
      }

      res.sendFile(filePath);
    } catch (error) {
      console.error('Get photo error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// Delete photo
router.delete('/:id',
  authenticate,
  async (req, res) => {
    try {
      const [photos] = await pool.execute(`
        SELECT p.*, r.user_id, r.status
        FROM photos p
        LEFT JOIN reports r ON p.report_id = r.id
        WHERE p.id = ?
      `, [req.params.id]);

      if (photos.length === 0) {
        return res.status(404).json({ error: 'Photo non trouvée' });
      }

      const photo = photos[0];

      if (photo.status === 'validated') {
        return res.status(403).json({ error: 'Rapport validé non modifiable' });
      }

      if (req.user.role === 'night_watch' && photo.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Accès refusé' });
      }

      // Delete file
      const filePath = decrypt(photo.file_path_encrypted);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete from database
      await pool.execute('DELETE FROM photos WHERE id = ?', [req.params.id]);

      res.json({ message: 'Photo supprimée' });
    } catch (error) {
      console.error('Delete photo error:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

export default router;
