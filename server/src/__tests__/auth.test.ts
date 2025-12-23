import './db.mock';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db';

const mockedQuery = query as jest.MockedFunction<typeof query>;

describe('Auth API', () => {
  let app: express.Application;

  beforeAll(async () => {
    const { default: appInstance } = await import('../index');
    app = appInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/signup', () => {
    it('should create a new user successfully', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@example.com' }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const response = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('email', 'test@example.com');
    });

    it('should reject signup with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing fields');
    });

    it('should handle database errors (user exists)', async () => {
      mockedQuery.mockRejectedValueOnce(new Error('Duplicate key'));

      const response = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'existing@example.com', password: 'password123' });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'User likely exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      mockedQuery.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@example.com', password_hash: hashedPassword }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should reject invalid credentials', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as any);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrong@example.com', password: 'wrong' });

      expect(response.status).toBe(401);
    });
  });
});
