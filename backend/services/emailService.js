import nodemailer from 'nodemailer';
import pool, { decrypt } from '../config/database.js';
import { generateReportPDF } from './pdfService.js';
import path from 'path';
import fs from 'fs';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

export const sendReportEmail = async (reportId) => {
  try {
    // Get report info
    const [reports] = await pool.execute(`
      SELECT r.*, s.name as site_name, c.name as client_name,
             u.email as user_email, sh.start_time, sh.end_time
      FROM reports r
      JOIN sites s ON r.site_id = s.id
      JOIN clients c ON s.client_id = c.id
      JOIN users u ON r.user_id = u.id
      JOIN shifts sh ON r.shift_id = sh.id
      WHERE r.id = ?
    `, [reportId]);

    if (reports.length === 0) {
      throw new Error('Rapport non trouvé');
    }

    const report = reports[0];

    // Get recipients
    const [recipients] = await pool.execute(`
      SELECT email_encrypted, type FROM email_recipients
      WHERE (site_id = ? OR client_id = (SELECT client_id FROM sites WHERE id = ?))
      AND is_active = true
    `, [report.site_id, report.site_id]);

    if (recipients.length === 0) {
      throw new Error('Aucun destinataire configuré');
    }

    // Generate PDF
    const pdfDir = path.join(process.cwd(), 'uploads', 'reports');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const pdfPath = path.join(pdfDir, `report-${reportId}-${Date.now()}.pdf`);
    await generateReportPDF(reportId, pdfPath);

    // Prepare email lists
    const to = recipients
      .filter(r => r.type === 'primary')
      .map(r => decrypt(r.email_encrypted))
      .filter(Boolean);

    const cc = recipients
      .filter(r => r.type === 'cc')
      .map(r => decrypt(r.email_encrypted))
      .filter(Boolean);

    const bcc = recipients
      .filter(r => r.type === 'bcc')
      .map(r => decrypt(r.email_encrypted))
      .filter(Boolean);

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: to.join(', '),
      cc: cc.length > 0 ? cc.join(', ') : undefined,
      bcc: bcc.length > 0 ? bcc.join(', ') : undefined,
      subject: `Rapport de veille - ${report.site_name} - ${new Date(report.start_time).toLocaleDateString('fr-FR')}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Rapport de Veille de Nuit</h2>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Client:</strong> ${report.client_name}</p>
            <p><strong>Site:</strong> ${report.site_name}</p>
            <p><strong>Date:</strong> ${new Date(report.start_time).toLocaleDateString('fr-FR')}</p>
            <p><strong>Horaire:</strong> ${new Date(report.start_time).toLocaleTimeString('fr-FR')} - ${new Date(report.end_time).toLocaleTimeString('fr-FR')}</p>
          </div>

          ${report.summary_encrypted ? `
          <div style="margin: 20px 0;">
            <h3 style="color: #555;">Résumé</h3>
            <p style="line-height: 1.6;">${decrypt(report.summary_encrypted)}</p>
          </div>
          ` : ''}

          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            Veuillez trouver le rapport complet en pièce jointe.<br>
            Ce document est confidentiel et destiné uniquement aux personnes autorisées.
          </p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #999; font-size: 11px; text-align: center;">
            Night Watch Application - ${new Date().getFullYear()}<br>
            Cet email a été généré automatiquement, merci de ne pas y répondre.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `rapport-${report.site_name}-${new Date(report.start_time).toISOString().split('T')[0]}.pdf`,
          path: pdfPath
        }
      ]
    };

    await transporter.sendMail(mailOptions);

    // Update report status
    await pool.execute(`
      UPDATE reports 
      SET status = 'sent', sent_at = NOW(), pdf_url = ?
      WHERE id = ?
    `, [pdfPath, reportId]);

    // Clean up old PDF files (optional)
    // fs.unlinkSync(pdfPath);

    return {
      success: true,
      recipients: to.length + cc.length + bcc.length,
      pdfPath
    };
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
};
