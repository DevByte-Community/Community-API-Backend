/**
 * App Entry Point
 * ---------------
 * Sets up the Express app, middleware, and routes.
 */

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const passport = require('passport');
const cookieParser = require('cookie-parser');

const routes = require('./routes');
const dbRoutes = require('./routes/dbRoutes');
require('./utils/redisClient');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../config/swagger');
const { errorHandler } = require('./middleware/errorHandler');
const { toList } = require('./utils');

const app = express();

// Middleware
app.use(
  cors({
    origin: toList(process.env.ALLOW_ORIGINS), // exact origin(s)
    credentials: true, // allow cookies
  })
);
app.use(express.json());
app.use(morgan('dev'));
app.set('trust proxy', 1); // good practice if you’ll use Secure cookies behind a proxy
app.use(cookieParser());
app.use(passport.initialize());

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
