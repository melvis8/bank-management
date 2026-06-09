const db = require('../src/config/database');

// Spy on methods
const getPoolSpy = vi.spyOn(db, 'getPool');

const { mockRequest, mockResponse } = require('./helpers');
const accountController = require('../src/controllers/accountController');

// Define mock DB pool and client
const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};
const mockPool = {
  connect: vi.fn().mockResolvedValue(mockClient),
  query: vi.fn(),
};

describe('Account Controller', () => {
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

  describe('getAllAccounts (Admin)', () => {
    it('should return a list of all accounts joined with user and bank', async () => {
      const req = mockRequest({ user: { id: 'admin-uuid', role: 'admin' } });
      const res = mockResponse();

      const mockAccounts = [
        { id: 'acc-1', user_id: 'user-1', bank_id: 'bank-1', account_number: 'BMS-ECO-123', bank_name: 'ECOBANK', user_email: 'user1@example.com' },
      ];
      mockPool.query.mockResolvedValueOnce({ rows: mockAccounts });

      await accountController.getAllAccounts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockAccounts });
    });

    it('should return 500 on database error during fetch all', async () => {
      const req = mockRequest({ user: { id: 'admin-uuid', role: 'admin' } });
      const res = mockResponse();

      mockPool.query.mockRejectedValueOnce(new Error('Fetch error'));

      await accountController.getAllAccounts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Error fetching accounts' });
    });
  });

  describe('getAccountById', () => {
    it('should return account details if found', async () => {
      const req = mockRequest({ params: { id: 'acc-uuid' } });
      const res = mockResponse();

      const mockAccount = { id: 'acc-uuid', account_number: 'BMS-ECO-123', bank_name: 'ECOBANK' };
      mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockAccount] });

      await accountController.getAccountById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockAccount });
    });

    it('should return 404 if account not found', async () => {
      const req = mockRequest({ params: { id: 'nonexistent-uuid' } });
      const res = mockResponse();

      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await accountController.getAccountById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Account not found' });
    });

    it('should return 500 on database error during fetch by ID', async () => {
      const req = mockRequest({ params: { id: 'acc-uuid' } });
      const res = mockResponse();

      mockPool.query.mockRejectedValueOnce(new Error('Fetch by ID error'));

      await accountController.getAccountById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Error fetching account' });
    });
  });

  describe('createAccount', () => {
    it('should create an account for self successfully', async () => {
      const req = mockRequest({
        user: { id: 'user-uuid', role: 'user' },
        body: { bank_id: 'bank-uuid', account_type: 'savings', initial_balance: 500 },
      });
      const res = mockResponse();

      mockClient.query.mockImplementation((sql, params) => {
        if (sql.includes('BEGIN') || sql.includes('COMMIT')) {
          return Promise.resolve();
        }
        if (sql.includes('SELECT id FROM accounts')) {
          // Check unique constraint: user does not have account in this bank yet
          return Promise.resolve({ rowCount: 0, rows: [] });
        }
        if (sql.includes('SELECT code FROM banks')) {
          // Check bank code
          return Promise.resolve({ rowCount: 1, rows: [{ code: 'ECOBANK' }] });
        }
        if (sql.includes('INSERT INTO accounts')) {
          return Promise.resolve({
            rowCount: 1,
            rows: [{ id: 'new-acc-uuid', user_id: 'user-uuid', bank_id: 'bank-uuid', account_number: 'BMS-ECOBANK-12345678', balance: 500 }],
          });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      await accountController.createAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'new-acc-uuid',
          user_id: 'user-uuid',
          balance: 500,
        }),
      });
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should allow admin to create an account for another user', async () => {
      const req = mockRequest({
        user: { id: 'admin-uuid', role: 'admin' },
        body: { user_id: 'other-user-uuid', bank_id: 'bank-uuid', account_type: 'current' },
      });
      const res = mockResponse();

      mockClient.query.mockImplementation((sql, params) => {
        if (sql.includes('BEGIN') || sql.includes('COMMIT')) return Promise.resolve();
        if (sql.includes('SELECT id FROM accounts')) return Promise.resolve({ rowCount: 0, rows: [] });
        if (sql.includes('SELECT code FROM banks')) return Promise.resolve({ rowCount: 1, rows: [{ code: 'UBA' }] });
        if (sql.includes('INSERT INTO accounts')) {
          return Promise.resolve({
            rowCount: 1,
            rows: [{ id: 'new-acc-uuid', user_id: 'other-user-uuid', bank_id: 'bank-uuid', account_number: 'BMS-UBA-123', balance: 0 }],
          });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      await accountController.createAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          user_id: 'other-user-uuid',
        }),
      });
    });

    it('should return 403 if non-admin tries to create an account for another user', async () => {
      const req = mockRequest({
        user: { id: 'user-uuid', role: 'user' },
        body: { user_id: 'other-user-uuid', bank_id: 'bank-uuid' },
      });
      const res = mockResponse();

      await accountController.createAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Only admins can create accounts for others',
      });
    });

    it('should return 400 if bank_id is missing', async () => {
      const req = mockRequest({
        user: { id: 'user-uuid', role: 'user' },
        body: { account_type: 'savings' }, // missing bank_id
      });
      const res = mockResponse();

      await accountController.createAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'bank_id is required',
      });
    });

    it('should return 400 and ROLLBACK if user already has an account at this bank', async () => {
      const req = mockRequest({
        user: { id: 'user-uuid', role: 'user' },
        body: { bank_id: 'bank-uuid' },
      });
      const res = mockResponse();

      mockClient.query.mockImplementation((sql, params) => {
        if (sql.includes('BEGIN') || sql.includes('ROLLBACK')) return Promise.resolve();
        if (sql.includes('SELECT id FROM accounts')) {
          // Account already exists
          return Promise.resolve({ rowCount: 1, rows: [{ id: 'existing-acc' }] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      await accountController.createAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User already has an account in this bank',
      });
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 404 and ROLLBACK if bank does not exist', async () => {
      const req = mockRequest({
        user: { id: 'user-uuid', role: 'user' },
        body: { bank_id: 'nonexistent-bank-uuid' },
      });
      const res = mockResponse();

      mockClient.query.mockImplementation((sql, params) => {
        if (sql.includes('BEGIN') || sql.includes('ROLLBACK')) return Promise.resolve();
        if (sql.includes('SELECT id FROM accounts')) return Promise.resolve({ rowCount: 0, rows: [] });
        if (sql.includes('SELECT code FROM banks')) {
          // Bank not found
          return Promise.resolve({ rowCount: 0, rows: [] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      await accountController.createAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Bank not found',
      });
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 500 and ROLLBACK on DB error during transaction', async () => {
      const req = mockRequest({
        user: { id: 'user-uuid', role: 'user' },
        body: { bank_id: 'bank-uuid' },
      });
      const res = mockResponse();

      mockClient.query.mockImplementation((sql, params) => {
        if (sql.includes('BEGIN')) return Promise.resolve();
        if (sql.includes('SELECT id FROM accounts')) {
          return Promise.reject(new Error('Transaction broke'));
        }
        if (sql.includes('ROLLBACK')) return Promise.resolve();
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      await accountController.createAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error creating account',
      });
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('updateAccount', () => {
    it('should update account type, status, and balance if user is admin', async () => {
      const req = mockRequest({
        user: { id: 'admin-uuid', role: 'admin' },
        params: { id: 'acc-uuid' },
        body: { account_type: 'current', status: 'suspended', balance: 9999 },
      });
      const res = mockResponse();

      const mockAccount = { id: 'acc-uuid', user_id: 'user-uuid' };
      mockPool.query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT user_id FROM accounts')) {
          return Promise.resolve({ rowCount: 1, rows: [mockAccount] });
        }
        if (sql.includes('UPDATE accounts')) {
          return Promise.resolve({ rowCount: 1, rows: [{ id: 'acc-uuid', account_type: 'current', status: 'suspended', balance: 9999 }] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      await accountController.updateAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          account_type: 'current',
          status: 'suspended',
          balance: 9999,
        }),
      });
    });

    it('should only update account type if user is owner and not admin', async () => {
      const req = mockRequest({
        user: { id: 'owner-uuid', role: 'user' },
        params: { id: 'acc-uuid' },
        body: { account_type: 'current', balance: 1000000, status: 'active' }, // owner tries to update balance/status too
      });
      const res = mockResponse();

      const mockAccount = { id: 'acc-uuid', user_id: 'owner-uuid' };
      mockPool.query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT user_id FROM accounts')) {
          return Promise.resolve({ rowCount: 1, rows: [mockAccount] });
        }
        if (sql.includes('UPDATE accounts')) {
          // Make sure it doesn't set status/balance (since query uses limited params for users)
          return Promise.resolve({ rowCount: 1, rows: [{ id: 'acc-uuid', account_type: 'current', balance: 0, status: 'active' }] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      await accountController.updateAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      // Ensure the query only used 2 parameters (account_type, id)
      const updateCall = mockPool.query.mock.calls.find(c => c[0].includes('UPDATE accounts'));
      expect(updateCall[1]).toHaveLength(2); // Only updates account_type and ID
    });

    it('should return 403 if user is not admin and not the owner of the account', async () => {
      const req = mockRequest({
        user: { id: 'stranger-uuid', role: 'user' },
        params: { id: 'acc-uuid' },
        body: { account_type: 'current' },
      });
      const res = mockResponse();

      const mockAccount = { id: 'acc-uuid', user_id: 'owner-uuid' };
      mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockAccount] });

      await accountController.updateAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not authorized' });
    });

    it('should return 404 if account not found for update', async () => {
      const req = mockRequest({
        user: { id: 'admin-uuid', role: 'admin' },
        params: { id: 'nonexistent-uuid' },
        body: { status: 'active' },
      });
      const res = mockResponse();

      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await accountController.updateAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Account not found' });
    });

    it('should return 500 on database error during update', async () => {
      const req = mockRequest({
        user: { id: 'admin-uuid', role: 'admin' },
        params: { id: 'acc-uuid' },
        body: { status: 'active' },
      });
      const res = mockResponse();

      mockPool.query.mockRejectedValueOnce(new Error('Update failed'));

      await accountController.updateAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Error updating account' });
    });
  });

  describe('deleteAccount (Admin)', () => {
    it('should delete account successfully if found', async () => {
      const req = mockRequest({ params: { id: 'acc-uuid' } });
      const res = mockResponse();

      mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'acc-uuid' }] });

      await accountController.deleteAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Account deleted successfully' });
    });

    it('should return 404 if account not found for delete', async () => {
      const req = mockRequest({ params: { id: 'nonexistent-uuid' } });
      const res = mockResponse();

      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await accountController.deleteAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Account not found' });
    });

    it('should return 500 on database error during delete', async () => {
      const req = mockRequest({ params: { id: 'acc-uuid' } });
      const res = mockResponse();

      mockPool.query.mockRejectedValueOnce(new Error('Delete error'));

      await accountController.deleteAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Error deleting account' });
    });
  });

  describe('getMyAccounts', () => {
    it('should return the logged-in user accounts', async () => {
      const req = mockRequest({ user: { id: 'user-uuid' } });
      const res = mockResponse();

      const mockAccounts = [
        { id: 'acc-1', account_number: 'BMS-ECO-123', bank_name: 'ECOBANK', bank_code: 'ECOBANK' },
      ];
      mockPool.query.mockResolvedValueOnce({ rows: mockAccounts });

      await accountController.getMyAccounts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockAccounts });
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE a.user_id = $1'), ['user-uuid']);
    });

    it('should return 500 on database error during fetch my accounts', async () => {
      const req = mockRequest({ user: { id: 'user-uuid' } });
      const res = mockResponse();

      mockPool.query.mockRejectedValueOnce(new Error('Query error'));

      await accountController.getMyAccounts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Error fetching accounts' });
    });
  });
});
