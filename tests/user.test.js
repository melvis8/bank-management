const db = require('../src/config/database');
const bcrypt = require('bcryptjs');

// Spy on methods
const getPoolSpy = vi.spyOn(db, 'getPool');
const genSaltSpy = vi.spyOn(bcrypt, 'genSalt');
const hashSpy = vi.spyOn(bcrypt, 'hash');

const { mockRequest, mockResponse } = require('./helpers');
const userController = require('../src/controllers/userController');

// Define mock DB pool and client
const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};
const mockPool = {
  connect: vi.fn().mockResolvedValue(mockClient),
  query: vi.fn(),
};

describe('User Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPoolSpy.mockReturnValue(mockPool);
    mockPool.connect.mockResolvedValue(mockClient);
    genSaltSpy.mockResolvedValue('mock-salt');
    hashSpy.mockResolvedValue('mock-hash');
  });

  describe('addUser (Admin)', () => {
    it('should create a user successfully', async () => {
      const req = mockRequest({
        body: {
          user_id: 'alice_smith',
          first_name: 'Alice',
          last_name: 'Smith',
          email: 'alice@example.com',
          password: 'password123',
          phone: '987654321',
          address: '123 Main St',
          role: 'user',
        },
      });
      const res = mockResponse();

      // Mock DB: user doesn't exist, insert returns new user
      mockPool.query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT id FROM users')) {
          return Promise.resolve({ rowCount: 0, rows: [] });
        }
        if (sql.includes('INSERT INTO users')) {
          return Promise.resolve({
            rowCount: 1,
            rows: [
              {
                id: 'new-user-uuid',
                user_id: 'alice_smith',
                email: 'alice@example.com',
                first_name: 'Alice',
                last_name: 'Smith',
                role: 'user',
              },
            ],
          });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      await userController.addUser(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 'new-user-uuid',
          user_id: 'alice_smith',
          email: 'alice@example.com',
          first_name: 'Alice',
          last_name: 'Smith',
          role: 'user',
        },
      });
    });

    it('should return 400 if required fields are missing', async () => {
      const req = mockRequest({
        body: {
          user_id: 'alice_smith',
          first_name: 'Alice',
          // missing last_name, email, password
        },
      });
      const res = mockResponse();

      await userController.addUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Missing required fields',
      });
    });

    it('should return 400 if user_id or email already exists', async () => {
      const req = mockRequest({
        body: {
          user_id: 'alice_smith',
          first_name: 'Alice',
          last_name: 'Smith',
          email: 'alice@example.com',
          password: 'password123',
        },
      });
      const res = mockResponse();

      // Mock DB: user exists
      mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'existing-id' }] });

      await userController.addUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User ID or Email already exists',
      });
    });

    it('should return 500 on database error during user creation', async () => {
      const req = mockRequest({
        body: {
          user_id: 'alice_smith',
          first_name: 'Alice',
          last_name: 'Smith',
          email: 'alice@example.com',
          password: 'password123',
        },
      });
      const res = mockResponse();

      mockPool.query.mockRejectedValueOnce(new Error('DB Query Error'));

      await userController.addUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error creating user',
      });
    });
  });

  describe('getAllUsers (Admin)', () => {
    it('should return all users', async () => {
      const req = mockRequest();
      const res = mockResponse();

      const mockUsers = [
        { id: '1', user_id: 'user1', email: 'user1@example.com' },
        { id: '2', user_id: 'user2', email: 'user2@example.com' },
      ];
      mockPool.query.mockResolvedValueOnce({ rows: mockUsers });

      await userController.getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUsers,
      });
    });

    it('should return 500 on database error during user list fetch', async () => {
      const req = mockRequest();
      const res = mockResponse();

      mockPool.query.mockRejectedValueOnce(new Error('Fetch Error'));

      await userController.getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error retrieving users',
      });
    });
  });

  describe('getUserById', () => {
    it('should return user details with accounts if found', async () => {
      const req = mockRequest({ params: { id: 'user-uuid' } });
      const res = mockResponse();

      const mockUser = { id: 'user-uuid', user_id: 'user1', email: 'user1@example.com' };
      const mockAccounts = [
        { id: 'acc-1', account_number: 'BMS-ECO-12345678', balance: '1000', bank_name: 'ECOBANK' },
      ];

      mockPool.query.mockImplementation((sql, params) => {
        if (sql.includes('FROM users')) {
          return Promise.resolve({ rowCount: 1, rows: [mockUser] });
        }
        if (sql.includes('FROM accounts')) {
          return Promise.resolve({ rowCount: mockAccounts.length, rows: mockAccounts });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      await userController.getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          ...mockUser,
          accounts: mockAccounts,
        },
      });
    });

    it('should return 404 if user not found', async () => {
      const req = mockRequest({ params: { id: 'nonexistent-uuid' } });
      const res = mockResponse();

      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await userController.getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });

    it('should return 500 on database error', async () => {
      const req = mockRequest({ params: { id: 'user-uuid' } });
      const res = mockResponse();

      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await userController.getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error retrieving user details',
      });
    });
  });

  describe('updateUser (Admin)', () => {
    it('should update user successfully if found', async () => {
      const req = mockRequest({
        params: { id: 'user-uuid' },
        body: { first_name: 'UpdatedName', phone: '555555' },
      });
      const res = mockResponse();

      const mockUpdatedUser = { id: 'user-uuid', first_name: 'UpdatedName', phone: '555555' };
      mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockUpdatedUser] });

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedUser,
      });
    });

    it('should return 404 if user not found for update', async () => {
      const req = mockRequest({
        params: { id: 'nonexistent-uuid' },
        body: { first_name: 'UpdatedName' },
      });
      const res = mockResponse();

      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });

    it('should return 500 on database error during update', async () => {
      const req = mockRequest({
        params: { id: 'user-uuid' },
        body: { first_name: 'UpdatedName' },
      });
      const res = mockResponse();

      mockPool.query.mockRejectedValueOnce(new Error('Update Error'));

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error updating user',
      });
    });
  });

  describe('deleteUser (Admin)', () => {
    it('should delete user successfully if found', async () => {
      const req = mockRequest({ params: { id: 'user-uuid' } });
      const res = mockResponse();

      mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'user-uuid' }] });

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User deleted successfully',
      });
    });

    it('should return 404 if user not found for delete', async () => {
      const req = mockRequest({ params: { id: 'nonexistent-uuid' } });
      const res = mockResponse();

      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });

    it('should return 500 on database error during delete', async () => {
      const req = mockRequest({ params: { id: 'user-uuid' } });
      const res = mockResponse();

      mockPool.query.mockRejectedValueOnce(new Error('Delete Error'));

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error deleting user',
      });
    });
  });

  describe('deleteAllUsers (Admin)', () => {
    it('should delete all users except the active admin successfully', async () => {
      const req = mockRequest({
        user: { id: 'admin-uuid' },
      });
      const res = mockResponse();

      mockPool.query.mockResolvedValueOnce({ rowCount: 5 });

      await userController.deleteAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Deleted 5 users successfully. Admin account preserved.',
      });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM users WHERE id != $1'),
        ['admin-uuid']
      );
    });

    it('should return 500 on database error during bulk delete', async () => {
      const req = mockRequest({
        user: { id: 'admin-uuid' },
      });
      const res = mockResponse();

      mockPool.query.mockRejectedValueOnce(new Error('Bulk Delete Error'));

      await userController.deleteAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error deleting all users',
      });
    });
  });
});
