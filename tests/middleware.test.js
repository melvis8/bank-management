const jwt = require('jsonwebtoken');
// Setup spy on jwt.verify
const verifySpy = vi.spyOn(jwt, 'verify');

const { mockRequest, mockResponse, mockNext } = require('./helpers');
const { protect, admin } = require('../src/middleware/authMiddleware');

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('protect', () => {
    it('should authenticate successfully with a valid Bearer token', () => {
      const req = mockRequest({
        headers: {
          authorization: 'Bearer valid-jwt-token',
        },
      });
      const res = mockResponse();
      const next = mockNext();

      const mockUserDecoded = { id: 'user-uuid', email: 'test@user.com', role: 'user' };
      verifySpy.mockReturnValue(mockUserDecoded);

      protect(req, res, next);

      expect(verifySpy).toHaveBeenCalledWith('valid-jwt-token', expect.any(String));
      expect(req.user).toEqual(mockUserDecoded);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 if no authorization header is provided', () => {
      const req = mockRequest({
        headers: {}, // no authorization
      });
      const res = mockResponse();
      const next = mockNext();

      protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'UNAUTHORIZED',
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is not starting with Bearer', () => {
      const req = mockRequest({
        headers: {
          authorization: 'Basic credentials-here',
        },
      });
      const res = mockResponse();
      const next = mockNext();

      protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token validation throws an error', () => {
      const req = mockRequest({
        headers: {
          authorization: 'Bearer expired-or-invalid-token',
        },
      });
      const res = mockResponse();
      const next = mockNext();

      verifySpy.mockImplementation(() => {
        throw new Error('Token expired');
      });

      protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Not authorized, token failed',
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('admin', () => {
    it('should pass if user role is admin', () => {
      const req = mockRequest({
        user: { id: 'admin-uuid', role: 'admin' },
      });
      const res = mockResponse();
      const next = mockNext();

      admin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 if user role is user (not admin)', () => {
      const req = mockRequest({
        user: { id: 'user-uuid', role: 'user' },
      });
      const res = mockResponse();
      const next = mockNext();

      admin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'FORBIDDEN',
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if req.user is undefined', () => {
      const req = mockRequest({
        user: null,
      });
      const res = mockResponse();
      const next = mockNext();

      admin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
