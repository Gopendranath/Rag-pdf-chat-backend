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

```tree
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

## � API Endpoints

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

### 1. Test with message only

```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello World!"}'
```

### 2. Test with files (multipart/form-data)

```bash
curl -X POST http://localhost:5000/api/chat \
  -F "message=Hello with files" \
  -F "images=@/path/to/image.jpg" \
  -F "documents=@/path/to/document.pdf"
```

### 3. Test upload endpoint

```bash
curl -X POST http://localhost:5000/api/upload-test \
  -F "files=@/path/to/any/file"
```

### 4. Get chat history

```bash
curl http://localhost:5000/api/chat/history
```

### 5. Health check

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

## 🗄️ Databases: PostgreSQL (pgvector) and MongoDB

This project can use a vector-enabled PostgreSQL (pgvector) for embeddings and MongoDB for document storage. Below are quick Docker commands to run both locally, plus a docker-compose example.

### PostgreSQL + pgvector (quick run)

Run the simple `ankane/pgvector` image (no persistent volume):

```bash
docker run --name pgvector -e POSTGRES_PASSWORD=password -p 5432:5432 ankane/pgvector

docker exec -it pgvector psql -U postgres -d vector_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

If you need to stop and remove an old container before starting a new one:

```bash
docker stop <old_container>
docker rm <old_container>
```

A more robust run with a named DB, credentials, and a persistent volume:

```bash
docker stop pgvector || true
docker rm pgvector || true

docker run -d \
  --name pgvector \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=vector_db \
  -v pg_data:/var/lib/postgresql/data \
  -p 5432:5432 \
  ankane/pgvector

# then create the extension (once):
docker exec -it pgvector psql -U postgres -d vector_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

Verify the extension exists:

```bash
docker exec -it pgvector psql -U postgres -d vector_db -c "\dx"
```

Connection string (example) for the app:

```ini
POSTGRES_URL=postgres://postgres:postgres@localhost:5432/vector_db
```

Notes:

- Use a Docker volume (as shown) for data persistence.
- If you run Postgres on a non-default host or port, update the connection string accordingly.
- Adjust memory and max_connections in Postgres config for production workloads.

### MongoDB (quick run)

Run a basic MongoDB container (no auth, good for local dev):

```bash
docker run -d --name mongodb -p 27017:27017 mongo:6.0
```

If you want a MongoDB with a root user and persistent volume:

```bash
docker stop mongodb || true
docker rm mongodb || true

docker run -d \
  --name mongodb \
  -e MONGO_INITDB_ROOT_USERNAME=root \
  -e MONGO_INITDB_ROOT_PASSWORD=example \
  -v mongo_data:/data/db \
  -p 27017:27017 \
  mongo:6.0
```

Connection string examples:

Without auth (dev):

```ini
MONGODB_URI=mongodb://localhost:27017/your_db_name
```

With auth:

```ini
MONGODB_URI=mongodb://root:example@localhost:27017/your_db_name?authSource=admin
```

### docker-compose example

Create a `docker-compose.yml` when you want both services together with volumes:

```yaml
version: '3.8'
services:
  pgvector:
    image: ankane/pgvector
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: vector_db
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data

  mongodb:
    image: mongo:6.0
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: example
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  pg_data:
  mongo_data:
```

After `docker-compose up -d`, create the pgvector extension once:

```bash
docker exec -it <compose_project>_pgvector_1 psql -U postgres -d vector_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Quick verification

- For Postgres: connect with psql or a DB client and run `\dx` or `SELECT * FROM pg_extension WHERE extname='vector';`.
- For MongoDB: connect with `mongosh` or a client and list databases: `show dbs`.

### App configuration notes

- Make sure your `.env` uses the correct connection strings shown above.
- If your Node app uses connection pooling, tune pool sizes to avoid too many Postgres connections.
- Keep credentials out of source control; use environment variables or a secrets manager.

## � Support

For issues or questions, please check the console logs for detailed error messages and file upload information.
