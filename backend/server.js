import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Your TMDb API key (update if needed)
const TMDB_API_KEY = '4047600e7b714de665db30e862139d92';

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use('/', express.static(join(__dirname, '../')));

// Proxy endpoint for download API with title/year augmentation
app.post('/api/download', async (req, res) => {
  const { tmdbId, season, episode } = req.body;
  if (!tmdbId) return res.status(400).json({ error: 'Missing tmdbId' });

  try {
    let apiPath = `/meepet/${tmdbId}`;
    let isTV = false;
    if (season && episode && season !== "0" && episode !== "0") {
      apiPath += `/${season}/${episode}`;
      isTV = true;
    }
    const apiUrl = `https://hahoy.onrender.com${apiPath}`;

    const apiRes = await fetch(apiUrl);
    if (!apiRes.ok) {
      throw new Error('Upstream API failed');
    }
    const apiData = await apiRes.json();

    // Augment data using TMDb endpoints..
    if (!isTV) {
      // For movies, fetch movie details
      const movieUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const movieRes = await fetch(movieUrl);
      if (movieRes.ok) {
        const movieData = await movieRes.json();
        apiData.title = movieData.title;
        apiData.year = movieData.release_date ? movieData.release_date.slice(0, 4) : '';
      }
    } else {
      // For TV shows: fetch TV show details and episode details
      const tvUrl = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const tvRes = await fetch(tvUrl);
      if(tvRes.ok) {
        const tvData = await tvRes.json();
        apiData.title = tvData.name;
        apiData.year = tvData.first_air_date ? tvData.first_air_date.slice(0,4) : '';
      }
      // Fetch episode details for episode title
      const episodeUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}/episode/${episode}?api_key=${TMDB_API_KEY}`;
      const epRes = await fetch(episodeUrl);
      if(epRes.ok) {
        const epData = await epRes.json();
        apiData.episodeTitle = epData.name;
      }
    }
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

// Fallback route for SPA routing
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, '../index.html'));
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});