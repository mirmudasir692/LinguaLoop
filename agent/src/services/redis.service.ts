import Redis from 'ioredis';

export type VoiceSessionStatus = 'connected' | 'streaming' | 'interrupted' | 'closed';

export interface VoiceSessionData {
    conversationId: string;
    userId: string;
    status: VoiceSessionStatus;
    createdAt: string;
    lastActiveAt: string;
    [key: string]: any;
}

const VOICE_SESSION_PREFIX = 'voice:session:';
const DEFAULT_SESSION_TTL = 86400; // 24 hours

export class RedisService {
    private client: Redis;
    private isConnected: boolean = false;

    constructor() {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        this.client = new Redis(redisUrl, {
            lazyConnect: false,
            retryStrategy(times) {
                const delay = Math.min(times * 100, 3000);
                return delay;
            },
            maxRetriesPerRequest: 3,
        });

        this.client.on('connect', () => {
            this.isConnected = true;
            console.log('✅ Redis client connected');
        });

        this.client.on('error', (err) => {
            this.isConnected = false;
            console.warn('⚠️ Redis Client Error:', err.message);
        });
    }

    public getClient(): Redis {
        return this.client;
    }


    async get<T>(key: string): Promise<T | null> {
        try {
            const data = await this.client.get(key);
            if (!data) return null;
            return JSON.parse(data) as T;
        } catch (error) {
            console.error(`Redis GET error for key ${key}:`, error);
            return null;
        }
    }

    async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
        try {
            const serialized = JSON.stringify(value);
            if (ttlSeconds && ttlSeconds > 0) {
                await this.client.set(key, serialized, 'EX', ttlSeconds);
            } else {
                await this.client.set(key, serialized);
            }
        } catch (error) {
            console.error(`Redis SET error for key ${key}:`, error);
        }
    }

    async del(key: string): Promise<void> {
        try {
            await this.client.del(key);
        } catch (error) {
            console.error(`Redis DEL error for key ${key}:`, error);
        }
    }

    async exists(key: string): Promise<boolean> {
        try {
            const result = await this.client.exists(key);
            return result === 1;
        } catch (error) {
            console.error(`Redis EXISTS error for key ${key}:`, error);
            return false;
        }
    }


    async saveVoiceSession(session: VoiceSessionData, ttlSeconds: number = DEFAULT_SESSION_TTL): Promise<void> {
        const key = `${VOICE_SESSION_PREFIX}${session.conversationId}`;
        await this.set(key, session, ttlSeconds);
    }

    async getVoiceSession(conversationId: string): Promise<VoiceSessionData | null> {
        const key = `${VOICE_SESSION_PREFIX}${conversationId}`;
        return await this.get<VoiceSessionData>(key);
    }

    async updateVoiceSessionStatus(conversationId: string, status: VoiceSessionStatus): Promise<void> {
        const session = await this.getVoiceSession(conversationId);
        if (session) {
            session.status = status;
            session.lastActiveAt = new Date().toISOString();
            await this.saveVoiceSession(session);
        }
    }

    async updateVoiceSessionActivity(conversationId: string): Promise<void> {
        const session = await this.getVoiceSession(conversationId);
        if (session) {
            session.lastActiveAt = new Date().toISOString();
            await this.saveVoiceSession(session);
        }
    }

    async deleteVoiceSession(conversationId: string): Promise<void> {
        const key = `${VOICE_SESSION_PREFIX}${conversationId}`;
        await this.del(key);
    }

    async getActiveVoiceSessions(): Promise<VoiceSessionData[]> {
        try {
            const keys = await this.client.keys(`${VOICE_SESSION_PREFIX}*`);
            if (keys.length === 0) return [];
            
            const sessions: VoiceSessionData[] = [];
            for (const key of keys) {
                const data = await this.client.get(key);
                if (data) {
                    try {
                        sessions.push(JSON.parse(data));
                    } catch (e) {
                        // Ignore malformed keys
                    }
                }
            }
            return sessions;
        } catch (error) {
            console.error('Redis getActiveVoiceSessions error:', error);
            return [];
        }
    }
}

export const redisService = new RedisService();
export const cacheService = redisService;
