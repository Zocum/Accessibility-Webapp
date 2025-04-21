const express = require('express');
const path = require('path');
const { fork } = require('child_process');
const app = express();
const port = 5000;

app.use(express.json());

// Endpoint to analyze a website
app.post('/api/analyze', (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  // Since our crawler is an ES Module and server.js is CommonJS,
  // we'll use the child_process.fork method to run it
  const crawlerProcess = fork(path.join(__dirname, 'crawler-runner.js'));
  
  // Send URL to the child process
  crawlerProcess.send({ url });
  
  // Get results from the child process
  crawlerProcess.on('message', (results) => {
    res.json(results);
    crawlerProcess.kill();
  });
  
  // Handle errors
  crawlerProcess.on('error', (error) => {
    console.error(`Crawler process error: ${error.message}`);
    res.status(500).json({ error: 'Error analyzing website' });
    crawlerProcess.kill();
  });
  
  // Handle process exit
  crawlerProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Crawler process exited with code ${code}`);
      res.status(500).json({ error: 'Error analyzing website' });
    }
  });
});

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../build', 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});