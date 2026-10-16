import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleApiRequest } from './server/apiRouter.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// API routes handled by handleApiRequest
app.use(async (req, res, next) => {
  if (req.url && req.url.startsWith('/api/')) {
    try {
      const handled = await handleApiRequest(req, res);
      if (handled) return;
    } catch (err) {
      console.error('Express API error:', err);
      res.status(500).json({ error: 'Server error' });
      return;
    }
  }
  next();
});

// Serve static assets from dist
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback to index.html for SPA
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
