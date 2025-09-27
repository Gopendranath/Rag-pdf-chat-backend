import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import "dotenv/config";
import path from "path";
import pkg from "pg";

const { Pool } = pkg;

// -----------------------------
// Step 0: Check API Key
// -----------------------------
if (!process.env.GEMINI_API_KEY) {
    throw new Error("ERROR: GEMINI_API_KEY is not set in .env");
}

// -----------------------------
// Step 1: Initialize PostgreSQL Pool
// -----------------------------
const pool = new Pool({
    connectionString:
        process.env.DATABASE_URL ||
        "postgresql://postgres:postgres@localhost:5432/vector_db",
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// -----------------------------
// Step 2: Initialize Embeddings
// -----------------------------
const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    modelName: "gemini-embedding-001",
});

// -----------------------------
// Step 3: Define PDF Directory
// -----------------------------
const pdfPath = path.join(`${process.cwd()}/uploads/documents`);

// -----------------------------
// Utility: Logger with levels
// -----------------------------
const logger = {
    info: (message, data = null) => {
        console.log(`ℹ️  ${message}`, data ? JSON.stringify(data, null, 2) : '');
    },
    error: (message, error = null) => {
        console.error(`❌ ${message}`, error ? error.message : '');
    },
    success: (message, data = null) => {
        console.log(`✅ ${message}`, data ? JSON.stringify(data, null, 2) : '');
    },
    debug: (message, data = null) => {
        if (process.env.DEBUG) {
            console.debug(`🔍 ${message}`, data ? JSON.stringify(data, null, 2) : '');
        }
    }
};

// -----------------------------
// Step 4: Load PDFs
// -----------------------------
const loadPDFs = async (dirPath) => {
    try {
        const loader = new DirectoryLoader(dirPath, {
            ".pdf": (p) => new PDFLoader(p),
        });
        const rawDocs = await loader.load();
        logger.info(`Loaded ${rawDocs.length} PDF documents`);
        return rawDocs;
    } catch (error) {
        logger.error("Failed to load PDFs", error);
        throw error;
    }
};

// -----------------------------
// Step 5: Split Documents
// -----------------------------
const splitDocuments = async (rawDocs) => {
    try {
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const splits = await splitter.splitDocuments(rawDocs);
        logger.info(`Split documents into ${splits.length} chunks`);
        return splits;
    } catch (error) {
        logger.error("Failed to split documents", error);
        throw error;
    }
};

// -----------------------------
// Step 6: Embed Chunks
// -----------------------------
const embedChunks = async (chunks) => {
    try {
        const texts = chunks.map((c) => c.pageContent);
        logger.info(`Generating embeddings for ${texts.length} chunks`);
        
        const vectors = await embeddings.embedDocuments(texts);
        
        const embeddedChunks = chunks.map((chunk, idx) => ({
            content: chunk.pageContent.slice(0, 200),
            metadata: chunk.metadata || {},
            vector: vectors[idx],
        }));
        
        logger.success("Embeddings generated successfully");
        return embeddedChunks;
    } catch (error) {
        logger.error("Failed to embed chunks", error);
        throw error;
    }
};

// -----------------------------
// Step 7: Format vector for pgvector
// -----------------------------
const formatVector = (vector) => `[${vector.join(",")}]`;

// -----------------------------
// Step 8: Store in PostgreSQL
// -----------------------------
const storeVectors = async (embeddedChunks) => {
    try {
        // Create table with 3072 dimensions and metadata column
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pdf_vectors (
                id SERIAL PRIMARY KEY,
                content TEXT,
                metadata JSONB,
                embedding VECTOR(3072)
            );
        `);

        logger.info(`Storing ${embeddedChunks.length} vectors in database`);

        for (const chunk of embeddedChunks) {
            const vectorStr = formatVector(chunk.vector);
            await pool.query(
                "INSERT INTO pdf_vectors (content, metadata, embedding) VALUES ($1, $2, $3)",
                [chunk.content, chunk.metadata, vectorStr]
            );
        }

        logger.success("All chunks stored in PostgreSQL vector table");
    } catch (error) {
        logger.error("Failed to store vectors in database", error);
        throw error;
    }
};

// -----------------------------
// Step 9: Retrieve similar documents
// -----------------------------
const retrieveSimilar = async (queryText, topK = 2) => {
    try {
        logger.info(`Searching for similar documents: "${queryText}"`, { topK });

        // Get embedding for query
        const queryVector = await embeddings.embedQuery(queryText);
        const vectorStr = formatVector(queryVector);

        // Query PostgreSQL for top-k similar vectors
        const res = await pool.query(
            `SELECT id, content, metadata, embedding <-> $1 AS distance
             FROM pdf_vectors
             ORDER BY distance
             LIMIT $2`,
            [vectorStr, topK]
        );

        logger.success(`Found ${res.rows.length} similar documents`);
        
        // Log distances for debugging
        logger.debug("Search distances:", 
            res.rows.map((row, idx) => `${idx + 1}. ${row.distance.toFixed(4)}`));

        return {
            context: res.rows.map(row => row.content).join("\n\n"),
            results: res.rows,
            count: res.rows.length,
            success: true
        };
    } catch (error) {
        logger.error("Error retrieving similar vectors", error);
         return { 
            context: "", 
            results: [], 
            count: 0, 
            success: false,
            error: error.message 
        };
    }
};

// -----------------------------
// Retrieve all stored PDFs
// -----------------------------
const retrieveAllDocs = async () => {
    try {
        logger.info("Retrieving all stored documents");
        
        const res = await pool.query(
            "SELECT id, content, metadata FROM pdf_vectors ORDER BY id"
        );

        logger.success(`Retrieved ${res.rows.length} documents`);
        
        return {
            documents: res.rows,
            count: res.rows.length,
            content: res.rows.map(row => row.content).join("\n\n")
        };
    } catch (error) {
        logger.error("Error retrieving documents", error);
        return { documents: [], count: 0, content: "", error: error.message };
    }
};

// -----------------------------
// Clear all stored PDF vectors
// -----------------------------
const clearAllData = async () => {
    try {
        logger.info("Clearing all vector data");
        
        await pool.query("TRUNCATE TABLE pdf_vectors");
        
        logger.success("All data cleared successfully");
        return { 
            success: true, 
            message: "All data in pdf_vectors cleared successfully" 
        };
    } catch (error) {
        logger.error("Error clearing data", error);
        return { 
            success: false, 
            message: "Error clearing data", 
            error: error.message 
        };
    }
};

// -----------------------------
// Create vectors and retrieve
// -----------------------------
const createThenRetrieve = async (query, topK = 3) => {
    try {
        logger.info("Starting create-then-retrieve pipeline", { query, topK });

        const docs = await loadPDFs(pdfPath);
        const splits = await splitDocuments(docs);
        const embeddedChunks = await embedChunks(splits);
        await storeVectors(embeddedChunks);
        
        const results = await retrieveSimilar(query, topK);
        
        logger.success("Create-then-retrieve pipeline completed");
        return results;
    } catch (error) {
        logger.error("Create-then-retrieve pipeline failed", error);
        return { 
            context: "", 
            results: [], 
            count: 0, 
            error: error.message 
        };
    }
};

// -----------------------------
// Health check function
// -----------------------------
const checkDatabaseHealth = async () => {
    try {
        const res = await pool.query("SELECT COUNT(*) as count FROM pdf_vectors");
        const count = parseInt(res.rows[0].count);
        logger.info("Database health check", { documentCount: count });
        return { healthy: true, documentCount: count };
    } catch (error) {
        logger.error("Database health check failed", error);
        return { healthy: false, error: error.message };
    }
};

export const functionMap = {
    retrieveSimilar,
    retrieveAllDocs,
    createThenRetrieve,
    clearAllData,
    checkDatabaseHealth
};