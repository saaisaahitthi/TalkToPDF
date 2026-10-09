import { redis } from "../config/redis.js";
import { chunkText } from "../services/chunker.service.js";
import { generateEmbeddings } from "../services/embedding.service.js";
import { parsePDF } from "../services/pdf.service.js";
import { Document } from "../models/document.model.js";
import { Chunk } from "../models/chunks.model.js";
import fs from "fs/promises";

export const startWorker = async () => {
  while (true) {
    const data = await redis.brpop("ingestion:queue", 0);

    if (!data) continue;

    let documentId, jobId, filePath;
    try {
      const parsedData = JSON.parse(data[1]);
      documentId = parsedData.documentId;
      jobId = parsedData.jobId;
      filePath = parsedData.filePath;

      await redis.hset(`job:${jobId}`, "status", "parsing");

      const { text, totalPages } = await parsePDF(filePath);

      await redis.hset(`job:${jobId}`, "status", "chunking");

      const chunks = chunkText(text);

      await redis.hset(`job:${jobId}`, "status", "embedding");

      const embeddings = await generateEmbeddings(chunks);

      const chunksData = [];

      for (let i = 0; i < chunks.length; ++i) {
        chunksData.push({
          documentId,
          text: chunks[i].text,
          embedding: embeddings[i],
          metadata: {
            chunkIndex: i,
            startChar: chunks[i].startChar,
            endChar: chunks[i].endChar,
          },
        });
      }

      await Chunk.insertMany(chunksData);

      await redis.hset(`job:${jobId}`, "status", "completed");
      // Evict job status from Redis after 24 hours to save memory
      await redis.expire(`job:${jobId}`, 86400);

      await Document.findByIdAndUpdate(documentId, {
        status: "ready",
        pageCount: totalPages,
        chunkCount: chunks.length,
        processedAt: new Date(),
      });
    } catch (error) {
      console.log("Error with worker:", error);

      if (documentId) {
        await Document.findByIdAndUpdate(documentId, {
          status: "failed",
          errorMessage: error.message || "Worker processing failed",
        });
      }
      if (jobId) {
        await redis.hset(`job:${jobId}`, "status", "failed");
        // Also evict failed jobs after 24 hours
        await redis.expire(`job:${jobId}`, 86400);
      }
    } finally {
      // Free up disk space capacity by deleting the PDF after processing
      if (filePath) {
        try {
          await fs.unlink(filePath);
        } catch (err) {
          console.error("Failed to delete local PDF file:", err);
        }
      }
    }
  }
};
