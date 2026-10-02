import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import dns from 'node:dns';
import connectDB from '../config/db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import financeBookRoutes from './routes/financeBookRoutes.js';
import adminEmployeeRoutes from './routes/adminEmployeeRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './docs/swagger.js';

// Use Google DNS for MongoDB Atlas SRV lookup
dns.setServers(['8.8.8.8', '1.1.1.1']);

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Global Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health and Root Routes
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'KN Backend API is running'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/superadmin', adminRoutes);
app.use('/api/v1/finance-book', financeBookRoutes);
app.use('/api/finance-book', financeBookRoutes);
app.use('/api/v1/admin/employees', adminEmployeeRoutes);
app.use('/api/admin/employees', adminEmployeeRoutes);
app.use('/api/v1/employee', employeeRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/notifications', notificationRoutes);



// Swagger Documentation Routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocument);
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  const statusCode = err.status || (res.statusCode >= 400 ? res.statusCode : 500);
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Swagger Docs available at: /api-docs`);
});