// backend/services/excelService.js - Excel export service

import ExcelJS from 'exceljs';
import pool, { decrypt } from '../config/database.js';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Generate Excel report with multiple sheets
 * @param {Number} reportId - Report ID
 * @param {String} outputPath - Output file path
 * @returns {String} - Path to generated file
 */
export const generateReportExcel = async (reportId, outputPath) => {
  try {
    // Fetch report with all details
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

    // Fetch events
    const [events] = await pool.execute(
      'SELECT * FROM events WHERE report_id = ? ORDER BY event_time',
      [reportId]
    );

    // Fetch photos
    const [photos] = await pool.execute(
      'SELECT id, file_name, file_size, uploaded_at FROM photos WHERE report_id = ?',
      [reportId]
    );

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Night Watch';
    workbook.created = new Date();

    // === SHEET 1: Summary ===
    const summarySheet = workbook.addWorksheet('Résumé', {
      properties: { tabColor: { argb: 'FF0EA5E9' } }
    });

    // Header styling
    summarySheet.getRow(1).font = { bold: true, size: 16 };
    summarySheet.getRow(1).height = 30;

    summarySheet.addRow(['RAPPORT DE VEILLE DE NUIT']);
    summarySheet.addRow([]);
    
    // Report info
    summarySheet.addRows([
      ['Client:', report.client_name],
      ['Site:', report.site_name],
      ['Veilleur:', report.user_email],
      ['Date:', format(new Date(report.start_time), 'dd MMMM yyyy', { locale: fr })],
      ['Horaire:', `${format(new Date(report.start_time), 'HH:mm')} - ${format(new Date(report.end_time), 'HH:mm')}`],
      ['Statut:', report.status],
      [],
      ['Résumé:'],
      [decrypt(report.summary_encrypted) || 'Aucun résumé']
    ]);

    // Style summary sheet
    summarySheet.getColumn(1).width = 20;
    summarySheet.getColumn(2).width = 50;
    summarySheet.getColumn(1).font = { bold: true };

    // === SHEET 2: Events ===
    const eventsSheet = workbook.addWorksheet('Événements', {
      properties: { tabColor: { argb: 'FFEF4444' } }
    });

    // Headers
    eventsSheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Gravité', key: 'severity', width: 15 },
      { header: 'Titre', key: 'title', width: 30 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Lieu', key: 'location', width: 20 },
      { header: 'Date/Heure', key: 'event_time', width: 20 }
    ];

    // Style header
    eventsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    eventsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0EA5E9' }
    };

    // Add events data
    events.forEach(event => {
      eventsSheet.addRow({
        id: event.id,
        type: event.type,
        severity: event.severity,
        title: event.title,
        description: decrypt(event.description_encrypted),
        location: decrypt(event.location_encrypted),
        event_time: format(new Date(event.event_time), 'dd/MM/yyyy HH:mm')
      });
    });

    // Color code by severity
    eventsSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const severity = row.getCell(3).value;
        let color;
        switch (severity) {
          case 'critical': color = 'FFEF4444'; break;
          case 'high': color = 'FFF97316'; break;
          case 'medium': color = 'FFFBBF24'; break;
          default: color = 'FF10B981';
        }
        row.getCell(3).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: color }
        };
      }
    });

    // === SHEET 3: Photos ===
    const photosSheet = workbook.addWorksheet('Photos', {
      properties: { tabColor: { argb: 'FF8B5CF6' } }
    });

    photosSheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nom du fichier', key: 'file_name', width: 40 },
      { header: 'Taille', key: 'file_size', width: 15 },
      { header: 'Date upload', key: 'uploaded_at', width: 20 }
    ];

    photosSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    photosSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0EA5E9' }
    };

    photos.forEach(photo => {
      photosSheet.addRow({
        id: photo.id,
        file_name: photo.file_name,
        file_size: `${(photo.file_size / 1024).toFixed(2)} KB`,
        uploaded_at: format(new Date(photo.uploaded_at), 'dd/MM/yyyy HH:mm')
      });
    });

    // === SHEET 4: Statistics ===
    const statsSheet = workbook.addWorksheet('Statistiques', {
      properties: { tabColor: { argb: 'FF10B981' } }
    });

    const eventsByType = events.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {});

    const eventsBySeverity = events.reduce((acc, e) => {
      acc[e.severity] = (acc[e.severity] || 0) + 1;
      return acc;
    }, {});

    statsSheet.addRows([
      ['STATISTIQUES DU RAPPORT'],
      [],
      ['Nombre total d\'événements:', events.length],
      ['Nombre de photos:', photos.length],
      [],
      ['Événements par type:'],
      ...Object.entries(eventsByType).map(([type, count]) => [type, count]),
      [],
      ['Événements par gravité:'],
      ...Object.entries(eventsBySeverity).map(([severity, count]) => [severity, count])
    ]);

    statsSheet.getColumn(1).width = 30;
    statsSheet.getColumn(2).width = 15;
    statsSheet.getColumn(1).font = { bold: true };

    // Write file
    await workbook.xlsx.writeFile(outputPath);

    return outputPath;

  } catch (error) {
    console.error('Excel generation error:', error);
    throw error;
  }
};

/**
 * Generate monthly summary Excel
 * @param {Number} userId - User ID
 * @param {String} month - Month (YYYY-MM)
 * @param {String} outputPath - Output file path
 */
export const generateMonthlySummaryExcel = async (userId, month, outputPath) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Résumé mensuel');

  // Fetch reports for the month
  const [reports] = await pool.execute(`
    SELECT r.id, r.title, r.status, r.created_at,
           s.name as site_name,
           COUNT(DISTINCT e.id) as event_count
    FROM reports r
    JOIN sites s ON r.site_id = s.id
    LEFT JOIN events e ON e.report_id = r.id
    WHERE r.user_id = ? 
      AND DATE_FORMAT(r.created_at, '%Y-%m') = ?
    GROUP BY r.id
    ORDER BY r.created_at DESC
  `, [userId, month]);

  sheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Titre', key: 'title', width: 40 },
    { header: 'Site', key: 'site_name', width: 30 },
    { header: 'Statut', key: 'status', width: 15 },
    { header: 'Événements', key: 'event_count', width: 15 },
    { header: 'Date', key: 'created_at', width: 20 }
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0EA5E9' }
  };

  reports.forEach(report => {
    sheet.addRow({
      ...report,
      created_at: format(new Date(report.created_at), 'dd/MM/yyyy HH:mm')
    });
  });

  await workbook.xlsx.writeFile(outputPath);
  return outputPath;
};
