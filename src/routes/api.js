import express from 'express';
import { handleChat, getChatHistory, deleteChat, saveChatHistory, getChatbyID } from '../controllers/api.controller.js';
import { constFileImageUploads, handleMulterError } from '../middlewares/upload.middleware.js';

const router = express.Router();

// Chat routes with file upload support
router.post('/chat', constFileImageUploads, handleMulterError, handleChat);
router.get('/chat/history', getChatHistory);
router.delete('/chat/:chatId', deleteChat);
router.post('/chat/history', saveChatHistory);
router.get('/chat/:chatId', getChatbyID);

// Test route for file upload
router.post('/upload-test', constFileImageUploads, handleMulterError, (req, res) => {
  res.json({
    success: true,
    message: 'Files uploaded successfully',
    files: req.files,
    body: req.body
  });
});

// Serve uploaded files statically
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

export default router;
