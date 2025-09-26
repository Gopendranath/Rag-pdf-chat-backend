import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import path from "path";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;

// -----------------------------
// Step 0: Check API Key
// -----------------------------
if (!process.env.GEMINI_API_KEY) {
    console.error("ERROR: GEMINI_API_KEY is not set in .env");
    process.exit(1);
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

const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: process.env.GROQ_API_URL,
});

// -----------------------------
// Step 3: Define PDF Directory
// -----------------------------
const pdfPath = path.join(`${process.cwd()}/uploads/documents`);

// -----------------------------
// Step 4: Load PDFs
// -----------------------------
const loadPDFs = async (dirPath) => {
    const loader = new DirectoryLoader(dirPath, {
        ".pdf": (p) => new PDFLoader(p),
    });
    const rawDocs = await loader.load();
    console.log(`Loaded ${rawDocs.length} PDFs`);
    return rawDocs;
};

// -----------------------------
// Step 5: Split Documents
// -----------------------------
const splitDocuments = async (rawDocs) => {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });
    const splits = await splitter.splitDocuments(rawDocs);
    console.log(`Split into ${splits.length} chunks`);
    return splits;
};

// -----------------------------
// Step 6: Embed Chunks
// -----------------------------
const embedChunks = async (chunks) => {
    const texts = chunks.map((c) => c.pageContent);
    const vectors = await embeddings.embedDocuments(texts);
    return chunks.map((chunk, idx) => ({
        content: chunk.pageContent.slice(0, 200), // save snippet
        metadata: chunk.metadata || {}, // preserve metadata
        vector: vectors[idx],
    }));
};

// -----------------------------
// Step 7: Format vector for pgvector
// -----------------------------
const formatVector = (vector) => `[${vector.join(",")}]`;

// -----------------------------
// Step 8: Store in PostgreSQL
// -----------------------------
const storeVectors = async (embeddedChunks) => {
    // Create table with 3072 dimensions and metadata column
    await pool.query(`
    CREATE TABLE IF NOT EXISTS pdf_vectors (
      id SERIAL PRIMARY KEY,
      content TEXT,
      metadata JSONB,
      embedding VECTOR(3072)
    );
  `);

    for (const chunk of embeddedChunks) {
        const vectorStr = formatVector(chunk.vector);
        await pool.query(
            "INSERT INTO pdf_vectors (content, metadata, embedding) VALUES ($1, $2, $3)",
            [chunk.content, chunk.metadata, vectorStr]
        );
    }

    console.log("✅ All chunks stored in PostgreSQL vector table");
};

// -----------------------------
// Step 10: Retrieve similar documents
// -----------------------------
const retrieveSimilar = async (queryText, topK = 2) => {
    try {
        // Get embedding for query
        const queryVector = await embeddings.embedQuery(queryText);
        const vectorStr = formatVector(queryVector);

        // Query PostgreSQL for top-k similar vectors
        const res = await pool.query(
            `
      SELECT id, content, metadata, embedding <-> $1 AS distance
      FROM pdf_vectors
      ORDER BY distance
      LIMIT $2
      `,
            [vectorStr, topK]
        );

        console.log(`Top ${topK} similar chunks:`);
        res.rows.forEach((row, idx) => {
            console.log(`${idx + 1}.`, row.content, `(distance: ${row.distance})`);
        });

        return res.rows.map((row) => row.content).join("\n\n");
    } catch (error) {
        console.error("Error retrieving similar vectors:", error);
        return [];
    }
};

// -----------------------------
// Retrieve all stored PDFs
// -----------------------------
const retrieveAllDocs = async () => {
    try {
        const res = await pool.query("SELECT id, content, metadata FROM pdf_vectors ORDER BY id");
        console.log(`Retrieved ${res.rows.length} chunks:`);
        return res.rows.map((row) => row.content).join("\n\n");
    } catch (error) {
        console.error("Error retrieving documents:", error);
        return [];
    }
};

// -----------------------------
// Clear all stored PDF vectors by dropping the table
// -----------------------------
const clearAllData = async () => {
    try {
        await pool.query("TRUNCATE TABLE pdf_vectors");
        console.log("✅ All data in pdf_vectors cleared successfully");
        return "✅ All data in pdf_vectors cleared successfully";
    } catch (error) {
        console.error("Error clearing data:", error);
        return "Error clearing data";
    }
};



const createThenRetrive = async (query) => {
    const docs = await loadPDFs(pdfPath);
    const splits = await splitDocuments(docs);
    const embeddedChunks = await embedChunks(splits);
    await storeVectors(embeddedChunks);
    const results = await retrieveSimilar(query, 3);
    return results;
};


export const functionMap = {
    retrieveSimilar,
    retrieveAllDocs,
    createThenRetrive,
    clearAllData
};