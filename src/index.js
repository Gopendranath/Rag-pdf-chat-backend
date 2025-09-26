import express from "express";
import 'dotenv/config';
import cors from 'cors';
import corsOptions from './configs/cors.config.js';
import apiRouter from './routes/api.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from "./configs/db.config.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/api', apiRouter);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'RAG PDF Chat Backend is running!',
    version: '1.0.0',
    endpoints: {
      chat: '/api/chat (POST)',
      chatHistory: '/api/chat/history (GET)',
      deleteChat: '/api/chat/:chatId (DELETE)',
      uploadTest: '/api/upload-test (POST)',
      uploads: '/uploads/* (GET - serve uploaded files)'
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  if (err.code === 'ENOENT') {
    return res.status(404).json({
      success: false,
      error: 'Resource not found'
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});



app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await connectDB();
  console.log(`📁 Uploads directory: ${path.join(__dirname, '../uploads')}`);
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});
