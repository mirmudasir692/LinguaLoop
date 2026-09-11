import { mastra } from '../mastra';
import { redisService } from './redis.service';

export class VoiceService {
    private activeSessions = new Map<string, AbortController>();

    async startSession(conversationId: string, userId: string): Promise<void> {
        console.log(`[VoiceService] Starting session for conversation: ${conversationId}, user: ${userId}`);
        try {
            await redisService.saveVoiceSession({
                conversationId,
                userId,
                status: 'connected',
                createdAt: new Date().toISOString(),
                lastActiveAt: new Date().toISOString(),
            });
        } catch (error) {
            console.error(`[VoiceService] Failed to save session in Redis:`, error);
        }
    }

    async handleInterrupt(conversationId: string): Promise<void> {
        console.log(`[VoiceService] Interrupt requested for conversation: ${conversationId}`);
        const active = this.activeSessions.get(conversationId);
        if (active) {
            active.abort();
            this.activeSessions.delete(conversationId);
        }

        try {
            await redisService.updateVoiceSessionStatus(conversationId, 'interrupted');
        } catch (error) {
            console.error(`[VoiceService] Failed to update interrupted status:`, error);
        }
    }

    async processSentence(
        conversationId: string,
        userId: string,
        sentence: string,
        onAiSentence: (sentence: string) => void,

    ): Promise<void> {
        console.log(`[VoiceService] User sentence received (${conversationId}): "${sentence}"`);

        const previousController = this.activeSessions.get(conversationId);
        if (previousController) {
            previousController.abort();
        }

        const abortController = new AbortController();
        this.activeSessions.set(conversationId, abortController);

        const agent = mastra.getAgent('agent');
        if (!agent) {
            this.activeSessions.delete(conversationId);
            throw new Error('Agent not found in Mastra registry');
        }

        try {
            await redisService.updateVoiceSessionStatus(conversationId, 'streaming');
        } catch (error) {
            console.error(`[VoiceService] Failed to update streaming status:`, error);
        }

        try {
            console.log(`[VoiceService] Streaming agent response for conversation: ${conversationId}`);
            const mastraStream = await agent.stream(
                [{ role: 'user', content: sentence }],
                {
                    memory: { thread: conversationId, resource: userId },
                }
            );

            let buffer = '';

            for await (const token of mastraStream.textStream) {
                if (abortController.signal.aborted) {
                    console.log(`[VoiceService] Stream aborted by interrupt for conversation: ${conversationId}`);
                    break;
                }

                buffer += token;

                // Split stream into full sentences for natural audio synthesis
                if (buffer.match(/[.!?]\s*$/)) {
                    const completeSentence = buffer.trim();
                    if (completeSentence) {
                        console.log(`[VoiceService] AI sentence: "${completeSentence}"`);
                        onAiSentence(completeSentence);
                    }
                    buffer = '';
                }
            }

            if (buffer.trim() && !abortController.signal.aborted) {
                const finalSentence = buffer.trim();
                console.log(`[VoiceService] AI final sentence: "${finalSentence}"`);
                onAiSentence(finalSentence);
            }

            console.log(`[VoiceService] Turn completed for conversation: ${conversationId}`);
        } catch (error) {
            console.error(`[VoiceService] Turn error for conversation ${conversationId}:`, error);
            throw error;
        } finally {
            if (this.activeSessions.get(conversationId) === abortController) {
                this.activeSessions.delete(conversationId);
            }

            try {
                await redisService.updateVoiceSessionStatus(conversationId, 'connected');
            } catch (error) {
                console.error(`[VoiceService] Failed to update connected status:`, error);
            }
        }
    }

    async touchActivity(conversationId: string): Promise<void> {
        try {
            await redisService.updateVoiceSessionActivity(conversationId);
        } catch (error) {
            console.error(`[VoiceService] Failed to update activity:`, error);
        }
    }

    async endSession(conversationId: string): Promise<void> {
        console.log(`[VoiceService] Ending session for conversation: ${conversationId}`);
        const active = this.activeSessions.get(conversationId);
        if (active) {
            active.abort();
            this.activeSessions.delete(conversationId);
        }

        try {
            await redisService.deleteVoiceSession(conversationId);
        } catch (error) {
            console.error(`[VoiceService] Failed to delete session from Redis:`, error);
        }
    }
}

export const voiceService = new VoiceService();