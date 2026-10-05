import app from '../app.js';
import { connectDatabase } from '../src/infrastructure/database/connection.js';

export default async function handler(req, res) {
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
