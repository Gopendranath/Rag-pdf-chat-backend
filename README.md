# RAG PDF Chat Backend - File Upload Implementation

This backend server provides comprehensive file upload functionality for handling images, documents, and messages in a chat application.

## 🚀 Features

- **Multiple File Upload**: Support for uploading multiple images and documents simultaneously
- **Message Arrays**: Handle single messages or arrays of messages
- **Flexible Message Format**: Support for plain text messages or structured message objects
- **File Type Validation**: Automatic validation and organization of uploaded files
- **Structured Storage**: Files are automatically organized into `uploads/images/` and `uploads/documents/` directories
- **Error Handling**: Comprehensive error handling with file cleanup on failure
- **CORS Support**: Configured for cross-origin requests
- **File Size Limits**: 10MB maximum file size per file
- **Static File Serving**: Uploaded files are served statically via `/uploads/*` endpoint

## 📁 File Structure

```
uploads/
├── images/          # Image files (JPEG, PNG, GIF, WebP, SVG)
├── documents/       # Document files (PDF, DOC, DOCX, TXT)
└── others/          # Other file types (if any)
```

## 🛠️ Supported File Types

### Images
- JPEG/JPG
- PNG
- GIF
- WebP
- SVG

### Documents
- PDF
- DOC (Microsoft Word)
- DOCX (Microsoft Word Open XML)
- TXT (Plain Text)

## 🔌 API Endpoints

### 1. Main Chat Endpoint
**POST** `/api/chat`

Handles chat messages with optional file uploads.

**Request Body (multipart/form-data):**
```javascript
{
  message: "Your chat message", // Optional single text message
  messages: ["Message 1", "Message 2"], // Optional array of messages
  messages: [{"content": "Hello", "type": "text"}, {"content": "Check this", "type": "text"}], // Optional array of message objects
  images: [File],             // Optional image files (max 10)
  documents: [File],          // Optional document files (max 5)
  files: [File]              // Optional general files (max 15)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Chat request processed successfully",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "messages": ["Hello with files", "Check out this document"],
  "messageCount": 2,
  "files": {
    "images": [
      {
        "filename": "images-1234567890-123456789.jpg",
        "originalname": "photo.jpg",
        "mimetype": "image/jpeg",
        "size": 1024000,
        "path": "uploads/images/images-1234567890-123456789.jpg",
        "url": "/uploads/images/images-1234567890-123456789.jpg"
      }
    ],
    "documents": [],
    "others": []
  },
  "fileCounts": {
    "total": 1,
    "images": 1,
    "documents": 0,
    "others": 0
  }
}
```

### 2. Upload Test Endpoint
**POST** `/api/upload-test`

Test endpoint for file uploads without chat functionality.

**Response:**
```json
{
  "success": true,
  "message": "Files uploaded successfully",
  "files": { /* uploaded files object */ },
  "body": { /* request body */ }
}
```

### 3. Chat History Endpoint
**GET** `/api/chat/history`

Retrieves chat history (placeholder implementation).

**Response:**
```json
{
  "success": true,
  "message": "Chat history endpoint",
  "data": []
}
```

### 4. Delete Chat Endpoint
**DELETE** `/api/chat/:chatId`

Deletes a specific chat (placeholder implementation).

**Response:**
```json
{
  "success": true,
  "message": "Chat 123 deleted successfully"
}
```

### 5. Health Check Endpoint
**GET** `/`

Server health check and endpoint documentation.

### 6. Static File Access
**GET** `/uploads/*`

Access uploaded files directly.

**Examples:**
- `/uploads/images/photo-1234567890.jpg`
- `/uploads/documents/document-1234567890.pdf`

## 🧪 Testing with cURL

### 1. Test with message only:
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello World!"}'
```

### 2. Test with files (multipart/form-data):
```bash
curl -X POST http://localhost:5000/api/chat \
  -F "message=Hello with files" \
  -F "images=@/path/to/image.jpg" \
  -F "documents=@/path/to/document.pdf"
```

### 3. Test upload endpoint:
```bash
curl -X POST http://localhost:5000/api/upload-test \
  -F "files=@/path/to/any/file"
```

### 4. Get chat history:
```bash
curl http://localhost:5000/api/chat/history
```

### 5. Health check:
```bash
curl http://localhost:5000/
```

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **For development with auto-reload:**
   ```bash
   npm run dev
   ```

4. **Test the functionality:**
   ```bash
   node test-upload.js
   ```

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

## 🔒 Security Features

- File type validation to prevent malicious uploads
- File size limits (10MB per file)
- Automatic file cleanup on errors
- CORS configuration for secure cross-origin requests

## 📝 Error Handling

The system provides detailed error messages for various scenarios:

- **File too large**: When file exceeds 10MB limit
- **Unsupported file type**: When file type is not allowed
- **Too many files**: When file count exceeds limits
- **Upload errors**: General upload failures with cleanup

## 🛠️ Development Notes

- Files are stored with unique names to prevent conflicts
- Directory structure is created automatically
- All file operations include proper error handling
- Static file serving is configured for easy access to uploads

## 📞 Support

For issues or questions, please check the console logs for detailed error messages and file upload information.