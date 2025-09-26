import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure storage for different file types
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    // Determine destination based on file type
    if (file.mimetype.startsWith('image/')) {
      uploadPath += 'images/';
    } else if (file.mimetype === 'application/pdf' || 
               file.mimetype === 'application/msword' ||
               file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
               file.mimetype === 'text/plain') {
      uploadPath += 'documents/';
    } else {
      uploadPath += 'others/';
    }

    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for validation
const fileFilter = (req, file, cb) => {
  // Accept images and common document types
  const allowedImageTypes = /jpeg|jpg|png|gif|webp|svg/;
  const allowedDocumentTypes = /pdf|doc|docx|txt/;
  
  const extname = path.extname(file.originalname).toLowerCase().substring(1);
  const mimetype = file.mimetype;

  if (mimetype.startsWith('image/') && allowedImageTypes.test(extname)) {
    return cb(null, true);
  } else if ((mimetype === 'application/pdf' || 
              mimetype === 'application/msword' ||
              mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
              mimetype === 'text/plain') && allowedDocumentTypes.test(extname)) {
    return cb(null, true);
  } else {
    cb(new Error('Only images (JPEG, JPG, PNG, GIF, WebP, SVG) and documents (PDF, DOC, DOCX, TXT) are allowed!'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// Middleware for handling multiple file uploads
export const constFileImageUploads = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'documents', maxCount: 5 },
  { name: 'files', maxCount: 15 } // General files field
]);

// Error handling middleware for multer
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files uploaded.' });
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected field name.' });
    }
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};