import { IncomingMessage } from 'http';
import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

export interface VoiceConnectionParams {
    conversationId: string;
    userId: string;
    voiceId?: string;
}

export interface InterruptPayload {
    type: 'INTERRUPT';
}

export function parseVoiceParams(req: IncomingMessage): VoiceConnectionParams {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    return {
        conversationId: url.searchParams.get('conversationId') || uuidv4(),
        userId: url.searchParams.get('userId') || 'anonymous',
        voiceId: url.searchParams.get('voiceId') || undefined,
    };
}

export class AudioStreamQueue implements AsyncIterable<Buffer> {
    private queue: Buffer[] = [];
    private resolvers: ((result: IteratorResult<Buffer>) => void)[] = [];
    private isDone = false;

    push(chunk: Buffer): void {
        if (this.isDone) return;
        if (this.resolvers.length > 0) {
            const resolve = this.resolvers.shift()!;
            resolve({ value: chunk, done: false });
        } else {
            this.queue.push(chunk);
        }
    }

    close(): void {
        this.isDone = true;
        while (this.resolvers.length > 0) {
            const resolve = this.resolvers.shift()!;
            resolve({ value: undefined as any, done: true });
        }
    }

    [Symbol.asyncIterator](): AsyncIterator<Buffer> {
        return {
            next: () => {
                if (this.queue.length > 0) {
                    return Promise.resolve({ value: this.queue.shift()!, done: false });
                }
                if (this.isDone) {
                    return Promise.resolve({ value: undefined as any, done: true });
                }
                return new Promise<IteratorResult<Buffer>>((resolve) => {
                    this.resolvers.push(resolve);
                });
            },
            return: () => {
                this.close();
                return Promise.resolve({ value: undefined as any, done: true });
            },
        };
    }
}

export interface VoiceSession {
    stream: AudioStreamQueue;
    abort: () => void;
}

export class VoiceSessionStore {
    private sessions = new Map<string, VoiceSession>();

    register(conversationId: string, session: VoiceSession): void {
        this.sessions.set(conversationId, session);
    }

    get(conversationId: string): VoiceSession | undefined {
        return this.sessions.get(conversationId);
    }

    abort(conversationId: string): void {
        const session = this.sessions.get(conversationId);
        if (session) {
            session.abort();
            session.stream.close();
        }
    }

    has(conversationId: string): boolean {
        return this.sessions.has(conversationId);
    }

    remove(conversationId: string): void {
        const session = this.sessions.get(conversationId);
        if (session) {
            session.stream.close();
            this.sessions.delete(conversationId);
        }
    }
}

export function createMockStream(chunk: Buffer): AsyncIterable<Buffer> {
    return (async function* () {
        yield chunk;
    })();
}

export function sendAudio(ws: WebSocket, buffer: Buffer, isInterrupted: boolean): void {
    if (!isInterrupted && ws.readyState === WebSocket.OPEN) {
        console.log(`📤 [Voice WebSocket] Sending audio chunk (${buffer.length} bytes) to client`);
        ws.send(buffer, { binary: true });
    }
}

export function parseTextMessage(message: Buffer): InterruptPayload | null {
    try {
        const data = JSON.parse(message.toString());
        if (data && data.type === 'INTERRUPT') {
            return data;
        }
    } catch {
        return null;
    }
    return null;
}
