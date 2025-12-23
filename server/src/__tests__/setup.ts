// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-minimum-32-chars-long';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.AI_SERVICE_URL = 'http://localhost:8001';