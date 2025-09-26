import fs from 'fs';
import path from 'path';

/**
 * Get file information from uploaded files
 * @param {Array} files - Array of uploaded files from multer
 * @returns {Array} Array of file information objects
 */
export const getFileInfo = (files) => {
  if (!files || !Array.isArray(files)) return [];
  
  return files.map(file => ({
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    url: `/uploads/${path.basename(path.dirname(file.path))}/${file.filename}`
  }));
};

/**
 * Organize files by type (images, documents, others)
 * @param {Object} files - Files object from multer (req.files)
 * @returns {Object} Organized files by type
 */
export const organizeFilesByType = (files) => {
  const organized = {
    images: [],
    documents: [],
    others: []
  };

  if (!files) return organized;

  // Handle different field names
  const allFiles = [];
  
  if (files.images) allFiles.push(...files.images);
  if (files.documents) allFiles.push(...files.documents);
  if (files.files) allFiles.push(...files.files);

  allFiles.forEach(file => {
    const fileInfo = {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      url: `/uploads/${path.basename(path.dirname(file.path))}/${file.filename}`
    };

    if (file.mimetype.startsWith('image/')) {
      organized.images.push(fileInfo);
    } else if (file.mimetype === 'application/pdf' || 
               file.mimetype === 'application/msword' ||
               file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
               file.mimetype === 'text/plain') {
      organized.documents.push(fileInfo);
    } else {
      organized.others.push(fileInfo);
    }
  });

  return organized;
};

/**
 * Validate file types
 * @param {Array} files - Array of files to validate
 * @returns {Object} Validation result
 */
export const validateFiles = (files) => {
  const errors = [];
  const validFiles = [];

  if (!files || !Array.isArray(files)) {
    return { valid: false, errors: ['No files provided'], validFiles: [] };
  }

  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  const allowedDocumentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  files.forEach(file => {
    if (file.size > maxFileSize) {
      errors.push(`File ${file.originalname} exceeds 10MB limit`);
    } else if (!allowedImageTypes.includes(file.mimetype) && !allowedDocumentTypes.includes(file.mimetype)) {
      errors.push(`File ${file.originalname} has unsupported type: ${file.mimetype}`);
    } else {
      validFiles.push(file);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    validFiles
  };
};

/**
 * Clean up uploaded files in case of error
 * @param {Array} files - Array of files to delete
 */
export const cleanupFiles = (files) => {
  if (!files || !Array.isArray(files)) return;

  files.forEach(file => {
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (error) {
      console.error(`Error deleting file ${file.path}:`, error.message);
    }
  });
};

/**
 * Get file statistics
 * @param {String} filePath - Path to the file
 * @returns {Object} File statistics
 */
export const getFileStats = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isFile: stats.isFile()
    };
  } catch (error) {
    return null;
  }
};