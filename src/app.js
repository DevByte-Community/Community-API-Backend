/**
 * App Entry Point
 * ---------------
 * Sets up the Express app, middleware, and routes.
 */

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const routes = require('./routes'); // auto-loads index.js from routes folder
const dbRoutes = require('./routes/dbRoutes');
// Import Redis client to trigger connection automatically
require('./utils/redisClient');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../config/swagger');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
// app.use(authorize)

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use('/api/v1', routes);

// Health check route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the DevByte Community API 🚀' });
});

// Test DB route
app.get('/api/v1/', dbRoutes);

// 404 handler for undefined routes
app.use((req, res, _next) => {
  res.status(404).json({
    success: false,
    status: 404,
    message: 'Route Not Found',
  });
});

// Centralized error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
