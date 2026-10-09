import { Queue } from "bullmq";
import { redis } from "./redis.js";

export const ingestionQueue = new Queue("ingestion", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
