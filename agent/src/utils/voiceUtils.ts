import { IncomingMessage } from 'http';
import { v4 as uuidv4 } from 'uuid';

export interface VoiceConnectionParams {
  conversationId: string;
  userId: string;
  voiceId?: string;
}

export interface InterruptPayload {
  type: 'INTERRUPT';
}

export interface UserSpeechPayload {
  type: 'USER_SPEECH';
  text: string;
  sentence?: string;
  isFinal?: boolean;
}

export function parseVoiceParams(req: IncomingMessage): VoiceConnectionParams {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  return {
    conversationId: url.searchParams.get('conversationId') || uuidv4(),
    userId: url.searchParams.get('userId') || 'anonymous',
    voiceId: url.searchParams.get('voiceId') || undefined,
  };
}

export function parseTextMessage(message: Buffer | string): unknown {
  try {
    const str = typeof message === 'string' ? message : message.toString();
    try {
      return JSON.parse(str);
    } catch {
      return { type: 'TEXT_CHUNK', text: str };
    }
  } catch {
    return null;
  }
}
