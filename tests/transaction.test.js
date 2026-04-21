process.env.JWT_SECRET = 'test_secret';
const request = require('supertest');
const { getPool } = require('../src/config/database');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockReturnValue({ id: 'student-uuid', email: 'test@student.com' }),
  sign: jest.fn().mockReturnValue('mocked-token'),
}));

const app = require('../index');

jest.mock('../src/config/database', () => {
  const mClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  const mPool = {
    connect: jest.fn(() => Promise.resolve(mClient)),
  };
  return {
    getPool: jest.fn(() => mPool),
    initializeDatabase: jest.fn(),
  };
});

describe('Transaction API', () => {
  let mockClient;
  let token;

  beforeEach(async () => {
    mockClient = await getPool().connect();
    token = 'mocked-token';
    jest.clearAllMocks();
    
    // Default implementation for queries
    mockClient.query.mockImplementation((sql) => {
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return Promise.resolve();
      return Promise.resolve({ rowCount: 0, rows: [] });
    });
  });

  describe('POST /api/transactions/deposit', () => {
    it('should complete a deposit of 100 XAF or more', async () => {
      mockClient.query.mockImplementation((sql) => {
        if (sql.includes('SELECT balance')) return Promise.resolve({ rowCount: 1, rows: [{ balance: 500 }] });
        if (sql.includes('UPDATE students')) return Promise.resolve({ rowCount: 1 });
        if (sql.includes('INSERT INTO transactions')) return Promise.resolve({ rowCount: 1 });
        return Promise.resolve();
      });

      const res = await request(app)
        .post('/api/transactions/deposit')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 150 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.new_balance).toBe(650);
    });

    it('should reject a deposit less than 100 XAF', async () => {
      const res = await request(app)
        .post('/api/transactions/deposit')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 50 });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('100 XAF');
    });
  });

  describe('POST /api/transactions/withdraw', () => {
    it('should complete a withdrawal of 100 XAF or more', async () => {
      mockClient.query.mockImplementation((sql) => {
        if (sql.includes('SELECT balance')) return Promise.resolve({ rowCount: 1, rows: [{ balance: 1000 }] });
        if (sql.includes('UPDATE students')) return Promise.resolve({ rowCount: 1 });
        if (sql.includes('INSERT INTO transactions')) return Promise.resolve({ rowCount: 1 });
        return Promise.resolve();
      });

      const res = await request(app)
        .post('/api/transactions/withdraw')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 200 });

      expect(res.status).toBe(200);
      expect(res.body.new_balance).toBe(800);
    });

    it('should reject a withdrawal if funds are insufficient', async () => {
      mockClient.query.mockImplementation((sql) => {
        if (sql.includes('SELECT balance')) return Promise.resolve({ rowCount: 1, rows: [{ balance: 100 }] });
        return Promise.resolve();
      });

      const res = await request(app)
        .post('/api/transactions/withdraw')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 200 });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Fonds insuffisants');
    });
  });
});
