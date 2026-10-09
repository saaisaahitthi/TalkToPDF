import { Worker } from "bullmq";
import { redis } from "../config/redis.js";
import { chunkText } from "../services/chunker.service.js";
import { generateEmbeddings } from "../services/embedding.service.js";
import { parsePDF } from "../services/pdf.service.js";
import { Document } from "../models/document.model.js";
import { Chunk } from "../models/chunks.model.js";
import fs from "fs/promises";

export const startWorker = async () => {
  const worker = new Worker(
    "ingestion",
    async (job) => {
      const { documentId, jobId, filePath } = job.data;

      try {
        await redis.hset(`job:${jobId}`, "status", "parsing");
        const { text, totalPages } = await parsePDF(filePath);

        await redis.hset(`job:${jobId}`, "status", "chunking");
        const chunks = chunkText(text);

        await redis.hset(`job:${jobId}`, "status", "embedding");
        const embeddings = await generateEmbeddings(chunks);

        // Idempotency: Clear existing chunks for this document in case this is a retry
        await Chunk.deleteMany({ documentId });

        const chunksData = chunks.map((chunk, i) => ({
          documentId,
          text: chunk.text,
          embedding: embeddings[i],
          metadata: {
            chunkIndex: i,
            startChar: chunk.startChar,
            endChar: chunk.endChar,
          },
        }));

        await Chunk.insertMany(chunksData);

        await redis.hset(`job:${jobId}`, "status", "completed");
        await redis.expire(`job:${jobId}`, 86400); // 24 hours TTL

        await Document.findByIdAndUpdate(documentId, {
          status: "ready",
          pageCount: totalPages,
          chunkCount: chunks.length,
          processedAt: new Date(),
        });
      } catch (error) {
        console.error("Error processing job:", error);

        await Document.findByIdAndUpdate(documentId, {
          status: "failed",
          errorMessage: error.message || "Worker processing failed",
        });

        await redis.hset(`job:${jobId}`, "status", "failed");
        await redis.expire(`job:${jobId}`, 86400);

        // Throw error so BullMQ knows the job failed and can retry it
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 1, // Process one document at a time per worker instance
    }
  );

  // File lifecycle: Delete the PDF only after the job finishes completely (success or final failure)
  worker.on("completed", async (job) => {
    try {
      if (job.data.filePath) await fs.unlink(job.data.filePath);
    } catch (err) {
      console.error("Failed to delete PDF after success:", err);
    }
  });

  worker.on("failed", async (job, err) => {
    // Only delete the file if it has exhausted all retry attempts
    if (job.attemptsMade >= job.opts.attempts) {
      try {
        if (job.data.filePath) await fs.unlink(job.data.filePath);
      } catch (e) {
        console.error("Failed to delete PDF after all retries exhausted:", e);
      }
    }
  });

  console.log("BullMQ Worker started listening for jobs...");
};
