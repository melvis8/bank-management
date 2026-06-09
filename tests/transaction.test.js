const db = require('../src/config/database');

// Spy on methods
const getPoolSpy = vi.spyOn(db, 'getPool');

const { mockRequest, mockResponse } = require('./helpers');
const transactionController = require('../src/controllers/transactionController');

// Define mock DB pool and client
const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};
const mockPool = {
  connect: vi.fn().mockResolvedValue(mockClient),
  query: vi.fn(),
};

describe('Transaction Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPoolSpy.mockReturnValue(mockPool);
    mockClient.query.mockReset();
    mockClient.release.mockReset();
    mockPool.query.mockReset();
    mockPool.connect.mockResolvedValue(mockClient);
    
    // Default implementation for basic queries
    mockClient.query.mockResolvedValue({ rowCount: 0, rows: [] });
    mockPool.query.mockResolvedValue({ rowCount: 0, rows: [] });
  });

  describe('deposit', () => {
    it('should complete a deposit successfully', async () => {
      const req = mockRequest({
        user: { id: 'user-uuid' },
        body: { account_number: 'BMS-ECO-123', amount: 500, reference: 'Test deposit' },
      });
      const res = mockResponse();

      const mockAccount = {
        id: 'acc-uuid',
        user_id: 'user-uuid',
        account_number: 'BMS-ECO-123',
        balance: '1000',
        status: 'active',
        bank_name: 'ECOBANK',
      };

      mockClient.query.mockImplementation((sql, params) => {
        if (sql.includes('BEGIN') || sql.includes('COMMIT')) return Promise.resolve();
        if (sql.includes('SELECT a.*, b.name')) {
          // getAccountForUpdate
          return Promise.resolve({ rowCount: 1, rows: [mockAccount] });
        }
        if (sql.includes('UPDATE accounts') || sql.includes('INSERT INTO transactions')) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      await transactionController.deposit(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Deposit successful',
        data: {
          account_number: 'BMS-ECO-123',
          bank: 'ECOBANK',
          deposited: 500,
          new_balance: 1500,
        },
      });
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 400 if account_number is missing', async () => {
      const req = mockRequest({
        user: { id: 'user-uuid' },
        body: { amount: 500 },
      });
      const res = mockResponse();

      await transactionController.deposit(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'MISSING_ACCOUNT_NUMBER',
      }));
    });

    it('should return 400 if amount is too low', async () => {
      const req = mockRequest({
        user: { id: 'user-uuid' },
        body: { account_number: 'BMS-ECO-123', amount: 50 }, // MIN_DEPOSIT is 100
      });
      const res = mockResponse();

      await transactionController.deposit(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'AMOUNT_TOO_LOW',
      }));
    });

    it('should return 404 and ROLLBACK if account is not found', async () => {
      const req = mockRequest({
        user: { id: 'user-uuid' },
        body: { account_number: 'BMS-ECO-123', amount: 500 },
      });
      const res = mockResponse();

      mockClient.query.mockImplementation((sql, params) => {
        if (sql.includes('BEGIN') || sql.includes('ROLLBACK')) return Promise.resolve();
        if (sql.includes('SELECT a.*, b.name')) {
          // account not found
          return Promise.resolve({ rowCount: 0, rows: [] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      await transactionController.deposit(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'ACCOUNT_NOT_FOUND',
      }));
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should return 403 and ROLLBACK if account does not belong to user', async () => {
      const req = mockRequest({
        user: { id: 'stranger-uuid' },
        body: { account_number: 'BMS-ECO-123', amount: 500 },
      });
      const res = mockResponse();

      const mockAccount = {
        id: 'acc-uuid',
        user_id: 'owner-uuid', // different
        account_number: 'BMS-ECO-123',
        status: 'active',
      };

      mockClient.query.mockImplementation((sql, params) => {
        if (sql.includes('BEGIN') || sql.includes('ROLLBACK')) return Promise.resolve();
        if (sql.includes('SELECT a.*, b.name')) {
          return Promise.resolve({ rowCount: 1, rows: [mockAccount] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      await transactionController.deposit(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'FORBIDDEN',
      }));
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should return 400 and ROLLBACK if account status is inactive', async () => {
      const req = mockRequest({
        user: { id: 'user-uuid' },
        body: { account_number: 'BMS-ECO-123', amount: 500 },
      });
      const res = mockResponse();

      const mockAccount = {
        id: 'acc-uuid',
        user_id: 'user-uuid',
        account_number: 'BMS-ECO-123',
        status: 'suspended', // inactive
      };

      mockClient.query.mockImplementation((sql, params) => {
        if (sql.includes('BEGIN') || sql.includes('ROLLBACK')) return Promise.resolve();
        if (sql.includes('SELECT a.*, b.name')) {
          return Promise.resolve({ rowCount: 1, rows: [mockAccount] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      await transactionController.deposit(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'ACCOUNT_INACTIVE',
      }));
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('withdraw', () => {
    it('should complete a withdrawal successfully, applying a 2% fee', async () => {
      const req = mockRequest({
        user: { id: 'user-uuid' },
        body: { account_number: 'BMS-ECO-123', amount: 1000 }, // 2% fee is 20, total deducted is 1020
      });
      const res = mockResponse();

      const mockAccount = {
        id: 'acc-uuid',
        user_id: 'user-uuid',
        account_number: 'BMS-ECO-123',
        balance: '2000',
        status: 'active',
        bank_name: 'ECOBANK',
      };

      mockClient.query.mockImplementation((sql, params) => {
        if (sql.includes('BEGIN') || sql.includes('COMMIT')) return Promise.resolve();
        if (sql.includes('SELECT a.*, b.name')) {
          return Promise.resolve({ rowCount: 1, rows: [mockAccount] });
        }
        if (sql.includes('UPDATE accounts') || sql.includes('INSERT INTO transactions')) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      await transactionController.withdraw(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Withdrawal successful',
        data: {
          account_number: 'BMS-ECO-123',
          bank: 'ECOBANK',
          withdrawn: 1000,
          fee_applied: 20,
          total_deducted: 1020,
          new_balance: 980,
        },
      });
    });

    it('should return 400 if withdrawal amount exceeds maximum limit', async () => {
      const req = mockRequest({
        user: { id: 'user-uuid' },
        body: { account_number: 'BMS-ECO-123', amount: 600000 }, // max is 500k
      });
      const res = mockResponse();

      await transactionController.withdraw(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'EXCEEDS_WITHDRAWAL_LIMIT',
      }));
    });

    it('should return 400 and ROLLBACK if funds are insufficient (including fee)', async () => {
      const req = mockRequest({
        user: { id: 'user-uuid' },
        body: { account_number: 'BMS-ECO-123', amount: 1000 }, // needs 1020
      });
      const res = mockResponse();

      const mockAccount = {
        id: 'acc-uuid',
        user_id: 'user-uuid',
        account_number: 'BMS-ECO-123',
        balance: '1010', // insufficient
        status: 'active',
      };

      mockClient.query.mockImplementation((sql, params) => {
        if (sql.includes('BEGIN') || sql.includes('ROLLBACK')) return Promise.resolve();
        if (sql.includes('SELECT a.*, b.name')) {
          return Promise.resolve({ rowCount: 1, rows: [mockAccount] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      await transactionController.withdraw(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'INSUFFICIENT_FUNDS',
      }));
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('transfer', () => {
    it('should transfer money successfully between accounts', async () => {
      const req = mockRequest({
        user: { id: 'user-uuid' },
        body: {
          sender_account_number: 'BMS-ECO-123',
          recipient_account_number: 'BMS-UBA-456',
          amount: 500,
        },
      });
      const res = mockResponse();

      const mockSender = { id: 's-acc', user_id: 'user-uuid', account_number: 'BMS-ECO-123', balance: '1000', status: 'active' };
      const mockRecipient = { id: 'r-acc', user_id: 'other-user', account_number: 'BMS-UBA-456', balance: '200', status: 'active' };

      mockClient.query.mockImplementation((sql, params) => {
        if (sql.includes('BEGIN') || sql.includes('COMMIT')) return Promise.resolve();
        if (sql.includes('SELECT a.*, b.name')) {
          // Since it calls getAccountForUpdate for sender first, then recipient:
          const accountNo = params[0];
          if (accountNo === 'BMS-ECO-123') return Promise.resolve({ rowCount: 1, rows: [mockSender] });
          if (accountNo === 'BMS-UBA-456') return Promise.resolve({ rowCount: 1, rows: [mockRecipient] });
        }
        if (sql.includes('UPDATE accounts') || sql.includes('INSERT INTO transactions')) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      await transactionController.transfer(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Transfer successful',
        data: {
          sender_account_number: 'BMS-ECO-123',
          recipient_account_number: 'BMS-UBA-456',
          amount: 500,
          sender_new_balance: 500,
        },
      });
    });

    it('should return 400 if sender is equal to recipient account number', async () => {
      const req = mockRequest({
        user: { id: 'user-uuid' },
        body: {
          sender_account_number: 'BMS-ECO-123',
          recipient_account_number: 'BMS-ECO-123',
          amount: 500,
        },
      });
      const res = mockResponse();

      await transactionController.transfer(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'SAME_ACCOUNT',
      }));
    });

    it('should return 404 and ROLLBACK if recipient account is not found', async () => {
      const req = mockRequest({
        user: { id: 'user-uuid' },
        body: {
          sender_account_number: 'BMS-ECO-123',
          recipient_account_number: 'BMS-UBA-456',
          amount: 500,
        },
      });
      const res = mockResponse();

      const mockSender = { id: 's-acc', user_id: 'user-uuid', account_number: 'BMS-ECO-123', balance: '1000', status: 'active' };

      mockClient.query.mockImplementation((sql, params) => {
        if (sql.includes('BEGIN') || sql.includes('ROLLBACK')) return Promise.resolve();
        if (sql.includes('SELECT a.*, b.name')) {
          const accountNo = params[0];
          if (accountNo === 'BMS-ECO-123') return Promise.resolve({ rowCount: 1, rows: [mockSender] });
          if (accountNo === 'BMS-UBA-456') return Promise.resolve({ rowCount: 0, rows: [] }); // not found
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      await transactionController.transfer(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'RECIPIENT_NOT_FOUND',
      }));
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getTransactionHistory', () => {
    it('should return transaction history with pagination', async () => {
      const req = mockRequest({
        user: { id: 'user-uuid' },
        params: { account_number: 'BMS-ECO-123' },
        query: { page: '1', limit: '5' },
      });
      const res = mockResponse();

      mockPool.query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT id FROM accounts')) {
          // Verify account ownership
          return Promise.resolve({ rowCount: 1, rows: [{ id: 'acc-uuid' }] });
        }
        if (sql.includes('SELECT COUNT(*) FROM transactions')) {
          return Promise.resolve({ rows: [{ count: '10' }] });
        }
        if (sql.includes('SELECT * FROM transactions')) {
          return Promise.resolve({ rows: [{ id: 'tx-1', amount: 500, type: 'deposit' }] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      await transactionController.getTransactionHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 'tx-1', amount: 500, type: 'deposit' }],
        pagination: {
          total: 10,
          page: 1,
          limit: 5,
          totalPages: 2,
        },
      });
    });

    it('should return 403 if account does not belong to logged-in user', async () => {
      const req = mockRequest({
        user: { id: 'stranger-uuid' },
        params: { account_number: 'BMS-ECO-123' },
      });
      const res = mockResponse();

      // Mock ownership check failing
      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await transactionController.getTransactionHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'FORBIDDEN',
      }));
    });
  });
});
