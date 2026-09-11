import { WebSocket, WebSocketServer } from 'ws';
import { Server as HTTPServer } from 'http';
import { voiceService } from '../services/voice.service';
import { redisService } from '../services/redis.service';
import {
    parseVoiceParams,
    VoiceSessionStore,
    AudioStreamQueue,
    sendAudio,
    parseTextMessage,
} from '../utils/voiceUtils';

const activeSessions = new VoiceSessionStore();

export function initializeVoiceWebSocket(httpServer: HTTPServer) {
    const wss = new WebSocketServer({ server: httpServer, path: '/audio-stream' });

    wss.on('connection', (ws: WebSocket, req) => {
        console.log('🎙️ New voice connection established');

        const { conversationId, userId, voiceId } = parseVoiceParams(req);
        let isInterrupted = false;
        let receivedChunkCount = 0;

        redisService.saveVoiceSession({
            conversationId,
            userId,
            status: 'connected',
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
        }).catch(err => console.error('Failed to store session in Redis:', err));

        const cleanup = () => {
            isInterrupted = true;
            activeSessions.remove(conversationId);
            redisService.deleteVoiceSession(conversationId)
                .catch(err => console.error('Failed to remove session from Redis:', err));
            ws.removeAllListeners();
        };

        ws.on('message', async (message: Buffer, isBinary: boolean) => {
            try {
                if (!isBinary) {
                    const payload = parseTextMessage(message);
                    if (payload?.type === 'INTERRUPT') {
                        console.log(`🛑 INTERRUPT received for session: ${conversationId}`);
                        isInterrupted = true;
                        redisService.updateVoiceSessionStatus(conversationId, 'interrupted')
                            .catch(err => console.error('Failed to update session status in Redis:', err));
                        activeSessions.abort(conversationId);
                    }
                    return;
                }

                if (isInterrupted) return;

                receivedChunkCount++;
                console.log(`🎙️ [Voice WebSocket] Received audio chunk #${receivedChunkCount} (${message.length} bytes) for conversation: ${conversationId}`);

                redisService.updateVoiceSessionActivity(conversationId)
                    .catch(err => console.error('Failed to update activity in Redis:', err));

                let session = activeSessions.get(conversationId);

                if (!session) {
                    const controller = new AbortController();
                    const audioStream = new AudioStreamQueue();

                    session = {
                        stream: audioStream,
                        abort: () => controller.abort(),
                    };
                    activeSessions.register(conversationId, session);

                    redisService.updateVoiceSessionStatus(conversationId, 'streaming')
                        .catch(err => console.error('Failed to set streaming status in Redis:', err));

                    voiceService.processVoiceStream(
                        conversationId,
                        userId,
                        audioStream,
                        (audioBuffer) => sendAudio(ws, audioBuffer, isInterrupted),
                        () => isInterrupted,
                        voiceId
                    ).catch(err => {
                        console.error('Pipeline failed:', err);
                        cleanup();
                    });
                }

                session.stream.push(message);
            } catch (error) {
                console.error('WebSocket message error:', error);
            }
        });

        ws.on('close', () => {
            console.log(`🔌 Voice connection closed: ${conversationId}`);
            cleanup();
        });

        ws.on('error', (error) => {
            console.error(`WebSocket error for ${conversationId}:`, error);
            cleanup();
        });
    });

    console.log('✅ Voice WebSocket server initialized at ws://localhost:3001/audio-stream');
}