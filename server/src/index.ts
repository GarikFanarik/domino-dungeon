import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import authRoutes from './routes/auth';
import runRoutes from './routes/runs';
import combatRoutes from './routes/combat';
import nodeRoutes from './routes/nodes';
import leaderboardRoutes from './routes/leaderboard';
import { setupWebSocket } from './ws/game-ws';

const app = express();
const server = http.createServer(app);
setupWebSocket(server);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin === 'https://discord.com' || /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/run', runRoutes);
app.use('/api/run', combatRoutes);
app.use('/api/run', nodeRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Serve static React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist/client')));
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/client/index.html'));
  });
}

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export { app, server };

// Start server only when run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on :${PORT}`);
  });
}
