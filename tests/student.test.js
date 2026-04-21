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
  };
  return {
    getPool: jest.fn(() => mPool),
    initializeDatabase: jest.fn(),
  };
});

describe('Student API CRUD', () => {
  let mockClient;

  beforeEach(async () => {
    mockClient = await getPool().connect();
    jest.clearAllMocks();
  });

  describe('POST /api/students', () => {
    it('should create a new student', async () => {
      const newStudent = {
        student_id: 'MAT123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      };

      mockClient.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ ...newStudent, id: 'uuid-123', account_number: 'BMS-123', balance: 0 }],
      });

      const res = await request(app)
        .post('/api/students')
        .send(newStudent);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.student_id).toBe('MAT123');
    });

    it('should return 400 if validation fails', async () => {
      const res = await request(app)
        .post('/api/students')
        .send({ first_name: 'John' }); // Missing fields

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/students', () => {
    it('should return a list of students', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // Count query
        .mockResolvedValueOnce({ rows: [{ id: 'uuid-1', first_name: 'John' }] }); // List query

      const res = await request(app).get('/api/students');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('PUT /api/students/:id', () => {
    it('should update a student', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rowCount: 1 }) // Check existence
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'uuid-1', first_name: 'Johnny' }] }); // Update

      const res = await request(app)
        .put('/api/students/uuid-1')
        .send({ first_name: 'Johnny' });

      expect(res.status).toBe(200);
      expect(res.body.data.first_name).toBe('Johnny');
    });
  });

  describe('DELETE /api/students/:id', () => {
    it('should delete a student', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      const res = await request(app).delete('/api/students/uuid-1');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
    });
  });
});
