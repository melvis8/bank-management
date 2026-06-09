const db = require('../src/config/database');

// Spy on methods
const getPoolSpy = vi.spyOn(db, 'getPool');

const { mockRequest, mockResponse } = require('./helpers');
const bankController = require('../src/controllers/bankController');

// Define mock DB pool and client
const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};
const mockPool = {
  connect: vi.fn().mockResolvedValue(mockClient),
  query: vi.fn(),
};

describe('Bank Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPoolSpy.mockReturnValue(mockPool);
  });

  describe('getAllBanks', () => {
    it('should return a list of banks sorted by name', async () => {
      const req = mockRequest();
      const res = mockResponse();

      const mockBanks = [
        { id: 'bank-1', name: 'ECOBANK', code: 'ECOBANK', type: 'bank' },
        { id: 'bank-2', name: 'UBA', code: 'UBA', type: 'bank' },
      ];
      mockPool.query.mockResolvedValueOnce({ rows: mockBanks });

      await bankController.getAllBanks(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockBanks,
      });
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY name ASC'));
    });

    it('should return 500 on database error', async () => {
      const req = mockRequest();
      const res = mockResponse();

      mockPool.query.mockRejectedValueOnce(new Error('Query error'));

      await bankController.getAllBanks(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error fetching banks',
      });
    });
  });

  describe('getBankById', () => {
    it('should return bank details if found', async () => {
      const req = mockRequest({ params: { id: 'bank-uuid' } });
      const res = mockResponse();

      const mockBank = { id: 'bank-uuid', name: 'ECOBANK', code: 'ECOBANK', type: 'bank' };
      mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockBank] });

      await bankController.getBankById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockBank,
      });
    });

    it('should return 404 if bank not found', async () => {
      const req = mockRequest({ params: { id: 'nonexistent-uuid' } });
      const res = mockResponse();

      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await bankController.getBankById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Bank not found',
      });
    });

    it('should return 500 on database error', async () => {
      const req = mockRequest({ params: { id: 'bank-uuid' } });
      const res = mockResponse();

      mockPool.query.mockRejectedValueOnce(new Error('Query error'));

      await bankController.getBankById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error fetching bank',
      });
    });
  });

  describe('createBank (Admin)', () => {
    it('should create a bank successfully', async () => {
      const req = mockRequest({
        body: { name: 'MTN Mobile Money', code: 'MOMO', type: 'mobile_money' },
      });
      const res = mockResponse();

      const mockBank = { id: 'bank-uuid', name: 'MTN Mobile Money', code: 'MOMO', type: 'mobile_money' };
      mockPool.query.mockResolvedValueOnce({ rows: [mockBank] });

      await bankController.createBank(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockBank,
      });
    });

    it('should return 400 if name or code is missing', async () => {
      const req = mockRequest({
        body: { name: 'MTN Mobile Money' }, // missing code
      });
      const res = mockResponse();

      await bankController.createBank(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Name and code required',
      });
    });

    it('should return 400 if bank code already exists (23505 constraint error)', async () => {
      const req = mockRequest({
        body: { name: 'UBA Bank', code: 'UBA' },
      });
      const res = mockResponse();

      const dbError = new Error('Duplicate key');
      dbError.code = '23505';
      mockPool.query.mockRejectedValueOnce(dbError);

      await bankController.createBank(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Bank code already exists',
      });
    });

    it('should return 500 on other database errors', async () => {
      const req = mockRequest({
        body: { name: 'UBA Bank', code: 'UBA' },
      });
      const res = mockResponse();

      mockPool.query.mockRejectedValueOnce(new Error('Connection failure'));

      await bankController.createBank(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error creating bank',
      });
    });
  });

  describe('updateBank (Admin)', () => {
    it('should update bank successfully if found', async () => {
      const req = mockRequest({
        params: { id: 'bank-uuid' },
        body: { name: 'UBA Cameroon' },
      });
      const res = mockResponse();

      const mockUpdatedBank = { id: 'bank-uuid', name: 'UBA Cameroon', code: 'UBA', type: 'bank' };
      mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockUpdatedBank] });

      await bankController.updateBank(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedBank,
      });
    });

    it('should return 404 if bank not found for update', async () => {
      const req = mockRequest({
        params: { id: 'nonexistent-uuid' },
        body: { name: 'UBA Cameroon' },
      });
      const res = mockResponse();

      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await bankController.updateBank(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Bank not found',
      });
    });

    it('should return 500 on database error during update', async () => {
      const req = mockRequest({
        params: { id: 'bank-uuid' },
        body: { name: 'UBA Cameroon' },
      });
      const res = mockResponse();

      mockPool.query.mockRejectedValueOnce(new Error('Update failed'));

      await bankController.updateBank(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error updating bank',
      });
    });
  });

  describe('deleteBank (Admin)', () => {
    it('should delete bank successfully if found', async () => {
      const req = mockRequest({ params: { id: 'bank-uuid' } });
      const res = mockResponse();

      mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'bank-uuid' }] });

      await bankController.deleteBank(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Bank deleted successfully',
      });
    });

    it('should return 404 if bank not found for delete', async () => {
      const req = mockRequest({ params: { id: 'nonexistent-uuid' } });
      const res = mockResponse();

      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await bankController.deleteBank(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Bank not found',
      });
    });

    it('should return 500 on database error (e.g. check for active accounts constraint)', async () => {
      const req = mockRequest({ params: { id: 'bank-uuid' } });
      const res = mockResponse();

      mockPool.query.mockRejectedValueOnce(new Error('Foreign key violation'));

      await bankController.deleteBank(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error deleting bank. Check if it has active accounts.',
      });
    });
  });
});
