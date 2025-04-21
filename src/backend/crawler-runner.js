import { analyzeUrl } from './crawler.js';

// Listen for messages from the parent process (server.js)
process.on('message', async (message) => {
  try {
    const results = await analyzeUrl(message.url);
    // Send results back to the parent process
    process.send(results);
  } catch (error) {
    process.send({ error: error.message });
  }
});