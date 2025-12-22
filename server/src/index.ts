import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import { query, initDB } from './db';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters long');
}
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(express.json());

// Types
interface AuthRequest extends Request {
  user?: { id: number; email: string };
}

// Auth Middeware
const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes

app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing fields" });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "User likely exists" });
  }
});


const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many attempts, please try again later'
});


app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0 || !(await bcrypt.compare(password, result.rows[0].password_hash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];
    if (await bcrypt.compare(password, user.password_hash)) {
      const token = jwt.sign(
        { id: user.id, email: user.email }, 
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      res.json({ token });
    } else {
      res.status(403).json({ error: "Invalid credentials" });
    }
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.post('/api/shorten', authenticateToken, async (req: AuthRequest, res) => {
  const { url } = req.body;
  const userId = req.user?.id;

  // Basic Validation
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: "Invalid URL format" });
  }

  // Generate random 6-char code
  const shortCode = crypto.randomBytes(4).toString('hex').slice(0, 6);

  try {
    const result = await query(
      'INSERT INTO urls (user_id, original_url, short_code) VALUES ($1, $2, $3) RETURNING *',
      [userId, url, shortCode]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.get('/api/urls', authenticateToken, async (req: AuthRequest, res) => {
    const userId = req.user?.id;
    try {
        const result = await query(
            'SELECT * FROM urls WHERE user_id = $1 ORDER BY created_at DESC', 
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Fetch error" });
    }
});

// ADVANCED ANALYTICS ENDPOINT
app.get('/api/analytics/:url_id', authenticateToken, async (req: AuthRequest, res) => {
  const { url_id } = req.params;
  const userId = req.user?.id;

  try {
    // Security: ensure URL belongs to user
    const verify = await query('SELECT id FROM urls WHERE id = $1 AND user_id = $2', [url_id, userId]);
    if (verify.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Proxy to Python AI service (which already has /analytics/{url_id})
    const response = await axios.get(
      `${AI_SERVICE_URL}/analytics/${url_id}`,
      { timeout: 10000 }
    );

    res.json(response.data);
  } catch (err) {
    console.error('Advanced analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// GRAPH-SPECIFIC AI OVERVIEW
app.post('/api/ai/graph-insight', authenticateToken, async (req: AuthRequest, res) => {
  const { url_id, graph_type } = req.body;
  const userId = req.user?.id;

  if (!url_id || !graph_type) {
    return res.status(400).json({ error: 'Missing url_id or graph_type' });
  }

  try {
    const verify = await query('SELECT id FROM urls WHERE id = $1 AND user_id = $2', [url_id, userId]);
    if (verify.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const response = await axios.post(
      `${AI_SERVICE_URL}/ai/graph-insight`,
      { url_id, graph_type },
      { timeout: 20000 }
    );

    res.json(response.data);
  } catch (err) {
    console.error('Graph insight AI error:', err);
    res.status(500).json({ error: 'Failed to generate graph insight' });
  }
});

// Advanced analytics chat endpoint
app.post('/api/ai/chat', authenticateToken, async (req: AuthRequest, res) => {
  const { url_id, message, context } = req.body;
  const userId = req.user?.id;

  if (!url_id || !message) {
    return res.status(400).json({ error: 'Missing url_id or message' });
  }

  try {
    const verify = await query('SELECT id FROM urls WHERE id = $1 AND user_id = $2', [url_id, userId]);
    if (verify.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const response = await axios.post(
      `${AI_SERVICE_URL}/ai/chat`,
      { url_id, message, context: context || 'general' },
      { timeout: 20000 }
    );

    res.json(response.data);
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

app.get('/:code', async (req, res) => {
  const { code } = req.params;

  try {
    const result = await query('SELECT id, original_url FROM urls WHERE short_code = $1', [code]);
    
    if (result.rows.length > 0) {
      const { id, original_url } = result.rows[0];

      // Redirect immediately (FR-03.1)
      res.redirect(original_url);

      // ASYNC LOGGING
      // We do not await this, so it doesn't slow down the redirect
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';
      const referer = req.headers['referer'] || '';
      
      // Simple hash for privacy
      const ipHash = crypto.createHash('sha256').update(String(ip)).digest('hex');

      query(
        'INSERT INTO visits (url_id, visitor_ip_hash, user_agent, referer) VALUES ($1, $2, $3, $4)',
        [id, ipHash, userAgent, referer]
      ).catch(err => console.error("Logging error:", err));

    } else {
      res.status(404).send("URL not found");
    }
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

const insightLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10 // 10 AI calls per minute
});

app.post('/api/insight', authenticateToken, insightLimiter, async (req: AuthRequest, res) => {
    const { url_id } = req.body;
    const userId = req.user?.id;

    if (!url_id) return res.status(400).json({ error: "Missing url_id" });

    try {
        const verify = await query('SELECT id FROM urls WHERE id = $1 AND user_id = $2', [url_id, userId]);
        if (verify.rows.length === 0) {
            return res.status(403).json({ error: "Unauthorized access to this URL stats" });
        }

        const response = await axios.post(`${AI_SERVICE_URL}/ai/insight`, {
            url_id: url_id
        });

        res.json(response.data);

    } catch (err) {
        console.error("AI Service Error:", err);
        res.status(500).json({ error: "Failed to generate insights" });
    }
});

// Start Server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
