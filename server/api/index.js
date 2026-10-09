import app from '../app.js';
import { connectDatabase } from '../src/infrastructure/database/connection.js';

export default async function handler(req, res) {
  // Support preflight OPTIONS immediately to avoid connection delays
  const origin = req.headers?.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Request-ID, x-organization-id, X-Organization-ID, Accept, Cache-Control, X-Requested-With'
    );
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    await connectDatabase();
    return app(req, res);
  } catch (error) {
    console.error('Vercel Serverless Gateway Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database connection or serverless execution failed',
      error: error.message,
    });
  }
}
