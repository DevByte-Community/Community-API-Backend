// swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const app = require('../src/app');

// Base Swagger options
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DevByte-Community-API',
      version: '1.0.0',
      description: 'A REST API for DevByte community',
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'access_token',
        },
      },
      responses: {
        BadRequest: {
          description: 'Bad Request - Invalid input',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { error: { type: 'string' } },
              },
            },
          },
        },
        Unauthorized: { description: 'Unauthorized - Missing or invalid token' },
        Forbidden: { description: 'Forbidden - Insufficient permissions' },
        ServerError: { description: 'Internal Server Error' },
      },
    },
    tags: [
      {
        name: 'Partners',
        description: 'Partner management endpoints',
      },
    ],
    security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  },
  apis: ['./src/routes/*.js'], // Parse JSDoc comments from route files
};

const swaggerSpec = swaggerJsdoc(options);

// Partner schemas
const partnerSchemas = {
  Partner: {
    type: 'object',
    required: ['id', 'name', 'description', 'email', 'created_at', 'updated_at'],
    properties: {
      id: { type: 'string', example: 'partner-001', description: 'Unique partner identifier' },
      name: { type: 'string', example: 'TechCorp Inc.', description: 'Partner company name' },
      description: { type: 'string', example: 'Leading tech innovator', description: 'Partner description' },
      logo: {
        type: 'string',
        example: 'http://minio:9000/partners/partner-001_logo.svg',
        description: 'URL to partner logo in MinIO',
      },
      email: {
        type: 'string',
        format: 'email',
        example: 'contact@techcorp.com',
        description: 'Partner contact email',
      },
      created_at: { type: 'string', format: 'date-time', example: '2025-04-05T10:00:00Z' },
      updated_at: { type: 'string', format: 'date-time', example: '2025-04-05T10:00:00Z' },
    },
  },
};

// Partner paths
const partnerPaths = {
  '/api/v1/partners': {
    post: {
      tags: ['Partners'],
      summary: 'Create a new partner',
      description: 'Admin only. Supports logo upload to MinIO.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['name', 'description', 'email'],
              properties: {
                name: { type: 'string', example: 'TechCorp Inc.' },
                description: { type: 'string', example: 'Leading tech innovator' },
                email: { type: 'string', format: 'email', example: 'contact@techcorp.com' },
                logo: { type: 'string', format: 'binary', description: 'Logo file (SVG/PNG/JPG ≤2MB)' },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Partner created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Partner created successfully' },
                  partner: { $ref: '#/components/schemas/Partner' },
                },
              },
            },
          },
        },
        409: {
          description: 'Conflict - Name or email already exists',
          content: {
            'application/json': {
              example: { error: 'Partner name must be unique', status: 409 },
            },
          },
        },
      },
    },
    get: {
      tags: ['Partners'],
      summary: 'List all partners',
      description: 'Public access. Supports pagination and search.',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'List of partners',
          content: {
            'application/json': {
              example: {
                success: true,
                data: [],
                pagination: { page: 1, limit: 20, total: 15 },
              },
            },
          },
        },
      },
    },
  },
  '/api/v1/partners/{id}': {
    get: {
      tags: ['Partners'],
      summary: 'Get a single partner',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Partner retrieved successfully' },
        404: { description: 'Partner not found' },
      },
    },
    patch: {
      tags: ['Partners'],
      summary: 'Update a partner',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { name: { type: 'string' }, description: { type: 'string' }, email: { type: 'string' } },
            },
          },
        },
      },
      responses: {
        200: { description: 'Partner updated successfully' },
        404: { description: 'Partner not found' },
      },
    },
    delete: {
      tags: ['Partners'],
      summary: 'Delete a partner',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Partner deleted successfully' },
        404: { description: 'Partner not found' },
      },
    },
  },
};

// Merge partner paths and schemas
swaggerSpec.paths = { ...swaggerSpec.paths, ...partnerPaths };
swaggerSpec.components.schemas = { ...swaggerSpec.components.schemas, ...partnerSchemas };

// Mount Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

module.exports = swaggerSpec;
