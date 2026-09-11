import { mastra } from '../mastra';
// import { createClient } from '@deepgram/sdk'; // Uncomment when you add Deepgram
// import { ElevenLabsClient } from 'elevenlabs'; // Uncomment when you add ElevenLabs

export class VoiceService {
    /**
     * Orchestrates the real-time voice pipeline:
     * Audio Chunks -> STT (Deepgram) -> Mastra (LLM) -> TTS (ElevenLabs/OpenAI) -> Audio Chunks
     */
    async processVoiceStream(
        conversationId: string,
        userId: string,
        audioStream: AsyncIterable<Buffer>, // Incoming binary audio chunks from WebSocket
        onAudioChunk: (audioBuffer: Buffer) => void, // Callback to send audio back to client
        isInterrupted?: () => boolean, // Callback to check if user interrupted
        voiceId?: string
    ) {
        console.log(`🎙️ [VoiceService] Processing stream for conversationId: ${conversationId}, userId: ${userId}, voiceId: ${voiceId || 'default'}`);

        // Continuously ingest and log incoming audio chunks from client
        (async () => {
            try {
                let ingestedChunks = 0;
                let totalBytes = 0;
                for await (const chunk of audioStream) {
                    if (isInterrupted?.()) {
                        console.log(`🛑 [VoiceService] Interrupted audio ingestion for conversation: ${conversationId}`);
                        break;
                    }
                    ingestedChunks++;
                    totalBytes += chunk.length;
                    console.log(`🎧 [VoiceService] Ingested audio chunk #${ingestedChunks} (${chunk.length} bytes, total: ${totalBytes} bytes) for conversation: ${conversationId}`);
                }
            } catch (err) {
                console.error(`Audio ingestion error for ${conversationId}:`, err);
            }
        })();

        const agent = mastra.getAgent('agent');
        if (!agent) throw new Error('Agent not found');

        // NOTE: In a full implementation, you would pipe `audioStream` into Deepgram's 
        // streaming STT here. For this template, we will simulate the STT -> Mastra -> TTS flow.

        // 1. Simulate STT receiving a final transcript (Replace with Deepgram SDK)
        const simulatedTranscript = "Hello, how can I help you today?";
        console.log(`📝 [VoiceService] User speech transcribed for ${conversationId}: "${simulatedTranscript}"`);

        try {
            // 2. Stream text from Mastra
            console.log(`🤖 [VoiceService] Streaming response from agent for ${conversationId}...`);
            const mastraStream = await agent.stream(
                [{ role: 'user', content: simulatedTranscript }],
                {
                    memory: { thread: conversationId, resource: userId },
                }
            );

            let textBuffer = '';

            // 3. Process Mastra's text stream token-by-token
            for await (const chunk of mastraStream.textStream) {
                // Check if user interrupted
                if (isInterrupted?.()) {
                    console.log(`🛑 [VoiceService] Agent stream interrupted by user for ${conversationId}`);
                    // If interrupted, break the loop immediately
                    break;
                }

                textBuffer += chunk;

                // 4. Buffer text into sentences before sending to TTS 
                // (Sending single tokens to TTS sounds robotic and wastes API calls)
                if (textBuffer.match(/[.!?]\s+$/)) {
                    const textToSend = textBuffer.trim();
                    console.log(`🗣️ [VoiceService] Synthesizing speech for sentence: "${textToSend}"`);

                    // 5. Call TTS API (Replace with ElevenLabs/OpenAI SDK)
                    // const ttsAudioBuffer = await this.generateTTS(textToSend);

                    // Simulated TTS audio buffer (16kHz PCM)
                    const simulatedTTSBuffer = Buffer.alloc(1024);

                    // 6. Emit audio back to the WebSocket client
                    onAudioChunk(simulatedTTSBuffer);

                    textBuffer = ''; // Reset buffer for next sentence
                }
            }
            console.log(`✅ [VoiceService] Voice turn completed for ${conversationId}`);
        } catch (error) {
            console.error('Voice pipeline error:', error);
            throw error;
        }
    }

    // Helper placeholder for TTS
    private async generateTTS(text: string): Promise<Buffer> {
        // TODO: Implement ElevenLabs or OpenAI TTS SDK call here
        // Return raw PCM audio buffer
        return Buffer.alloc(0);
    }
}

export const voiceService = new VoiceService();