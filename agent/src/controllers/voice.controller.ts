import { WebSocket, WebSocketServer } from 'ws';
import { Server as HTTPServer, IncomingMessage } from 'http';
import { voiceService } from '../services/voice.service';
import { parseVoiceParams, parseTextMessage } from '../utils/voiceUtils';

export class VoiceConnectionHandler {
    private readonly conversationId: string;
    private readonly userId: string;
    private readonly voiceId?: string;

    constructor(
        private readonly ws: WebSocket,
        req: IncomingMessage
    ) {
        const params = parseVoiceParams(req);
        this.conversationId = params.conversationId;
        this.userId = params.userId;

        this.init();
    }

    private init(): void {
        console.log(`[VoiceConnection] Connection opened for conversation: ${this.conversationId}`);
        voiceService.startSession(this.conversationId, this.userId);

        this.ws.on('message', (data: Buffer | string) => this.onMessage(data));
        this.ws.on('close', () => this.onClose());
        this.ws.on('error', (err) => this.onError(err));
    }

    private onMessage(data: Buffer | string): void {
        voiceService.touchActivity(this.conversationId);

        const payload = parseTextMessage(data);
        console.log(`[VoiceConnection] Received message for ${this.conversationId}:`, payload);
        if (!payload) return;

        if (payload.type === 'INTERRUPT') {
            console.log(`[VoiceConnection] Interrupt received for conversation: ${this.conversationId}`);
            voiceService.handleInterrupt(this.conversationId);
            return;
        }

        const sentence = typeof payload === 'string' ? payload : (payload.text || payload.sentence);
        if (typeof sentence === 'string' && sentence.trim()) {
            voiceService.processSentence(
                this.conversationId,
                this.userId,
                sentence.trim(),
                (aiSentence) => this.sendAiSentence(aiSentence),
            ).catch(err => {
                console.error(`[VoiceConnection] Failed to process sentence:`, err);
            });
        }
    }

    private sendAiSentence(sentence: string): void {
        if (this.ws.readyState === WebSocket.OPEN) {
            console.log(`[VoiceConnection] Sending AI sentence to client: "${sentence}"`);
            this.ws.send(JSON.stringify({ type: 'AI_SPEECH', text: sentence }));
        }
    }

    private onClose(): void {
        console.log(`[VoiceConnection] Connection closed for conversation: ${this.conversationId}`);
        voiceService.endSession(this.conversationId);
        this.ws.removeAllListeners();
    }

    private onError(error: Error): void {
        console.error(`[VoiceConnection] WebSocket error for conversation ${this.conversationId}:`, error);
        voiceService.endSession(this.conversationId);
        this.ws.removeAllListeners();
    }
}

export function initializeVoiceWebSocket(httpServer: HTTPServer): void {
    const wss = new WebSocketServer({ server: httpServer, path: '/audio-stream' });

    wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
        new VoiceConnectionHandler(ws, req);
    });

    console.log('[VoiceWebSocket] Server initialized on path /audio-stream');
}