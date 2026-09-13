import { mastra } from '../mastra';
import { redisService } from './redis.service';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { Readable } from 'stream';
import { RequestContext } from '@mastra/core/request-context';
import { getUserProfile } from './auth.service';

export class VoiceService {
    private activeSessions = new Map<string, AbortController>();
    private tts: MsEdgeTTS;

    constructor() {
        this.tts = new MsEdgeTTS();
        this.tts.setMetadata("en-US-AriaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3).catch(console.error);
    }

    async startSession(conversationId: string, userId: string): Promise<void> {
        console.log(`[VoiceService] Starting session for conversation: ${conversationId}, user: ${userId}`);
        try {
            let userProfileData: any = null;
            try {
                const profile = await getUserProfile(userId);
                console.log("profile", profile)
                if (profile) {
                    userProfileData = {
                        age: profile.age,
                        studyStandard: profile.studyStandard,
                        englishRating: profile.englishRating,
                        learningGoal: profile.learningGoal,
                        hobbies: profile.hobbies,
                        isOnboarded: profile.isOnboarded,
                    };
                }
            } catch (err) {
                console.warn(`[VoiceService] Could not fetch user profile on session start:`, err);
            }
            console.log("userProfileData", userProfileData)
            await redisService.saveVoiceSession({
                conversationId,
                userId,
                status: 'connected',
                userProfile: userProfileData,
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

    private async generateAudioBuffer(text: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            const { audioStream } = this.tts.toStream(text);

            audioStream.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
            });

            audioStream.on('end', () => {
                resolve(Buffer.concat(chunks));
            });

            audioStream.on('error', (err: Error) => {
                reject(err);
            });
        });
    }

    async processSentence(
        conversationId: string,
        userId: string,
        sentence: string,
        onAiAudio: (audio: Buffer) => void,
        onTurnComplete?: () => void,
    ): Promise<void> {
        console.log(`[VoiceService] User sentence received (${conversationId}): "${sentence}"`);

        const previousController = this.activeSessions.get(conversationId);
        if (previousController) {
            previousController.abort();
        }

        const abortController = new AbortController();
        this.activeSessions.set(conversationId, abortController);

        const agent = mastra.getAgentById('agent');

        if (!agent) {
            this.activeSessions.delete(conversationId);
            if (onTurnComplete) onTurnComplete();
            throw new Error('Agent not found in Mastra registry');
        }

        try {
            await redisService.updateVoiceSessionStatus(conversationId, 'streaming');
        } catch (error) {
            console.error(`[VoiceService] Failed to update streaming status:`, error);
        }

        try {
            console.log(`[VoiceService] Streaming agent response for conversation: ${conversationId}`);

            const session = await redisService.getVoiceSession(conversationId);
            const requestContext = new RequestContext<{ userId: string; resourceId: string; userProfile?: any }>();
            requestContext.set('userId', userId);
            requestContext.set('resourceId', userId);
            console.log("userProfile in processsentence", session?.userProfile)
            if (session?.userProfile) {
                requestContext.set('userProfile', session.userProfile);
            }

            const mastraStream = await agent.stream(
                [{ role: 'user', content: sentence }],
                {
                    memory: { thread: conversationId, resource: userId },
                    requestContext,
                    maxSteps: 10,
                }
            );

            let buffer = '';

            for await (const token of mastraStream.textStream) {
                if (abortController.signal.aborted) {
                    console.log(`[VoiceService] Stream aborted by interrupt for conversation: ${conversationId}`);
                    break;
                }

                buffer += token;

                if (buffer.match(/[.!?]\s*$/)) {
                    const completeSentence = buffer.trim();
                    if (completeSentence) {
                        console.log(`[VoiceService] AI sentence: "${completeSentence}"`);
                        const audioBuffer = await this.generateAudioBuffer(completeSentence);
                        onAiAudio(audioBuffer);
                    }
                    buffer = '';
                }
            }

            if (buffer.trim() && !abortController.signal.aborted) {
                const finalSentence = buffer.trim();
                console.log(`[VoiceService] AI final sentence: "${finalSentence}"`);
                const audioBuffer = await this.generateAudioBuffer(finalSentence);
                onAiAudio(audioBuffer);
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

            if (onTurnComplete) {
                onTurnComplete();
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