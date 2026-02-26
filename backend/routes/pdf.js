import express from 'express';
import { param } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { generateReportPDF } from '../services/pdfService.js';
import { sendReportEmail } from '../services/emailService.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Generate PDF
router.get('/generate/:reportId',
  authenticate,
  param('reportId').isInt(),
  validate,
  async (req, res) => {
    try {
      const pdfDir = path.join(process.cwd(), 'uploads', 'reports');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }

      const pdfPath = path.join(pdfDir, `report-${req.params.reportId}-${Date.now()}.pdf`);
      
      await generateReportPDF(req.params.reportId, pdfPath);

      res.download(pdfPath, `rapport-${req.params.reportId}.pdf`, (err) => {
        if (err) {
          console.error('Download error:', err);
        }
        // Optionally delete file after download
        // fs.unlinkSync(pdfPath);
      });
    } catch (error) {
      console.error('Generate PDF error:', error);
      res.status(500).json({ error: 'Erreur de génération PDF' });
    }
  }
);

// Send report by email
router.post('/send/:reportId',
  authenticate,
  param('reportId').isInt(),
  validate,
  async (req, res) => {
    try {
      const result = await sendReportEmail(req.params.reportId);

      res.json({
        message: 'Email envoyé avec succès',
        recipients: result.recipients
      });
    } catch (error) {
      console.error('Send email error:', error);
      res.status(500).json({ error: 'Erreur d\'envoi d\'email' });
    }
  }
);

export default router;
