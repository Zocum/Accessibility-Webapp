// server.js
import express from "express";
import cors from "cors";
import { RequestQueue, PuppeteerCrawler } from "crawlee";
import psi from "psi";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5555;

// Middleware
app.use(cors());
app.use(express.json());

// Verify API key
const apiKey = process.env.PAGESPEED_API_KEY;
if (!apiKey) {
  console.error(
    "Error: PAGESPEED_API_KEY is not set in your environment variables"
  );
  process.exit(1);
}

// API endpoint to analyze a URL
app.post("/api/analyze", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    console.log(`Analyzing ${url} for accessibility issues...`);

    // Set up a queue for the requested URL
    const queue = await RequestQueue.open();
    await queue.addRequest({ url });

    // Store results to send back
    let analysisResults = null;

    // Create and run the crawler
    const crawler = new PuppeteerCrawler({
      requestQueue: queue,
      maxConcurrency: 1, // Single URL analysis
      requestHandler: async ({ request, log }) => {
        try {
          log.info(`Crawling ${request.url}`);

          // Call PSI API for accessibility category
          const result = await psi(request.url, {
            key: apiKey,
            nokey: false,
            strategy: "mobile",
            category: "accessibility",
          });

          // Debug: Log the response structure
          console.log("PSI API Response keys:", Object.keys(result));
          console.log(
            "Result data keys:",
            result.data ? Object.keys(result.data) : "No data property"
          );

          // Check for valid response structure
          if (
            !result.data ||
            !result.data.lighthouseResult ||
            !result.data.lighthouseResult.audits
          ) {
            console.error(
              "Unexpected PSI response structure:",
              JSON.stringify(result, null, 2).substring(0, 1000)
            );
            throw new Error("Unexpected PSI response structure");
          }

          const audits = result.data.lighthouseResult.audits;

          // Debug: Log the number of audits and their IDs
          console.log(`Found ${Object.keys(audits).length} audits`);
          console.log("Audit IDs:", Object.keys(audits));

          // Process audit results
          const levelAIssues = [];
          const levelAAIssues = [];

          // Debug: Log the entire audit structure to see what data we're getting
          console.log("Full audits object structure:", Object.keys(audits));

          // Example of a specific audit that should have details - color-contrast
          if (audits["color-contrast"]) {
            console.log(
              "Color contrast audit details:",
              JSON.stringify(audits["color-contrast"], null, 2)
            );

            // Check if the details structure matches what we expect
            if (
              audits["color-contrast"].details &&
              audits["color-contrast"].details.items
            ) {
              console.log(
                "First color contrast item:",
                JSON.stringify(
                  audits["color-contrast"].details.items[0],
                  null,
                  2
                )
              );
            }
          }

          // Check for the specific structure we saw in the uploaded file
          const hasNodeStructure = Object.values(audits).some(
            (audit) =>
              audit.details &&
              audit.details.items &&
              audit.details.items.some((item) => item.node)
          );

          console.log("Found node structure in audits:", hasNodeStructure);

          for (const auditId in audits) {
            const audit = audits[auditId];

            // Only collect failed audits (score of 0)
            if (audit.score === 0 && audit.tags) {
              // Extract detailed information including nodes from items
              const auditData = {
                id: audit.id,
                title: audit.title,
                description: audit.description,
                score: audit.score,
                displayValue: audit.displayValue,
                details: {},
              };

              // Process the detailed items if they exist
              if (audit.details && audit.details.items) {
                auditData.details = {
                  items: audit.details.items.map((item) => {
                    // Extract node information if it exists
                    const processedItem = { ...item };

                    // If there's node information, extract relevant parts
                    if (item.node) {
                      processedItem.node = {
                        selector: item.node.selector || "",
                        snippet: item.node.snippet || "",
                        explanation: item.node.explanation || "",
                        nodeLabel: item.node.nodeLabel || "",
                      };
                    }

                    // Process sub-items if they exist
                    if (item.subItems && item.subItems.items) {
                      processedItem.subItems = {
                        items: item.subItems.items.map((subItem) => {
                          const processedSubItem = { ...subItem };
                          if (subItem.relatedNode) {
                            processedSubItem.relatedNode = {
                              selector: subItem.relatedNode.selector || "",
                              snippet: subItem.relatedNode.snippet || "",
                              nodeLabel: subItem.relatedNode.nodeLabel || "",
                            };
                          }
                          return processedSubItem;
                        }),
                      };
                    }

                    return processedItem;
                  }),
                };
              }

              if (audit.tags.includes("wcag2a")) levelAIssues.push(auditData);
              if (audit.tags.includes("wcag2aa")) levelAAIssues.push(auditData);
            }
          }

          // Format the results
          analysisResults = {
            url: request.url,
            timestamp: new Date().toISOString(),
            levelA: {
              totalIssues: levelAIssues.length,
              issues: levelAIssues,
            },
            levelAA: {
              totalIssues: levelAAIssues.length,
              issues: levelAAIssues,
            },
            // Add debug information
            debug: {
              rawColorContrastAudit: audits["color-contrast"] || null,
              // Store a few useful raw audit samples for debugging
              sampleAudits: Object.fromEntries(
                Object.entries(audits)
                  .filter(([_, audit]) => audit.score === 0)
                  .slice(0, 3)
              ),
            },
          };
        } catch (error) {
          log.error(`Error processing ${request.url}: ${error.message}`);
          throw error; // Rethrow to be caught by outer try/catch
        }
      },
    });

    await crawler.run();

    // Send back the results
    res.json(analysisResults);
  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({ error: "Failed to analyze URL: " + error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Accessibility Crawler API running on port ${port}`);
});
