import { createOllama } from 'ai-sdk-ollama';

const ollama = createOllama({
  baseURL: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
});

export default ollama.chat('qwen2.5:1.5b');