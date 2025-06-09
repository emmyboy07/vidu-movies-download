// Simple Express backend to proxy API requests and hide the real API from the frontend

import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files - moved after middleware
app.use('/', express.static(join(__dirname, '../')));

// Proxy endpoint for download API
app.post('/api/download', async (req, res) => {
  const { tmdbId, season, episode } = req.body;
  if (!tmdbId) return res.status(400).json({ error: 'Missing tmdbId' });

  try {
    let apiPath = `/meepet/${tmdbId}`;
    if (season && episode && season !== "0" && episode !== "0") {
      apiPath += `/${season}/${episode}`;
    }
    const apiUrl = `https://hahoy.onrender.com${apiPath}`;

    const apiRes = await fetch(apiUrl);
    if (!apiRes.ok) {
      throw new Error('Upstream API failed');
    }
    const apiData = await apiRes.json();
    res.json(apiData);
  } catch (err) {
    res.status(500).json({ 
      error: 'Backend error', 
      details: err.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback route - must be last
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, '../index.html'));
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});