import 'dotenv/config';
import cors from 'cors';
import express, { Express, NextFunction, Request, Response } from 'express';
import { setupSwagger } from './config/swagger';
import agentRoutes from './routes/agent.routes';
import authRoutes from './routes/authRoutes';

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

  app.use(
    (err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Unhandled Error:', err);
      const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
      res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal Server Error',
        data: null,
      });
    }
  );

  return app;
};

export const app = createApp();
export default app;
