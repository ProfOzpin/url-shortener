import { Pool } from 'pg';

// Mock the entire db module
jest.mock('../db', () => {
  const mockQuery = jest.fn();
  const mockInitDB = jest.fn().mockResolvedValue(undefined);
  
  return {
    query: mockQuery,
    initDB: mockInitDB,
  };
});
