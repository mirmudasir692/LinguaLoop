import 'dotenv/config';
import cors from 'cors';
import express, { Express, NextFunction, Request, Response } from 'express';
import { setupSwagger } from './config/swagger';
import agentRoutes from './routes/agent.routes';
import authRoutes from './routes/authRoutes';
import http from 'http';
import { initializeVoiceWebSocket } from './controllers/voice.controller';

export const createApp = (): Express => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  setupSwagger(app);

  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Server is healthy',
      data: { status: 'ok', timestamp: new Date().toISOString() },
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/agent', agentRoutes);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
      data: null,
    });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled Error:', err);
    const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
    res.status(statusCode).json({
      success: false,
      message: err.message || 'Internal Server Error',
      data: null,
    });
  });

  return app;
};

export const app = createApp();
const server = http.createServer(app);
initializeVoiceWebSocket(server);
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 HTTP Server running on http://localhost:${PORT}`);
  console.log(`📖 Swagger UI available at http://localhost:${PORT}/api-docs`);
  console.log(`🎙️ Voice WebSocket ready at ws://localhost:${PORT}/audio-stream`);
});

const gracefulShutdown = (signal: string) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
