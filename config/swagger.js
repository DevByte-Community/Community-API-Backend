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
          description: 'Single dashboard metric with count and trend',
          properties: {
            count: {
              type: 'integer',
              description: 'Metric count',
            },
            trend: {
              type: 'integer',
              description: 'Percentage change vs previous period',
            },
            description: {
              type: 'string',
              description: 'Human-readable description of the metric',
            },
          },
          required: ['count', 'trend', 'description'],
        },

        DashboardMetricsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Dashboard metrics retrieved successfully',
            },
            activeMembers: {
              $ref: '#/components/schemas/DashboardMetric',
            },
            activeProjects: {
              $ref: '#/components/schemas/DashboardMetric',
            },
            upcomingEvents: {
              $ref: '#/components/schemas/DashboardMetric',
            },
            blogPosts: {
              $ref: '#/components/schemas/DashboardMetric',
            },
            lastUpdated: {
              type: 'string',
              format: 'date-time',
              example: '2026-02-05T16:59:20.636Z',
            },
          },
          required: [
            'success',
            'message',
            'activeMembers',
            'activeProjects',
            'upcomingEvents',
            'blogPosts',
            'lastUpdated',
          ],
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

    security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  },

  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
