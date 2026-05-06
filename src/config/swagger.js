const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bank Management System API',
      version: '1.2.0',
      description: `
## Bank Management System REST API (Multi-Bank Edition)

This API manages users, banks, accounts, and transactions across multiple financial systems.

### Core Features
- **Multi-Bank Support**: Open accounts in different banks (ECOBANK, UBA, MOMO, etc.)
- **Account Constraints**: One account per bank per user.
- **Transactions**:
  - Withdrawals: Max 500,000 XAF, 2% fee applied.
  - Deposits: Min 100 XAF.
  - Transfers: Instant validation of sender/recipient.
- **Admin Management**: Full CRUD for users, banks, and accounts.

### Authentication
Use the \`Auth\` tag to register and login. Copy the returned \`token\` and use the **Authorize** button above to authenticate all other requests.
      `,
      contact: {
        name: 'BMS API Support',
        email: 'support@bankms.com',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
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
      },
      schemas: {
        RegisterRequest: {
          type: 'object',
          required: ['user_id', 'first_name', 'last_name', 'email', 'password', 'phone'],
          properties: {
            user_id: { type: 'string', example: 'U12345' },
            first_name: { type: 'string', example: 'John' },
            last_name: { type: 'string', example: 'Doe' },
            email: { type: 'string', format: 'email', example: 'john.doe@email.com' },
            password: { type: 'string', format: 'password', example: 'StrongPass123' },
            phone: { type: 'string', example: '+237699000111' },
            address: { type: 'string', example: 'Yaoundé, Cameroon' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', example: 'john.doe@email.com' },
            password: { type: 'string', example: 'StrongPass123' },
          },
        },
        CreateAccountRequest: {
          type: 'object',
          required: ['bank_id'],
          properties: {
            bank_id: { type: 'string', format: 'uuid', description: 'UUID of the bank' },
            account_type: { type: 'string', enum: ['savings', 'current'], default: 'savings' },
          },
        },
        TransactionRequest: {
          type: 'object',
          required: ['account_number', 'amount'],
          properties: {
            account_number: { type: 'string', example: 'BMS-ECOBANK-12345678' },
            amount: { type: 'number', minimum: 100, example: 5000 },
            reference: { type: 'string', example: 'Groceries' },
          },
        },
        TransferRequest: {
          type: 'object',
          required: ['sender_account_number', 'recipient_account_number', 'amount'],
          properties: {
            sender_account_number: { type: 'string', example: 'BMS-ECOBANK-12345678' },
            recipient_account_number: { type: 'string', example: 'BMS-UBA-87654321' },
            amount: { type: 'number', example: 10000 },
            reference: { type: 'string', example: 'Rent payment' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            status: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
