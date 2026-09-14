import { createOllama } from 'ai-sdk-ollama';
import env from '../../config/env.config';

const ollama = createOllama({
  baseURL: env.OLLAMA_BASE_URL,
});

export default ollama.chat('qwen2.5:1.5b');
