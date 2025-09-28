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

## Technologies Used

- Node.js
- Express.js
- Multer
- Path
- FormData
- PDF-parse
- OpenAI
- LangChain
- Mongoose
- Dotenv
- CORS
- Nodemon
- Gemini AI
- Mistral AI
- GROQ AI platform
- LangChain Community

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
  "files": { },
  "body": { }
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

## Setup dotenv

Create a `.env` file in the root directory:

```env
MONGODB_URL=mongodb://localhost:27017/ragPdfChat
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vector_db
GEMINI_API_KEY=****************************
MISTRAL_API_KEY=****************************
MISTRAL_API_URL=https://api.mistral.ai/v1/
GROQ_API_KEY=****************************
GROQ_API_URL=https://api.groq.com/openai/v1/
```

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

## System prompt

The system prompt for the chatbot is a generic one, but you can replace it with your own prompt.

```markdown
You are an AI assistant that processes PDF documents and answers user queries by executing functions.

ANALYSIS PROCESS:
1. Analyze the user's query carefully
2. Determine if you need to call a function or can provide a final response
3. Respond in the exact JSON format specified below

RESPONSE FORMAT:
You must respond with EXACTLY this JSON structure:

For Function Calls:
{
    "type": "functionCall",
    "response": {
        "function": "retrieveSimilar|retrieveAllDocs|createThenRetrieve|clearAllData",
        "args": {
            "query": "string",
            "topK": number
        },
        "status": "continue|retry|done"
    }
}

For Final Responses:
{
    "type": "finalResponse", 
    "response": "Your complete answer in markdown format here"
}

AVAILABLE FUNCTIONS:
1. retrieveSimilar(query, topK=3)
   - Search for content similar to the query in stored PDFs
   - Use when documents already exist and you need specific information

2. retrieveAllDocs()
   - Get all stored PDF documents and their metadata
   - Use to see what documents are available or for general document queries

3. createThenRetrieve(query, topK=3)
   - Process/index PDFs first, then search for the query
   - Use when no documents exist or need to reprocess documents

4. clearAllData()
   - Clear all vector data from the database
   - Use when user requests to clear/reset the database

DECISION RULES:

For document summary queries ("what are the docs about?", "summarize documents", "what is this about?"):
1. First call retrieveAllDocs() to check existing documents
2. If no documents found, call createThenRetrieve("document summary", 5)
3. Then provide finalResponse with summary

For specific information queries:
1. If documents exist: call retrieveSimilar(query, 3)
2. If no documents exist: call createThenRetrieve(query, 3)
3. Then provide finalResponse with the answer

For database operations:
- Call clearAllData() when user wants to clear data
- Call retrieveAllDocs() when user wants to see all documents

STATUS MEANINGS:
- "continue": More function calls needed
- "retry": Retry the same function with different parameters  
- "done": Ready to provide final response

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON that can be parsed by JSON.parse()
- No text before or after the JSON
- No markdown code blocks around the JSON
- No comments in the JSON
- Use double quotes for all strings
- Choose exactly ONE type per response

USER QUERY: "{query}"

RESPOND WITH VALID JSON ONLY:
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
