import { RequestQueue, PuppeteerCrawler } from "crawlee";
import psi from "psi";
import "dotenv/config";

// Function to analyze a single URL
export async function analyzeUrl(url) {
  const apiKey = process.env.PAGESPEED_API_KEY;
  console.log(`Using API key: ${apiKey}`);

  // At the start of the analyzeUrl function in crawler.js
  async function testPsiApi(testUrl) {
    try {
      console.log(
        "Testing PSI API with key:",
        apiKey ? apiKey.substring(0, 3) + "..." : "No key"
      );

      const result = await psi(testUrl, {
        key: apiKey,
        nokey: apiKey ? false : true,
        strategy: "mobile",
      });

      console.log("PSI API test successful");
      return true;
    } catch (error) {
      console.error("PSI API test failed:", error.message);
      throw error; // Re-throw so we can see the actual error
    }
  }

  // Test the API first
  await testPsiApi("https://www.example.com");

  // Results object to return
  let results = {
    url: url,
    overallScore: 0,
    levelAScore: 0,
    levelAAScore: 0,
    issues: [],
  };

  try {
    // Set up request queue with the target URL
    const queue = await RequestQueue.open();
    await queue.addRequest({ url: url });

    // Launch the PuppeteerCrawler
    const crawler = new PuppeteerCrawler({
      requestQueue: queue,
      maxConcurrency: 1,
      requestHandler: async ({ request, log }) => {
        log.info(`Crawling ${request.url}`);

        // Call PSI API for accessibility category
        const result = await psi(request.url, {
          key: apiKey,
          nokey: apiKey ? false : true,
          strategy: "mobile",
          category: "accessibility",
        });

        const audits = result.data.lighthouseResult.audits;
        const categories = result.data.lighthouseResult.categories;

        // Get overall accessibility score
        results.overallScore = categories.accessibility.score;

        // Track failures by WCAG level
        let levelATotal = 0,
          levelAFailed = 0;
        let levelAATotal = 0,
          levelAAFailed = 0;

        for (const auditId in audits) {
          const audit = audits[auditId];

          if (audit.tags && audit.tags.some((tag) => tag.startsWith("wcag"))) {
            // Check for Level A issues
            if (audit.tags.includes("wcag2a")) {
              levelATotal++;
              if (audit.score !== 1) {
                levelAFailed++;
                results.issues.push({
                  name: audit.title,
                  description: audit.description,
                  level: "A",
                });
              }
            }

            // Check for Level AA issues
            if (audit.tags.includes("wcag2aa")) {
              levelAATotal++;
              if (audit.score !== 1) {
                levelAAFailed++;
                results.issues.push({
                  name: audit.title,
                  description: audit.description,
                  level: "AA",
                });
              }
            }
          }
        }

        // Calculate compliance scores (inverted from failure rate)
        results.levelAScore =
          levelATotal > 0 ? 1 - levelAFailed / levelATotal : 1;
        results.levelAAScore =
          levelAATotal > 0 ? 1 - levelAAFailed / levelAATotal : 1;
      },
    });

    await crawler.run();
    return results;
  } catch (error) {
    throw new Error(`Analysis failed: ${error.message}`);
  }
}
