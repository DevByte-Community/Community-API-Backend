// swagger.js
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DevByte-Community-API',
      version: '1.0.0',
      description: 'A REST API for DevByte community',
    },
    components: {
      schemas: {
        DashboardMetric: {
          type: 'object',
          properties: {
            count: { type: 'integer', example: 1 },
            trend: { type: 'integer', example: 0, description: 'Percentage change vs previous period' },
            description: { type: 'string', example: 'Users active in last 7 days' },
          },
          required: ['count', 'trend', 'description'],
        },
        DashboardMetricsResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Dashboard metrics retrieved successfully' },
            activeMembers: { $ref: '#/components/schemas/DashboardMetric' },
            activeProjects: { $ref: '#/components/schemas/DashboardMetric' },
            upcomingEvents: { $ref: '#/components/schemas/DashboardMetric' },
            blogPosts: { $ref: '#/components/schemas/DashboardMetric' },
            lastUpdated: { type: 'string', format: 'date-time', example: '2026-02-05T16:59:20.636Z' },
          },
          required: ['success', 'message', 'activeMembers', 'activeProjects', 'upcomingEvents', 'blogPosts', 'lastUpdated'],
        },
      },
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'access_token',
        },
      },
    },
    security: [{ bearerAuth: [] }, { cookieAuth: [] }],  // Make JWT globally available
  },
  apis: ['./src/routes/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

