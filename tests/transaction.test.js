process.env.JWT_SECRET = 'test_secret';
const request = require('supertest');
const { getPool } = require('../src/config/database');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockReturnValue({ id: 'user-uuid', email: 'test@user.com' }),
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

describe('Transaction API (Users)', () => {
  let mockClient;
  let token;

  beforeEach(async () => {
    mockClient = await getPool().connect();
    token = 'mocked-token';
    jest.clearAllMocks();
    
    mockClient.query.mockImplementation((sql) => {
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return Promise.resolve();
      return Promise.resolve({ rowCount: 0, rows: [] });
    });
  });

  describe('POST /api/transactions/deposit', () => {
    it('should complete a deposit of 100 XAF or more', async () => {
      mockClient.query.mockImplementation((sql) => {
        if (sql.includes('SELECT balance FROM users')) return Promise.resolve({ rowCount: 1, rows: [{ balance: 500 }] });
        if (sql.includes('UPDATE users')) return Promise.resolve({ rowCount: 1 });
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
  });
});
