import express from "express";
import path from "path";
import { fork } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();
console.log(
  "API Key loaded:",
  process.env.PAGESPEED_API_KEY
    ? "Yes (first few chars: " +
        process.env.PAGESPEED_API_KEY.substring(0, 3) +
        "...)"
    : "No"
);

const app = express();
const port = 5555;

// Configure CORS properly to allow requests from your frontend
// Make sure this comes BEFORE your route definitions
app.use(
  cors({
    origin: "http://localhost:3001", // Your frontend URL exactly as shown in the error
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept"],
  })
);

app.use(express.json());

// Test endpoint
app.get("/api/test", (req, res) => {
  console.log("Test endpoint hit");
  res.json({ message: "Server is running" });
});

// Handle OPTIONS preflight requests explicitly
app.options("/api/analyze", cors());

// Endpoint to analyze a website
app.post("/api/analyze", (req, res) => {
  const { url } = req.body;

  console.log("Received request to analyze URL:", url);

  if (!url) {
    console.log("Error: No URL provided");
    return res.status(400).json({ error: "URL is required" });
  }

  // Update the path to point to src/backend/crawler-runner.js
  const crawlerRunnerPath = path.join(
    __dirname,
    "src",
    "backend",
    "crawler-runner.js"
  );
  console.log("Attempting to fork process:", crawlerRunnerPath);

  try {
    // Since our crawler is an ES Module and server.js is CommonJS,
    // we'll use the child_process.fork method to run it
    const crawlerProcess = fork(crawlerRunnerPath, [], {
      env: { ...process.env, PAGESPEED_API_KEY: process.env.PAGESPEED_API_KEY },
    });

    console.log("Process forked successfully");

    // Send URL to the child process
    crawlerProcess.send({ url });
    console.log("URL sent to crawler process");

    // Get results from the child process
    crawlerProcess.on("message", (results) => {
      console.log("Received results from crawler:", results);
      res.json(results);
      crawlerProcess.kill();
    });

    // Handle errors
    crawlerProcess.on("error", (error) => {
      console.error(`Crawler process error:`, error);
      res
        .status(500)
        .json({ error: "Error analyzing website: " + error.message });
      crawlerProcess.kill();
    });

    // Handle process exit
    crawlerProcess.on("exit", (code) => {
      console.log(`Crawler process exited with code ${code}`);
      if (code !== 0 && !res.headersSent) {
        res.status(500).json({
          error: `Error analyzing website: Process exited with code ${code}`,
        });
      }
    });
  } catch (error) {
    console.error("Failed to start crawler process:", error);
    res
      .status(500)
      .json({ error: "Failed to start analysis process: " + error.message });
  }
});

// Serve static files from the React app in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "build")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });
}

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
