/**
 * Creates a mock Express request object.
 */
const mockRequest = (overrides = {}) => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides,
  };
};

/**
 * Creates a mock Express response object.
 */
const mockResponse = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  return res;
};

/**
 * Creates a mock Express next function.
 */
const mockNext = () => vi.fn();

module.exports = {
  mockRequest,
  mockResponse,
  mockNext,
};
