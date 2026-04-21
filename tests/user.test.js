const request = require('supertest');
const app = require('../index');
const { getPool } = require('../src/config/database');

jest.mock('../src/config/database', () => {
  const mClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  const mPool = {
    connect: jest.fn(() => Promise.resolve(mClient)),
    query: jest.fn(),
  };
  return {
    getPool: jest.fn(() => mPool),
    initializeDatabase: jest.fn(),
  };
});

describe('User API CRUD', () => {
  let mockClient;

  beforeEach(async () => {
    mockClient = await getPool().connect();
    jest.clearAllMocks();
    
    const queryImpl = (sql) => {
        if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return Promise.resolve();
        return Promise.resolve({ rowCount: 0, rows: [] });
    };

    mockClient.query.mockImplementation(queryImpl);
    getPool().query.mockImplementation(queryImpl);
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const newUser = {
        user_id: 'USR123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      };

      mockClient.query.mockImplementation((sql) => {
        if (sql.includes('SELECT id FROM users')) return Promise.resolve({ rowCount: 0, rows: [] });
        if (sql.includes('INSERT INTO users')) return Promise.resolve({
            rowCount: 1,
            rows: [{ ...newUser, id: 'uuid-123', account_number: 'ACC-123', balance: 0 }]
        });
        return Promise.resolve();
      });

      const res = await request(app)
        .post('/api/users')
        .send(newUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user_id).toBe('USR123');
    });
  });

  describe('GET /api/users', () => {
    it('should return a list of users', async () => {
      const impl = (sql) => {
        if (sql.includes('COUNT(*)')) return Promise.resolve({ rows: [{ count: '1' }] });
        if (sql.includes('SELECT * FROM users')) return Promise.resolve({ 
            rowCount: 1, 
            rows: [{ id: 'uuid-1', first_name: 'John' }] 
        });
        return Promise.resolve();
      };
      mockClient.query.mockImplementation(impl);
      getPool().query.mockImplementation(impl);

      const res = await request(app).get('/api/users');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });
});
