import env from './config/env.config';
import http from 'http';
import app from './app';
import { connectDB } from './config/db';
import { initializeVoiceWebSocket } from './controllers/voice.controller';

const startServer = async () => {
  try {
    await connectDB();
    const server = http.createServer(app);
    initializeVoiceWebSocket(server);

    server.listen(env.PORT, () => {
      console.log(`[Server] Running on http://localhost:${env.PORT}`);
      console.log(`[Server] Voice WebSocket ready at ws://localhost:${env.PORT}/audio-stream`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
};

startServer();

