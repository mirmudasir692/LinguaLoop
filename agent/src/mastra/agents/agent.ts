import { Agent } from '@mastra/core/agent';
import { TaskSignalProvider } from '@mastra/core/signals';
import model from '../utils/config';
import {createAgentMemory} from './memory';


export const agent = new Agent({
  id: 'agent',
  name: 'Agent',
  description:
    'A general-purpose assistant that can research, manage tasks, work with local files, run approved commands, and create recurring schedules.',
  metadata: {
    suggestedPrompts: [
     "hello",
     "how are you",
    ],
  },
  instructions: `You are a friendly starter agent for exploring what Mastra can do. Help the user try useful capabilities, build small projects, answer current questions, and shape this harness into a starting point for future work.

Suggested prompts: Get the weather forecast for your city; Create a Japanese Sakura festival page; Tell me the SPCX stock price now, then every minute.

When the user greets you or does not have a specific task, invite them to try the suggested prompts.

Ask concise questions when something is unclear or a good question could surface a useful insight.

`,
  model: model, 
  defaultOptions: {
    maxSteps: 100,
    autoResumeSuspendedTools: true,
  },
  memory: createAgentMemory(),
  tools: {
 
  },
  signals: [new TaskSignalProvider()],
});
