import { mastra } from '../mastra';
import { redisService } from './redis.service';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { RequestContext } from '@mastra/core/request-context';
import { getUserProfile } from './auth.service';

export class VoiceService {
  private activeSessions = new Map<string, AbortController>();
  private tts: MsEdgeTTS;

  constructor() {
    this.tts = new MsEdgeTTS();
    this.tts
      .setMetadata('en-US-AriaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3)
      .catch(console.error);
  }

  async startSession(conversationId: string, userId: string): Promise<void> {
    try {
      let userProfileData: Record<string, unknown> | null = null;
      try {
        const profile = await getUserProfile(userId);
        console.log('profile', profile);
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
      } catch (_err) {}
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
    onTurnComplete?: () => void
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
    } catch (_error) {}

    try {
      const session = await redisService.getVoiceSession(conversationId);
      const requestContext = new RequestContext<{
        userId: string;
        resourceId: string;
        userProfile?: unknown;
      }>();
      requestContext.set('userId', userId);
      requestContext.set('resourceId', userId);
      if (session?.userProfile) {
        requestContext.set('userProfile', session.userProfile);
      }

      const mastraStream = await agent.stream([{ role: 'user', content: sentence }], {
        memory: { thread: conversationId, resource: userId },
        requestContext,
        maxSteps: 10,
      });

      let buffer = '';

      for await (const token of mastraStream.textStream) {
        if (abortController.signal.aborted) {
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
        const audioBuffer = await this.generateAudioBuffer(finalSentence);
        onAiAudio(audioBuffer);
      }
    } catch (error) {
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
    } catch (_error) {}
  }

  async endSession(conversationId: string): Promise<void> {
    const active = this.activeSessions.get(conversationId);
    if (active) {
      active.abort();
      this.activeSessions.delete(conversationId);
    }

    try {
      await redisService.deleteVoiceSession(conversationId);
    } catch (_error) {}
  }
}

export const voiceService = new VoiceService();
