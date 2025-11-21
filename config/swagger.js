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
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'access_token', // <-- match your AUTH_ACCESS_COOKIE name
        },
      },
    },
    security: [{ bearerAuth: [] }, { cookieAuth: [] }], // Make JWT globally available
  },
  apis: ['./src/routes/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
