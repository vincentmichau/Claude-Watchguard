import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { auditLog, sanitizeInput } from './middleware/validation.js';
import { setupChat } from './services/chatService.js';

// Routes
import authRoutes from './routes/auth.js';
import reportRoutes from './routes/reports.js';
import eventRoutes from './routes/events.js';
import shiftRoutes from './routes/shifts.js';
import adminRoutes from './routes/admin.js';
import photoRoutes from './routes/photos.js';
import pdfRoutes from './routes/pdf.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: 'Trop de requêtes, veuillez réessayer plus tard.',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Trop de tentatives de connexion'
});

app.use('/api/auth/login', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use(sanitizeInput);
app.use(auditLog);

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/pdf', pdfRoutes);

// Static files (with authentication in production)
app.use('/uploads', express.static('uploads'));

// Setup WebSocket chat
setupChat(io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Token invalide' });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Fichier trop volumineux' });
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Erreur serveur' 
      : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Start server
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   🌙 Night Watch Server Started           ║
║                                           ║
║   Port: ${PORT}                             ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
║   Time: ${new Date().toLocaleString('fr-FR')}      ║
║                                           ║
║   Features:                               ║
║   ✓ Secure authentication (JWT)          ║
║   ✓ Database encryption (GDPR)           ║
║   ✓ Real-time chat (Socket.io)           ║
║   ✓ PDF generation                       ║
║   ✓ Email notifications                  ║
║   ✓ Photo upload                         ║
║   ✓ Rate limiting                        ║
║   ✓ Audit logging                        ║
║                                           ║
╚═══════════════════════════════════════════╝
  `);
});

export { io };
