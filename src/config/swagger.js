const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bank Management System API',
      version: '1.0.0',
      description: `
## Bank Management System REST API

This API provides core banking user management functionality, built with Node.js and PostgreSQL (Neon).

### Features
- Add new bank users with account creation
- Retrieve all users with pagination and filtering
- Full input validation and error handling
- Concurrent request handling via PostgreSQL connection pool

### Authentication
> ⚠️ In production, all endpoints should be protected with JWT Bearer tokens. 
> Add \`Authorization: Bearer <token>\` to all requests.
      `,
      contact: {
        name: 'BMS API Support',
        email: 'support@bankms.com',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://your-app-name.onrender.com',
        description: 'Production server (Render)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        CreateUserRequest: {
          type: 'object',
          required: ['first_name', 'last_name', 'email'],
          properties: {
            first_name: {
              type: 'string',
              example: 'Jean',
              description: 'User first name (2–100 characters)',
            },
            last_name: {
              type: 'string',
              example: 'Mbarga',
              description: 'User last name (2–100 characters)',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'jean.mbarga@email.com',
              description: 'Unique email address',
            },
            phone: {
              type: 'string',
              example: '+237699000000',
              description: 'Mobile phone number (optional)',
            },
            address: {
              type: 'string',
              example: 'Rue Nachtigal, Yaoundé, Cameroon',
              description: 'Physical address (optional)',
            },
            account_type: {
              type: 'string',
              enum: ['savings', 'current', 'fixed_deposit'],
              default: 'savings',
              description: 'Type of bank account',
            },
            initial_deposit: {
              type: 'number',
              format: 'float',
              example: 50000.0,
              description: 'Initial deposit amount in XAF (optional, default 0)',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
            first_name: { type: 'string', example: 'Jean' },
            last_name: { type: 'string', example: 'Mbarga' },
            email: { type: 'string', example: 'jean.mbarga@email.com' },
            phone: { type: 'string', example: '+237699000000', nullable: true },
            address: { type: 'string', example: 'Yaoundé, Cameroon', nullable: true },
            account_type: { type: 'string', example: 'savings' },
            account_number: { type: 'string', example: 'BMS-20240115-482910' },
            balance: { type: 'number', example: 50000.0 },
            status: { type: 'string', example: 'active' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        UserResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'User account created successfully' },
            data: { $ref: '#/components/schemas/User' },
          },
        },
        UsersListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Users retrieved successfully' },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/User' },
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'integer', example: 150 },
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 20 },
                totalPages: { type: 'integer', example: 8 },
                hasNextPage: { type: 'boolean', example: true },
                hasPreviousPage: { type: 'boolean', example: false },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Validation failed' },
            error: { type: 'string', example: 'VALIDATION_ERROR' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'email' },
                  message: { type: 'string', example: 'Must be a valid email address' },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
