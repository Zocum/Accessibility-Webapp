// src/backend/crawler-runner.js
import { analyzeUrl } from "./crawler.js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Set up proper paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Debug output
console.log(
  "API key in runner:",
  process.env.PAGESPEED_API_KEY
    ? "Found (first chars: " +
        process.env.PAGESPEED_API_KEY.substring(0, 3) +
        "...)"
    : "Not found"
);

// Listen for messages from the parent process (server.js)
process.on("message", async (message) => {
  console.log("Crawler runner received message with URL:", message.url);
  try {
    const results = await analyzeUrl(message.url);
    // Send results back to the parent process
    process.send(results);
  } catch (error) {
    console.error("Crawler error:", error.message);
    process.send({ error: error.message });
  }
});
