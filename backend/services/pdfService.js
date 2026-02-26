import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import pool, { decrypt } from '../config/database.js';

export const generateReportPDF = async (reportId, outputPath) => {
  try {
    // Fetch report with all details
    const [reports] = await pool.execute(`
      SELECT r.*, s.name as site_name, s.logo_url as site_logo,
             c.name as client_name, c.logo_url as client_logo,
             u.email as user_email,
             sh.start_time, sh.end_time
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

    // Fetch events
    const [events] = await pool.execute(
      'SELECT * FROM events WHERE report_id = ? ORDER BY event_time',
      [reportId]
    );

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(outputPath));

    // Header with logos
    let yPos = 50;

    // Try to add client logo
    if (report.client_logo) {
      try {
        // Check if URL is accessible or local path exists
        const isUrl = report.client_logo.startsWith('http');
        if (!isUrl || fs.existsSync(report.client_logo)) {
          doc.image(report.client_logo, 50, yPos, { width: 100, height: 80, fit: [100, 80] });
        }
      } catch (e) {
        console.log('Client logo not available:', e.message);
      }
    }

    // Try to add site logo
    if (report.site_logo) {
      try {
        const isUrl = report.site_logo.startsWith('http');
        if (!isUrl || fs.existsSync(report.site_logo)) {
          doc.image(report.site_logo, 450, yPos, { width: 100, height: 80, fit: [100, 80] });
        }
      } catch (e) {
        console.log('Site logo not available:', e.message);
      }
    }

    yPos += 120;

    // Title
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text('RAPPORT DE VEILLE DE NUIT', 50, yPos, { align: 'center' });

    yPos += 40;

    // Report Info
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Informations générales', 50, yPos);

    yPos += 20;

    doc.fontSize(10)
       .font('Helvetica')
       .text(`Client: ${report.client_name}`, 50, yPos)
       .text(`Site: ${report.site_name}`, 50, yPos + 15)
       .text(`Veilleur: ${report.user_email}`, 50, yPos + 30)
       .text(`Date: ${new Date(report.start_time).toLocaleDateString('fr-FR')}`, 50, yPos + 45)
       .text(`Horaire: ${new Date(report.start_time).toLocaleTimeString('fr-FR')} - ${new Date(report.end_time).toLocaleTimeString('fr-FR')}`, 50, yPos + 60);

    yPos += 100;

    // Summary
    if (report.summary_encrypted) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Résumé', 50, yPos);

      yPos += 20;

      doc.fontSize(10)
         .font('Helvetica')
         .text(decrypt(report.summary_encrypted) || 'Aucun résumé', 50, yPos, {
           width: 500,
           align: 'justify'
         });

      yPos += 80;
    }

    // Events
    if (events.length > 0) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Événements', 50, yPos);

      yPos += 20;

      events.forEach((event, index) => {
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }

        const severityColor = {
          low: '#4CAF50',
          medium: '#FFC107',
          high: '#FF9800',
          critical: '#F44336'
        }[event.severity] || '#999';

        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor(severityColor)
           .text(`${index + 1}. ${event.title}`, 50, yPos);

        yPos += 15;

        doc.fontSize(9)
           .fillColor('#000')
           .font('Helvetica')
           .text(`Type: ${event.type} | Gravité: ${event.severity}`, 70, yPos)
           .text(`Heure: ${new Date(event.event_time).toLocaleString('fr-FR')}`, 70, yPos + 12);

        yPos += 30;

        if (event.description_encrypted) {
          doc.fontSize(10)
             .text(decrypt(event.description_encrypted), 70, yPos, {
               width: 480,
               align: 'justify'
             });

          yPos += 40;
        }

        if (event.location_encrypted) {
          doc.fontSize(9)
             .fillColor('#666')
             .text(`Lieu: ${decrypt(event.location_encrypted)}`, 70, yPos);

          yPos += 20;
        }

        yPos += 10;
      });
    }

    // Footer
    doc.fontSize(8)
       .fillColor('#999')
       .text(
         `Document généré le ${new Date().toLocaleString('fr-FR')} - Confidentiel`,
         50,
         doc.page.height - 50,
         { align: 'center' }
       );

    doc.end();

    return outputPath;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};
