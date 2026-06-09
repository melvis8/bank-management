const db = require('../src/config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Spy on methods
const getPoolSpy = vi.spyOn(db, 'getPool');
const genSaltSpy = vi.spyOn(bcrypt, 'genSalt');
const hashSpy = vi.spyOn(bcrypt, 'hash');
const compareSpy = vi.spyOn(bcrypt, 'compare');
const signSpy = vi.spyOn(jwt, 'sign');

const { mockRequest, mockResponse } = require('./helpers');
const authController = require('../src/controllers/authController');

// Define mock DB pool and client
const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};
const mockPool = {
  connect: vi.fn().mockResolvedValue(mockClient),
  query: vi.fn(),
};

describe('Auth Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPoolSpy.mockReturnValue(mockPool);
    genSaltSpy.mockResolvedValue('mock-salt');
    hashSpy.mockResolvedValue('mock-hash');
    signSpy.mockReturnValue('mock-jwt-token');
  });

  describe('register', () => {
    it('should register a user successfully', async () => {
      const req = mockRequest({
        body: {
          user_id: 'john_doe',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          password: 'password123',
          phone: '123456789',
          role: 'user',
        },
      });
      const res = mockResponse();

      // Mock DB: user does not exist (rowCount = 0)
      mockPool.query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT id FROM users')) {
          return Promise.resolve({ rowCount: 0, rows: [] });
        }
        if (sql.includes('INSERT INTO users')) {
          return Promise.resolve({
            rowCount: 1,
            rows: [
              {
                id: 'user-uuid',
                user_id: 'john_doe',
                email: 'john@example.com',
                first_name: 'John',
                last_name: 'Doe',
                phone: '123456789',
                role: 'user',
              },
            ],
          });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 'user-uuid',
          user_id: 'john_doe',
          email: 'john@example.com',
          first_name: 'John',
          last_name: 'Doe',
          phone: '123456789',
          role: 'user',
        },
      });
    });

    it('should return 400 if user email or ID already exists', async () => {
      const req = mockRequest({
        body: {
          user_id: 'john_doe',
          email: 'john@example.com',
          password: 'password123',
        },
      });
      const res = mockResponse();

      // Mock DB: user exists (rowCount = 1)
      mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'existing-id' }] });

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User already exists',
      });
    });

    it('should return 500 on database error during registration', async () => {
      const req = mockRequest({
        body: {
          user_id: 'john_doe',
          email: 'john@example.com',
          password: 'password123',
        },
      });
      const res = mockResponse();

      mockPool.query.mockRejectedValueOnce(new Error('DB connection failed'));

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server error during registration',
      });
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const req = mockRequest({
        body: {
          email: 'john@example.com',
          password: 'password123',
        },
      });
      const res = mockResponse();

      const mockUser = {
        id: 'user-uuid',
        user_id: 'john_doe',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        password_hash: 'mock-hash',
        phone: '123456789',
        role: 'user',
      };

      // Mock DB: user found
      mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockUser] });
      // Mock bcrypt: password matches
      compareSpy.mockResolvedValueOnce(true);

      await authController.login(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        token: 'mock-jwt-token',
        user: {
          id: 'user-uuid',
          user_id: 'john_doe',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '123456789',
          role: 'user',
        },
      });
    });

    it('should return 401 if user email is not found', async () => {
      const req = mockRequest({
        body: {
          email: 'notfound@example.com',
          password: 'password123',
        },
      });
      const res = mockResponse();

      // Mock DB: user not found
      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials',
      });
    });

    it('should return 401 if password does not match', async () => {
      const req = mockRequest({
        body: {
          email: 'john@example.com',
          password: 'wrongpassword',
        },
      });
      const res = mockResponse();

      const mockUser = {
        id: 'user-uuid',
        email: 'john@example.com',
        password_hash: 'mock-hash',
      };

      // Mock DB: user found
      mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockUser] });
      // Mock bcrypt: password does not match
      compareSpy.mockResolvedValueOnce(false);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials',
      });
    });

    it('should return 500 on database error during login', async () => {
      const req = mockRequest({
        body: {
          email: 'john@example.com',
          password: 'password123',
        },
      });
      const res = mockResponse();

      mockPool.query.mockRejectedValueOnce(new Error('DB Connection down'));

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server error during login',
      });
    });
  });
});
