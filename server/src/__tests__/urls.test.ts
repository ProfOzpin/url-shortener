import './db.mock';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

const mockedQuery = query as jest.MockedFunction<typeof query>;

describe('URL Shortening API', () => {
  let app: express.Application;
  let authToken: string;

  beforeAll(async () => {
    const { default: appInstance } = await import('../index');
    app = appInstance;
    
    authToken = jwt.sign(
      { id: 1, email: 'test@example.com' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/shorten', () => {
    it('should shorten a valid URL with protocol', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          user_id: 1,
          original_url: 'https://example.com',
          short_code: 'abc123',
          created_at: new Date(),
        }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const response = await request(app)
        .post('/api/shorten')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ url: 'https://example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('short_code');
    });

    it('should auto-prepend https:// for URLs without protocol', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [{
          id: 2,
          user_id: 1,
          original_url: 'https://reddit.com',
          short_code: 'xyz789',
          created_at: new Date(),
        }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const response = await request(app)
        .post('/api/shorten')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ url: 'reddit.com' });

      expect(response.status).toBe(200);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/shorten')
        .send({ url: 'https://example.com' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/urls', () => {
    it('should fetch user URLs', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, original_url: 'https://example.com', short_code: 'abc123', created_at: new Date() },
        ],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const response = await request(app)
        .get('/api/urls')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /:code (redirect)', () => {
    it('should redirect to original URL', async () => {
      mockedQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, original_url: 'https://example.com' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          command: 'INSERT',
          rowCount: 1,
          oid: 0,
          fields: [],
        } as any);

      const response = await request(app)
        .get('/abc123')
        .redirects(0);

      expect(response.status).toBe(302);
      expect(response.header.location).toBe('https://example.com');
    });

    it('should return 404 for non-existent code', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as any);

      const response = await request(app).get('/nonexistent');

      expect(response.status).toBe(404);
    });
  });
});
